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

// Global legal disclaimer functions
window.acceptLegalDisclaimer = function() {
    document.getElementById('legalDisclaimer').style.display = 'none';
    localStorage.setItem('legalDisclaimerAccepted', 'true');
    if (window.app) {
        window.app.debugLog('Legal disclaimer accepted by user', 'info');
    }
};

window.rejectLegalDisclaimer = function() {
    alert('You must accept the legal disclaimer to use this application. The page will now close.');
    window.close();
    // Fallback for browsers that don't allow window.close()
    window.location.href = 'about:blank';
};

// Global API test function
window.testApiConnection = function() {
    if (window.app) {
        window.app.testApiConnection();
    } else {
        console.error('Trading app not initialized');
    }
};

// Check if legal disclaimer has been accepted
function checkLegalDisclaimer() {
    const accepted = localStorage.getItem('legalDisclaimerAccepted');
    if (!accepted) {
        document.getElementById('legalDisclaimer').style.display = 'flex';
        return false;
    }
    return true;
}

// Clear API credentials from memory
function clearApiCredentials() {
    if (window.app) {
        window.app.apiKey = null;
        window.app.apiSecret = null;
        if (window.app.debugLog) {
            window.app.debugLog('API credentials cleared from memory', 'info');
        }
    }
}

// Clear API credentials on page unload
window.addEventListener('beforeunload', function() {
    clearApiCredentials();
});

// Clear API credentials on page visibility change (tab switch)
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // Optional: clear credentials when tab is not visible
        // clearApiCredentials();
    }
});

