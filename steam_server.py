"""
Steam Controller Overlay - WebSocket Server
Reads raw HID from the Steam Controller (VID 0x28DE, PID 0x1304)
and broadcasts button state at 60 Hz to any connected browser clients.

Requirements: pip install pywinusb websockets
Usage:        python steam_server.py
"""

import asyncio
import functools
import http.server
import json
import math
import os
import struct
import sys
import time
import threading

try:
    import pywinusb.hid as hid
except ImportError:
    print("Missing dependency.  Run:  pip install pywinusb")
    sys.exit(1)

try:
    import websockets
except ImportError:
    print("Missing dependency.  Run:  pip install websockets")
    sys.exit(1)

HOST      = "localhost"
PORT      = 47878   # WebSocket
HTTP_PORT = 47880   # Static file server (open http://localhost:47880/index.html)
POLL_HZ   = 60

VID = 0x28DE
PID = 0x1304

# ── Button map: name → (byte_index, bitmask) ──────────────────────────────────
# Derived from hardware mapping on the 2026 Steam Controller (PID 0x1304).
# byte 0 = report ID, byte 1 = sequence counter (excluded from parsing).
BUTTON_BITS = {
    # byte 2
    'A':          (2, 0x01),
    'B':          (2, 0x02),
    'X':          (2, 0x04),
    'Y':          (2, 0x08),
    'QUICK':      (2, 0x10),  # ··· Quick Access
    'BACK':       (3, 0x40),
    'R4':         (2, 0x80),  # Right back paddle (upper)
    # byte 3
    'R5':         (3, 0x01),  # Right back paddle (lower)
    'RB':         (3, 0x02),
    'DPAD_DOWN':  (3, 0x04),
    'DPAD_RIGHT': (3, 0x08),
    'DPAD_LEFT':  (3, 0x10),
    'DPAD_UP':    (3, 0x20),
    'START':      (2, 0x40),
    # byte 4
    'STEAM':      (4, 0x01),
    'L4':         (4, 0x02),  # Left back paddle (upper)
    'L5':         (4, 0x04),  # Left back paddle (lower)
    'LB':         (4, 0x08),
    'RIGHT_PAD':  (4, 0x20),  # Right Trackpad click
    'R3':         (2, 0x20),  # Right Stick click
    # byte 5
    'L3':         (3, 0x80),  # Left Stick click
    'LEFT_PAD':   (5, 0x02),  # Left Trackpad click
    'RG':         (5, 0x10),  # Right grip squeeze
    'LG':         (5, 0x20),  # Left grip squeeze
}

# Triggers: 16-bit unsigned LE. Full press ~32767; threshold for boolean.
LT_BYTES = (6, 7)
RT_BYTES = (8, 9)
TRIGGER_THRESHOLD = 600   # ~33 % of observed full-press (~1800 cts) — well above noise floor
TRIGGER_MAX = 32767.0

# Analog axes: (byte_offset, signed, big_endian)
# All HID values are little-endian on this controller.
# Trackpad layout (LE s16): LP_X@18, LP_Y@20, LP_PRESS@22, RP_X@24, RP_Y@26, RP_PRESS@28
AXES = {
    'LT_axis':   (6,  False, False),
    'RT_axis':   (8,  False, False),
    'LS_X':      (10, True,  False),
    'LS_Y':      (12, True,  False),
    'RS_X':      (14, True,  False),
    'RS_Y':      (16, True,  False),
    'LP_X':      (18, True,  False),
    'LP_Y':      (20, True,  False),
    'LP_PRESS':  (22, True,  False),
    'RP_X':      (24, True,  False),
    'RP_Y':      (26, True,  False),
    'RP_PRESS':  (28, True,  False),
}
STICK_MAX = 32767.0

# IMU freeze detection — when Steam is open it locks the IMU and the
# accelerometer bytes stop changing.  We track consecutive identical
# readings and suppress GYRO_ROLL once the data is clearly frozen.
_imu_prev        = None
_imu_frozen_cnt  = 0
IMU_FREEZE_LIMIT = 20   # ~0.33 s at 60 Hz

# ── SDL2 gyro fallback (Steam-open path) ──────────────────────────────────────
# When Steam is open it locks raw HID IMU, but SDL2 (which Steam itself uses)
# can still read the accelerometer.  We run a background thread for this.
_sdl_accel = None   # (accel_x, accel_y, accel_z) in m/s², or None
_sdl_lock  = threading.Lock()

