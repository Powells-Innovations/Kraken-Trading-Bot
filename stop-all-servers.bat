@echo off
echo ========================================
echo    TRADING BOT - STOP ALL SERVERS
echo ========================================
echo.

:: Kill all Node.js and Python processes (as before)
echo Stopping all Node.js processes...
taskkill /f /im node.exe >nul 2>&1

echo Stopping all Python processes...
taskkill /f /im python.exe >nul 2>&1

:: Wait a moment for processes to close
echo Waiting for processes to stop...
timeout /t 2 >nul

:: Now force-kill any process using the key ports
echo Force-killing any process using trading bot ports...
set PORTS=3000 3003 3004 8000
for %%P in (%PORTS%) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P"') do (
        echo Killing process on port %%P with PID %%A
        taskkill /f /pid %%A >nul 2>&1
    )
)

:: Wait a moment for ports to be released
echo Waiting for ports to be released...
timeout /t 2 >nul

:: Check if ports are free
echo.
echo Checking if ports are free...
for %%P in (%PORTS%) do (
    netstat -ano | findstr ":%%P" >nul
    if %errorlevel% equ 0 (
        echo WARNING: Port %%P is still in use!
    ) else (
        echo ✓ Port %%P is free
    )
)

echo.
echo If any ports are still in use, wait a few seconds and run this script again.
echo All servers stopped and ports checked.
pause 