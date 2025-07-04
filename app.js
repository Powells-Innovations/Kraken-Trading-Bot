/**
 * Main Application Module
 * Initializes all components and handles UI interactions
 * 
 * Copyright (c) 2025 Trading Bot AI
 * All rights reserved.
 * 
 * This software is proprietary and confidential. Unauthorized copying, 
 * distribution, or use of this software, via any medium, is strictly prohibited.
 * 
 * For licensing inquiries, contact: licensing@tradingbotai.com
 */

class TradingApp {
    constructor() {
        this.krakenAPI = null;
        this.yahooAPI = null;
        this.coinGeckoAPI = null;
        this.tradingBot = null;
        this.chart = null;
        this.selectedPair = 'BTCGBP';
        this.chartType = 'line';
        this.priceUpdateInterval = null;
        this.stockPriceUpdateInterval = null;
        this.coinGeckoUpdateInterval = null;
        this.pairData = {};
        this.coinGeckoData = {};
        this.debugAutoScroll = true;
        this.marketType = 'crypto'; // 'crypto' or 'stocks'
        this.latencyInterval = null;
        
        // Chart state management
        this.timeRange = '15m'; // 15m, 30m, 1h, 3h, 6h, 24h, 1w
        
        // Initialize components
        this.initializeComponents();
        // Start latency tester
        this.startLatencyTester();
    }

    /**
     * Initialize all application components
     */
    async initializeComponents() {
        try {
            this.debugLog('🚀 Initializing Trading Application...', 'info');
            
            // Initialize APIs
            this.krakenAPI = new KrakenAPI();
            this.yahooAPI = new YahooAPI();
            this.coinGeckoAPI = new CoinGeckoAPI();
            
            // Initialize Trading Bot
            this.tradingBot = new TradingBot();
            await this.tradingBot.initialize();
            
            // --- Pre-train neural net with history in background ---
            if (this.tradingBot.pretrainNeuralNetWithHistory) {
                this.tradingBot.pretrainNeuralNetWithHistory().catch(e => this.debugLog('NN pre-training error: ' + e.message, 'error'));
            }
            
            // Set up UI event listeners
            this.setupEventListeners();
            
            // Initialize chart
            await this.initializeChart();
            
            // Connect to APIs
            await this.connectToAPI();
            
            // Initialize pair cards
            this.initializeCryptoPairCards();
            this.initializeStockPairCards();
            
            // Start price updates
            this.startPriceUpdates();
            
            // Fetch initial CoinGecko data
            if (this.coinGeckoAPI.isConnected) {
                this.fetchInitialCoinGeckoData();
            }
            
            this.debugLog('✅ Application initialized successfully', 'success');
            
        } catch (error) {
            this.debugLog(`❌ Failed to initialize application: ${error.message}`, 'error');
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    /**
     * Connect to APIs
     */
    async connectToAPI() {
        try {
            if (this.marketType === 'crypto') {
                this.debugLog('🔗 Attempting to connect to Kraken API for real market data...', 'connection');
                const connected = await this.krakenAPI.connect();
                if (connected) {
                    this.updateAPIStatus(true);
                    this.showNotification('Connected to Kraken API - Real market data enabled', 'success');
                    this.logMessage('✅ Connected to live Kraken data', 'info');
                    this.debugLog('✅ Successfully connected to Kraken API - Real market data enabled', 'success');
                    this.initializeCryptoPairCards();
                } else {
                    this.updateAPIStatus(false);
                    this.showNotification('Failed to connect to Kraken API - No real market data available', 'error');
                    this.logMessage('❌ Kraken API connection failed - Cannot fetch real market data', 'error');
                    this.debugLog('❌ Kraken API connection failed - Real market data unavailable', 'error');
                    throw new Error('Kraken API connection failed - Real market data required');
                }
                
                // Also connect to CoinGecko for additional data
                this.debugLog('🔗 Attempting to connect to CoinGecko API for comprehensive crypto data...', 'connection');
                const coinGeckoConnected = await this.coinGeckoAPI.connect();
                if (coinGeckoConnected) {
                    this.debugLog('✅ Successfully connected to CoinGecko API', 'success');
                    this.showNotification('Connected to CoinGecko API - Comprehensive crypto data enabled', 'success');
                } else {
                    this.debugLog('⚠️ CoinGecko API connection failed - Using Kraken data only', 'warning');
                }
            } else {
                this.debugLog('🔗 Attempting to connect to Yahoo Finance API...', 'connection');
                const connected = await this.yahooAPI.connect();
                if (connected) {
                    this.updateAPIStatus(true);
                    this.showNotification('Connected to Yahoo Finance API', 'success');
                    this.logMessage('✅ Connected to live stock data', 'info');
                    this.debugLog('✅ Successfully connected to Yahoo Finance API', 'success');
                    this.initializeStockPairCards();
                } else {
                    this.updateAPIStatus(false);
                    this.showNotification('Failed to connect to Yahoo Finance API', 'error');
                    this.logMessage('❌ Yahoo Finance API connection failed', 'error');
                    this.debugLog('❌ Yahoo Finance API connection failed', 'error');
                    throw new Error('Yahoo Finance API connection failed');
                }
            }
        } catch (error) {
            this.updateAPIStatus(false);
            this.showNotification(`Failed to connect to ${this.marketType} API: ${error.message}`, 'error');
            this.logMessage(`❌ ${this.marketType} API connection failed: ${error.message}`, 'error');
            this.debugLog(`❌ API connection failed: ${error.message}`, 'error');
        }
    }

    /**
     * Start real-time price updates
     */
    startPriceUpdates() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }
        if (this.stockPriceUpdateInterval) {
            clearInterval(this.stockPriceUpdateInterval);
        }
        if (this.coinGeckoUpdateInterval) {
            clearInterval(this.coinGeckoUpdateInterval);
        }
        
        // Crypto updates every second
        this.priceUpdateInterval = setInterval(async () => {
            try {
                if (this.krakenAPI.isConnected) {
                    const tickerData = await this.krakenAPI.getTickerData();
                    this.updatePairData(tickerData);
                }
                this.updateUI();
            } catch (error) {
                this.debugLog(`Price update failed: ${error.message}`, 'error');
            }
        }, 1000); // 1 second interval for crypto
        
        // Stocks update every 60 seconds
        this.stockPriceUpdateInterval = setInterval(async () => {
            try {
                if (this.yahooAPI.isConnected) {
                    const stockData = await this.yahooAPI.getStockData();
                    this.updatePairData(stockData);
                }
                this.updateUI();
            } catch (error) {
                this.debugLog(`Stock price update failed: ${error.message}`, 'error');
            }
        }, 60000); // 60 seconds interval for stocks
        
        // CoinGecko data updates every 5 minutes (rate limit consideration)
        this.coinGeckoUpdateInterval = setInterval(async () => {
            try {
                if (this.coinGeckoAPI.isConnected) {
                    const coinGeckoData = await this.coinGeckoAPI.getAllTradingData();
                    this.updateCoinGeckoData(coinGeckoData);
                }
            } catch (error) {
                this.debugLog(`CoinGecko update failed: ${error.message}`, 'error');
            }
        }, 300000); // 5 minutes interval for CoinGecko
        
        this.debugLog('📈 Price updates started: crypto (1s), stocks (60s), CoinGecko (5m)', 'info');
    }

