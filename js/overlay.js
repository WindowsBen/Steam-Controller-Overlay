// ─── DEFAULT BUTTON LAYOUT ────────────────────────────────────────────────────
// x/y = percentage of the controller IMAGE size (0–100), not the window.
// name = button key from steam_server.py BUTTON_BITS (or 'LT'/'RT').
const DEFAULT_LAYOUT = {
  buttons: [
    // Face buttons
    { name: 'A',          label: 'A',      color: '#5cbf5e', x: 81.03, y: 29.04, r: 14 },
    { name: 'B',          label: 'B',      color: '#e05c5c', x: 86.95, y: 22.18, r: 14 },
    { name: 'X',          label: 'X',      color: '#5c8ae0', x: 75.23, y: 21.88, r: 14 },
    { name: 'Y',          label: 'Y',      color: '#e0c95c', x: 80.68, y: 15.02, r: 14 },
    // Bumpers / Triggers
    { name: 'LB',         label: 'LB',     color: '#dddddd', x: 19.55, y:  6.78, r: 13 },
    { name: 'RB',         label: 'RB',     color: '#dddddd', x: 80.92, y:  6.48, r: 13 },
    { name: 'LT',         label: 'LT',     color: '#aaaaff', x: 21.29, y:  2.67, r: 12 },
    { name: 'RT',         label: 'RT',     color: '#aaaaff', x: 79.29, y:  2.67, r: 12 },
    // Center buttons
    { name: 'BACK',       label: 'Back',   color: '#aaaaaa', x: 32.19, y: 12.88, r: 10 },
    { name: 'START',      label: 'Start',  color: '#aaaaaa', x: 67.92, y: 12.88, r: 10 },
    { name: 'STEAM',      label: 'Steam',  color: '#00bbff', x: 50.06, y: 22.03, r: 11 },
    { name: 'QUICK',      label: '···',    color: '#888888', x: 49.94, y: 56.02, r: 10 },
    // Joysticks
    { name: 'L3',         label: 'L3',     color: '#aaaaff', x: 35.32, y: 32.85, r: 13 },
    { name: 'R3',         label: 'R3',     color: '#aaaaff', x: 64.79, y: 33.16, r: 13 },
    // D-Pad
    { name: 'DPAD_UP',    label: 'D↑',     color: '#aaddff', x: 19.20, y: 15.47, r: 10 },
    { name: 'DPAD_DOWN',  label: 'D↓',     color: '#aaddff', x: 18.85, y: 28.28, r: 10 },
    { name: 'DPAD_LEFT',  label: 'D←',     color: '#aaddff', x: 13.75, y: 22.64, r: 10 },
    { name: 'DPAD_RIGHT', label: 'D→',     color: '#aaddff', x: 24.42, y: 21.88, r: 10 },
    // Grip squeezes
    { name: 'LG',         label: 'LG',     color: '#ff9944', x:  7.02, y: 69.89, r: 11 },
    { name: 'RG',         label: 'RG',     color: '#ff9944', x: 94.14, y: 68.67, r: 11 },
    // Back paddles
    { name: 'L4',         label: 'L4',     color: '#ff6688', x: 15.84, y: 61.66, r: 11 },
    { name: 'L5',         label: 'L5',     color: '#ff6688', x: 15.60, y: 78.28, r: 11 },
    { name: 'R4',         label: 'R4',     color: '#ff6688', x: 84.28, y: 61.81, r: 11 },
    { name: 'R5',         label: 'R5',     color: '#ff6688', x: 84.51, y: 78.43, r: 11 },
  ],

  // Analog widgets — positions are % of image, same coordinate system as buttons.
  // Triggers: vertical fill bars.  Trackpads/sticks: bounded zone with a dot.
  analogs: {
    LT_bar:  { x: 16,   y: 3,    w: 5,    h: 11,   color: '#aaaaff' },
    RT_bar:  { x: 84,   y: 3,    w: 5,    h: 11,   color: '#aaaaff' },
    // Zone: centre (cx,cy) and half-size (hw,hh) as % of image; shape: 'square'|'circle'
    LP_zone: { cx: 30.9, cy: 56.2, hw: 10.5, hh: 14, color: '#cccccc', shape: 'square', rotate:   9 },
    RP_zone: { cx: 69.3, cy: 56.2, hw: 10.5, hh: 14, color: '#cccccc', shape: 'square', rotate: -10 },
    LS_zone: { cx: 35.3, cy: 33.4, hw:  5.5, hh:  7, color: '#aaaaff', shape: 'circle', rotate:   0 },
    RS_zone: { cx: 64.7, cy: 33.4, hw:  5.5, hh:  7, color: '#aaaaff', shape: 'circle', rotate:   0 },
  },
};

