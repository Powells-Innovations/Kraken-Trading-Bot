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
        this.baseUrl = 'https://api.kraken.com/0/public';
        this.isConnected = false;
        this.lastUpdate = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Trading pairs mapping - using only verified existing pairs
        this.pairs = {
            'BTCGBP': 'XXBTZGBP',
            'XRPGBP': 'XRPGBP',
            'XLMGBP': 'XLMGBP',
            'LINKGBP': 'LINKGBP',
            'AAVEGBP': 'AAVEGBP',
            'FILGBP': 'FILGBP'
        };
        
        // Pair display names (must match keys above)
        this.pairNames = {
            'BTCGBP': 'BTC/GBP',
            'XRPGBP': 'XRP/GBP',
            'XLMGBP': 'XLM/GBP',
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
            this.debugLog('Testing direct connection to Kraken API...', 'connection');
            const response = await fetch(`${this.baseUrl}/Time`, {
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
        const url = new URL(this.baseUrl + endpoint);
        
        // Add query parameters
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        try {
            this.debugLog(`Making real API request to: ${endpoint}`, 'api');
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
            this.debugLog(`✅ Real API response received for ${endpoint}`, 'success');
            return data;
            
        } catch (error) {
            this.debugLog(`❌ Real API request failed for ${endpoint}: ${error.message}`, 'error');
            throw error;
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
            
            // Use the top 6 Kraken GBP pairs with correct Kraken codes
            const workingPairs = {
                'BTCGBP': 'XXBTZGBP',    // Bitcoin/GBP - ~£1.09M volume
                'XRPGBP': 'XRPGBP',    // XRP/GBP - ~£2.88M volume
                'XLMGBP': 'XLMGBP',    // Stellar/GBP - ~£6,300-7,000 volume
                'LINKGBP': 'LINKGBP',    // Chainlink/GBP - ~£8,369 volume
                'AAVEGBP': 'AAVEGBP',    // Aave/GBP - ~£43,625 volume
                'FILGBP': 'FILGBP'       // Filecoin/GBP - ~£40,133 volume
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
        
        // Use the top 6 Kraken GBP pairs with correct Kraken codes
        const workingPairs = {
            'BTCGBP': 'XXBTZGBP',    // Bitcoin/GBP - ~£1.09M volume
            'XRPGBP': 'XRPGBP',    // XRP/GBP - ~£2.88M volume
            'XLMGBP': 'XLMGBP',    // Stellar/GBP - ~£6,300-7,000 volume
            'LINKGBP': 'LINKGBP',    // Chainlink/GBP - ~£8,369 volume
            'AAVEGBP': 'AAVEGBP',    // Aave/GBP - ~£43,625 volume
            'FILGBP': 'FILGBP'       // Filecoin/GBP - ~£40,133 volume
        };
        
        for (const [displayPair, krakenPair] of Object.entries(workingPairs)) {
            const tickerData = rawData[krakenPair];
            
            if (tickerData) {
                processedData[displayPair] = {
                    price: parseFloat(tickerData.c[0]),           // Current price
                    change24h: parseFloat(tickerData.p[1]),      // 24h change %
                    volume: parseFloat(tickerData.v[1]),         // 24h volume
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
}

// Export for use in other modules
window.KrakenAPI = KrakenAPI; 