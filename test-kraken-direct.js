const crypto = require('crypto');
const fetch = require('node-fetch');

// Test your API credentials directly
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key
const API_SECRET = 'YOUR_API_SECRET_HERE'; // Replace with your actual API secret

const KRAKEN_BASE_URL = 'https://api.kraken.com';

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

async function testKrakenAPI() {
  try {
    console.log('🔍 Testing Kraken API directly...');
    console.log(`API Key length: ${API_KEY.length}`);
    console.log(`API Secret length: ${API_SECRET.length}`);
    
    // Test 1: Public endpoint (should always work)
    console.log('\n📊 Test 1: Public Ticker endpoint...');
    const publicResponse = await fetch(`${KRAKEN_BASE_URL}/0/public/Ticker?pair=XXBTZGBP`);
    const publicData = await publicResponse.json();
    console.log('✅ Public endpoint works:', publicData.error ? 'ERROR' : 'SUCCESS');
    
    // Test 2: Private Balance endpoint
    console.log('\n💰 Test 2: Private Balance endpoint...');
    const endpoint = '/0/private/Balance';
    const nonce = Date.now().toString();
    const postData = { nonce };
    const { signature } = createSignature(endpoint, postData, API_SECRET);
    
    console.log('Generated signature:', signature.substring(0, 20) + '...');
    console.log('Nonce:', nonce);
    
    const privateResponse = await fetch(`${KRAKEN_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': API_KEY,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `nonce=${nonce}`
    });
    
    const privateData = await privateResponse.json();
    console.log('Private endpoint response:', privateData);
    
    if (privateData.error && privateData.error.length > 0) {
      console.log('❌ Private endpoint failed:', privateData.error.join(', '));
    } else {
      console.log('✅ Private endpoint works!');
      console.log('Balance data:', privateData.result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testKrakenAPI(); 