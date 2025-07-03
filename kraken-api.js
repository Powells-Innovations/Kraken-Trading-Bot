/**
 * Kraken API Integration Module
 * Clean, single-method approach for connecting to Kraken's live market data
 * 
 * Copyright (c) 2025 Trading Bot AI
 * All rights reserved.
 * 
 * This software is proprietary and confidential. Unauthorized copying, 
 * distribution, or use of this software, via any medium, is strictly prohibited.
 * 
 * For licensing inquiries, contact: licensing@tradingbotai.com
 */

class KrakenAPI {
    constructor() {
        this.baseUrl = 'http://localhost:8080/api/kraken';
        this.isConnected = false;
        this.lastUpdate = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Trading pairs mapping - using only verified existing pairs
        this.pairs = {
            'BTCGBP': 'XXBTZGBP',
            'XRPGBP': 'XRPGBP',
            'LINKGBP': 'LINKGBP',
            'AAVEGBP': 'AAVEGBP',
            'FILGBP': 'FILGBP'
        };
        
        // Pair display names (must match keys above)
        this.pairNames = {
            'BTCGBP': 'BTC/GBP',
            'XRPGBP': 'XRP/GBP',
            'LINKGBP': 'LINK/GBP',
            'AAVEGBP': 'AAVE/GBP',
            'FILGBP': 'FIL/GBP'
        };
    }

    /**
     * Debug logging function
     */
    debugLog(message, type = 'info') {
        if (window.app && window.app.debugLog) {
            window.app.debugLog(`[API] ${message}`, type);
        } else {
            console.log(`[API] ${message}`);
        }
    }