// ─── LAYOUT STORAGE ───────────────────────────────────────────────────────────
const LAYOUT_KEY = 'sc-overlay-layout-v1';

function getLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return structuredClone(DEFAULT_LAYOUT);
    const saved = JSON.parse(raw);
    const merged = structuredClone(DEFAULT_LAYOUT);
    // Merge saved button positions
    const savedPos = Object.fromEntries((saved.buttons || []).map(b => [b.name, b]));
    for (const btn of merged.buttons) {
      if (savedPos[btn.name]) {
        btn.x = savedPos[btn.name].x;
        btn.y = savedPos[btn.name].y;
        btn.r = savedPos[btn.name].r;
      }
    }
    // Merge saved analog zone configs
    if (saved.analogs) {
      for (const [key, cfg] of Object.entries(saved.analogs)) {
        if (merged.analogs[key]) Object.assign(merged.analogs[key], cfg);
      }
    }
    return merged;
  } catch {
    return structuredClone(DEFAULT_LAYOUT);
  }
}

function saveLayout(layout) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify({
    buttons: layout.buttons,
    analogs: layout.analogs,
  }));
}

// ─── HOTSPOT LAYER ────────────────────────────────────────────────────────────
const layer = document.getElementById('hotspot-layer');
const btnEls     = {};   // name → <div.hotspot>
const btnOverlays = {};  // name → <img.btn-overlay>  (full-size PNG; entry absent if image missing)
const analogEls  = {};   // key  → element(s)

