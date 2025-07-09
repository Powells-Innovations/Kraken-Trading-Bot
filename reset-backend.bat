@echo off
echo 🔄 Resetting Trading Bot Backend...
echo.

REM Stop all Node.js processes
echo Stopping all Node.js processes...
taskkill /f /im node.exe >nul 2>&1
echo ✅ All Node.js processes stopped

REM Run the reset script
echo.
echo Running reset script...
node reset-backend.js

echo.
echo 🎉 Backend reset complete!
echo.
echo 📋 To start fresh:
echo 1. Run start-backend.bat to start the backend server
echo 2. Run start-servers.bat to start all servers
echo 3. Open http://localhost:8000 in your browser
echo 4. Clear browser localStorage: Press F12, go to Console, type: localStorage.clear()
echo 5. Refresh the page
echo.
pause 