def _sdl_gyro_thread():
    global _sdl_accel
    try:
        import os
        os.environ.setdefault('SDL_VIDEODRIVER', 'dummy')
        os.environ.setdefault('SDL_AUDIODRIVER', 'dummy')
        # Without this, SDL2 ignores controllers when there is no focused window
        os.environ['SDL_JOYSTICK_ALLOW_BACKGROUND_EVENTS'] = '1'

        import pygame
        from pygame._sdl2 import controller as sdl_ctrl

        pygame.init()
        pygame.joystick.init()
        sdl_ctrl.init()

        # Steam's virtual device can take a few seconds to appear after startup.
        # Retry for up to 15 s before giving up.
        ctrl = None
        for attempt in range(30):
            pygame.event.pump()
            n_gc  = sdl_ctrl.get_count()
            n_joy = pygame.joystick.get_count()
            if n_gc > 0:
                try:
                    ctrl = sdl_ctrl.Controller(0)
                    break
                except Exception:
                    pass
            time.sleep(0.5)

        if ctrl is None:
            return

        SENSOR_ACCEL = 1
        if not ctrl.has_sensor(SENSOR_ACCEL):
            return

        ctrl.set_sensor_enabled(SENSOR_ACCEL, True)

        while True:
            pygame.event.pump()
            try:
                data = ctrl.get_sensor_data(SENSOR_ACCEL)  # (ax, ay, az) m/s²
                with _sdl_lock:
                    _sdl_accel = (data[0], data[1], data[2])
            except Exception:
                pass
            time.sleep(1 / 120)

    except Exception:
        pass

# ── Static HTTP server (serves overlay files so ES modules work) ──────────────
def _start_http_server():
    # When running as a PyInstaller bundle, __file__ points to the temp extraction
    # directory.  We want to serve index.html / js / images from the folder that
    # contains the EXE itself so users can see (and replace) the image files.
    if getattr(sys, 'frozen', False):
        project_dir = os.path.dirname(sys.executable)
    else:
        project_dir = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=project_dir,
    )
    # Suppress the per-request log lines
    handler.log_message = lambda *_: None
    server = http.server.HTTPServer((HOST, HTTP_PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()


# ── HID state ─────────────────────────────────────────────────────────────────
_lock          = threading.Lock()
_latest_report = None   # list[int] | None


def _find_active_device():
    """Open all PID 0x1304 interfaces, return the one that streams data."""
    devices = hid.HidDeviceFilter(vendor_id=VID, product_id=PID).get_devices()
    if not devices:
        return None
    for d in devices:
        try:
            d.open()
        except Exception:
            continue
        received = []
        d.set_raw_data_handler(lambda data, r=received: r.append(data) if data else None)
        time.sleep(0.4)
        d.set_raw_data_handler(None)
        if received:
            return d
        try:
            d.close()
        except Exception:
            pass
    return None


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))

def _parse(data):
    """Return {buttons, axes} from a raw HID report, or None to discard."""
    if not data or len(data) < 30:   # need up to RP_PRESS at bytes 28-29
        return None
    if data[0] not in (0x42, 0x7b):
        return None

    b = bytes(data)

    buttons = {name: bool(data[idx] & mask) for name, (idx, mask) in BUTTON_BITS.items()}

    lt_raw = struct.unpack_from('<H', b, LT_BYTES[0])[0]
    rt_raw = struct.unpack_from('<H', b, RT_BYTES[0])[0]
    buttons['LT'] = lt_raw > TRIGGER_THRESHOLD
    buttons['RT'] = rt_raw > TRIGGER_THRESHOLD

    # Only read axes from 0x42 frames — 0x7b frames have different data at these
    # offsets and cause phantom movement on LS_X and RT.
    axes = {}
    if data[0] == 0x42:
        for name, (offset, signed, big_endian) in AXES.items():
            endian = '>' if big_endian else '<'
            fmt = f'{endian}h' if signed else f'{endian}H'
            raw = struct.unpack_from(fmt, b, offset)[0]
            if signed:
                axes[name] = round(_clamp(raw / STICK_MAX, -1.0, 1.0), 4)
            else:
                axes[name] = round(_clamp(raw / TRIGGER_MAX, 0.0, 1.0), 4)

    # Accelerometer-based tilt (roll + pitch).
    # Primary: raw HID bytes (Steam closed).  Fallback: SDL2 (Steam open).
    global _imu_prev, _imu_frozen_cnt
    if len(data) >= 40:
        accel_x = struct.unpack_from('<h', b, 34)[0]   # left/right
        accel_y = struct.unpack_from('<h', b, 36)[0]   # forward/back
        accel_z = struct.unpack_from('<h', b, 38)[0]   # up/down (gravity dominant)
        cur = (accel_x, accel_z)
        if cur == _imu_prev:
            _imu_frozen_cnt = min(_imu_frozen_cnt + 1, IMU_FREEZE_LIMIT + 1)
        else:
            _imu_frozen_cnt = 0
            _imu_prev = cur

        if _imu_frozen_cnt < IMU_FREEZE_LIMIT:
            # Raw HID is live — Steam is closed
            axes['GYRO_ROLL']  = round(math.degrees(math.atan2(accel_x, accel_z)), 2)
            axes['GYRO_PITCH'] = round(math.degrees(math.atan2(accel_y, accel_z)), 2)
        else:
            # Raw HID frozen — SDL2 fallback (Steam is open)
            with _sdl_lock:
                sdl = _sdl_accel
            if sdl is not None:
                ax_x, ax_y, ax_z = sdl
                axes['GYRO_ROLL']  = round(math.degrees(math.atan2(ax_x, ax_z)), 2)
                axes['GYRO_PITCH'] = round(math.degrees(math.atan2(ax_y, ax_z)), 2)

    return {'buttons': buttons, 'axes': axes}


