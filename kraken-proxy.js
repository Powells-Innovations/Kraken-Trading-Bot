const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = 8080;

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Proxy endpoint for Kraken ticker
app.get('/api/kraken/ticker', async (req, res) => {
  try {
    const pairs = req.query.pair || 'XXBTZGBP';
    const url = `https://api.kraken.com/0/public/Ticker?pair=${pairs}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from Kraken', details: err.message });
  }
});

// Proxy endpoint for Kraken OHLC
app.get('/api/kraken/ohlc', async (req, res) => {
  try {
    const pair = req.query.pair || 'XXBTZGBP';
    const interval = req.query.interval || 1; // 1 minute candles
    const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OHLC from Kraken', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Kraken proxy server running on http://localhost:${PORT}`);
}); 