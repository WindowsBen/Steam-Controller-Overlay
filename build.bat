@echo off
echo ============================================================
echo  Steam Controller Overlay - EXE builder
echo ============================================================
echo.

pip install pyinstaller >nul 2>&1

pyinstaller --onefile --name steam_controller_overlay --console steam_server.py

if errorlevel 1 (
    echo.
    echo Build FAILED. See errors above.
    pause
    exit /b 1
)

echo.
echo Build complete.  EXE is at:  dist\steam_controller_overlay.exe
echo.
echo Copying web files into dist\ ...
xcopy /E /I /Y images dist\images\ >nul
xcopy /E /I /Y js     dist\js\     >nul
copy  /Y index.html   dist\        >nul
copy  /Y README.txt   dist\        >nul

echo.
echo dist\ is ready to zip and release:
echo   steam_controller_overlay.exe
echo   index.html
echo   js\
echo   images\
echo.
pause