# ── Analog axis smoothing ─────────────────────────────────────────────────────
# EMA low-pass filter applied to every axis value before broadcast.
# Kills frame-to-frame noise on triggers and sticks without adding
# noticeable lag (alpha 0.35 ≈ 28 ms time-constant at 60 Hz).
_AXIS_ALPHA = 0.8   # light smoothing — kills single-frame spikes without attenuating fast inputs
_axis_ema   = {}   # key → smoothed float

def _smooth_axes(axes):
    for key, val in axes.items():
        if key.startswith('GYRO'):   # gyro is already smoothed client-side
            continue
        prev = _axis_ema.get(key, val)
        smoothed = prev + _AXIS_ALPHA * (val - prev)
        _axis_ema[key] = smoothed
        axes[key] = round(smoothed, 4)
    return axes

# ── Button debounce ───────────────────────────────────────────────────────────
# A button must be pressed for this many consecutive HID frames before it is
# broadcast as pressed.  At 60 Hz, 3 frames ≈ 50 ms — invisible to the eye
# but kills 1–2 frame phantom inputs from noisy HID reports.
DEBOUNCE_FRAMES   = 3
_btn_press_count  = {}   # name → consecutive frames held
_btn_confirmed    = {}   # name → last confirmed (debounced) state

def _debounce(raw_buttons):
    for name, pressed in raw_buttons.items():
        if pressed:
            _btn_press_count[name] = _btn_press_count.get(name, 0) + 1
            if _btn_press_count[name] >= DEBOUNCE_FRAMES:
                _btn_confirmed[name] = True
        else:
            _btn_press_count[name] = 0
            _btn_confirmed[name]   = False   # release is immediate
    return {n: _btn_confirmed.get(n, False) for n in raw_buttons}

# ── WebSocket server ───────────────────────────────────────────────────────────
_clients      = set()
_clients_lock = threading.Lock()


async def _ws_handler(websocket):
    with _clients_lock:
        _clients.add(websocket)
    addr = websocket.remote_address
    print(f"[server] Overlay connected: {addr}")
    try:
        await websocket.wait_closed()
    finally:
        with _clients_lock:
            _clients.discard(websocket)
        print(f"[server] Overlay disconnected: {addr}")


async def _broadcast_loop():
    last_json = ""
    while True:
        await asyncio.sleep(1 / POLL_HZ)

        with _lock:
            report = _latest_report[:] if _latest_report else None
        if report is None:
            continue

        try:
            state = _parse(report)
        except Exception as exc:
            print(f"[server] parse error: {exc}")
            continue
        if state is None:
            continue

        state['buttons'] = _debounce(state['buttons'])
        state['axes']    = _smooth_axes(state['axes'])
        state['gyro']    = GYRO_ENABLED
        msg = json.dumps(state)
        if msg == last_json:
            continue
        last_json = msg

        # Snapshot clients WITHOUT holding the lock across the await.
        # Holding a threading.Lock over an await lets _ws_handler deadlock
        # when it tries to acquire the same lock on browser refresh/disconnect.
        with _clients_lock:
            snapshot = list(_clients)

        dead = set()
        for ws in snapshot:
            try:
                await ws.send(msg)
            except Exception:
                dead.add(ws)

        if dead:
            with _clients_lock:
                _clients.difference_update(dead)


# ── Gyro setting (set once at startup) ───────────────────────────────────────
def _ask_gyro():
    print()
    print("  Gyro rotation: tilt the controller overlay by holding both grips.")
    while True:
        ans = input("  Enable gyro rotation? [y/n]: ").strip().lower()
        if ans in ('y', 'yes'):
            print("  Gyro enabled.\n")
            return True
        if ans in ('n', 'no'):
            print("  Gyro disabled.\n")
            return False

GYRO_ENABLED = False   # set in main() before the server starts


# ── Entry point ───────────────────────────────────────────────────────────────
async def main():
    global _latest_report, GYRO_ENABLED

    print("=" * 50)
    print("  Steam Controller Overlay Server")
    print(f"  WebSocket: ws://{HOST}:{PORT}")
    print("=" * 50)

    GYRO_ENABLED = _ask_gyro()

    print("[server] Finding active Steam Controller interface…")

    dev = _find_active_device()
    if not dev:
        print("[server] No device found. Reconnect the controller and try again.")
        input("\nPress Enter to exit...")
        sys.exit(1)

    print(f"[server] Connected: {dev.product_name}")

    def _on_data(data):
        global _latest_report
        if data:
            with _lock:
                _latest_report = list(data)

    dev.set_raw_data_handler(_on_data)

    threading.Thread(target=_sdl_gyro_thread, daemon=True).start()
    _start_http_server()

    print(f"[server] WebSocket : ws://{HOST}:{PORT}")
    print(f"[server] Overlay   : http://{HOST}:{HTTP_PORT}/index.html")
    print("[server] Press Ctrl+C to stop.\n")

    async with websockets.serve(_ws_handler, HOST, PORT):
        await _broadcast_loop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[server] Stopped.")
        sys.exit(0)
