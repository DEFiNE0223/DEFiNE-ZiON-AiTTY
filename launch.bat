@echo off
title DEFiNE-ZiON-AiTTY
cd /d "%~dp0"

echo.
echo   DEFiNE-ZiON-AiTTY - Mission Control
echo   ------------------------------------
echo.

:: Node.js check
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [INSTALL] Running npm install...
    npm install
    echo.
)

:: Create data folder
if not exist "data" mkdir data

:: Kill existing process on port 7654
powershell -Command "$c=Get-NetTCPConnection -LocalPort 7654 -EA SilentlyContinue|Select -First 1;if($c -and $c.OwningProcess -gt 4){Stop-Process -Id $c.OwningProcess -Force -EA SilentlyContinue;Start-Sleep -Milliseconds 600}"

echo [START] Launching tray app...
echo         This window will close automatically.
echo         Tray icon appears in the system tray (bottom-right corner).
echo         Right-click the tray icon to Open or Exit.
echo.
timeout /t 2 /nobreak >nul

:: Launch tray as a fully detached hidden process, then close this CMD window.
:: Using Start-Process ensures the PS window is hidden from the start.
powershell -Command "Start-Process -FilePath powershell -ArgumentList @('-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-NonInteractive','-File','%~dp0tray.ps1') -WindowStyle Hidden"

exit
