# Trading Bot Startup Script
# This script launches the complete trading bot system with background sync

Write-Host "🚀 Starting Trading Bot System..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Function to check if port is in use
function Test-Port {
    param($Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $connection -ne $null
}

# Function to kill process on port
function Stop-ProcessOnPort {
    param($Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($process) {
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Write-Host "🛑 Killed process on port $Port" -ForegroundColor Yellow
    }
}

# Function to wait for server to be ready
function Wait-ForServer {
    param($Url, $MaxAttempts = 30)
    $attempts = 0
    Write-Host "⏳ Waiting for server to be ready..." -ForegroundColor Yellow
    
    while ($attempts -lt $MaxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Server is ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            $attempts++
            Write-Host "⏳ Attempt $attempts/$MaxAttempts - Server not ready yet..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host "❌ Server failed to start within expected time" -ForegroundColor Red
    return $false
}

# Function to test background sync
function Test-BackgroundSync {
    Write-Host "🧪 Testing background sync..." -ForegroundColor Cyan
    
    try {
        # Test health endpoint
        $health = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -ErrorAction Stop
        Write-Host "✅ Health check passed" -ForegroundColor Green
        
        # Test sync data endpoint
        $syncData = Invoke-WebRequest -Uri "http://localhost:8000/api/sync/data" -ErrorAction Stop
        Write-Host "✅ Background sync data endpoint working" -ForegroundColor Green
        
        # Test force sync endpoint
        $forceSync = curl "http://localhost:8000/api/sync/force" -Method POST -ErrorAction Stop
        Write-Host "✅ Force sync endpoint working" -ForegroundColor Green
        
        return $true
    } catch {
        Write-Host "❌ Background sync test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Set working directory
Set-Location $PSScriptRoot
Write-Host "📁 Working directory: $PWD" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if required files exist
$requiredFiles = @("server.js", "trading-bot.js", "app.js", "index.html", "backend-api.js")
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing required file: $file" -ForegroundColor Red
        exit 1
    }
}

# Kill any existing processes on port 8000
if (Test-Port 8000) {
    Write-Host "🛑 Stopping existing process on port 8000..." -ForegroundColor Yellow
    Stop-ProcessOnPort 8000
    Start-Sleep -Seconds 2
}

# Update server.js to use port 8000
Write-Host "🔧 Updating server configuration..." -ForegroundColor Cyan
$serverContent = Get-Content "server.js" -Raw
$serverContent = $serverContent -replace "const port = process\.env\.PORT \|\| 3000", "const port = process.env.PORT || 8000"
$serverContent | Set-Content "server.js"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Start the backend server
Write-Host "🚀 Starting backend server on port 8000..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Minimized -PassThru | Out-Null

# Wait for server to be ready
if (Wait-ForServer "http://localhost:8000/api/health") {
    Write-Host "✅ Backend server started successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start backend server" -ForegroundColor Red
    exit 1
}

# Test background sync functionality
if (Test-BackgroundSync) {
    Write-Host "✅ Background sync system working!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Background sync test failed, but continuing..." -ForegroundColor Yellow
}

# Start local web server for frontend
Write-Host "🌐 Starting local web server..." -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "8080" -WindowStyle Minimized -ErrorAction SilentlyContinue
Start-Process -FilePath "python3" -ArgumentList "-m", "http.server", "8080" -WindowStyle Minimized -ErrorAction SilentlyContinue

# Alternative: Use Node.js http-server if available
try {
    npx http-server -p 8080 --cors -o
} catch {
    Write-Host "⚠️ http-server not available, using Python server" -ForegroundColor Yellow
}

# Wait a moment for web server to start
Start-Sleep -Seconds 3

# Open the frontend in browser
Write-Host "🌍 Opening frontend in browser..." -ForegroundColor Cyan
$frontendUrl = "http://localhost:8080"
Start-Process $frontendUrl

# Display status information
Write-Host ""
Write-Host "🎉 Trading Bot System Started Successfully!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "📊 Backend Server: http://localhost:8000" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔧 API Health: http://localhost:8000/api/health" -ForegroundColor Cyan
Write-Host "🔄 Background Sync: http://localhost:8000/api/sync/data" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎮 How to Use:" -ForegroundColor Yellow
Write-Host "  1. Use the web interface at http://localhost:8080" -ForegroundColor White
Write-Host "  2. Click '🔄 Force Sync' button for immediate updates" -ForegroundColor White
Write-Host "  3. Background sync runs automatically every 10-15 seconds" -ForegroundColor White
Write-Host "  4. All data persists across page refreshes" -ForegroundColor White
Write-Host ""
Write-Host "📋 Available API Endpoints:" -ForegroundColor Yellow
Write-Host "  GET  /api/health - Server health check" -ForegroundColor White
Write-Host "  GET  /api/sync/data - Background sync data" -ForegroundColor White
Write-Host "  POST /api/sync/force - Force background sync" -ForegroundColor White
Write-Host "  GET  /api/trades - Active trades" -ForegroundColor White
Write-Host "  GET  /api/history - Trade history" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop the system, close this window or press Ctrl+C" -ForegroundColor Red
Write-Host ""

# Keep the script running and monitor the system
try {
    while ($true) {
        # Check if backend is still running
        if (-not (Test-Port 8000)) {
            Write-Host "❌ Backend server stopped unexpectedly!" -ForegroundColor Red
            break
        }
        
        # Check if web server is still running
        if (-not (Test-Port 8080)) {
            Write-Host "❌ Web server stopped unexpectedly!" -ForegroundColor Red
            break
        }
        
        Start-Sleep -Seconds 30
        Write-Host "✅ System running normally - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
    }
} catch {
    Write-Host "🛑 Stopping Trading Bot System..." -ForegroundColor Yellow
    Stop-ProcessOnPort 8000
    Stop-ProcessOnPort 8080
    Write-Host "✅ Trading Bot System stopped" -ForegroundColor Green
} 