function buildHotspots(layout) {
  layer.innerHTML = '';
  Object.keys(btnEls).forEach(k => delete btnEls[k]);
  Object.keys(btnOverlays).forEach(k => delete btnOverlays[k]);
  Object.keys(analogEls).forEach(k => delete analogEls[k]);

  for (const btn of layout.buttons) {
    // Calibration circle
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.style.setProperty('--color', btn.color);
    el.style.left   = btn.x + '%';
    el.style.top    = btn.y + '%';
    el.style.width  = btn.r * 2 + 'px';
    el.style.height = btn.r * 2 + 'px';
    el.title = `${btn.label} (${btn.name})`;
    layer.appendChild(el);
    btnEls[btn.name] = el;

    // Full-size overlay: same dimensions as the controller image.
    // The PNG itself positions the glow — rest of image is transparent.
    const img = document.createElement('img');
    img.className = 'btn-overlay';
    img.style.setProperty('--color', btn.color);
    img.style.left   = '0';
    img.style.top    = '0';
    img.style.width  = '100%';
    img.style.height = '100%';
    // Attach listeners BEFORE setting src so cached images don't miss the load event
    img.addEventListener('load',  () => el.classList.add('has-image'));
    img.addEventListener('error', () => {
      img.remove();
      delete btnOverlays[btn.name];
    });
    img.src = `images/${btn.name}.png`;
    layer.appendChild(img);
    btnOverlays[btn.name] = img;
  }

  const a = layout.analogs;

  // Trigger bars -------------------------------------------------------
  for (const [key, cfg] of [['LT_bar', a.LT_bar], ['RT_bar', a.RT_bar]]) {
    const wrap = document.createElement('div');
    wrap.className = 'trigger-bar-wrap';
    wrap.style.left   = cfg.x + '%';
    wrap.style.top    = cfg.y + '%';
    wrap.style.width  = cfg.w + '%';
    wrap.style.height = cfg.h + '%';
    wrap.style.setProperty('--color', cfg.color);

    const fill = document.createElement('div');
    fill.className = 'trigger-bar-fill';
    wrap.appendChild(fill);
    layer.appendChild(wrap);
    analogEls[key] = fill; // we update fill's height %
  }

  // Trackpad / stick zones ---------------------------------------------
  for (const [key, cfg] of [
    ['LP_zone', a.LP_zone], ['RP_zone', a.RP_zone],
    ['LS_zone', a.LS_zone], ['RS_zone', a.RS_zone],
  ]) {
    const zone = document.createElement('div');
    zone.className = 'analog-zone';
    zone.style.left        = (cfg.cx - cfg.hw) + '%';
    zone.style.top         = (cfg.cy - cfg.hh) + '%';
    zone.style.width       = (cfg.hw * 2) + '%';
    zone.style.height      = (cfg.hh * 2) + '%';
    zone.style.borderRadius = cfg.shape === 'square' ? '8px' : '50%';
    zone.style.transform    = cfg.rotate ? `rotate(${cfg.rotate}deg)` : '';
    zone.style.overflow     = (key === 'LS_zone' || key === 'RS_zone') ? 'visible' : 'hidden';
    zone.style.setProperty('--color', cfg.color);

    const dot = document.createElement('div');
    dot.className = 'analog-dot';
    dot.style.setProperty('--color', cfg.color);
    zone.appendChild(dot);

    // Stick cap image — only for joystick zones
    let cap = null;
    if (key === 'LS_zone' || key === 'RS_zone') {
      cap = document.createElement('img');
      cap.style.cssText = 'position:absolute;transform:translate(-50%,-50%);width:80%;height:auto;pointer-events:none;left:50%;top:50%;';
      // Listener BEFORE src so cached images don't miss the event
      cap.addEventListener('load',  () => { dot.style.display = 'none'; dot.style.opacity = '0'; });
      cap.addEventListener('error', () => { cap = null; });
      cap.src = `images/${key === 'LS_zone' ? 'LS' : 'RS'}.png`;
      zone.appendChild(cap);
    }

    layer.appendChild(zone);
    // store {zone, dot, cap, cfg} so tick can position them
    analogEls[key] = { zone, dot, cap, cfg };
  }
}

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────
let wsState = null;

function connectWebSocket() {
  let ws;
  try {
    ws = new WebSocket('ws://localhost:47878');
  } catch {
    setTimeout(connectWebSocket, 3000);
    return;
  }
  ws.onopen    = () => console.log('[overlay] Server connected');
  ws.onclose   = () => { wsState = null; setTimeout(connectWebSocket, 3000); };
  ws.onerror   = () => {};
  ws.onmessage = (e) => { try { wsState = JSON.parse(e.data); } catch {} };
}

connectWebSocket();

// ─── GYRO ROTATION ────────────────────────────────────────────────────────────
// GYRO_ROLL  = tilt left/right (most natural for a horizontal overlay)
// GYRO_PITCH = tilt forward/back
// Both grips must be held simultaneously to activate gyro rotation.
const wrap = document.getElementById('controller-wrap');

let gyroRoll = 0, gyroRollDisplay = 0, gyroRollBaseline = null;
let gyroPitch = 0, gyroPitchDisplay = 0, gyroPitchBaseline = null;
const GYRO_SMOOTH = 0.08;

// ─── STATE APPLICATION ────────────────────────────────────────────────────────
// Deadzone for analog sticks / trackpads — values closer to centre than this
// are clamped to exactly 0 so tiny idle noise doesn't jitter the dot.
const ANALOG_DEAD = 0.04;

