const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple server to serve the clear-browser-data.html file
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Clear Browser Data</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .btn { background: #dc3545; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; margin: 10px 5px; }
        .status { margin: 20px 0; padding: 15px; border-radius: 5px; display: none; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🧹 Clear Browser Data</h1>
    <p>This will clear all stored data for the Trading Bot application.</p>
    
    <div class="info">
        <h3>⚠️ What this will clear:</h3>
        <ul>
            <li>All localStorage data (trading settings, API keys, etc.)</li>
            <li>All sessionStorage data</li>
            <li>All cookies for this domain</li>
            <li>All cached data</li>
        </ul>
    </div>

    <div id="status" class="status"></div>

    <div>
        <button class="btn" onclick="clearAllData()">Clear All Data</button>
        <button class="btn" onclick="checkData()">Check Current Data</button>
        <button class="btn" onclick="goToTradingBot()">Go to Trading Bot</button>
    </div>

    <div id="dataInfo" style="margin-top: 20px; display: none;">
        <h3>Current Data:</h3>
        <pre id="dataDisplay"></pre>
    </div>

    <script>
        function showStatus(message, type = 'success') {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = 'status ' + type;
            status.style.display = 'block';
        }

        function clearAllData() {
            try {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach(function(c) { 
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                });
                showStatus('✅ All browser data cleared successfully!', 'success');
                document.getElementById('dataInfo').style.display = 'none';
            } catch (error) {
                showStatus('❌ Error clearing data: ' + error.message, 'error');
            }
        }

        function checkData() {
            try {
                const dataInfo = {
                    localStorage: {},
                    sessionStorage: {},
                    cookies: document.cookie
                };
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    dataInfo.localStorage[key] = localStorage.getItem(key);
                }
                
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    dataInfo.sessionStorage[key] = sessionStorage.getItem(key);
                }
                
                const dataDisplay = document.getElementById('dataDisplay');
                dataDisplay.textContent = JSON.stringify(dataInfo, null, 2);
                document.getElementById('dataInfo').style.display = 'block';
                
                if (Object.keys(dataInfo.localStorage).length === 0 && 
                    Object.keys(dataInfo.sessionStorage).length === 0 && 
                    !dataInfo.cookies) {
                    showStatus('ℹ️ No stored data found', 'success');
                } else {
                    showStatus('ℹ️ Found stored data (see below)', 'success');
                }
            } catch (error) {
                showStatus('❌ Error checking data: ' + error.message, 'error');
            }
        }

        function goToTradingBot() {
            window.location.href = 'http://localhost:8000';
        }

        window.onload = function() {
            checkData();
        };
    </script>
</body>
</html>
        `);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(8001, () => {
    console.log('🧹 Browser data clearing server running on http://localhost:8001');
    console.log('');
    console.log('📋 Instructions:');
    console.log('1. Open http://localhost:8001 in your browser');
    console.log('2. Click "Clear All Data" button');
    console.log('3. Then go to http://localhost:8000 for your trading bot');
    console.log('');
    console.log('Press Ctrl+C to stop this server');
}); 