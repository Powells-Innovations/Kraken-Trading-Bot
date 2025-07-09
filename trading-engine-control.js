/**
 * Trading Engine Control Script
 * Simple command-line interface to control the trading engine
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8000/api';

async function makeRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        console.log(`Making request to: ${BASE_URL}${endpoint}`);
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.message.includes('fetch')) {
            console.error('Make sure the backend server is running on http://localhost:8000');
        }
        return null;
    }
}

async function startEngine() {
    console.log('🚀 Starting trading engine...');
    const result = await makeRequest('/trading/start', 'POST');
    if (result) {
        console.log('✅ Trading engine started successfully');
    }
}

async function stopEngine() {
    console.log('🛑 Stopping trading engine...');
    const result = await makeRequest('/trading/stop', 'POST');
    if (result) {
        console.log('✅ Trading engine stopped successfully');
    }
}

async function getStatus() {
    console.log('📊 Getting trading engine status...');
    const result = await makeRequest('/trading/status');
    if (result) {
        console.log('🤖 Trading Engine Status:');
        console.log(`  Running: ${result.isRunning ? '✅ Yes' : '❌ No'}`);
        console.log(`  Last Price Update: ${result.lastPriceUpdate || 'Never'}`);
        console.log(`  Active Trades: ${result.activeTradesCount}`);
    }
}

async function checkHealth() {
    console.log('🏥 Checking server health...');
    const result = await makeRequest('/health');
    if (result) {
        console.log('✅ Server is healthy');
        console.log(`  Timestamp: ${result.timestamp}`);
    }
}

// Main function
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            await startEngine();
            break;
        case 'stop':
            await stopEngine();
            break;
        case 'status':
            await getStatus();
            break;
        case 'health':
            await checkHealth();
            break;
        default:
            console.log('🤖 Trading Engine Control');
            console.log('');
            console.log('Usage: node trading-engine-control.js <command>');
            console.log('');
            console.log('Commands:');
            console.log('  start   - Start the trading engine');
            console.log('  stop    - Stop the trading engine');
            console.log('  status  - Get trading engine status');
            console.log('  health  - Check server health');
            console.log('');
            console.log('Examples:');
            console.log('  node trading-engine-control.js start');
            console.log('  node trading-engine-control.js status');
    }
}

// Run the script
main().catch(console.error); 