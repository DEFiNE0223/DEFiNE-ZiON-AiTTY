@echo off
title WebSSH Launcher
cd /d "%~dp0"

echo.
echo  ██╗    ██╗███████╗██████╗ ███████╗███████╗██╗  ██╗
echo  ██║    ██║██╔════╝██╔══██╗██╔════╝██╔════╝██║  ██║
echo  ██║ █╗ ██║█████╗  ██████╔╝███████╗███████╗███████║
echo  ██║███╗██║██╔══╝  ██╔══██╗╚════██║╚════██║██╔══██║
echo  ╚███╔███╔╝███████╗██████╔╝███████║███████║██║  ██║
echo   ╚══╝╚══╝ ╚══════╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
echo.
echo  인프라 엔지니어를 위한 웹 SSH 클라이언트
echo  ─────────────────────────────────────────
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo       https://nodejs.org 에서 설치 후 다시 실행하세요.
    pause
    exit /b 1
)

:: Check dependencies
if not exist "node_modules" (
    echo [설치] npm 패키지를 설치합니다...
    npm install
    echo.
)

echo [시작] WebSSH 트레이 앱을 시작합니다...
echo        우측 하단 트레이 아이콘을 확인하세요.
echo.
echo  [트레이 아이콘 우클릭] - 메뉴
echo  [더블클릭]             - 브라우저 열기
echo.

:: Run tray app (PowerShell hidden window)
powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0tray.ps1"
