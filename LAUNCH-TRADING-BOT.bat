@echo off
title 🚀 Trading Bot Launcher
color 0A

echo.
echo ========================================
echo    🚀 Trading Bot System Launcher
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "server.js" (
    echo ❌ Please run this script from the Trading Bot directory
    echo    Current directory: %CD%
    pause
    exit /b 1
)

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
echo ✅ Running from: %CD%

:: Kill any existing processes
echo 🛑 Stopping any existing processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Update server to use port 8000
echo 🔧 Configuring server for port 8000...
powershell -Command "(Get-Content 'server.js') -replace 'const port = process\.env\.PORT \|\| 3000', 'const port = process.env.PORT || 8000' | Set-Content 'server.js'"

:: Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

:: Start backend server
echo 🚀 Starting backend server...
start /min cmd /c "node server.js"

:: Wait for server
echo ⏳ Waiting for backend server to start...
timeout /t 8 /nobreak >nul

:: Test backend server
echo 🧪 Testing backend server...
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Backend server failed to start. Check the console for errors.
    pause
    exit /b 1
)

echo ✅ Backend server running on http://localhost:8000

:: Start Binance proxy server
echo 🚀 Starting Binance proxy server...
start /min cmd /c "node binance-proxy.js"

:: Wait for Binance proxy
echo ⏳ Waiting for Binance proxy to start...
timeout /t 3 /nobreak >nul

:: Test Binance proxy
echo 🧪 Testing Binance proxy...
curl -s http://localhost:3003/api/binance/ping >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Binance proxy may not be ready yet, continuing...
) else (
    echo ✅ Binance proxy running on http://localhost:3003
)

:: Start Kraken proxy server
echo 🚀 Starting Kraken proxy server...
start /min cmd /c "node kraken-proxy.js"

:: Wait for Kraken proxy
echo ⏳ Waiting for Kraken proxy to start...
timeout /t 3 /nobreak >nul

:: Test Kraken proxy
echo 🧪 Testing Kraken proxy...
curl -s http://localhost:3004/api/kraken/ping >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Kraken proxy may not be ready yet, continuing...
) else (
    echo ✅ Kraken proxy running on http://localhost:3004
)

:: Start web server
echo 🌐 Starting web server...
start /min cmd /c "python -m http.server 8080"
if %errorlevel% neq 0 (
    start /min cmd /c "python3 -m http.server 8080"
    if %errorlevel% neq 0 (
        echo ⚠️ Python not found, trying http-server...
        npx http-server -p 8080 --cors -o
    )
)

:: Wait for web server
timeout /t 3 /nobreak >nul

:: Open browser
echo 🌍 Opening trading interface...
start http://localhost:8080

:: Success message
echo.
echo ========================================
echo    🎉 Trading Bot Started Successfully!
echo ========================================
echo.
echo 📊 Backend: http://localhost:8000
echo 🌐 Frontend: http://localhost:8080
echo 🔗 Binance Proxy: http://localhost:3003
echo 🔗 Kraken Proxy: http://localhost:3004
echo.
echo 🎮 Features:
echo   ✅ Background sync every 10-15 seconds
echo   ✅ Real-time P&L calculations
echo   ✅ Data persistence across page refreshes
echo   ✅ Manual sync button available
echo   ✅ Binance & Kraken price data
echo.
echo 🛑 Press any key to stop the system...
pause >nul

:: Cleanup
echo 🛑 Stopping Trading Bot...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im python3.exe >nul 2>&1
echo ✅ Trading Bot stopped
pause 