    /**
     * Update pair data with new market data
     */
    updatePairData(tickerData) {
        this.pairData = tickerData;
        
        // Update trading bot chart data
        Object.entries(tickerData).forEach(([symbol, data]) => {
            const price = data.price || data.c;
            const timestamp = data.lastUpdate || data.timestamp;
            this.tradingBot.updateChartData(symbol, price, timestamp);
        });
        
        // Check active trades
        if (this.tradingBot.isTrading) {
            this.tradingBot.checkActiveTrades(tickerData);
        }
    }

    /**
     * Update CoinGecko comprehensive data
     */
    updateCoinGeckoData(coinGeckoData) {
        this.coinGeckoData = coinGeckoData;
        
        // Merge CoinGecko data with existing pair data
        if (coinGeckoData.marketData) {
            Object.entries(coinGeckoData.marketData).forEach(([pair, data]) => {
                if (this.pairData[pair]) {
                    // Merge CoinGecko data with existing Kraken data
                    this.pairData[pair] = {
                        ...this.pairData[pair],
                        ...data
                    };
                }
            });
        }
        
        this.debugLog(`✅ Updated CoinGecko data for ${Object.keys(coinGeckoData.marketData || {}).length} coins`, 'success');
    }

    /**
     * Fetch initial CoinGecko data
     */
    async fetchInitialCoinGeckoData() {
        try {
            this.debugLog('Fetching initial CoinGecko data...', 'api');
            const coinGeckoData = await this.coinGeckoAPI.getAllTradingData();
            this.updateCoinGeckoData(coinGeckoData);
            
            // Also fetch global market data
            if (coinGeckoData.globalData) {
                this.debugLog(`Global Market Cap: £${(coinGeckoData.globalData.total_market_cap / 1000000000).toFixed(1)}B`, 'info');
                this.debugLog(`24h Volume: £${(coinGeckoData.globalData.total_volume / 1000000000).toFixed(1)}B`, 'info');
            }
        } catch (error) {
            this.debugLog(`Failed to fetch initial CoinGecko data: ${error.message}`, 'error');
        }
    }

    /**
     * Update all UI elements
     */
    updateUI() {
        this.updateStatistics();
        this.updateCryptoPairCards();
        this.updateStockPairCards();
        this.updateActiveTrades();
        this.updateChart();
    }

