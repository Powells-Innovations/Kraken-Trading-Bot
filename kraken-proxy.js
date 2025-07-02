const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 8081;

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

app.listen(PORT, () => {
  console.log(`Kraken proxy server running on http://localhost:${PORT}`);
}); 