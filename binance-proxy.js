const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3003;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Proxy endpoint for Binance ticker data
app.get('/api/binance/ticker', async (req, res) => {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ticker data from Binance', details: error.message });
    }
});

// Proxy endpoint for Binance OHLC data
app.get('/api/binance/klines', async (req, res) => {
    try {
        const { symbol, interval, limit, startTime, endTime } = req.query;
        let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}`;
        
        if (limit) url += `&limit=${limit}`;
        if (startTime) url += `&startTime=${startTime}`;
        if (endTime) url += `&endTime=${endTime}`;
        
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch OHLC data from Binance', details: error.message });
    }
});

// Proxy endpoint for Binance current price
app.get('/api/binance/price', async (req, res) => {
    try {
        const { symbol } = req.query;
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch price from Binance', details: error.message });
    }
});

// Proxy endpoint for Binance exchange info
app.get('/api/binance/exchangeInfo', async (req, res) => {
    try {
        const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch exchange info from Binance', details: error.message });
    }
});

// Health check endpoint
app.get('/api/binance/ping', async (req, res) => {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ping');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to ping Binance', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Binance proxy server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET /api/binance/ticker - Get 24hr ticker data');
    console.log('  GET /api/binance/klines - Get OHLC data');
    console.log('  GET /api/binance/price - Get current price');
    console.log('  GET /api/binance/exchangeInfo - Get exchange info');
    console.log('  GET /api/binance/ping - Health check');
}); 