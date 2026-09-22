@echo off
chcp 65001 > nul
title 마당 포털 - 크롬 북마크 GCP 동기화
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\sync_chrome_bookmarks.ps1"
pause
