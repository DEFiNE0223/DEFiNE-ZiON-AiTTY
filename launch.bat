@echo off
title DEFiNE-ZiON-AiTTY
cd /d "%~dp0"

echo.
echo   DEFiNE-ZiON-AiTTY  ^|  Mission Control
echo   ----------------------------------------
echo.

:: Node.js 확인
where node >nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo        https://nodejs.org 에서 설치 후 다시 실행하세요.
    pause
    exit /b 1
)

:: 의존성 설치
if not exist "node_modules" (
    echo [설치] npm 패키지를 설치합니다...
    npm install
    if errorlevel 1 (
        echo [오류] npm install 실패
        pause
        exit /b 1
    )
    echo.
)

:: data 폴더 생성
if not exist "data" mkdir data

:: 기존 포트 7654 프로세스 정리 (PowerShell 사용)
powershell -Command "$c=Get-NetTCPConnection -LocalPort 7654 -EA SilentlyContinue|Select -First 1;if($c -and $c.OwningProcess -gt 4){Stop-Process -Id $c.OwningProcess -Force -EA SilentlyContinue;Start-Sleep -Milliseconds 600}"

echo [시작] ZiON-AiTTY 트레이 앱을 시작합니다...
echo        우측 하단 트레이 아이콘을 확인하세요.
echo.
echo   우클릭   - 메뉴 (열기 / 재시작 / 로그 / 종료)
echo   더블클릭 - 브라우저 열기
echo.

:: 트레이 앱 실행
powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0tray.ps1"

if errorlevel 1 (
    echo.
    echo [오류] 트레이 앱 실행 실패.
    echo        관리자 PowerShell에서 아래 명령 실행 후 다시 시도하세요:
    echo        Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
    echo.
    pause
)
