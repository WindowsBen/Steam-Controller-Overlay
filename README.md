# Steam Controller Overlay

An OBS browser source overlay for the **2026 Steam Controller** (VID `0x28DE` / PID `0x1304`).  
Displays button presses, analog triggers, trackpad touch, stick movement, and optional gyro tilt as animated visuals over a controller image.

---

## Installation

1. Download the latest **`steam-controller-overlay-vX.X.zip`** from the [Releases](../../releases) page
2. Extract to any folder
3. Run **`steam_controller_overlay.exe`**
4. Answer the gyro prompt in the console
5. Keep the console window open while streaming

---

## OBS Setup

Add a **Browser Source** in OBS:

| Setting | Value |
|---|---|
| URL | `http://localhost:47880/index.html` |
| Width | `1280` |
| Height | `720` |
| Shutdown source when not visible | ✅ |

For a transparent background, paste this into **Custom CSS**:
```css
body { background-color: rgba(0,0,0,0) !important; }
```

---

## Gyro Rotation

When the server starts you'll be asked:
```
Enable gyro rotation? [y/n]
```

If enabled, **hold both grip buttons** to tilt the controller overlay.  
The tilt is relative to where the controller was when you first grabbed both grips, and resets only when you restart the server.

---

## Button Images

Button visuals are full-size PNGs — same dimensions as `controller.png` — with the glow painted at the button's position and the rest transparent.  
Drop them into the `images/` folder named after their key:

| Group | Files |
|---|---|
| Face buttons | `A.png` `B.png` `X.png` `Y.png` |
| Bumpers | `LB.png` `RB.png` |
| Triggers | `LT.png` `RT.png` *(opacity scales with pressure)* |
| Center | `BACK.png` `START.png` `STEAM.png` `QUICK.png` |
| D-Pad | `DPAD_UP.png` `DPAD_DOWN.png` `DPAD_LEFT.png` `DPAD_RIGHT.png` |
| Grips | `LG.png` `RG.png` |
| Back paddles | `L4.png` `L5.png` `R4.png` `R5.png` |
| Stick caps | `LS.png` `RS.png` *(moves with the stick; glows on click)* |

Any button without a PNG falls back to a glowing circle.

---

## Calibration

Open `http://localhost:47880/index.html` in a browser and **double-click** anywhere to enter calibration mode.

- **Buttons** — drag the circles to their correct positions on the image
- **Zones** — click a trackpad or stick zone to select it, then:
  - `Scroll` → adjust width
  - `Shift + Scroll` → adjust height
  - `Ctrl + Scroll` → rotate

Click **Save Layout** to persist positions in the browser's `localStorage`.  
Click **Reset to Defaults** to restore the built-in layout.

---

## Troubleshooting

**"No device found"**  
→ Reconnect the controller and try again.

**Overlay background not transparent in OBS**  
→ In Browser Source settings, set Custom CSS to:
```css
body { background-color: rgba(0,0,0,0) !important; }
```

**Port already in use**  
→ Open Task Manager, find `steam_controller_overlay.exe`, and end it.

---

## For Developers

**Requirements:** Python 3.10+, `pip install websockets pywinusb pygame pyinstaller`

```bash
# First-time setup
install.bat

# Run from source (no build needed)
start.bat

# Build the release EXE + copy web files into dist/
build.bat
```
