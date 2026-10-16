@echo off
chcp 65001 >nul
title MLB Playoff Tracker & Baseball Rules
cd /d "%~dp0"

if not exist node_modules (
    echo [MLB] Первая установка зависимостей...
    call npm install
)

echo [MLB] Запуск сервера и открытие браузера...
call npm run dev -- --open

pause
