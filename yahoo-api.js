/**
 * Yahoo Finance API Integration Module
 * Fetches live stock data from Yahoo Finance for paper trading
 * 
 * Copyright (c) 2025 Trading Bot AI
 * All rights reserved.
 * 
 * This software is proprietary and confidential. Unauthorized copying, 
 * distribution, or use of this software, via any medium, is strictly prohibited.
 * 
 * For licensing inquiries, contact: licensing@tradingbotai.com
 */

class YahooAPI {
    constructor() {
        this.baseUrl = 'https://kraken-trading-bot-production.up.railway.app/api/yahoo';
        this.isConnected = false;
        this.lastUpdate = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Stock symbols and their display names
        this.stocks = {
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'NVDA': 'NVIDIA Corporation',
            'META': 'Meta Platforms Inc.',
            'NFLX': 'Netflix Inc.',
            'AMD': 'Advanced Micro Devices Inc.',
            'INTC': 'Intel Corporation',
            'SPY': 'SPDR S&P 500 ETF',
            'QQQ': 'Invesco QQQ Trust',
            'IWM': 'iShares Russell 2000 ETF',
            'VTI': 'Vanguard Total Stock Market ETF'
        };
        
        // Stock display names (must match keys above)
        this.stockNames = {
            'AAPL': 'Apple',
            'MSFT': 'Microsoft',
            'GOOGL': 'Google',
            'AMZN': 'Amazon',
            'TSLA': 'Tesla',
            'NVDA': 'NVIDIA',
            'META': 'Meta',
            'NFLX': 'Netflix',
            'AMD': 'AMD',
            'INTC': 'Intel',
            'SPY': 'S&P 500 ETF',
            'QQQ': 'NASDAQ ETF',
            'IWM': 'Russell 2000 ETF',
            'VTI': 'Total Market ETF'
        };
    }

    /**
     * Debug logging function
     */
    debugLog(message, type = 'info') {
        if (window.app && window.app.debugLog) {
            window.app.debugLog(`[YAHOO-API] ${message}`, type);
        } else {
            console.log(`[YAHOO-API] ${message}`);
        }
    }

    /**
     * Initialize connection to Yahoo Finance API
     */
    async connect() {
        try {
            this.debugLog('🔗 Connecting to Yahoo Finance API...', 'connection');
            
            // Test connection by fetching a simple stock quote
            const testResult = await this.getStockQuote('AAPL');
            if (testResult && testResult.price) {
                this.isConnected = true;
                this.lastUpdate = new Date();
                this.debugLog('✅ Successfully connected to Yahoo Finance API', 'success');
                return true;
            } else {
                this.debugLog('⚠️ Yahoo Finance API unavailable', 'warning');
                this.isConnected = false;
                return false;
            }
        } catch (error) {
            this.debugLog(`⚠️ Yahoo Finance API unavailable: ${error.message}`, 'warning');
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get live stock quote for a single ticker
     */
    async getStockQuote(ticker) {
        try {
            const url = `${this.baseUrl}/quote/${ticker}`;
            this.debugLog(`Fetching quote for ${ticker} via proxy...`, 'api');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin
                },
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const meta = result.meta;
                const timestamp = result.timestamp;
                const quote = result.indicators.quote[0];
                const adjClose = result.indicators.adjclose[0];
                
                // Get current price from the last available data point
                const lastIndex = timestamp.length - 1;
                const currentPrice = adjClose.adjclose[lastIndex] || quote.close[lastIndex];
                const openPrice = quote.open[lastIndex];
                const highPrice = quote.high[lastIndex];
                const lowPrice = quote.low[lastIndex];
                const volume = quote.volume[lastIndex];
                const prevClose = meta.previousClose;
                
                if (currentPrice && !isNaN(currentPrice)) {
                    const change = currentPrice - prevClose;
                    const changePercent = prevClose ? (change / prevClose) * 100 : 0;
                    
                    return {
                        ticker: ticker,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent,
                        volume: volume || 0,
                        high: highPrice || currentPrice,
                        low: lowPrice || currentPrice,
                        open: openPrice || currentPrice,
                        prevClose: prevClose,
                        timestamp: timestamp[lastIndex] * 1000,
                        lastUpdate: Date.now(),
                        isFallback: false
                    };
                }
            }
            
            throw new Error('Invalid data format received');
        } catch (error) {
            this.debugLog(`Failed to fetch quote for ${ticker}: ${error.message}`, 'error');
            
            return null;
        }
    }

    /**
     * Update fallback data with realistic price movements
     */
    updateFallbackData(ticker) {
        // This method is no longer needed as fallback data is removed.
        // Keeping it here for now, but it will not be called.
        this.debugLog(`updateFallbackData called for ${ticker}, but fallback data is removed.`, 'warning');
        return null;
    }