    /**
     * Update trading statistics
     */
    updateStatistics() {
        const stats = this.tradingBot.getStats();
        let displayBalance = Number(stats.accountBalance) || 0;
        let balanceLabel = 'Live Account';
        
        // Add unrealized PnL from open trades
        const unrealized = Number(this.tradingBot.getUnrealizedPnL()) || 0;
        displayBalance = Number(displayBalance) + unrealized;
        
        // Always use real data - no demo calculations
        document.getElementById('accountBalance').textContent = `£${(displayBalance || 0).toFixed(2)}`;
        document.getElementById('balanceLabel').textContent = balanceLabel;
        document.getElementById('totalPnL').textContent = `£${((Number(stats.totalPnL) || 0) + unrealized).toFixed(2)}`;
        document.getElementById('todayPnL').textContent = `£${(Number(stats.todayPnL) || 0).toFixed(2)}`;
        document.getElementById('totalTrades').textContent = stats.totalTrades;
        document.getElementById('winRate').textContent = `${stats.winRate}%`;
        
        // Debug log the balance update
        this.debugLog(`💳 UI Balance Update: £${(displayBalance || 0).toFixed(2)} (${balanceLabel})`, 'info');
    }

    /**
     * Fetch live account balance from Kraken
     */
    async fetchLiveBalance() {
        if (!this.apiKey || !this.apiSecret) {
            this.debugLog('No API credentials available for live balance fetch', 'warning');
            return null;
        }

        try {
            this.debugLog('Fetching live account balance...', 'api');
            const balance = await this.krakenAPI.getAccountBalance(this.apiKey, this.apiSecret);
            
            if (balance && balance.ZGBP) {
                const gbpBalance = parseFloat(balance.ZGBP);
                this.debugLog(`✅ Live balance fetched: £${gbpBalance.toFixed(2)}`, 'success');
                
                // Update trading bot account balance
                this.tradingBot.tradingStats.accountBalance = gbpBalance;
                
                // Update UI
                this.updateStatistics();
                
                return gbpBalance;
            } else {
                this.debugLog('No GBP balance found in account', 'warning');
                return 0;
            }
        } catch (error) {
            this.debugLog(`Failed to fetch live balance: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Test API connection with credentials
     */
    async testApiConnection() {
        const apiKey = document.getElementById('apiKey').value.trim();
        const apiSecret = document.getElementById('apiSecret').value.trim();
        
        if (!apiKey || !apiSecret) {
            this.showNotification('Please enter both API key and secret', 'error');
            return;
        }

        try {
            this.debugLog('Testing API credentials...', 'api');
            const result = await this.krakenAPI.testCredentials(apiKey, apiSecret);
            
            if (result.success) {
                this.showNotification('✅ API credentials validated successfully', 'success');
                this.debugLog('✅ API credentials test passed', 'success');
                
                // Store credentials for live trading
                this.apiKey = apiKey;
                this.apiSecret = apiSecret;
                
                // Fetch live balance
                await this.fetchLiveBalance();
                
            } else {
                this.showNotification(`❌ API credentials test failed: ${result.error}`, 'error');
                this.debugLog(`❌ API credentials test failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`❌ API test failed: ${error.message}`, 'error');
            this.debugLog(`❌ API test failed: ${error.message}`, 'error');
        }
    }

    /**
     * Initialize crypto trading pair cards
     */
    initializeCryptoPairCards() {
        const container = document.getElementById('cryptoPairsGrid');
        if (!container) return;
        container.innerHTML = '';
        Object.keys(this.krakenAPI.pairs).forEach(pair => {
            const card = this.createPairCard(pair, 'crypto');
            container.appendChild(card);
        });
    }

    /**
     * Initialize stock trading pair cards
     */
    initializeStockPairCards() {
        const container = document.getElementById('stockPairsGrid');
        if (!container) return;
        container.innerHTML = '';
        Object.keys(this.yahooAPI.stocks).forEach(stock => {
            const card = this.createPairCard(stock, 'stock');
            container.appendChild(card);
        });
    }

    /**
     * Create a trading pair card (crypto or stock)
     */
    createPairCard(symbol, type = 'crypto') {
        const card = document.createElement('div');
        card.className = 'pair-card';
        card.id = `${type}-pair-${symbol}`;
        let symbolName, changeLabel, currency;
        if (type === 'crypto') {
            symbolName = this.krakenAPI.pairNames[symbol];
            changeLabel = '24h Change';
            currency = '£';
        } else {
            symbolName = this.yahooAPI.stockNames[symbol];
            changeLabel = '24h Change';
            currency = '$';
        }
        card.innerHTML = `
            <div class="pair-header">
                <div>
                    <div class="pair-name">${symbolName}</div>
                    <div class="pair-price" id="price-${type}-${symbol}">Loading...</div>
                </div>
                <div class="pair-status status-inactive" id="status-${type}-${symbol}">Inactive</div>
            </div>
            <div class="pair-metrics">
                <div class="metric">
                    <div class="metric-value" id="change-${type}-${symbol}">0.00%</div>
                    <div class="metric-label">${changeLabel}</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="volume-${type}-${symbol}">0</div>
                    <div class="metric-label">Volume</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="trades-${type}-${symbol}">0</div>
                    <div class="metric-label">Trades</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="pnl-${type}-${symbol}">${currency}0.00</div>
                    <div class="metric-label">P&L</div>
                </div>
            </div>
        `;
        return card;
    }

