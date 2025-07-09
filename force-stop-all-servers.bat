@echo off
echo 🔴 FORCE STOPPING ALL SERVERS AND FREEING PORTS...
echo.

REM Kill all Node.js processes
echo Stopping all Node.js processes...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Node.js processes stopped

REM Kill Python processes (web server)
echo Stopping Python web server...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im pythonw.exe >nul 2>&1
echo ✅ Python processes stopped

REM Kill any other processes that might be using our ports
echo Checking for processes using our ports...

REM Port 3000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Found process %%a using port 3000, killing it...
    taskkill /f /pid %%a >nul 2>&1
)

REM Port 3003 (Binance Proxy)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do (
    echo Found process %%a using port 3003, killing it...
    taskkill /f /pid %%a >nul 2>&1
)

REM Port 3004 (Kraken Proxy)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3004') do (
    echo Found process %%a using port 3004, killing it...
    taskkill /f /pid %%a >nul 2>&1
)

REM Port 8000 (Web Server)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo Found process %%a using port 8000, killing it...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ⏳ Waiting for ports to be freed (this may take up to 30 seconds)...
echo.

REM Wait and check ports multiple times
set /a attempts=0
:check_ports
set /a attempts+=1
echo Attempt %attempts%: Checking if ports are free...

set "all_free=true"

REM Check each port
netstat -an | findstr ":3000 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Port 3000 still in use
    set "all_free=false"
) else (
    echo ✅ Port 3000 is free
)

netstat -an | findstr ":3003 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Port 3003 still in use
    set "all_free=false"
) else (
    echo ✅ Port 3003 is free
)

netstat -an | findstr ":3004 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Port 3004 still in use
    set "all_free=false"
) else (
    echo ✅ Port 3004 is free
)

netstat -an | findstr ":8000 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Port 8000 still in use
    set "all_free=false"
) else (
    echo ✅ Port 8000 is free
)

if "%all_free%"=="true" (
    echo.
    echo 🎉 ALL PORTS ARE NOW FREE!
    echo.
    echo You can now run: start-all-servers.bat
    goto :end
)

if %attempts% geq 6 (
    echo.
    echo ⚠️ WARNING: Some ports are still in use after 30 seconds
    echo This is normal on Windows due to TIME_WAIT state
    echo You can try starting servers anyway, or wait a bit longer
    echo.
    echo To force start servers anyway, run: start-all-servers.bat
    goto :end
)

echo.
echo Waiting 5 seconds before next check...
timeout /t 5 /nobreak >nul
echo.
goto :check_ports

:end
echo.
echo Press any key to continue...
pause >nul 