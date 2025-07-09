@echo off
title Trading Bot - Fixed Startup
color 0A

echo ========================================
echo    TRADING BOT - FIXED STARTUP
echo ========================================
echo.

echo [1/5] Checking and killing existing processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 >nul

echo [2/5] Checking port availability...
netstat -ano | findstr ":8000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Port 8000 is in use! Killing process...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 >nul
)

echo [3/5] Starting Backend Server (Port 8000)...
start "Backend Server" cmd /k "node server.js"
timeout /t 3 >nul

echo [4/5] Starting Proxy Servers...
start "Binance Proxy" cmd /k "node binance-proxy.js"
timeout /t 2 >nul
start "Kraken Proxy" cmd /k "node kraken-proxy.js"
timeout /t 2 >nul

echo [5/5] Starting Frontend Server...
start "Frontend Server" cmd /k "python -m http.server 8080 --directory ."
timeout /t 2 >nul

echo.
echo ========================================
echo    ✅ ALL SERVICES STARTED
echo ========================================
echo.
echo 🌐 Frontend: http://localhost:8080
echo 🔧 Backend: http://localhost:8000/api
echo 📊 Binance Proxy: http://localhost:3003
echo 🏦 Kraken Proxy: http://localhost:3004
echo.
echo Press any key to open the frontend...
pause >nul
start http://localhost:8080

echo.
echo 🚀 Trading Bot is ready!
echo.
pause 