    /**
     * Update crypto trading pair cards
     */
    updateCryptoPairCards() {
        Object.keys(this.krakenAPI.pairs).forEach(symbol => {
            const data = this.pairData[symbol];
            const type = 'crypto';
            const priceEl = document.getElementById(`price-${type}-${symbol}`);
            const statusEl = document.getElementById(`status-${type}-${symbol}`);
            if (!data) {
                if (priceEl) priceEl.textContent = 'No recent trades';
                if (statusEl) {
                    statusEl.textContent = 'No Data';
                    statusEl.className = 'pair-status status-inactive';
                }
                return;
            }
            const currency = '£';
            const decimals = 4;
            const price = typeof data.price === 'number' ? data.price : (typeof data.c === 'number' ? data.c : undefined);
            if (priceEl) {
                if (typeof price === 'number' && !isNaN(price)) {
                    priceEl.textContent = `${currency}${price.toFixed(decimals)}`;
                } else {
                    priceEl.textContent = 'N/A';
                }
            }
            const changeEl = document.getElementById(`change-${type}-${symbol}`);
            // Use CoinGecko data if available, fallback to Kraken data
            const changePercent = typeof data.price_change_percentage_24h === 'number'
                ? data.price_change_percentage_24h
                : (typeof data.changePercent === 'number'
                    ? data.changePercent
                    : (typeof data.change24h === 'number' ? data.change24h : undefined));
            if (changeEl) {
                if (typeof changePercent === 'number' && !isNaN(changePercent)) {
                    changeEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
                    changeEl.style.color = changePercent >= 0 ? '#00ff88' : '#ff4444';
                } else {
                    changeEl.textContent = 'N/A';
                    changeEl.style.color = '#ccc';
                }
            }
            const volumeEl = document.getElementById(`volume-${type}-${symbol}`);
            // Use CoinGecko volume data if available
            const volume = typeof data.total_volume === 'number' ? data.total_volume : 
                          (typeof data.volume === 'number' ? data.volume : 0);
            if (volumeEl) {
                const volumeText = volume > 1000000 ? 
                    (volume / 1000000).toFixed(1) + 'M' : 
                    (volume / 1000).toFixed(0) + 'K';
                volumeEl.textContent = volumeText;
            }
            
            // Add market cap info if available from CoinGecko
            const marketCapEl = document.getElementById(`market-cap-${type}-${symbol}`);
            if (marketCapEl && data.market_cap) {
                const marketCap = data.market_cap;
                const marketCapText = marketCap > 1000000000 ? 
                    (marketCap / 1000000000).toFixed(1) + 'B' : 
                    (marketCap / 1000000).toFixed(1) + 'M';
                marketCapEl.textContent = `MC: £${marketCapText}`;
            }
            
            if (statusEl) {
                const hasActiveTrade = this.tradingBot.activeTrades[symbol] ? true : false;
                if (hasActiveTrade) {
                    statusEl.textContent = 'In Trade';
                    statusEl.className = 'pair-status status-trading';
                } else if (this.tradingBot.isTrading) {
                    statusEl.textContent = 'Active';
                    statusEl.className = 'pair-status status-active';
                } else {
                    statusEl.textContent = 'Inactive';
                    statusEl.className = 'pair-status status-inactive';
                }
            }
        });
    }

