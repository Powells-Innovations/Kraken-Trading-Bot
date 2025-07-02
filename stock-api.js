/**
 * Stock API Integration Module
 * Fetches live stock data from Finnhub for paper trading
 * 
 * Copyright (c) 2025 Trading Bot AI
 * All rights reserved.
 * 
 * This software is proprietary and confidential. Unauthorized copying, 
 * distribution, or use of this software, via any medium, is strictly prohibited.
 * 
 * For licensing inquiries, contact: licensing@tradingbotai.com
 */

class StockAPI {
    constructor() {
        this.apiKey = 'd1imgkhr01qhbuvqufs0d1imgkhr01qhbuvqufsg';
        this.baseUrl = 'https://finnhub.io/api/v1';
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
            'PYPL': 'PayPal Holdings Inc.'
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
            'PYPL': 'PayPal (PYPL)'
        };
    }

    /**
     * Debug logging function
     */
    debugLog(message, type = 'info') {
        if (window.app && window.app.debugLog) {
            window.app.debugLog(`[STOCK-API] ${message}`, type);
        } else {
            console.log(`[STOCK-API] ${message}`);
        }
    }

    /**
     * Initialize connection to stock API
     */
    async connect() {
        try {
            this.debugLog('🔗 Connecting to Finnhub API...', 'connection');
            // Test connection by fetching a simple stock quote
            const testResult = await this.getStockQuote('AAPL');
            if (testResult && testResult.price) {
                this.isConnected = true;
                this.lastUpdate = new Date();
                this.debugLog('✅ Successfully connected to Finnhub API', 'success');
                return true;
            } else {
                this.debugLog('❌ Failed to connect to Finnhub API', 'error');
                this.isConnected = false;
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Failed to connect to Finnhub API: ${error.message}`, 'error');
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get live stock quote for a single ticker
     */
    async getStockQuote(ticker) {
        try {
            const url = `${this.baseUrl}/quote?symbol=${ticker}&token=${this.apiKey}`;
            this.debugLog(`Fetching quote for ${ticker}...`, 'api');
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            // Finnhub returns: c (current), h (high), l (low), o (open), pc (prev close), t (timestamp), v (volume)
            if (typeof data.c === 'number') {
                const price = data.c;
                const high = data.h;
                const low = data.l;
                const open = data.o;
                const prevClose = data.pc;
                const volume = data.v;
                const timestamp = data.t * 1000;
                const change = price - prevClose;
                const changePercent = prevClose ? (change / prevClose) * 100 : 0;
                return {
                    ticker: ticker,
                    price: price,
                    change: change,
                    changePercent: changePercent,
                    volume: volume,
                    high: high,
                    low: low,
                    open: open,
                    prevClose: prevClose,
                    timestamp: timestamp,
                    lastUpdate: Date.now()
                };
            } else {
                throw new Error('Invalid data format received');
            }
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
            for (const ticker of stockList) {
                const quote = await this.getStockQuote(ticker);
                if (quote) {
                    stockData[ticker] = quote;
                }
                await this.delay(100); // avoid rate limiting
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
     * Get historical data for a stock (Finnhub free tier supports 1min candles for 7 days)
     */
    async getHistoricalData(ticker, resolution = '1', from = null, to = null) {
        try {
            // Default: last 1 day
            const now = Math.floor(Date.now() / 1000);
            const oneDay = 60 * 60 * 24;
            from = from || now - oneDay;
            to = to || now;
            const url = `${this.baseUrl}/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}&token=${this.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.s === 'ok') {
                const historicalData = [];
                for (let i = 0; i < data.t.length; i++) {
                    historicalData.push({
                        time: data.t[i] * 1000,
                        open: data.o[i],
                        high: data.h[i],
                        low: data.l[i],
                        close: data.c[i],
                        volume: data.v[i]
                    });
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
        // US market hours: 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
        // Monday = 1, Friday = 5
        if (day >= 1 && day <= 5) {
            return utc >= 14 && utc < 21;
        }
        return false;
    }

    /**
     * Get market status
     */
    getMarketStatus() {
        return {
            isOpen: this.isMarketOpen(),
            lastUpdate: this.lastUpdate,
            isConnected: this.isConnected
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
        return this.stocks;
    }

    /**
     * Get stock display names
     */
    getStockNames() {
        return this.stockNames;
    }

    /**
     * Disconnect from API
     */
    disconnect() {
        this.isConnected = false;
        this.debugLog('Disconnected from Stock API', 'info');
    }
} 