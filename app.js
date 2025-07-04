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
            this.yahooAPI = new YahooAPI();
            this.coinGeckoAPI = new CoinGeckoAPI();

            // Initialize Trading Bot
            this.tradingBot = new TradingBot();
            await this.tradingBot.initialize();

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

        } catch (error) {
            this.debugLog(`❌ Failed to initialize application: ${error.message}`, 'error');
        }
    }

    /**
     * Connect to appropriate API based on market type
     */
    async connectToAPI() {
        if (this.marketType === 'crypto') {
            this.debugLog('🔗 Attempting to connect to Kraken API...', 'info');
            const connected = await this.krakenAPI.connect();
            if (connected) {
                this.updateAPIStatus(true);
                this.showNotification('Connected to Kraken API', 'success');
                this.logMessage('✅ Connected to live crypto data', 'info');
                this.debugLog('✅ Successfully connected to Kraken API', 'success');
                this.initializeCryptoPairCards();
            } else {
                this.updateAPIStatus(false);
                this.showNotification('Failed to connect to Kraken API', 'error');
                this.logMessage('❌ Failed to connect to Kraken API', 'error');
                this.debugLog('❌ Kraken API connection failed', 'error');
            }

            // Try CoinGecko as backup
            this.debugLog('🔄 Attempting to connect to CoinGecko API...', 'info');
            const coinGeckoConnected = await this.coinGeckoAPI.connect();
            if (coinGeckoConnected) {
                this.debugLog('✅ Successfully connected to CoinGecko API', 'success');
            } else {
                this.debugLog('❌ CoinGecko API connection failed - Using Kraken data only', 'warning');
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
            // Update crypto prices every 5 seconds
            this.priceUpdateInterval = setInterval(async () => {
                try {
                    const tickerData = await this.krakenAPI.getTickerData();
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
                    this.updateActiveTrades();
                    this.updateStatistics();
                    
                    // Update trading bot with new data
                    if (this.tradingBot && this.tradingBot.isTrading) {
                        await this.tradingBot.checkActiveTrades(tickerData);
                    }
                } catch (error) {
                    this.debugLog(`Price update failed: ${error.message}`, 'error');
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

        container.innerHTML = Object.keys(this.krakenAPI.pairs).map(symbol => {
            const pairName = this.krakenAPI.pairNames[symbol];
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
        Object.keys(this.krakenAPI.pairs).forEach(symbol => {
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
                if (this.krakenAPI) {
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
            const pnlIcon = entry.pnl >= 0 ? '📈' : '📉';
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
                this.debugLog(`🌐 Latency test: ${latency}ms`, 'info');
            } catch (error) {
                latencyEl.textContent = '-- ms';
                this.debugLog(`Latency test failed: ${error.message}`, 'error');
            }
        };

        pingKraken();
        this.latencyInterval = setInterval(pingKraken, 30000); // Test every 30 seconds
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

            this.debugLog('Testing API credentials...', 'info');
            this.debugLog(`API Key length: ${apiKey.length}, Secret length: ${apiSecret.length}`, 'info');
            
            const result = await this.krakenAPI.testCredentials(apiKey, apiSecret);

            if (result.success) {
                this.showNotification('API credentials validated successfully', 'success');
                this.logMessage('✅ API credentials validated', 'success');
                
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
    }
};

window.refreshData = function() {
    if (window.app) {
        window.app.connectToAPI();
        window.app.showNotification('Data refreshed', 'info');
    }
};

window.reloadHistoricalData = function() {
    if (window.app && window.app.tradingBot) {
        window.app.tradingBot.reloadAllHistoricalData();
        window.app.showNotification('Historical data reloaded', 'info');
    }
};

window.setManualStopLoss = function() {
    if (window.app && window.app.tradingBot) {
        // Implementation for manual stop loss
        window.app.showNotification('Manual stop loss feature coming soon', 'info');
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
        window.app.timeRange = range;
        window.app.updateChart();
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