    /**
     * Update stock trading pair cards
     */
    updateStockPairCards() {
        Object.keys(this.yahooAPI.stocks).forEach(symbol => {
            const data = this.pairData[symbol];
            const type = 'stock';
            const priceEl = document.getElementById(`price-${type}-${symbol}`);
            const statusEl = document.getElementById(`status-${type}-${symbol}`);
            if (!data) {
                if (priceEl) priceEl.textContent = 'No recent trades';
                if (statusEl) {
                    statusEl.textContent = 'No Data';
                    statusEl.className = 'pair-status status-inactive';
                }
                return;
            }
            const currency = '$';
            const decimals = 2;
            const price = typeof data.price === 'number' ? data.price : (typeof data.c === 'number' ? data.c : undefined);
            if (priceEl) {
                if (typeof price === 'number' && !isNaN(price)) {
                    priceEl.textContent = `${currency}${price.toFixed(decimals)}`;
                } else {
                    priceEl.textContent = 'N/A';
                }
            }
            const changeEl = document.getElementById(`change-${type}-${symbol}`);
            const changePercent = typeof data.changePercent === 'number'
                ? data.changePercent
                : (typeof data.change24h === 'number' ? data.change24h : undefined);
            if (changeEl) {
                if (typeof changePercent === 'number' && !isNaN(changePercent)) {
                    changeEl.textContent = `${changePercent.toFixed(2)}%`;
                    changeEl.style.color = changePercent >= 0 ? '#00ff88' : '#ff4444';
                } else {
                    changeEl.textContent = 'N/A';
                    changeEl.style.color = '#ccc';
                }
            }
            const volumeEl = document.getElementById(`volume-${type}-${symbol}`);
            const volume = typeof data.volume === 'number' ? data.volume : 0;
            if (volumeEl) {
                const volumeText = volume > 1000000 ? 
                    (volume / 1000000).toFixed(1) + 'M' : 
                    (volume / 1000).toFixed(0) + 'K';
                volumeEl.textContent = volumeText;
            }
            if (statusEl) {
                const hasActiveTrade = this.tradingBot.activeTrades[symbol] ? true : false;
                if (hasActiveTrade) {
                    statusEl.textContent = 'In Trade';
                    statusEl.className = 'pair-status status-trading';
                } else if (this.tradingBot.isTrading) {
                    statusEl.textContent = 'Active';
                    statusEl.className = 'pair-status status-active';
                } else {
                    statusEl.textContent = 'Inactive';
                    statusEl.className = 'pair-status status-inactive';
                }
            }
        });
    }

