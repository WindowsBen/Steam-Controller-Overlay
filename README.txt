STEAM CONTROLLER OVERLAY
========================
OBS browser source overlay for the 2026 Steam Controller (VID 0x28DE, PID 0x1304).
Displays button presses, trigger levels, trackpad touch and stick movement
as animated visuals over a controller image.


INSTALLATION
------------
1. Download the latest release zip from the Releases page on GitHub.
2. Extract the zip to any folder (e.g. C:\Tools\SteamControllerOverlay\).
3. Run steam_controller_overlay.exe — a console window will open.
4. Answer the gyro prompt (see GYRO ROTATION below).
5. Keep the console window open while streaming.


ADD TO OBS
----------
Sources → + → Browser Source
  URL:    http://localhost:47880/index.html
  Width:  1280   Height: 720   (or match your canvas)
  Check "Shutdown source when not visible"

For a transparent background (recommended), set Custom CSS to:
  body { background-color: rgba(0,0,0,0) !important; }


GYRO ROTATION
-------------
When the server starts it will ask:

  Enable gyro rotation? [y/n]

If enabled, hold both grip buttons simultaneously to tilt the controller
overlay. The tilt is relative to the position when you first grabbed both
grips and resets only when you restart the server.


BUTTON IMAGES
-------------
Button press visuals are full-size PNGs (same dimensions as controller.png)
with the button glow painted at the correct position and the rest transparent.
Drop them into images/ named after the button key:

  Face buttons:   A.png  B.png  X.png  Y.png
  Bumpers:        LB.png  RB.png
  Triggers:       LT.png  RT.png   (opacity scales with analog pressure)
  Center:         BACK.png  START.png  STEAM.png  QUICK.png
  D-Pad:          DPAD_UP.png  DPAD_DOWN.png  DPAD_LEFT.png  DPAD_RIGHT.png
  Grips:          LG.png  RG.png
  Back paddles:   L4.png  L5.png  R4.png  R5.png

Stick caps (small square PNGs, transparent background):
  LS.png  RS.png   — move with the stick; glow on L3/R3 click

Any button without a PNG falls back to a glowing circle.


CALIBRATION
-----------
Open http://localhost:47880/index.html in a browser, then double-click
anywhere to enter calibration mode.

  Buttons:  Drag the circles onto their correct positions on the image.
  Zones:    Click a trackpad/stick zone to select it, then:
              Scroll          → adjust width
              Shift + Scroll  → adjust height
              Ctrl + Scroll   → rotate

Click Save Layout — positions persist in the browser's localStorage.
Click Reset to Defaults to restore the built-in layout.


FILES
-----
steam_controller_overlay.exe   Server (WebSocket + HTTP) — run this to start
index.html                     OBS browser source
js/overlay.js                  Overlay logic (visuals, WebSocket, calibration)
images/                        controller.png + all button PNGs


TROUBLESHOOTING
---------------
"No device found"
  • Reconnect the controller and try again.

Overlay background not transparent in OBS
  • In Browser Source settings, set Custom CSS to:
      body { background-color: rgba(0,0,0,0) !important; }

Port already in use
  • Another instance may still be running.
  • Open Task Manager, find steam_controller_overlay.exe, and end it.


FOR DEVELOPERS
--------------
Requirements: Python 3.10+, pip install websockets pywinusb pygame pyinstaller

Run from source:
  install.bat     (first time only — installs Python dependencies)
  start.bat       (launches the server without building an EXE)

Build the EXE:
  build.bat       (produces dist\steam_controller_overlay.exe + web files)
