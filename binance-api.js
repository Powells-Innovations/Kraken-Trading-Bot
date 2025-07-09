/**
 * Binance API Integration Module
 * Handles market data, candlestick data, and ticker information from Binance
 * 
 * Copyright (c) 2025 Trading Bot AI
 * All rights reserved.
 * 
 * This software is proprietary and confidential. Unauthorized copying, 
 * distribution, or use of this software, via any medium, is strictly prohibited.
 * 
 * For licensing inquiries, contact: licensing@tradingbotai.com
 * 
 * SECURITY NOTE: This module only fetches public market data from Binance.
 * No API keys are required for market data access.
 */

class BinanceAPI {
    constructor() {
        // Use Railway URL if available, otherwise localhost
        this.baseUrl = window.RAILWAY_CONFIG?.BINANCE_API_BASE || 'http://localhost:3003/api/binance';
        this.isConnected = false;
        this.lastUpdate = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Trading pairs mapping - Binance symbols (using USDT pairs as Binance doesn't have GBP pairs)
        this.pairs = {
            'BTCGBP': 'BTCUSDT',
            'XRPGBP': 'XRPUSDT',
            'XLMGBP': 'XLMUSDT',
            'LINKGBP': 'LINKUSDT',
            'AAVEGBP': 'AAVEUSDT',
            'FILGBP': 'FILUSDT'
        };
        
        // Pair display names (showing GBP equivalent prices)
        this.pairNames = {
            'BTCGBP': 'BTC/GBP',
            'XRPGBP': 'XRP/GBP',
            'XLMGBP': 'XLM/GBP',
            'LINKGBP': 'LINK/GBP',
            'AAVEGBP': 'AAVE/GBP',
            'FILGBP': 'FIL/GBP'
        };

        // Binance interval mapping
        this.intervalMap = {
            1: '1m',    // 1 minute
            5: '5m',    // 5 minutes
            15: '15m',  // 15 minutes
            30: '30m',  // 30 minutes
            60: '1h',   // 1 hour
            240: '4h',  // 4 hours
            1440: '1d'  // 1 day
        };
    }

    /**
     * Debug logging function
     */
    debugLog(message, type = 'info') {
        if (window.app && window.app.debugLog) {
            window.app.debugLog(`[BINANCE] ${message}`, type);
        } else {
            console.log(`[BINANCE] ${message}`);
        }
    }

    /**
     * Initialize connection to Binance API
     */
    async connect() {
        try {
            this.debugLog('🔗 Connecting to Binance API for market data...', 'connection');
            
            // Test connection with a simple request
            const connected = await this.testConnection();
            
            if (connected) {
                this.isConnected = true;
                this.lastUpdate = new Date();
                this.debugLog('✅ Successfully connected to Binance API', 'success');
                return true;
            } else {
                this.debugLog('❌ Failed to connect to Binance API', 'error');
                this.isConnected = false;
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Failed to connect to Binance API: ${error.message}`, 'error');
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Test connection to Binance API
     */
    async testConnection() {
        try {
            this.debugLog('Testing connection to Binance API via proxy...', 'connection');
            const response = await fetch(`${this.baseUrl}/ping`);
            
            if (response.ok) {
                this.debugLog('✅ Binance API connection test successful', 'success');
                return true;
            } else {
                this.debugLog('❌ Binance API connection test failed', 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`Binance API connection test failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Make HTTP request to Binance API
     */
    async makeRequest(endpoint, params = {}) {
        try {
            const url = new URL(`${this.baseUrl}${endpoint}`);
            
            // Add query parameters
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.append(key, params[key]);
                }
            });
            
            this.debugLog(`Making Binance API request to: ${url.toString()}`, 'api');
            
            const response = await fetch(url.toString(), {
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
            this.debugLog(`✅ Binance API response received for ${endpoint}`, 'success');
            return data;
            
        } catch (error) {
            this.debugLog(`❌ Binance API request failed for ${endpoint}: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get live ticker data for all trading pairs
     */
    async getTickerData() {
        if (!this.isConnected) {
            throw new Error('Not connected to Binance API');
        }

        try {
            this.debugLog('Fetching ticker data from Binance via proxy...', 'api');
            
            // Get 24hr ticker for all symbols
            const data = await this.makeRequest('/ticker');
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format from Binance API');
            }

            this.debugLog('✅ Ticker data fetched successfully from Binance', 'success');
            return this.processTickerData(data);
        } catch (error) {
            this.debugLog(`Failed to fetch ticker data from Binance: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Process raw ticker data into clean format
     */
    processTickerData(rawData) {
        this.debugLog('Processing Binance ticker data...', 'api');
        const processedData = {};
        
        // Create reverse mapping from Binance symbols to our display pairs
        const symbolToDisplayPair = {};
        Object.keys(this.pairs).forEach(displayPair => {
            const binanceSymbol = this.pairs[displayPair];
            symbolToDisplayPair[binanceSymbol] = displayPair;
        });
        
        // Get GBP/USD exchange rate (approximate - you might want to fetch this from an API)
        const gbpUsdRate = 0.79; // Approximate GBP/USD rate
        
        rawData.forEach(ticker => {
            const symbol = ticker.symbol;
            
            // Check if this symbol matches our Binance pairs
            if (symbolToDisplayPair[symbol]) {
                const displayPair = symbolToDisplayPair[symbol];
                const usdtPrice = parseFloat(ticker.lastPrice);
                const gbpPrice = usdtPrice * gbpUsdRate; // Convert USDT to GBP
                
                processedData[displayPair] = {
                    price: gbpPrice,
                    change24h: parseFloat(ticker.priceChangePercent),
                    volume: parseFloat(ticker.volume),
                    high24h: parseFloat(ticker.highPrice) * gbpUsdRate,
                    low24h: parseFloat(ticker.lowPrice) * gbpUsdRate,
                    bid: parseFloat(ticker.bidPrice) * gbpUsdRate,
                    ask: parseFloat(ticker.askPrice) * gbpUsdRate,
                    lastUpdate: Date.now(),
                    isRealData: true,
                    // Additional Binance-specific data
                    quoteVolume: parseFloat(ticker.quoteVolume),
                    count: parseInt(ticker.count),
                    weightedAvgPrice: parseFloat(ticker.weightedAvgPrice) * gbpUsdRate,
                    // Store original USDT price for reference
                    usdtPrice: usdtPrice
                };
                this.debugLog(`✅ Processed ${displayPair}: £${gbpPrice.toFixed(4)} (USDT: $${usdtPrice.toFixed(4)})`, 'success');
            }
        });
        
        this.debugLog(`✅ Processed ${Object.keys(processedData).length} trading pairs from Binance`, 'success');
        return processedData;
    }

    /**
     * Get OHLC (candlestick) data from Binance
     */
    async getOHLCData(symbol, interval = 1, since = null, maxYears = 10) {
        this.debugLog(`[OHLC] Fetching Binance data for ${symbol}, interval=${interval}, since=${since}, maxYears=${maxYears}`, 'info');
        
        // Convert display pair to Binance symbol
        const binanceSymbol = this.pairs[symbol] || symbol;
        this.debugLog(`[OHLC] Using Binance symbol: ${binanceSymbol} for display pair: ${symbol}`, 'info');
        
        let allData = [];
        let fetchSince = since;
        let now = Date.now();
        let earliest = now - (maxYears * 365 * 24 * 60 * 60 * 1000); // Convert to milliseconds
        let keepFetching = true;
        let fetchCount = 0;
        let targetCandles = 1440; // Target number of candles we want
        
        // Convert interval to Binance format
        const binanceInterval = this.intervalMap[interval] || '1m';
        
        // If no start time provided, calculate it to get targetCandles
        if (!fetchSince) {
            const intervalMs = interval * 60 * 1000; // Convert minutes to milliseconds
            fetchSince = now - (targetCandles * intervalMs);
            this.debugLog(`[OHLC] Calculated start time: ${new Date(fetchSince).toISOString()} to get ${targetCandles} candles`, 'info');
        }
        
        while (keepFetching) {
            fetchCount++;
            let params = {
                symbol: binanceSymbol,
                interval: binanceInterval,
                limit: 1000 // Binance max limit
            };
            
            if (fetchSince) {
                params.startTime = fetchSince;
            }
            
            this.debugLog(`[OHLC] Fetch ${fetchCount}: ${binanceSymbol} ${binanceInterval} from ${new Date(fetchSince).toISOString()}`, 'info');
            
            try {
                const data = await this.makeRequest('/klines', params);
                
                if (!Array.isArray(data) || data.length === 0) {
                    this.debugLog(`[OHLC] No data returned for ${binanceSymbol}`, 'warning');
                    break;
                }
                
                this.debugLog(`[OHLC] Received ${data.length} candles for ${binanceSymbol}`, 'info');
                
                // Convert Binance klines format to our format
                const candles = data.map(candle => ({
                    time: candle[0], // Open time (milliseconds)
                    open: parseFloat(candle[1]),
                    high: parseFloat(candle[2]),
                    low: parseFloat(candle[3]),
                    close: parseFloat(candle[4]),
                    volume: parseFloat(candle[5]),
                    closeTime: candle[6],
                    quoteAssetVolume: parseFloat(candle[7]),
                    numberOfTrades: parseInt(candle[8]),
                    takerBuyBaseAssetVolume: parseFloat(candle[9]),
                    takerBuyQuoteAssetVolume: parseFloat(candle[10])
                }));
                
                allData = allData.concat(candles);
                
                // Check if we have enough data
                if (allData.length >= targetCandles) {
                    this.debugLog(`[OHLC] ✅ Reached target of ${targetCandles} candles for ${binanceSymbol}`, 'success');
                    keepFetching = false;
                } else if (candles.length < 1000) {
                    // Less than 1000 candles returned, no more data available
                    this.debugLog(`[OHLC] No more data available for ${binanceSymbol}`, 'info');
                    keepFetching = false;
                } else {
                    // Use the last candle's close time as the start time for next request
                    fetchSince = candles[candles.length - 1].closeTime + 1;
                    
                    // Check if we've reached the earliest time we want
                    if (fetchSince < earliest) {
                        this.debugLog(`[OHLC] Reached earliest time limit for ${binanceSymbol}`, 'info');
                        keepFetching = false;
                    }
                }
                
                // Limit total data to prevent memory issues
                if (allData.length > 50000) {
                    this.debugLog(`[OHLC] Reached max data limit for ${binanceSymbol}`, 'warning');
                    break;
                }
                
                // Rate limiting - Binance allows 1200 requests per minute
                await this.delay(50); // 50ms delay between requests
                
            } catch (error) {
                this.debugLog(`[OHLC] Fetch error for ${binanceSymbol}: ${error.message}`, 'error');
                break;
            }
        }
        
        // Filter data to requested time range and sort by time
        allData = allData
            .filter(c => c.time >= earliest)
            .sort((a, b) => a.time - b.time);
        
        this.debugLog(`[OHLC] Final result for ${symbol} (${binanceSymbol}): ${allData.length} candles`, 'success');
        
        if (allData.length === 0) {
            this.debugLog(`[OHLC] WARNING: No OHLC data found for ${symbol} (${binanceSymbol})!`, 'warning');
        } else if (allData.length < targetCandles) {
            this.debugLog(`[OHLC] ⚠️ Only ${allData.length} candles available for ${symbol} (wanted ${targetCandles})`, 'warning');
        }
        
        return allData;
    }

    /**
     * Get current price for a symbol
     */
    async getCurrentPrice(symbol) {
        try {
            // Convert display pair to Binance symbol
            const binanceSymbol = this.pairs[symbol] || symbol;
            const data = await this.makeRequest('/price', { symbol: binanceSymbol });
            return parseFloat(data.price);
        } catch (error) {
            this.debugLog(`Failed to get current price for ${symbol} (${binanceSymbol}): ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get order book for a symbol
     */
    async getOrderBook(symbol, limit = 100) {
        try {
            // Convert display pair to Binance symbol
            const binanceSymbol = this.pairs[symbol] || symbol;
            const data = await this.makeRequest('/depth', { 
                symbol: binanceSymbol, 
                limit: limit 
            });
            return data;
        } catch (error) {
            this.debugLog(`Failed to get order book for ${symbol} (${binanceSymbol}): ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get recent trades for a symbol
     */
    async getRecentTrades(symbol, limit = 100) {
        try {
            // Convert display pair to Binance symbol
            const binanceSymbol = this.pairs[symbol] || symbol;
            const data = await this.makeRequest('/trades', { 
                symbol: binanceSymbol, 
                limit: limit 
            });
            return data;
        } catch (error) {
            this.debugLog(`Failed to get recent trades for ${symbol} (${binanceSymbol}): ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get exchange information
     */
    async getExchangeInfo() {
        try {
            const data = await this.makeRequest('/exchangeInfo');
            return data;
        } catch (error) {
            this.debugLog(`Failed to get exchange info: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get server time
     */
    async getServerTime() {
        try {
            const data = await this.makeRequest('/time');
            return data.serverTime;
        } catch (error) {
            this.debugLog(`Failed to get server time: ${error.message}`, 'error');
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
        this.debugLog('🔌 Disconnected from Binance API', 'info');
    }

    /**
     * Check if a symbol exists on Binance
     */
    async checkSymbolExists(symbol) {
        try {
            const exchangeInfo = await this.getExchangeInfo();
            return exchangeInfo.symbols.some(s => s.symbol === symbol && s.status === 'TRADING');
        } catch (error) {
            this.debugLog(`Failed to check symbol existence: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Get all available symbols
     */
    async getAllSymbols() {
        try {
            const exchangeInfo = await this.getExchangeInfo();
            return exchangeInfo.symbols
                .filter(s => s.status === 'TRADING')
                .map(s => s.symbol);
        } catch (error) {
            this.debugLog(`Failed to get all symbols: ${error.message}`, 'error');
            return [];
        }
    }
}

// Export for use in other modules
window.BinanceAPI = BinanceAPI; 