function applyState(state, layout) {
  if (!state) return;

  // Buttons — toggle circle (fallback) and image overlay (if loaded)
  for (const btn of layout.buttons) {
    const pressed = !!state.buttons[btn.name];
    const el  = btnEls[btn.name];
    const img = btnOverlays[btn.name];

    // L3/R3: suppress circle, apply glow to the stick cap instead
    if (btn.name === 'L3' || btn.name === 'R3') {
      const zoneKey  = btn.name === 'L3' ? 'LS_zone' : 'RS_zone';
      const capEntry = analogEls[zoneKey];
      if (capEntry?.cap) {
        capEntry.cap.style.filter = pressed
          ? 'brightness(2.0) drop-shadow(0 0 10px #aaaaff)'
          : '';
      }
      continue;
    }

    if (el)  el.classList.toggle('pressed', pressed);
    if (img) img.classList.toggle('pressed', pressed);
  }

  // Triggers — analog opacity proportional to axis value (0 → invisible, 1 → full)
  if (state.axes) {
    const TRIGGER_DEAD = 0.03;
    for (const [name, axisKey] of [['LT', 'LT_axis'], ['RT', 'RT_axis']]) {
      const img = btnOverlays[name];
      if (!img) continue;
      const val = Math.max(0, (state.axes[axisKey] ?? 0) - TRIGGER_DEAD) / (1 - TRIGGER_DEAD);
      img.style.opacity = val.toFixed(3);
    }
  }

  if (!state.axes) return;
  const ax = state.axes;

  // Trigger fill bars — clamp noise below 3 % to zero so phantom micro-fills don't show
  const TRIGGER_DEAD = 0.03;
  const ltFill = ax.LT_axis > TRIGGER_DEAD ? ax.LT_axis : 0;
  const rtFill = ax.RT_axis > TRIGGER_DEAD ? ax.RT_axis : 0;
  if (analogEls['LT_bar']) analogEls['LT_bar'].style.height = (ltFill * 100).toFixed(1) + '%';
  if (analogEls['RT_bar']) analogEls['RT_bar'].style.height = (rtFill * 100).toFixed(1) + '%';

  // Trackpad / stick dots (-1..1 → 0..100% within zone)
  // Sticks get a dead zone (mechanical noise at centre); trackpads do not.
  const deadStick = (v) => Math.abs(v) < ANALOG_DEAD ? 0 : v;

  // Touch detection: LP_X/LP_Y go non-zero on light touch; LP_PRESS only on harder press.
  // So use position magnitude to detect touch, and LP_PRESS only for darkening.
  const TOUCH_POS_MIN = 0.005;  // any position above this = finger on pad
  const PRESS_SCALE   = 0.02;   // LP_PRESS value that counts as "fully pressed" visually
  const lpPress = ax.LP_PRESS ?? 0;
  const rpPress = ax.RP_PRESS ?? 0;
  const lpTouch = Math.abs(ax.LP_X ?? 0) > TOUCH_POS_MIN || Math.abs(ax.LP_Y ?? 0) > TOUCH_POS_MIN;
  const rpTouch = Math.abs(ax.RP_X ?? 0) > TOUCH_POS_MIN || Math.abs(ax.RP_Y ?? 0) > TOUCH_POS_MIN;
  // 0 = light touch, 1 = hard press (dot brightest + largest)
  const lpIntensity = Math.min(1, Math.max(0, lpPress) / PRESS_SCALE);
  const rpIntensity = Math.min(1, Math.max(0, rpPress) / PRESS_SCALE);

  // [nx, ny, active, pressureIntensity, isStick]
  const zoneMap = {
    LP_zone: [ax.LP_X ?? 0, ax.LP_Y ?? 0, lpTouch, lpIntensity, false],
    RP_zone: [ax.RP_X ?? 0, ax.RP_Y ?? 0, rpTouch, rpIntensity, false],
    LS_zone: [ax.LS_X ?? 0, ax.LS_Y ?? 0, true,    0,           true ],
    RS_zone: [ax.RS_X ?? 0, ax.RS_Y ?? 0, true,    0,           true ],
  };
  for (const [key, [nx, ny, active, intensity, isStick]] of Object.entries(zoneMap)) {
    const entry = analogEls[key];
    if (!entry) continue;
    // Map -1..1 → 0..100% within zone; Y inverted (controller +Y = up = smaller % top)
    const pos = isStick ? deadStick : (v) => v;
    const px = ((pos(nx) + 1) / 2 * 100).toFixed(1) + '%';
    const py = (((-pos(ny)) + 1) / 2 * 100).toFixed(1) + '%';
    entry.dot.style.left    = px;
    entry.dot.style.top     = py;
    // Sticks: dot always hidden (cap image handles visual); trackpads: show on touch
    entry.dot.style.opacity = isStick ? '0' : (active ? '0.85' : '0');
    if (entry.cap) {
      entry.cap.style.left = px;
      entry.cap.style.top  = py;
    }
    // Brighten + grow trackpad dot with pressure
    if (!isStick && active) {
      const brightness = (1.0 + intensity * 4.0).toFixed(2);   // 1.0 → 5.0
      const scale      = (1.0 + intensity * 1.5).toFixed(2);   // 1.0 → 2.5×
      entry.dot.style.filter    = `brightness(${brightness})`;
      entry.dot.style.transform = `translate(-50%, -50%) scale(${scale})`;
    } else {
      entry.dot.style.filter    = '';
      entry.dot.style.transform = 'translate(-50%, -50%)';
    }
  }

  // Gyro rotation — only when the server was started with gyro enabled
  if (state.gyro) {
    const bothGrips = state.buttons.LG && state.buttons.RG;
    const rawRoll   = ax.GYRO_ROLL;
    const rawPitch  = ax.GYRO_PITCH;

    if (bothGrips && rawRoll != null) {
      if (gyroRollBaseline === null) {
        gyroRollBaseline  = rawRoll;
        gyroPitchBaseline = rawPitch ?? 0;
      }
      gyroRoll  = -(rawRoll  - gyroRollBaseline);
      gyroPitch = rawPitch != null ? -(rawPitch - gyroPitchBaseline) : 0;
    } else {
      gyroRoll  *= 0.82;  if (Math.abs(gyroRoll)  < 0.1) gyroRoll  = 0;
      gyroPitch *= 0.82;  if (Math.abs(gyroPitch) < 0.1) gyroPitch = 0;
    }

    gyroRollDisplay  += (gyroRoll  - gyroRollDisplay)  * GYRO_SMOOTH;
    gyroPitchDisplay += (gyroPitch - gyroPitchDisplay) * GYRO_SMOOTH;
    if (Math.abs(gyroRollDisplay)  < 0.05) gyroRollDisplay  = 0;
    if (Math.abs(gyroPitchDisplay) < 0.05) gyroPitchDisplay = 0;

    wrap.style.transform = (gyroRollDisplay || gyroPitchDisplay)
      ? `perspective(900px) rotateZ(${gyroRollDisplay.toFixed(2)}deg) rotateX(${gyroPitchDisplay.toFixed(2)}deg)`
      : '';
  }
}