    /**
     * Update active trades display
     */
    updateActiveTrades() {
        const container = document.getElementById('activeTradesList');
        const activeTrades = this.tradingBot.getActiveTrades();
        const activeTradeKeys = Object.keys(activeTrades);
        
        if (activeTradeKeys.length === 0) {
            container.innerHTML = '<div class="empty-state">No active trades</div>';
            return;
        }
        
        container.innerHTML = activeTradeKeys.map(tradeKey => {
            const trade = activeTrades[tradeKey];
            const actualPair = trade.pair; // Get the actual pair name from the trade object
            const currentPrice = this.pairData[actualPair]?.price || 0;
            const unrealizedPnL = trade.unrealizedPnL || 0;
            const duration = Math.floor((Date.now() - trade.timestamp) / 1000);
            const priceChange = trade.side === 'BUY' 
                ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100
                : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
            
            const modeIcon = trade.mode === 'live' ? '💰' : '📊';
            const pairDisplayName = this.krakenAPI.pairNames[actualPair] || actualPair;
            
            return `
                <div class="trade-item">
                    <div class="trade-info">
                        <div class="trade-pair">${modeIcon} ${pairDisplayName} - ${trade.side}</div>
                        <div class="trade-details">Entry: £${trade.entryPrice.toFixed(4)} | Current: £${currentPrice.toFixed(4)} | ${duration}s | ${priceChange.toFixed(2)}%</div>
                    </div>
                    <div class="trade-pnl" style="color: ${unrealizedPnL >= 0 ? '#00ff88' : '#ff4444'}">
                        ${unrealizedPnL >= 0 ? '+' : ''}£${unrealizedPnL.toFixed(2)}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Initialize Lightweight Charts chart
     */
    async initializeChart() {
        // Fetch and store OHLC data for the selected pair
        await this.tradingBot.fetchAndStoreOHLC(this.selectedPair);
        this.updateChart();
    }

    /**
     * Update chart with new data using Plotly.js
     */
    updateChart() {
        const chartDiv = document.getElementById('priceChart');
        if (!chartDiv) return;
        
        let data;
        if (this.chartType === 'candlestick') {
            data = this.tradingBot.getChartData(this.selectedPair, 'candlestick');
        } else {
            data = this.tradingBot.getChartData(this.selectedPair, 'line');
        }
        
        if (!Array.isArray(data)) data = [];
        
        // Filter data based on time range
        const now = Date.now();
        let rangeMs = 40 * 60 * 1000; // Show last 40 minutes/candles by default
        if (this.timeRange === '30m') rangeMs = 30 * 60 * 1000;
        else if (this.timeRange === '1h') rangeMs = 60 * 60 * 1000;
        else if (this.timeRange === '3h') rangeMs = 3 * 60 * 60 * 1000;
        else if (this.timeRange === '6h') rangeMs = 6 * 60 * 60 * 1000;
        else if (this.timeRange === '24h') rangeMs = 24 * 60 * 60 * 1000;
        else if (this.timeRange === '1w') rangeMs = 7 * 24 * 60 * 60 * 1000;
        
        data = data.filter(d => d && d.time && (typeof d.time === 'number') && (d.time * 1000) >= (now - rangeMs) && (d.time * 1000) <= now);
        
        if (!data.length) {
            chartDiv.innerHTML = '<div style="color:#f66;text-align:center;padding:1em;">No data available</div>';
            return;
        }

        // Prepare data for Plotly
        const times = data.map(d => new Date(d.time * 1000));
        const closes = data.map(d => d.close ?? d.price);

        if (this.chartType === 'candlestick') {
            // Candlestick chart only, no overlays
            const traces = [
                {
                    x: times,
                    open: data.map(d => d.open ?? d.close),
                    high: data.map(d => d.high ?? d.close),
                    low: data.map(d => d.low ?? d.close),
                    close: data.map(d => d.close),
                    decreasing: { line: { color: '#ef5350' } },
                    increasing: { line: { color: '#26a69a' } },
                    type: 'candlestick',
                    name: 'Price',
                    xaxis: 'x',
                    yaxis: 'y'
                }
            ];

            const layout = {
                title: `${this.selectedPair} Candlestick Chart`,
                dragmode: 'zoom',
                showlegend: false,
                xaxis: {
                    rangeslider: { visible: true },
                    type: 'date',
                    title: 'Time',
                    gridcolor: '#444',
                    zerolinecolor: '#444',
                    linecolor: '#444',
                    tickcolor: '#444',
                    tickfont: { color: '#fff' },
                    titlefont: { color: '#fff' }
                },
                yaxis: {
                    title: 'Price',
                    gridcolor: '#444',
                    zerolinecolor: '#444',
                    linecolor: '#444',
                    tickcolor: '#444',
                    tickfont: { color: '#fff' },
                    titlefont: { color: '#fff' }
                },
                plot_bgcolor: '#181a20',
                paper_bgcolor: '#181a20',
                font: { color: '#fff' },
                margin: { l: 60, r: 10, t: 40, b: 40 }
            };

            const config = {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                displaylogo: false,
                useResizeHandler: true
            };

            Plotly.newPlot(chartDiv, traces, layout, config);

        } else {
            // Line chart
            const traces = [
                {
                    x: times,
                    y: data.map(d => d.price ?? d.close),
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#f0b90b', width: 2 },
                    name: 'Price',
                    xaxis: 'x',
                    yaxis: 'y'
                }
            ];

            const layout = {
                title: `${this.selectedPair} Price Chart`,
                dragmode: 'zoom',
                showlegend: false,
                xaxis: {
                    rangeslider: { visible: true },
                    type: 'date',
                    title: 'Time',
                    gridcolor: '#444',
                    zerolinecolor: '#444',
                    linecolor: '#444',
                    tickcolor: '#444',
                    tickfont: { color: '#fff' },
                    titlefont: { color: '#fff' }
                },
                yaxis: {
                    title: 'Price',
                    gridcolor: '#444',
                    zerolinecolor: '#444',
                    linecolor: '#444',
                    tickcolor: '#444',
                    tickfont: { color: '#fff' },
                    titlefont: { color: '#fff' }
                },
                plot_bgcolor: '#181a20',
                paper_bgcolor: '#181a20',
                font: { color: '#fff' },
                margin: { l: 60, r: 10, t: 40, b: 40 }
            };

            const config = {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                displaylogo: false,
                useResizeHandler: true
            };

            Plotly.newPlot(chartDiv, traces, layout, config);
        }
    }

    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Settings change listeners
        document.getElementById('maxInvestment').addEventListener('change', (e) => {
            this.tradingBot.updateSettings({ maxInvestment: parseFloat(e.target.value) });
        });
        
        document.getElementById('takeProfit').addEventListener('change', (e) => {
            this.tradingBot.updateSettings({ takeProfit: parseFloat(e.target.value) });
        });
        
        document.getElementById('stopLoss').addEventListener('change', (e) => {
            this.tradingBot.updateSettings({ stopLoss: parseFloat(e.target.value) });
        });
        
        document.getElementById('tradeFrequency').addEventListener('change', (e) => {
            this.tradingBot.updateSettings({ tradeFrequency: e.target.value });
        });

        // Market type change listener
        document.getElementById('marketType').addEventListener('change', (e) => {
            this.toggleMarketType();
        });
    }

    /**
     * Toggle market type between crypto and stocks
     */
    toggleMarketType() {
        const marketTypeSelect = document.getElementById('marketType');
        const newMarketType = marketTypeSelect.value;
        
        if (this.marketType !== newMarketType) {
            this.marketType = newMarketType;
            this.tradingBot.setMarketType(newMarketType);
            
            // Stop current trading if active
            if (this.tradingBot.isTrading) {
                this.tradingBot.stopTrading();
                this.updateTradingStatus(false);
            }
            
            // Reconnect to the appropriate API
            this.connectToAPI().then(() => {
                // Reinitialize pair cards
                this.initializeCryptoPairCards();
                this.initializeStockPairCards();
                
                // Update chart controls
                this.updateChartControls();
                
                // Restart price updates
                this.startPriceUpdates();
                
                // Restart latency tester
                this.startLatencyTester();
                
                this.showNotification(`Switched to ${newMarketType} market`, 'success');
                this.logMessage(`🔄 Switched to ${newMarketType} market`, 'info');
            });
        }
    }

    /**
     * Update chart controls based on market type
     */
    updateChartControls() {
        const pairSelector = document.querySelector('.pair-selector');
        if (!pairSelector) return;
        pairSelector.innerHTML = '';
        if (this.marketType === 'crypto') {
            const cryptoPairs = ['BTCGBP', 'XRPGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
            cryptoPairs.forEach((pair, index) => {
                const button = document.createElement('button');
                button.className = `pair-btn ${index === 0 ? 'active' : ''}`;
                button.onclick = () => this.selectPair(pair);
                button.textContent = this.krakenAPI.pairNames[pair];
                pairSelector.appendChild(button);
            });
            this.selectedPair = 'BTCGBP';
        } else {
            const stockTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
            stockTickers.forEach((ticker, index) => {
                const button = document.createElement('button');
                button.className = `pair-btn ${index === 0 ? 'active' : ''}`;
                button.onclick = () => this.selectPair(ticker);
                button.textContent = this.yahooAPI.stockNames[ticker];
                pairSelector.appendChild(button);
            });
            this.selectedPair = 'AAPL';
        }
        // Update chart
        this.updateChart();
    }

    /**
     * Update API connection status
     */
    updateAPIStatus(connected) {
        const statusEl = document.getElementById('apiStatus');
        const statusTextEl = document.getElementById('apiStatusText');
        
        if (connected) {
            statusEl.classList.add('connected');
            statusTextEl.textContent = 'Connected';
        } else {
            statusEl.classList.remove('connected');
            statusTextEl.textContent = 'Disconnected';
        }
    }

    /**
     * Update trading status
     */
    updateTradingStatus(trading) {
        const statusEl = document.getElementById('tradingStatus');
        const statusTextEl = document.getElementById('tradingStatusText');
        
        if (trading) {
            statusEl.classList.add('trading');
            statusTextEl.textContent = 'Trading';
        } else {
            statusEl.classList.remove('trading');
            statusTextEl.textContent = 'Stopped';
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, type === 'error' ? 5000 : 3000);
    }

    /**
     * Add log entry
     */
    addLogEntry(entry) {
        const logContainer = document.getElementById('tradingLog');
        const timestamp = entry.timestamp.toLocaleTimeString('en-GB', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        let message = '';
        let logClass = 'log-info';
        
        if (entry.type === 'trade') {
            const modeIcon = entry.mode === 'live' ? '💰' : '📊';
            const sideIcon = entry.side === 'BUY' ? '📈' : '📉';
            message = `${modeIcon} ${sideIcon} ${entry.side} ${this.krakenAPI.pairNames[entry.pair]}: £${this.tradingBot.settings.maxInvestment} at £${entry.price.toFixed(4)}`;
            logClass = entry.side === 'BUY' ? 'log-buy' : 'log-sell';
        } else if (entry.type === 'closure') {
            const modeIcon = entry.mode === 'live' ? '💰' : '📊';
            const pnlIcon = entry.pnl >= 0 ? '💰' : '📉';
            message = `${modeIcon} ${pnlIcon} CLOSE ${this.krakenAPI.pairNames[entry.pair]}: ${entry.pnl >= 0 ? '+' : ''}£${entry.pnl.toFixed(2)} ${entry.reason} at £${entry.price.toFixed(4)}`;
            logClass = entry.pnl >= 0 ? 'log-buy' : 'log-sell';
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${logClass}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span>${message}</span>
        `;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Keep only last 50 entries
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.firstChild);
        }
        
        // Also log to debug console
        this.debugLog(`[LOG] ${message}`, 'info');
    }

