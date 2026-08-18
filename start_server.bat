@echo off
chcp 65001 > nul
title Portal Bang Web Server
echo ========================================================
echo   Portal Bang Web Server Starting...
echo   Local Access: http://localhost:8080
echo   Network Access: http://192.168.219.115:8080
echo ========================================================
echo.

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server process ended unexpectedly.
    pause
)