// ─── CALIBRATION MODE ────────────────────────────────────────────────────────
let dragging     = null;   // hotspot element being dragged
let draggingZone = null;   // { key, startX, startY, startCx, startCy }
let selectedZoneKey = null;

// Apply a zone's cfg back to its DOM element
function applyZoneStyle(key) {
  const { zone, cfg } = analogEls[key];
  zone.style.left      = (cfg.cx - cfg.hw) + '%';
  zone.style.top       = (cfg.cy - cfg.hh) + '%';
  zone.style.width     = (cfg.hw * 2) + '%';
  zone.style.height    = (cfg.hh * 2) + '%';
  zone.style.transform = cfg.rotate ? `rotate(${cfg.rotate}deg)` : '';
}

function updateZoneReadout(key) {
  const { cfg } = analogEls[key];
  document.getElementById('zr-name').textContent = key.replace('_zone', '');
  document.getElementById('zr-cx').textContent   = cfg.cx.toFixed(1);
  document.getElementById('zr-cy').textContent   = cfg.cy.toFixed(1);
  document.getElementById('zr-hw').textContent   = cfg.hw.toFixed(1);
  document.getElementById('zr-hh').textContent   = cfg.hh.toFixed(1);
  document.getElementById('zr-rot').textContent  = (cfg.rotate ?? 0).toFixed(1);
  document.getElementById('zone-readout').style.display = 'block';
}