    /**
     * Log message
     */
    logMessage(message, type = 'info') {
        const logContainer = document.getElementById('tradingLog');
        const timestamp = new Date().toLocaleTimeString('en-GB', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span>${message}</span>
        `;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * Debug logging function
     */
    debugLog(message, type = 'info') {
        const debugContainer = document.getElementById('debugLog');
        const timestamp = new Date().toLocaleTimeString('en-GB', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const debugEntry = document.createElement('div');
        debugEntry.className = 'debug-entry';
        debugEntry.innerHTML = `
            <span class="debug-timestamp">${timestamp}</span>
            <span class="debug-message debug-${type}">${message}</span>
        `;
        
        debugContainer.appendChild(debugEntry);
        
        if (this.debugAutoScroll) {
            debugContainer.scrollTop = debugContainer.scrollHeight;
        }
        
        // Keep only last 100 entries
        while (debugContainer.children.length > 100) {
            debugContainer.removeChild(debugContainer.firstChild);
        }
        
        // Also log to console
        console.log(`[DEBUG] ${message}`);
    }

    /**
     * Clear debug log
     */
    clearDebugLog() {
        const debugContainer = document.getElementById('debugLog');
        debugContainer.innerHTML = '';
        this.debugLog('Debug log cleared', 'info');
    }

    /**
     * Toggle debug auto-scroll
     */
    toggleDebugLog() {
        this.debugAutoScroll = !this.debugAutoScroll;
        const statusEl = document.getElementById('debugStatus');
        statusEl.textContent = `Auto-scroll: ${this.debugAutoScroll ? 'ON' : 'OFF'}`;
        this.debugLog(`Auto-scroll ${this.debugAutoScroll ? 'enabled' : 'disabled'}`, 'info');
    }

    /**
     * Select trading pair/stock for chart display
     */
    async selectPair(symbol) {
        this.selectedPair = symbol;
        await this.tradingBot.fetchAndStoreOHLC(this.selectedPair);
        this.updateChart();
        this.debugLog(`Selected ${symbol} for chart display`, 'info');
    }

    /**
     * Set chart type (line or candlestick)
     */
    async setChartType(type) {
        this.chartType = type;
        await this.tradingBot.fetchAndStoreOHLC(this.selectedPair);
        this.updateChart();
        this.debugLog(`Chart type set to: ${type}`, 'info');
    }

    /**
     * Start latency tester for the current market
     */
    startLatencyTester() {
        if (this.latencyInterval) clearInterval(this.latencyInterval);
        const latencyEl = document.getElementById('latencyStatus');
        
        const pingKraken = async () => {
            const start = performance.now();
            try {
                // Fetch real market data from Kraken
                const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=BTCGBP', { 
                    method: 'GET', 
                    cache: 'no-store' 
                });
                const data = await response.json();
                const latency = Math.round(performance.now() - start);
                latencyEl.textContent = `${latency} ms`;
                this.debugLog(`🌐 Kraken API latency: ${latency}ms`, 'info');
            } catch (error) {
                latencyEl.textContent = '-- ms';
                this.debugLog(`❌ Kraken API latency test failed: ${error.message}`, 'error');
            }
        };
                pingKraken();
        this.latencyInterval = setInterval(pingKraken, 60000); // 1 minute interval
    }

    // Restore and fix setTimeRange so the time range buttons work
    setTimeRange(range) {
        this.timeRange = range;
        // Update active button
        const buttons = document.querySelectorAll('.time-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        buttons.forEach(btn => {
            if (btn.textContent.replace(/\s/g, '') === range.replace(/\s/g, '')) {
                btn.classList.add('active');
            }
        });
        this.updateChart();
        this.debugLog(`Time range set to: ${range}`, 'info');
    }
}

// Global functions for HTML onclick handlers
window.startTrading = function() {
    if (app.tradingBot.startTrading()) {
        app.updateTradingStatus(true);
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        app.showNotification('Trading started', 'success');
    }
};

window.stopTrading = function() {
    app.tradingBot.stopTrading();
    app.updateTradingStatus(false);
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    app.showNotification('Trading stopped', 'warning');
};

window.refreshData = function() {
    app.connectToAPI();
    app.showNotification('Refreshing data...', 'info');
};

window.setManualStopLoss = function() {
    app.showNotification('Manual stop loss feature coming soon', 'info');
};

window.reloadHistoricalData = async function() {
    if (app.tradingBot) {
        app.showNotification('Reloading historical data for all pairs...', 'info');
        await app.tradingBot.reloadAllHistoricalData();
        app.showNotification('Historical data reload complete!', 'success');
    } else {
        app.showNotification('Trading bot not initialized', 'error');
    }
};

window.toggleTradingMode = function() {
    const mode = document.getElementById('tradingMode').value;
    app.tradingBot.setTradingMode(mode);
    
    if (mode === 'live') {
        document.getElementById('apiSection').style.display = 'block';
    } else {
        document.getElementById('apiSection').style.display = 'none';
    }
    
    app.showNotification(`Trading mode set to: ${mode}`, 'info');
};

window.toggleMarketType = function() {
    app.toggleMarketType();
};

window.testApiConnection = function() {
    app.testApiConnection();
};

window.selectPair = function(symbol) {
    app.selectPair(symbol);
};

window.setChartType = function(type) {
    if (window.app) {
        window.app.setChartType(type);
    }
};

window.setTimeRange = function(range) {
    if (window.app) {
        window.app.setTimeRange(range);
    }
};

window.clearDebugLog = function() {
    app.clearDebugLog();
};

window.toggleDebugLog = function() {
    app.toggleDebugLog();
};

// Initialize app when DOM is loaded

document.addEventListener('DOMContentLoaded', function() {
    window.app = new TradingApp();
}); 
