# Force Stop All Servers and Free Ports
Write-Host "🔴 FORCE STOPPING ALL SERVERS AND FREEING PORTS..." -ForegroundColor Red
Write-Host ""

# Kill all Node.js processes
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ Node.js processes stopped" -ForegroundColor Green

# Kill Python processes
Write-Host "Stopping Python web server..." -ForegroundColor Yellow
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "pythonw" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ Python processes stopped" -ForegroundColor Green

# Function to kill processes by port
function Kill-ProcessByPort {
    param([int]$Port)
    
    try {
        $connections = netstat -ano | Select-String ":$Port\s"
        foreach ($connection in $connections) {
            $parts = $connection -split '\s+'
            $pid = $parts[-1]
            if ($pid -match '^\d+$') {
                Write-Host "Found process $pid using port $Port, killing it..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-Host "Error checking port $Port: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Kill processes using our ports
Write-Host "Checking for processes using our ports..." -ForegroundColor Yellow
Kill-ProcessByPort 3000
Kill-ProcessByPort 3003
Kill-ProcessByPort 3004
Kill-ProcessByPort 8000

Write-Host ""
Write-Host "⏳ Waiting for ports to be freed..." -ForegroundColor Yellow
Write-Host ""

# Function to check if port is free
function Test-PortFree {
    param([int]$Port)
    
    try {
        $connections = netstat -ano | Select-String ":$Port\s"
        return $connections.Count -eq 0
    } catch {
        return $true
    }
}

# Wait and check ports
$attempts = 0
$maxAttempts = 10

do {
    $attempts++
    Write-Host "Attempt $attempts`: Checking if ports are free..." -ForegroundColor Cyan
    
    $port3000 = Test-PortFree 3000
    $port3003 = Test-PortFree 3003
    $port3004 = Test-PortFree 3004
    $port8000 = Test-PortFree 8000
    
    if ($port3000) { Write-Host "✅ Port 3000 is free" -ForegroundColor Green } else { Write-Host "❌ Port 3000 still in use" -ForegroundColor Red }
    if ($port3003) { Write-Host "✅ Port 3003 is free" -ForegroundColor Green } else { Write-Host "❌ Port 3003 still in use" -ForegroundColor Red }
    if ($port3004) { Write-Host "✅ Port 3004 is free" -ForegroundColor Green } else { Write-Host "❌ Port 3004 still in use" -ForegroundColor Red }
    if ($port8000) { Write-Host "✅ Port 8000 is free" -ForegroundColor Green } else { Write-Host "❌ Port 8000 still in use" -ForegroundColor Red }
    
    $allFree = $port3000 -and $port3003 -and $port3004 -and $port8000
    
    if ($allFree) {
        Write-Host ""
        Write-Host "🎉 ALL PORTS ARE NOW FREE!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now run: start-all-servers.bat" -ForegroundColor Cyan
        break
    }
    
    if ($attempts -ge $maxAttempts) {
        Write-Host ""
        Write-Host "⚠️ WARNING: Some ports are still in use after $($maxAttempts * 3) seconds" -ForegroundColor Yellow
        Write-Host "This is normal on Windows due to TIME_WAIT state" -ForegroundColor Yellow
        Write-Host "You can try starting servers anyway, or wait a bit longer" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To force start servers anyway, run: start-all-servers.bat" -ForegroundColor Cyan
        break
    }
    
    Write-Host ""
    Write-Host "Waiting 3 seconds before next check..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Write-Host ""
    
} while ($true)

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 