// Add this CORS middleware to your remote proxy server
// This should be added BEFORE your route definitions

const express = require('express');
const app = express();

// CORS middleware - add this to your remote server
app.use((req, res, next) => {
    // Allow requests from any origin (or specify your domain)
    res.header('Access-Control-Allow-Origin', '*');
    
    // Allow specific methods
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Allow specific headers
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, API-Key, API-Sign');
    
    // Allow credentials (if needed)
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Your existing routes go here...
// app.get('/api/kraken/ticker', ...)
// app.post('/api/kraken/test-credentials', ...)
// etc.

console.log('CORS middleware added to remote proxy server');
console.log('Deploy this to your Railway server to fix CORS issues'); 