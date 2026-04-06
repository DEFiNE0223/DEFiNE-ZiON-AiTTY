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
echo         Check system tray (bottom-right)
echo.

:: Launch tray
powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0tray.ps1"

if errorlevel 1 (
    echo.
    echo [ERROR] Tray launch failed.
    echo         Run this in admin PowerShell then retry:
    echo         Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
    echo.
    pause
)
