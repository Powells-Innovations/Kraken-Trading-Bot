const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = 8080;

// CORS middleware to allow cross-origin requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Kraken API base URL
const KRAKEN_BASE_URL = 'https://api.kraken.com';

// Helper function to create HMAC signature for private API calls
function createSignature(endpoint, postData, apiSecret) {
  const nonce = Date.now().toString();
  
  // Create post data string
  const postDataString = postData ? Object.keys(postData).map(key => `${key}=${postData[key]}`).join('&') : '';
  
  // Create the message to sign
  const message = nonce + postDataString;
  
  // Create SHA256 hash of the message
  const sha256Hash = crypto.createHash('sha256').update(message).digest('binary');
  
  // Create the signature path
  const signaturePath = endpoint + sha256Hash;
  
  // Create HMAC-SHA512 signature
  const signature = crypto.createHmac('sha512', apiSecret)
    .update(signaturePath, 'binary')
    .digest('base64');
    
  return { signature, nonce };
}

// Proxy endpoint for Kraken ticker
app.get('/api/kraken/ticker', async (req, res) => {
  try {
    const pairs = req.query.pair || 'XXBTZGBP';
    const url = `${KRAKEN_BASE_URL}/0/public/Ticker?pair=${pairs}`;
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
    const since = req.query.since || '';
    let url = `${KRAKEN_BASE_URL}/0/public/OHLC?pair=${pair}&interval=${interval}`;
    if (since) url += `&since=${since}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OHLC from Kraken', details: err.message });
  }
});

// NEW: Get account balance (requires API credentials)
app.post('/api/kraken/balance', async (req, res) => {
  try {
    const { apiKey, apiSecret } = req.body;
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API key and secret required' });
    }

    const endpoint = '/0/private/Balance';
    const nonce = Date.now().toString();
    const postData = { nonce };
    const { signature } = createSignature(endpoint, postData, apiSecret);
    
    const response = await fetch(`${KRAKEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `nonce=${nonce}`
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch balance', details: err.message });
  }
});

// NEW: Place buy order
app.post('/api/kraken/buy', async (req, res) => {
  try {
    const { apiKey, apiSecret, pair, volume, price } = req.body;
    
    if (!apiKey || !apiSecret || !pair || !volume) {
      return res.status(400).json({ error: 'API credentials, pair, and volume required' });
    }

    const endpoint = '/0/private/AddOrder';
    const postData = {
      nonce: Date.now().toString(),
      ordertype: price ? 'limit' : 'market',
      type: 'buy',
      pair: pair,
      volume: volume.toString()
    };
    
    if (price) postData.price = price.toString();
    
    const { signature, nonce } = createSignature(endpoint, postData, apiSecret);
    postData.nonce = nonce;
    
    const response = await fetch(`${KRAKEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: Object.keys(postData).map(key => `${key}=${encodeURIComponent(postData[key])}`).join('&')
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place buy order', details: err.message });
  }
});

// NEW: Place sell order
app.post('/api/kraken/sell', async (req, res) => {
  try {
    const { apiKey, apiSecret, pair, volume, price } = req.body;
    
    if (!apiKey || !apiSecret || !pair || !volume) {
      return res.status(400).json({ error: 'API credentials, pair, and volume required' });
    }

    const endpoint = '/0/private/AddOrder';
    const postData = {
      nonce: Date.now().toString(),
      ordertype: price ? 'limit' : 'market',
      type: 'sell',
      pair: pair,
      volume: volume.toString()
    };
    
    if (price) postData.price = price.toString();
    
    const { signature, nonce } = createSignature(endpoint, postData, apiSecret);
    postData.nonce = nonce;
    
    const response = await fetch(`${KRAKEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: Object.keys(postData).map(key => `${key}=${encodeURIComponent(postData[key])}`).join('&')
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place sell order', details: err.message });
  }
});

// NEW: Get open orders
app.post('/api/kraken/open-orders', async (req, res) => {
  try {
    const { apiKey, apiSecret } = req.body;
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API key and secret required' });
    }

    const endpoint = '/0/private/OpenOrders';
    const { signature, nonce } = createSignature(endpoint, {}, apiSecret);
    
    const response = await fetch(`${KRAKEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `nonce=${nonce}`
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch open orders', details: err.message });
  }
});

// NEW: Cancel order
app.post('/api/kraken/cancel-order', async (req, res) => {
  try {
    const { apiKey, apiSecret, txid } = req.body;
    
    if (!apiKey || !apiSecret || !txid) {
      return res.status(400).json({ error: 'API credentials and transaction ID required' });
    }

    const endpoint = '/0/private/CancelOrder';
    const postData = {
      nonce: Date.now().toString(),
      txid: txid
    };
    
    const { signature, nonce } = createSignature(endpoint, postData, apiSecret);
    postData.nonce = nonce;
    
    const response = await fetch(`${KRAKEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: Object.keys(postData).map(key => `${key}=${encodeURIComponent(postData[key])}`).join('&')
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order', details: err.message });
  }
});

// NEW: Get closed orders (trade history)
app.post('/api/kraken/closed-orders', async (req, res) => {
  try {
    const { apiKey, apiSecret, start, end } = req.body;
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API key and secret required' });
    }

    const endpoint = '/0/private/ClosedOrders';
    const postData = {
      nonce: Date.now().toString()
    };
    
    if (start) postData.start = start;
    if (end) postData.end = end;
    
    const { signature, nonce } = createSignature(endpoint, postData, apiSecret);
    postData.nonce = nonce;
    
    const response = await fetch(`${KRAKEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: Object.keys(postData).map(key => `${key}=${encodeURIComponent(postData[key])}`).join('&')
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch closed orders', details: err.message });
  }
});

// NEW: Test API credentials
app.post('/api/kraken/test-credentials', async (req, res) => {
  try {
    const { apiKey, apiSecret } = req.body;
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API key and secret required' });
    }

    // Test with balance endpoint
    const endpoint = '/0/private/Balance';
    const nonce = Date.now().toString();
    const postData = { nonce };
    const { signature } = createSignature(endpoint, postData, apiSecret);
    
    const response = await fetch(`${KRAKEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `nonce=${nonce}`
    });

    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      res.json({ success: false, error: data.error.join(', ') });
    } else {
      res.json({ success: true, message: 'API credentials validated successfully' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Kraken proxy server running on http://localhost:${PORT}`);
  console.log('✅ Live trading endpoints added:');
  console.log('   - POST /api/kraken/balance - Get account balance');
  console.log('   - POST /api/kraken/buy - Place buy order');
  console.log('   - POST /api/kraken/sell - Place sell order');
  console.log('   - POST /api/kraken/open-orders - Get open orders');
  console.log('   - POST /api/kraken/cancel-order - Cancel order');
  console.log('   - POST /api/kraken/closed-orders - Get trade history');
  console.log('   - POST /api/kraken/test-credentials - Test API credentials');
}); 