    /**
     * Initialize connection to Kraken API
     * Always uses real market data from Kraken
     */
    async connect() {
        try {
            this.debugLog('🔗 Connecting to Kraken API for real market data...', 'connection');
            
            // Always try direct connection to get real data
            const connected = await this.testDirectConnection();
            
            if (connected) {
                this.isConnected = true;
                this.lastUpdate = new Date();
                this.debugLog('✅ Successfully connected to Kraken API - Real market data enabled', 'success');
                return true;
            } else {
                this.debugLog('❌ Failed to connect to Kraken API - Cannot fetch real market data', 'error');
                this.isConnected = false;
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Failed to connect to Kraken API: ${error.message}`, 'error');
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Test direct connection to Kraken API
     */
    async testDirectConnection() {
        try {
            this.debugLog('Testing connection to Kraken API via proxy...', 'connection');
            const response = await fetch(`${this.baseUrl}/ticker?pair=XXBTZGBP`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const success = !data.error || data.error.length === 0;
                if (success) {
                    this.debugLog('✅ Direct connection to Kraken API successful', 'success');
                } else {
                    this.debugLog('❌ Direct connection failed - Kraken API error', 'error');
                }
                return success;
            }
            this.debugLog('❌ Direct connection failed - HTTP error', 'error');
            return false;
        } catch (error) {
            this.debugLog(`Direct connection to Kraken API failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Make HTTP request to Kraken API with proper error handling
     * Always fetches real market data
     */
    async makeRequest(endpoint, params = {}) {
        // For the proxy, we only have /ticker endpoint
        if (endpoint === '/Ticker') {
            const pairs = params.pair || 'XXBTZGBP';
            const url = `${this.baseUrl}/ticker?pair=${pairs}`;
            
            try {
                this.debugLog(`Making API request via proxy to: ${url}`, 'api');
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                this.debugLog(`✅ Proxy API response received for ${endpoint}`, 'success');
                return data;
                
            } catch (error) {
                this.debugLog(`❌ Proxy API request failed for ${endpoint}: ${error.message}`, 'error');
                throw error;
            }
        } else {
            throw new Error(`Endpoint ${endpoint} not supported by proxy`);
        }
    }

    /**
     * Test API with a simple request to verify pairs
     */
    async testPairs() {
        try {
            this.debugLog('Testing trading pairs...', 'api');
            
            // Test with just BTC/GBP first (highest volume GBP pair)
            const testData = await this.makeRequest('/Ticker', { pair: 'XXBTZGBP' });
            
            if (testData.error && testData.error.length > 0) {
                this.debugLog(`Pair test failed: ${testData.error.join(', ')}`, 'error');
                return false;
            }
            
            this.debugLog('✅ Trading pairs test successful', 'success');
            return true;
        } catch (error) {
            this.debugLog(`Trading pairs test failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Get live ticker data for all trading pairs
     */
    async getTickerData() {
        if (!this.isConnected) {
            throw new Error('Not connected to Kraken API');
        }

        try {
            // Try to get real data first
            this.debugLog('Fetching ticker data...', 'api');
            
            // Test pairs first
            const pairsValid = await this.testPairs();
            if (!pairsValid) {
                throw new Error('Trading pairs validation failed');
            }
            
            // Use the top 5 Kraken GBP pairs with correct Kraken codes
            const workingPairs = {
                'BTCGBP': 'XXBTZGBP',
                'XRPGBP': 'XRPGBP',
                'LINKGBP': 'LINKGBP',
                'AAVEGBP': 'AAVEGBP',
                'FILGBP': 'FILGBP'
            };
            
            const pairString = Object.values(workingPairs).join(',');
            this.debugLog(`Requesting pairs: ${pairString}`, 'api');
            
            const data = await this.makeRequest('/Ticker', { pair: pairString });
            
            if (data.error && data.error.length > 0) {
                throw new Error(`API Error: ${data.error.join(', ')}`);
            }

            this.debugLog('✅ Ticker data fetched successfully', 'success');
            return this.processTickerData(data.result);
        } catch (error) {
            this.debugLog(`Failed to fetch real ticker data: ${error.message}`, 'error');
            throw error; // Don't fallback to demo data
        }
    }

    /**
     * Process raw ticker data into clean format
     */
    processTickerData(rawData) {
        this.debugLog('Processing ticker data...', 'api');
        const processedData = {};
        
        // Use the top 5 Kraken GBP pairs with correct Kraken codes
        const workingPairs = {
            'BTCGBP': 'XXBTZGBP',
            'XRPGBP': 'XRPGBP',
            'LINKGBP': 'LINKGBP',
            'AAVEGBP': 'AAVEGBP',
            'FILGBP': 'FILGBP'
        };
        
        for (const [displayPair, krakenPair] of Object.entries(workingPairs)) {
            const tickerData = rawData[krakenPair];
            
            if (tickerData) {
                processedData[displayPair] = {
                    price: parseFloat(tickerData.c[0]),           // Current price
                    change24h: parseFloat(tickerData.p[1]),      // 24h change %
                    volume: parseFloat(tickerData.v[1]),         // 24h volume (tickerData.v[1]),         // 24h volume
                    high24h: parseFloat(tickerData.h[1]),        // 24h high
                    low24h: parseFloat(tickerData.l[1]),         // 24h low
                    bid: parseFloat(tickerData.b[0]),            // Best bid
                    ask: parseFloat(tickerData.a[0]),            // Best ask
                    lastUpdate: Date.now(),
                    isRealData: true
                };
                this.debugLog(`✅ Processed ${displayPair}: £${processedData[displayPair].price.toFixed(4)}`, 'success');
            } else {
                this.debugLog(`⚠️ No data for ${displayPair}`, 'warning');
            }
        }
        
        this.debugLog(`✅ Processed ${Object.keys(processedData).length} trading pairs`, 'success');
        return processedData;
    }

    /**
     * Get account balance (for live trading)
     * Note: This requires proper server-side implementation for security
     */
    async getAccountBalance(apiKey, apiSecret) {
        if (!apiKey || !apiSecret) {
            throw new Error('API credentials required for account balance');
        }

        // For security reasons, private API calls should be handled server-side
        // This is a placeholder that would need server implementation
        this.debugLog('⚠️ Account balance requires server-side HMAC signing for security', 'warning');
        
        throw new Error('Account balance requires server-side implementation for security');
    }

    /**
     * Test API credentials
     */
    async testCredentials(apiKey, apiSecret) {
        try {
            if (!apiKey || !apiSecret) {
                throw new Error('Please provide both API key and secret');
            }

            if (apiKey.length < 50 || apiSecret.length < 50) {
                throw new Error('Invalid API credentials format');
            }

            this.debugLog('Testing API credentials...', 'api');
            // Test with account balance endpoint
            const balance = await this.getAccountBalance(apiKey, apiSecret);
            
            this.debugLog('✅ API credentials validated successfully', 'success');
            return {
                success: true,
                balance: balance.balance,
                message: 'API credentials validated successfully'
            };
        } catch (error) {
            this.debugLog(`API credentials test failed: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get system status
     */
    async getSystemStatus() {
        try {
            this.debugLog('Fetching system status...', 'api');
            const data = await this.makeRequest('/SystemStatus');
            this.debugLog('✅ System status fetched successfully', 'success');
            return data.result;
        } catch (error) {
            this.debugLog(`Failed to get system status: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            lastUpdate: this.lastUpdate,
            retryCount: this.retryCount
        };
    }

    /**
     * Disconnect from API
     */
    disconnect() {
        this.isConnected = false;
        this.lastUpdate = null;
        this.debugLog('🔌 Disconnected from Kraken API', 'info');
    }

    /**
     * Fetch OHLC data from Kraken via proxy, with support for deep history
     */
    async getOHLCData(pair = 'XXBTZGBP', interval = 1, since = null, maxYears = 10) {
        this.debugLog(`[OHLC] Fetching data for ${pair}, interval=${interval}, maxYears=${maxYears}`, 'info');
        let allData = [];
        let fetchSince = since;
        let now = Math.floor(Date.now() / 1000);
        let earliest = now - (maxYears * 365 * 24 * 60 * 60); // 10 years ago
        let keepFetching = true;
        let fetchCount = 0;
        
        while (keepFetching) {
            fetchCount++;
            let url = `http://localhost:8080/api/kraken/ohlc?pair=${pair}&interval=${interval}`;
            if (fetchSince) url += `&since=${fetchSince}`;
            this.debugLog(`[OHLC] Fetch ${fetchCount}: ${url}`, 'info');
            try {
                const response = await fetch(url);
                const raw = await response.text();
                this.debugLog(`[OHLC] Raw response for ${pair}: ${raw.substring(0, 300)}`, 'info');
                const data = JSON.parse(raw);
                if (data.error && data.error.length > 0) {
                    this.debugLog(`[OHLC] API error for ${pair}: ${data.error.join(', ')}`, 'error');
                    throw new Error(data.error.join(', '));
                }
                const ohlc = data.result[Object.keys(data.result)[0]];
                if (!ohlc || ohlc.length === 0) {
                    this.debugLog(`[OHLC] No data returned for ${pair}`, 'warning');
                    break;
                }
                this.debugLog(`[OHLC] Received ${ohlc.length} candles for ${pair}`, 'info');
                allData = allData.concat(ohlc.map(candle => ({
                    time: Number(candle[0]),
                    open: Number(candle[1]),
                    high: Number(candle[2]),
                    low: Number(candle[3]),
                    close: Number(candle[4]),
                    volume: Number(candle[6])
                })));
                // Kraken returns the last candle's time as 'last'
                const last = data.result.last;
                if (!last || (fetchSince && last <= fetchSince) || (allData.length > 0 && allData[allData.length-1].time < earliest)) {
                    keepFetching = false;
                } else {
                    fetchSince = last;
                }
                if (allData.length > 50000) {
                    this.debugLog(`[OHLC] Reached max data limit for ${pair}`, 'warning');
                    break;
                }
                await this.delay(1000);
            } catch (error) {
                this.debugLog(`[OHLC] Fetch error for ${pair}: ${error.message}`, 'error');
                break;
            }
        }
        allData = allData.filter(c => c.time >= earliest);
        this.debugLog(`[OHLC] Final result for ${pair}: ${allData.length} candles`, 'success');
        if (allData.length === 0) {
            this.debugLog(`[OHLC] WARNING: No OHLC data found for ${pair}!`, 'warning');
        }
        return allData;
    }
}

// Export for use in other modules
window.KrakenAPI = KrakenAPI; 