class TradingApp {
    constructor() {
        this.krakenAPI = null;
        this.binanceAPI = null;
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
        
        // API credentials (stored in memory only)
        this.apiKey = null;
        this.apiSecret = null;

        // Chart state management
        this.timeRange = '15m'; // 15m, 30m, 1h, 3h, 6h, 24h, 1w

        // Check legal disclaimer first
        if (!checkLegalDisclaimer()) {
            this.debugLog('Waiting for legal disclaimer acceptance...', 'info');
            // Don't return, continue with initialization
        }

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

            // Initialize APIs first
            this.krakenAPI = new KrakenAPI();
            this.binanceAPI = new BinanceAPI();
            this.yahooAPI = new YahooAPI();
            this.coinGeckoAPI = new CoinGeckoAPI();

            // Initialize Trading Bot
            this.tradingBot = new TradingBot();
            await this.tradingBot.initialize();
            
            // Update previous trades to show any loaded from backend
            this.updatePreviousTrades();

            // --- Pre-train neural net with history in background ---
            if (this.tradingBot.pretrainNeuralNetWithHistory) {
                this.tradingBot.pretrainNeuralNetWithHistory().catch(e => this.debugLog('NN pre-training error: ' + e.message, 'error'));
            }

            // Connect to APIs
            await this.connectToAPI();

            // Initialize pair cards
            this.initializeCryptoPairCards();
            this.initializeStockPairCards();

            // Set up UI event listeners (after APIs are initialized)
            this.setupEventListeners();

            // Initialize chart
            await this.initializeChart();

            // Start price updates
            this.startPriceUpdates();

            // Fetch initial CoinGecko data
            if (this.coinGeckoAPI.isConnected) {
                this.fetchInitialCoinGeckoData();
            }

            // Update balance label
            this.updateBalanceLabel();

            this.debugLog('✅ Application initialized successfully', 'success');
            this.restoreTradingState();

        } catch (error) {
            this.debugLog(`❌ Failed to initialize application: ${error.message}`, 'error');
        }
    }

    /**
     * Connect to appropriate API based on market type
     */
    async connectToAPI() {
        if (this.marketType === 'crypto') {
            // Connect to Binance for market data
            this.debugLog('🔗 Attempting to connect to Binance API for market data...', 'info');
            const binanceConnected = await this.binanceAPI.connect();
            if (binanceConnected) {
                this.updateAPIStatus(true);
                this.showNotification('Connected to Binance API for market data', 'success');
                this.logMessage('✅ Connected to live crypto data via Binance', 'info');
                this.debugLog('✅ Successfully connected to Binance API for market data', 'success');
                this.initializeCryptoPairCards();
                
                // Load historical data for AI analysis
                if (this.tradingBot) {
                    this.debugLog('🔄 Loading historical data for AI analysis...', 'info');
                    await this.tradingBot.loadInitialHistoricalData();
                    
                    // Refresh chart after data is loaded
                    this.debugLog('🔄 Refreshing chart with new data...', 'info');
                    this.updateChart();
                }
            } else {
                this.updateAPIStatus(false);
                this.showNotification('Failed to connect to Binance API', 'error');
                this.logMessage('❌ Failed to connect to Binance API', 'error');
                this.debugLog('❌ Binance API connection failed', 'error');
            }

            // Connect to Kraken for trade execution (keep existing connection)
            this.debugLog('🔗 Attempting to connect to Kraken API for trade execution...', 'info');
            const krakenConnected = await this.krakenAPI.connect();
            if (krakenConnected) {
                this.debugLog('✅ Successfully connected to Kraken API for trade execution', 'success');
            } else {
                this.debugLog('❌ Kraken API connection failed - Trade execution may be limited', 'warning');
            }

            // Try CoinGecko as backup
            this.debugLog('🔄 Attempting to connect to CoinGecko API...', 'info');
            const coinGeckoConnected = await this.coinGeckoAPI.connect();
            if (coinGeckoConnected) {
                this.debugLog('✅ Successfully connected to CoinGecko API', 'success');
            } else {
                this.debugLog('❌ CoinGecko API connection failed - Using Binance data only', 'warning');
            }
        } else {
            this.debugLog('🔄 Attempting to connect to Yahoo Finance API...', 'info');
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
                this.logMessage('❌ Failed to connect to Yahoo Finance API', 'error');
                this.debugLog('❌ Yahoo Finance API connection failed', 'error');
            }
        }
    }

    /**
     * Start price updates
     */
    startPriceUpdates() {
        if (this.priceUpdateInterval) clearInterval(this.priceUpdateInterval);
        if (this.stockPriceUpdateInterval) clearInterval(this.stockPriceUpdateInterval);
        if (this.coinGeckoUpdateInterval) clearInterval(this.coinGeckoUpdateInterval);

        if (this.marketType === 'crypto') {
            // Update crypto prices every 5 seconds using Binance
            this.priceUpdateInterval = setInterval(async () => {
                try {
                    const tickerData = await this.binanceAPI.getTickerData();
                    this.pairData = { ...this.pairData, ...tickerData };
                    
                    // Update trading bot's chart data with new prices
                    if (this.tradingBot) {
                        Object.keys(tickerData).forEach(pair => {
                            const data = tickerData[pair];
                            if (data && data.price) {
                                this.tradingBot.updateChartData(pair, data.price, Date.now());
                            }
                        });
                    }
                    
                    this.updateCryptoPairCards();
                    if (this.tradingBot) {
                        this.tradingBot.recalculateAllUnrealizedPnL(this.pairData);
                    }
                    this.updateActiveTrades();
                    this.updateStatistics();
                    
                    // Update trading bot with new data
                    if (this.tradingBot && this.tradingBot.isTrading) {
                        await this.tradingBot.checkActiveTrades(tickerData);
                    }
                } catch (error) {
                    this.debugLog(`Binance price update failed: ${error.message}`, 'error');
                    // Don't update UI when API fails - keep last known data
                }
            }, 5000);

            // Update CoinGecko data every 30 seconds
            this.coinGeckoUpdateInterval = setInterval(async () => {
                if (this.coinGeckoAPI.isConnected) {
                    try {
                        const coinGeckoData = await this.coinGeckoAPI.getMarketData();
                        this.coinGeckoData = coinGeckoData;
                        this.updateCryptoPairCards(); // Refresh with CoinGecko data
                    } catch (error) {
                        this.debugLog(`CoinGecko update failed: ${error.message}`, 'error');
                    }
                }
            }, 30000);
        } else {
            // Update stock prices every 10 seconds
            this.stockPriceUpdateInterval = setInterval(async () => {
                try {
                    const stockData = await this.yahooAPI.getStockData();
                    this.pairData = { ...this.pairData, ...stockData };
                    
                    // Update trading bot's chart data with new prices
                    if (this.tradingBot) {
                        Object.keys(stockData).forEach(symbol => {
                            const data = stockData[symbol];
                            if (data && data.price) {
                                this.tradingBot.updateChartData(symbol, data.price, Date.now());
                            }
                        });
                    }
                    
                    this.updateStockPairCards();
                    if (this.tradingBot) {
                        this.tradingBot.recalculateAllUnrealizedPnL(this.pairData);
                    }
                    this.updateActiveTrades();
                    this.updateStatistics();
                    
                    // Update trading bot with new data
                    if (this.tradingBot && this.tradingBot.isTrading) {
                        await this.tradingBot.checkActiveTrades(stockData);
                    }
                } catch (error) {
                    this.debugLog(`Stock price update failed: ${error.message}`, 'error');
                    // Don't update UI when API fails - keep last known data
                }
            }, 10000);
        }
    }

    /**
     * Fetch initial CoinGecko data
     */
    async fetchInitialCoinGeckoData() {
        try {
            const coinGeckoData = await this.coinGeckoAPI.getMarketData();
            this.coinGeckoData = coinGeckoData;
            this.updateCryptoPairCards();
        } catch (error) {
            this.debugLog(`Initial CoinGecko data fetch failed: ${error.message}`, 'error');
        }
    }

    /**
     * Initialize crypto trading pair cards
     */
    initializeCryptoPairCards() {
        const container = document.getElementById('cryptoPairsGrid');
        if (!container) return;

        container.innerHTML = Object.keys(this.binanceAPI.pairs).map(symbol => {
            const pairName = this.binanceAPI.pairNames[symbol];
            return `
                <div class="pair-card" id="pair-${symbol}">
                    <div class="pair-header">
                        <h4>${pairName}</h4>
                        <span class="pair-status status-inactive" id="status-${symbol}">Inactive</span>
                    </div>
                    <div class="pair-metrics">
                        <div class="metric">
                            <div class="metric-value" id="price-${symbol}">£0.0000</div>
                            <div class="metric-label">Price</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value" id="change-${symbol}">0.00%</div>
                            <div class="metric-label">24h Change</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value" id="volume-${symbol}">0K</div>
                            <div class="metric-label">Volume</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value" id="market-cap-${symbol}">--</div>
                            <div class="metric-label">Market Cap</div>
                        </div>
                    </div>
                    <div class="pair-pnl" id="pnl-${symbol}">
                        <div class="pnl-value">£0.00</div>
                        <div class="metric-label">P&L</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Initialize stock trading pair cards
     */
    initializeStockPairCards() {
        const container = document.getElementById('stockPairsGrid');
        if (!container) return;

        container.innerHTML = Object.keys(this.yahooAPI.stocks).map(symbol => {
            const stockName = this.yahooAPI.stockNames[symbol];
            return `
                <div class="pair-card" id="pair-${symbol}">
                    <div class="pair-header">
                        <h4>${stockName}</h4>
                        <span class="pair-status status-inactive" id="status-${symbol}">Inactive</span>
                    </div>
                    <div class="pair-metrics">
                        <div class="metric">
                            <div class="metric-value" id="price-${symbol}">$0.00</div>
                            <div class="metric-label">Price</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value" id="change-${symbol}">0.00%</div>
                            <div class="metric-label">Change</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value" id="volume-${symbol}">0K</div>
                            <div class="metric-label">Volume</div>
                        </div>
                    </div>
                    <div class="pair-pnl" id="pnl-${symbol}">
                        <div class="pnl-value">$0.00</div>
                        <div class="metric-label">P&L</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update crypto trading pair cards
     */
    updateCryptoPairCards() {
        Object.keys(this.binanceAPI.pairs).forEach(symbol => {
            const data = this.pairData[symbol];
            const priceEl = document.getElementById(`price-${symbol}`);
            const statusEl = document.getElementById(`status-${symbol}`);
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
            const changeEl = document.getElementById(`change-${symbol}`);
            // Use CoinGecko data if available, fallback to Binance data
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
            const volumeEl = document.getElementById(`volume-${symbol}`);
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
            const marketCapEl = document.getElementById(`market-cap-${symbol}`);
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
            const priceEl = document.getElementById(`price-${symbol}`);
            const statusEl = document.getElementById(`status-${symbol}`);
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
            const changeEl = document.getElementById(`change-${symbol}`);
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
            const volumeEl = document.getElementById(`volume-${symbol}`);
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
            const pairDisplayName = this.binanceAPI.pairNames[actualPair] || actualPair;
            
            // Get current stop loss
            const currentStopLoss = trade.aiStopLoss || trade.stopLoss || (trade.side === 'BUY' ? currentPrice * 0.95 : currentPrice * 1.05);
            const stopLossText = `SL: £${currentStopLoss.toFixed(4)}`;
            
            // Debug logging for investment amount
            this.debugLog(`[Active Trade] ${actualPair}: Investment amount = £${trade.investment?.toFixed(2) || 'N/A'}`, 'info');

            return `
                <div class="trade-item">
                    <div class="trade-info">
                        <div class="trade-pair">${modeIcon} ${pairDisplayName} - ${trade.side}</div>
                        <div class="trade-details">Entry: £${trade.entryPrice.toFixed(4)} | Current: £${currentPrice.toFixed(4)} | ${stopLossText} | Investment: £${trade.investment.toFixed(2)} | ${duration}s | ${priceChange.toFixed(2)}%</div>
                    </div>
                    <div class="trade-actions">
                        <div class="trade-pnl" style="color: ${unrealizedPnL >= 0 ? '#00ff88' : '#ff4444'}">
                            ${unrealizedPnL >= 0 ? '+' : ''}£${unrealizedPnL.toFixed(2)}
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="closeTrade('${tradeKey}')" title="Close Trade">
                            ✕ Close
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update previous trades display
     */
    updatePreviousTrades() {
        const previousTradesList = document.getElementById('previousTradesList');
        const totalHistoricalPnL = document.getElementById('totalHistoricalPnL');
        const totalHistoricalTrades = document.getElementById('totalHistoricalTrades');
        const historicalWinRate = document.getElementById('historicalWinRate');
        
        // Get trade history from trading bot
        const tradeHistory = this.tradingBot.getTradeHistory(50); // Get last 50 trades
        
        // Debug logging
        this.debugLog(`[Previous Trades] Trade history length: ${tradeHistory?.length || 0}`, 'info');
        if (tradeHistory && tradeHistory.length > 0) {
            this.debugLog(`[Previous Trades] Latest trade: ${tradeHistory[tradeHistory.length - 1].pair} - £${tradeHistory[tradeHistory.length - 1].pnl.toFixed(2)}`, 'info');
        }
        
        if (!tradeHistory || tradeHistory.length === 0) {
            previousTradesList.innerHTML = '<div class="empty-state">No previous trades</div>';
            totalHistoricalPnL.textContent = '£0.00';
            totalHistoricalTrades.textContent = '0';
            historicalWinRate.textContent = '0%';
            return;
        }
        
        // Calculate summary statistics
        let totalPnL = 0;
        let winningTrades = 0;
        
        tradeHistory.forEach(trade => {
            totalPnL += trade.pnl || 0;
            if (trade.pnl > 0) {
                winningTrades++;
            }
        });
        
        const winRate = tradeHistory.length > 0 ? (winningTrades / tradeHistory.length * 100) : 0;
        
        // Update summary stats
        const pnlClass = totalPnL >= 0 ? 'positive' : 'negative';
        const pnlSign = totalPnL >= 0 ? '+' : '';
        
        totalHistoricalPnL.textContent = `${pnlSign}£${totalPnL.toFixed(2)}`;
        totalHistoricalPnL.className = `summary-value ${pnlClass}`;
        totalHistoricalTrades.textContent = tradeHistory.length;
        historicalWinRate.textContent = `${winRate.toFixed(1)}%`;
        
        // Display trade history
        let html = '';
        tradeHistory.slice(-20).reverse().forEach(trade => { // Show last 20 trades, newest first
            const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
            const pnlSign = trade.pnl >= 0 ? '+' : '';
            const date = new Date(trade.exitTime || trade.timestamp).toLocaleDateString();
            const time = new Date(trade.exitTime || trade.timestamp).toLocaleTimeString();
            const modeIcon = trade.mode === 'live' ? '💰' : '📊';
            
            html += `
                <div class="trade-item">
                    <div class="trade-info">
                        <div class="trade-pair">${modeIcon} ${trade.pair} - ${trade.side}</div>
                        <div class="trade-details">
                            Entry: £${trade.entryPrice.toFixed(4)} → Exit: £${trade.exitPrice?.toFixed(4) || 'N/A'} | Investment: £${trade.investment?.toFixed(2) || 'N/A'} | ${date} ${time}
                        </div>
                    </div>
                    <div class="trade-pnl" style="color: ${trade.pnl >= 0 ? '#00ff88' : '#ff4444'}">
                        ${pnlSign}£${trade.pnl.toFixed(2)}
                    </div>
                </div>
            `;
        });
        
        previousTradesList.innerHTML = html;
    }

    /**
     * Close a specific trade manually
     */
    async closeTrade(tradeKey) {
        try {
            this.debugLog(`🔄 Manually closing trade: ${tradeKey}`, 'info');
            
            // Parse the trade key to get pair and index
            const [pair, indexStr] = tradeKey.split('_');
            const index = parseInt(indexStr);
            
            if (isNaN(index)) {
                this.debugLog(`❌ Invalid trade key format: ${tradeKey}`, 'error');
                return;
            }
            
            // Get current price for the pair
            const currentPrice = this.pairData[pair]?.price;
            if (!currentPrice || currentPrice <= 0) {
                this.debugLog(`❌ No valid current price for ${pair}`, 'error');
                this.showNotification(`Cannot close trade: No current price for ${pair}`, 'error');
                return;
            }
            
            // Close the trade using the trading bot
            await this.tradingBot.closeTrade(pair, 'Manual Close', index);
            
            // Update UI
            this.updateActiveTrades();
            this.updatePreviousTrades();
            this.updateStatistics();
            
            this.debugLog(`✅ Trade ${tradeKey} closed successfully`, 'success');
            this.showNotification(`Trade closed: ${pair}`, 'success');
            
        } catch (error) {
            this.debugLog(`❌ Error closing trade ${tradeKey}: ${error.message}`, 'error');
            this.showNotification(`Error closing trade: ${error.message}`, 'error');
        }
    }

    /**
     * Initialize Lightweight Charts chart
     */
    async initializeChart() {
        // Wait for historical data to be loaded first
        if (this.tradingBot && this.tradingBot.chartData && this.tradingBot.chartData[this.selectedPair]) {
            this.debugLog(`Chart data available for ${this.selectedPair}: ${this.tradingBot.chartData[this.selectedPair].length} candles`, 'info');
        } else {
            this.debugLog(`No chart data available for ${this.selectedPair}, fetching...`, 'info');
            // Try to fetch data if not available
            if (this.tradingBot) {
                await this.tradingBot.fetchAndStoreOHLC(this.selectedPair);
            }
        }
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

        // For 1m interval, use time filter. For 15m and above, just show last 200 candles.
        if (this.currentInterval && this.currentInterval >= 15) {
            data = data.slice(-200);
        } else {
            // Filter data based on time range (for 1m interval)
            const now = Date.now();
            let rangeMs = 40 * 60 * 1000; // Show last 40 minutes/candles by default
            if (this.timeRange === '30m') rangeMs = 30 * 60 * 1000;
            else if (this.timeRange === '1h') rangeMs = 60 * 60 * 1000;
            else if (this.timeRange === '3h') rangeMs = 3 * 60 * 60 * 1000;
            else if (this.timeRange === '6h') rangeMs = 6 * 60 * 60 * 1000;
            else if (this.timeRange === '24h') rangeMs = 24 * 60 * 60 * 1000;
            else if (this.timeRange === '1w') rangeMs = 7 * 24 * 60 * 60 * 1000;
            data = data.filter(d => {
                if (!d || !d.time || typeof d.time !== 'number') return false;
                const dataTime = d.time;
                return dataTime >= (now - rangeMs) && dataTime <= (now + 60000);
            });
        }

        this.debugLog(`Chart data: ${data.length} points after filtering (range: ${this.timeRange})`, 'info');
        
        // Debug: show first and last data points
        if (data.length > 0) {
            const first = data[0];
            const last = data[data.length - 1];
            this.debugLog(`First data point: ${new Date(first.time).toISOString()} - £${first.close}`, 'info');
            this.debugLog(`Last data point: ${new Date(last.time).toISOString()} - £${last.close}`, 'info');
        }

        if (!data.length) {
            this.debugLog(`No chart data available for ${this.selectedPair} after filtering`, 'warning');
            // Show more detailed error message
            const totalData = this.tradingBot ? this.tradingBot.chartData[this.selectedPair]?.length || 0 : 0;
            chartDiv.innerHTML = `<div style="color:#f66;text-align:center;padding:1em;">
                No data available for ${this.selectedPair}<br>
                Total candles: ${totalData}<br>
                Time range: ${this.timeRange}<br>
                Try clicking "Reload Historical Data" button
            </div>`;
            return;
        }

        // Prepare data for Plotly
        const times = data.map(d => new Date(d.time)); // Binance time is already in milliseconds
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
                dragmode: 'pan', // Default to pan (move chart with click-and-drag)
                showlegend: false,
                xaxis: {
                    // Remove range slider for a cleaner look
                    rangeslider: { visible: false },
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
                // Only show zoom, pan, and reset buttons
                modeBarButtonsToRemove: [
                    'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetViews', 'toggleSpikelines',
                    'hoverClosestCartesian', 'hoverCompareCartesian', 'lasso2d', 'select2d', 'toImage', 'sendDataToCloud', 'editInChartStudio', 'resetViewMapbox', 'resetView3d', 'resetViewGeo', 'resetViewGl2d', 'resetViewPie', 'resetViewSunburst', 'resetViewIcicle', 'resetViewTreemap', 'resetViewFunnelarea', 'resetViewParcats', 'resetViewParcoords', 'resetViewSplom', 'resetViewViolin', 'resetViewBox', 'resetViewHistogram', 'resetViewBar', 'resetViewScatter', 'resetViewScattergl', 'resetViewScattermapbox', 'resetViewScattergeo', 'resetViewScatterpolargl', 'resetViewScatterternary', 'resetViewScattercarpet', 'resetViewScatter3d', 'resetViewSurface', 'resetViewMesh3d', 'resetViewCone', 'resetViewStreamtube', 'resetViewVolume', 'resetViewIsosurface', 'resetViewHeatmap', 'resetViewHeatmapgl', 'resetViewContour', 'resetViewContourcarpet', 'resetViewHistogram2d', 'resetViewHistogram2dcontour', 'resetViewOhlc', 'resetViewCandlestick', 'resetViewWaterfall', 'resetViewFunnel', 'resetViewIndicator', 'resetViewTable'
                ],
                displaylogo: false,
                useResizeHandler: true,
                scrollZoom: true // Enable mouse wheel zoom
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
                dragmode: 'pan', // Default to pan (move chart with click-and-drag)
                showlegend: false,
                xaxis: {
                    rangeslider: { visible: false }, // Remove range slider
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
                modeBarButtonsToRemove: [
                    'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetViews', 'toggleSpikelines',
                    'hoverClosestCartesian', 'hoverCompareCartesian', 'lasso2d', 'select2d', 'toImage', 'sendDataToCloud', 'editInChartStudio', 'resetViewMapbox', 'resetView3d', 'resetViewGeo', 'resetViewGl2d', 'resetViewPie', 'resetViewSunburst', 'resetViewIcicle', 'resetViewTreemap', 'resetViewFunnelarea', 'resetViewParcats', 'resetViewParcoords', 'resetViewSplom', 'resetViewViolin', 'resetViewBox', 'resetViewHistogram', 'resetViewBar', 'resetViewScatter', 'resetViewScattergl', 'resetViewScattermapbox', 'resetViewScattergeo', 'resetViewScatterpolargl', 'resetViewScatterternary', 'resetViewScattercarpet', 'resetViewScatter3d', 'resetViewSurface', 'resetViewMesh3d', 'resetViewCone', 'resetViewStreamtube', 'resetViewVolume', 'resetViewIsosurface', 'resetViewHeatmap', 'resetViewHeatmapgl', 'resetViewContour', 'resetViewContourcarpet', 'resetViewHistogram2d', 'resetViewHistogram2dcontour', 'resetViewOhlc', 'resetViewCandlestick', 'resetViewWaterfall', 'resetViewFunnel', 'resetViewIndicator', 'resetViewTable'
                ],
                displaylogo: false,
                useResizeHandler: true,
                scrollZoom: true // Enable mouse wheel zoom
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
            
            // Only call setMarketType if tradingBot exists
            if (this.tradingBot) {
                this.tradingBot.setMarketType(newMarketType);

                // Stop current trading if active
                if (this.tradingBot.isTrading) {
                    this.tradingBot.stopTrading();
                    this.updateTradingStatus(false);
                }
            }

            // Reconnect to the appropriate API
            this.connectToAPI().then(() => {
                // Reinitialize pair cards
                if (this.binanceAPI) {
                    this.initializeCryptoPairCards();
                }
                if (this.yahooAPI) {
                    this.initializeStockPairCards();
                }

                // Update chart controls
                this.updateChartControls();

                // Restart price updates
                this.startPriceUpdates();

                // Restart latency tester
                this.startLatencyTester();

                this.showNotification(`Switched to ${newMarketType} market`, 'success');
                this.logMessage(`🔄 Switched to ${newMarketType} market`, 'info');
                this.updateBalanceLabel(); // Update balance label after market type change
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
            const cryptoPairs = ['BTCGBP', 'XRPGBP', 'XLMGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
            cryptoPairs.forEach((pair, index) => {
                const button = document.createElement('button');
                button.className = `pair-btn ${index === 0 ? 'active' : ''}`;
                button.onclick = () => this.selectPair(pair);
                button.textContent = this.binanceAPI.pairNames[pair];
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
        
        // Update button highlighting for the selected pair
        this.updatePairButtonHighlighting(this.selectedPair);
        
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
            let confStr = '';
            if (typeof entry.confidence === 'number') {
                confStr = ` | conf: ${(entry.confidence * 100).toFixed(1)}%`;
            }
            message = `${modeIcon} ${sideIcon} ${entry.side} ${this.binanceAPI.pairNames[entry.pair]}: £${this.tradingBot.settings.maxInvestment} at £${entry.price.toFixed(4)}${confStr}`;
            logClass = entry.side === 'BUY' ? 'log-buy' : 'log-sell';
        } else if (entry.type === 'closure') {
            const modeIcon = entry.mode === 'live' ? '💰' : '📊';
            const pnlIcon = entry.pnl >= 0 ? '📈' : '📉';
            message = `${modeIcon} ${pnlIcon} CLOSE ${this.binanceAPI.pairNames[entry.pair]}: ${entry.pnl >= 0 ? '+' : ''}£${entry.pnl.toFixed(2)} ${entry.reason} at £${entry.price.toFixed(4)}`;
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
        this.debugLog(`Selecting ${symbol} for chart display`, 'info');
        
        // Update button highlighting
        this.updatePairButtonHighlighting(symbol);
        
        // Always fetch fresh OHLC data for this pair
        if (this.tradingBot) {
            await this.tradingBot.fetchAndStoreOHLC(symbol);
        }
        // Force chart refresh with new data
        await this.updateChart();
        // Also update chart type button highlighting (in case chart type changed)
        this.updateChartTypeButtonHighlighting(this.chartType);
        this.debugLog(`Selected ${symbol} for chart display`, 'info');
    }

    /**
     * Update pair button highlighting
     */
    updatePairButtonHighlighting(selectedSymbol) {
        const pairButtons = document.querySelectorAll('.pair-btn');
        pairButtons.forEach(button => {
            button.classList.remove('active');
            // Check if this button corresponds to the selected symbol
            const buttonText = button.textContent.trim();
            if (this.marketType === 'crypto') {
                const pairName = this.binanceAPI.pairNames[selectedSymbol];
                if (buttonText === pairName) {
                    button.classList.add('active');
                }
            } else {
                const stockName = this.yahooAPI.stockNames[selectedSymbol];
                if (buttonText === stockName) {
                    button.classList.add('active');
                }
            }
        });
    }

    /**
     * Set chart type (line or candlestick)
     */
    async setChartType(type) {
        this.chartType = type;
        // Update chart type button highlighting
        this.updateChartTypeButtonHighlighting(type);
        // Always fetch fresh OHLC data for the current pair
        if (this.tradingBot) {
            await this.tradingBot.fetchAndStoreOHLC(this.selectedPair);
        }
        // Force chart refresh with new data
        await this.updateChart();
        // Also update pair button highlighting (in case pair changed)
        this.updatePairButtonHighlighting(this.selectedPair);
        this.debugLog(`Chart type set to: ${type}`, 'info');
    }

    /**
     * Update chart type button highlighting
     */
    updateChartTypeButtonHighlighting(selectedType) {
        const typeButtons = document.querySelectorAll('.type-btn');
        typeButtons.forEach(button => {
            button.classList.remove('active');
            // Compare button text and selectedType, ignoring case and whitespace
            const btnText = button.textContent.trim().toLowerCase();
            const selType = selectedType.trim().toLowerCase();
            if ((btnText === 'line' && selType === 'line') || (btnText.startsWith('candl') && selType.startsWith('candl'))) {
                button.classList.add('active');
            }
        });
    }

    /**
     * Set time range for chart
     */
    async setTimeRange(range) {
        this.timeRange = range;
        // Update time range button highlighting
        this.updateTimeRangeButtonHighlighting(range);
        // Determine Binance interval and limit from time range
        let interval = 1; // default 1m
        let limit = 1440;
        if (range === '15m') { interval = 15; limit = 1440; }
        else if (range === '30m') { interval = 30; limit = 1440; }
        else if (range === '1h') { interval = 60; limit = 1440; }
        else if (range === '3h') { interval = 180; limit = 200; }
        else if (range === '6h') { interval = 360; limit = 200; }
        else if (range === '24h') { interval = 1440; limit = 200; }
        else if (range === '1w') { interval = 10080; limit = 200; }
        // Track the current interval for chart filtering
        this.currentInterval = interval;
        // Show loading message on chart
        const chartDiv = document.getElementById('priceChart');
        if (chartDiv) {
            chartDiv.innerHTML = `<div style="color:#ffc107;text-align:center;padding:1em;">Loading chart data...</div>`;
        }
        // Fetch new OHLC data for the selected interval and limit
        if (this.tradingBot) {
            await this.tradingBot.fetchAndStoreOHLC(this.selectedPair, interval, limit);
        }
        // Force chart refresh with new time range
        await this.updateChart();
        // Also update pair and chart type button highlighting for consistency
        this.updatePairButtonHighlighting(this.selectedPair);
        this.updateChartTypeButtonHighlighting(this.chartType);
        this.debugLog(`Time range set to: ${range} (interval: ${interval}, limit: ${limit})`, 'info');
    }

    /**
     * Update time range button highlighting
     */
    updateTimeRangeButtonHighlighting(selectedRange) {
        const timeButtons = document.querySelectorAll('.time-btn');
        timeButtons.forEach(button => {
            button.classList.remove('active');
            // Compare button text and selectedRange, ignoring case and whitespace
            const btnText = button.textContent.trim().toLowerCase();
            const selRange = selectedRange.trim().toLowerCase();
            if (btnText === selRange) {
                button.classList.add('active');
            }
        });
    }

    /**
     * Start latency tester and server status checker
     */
    startLatencyTester() {
        if (this.latencyInterval) clearInterval(this.latencyInterval);
        const latencyEl = document.getElementById('latencyStatus');

        const checkServers = async () => {
            const start = performance.now();
            let allServersOnline = true;
            
            try {
                // Check Binance proxy (Port 3003)
                const binanceResponse = await fetch('http://localhost:3003/api/binance/ping', {
                    method: 'GET',
                    cache: 'no-store'
                });
                if (!binanceResponse.ok) {
                    allServersOnline = false;
                    this.debugLog('❌ Binance proxy server offline', 'error');
                }
            } catch (error) {
                allServersOnline = false;
                this.debugLog('❌ Binance proxy server unreachable', 'error');
            }

            try {
                // Check Kraken proxy (Port 3004)
                const krakenResponse = await fetch('http://localhost:3004/api/kraken/ping', {
                    method: 'GET',
                    cache: 'no-store'
                });
                if (!krakenResponse.ok) {
                    allServersOnline = false;
                    this.debugLog('❌ Kraken proxy server offline', 'error');
                }
            } catch (error) {
                allServersOnline = false;
                this.debugLog('❌ Kraken proxy server unreachable', 'error');
            }

            if (allServersOnline) {
                // Test Binance latency (Port 3003)
                const binanceStart = performance.now();
                try {
                    const response = await fetch('http://localhost:3003/api/binance/ticker', {
                        method: 'GET',
                        cache: 'no-store'
                    });
                    const data = await response.json();
                    const latency = Math.round(performance.now() - binanceStart);
                    latencyEl.textContent = `${latency} ms`;
                    this.debugLog(`🌐 All servers online - Latency: ${latency}ms`, 'info');
                } catch (error) {
                    latencyEl.textContent = 'Error';
                    this.debugLog(`Latency test failed: ${error.message}`, 'error');
                }
            } else {
                latencyEl.textContent = 'Offline';
                this.debugLog('⚠️ Some proxy servers are offline - check start-all-servers.bat', 'warning');
            }
        };

        checkServers();
        this.latencyInterval = setInterval(checkServers, 30000); // Check every 30 seconds
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        if (!this.tradingBot) return;

        const stats = this.tradingBot.getStats();
        
        // Update balance
        const balanceEl = document.getElementById('accountBalance');
        if (balanceEl) {
            balanceEl.textContent = `£${stats.accountBalance.toFixed(2)}`;
        }

        // Update P&L
        const totalPnLEl = document.getElementById('totalPnL');
        if (totalPnLEl) {
            totalPnLEl.textContent = `£${stats.totalPnL.toFixed(2)}`;
            totalPnLEl.style.color = stats.totalPnL >= 0 ? '#00ff88' : '#ff4444';
        }

        const todayPnLEl = document.getElementById('todayPnL');
        if (todayPnLEl) {
            todayPnLEl.textContent = `£${stats.todayPnL.toFixed(2)}`;
            todayPnLEl.style.color = stats.todayPnL >= 0 ? '#00ff88' : '#ff4444';
        }

        // Update trade count
        const totalTradesEl = document.getElementById('totalTrades');
        if (totalTradesEl) {
            totalTradesEl.textContent = stats.totalTrades;
        }

        // Update win rate
        const winRateEl = document.getElementById('winRate');
        if (winRateEl) {
            winRateEl.textContent = `${stats.winRate}%`;
        }
    }

    /**
     * Get account balance (for live trading)
     */
    async getAccountBalance() {
        try {
            if (!this.apiKey || !this.apiSecret) {
                throw new Error('API credentials required for account balance');
            }

            const balance = await this.krakenAPI.getAccountBalance(this.apiKey, this.apiSecret);
            
            // Update balance display
            const balanceEl = document.getElementById('accountBalance');
            if (balanceEl && balance.ZGBP) {
                const liveBalance = parseFloat(balance.ZGBP);
                balanceEl.textContent = `£${liveBalance.toFixed(2)}`;
                
                // Update trading bot's live balance
                if (this.tradingBot) {
                    this.tradingBot.updateLiveBalance(liveBalance);
                }
                
                // Update balance label
                this.updateBalanceLabel();
            }

            this.debugLog('Account balance updated', 'success');
            return balance;
        } catch (error) {
            this.debugLog(`Failed to get account balance: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Test API connection
     */
    async testApiConnection() {
        try {
            const apiKey = document.getElementById('apiKey').value.trim();
            const apiSecret = document.getElementById('apiSecret').value.trim();

            if (!apiKey || !apiSecret) {
                this.showNotification('Please enter both API key and secret', 'error');
                return;
            }

            // Basic validation
            if (apiKey.length < 50 || apiSecret.length < 50) {
                this.showNotification('Invalid API credentials format - keys should be longer', 'error');
                return;
            }

            // Update connection indicator to show testing
            this.updateConnectionIndicator('testing');

            this.debugLog('Testing API credentials and permissions...', 'info');
            this.debugLog(`API Key length: ${apiKey.length}, Secret length: ${apiSecret.length}`, 'info');
            
            const result = await this.krakenAPI.testCredentials(apiKey, apiSecret);

            if (result.success) {
                // Check for trading permissions
                if (result.permissions && !result.permissions.includes('Trade')) {
                    this.showNotification('⚠️ API key lacks trading permissions - only View access detected', 'warning');
                    this.logMessage('⚠️ API key needs Trade permissions for live trading', 'warning');
                    this.debugLog(`API permissions: ${result.permissions.join(', ')} - Trade permission required`, 'warning');
                    
                    // Still allow connection but warn about limited functionality
                    this.updateConnectionIndicator('connected');
                    this.apiKey = apiKey;
                    this.apiSecret = apiSecret;
                    
                    this.showNotification('Connected with limited permissions - paper trading only', 'warning');
                    return;
                }
                
                this.showNotification('✅ API credentials validated with full trading permissions', 'success');
                this.logMessage('✅ API credentials validated with trading permissions', 'success');
                
                // Update connection indicator to show connected
                this.updateConnectionIndicator('connected');
                
                // Store credentials in memory (not persistent)
                this.apiKey = apiKey;
                this.apiSecret = apiSecret;
                
                // Update balance
                try {
                    await this.getAccountBalance();
                } catch (balanceError) {
                    this.debugLog(`Balance fetch failed but credentials are valid: ${balanceError.message}`, 'warning');
                }
                
                this.debugLog('API credentials stored in memory (session only)', 'info');
            } else {
                this.showNotification(`API test failed: ${result.error}`, 'error');
                this.logMessage(`❌ API test failed: ${result.error}`, 'error');
                this.debugLog(`API test failed with error: ${result.error}`, 'error');
                
                // Update connection indicator to show disconnected
                this.updateConnectionIndicator('disconnected');
                
                // Provide helpful debugging information
                if (result.error.includes('Invalid signature')) {
                    this.debugLog('This usually means the API secret is incorrect or the signature generation is wrong', 'error');
                } else if (result.error.includes('Invalid key')) {
                    this.debugLog('This usually means the API key is incorrect', 'error');
                } else if (result.error.includes('Permission denied')) {
                    this.debugLog('This usually means the API key lacks required permissions (need "View" permission)', 'error');
                } else if (result.error.includes('trading permissions')) {
                    this.debugLog('API key needs "Trade" permissions enabled in Kraken settings', 'error');
                }
            }
        } catch (error) {
            this.showNotification(`API test failed: ${error.message}`, 'error');
            this.logMessage(`❌ API test failed: ${error.message}`, 'error');
            this.debugLog(`API test error: ${error.message}`, 'error');
            
            // Update connection indicator to show disconnected
            this.updateConnectionIndicator('disconnected');
            
            // Check if it's a network error
            if (error.message.includes('fetch') || error.message.includes('network')) {
                this.debugLog('Network error - check if the proxy server is running', 'error');
            }
        }
    }

    /**
     * Update balance label based on trading mode
     */
    updateBalanceLabel() {
        const balanceLabel = document.getElementById('balanceLabel');
        if (balanceLabel && this.tradingBot) {
            if (this.tradingBot.tradingMode === 'live') {
                balanceLabel.textContent = 'Live Account';
                balanceLabel.style.color = '#00ff88';
            } else {
                balanceLabel.textContent = 'Demo Account';
                balanceLabel.style.color = '#ffc107';
            }
        }
    }

    /**
     * Update connection indicator
     */
    updateConnectionIndicator(status) {
        const indicator = document.getElementById('connectionIndicator');
        if (!indicator) return;

        switch (status) {
            case 'connected':
                indicator.textContent = '🟢';
                indicator.className = 'connection-indicator connected';
                break;
            case 'disconnected':
                indicator.textContent = '🔴';
                indicator.className = 'connection-indicator disconnected';
                break;
            case 'testing':
                indicator.textContent = '🟡';
                indicator.className = 'connection-indicator';
                break;
            default:
                indicator.textContent = '🔴';
                indicator.className = 'connection-indicator disconnected';
        }
    }

    restoreTradingState() {
        // Restore trading state from localStorage
        const wasTrading = localStorage.getItem('tradingActive') === 'true';
        if (wasTrading && this.tradingBot && !this.tradingBot.isTrading) {
            this.tradingBot.startTrading().then(success => {
                if (success) {
                    this.updateTradingStatus(true);
                    document.getElementById('startBtn').disabled = true;
                    document.getElementById('stopBtn').disabled = false;
                }
            });
        } else if (!wasTrading) {
            this.updateTradingStatus(false);
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
        }
        
        // Force background sync to get latest data
        this.forceBackgroundSync();
        
        if (this.tradingBot) {
            this.tradingBot.recalculateAllUnrealizedPnL(this.pairData);
            this.updateActiveTrades();
            this.updatePreviousTrades();
            this.updateStatistics();
        }
    }

    /**
     * Force background sync to get latest data from backend
     */
    async forceBackgroundSync() {
        try {
            this.debugLog('🔄 Forcing background sync to get latest data...', 'info');
            
            // Force sync on backend
            await this.tradingBot.backendAPI.forceBackgroundSync();
            
            // Poll for updated data
            await this.tradingBot.pollBackgroundSync();
            
            this.debugLog('✅ Background sync completed', 'success');
        } catch (error) {
            this.debugLog(`❌ Background sync failed: ${error.message}`, 'error');
        }
    }
}

// Global functions for UI interactions
window.startTrading = function() {
    if (window.app && window.app.tradingBot) {
        window.app.tradingBot.startTrading().then(success => {
            if (success) {
                window.app.updateTradingStatus(true);
                window.app.showNotification('Trading started', 'success');
                document.getElementById('startBtn').disabled = true;
                document.getElementById('stopBtn').disabled = false;
                localStorage.setItem('tradingActive', 'true');
            } else {
                window.app.showNotification('Failed to start trading', 'error');
            }
        });
    }
};

window.testApiConnection = function() {
    if (window.app) {
        window.app.testApiConnection();
    } else {
        console.error('Trading app not initialized');
    }
};

window.stopTrading = function() {
    if (window.app && window.app.tradingBot) {
        window.app.tradingBot.stopTrading();
        window.app.updateTradingStatus(false);
        window.app.showNotification('Trading stopped', 'info');
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        localStorage.setItem('tradingActive', 'false');
    }
};

window.refreshData = function() {
    if (window.app) {
        window.app.connectToAPI();
        window.app.showNotification('Data refreshed', 'info');
    }
};

window.refreshChart = async function() {
    if (window.app) {
        await window.app.updateChart();
        window.app.showNotification('Chart refreshed', 'info');
    }
};

window.reloadHistoricalData = function() {
    if (window.app && window.app.tradingBot) {
        window.app.tradingBot.reloadAllHistoricalData().then(() => {
            window.app.showNotification('Historical data reloaded', 'info');
            // Refresh chart after data is reloaded
            window.app.updateChart();
        });
    }
};

window.setManualStopLoss = function() {
    if (window.app && window.app.tradingBot) {
        const activeTrades = window.app.tradingBot.getActiveTrades();
        const tradeKeys = Object.keys(activeTrades);
        
        if (tradeKeys.length === 0) {
            window.app.showNotification('No active trades to set stop loss for', 'warning');
            return;
        }
        
        // Create modal for stop loss selection
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        let modalHTML = `
            <h3>🛡️ Set Manual Stop Loss</h3>
            <p>Select a trade and set a new stop loss level:</p>
        `;
        
        // Add trade selection
        modalHTML += `
            <div>
                <label>Select Trade:</label>
                <select id="tradeSelect">
        `;
        
        tradeKeys.forEach(key => {
            const trade = activeTrades[key];
            const currentPrice = window.app.tradingBot.getCurrentPrice(trade.pair);
            const unrealizedPnL = window.app.tradingBot.calculatePnL(trade, currentPrice);
            const pnlColor = unrealizedPnL >= 0 ? '#00ff88' : '#ff4444';
            
            modalHTML += `
                <option value="${key}">
                    ${trade.pair} ${trade.side} - £${trade.investment.toFixed(2)} 
                    (${unrealizedPnL >= 0 ? '+' : ''}£${unrealizedPnL.toFixed(2)})
                </option>
            `;
        });
        
        modalHTML += `
                </select>
            </div>
            
            <div>
                <label>Current Stop Loss:</label>
                <input type="text" id="currentStopLoss" readonly>
            </div>
            
            <div>
                <label>Current Price:</label>
                <input type="text" id="currentPrice" readonly>
            </div>
            
            <div>
                <label>New Stop Loss (£):</label>
                <input type="number" id="newStopLoss" step="0.0001">
                <small>Enter the new stop loss price</small>
            </div>
            
            <div>
                <label>Risk Amount:</label>
                <input type="text" id="riskAmount" readonly>
            </div>
            
            <div class="modal-buttons">
                <button id="cancelStopLoss" class="btn-cancel">Cancel</button>
                <button id="applyStopLoss" class="btn-apply">Apply Stop Loss</button>
            </div>
        `;
        
        modalContent.innerHTML = modalHTML;
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Get references to elements
        const tradeSelect = document.getElementById('tradeSelect');
        const currentStopLossInput = document.getElementById('currentStopLoss');
        const currentPriceInput = document.getElementById('currentPrice');
        const newStopLossInput = document.getElementById('newStopLoss');
        const riskAmountInput = document.getElementById('riskAmount');
        const cancelBtn = document.getElementById('cancelStopLoss');
        const applyBtn = document.getElementById('applyStopLoss');
        
        // Update display when trade selection changes
        const updateDisplay = () => {
            const selectedKey = tradeSelect.value;
            const trade = activeTrades[selectedKey];
            const currentPrice = window.app.tradingBot.getCurrentPrice(trade.pair);
            
            // Show current stop loss
            const currentStopLoss = trade.aiStopLoss || trade.stopLoss || (trade.side === 'BUY' ? currentPrice * 0.95 : currentPrice * 1.05);
            currentStopLossInput.value = `£${currentStopLoss.toFixed(4)}`;
            
            // Show current price
            if (currentPriceInput) {
                currentPriceInput.value = `£${currentPrice.toFixed(4)}`;
            }
            
            // Set default new stop loss
            const defaultNewStopLoss = trade.side === 'BUY' ? currentPrice * 0.975 : currentPrice * 1.025;
            newStopLossInput.value = defaultNewStopLoss.toFixed(4);
            
            // Calculate and show risk amount
            const updateRiskAmount = () => {
                const newStopLoss = parseFloat(newStopLossInput.value);
                if (!isNaN(newStopLoss) && newStopLoss > 0) {
                    const riskPerUnit = Math.abs(trade.entryPrice - newStopLoss);
                    const totalRisk = riskPerUnit * trade.quantity;
                    riskAmountInput.value = `£${totalRisk.toFixed(2)} (${((riskPerUnit / trade.entryPrice) * 100).toFixed(2)}%)`;
                } else {
                    riskAmountInput.value = 'Invalid price';
                }
            };
            
            updateRiskAmount();
            newStopLossInput.addEventListener('input', updateRiskAmount);
        };
        
        // Initialize display
        updateDisplay();
        tradeSelect.addEventListener('change', updateDisplay);
        
        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Handle apply
        applyBtn.addEventListener('click', async () => {
            const selectedKey = tradeSelect.value;
            const trade = activeTrades[selectedKey];
            const newStopLoss = parseFloat(newStopLossInput.value);
            
            if (isNaN(newStopLoss) || newStopLoss <= 0) {
                window.app.showNotification('Please enter a valid stop loss price', 'error');
                return;
            }
            
            // Validate stop loss based on trade side
            const currentPrice = window.app.tradingBot.getCurrentPrice(trade.pair);
            if (!currentPrice || currentPrice <= 0) {
                window.app.showNotification('Unable to get current price for validation', 'error');
                return;
            }
            
            if (trade.side === 'BUY' && newStopLoss >= currentPrice) {
                window.app.showNotification('Stop loss for BUY trades must be below current price', 'error');
                return;
            }
            if (trade.side === 'SELL' && newStopLoss <= currentPrice) {
                window.app.showNotification('Stop loss for SELL trades must be above current price', 'error');
                return;
            }
            
            try {
                // Update the trade's stop loss
                trade.aiStopLoss = newStopLoss;
                
                // Update in trading bot
                const [pair, index] = selectedKey.split('_');
                if (window.app.tradingBot.activeTrades[pair] && window.app.tradingBot.activeTrades[pair][parseInt(index)]) {
                    window.app.tradingBot.activeTrades[pair][parseInt(index)].aiStopLoss = newStopLoss;
                }
                
                // Save to backend
                const success = await window.app.tradingBot.backendAPI.updateTrade(trade.id, {
                    ai_stop_loss: newStopLoss
                });
                
                if (success) {
                    window.app.showNotification(`Stop loss updated for ${trade.pair} to £${newStopLoss.toFixed(4)}`, 'success');
                    window.app.debugLog(`🛡️ Manual stop loss set for ${trade.pair}: £${newStopLoss.toFixed(4)}`, 'info');
                    
                    // Update UI
                    window.app.updateActiveTrades();
                    window.app.updatePreviousTrades();
                    
                    // Close modal
                    document.body.removeChild(modal);
                } else {
                    throw new Error('Failed to save to backend');
                }
                
            } catch (error) {
                window.app.showNotification(`Failed to update stop loss: ${error.message}`, 'error');
                window.app.debugLog(`❌ Stop loss update failed: ${error.message}`, 'error');
            }
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Close modal with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
    } else {
        window.app.showNotification('Trading bot not available', 'error');
    }
};

window.toggleMarketType = function() {
    if (window.app) {
        window.app.toggleMarketType();
    }
};

window.toggleTradingMode = function() {
    const modeSelect = document.getElementById('tradingMode');
    const apiSection = document.getElementById('apiSection');
    
    if (modeSelect.value === 'live') {
        apiSection.style.display = 'block';
        // Update trading bot mode to live
        if (window.app && window.app.tradingBot) {
            window.app.tradingBot.setTradingMode('live');
            window.app.debugLog('Trading mode switched to LIVE', 'info');
            window.app.updateBalanceLabel();
        }
    } else {
        apiSection.style.display = 'none';
        // Clear API credentials and switch to demo mode
        if (window.app) {
            window.app.apiKey = null;
            window.app.apiSecret = null;
            // Update trading bot mode to demo and clear live balance
            if (window.app.tradingBot) {
                window.app.tradingBot.setTradingMode('demo');
                window.app.tradingBot.updateLiveBalance(null); // Clear live balance
                window.app.debugLog('Trading mode switched to DEMO, live balance cleared', 'info');
                window.app.updateBalanceLabel();
            }
            window.app.debugLog('API credentials cleared (switched to demo mode)', 'info');
        }
    }
};

window.selectPair = function(symbol) {
    if (window.app) {
        window.app.selectPair(symbol);
    }
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
    if (window.app) {
        window.app.clearDebugLog();
    }
};

window.toggleDebugLog = function() {
    if (window.app) {
        window.app.toggleDebugLog();
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new TradingApp();
});

// Global function to close trades (accessible from HTML onclick)
window.closeTrade = function(tradeKey) {
    if (window.app && window.app.closeTrade) {
        window.app.closeTrade(tradeKey);
    } else {
        console.error('Trading app not initialized');
    }
};

// Global functions for HTML buttons
function startTrading() {
    if (window.app) {
        window.app.startTrading();
    }
}

function stopTrading() {
    if (window.app) {
        window.app.stopTrading();
    }
}

function refreshData() {
    if (window.app) {
        window.app.refreshData();
    }
}

function reloadHistoricalData() {
    if (window.app && window.app.tradingBot) {
        window.app.tradingBot.reloadAllHistoricalData();
    }
}

function refreshChart() {
    if (window.app) {
        window.app.refreshChart();
    }
}

function forceSync() {
    if (window.app) {
        window.app.forceBackgroundSync();
    }
}

function setManualStopLoss() {
    if (window.app) {
        window.app.showStopLossModal();
    }
}

function toggleMarketType() {
    if (window.app) {
        window.app.toggleMarketType();
    }
}

function toggleTradingMode() {
    if (window.app) {
        window.app.toggleTradingMode();
    }
}

function testApiConnection() {
    if (window.app) {
        window.app.testApiConnection();
    }
}

function selectPair(pair) {
    if (window.app) {
        window.app.selectPair(pair);
    }
}

function setChartType(type) {
    if (window.app) {
        window.app.setChartType(type);
    }
}

function setTimeRange(range) {
    if (window.app) {
        window.app.setTimeRange(range);
    }
}

function closeTrade(tradeKey) {
    if (window.app) {
        window.app.closeTrade(tradeKey);
    }
}

function clearDebugLog() {
    if (window.app) {
        window.app.clearDebugLog();
    }
}

function toggleDebugLog() {
    if (window.app) {
        window.app.toggleDebugLog();
    }
}

function resetStats() {
    if (window.app && window.app.tradingBot) {
        window.app.tradingBot.resetDailyStats();
        window.app.updateStatistics();
        window.app.showNotification('Statistics reset successfully', 'success');
    }
}