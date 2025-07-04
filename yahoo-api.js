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
        this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance';
        this.isConnected = false;
        this.lastUpdate = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Popular stock tickers for trading
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
            'JPM': 'JPMorgan Chase & Co.',
            'JNJ': 'Johnson & Johnson',
            'V': 'Visa Inc.',
            'WMT': 'Walmart Inc.',
            'PG': 'Procter & Gamble Co.',
            'UNH': 'UnitedHealth Group Inc.',
            'HD': 'The Home Depot Inc.',
            'MA': 'Mastercard Inc.',
            'DIS': 'The Walt Disney Company',
            'PYPL': 'PayPal Holdings Inc.',
            'SPY': 'SPDR S&P 500 ETF',
            'QQQ': 'Invesco QQQ Trust',
            'IWM': 'iShares Russell 2000 ETF',
            'VTI': 'Vanguard Total Stock Market ETF'
        };
        
        // Stock display names
        this.stockNames = {
            'AAPL': 'Apple (AAPL)',
            'MSFT': 'Microsoft (MSFT)',
            'GOOGL': 'Alphabet (GOOGL)',
            'AMZN': 'Amazon (AMZN)',
            'TSLA': 'Tesla (TSLA)',
            'NVDA': 'NVIDIA (NVDA)',
            'META': 'Meta (META)',
            'NFLX': 'Netflix (NFLX)',
            'AMD': 'AMD (AMD)',
            'INTC': 'Intel (INTC)',
            'JPM': 'JPMorgan (JPM)',
            'JNJ': 'Johnson & Johnson (JNJ)',
            'V': 'Visa (V)',
            'WMT': 'Walmart (WMT)',
            'PG': 'Procter & Gamble (PG)',
            'UNH': 'UnitedHealth (UNH)',
            'HD': 'Home Depot (HD)',
            'MA': 'Mastercard (MA)',
            'DIS': 'Disney (DIS)',
            'PYPL': 'PayPal (PYPL)',
            'SPY': 'SPDR S&P 500 (SPY)',
            'QQQ': 'Invesco QQQ (QQQ)',
            'IWM': 'iShares Russell 2000 (IWM)',
            'VTI': 'Vanguard Total Market (VTI)'
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
                this.debugLog('❌ Failed to connect to Yahoo Finance API', 'error');
                this.isConnected = false;
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Failed to connect to Yahoo Finance API: ${error.message}`, 'error');
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get live stock quote for a single ticker
     */
    async getStockQuote(ticker) {
        try {
            const url = `${this.baseUrl}/chart/${ticker}?interval=1m&range=1d&includePrePost=false&events=div%2Csplit`;
            this.debugLog(`Fetching quote for ${ticker}...`, 'api');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
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
                        lastUpdate: Date.now()
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
     * Get live data for multiple stocks
     */
    async getStockData(tickers = null) {
        try {
            const stockList = tickers || Object.keys(this.stocks);
            const stockData = {};
            this.debugLog(`Fetching data for ${stockList.length} stocks...`, 'api');
            
            // Fetch data in batches to avoid overwhelming the API
            const batchSize = 5;
            for (let i = 0; i < stockList.length; i += batchSize) {
                const batch = stockList.slice(i, i + batchSize);
                const batchPromises = batch.map(ticker => this.getStockQuote(ticker));
                const batchResults = await Promise.all(batchPromises);
                
                batchResults.forEach((quote, index) => {
                    if (quote) {
                        stockData[batch[index]] = quote;
                    }
                });
                
                // Add delay between batches to be respectful to the API
                if (i + batchSize < stockList.length) {
                    await this.delay(1000);
                }
            }
            
            this.lastUpdate = new Date();
            this.debugLog(`✅ Fetched data for ${Object.keys(stockData).length} stocks`, 'success');
            return stockData;
        } catch (error) {
            this.debugLog(`Failed to fetch stock data: ${error.message}`, 'error');
            return {};
        }
    }

    /**
     * Get historical data for a stock
     */
    async getHistoricalData(ticker, interval = '1m', range = '1d') {
        try {
            const url = `${this.baseUrl}/chart/${ticker}?interval=${interval}&range=${range}&includePrePost=false&events=div%2Csplit`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const timestamp = result.timestamp;
                const adjClose = result.indicators.adjclose[0];
                const quote = result.indicators.quote[0];
                
                const historicalData = [];
                for (let i = 0; i < timestamp.length; i++) {
                    if (adjClose.adjclose[i] !== null && adjClose.adjclose[i] !== undefined) {
                        historicalData.push({
                            time: timestamp[i] * 1000,
                            open: quote.open[i] || adjClose.adjclose[i],
                            high: quote.high[i] || adjClose.adjclose[i],
                            low: quote.low[i] || adjClose.adjclose[i],
                            close: adjClose.adjclose[i],
                            volume: quote.volume[i] || 0
                        });
                    }
                }
                
                return historicalData;
            } else {
                throw new Error('Invalid historical data format');
            }
        } catch (error) {
            this.debugLog(`Failed to fetch historical data for ${ticker}: ${error.message}`, 'error');
            return [];
        }
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