layer.addEventListener('mousedown', e => {
  if (!document.body.classList.contains('calibrating')) return;

  // Zone click — find which zone was hit
  const zoneEl = e.target.closest?.('.analog-zone');
  if (zoneEl) {
    for (const [key, entry] of Object.entries(analogEls)) {
      if (entry.zone === zoneEl) {
        selectedZoneKey = key;
        document.querySelectorAll('.analog-zone').forEach(z => z.classList.remove('selected'));
        document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('selected'));
        zoneEl.classList.add('selected');
        draggingZone = { key, startX: e.clientX, startY: e.clientY,
                         startCx: entry.cfg.cx, startCy: entry.cfg.cy };
        updateZoneReadout(key);
        e.preventDefault();
        return;
      }
    }
  }

  // Hotspot click
  if (e.target.classList.contains('hotspot')) {
    selectedZoneKey = null;
    document.querySelectorAll('.analog-zone').forEach(z => z.classList.remove('selected'));
    document.getElementById('zone-readout').style.display = 'none';
    dragging = e.target;
    document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('selected'));
    dragging.classList.add('selected');
    e.preventDefault();
  }
});

document.addEventListener('mousemove', e => {
  if (draggingZone) {
    const { key, startX, startY, startCx, startCy } = draggingZone;
    const rect = layer.getBoundingClientRect();
    const dx = (e.clientX - startX) / rect.width  * 100;
    const dy = (e.clientY - startY) / rect.height * 100;
    const cfg = analogEls[key].cfg;
    cfg.cx = Math.round((startCx + dx) * 10) / 10;
    cfg.cy = Math.round((startCy + dy) * 10) / 10;
    applyZoneStyle(key);
    updateZoneReadout(key);
    return;
  }
  if (!dragging) return;
  const rect = layer.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(2);
  const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(2);
  dragging.style.left = x + '%';
  dragging.style.top  = y + '%';
});

document.addEventListener('mouseup', () => {
  dragging = null;
  draggingZone = null;
});

// Scroll on selected zone: width / height / rotation
layer.addEventListener('wheel', e => {
  if (!document.body.classList.contains('calibrating') || !selectedZoneKey) return;
  e.preventDefault();
  const cfg  = analogEls[selectedZoneKey].cfg;
  const step = e.deltaY < 0 ? 0.5 : -0.5;
  if (e.ctrlKey) {
    cfg.rotate = Math.round(((cfg.rotate ?? 0) + (e.deltaY < 0 ? 1 : -1)) * 10) / 10;
  } else if (e.shiftKey) {
    cfg.hh = Math.max(1, Math.round((cfg.hh + step) * 10) / 10);
  } else {
    cfg.hw = Math.max(1, Math.round((cfg.hw + step) * 10) / 10);
  }
  applyZoneStyle(selectedZoneKey);
  updateZoneReadout(selectedZoneKey);
}, { passive: false });

document.addEventListener('dblclick', () => {
  document.body.classList.toggle('calibrating');
  if (!document.body.classList.contains('calibrating')) {
    selectedZoneKey = null;
    document.getElementById('zone-readout').style.display = 'none';
  }
});

document.getElementById('cal-save').addEventListener('click', () => {
  const layout = getLayout();
  // Save button positions from DOM
  for (const btn of layout.buttons) {
    const el = btnEls[btn.name];
    if (el) {
      btn.x = parseFloat(el.style.left);
      btn.y = parseFloat(el.style.top);
    }
  }
  // Save zone configs from live cfg objects
  for (const [key, entry] of Object.entries(analogEls)) {
    if (entry.cfg && layout.analogs[key]) {
      Object.assign(layout.analogs[key], entry.cfg);
    }
  }
  saveLayout(layout);
  // Rebuild DOM so overlay images move to their new positions immediately
  buildHotspots(layout);
  const calBtn = document.getElementById('cal-save');
  calBtn.textContent = 'Saved ✓';
  setTimeout(() => { calBtn.textContent = 'Save Layout'; }, 1500);
});

document.getElementById('cal-reset').addEventListener('click', () => {
  if (confirm('Reset all positions to defaults?')) {
    localStorage.removeItem(LAYOUT_KEY);
    buildHotspots(getLayout());
  }
});

document.getElementById('cal-done').addEventListener('click', () => {
  document.body.classList.remove('calibrating');
  selectedZoneKey = null;
  document.getElementById('zone-readout').style.display = 'none';
});

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
let layout = getLayout();
buildHotspots(layout);

function tick() {
  requestAnimationFrame(tick);
  applyState(wsState, layout);
}

tick();