    /**
     * Get stock data for all configured stocks
     */
    async getStockData() {
        if (!this.isConnected) {
            throw new Error('Not connected to Yahoo Finance API');
        }

        try {
            this.debugLog('Fetching stock data via proxy...', 'api');
            
            const tickers = Object.keys(this.stocks);
            const url = `${this.baseUrl}/quotes`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin
                },
                mode: 'cors',
                credentials: 'omit',
                body: JSON.stringify({ tickers })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const batchData = await response.json();
            const stockData = {};
            
            // Process each ticker's data
            for (const ticker of tickers) {
                const data = batchData[ticker];
                if (data && !data.error && data.chart && data.chart.result && data.chart.result[0]) {
                    const result = data.chart.result[0];
                    const meta = result.meta;
                    const timestamp = result.timestamp;
                    const quote = result.indicators.quote[0];
                    const adjClose = result.indicators.adjclose[0];
                    
                    // Get current price from the last available data point
                    const lastIndex = timestamp.length - 1;
                    const currentPrice = adjClose.adjclose[lastIndex] || quote.close[lastIndex];
                    const openPrice = quote.open[lastIndex];
                    const highPrice = quote.high[lastIndex];
                    const lowPrice = quote.low[lastIndex];
                    const volume = quote.volume[lastIndex];
                    const prevClose = meta.previousClose;
                    
                    if (currentPrice && !isNaN(currentPrice)) {
                        const change = currentPrice - prevClose;
                        const changePercent = prevClose ? (change / prevClose) * 100 : 0;
                        
                        stockData[ticker] = {
                            ticker: ticker,
                            price: currentPrice,
                            change: change,
                            changePercent: changePercent,
                            volume: volume || 0,
                            high: highPrice || currentPrice,
                            low: lowPrice || currentPrice,
                            open: openPrice || currentPrice,
                            prevClose: prevClose,
                            timestamp: timestamp[lastIndex] * 1000,
                            lastUpdate: Date.now(),
                            isFallback: false
                        };
                    }
                } else {
                    this.debugLog(`No valid data for ${ticker}: ${data?.error || 'Invalid response'}`, 'warning');
                }
            }
            
            this.debugLog(`✅ Fetched data for ${Object.keys(stockData).length} stocks via proxy`, 'success');
            return stockData;
        } catch (error) {
            this.debugLog(`Failed to fetch stock data via proxy: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get historical data for a stock
     */
    async getHistoricalData(ticker, period = '1d', interval = '1m') {
        if (!this.isConnected) {
            throw new Error('Not connected to Yahoo Finance API');
        }

        try {
            this.debugLog(`Fetching historical data for ${ticker} via proxy...`, 'api');
            
            const url = `${this.baseUrl}/history/${ticker}?period=${period}&interval=${interval}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin
                },
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const quotes = result.indicators.quote[0];
                
                const historicalData = timestamps.map((time, index) => ({
                    time: time * 1000, // Convert to milliseconds
                    open: quotes.open[index] || 0,
                    high: quotes.high[index] || 0,
                    low: quotes.low[index] || 0,
                    close: quotes.close[index] || 0,
                    volume: quotes.volume[index] || 0
                }));
                
                this.debugLog(`✅ Fetched ${historicalData.length} historical data points for ${ticker} via proxy`, 'success');
                return historicalData;
            } else {
                throw new Error('Invalid response format from Yahoo Finance API');
            }
        } catch (error) {
            this.debugLog(`Failed to fetch historical data for ${ticker} via proxy: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Generate fallback historical data for demo purposes
     */
    generateFallbackHistoricalData(ticker) {
        // This method is no longer needed as fallback data is removed.
        // Keeping it here for now, but it will not be called.
        this.debugLog(`generateFallbackHistoricalData called for ${ticker}, but fallback data is removed.`, 'warning');
        return [];
    }

    /**
     * Check if market is open (US market hours)
     */
    isMarketOpen() {
        const now = new Date();
        const utc = now.getUTCHours();
        const day = now.getUTCDay();
        
        // US market hours: Monday-Friday, 9:30 AM - 4:00 PM EST (14:30-21:00 UTC)
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = utc >= 14 && utc < 21;
        
        return isWeekday && isMarketHours;
    }

    /**
     * Get market status
     */
    getMarketStatus() {
        const isOpen = this.isMarketOpen();
        return {
            isOpen: isOpen,
            status: isOpen ? 'Open' : 'Closed',
            message: isOpen ? 'US Market is currently open' : 'US Market is currently closed'
        };
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get available stocks
     */
    getAvailableStocks() {
        return Object.keys(this.stocks);
    }

    /**
     * Get stock names
     */
    getStockNames() {
        return this.stockNames;
    }

    /**
     * Disconnect from API
     */
    disconnect() {
        this.isConnected = false;
        this.lastUpdate = null;
        this.debugLog('🔌 Disconnected from Yahoo Finance API', 'info');
    }
}

// Export for use in other modules
window.YahooAPI = YahooAPI; 
