/**
 * Trading Bot Module
 * Handles trading logic, risk management, and trade execution
 * 
 * Copyright (c) 2025 Trading Bot AI
 * All rights reserved.
 * 
 * This software is proprietary and confidential. Unauthorized copying, 
 * distribution, or use of this software, via any medium, is strictly prohibited.
 * 
 * For licensing inquiries, contact: licensing@tradingbotai.com
 * 
 * SECURITY NOTE: This module stores trading settings in localStorage but NEVER stores API keys.
 * API keys are only stored in browser memory (RAM) and are automatically cleared when the page is closed.
 */

class TradingBot {
    constructor() {
        this.isTrading = false;
        this.tradingMode = 'demo'; // 'demo' or 'live'
        this.marketType = 'crypto'; // 'crypto' or 'stocks'
        this.activeTrades = {};
        this.tradeHistory = [];
        this.chartData = {};
        
        // Trading settings
        this.settings = {
            maxInvestment: 50,
            takeProfit: 30, // 30% enforced
            stopLoss: 10,   // 10% enforced
            tradeFrequency: 'aggressive', // Changed to aggressive for testing
            maxActiveTrades: 10, // Increased for testing
            maxRiskPerTrade: 0.10, // 10% max risk per trade
            maxTotalRisk: 0.30, // 30% max total risk across all trades
            cooldownMinutes: 5 // Reduced to 5 minutes for testing
        };
        
        // Trading statistics
        this.tradingStats = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalPnL: 0,
            todayPnL: 0,
            accountBalance: 1000,
            startDate: new Date()
        };
        
        // Risk management
        this.riskManager = {
            maxDailyLoss: 100,
            maxDrawdown: 20,
            dailyLoss: 0,
            lastTradeTime: null,
            totalRiskExposure: 0, // Track total risk across all trades
            lastTradePerAsset: {} // Track last trade time per asset
        };
        
        // Chart data storage
        this.maxChartPoints = 50;
        this.tradeCounter = 0;
        this.lastTradeMinute = Math.floor(Date.now() / 60000);

        this.signalWeights = {
            trend: 1.0,
            rsi: 1.0,
            macd: 1.0,
            volume: 1.0,
            swing: 1.0,
            support: 1.0,
            adx: 1.0
        };
        this.signalHistory = [];

        // Neural net advisor (TensorFlow.js)
        this.nnModel = null;
        this.nnTrainingData = [];
        this.initNeuralNet();
    }

    /**
     * Debug logging function
     */
    debugLog(message, type = 'info') {
        if (window.app && window.app.debugLog) {
            window.app.debugLog(`[BOT] ${message}`, type);
        } else {
            console.log(`[BOT] ${message}`);
        }
    }

    /**
     * Initialize the trading bot
     */
    async initialize() {
        try {
            this.debugLog('🤖 Initializing Trading Bot...', 'info');
            
            // Load settings from localStorage if available
            this.loadSettings();
            
            // Initialize chart data for all pairs
            this.initializeChartData();
            
            // Fetch 1440 historical candles (24 hours of 1-minute data) for each crypto pair
            if (this.marketType === 'crypto' && window.app && window.app.krakenAPI) {
                const pairs = ['BTCGBP', 'XRPGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
                for (const pair of pairs) {
                    const krakenPair = window.app.krakenAPI.pairs[pair];
                    if (!krakenPair) {
                        this.debugLog(`[INIT] No Kraken pair mapping found for ${pair}`, 'warning');
                        continue;
                    }
                    this.debugLog(`[INIT] Fetching 1440 historical candles for ${pair} (${krakenPair})...`, 'info');
                    try {
                        const ohlc = await window.app.krakenAPI.getOHLCData(krakenPair, 1, null, 1); // 1-minute candles, 1 day
                        if (ohlc && ohlc.length >= 1440) {
                            this.chartData[pair] = ohlc.slice(-1440); // keep last 1440 candles
                            this.debugLog(`[INIT] ✅ ${pair} candles loaded: ${this.chartData[pair].length}`);
                        } else if (ohlc && ohlc.length >= 100) {
                            this.chartData[pair] = ohlc.slice(-100); // fallback to 100 if not enough data
                            this.debugLog(`[INIT] ⚠️ ${pair} limited data: ${this.chartData[pair].length} candles (wanted 1440)`, 'warning');
                        } else {
                            this.debugLog(`[INIT] ⚠️ ${pair} insufficient data: ${ohlc?.length || 0} candles`, 'warning');
                        }
                    } catch (error) {
                        this.debugLog(`[INIT] ❌ Failed to fetch ${pair} data: ${error.message}`, 'error');
                    }
                }
            }
            
            this.debugLog('✅ Trading Bot initialized successfully', 'success');
        } catch (error) {
            this.debugLog(`❌ Failed to initialize trading bot: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('tradingBotSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsed };
                this.debugLog('📥 Settings loaded from localStorage', 'info');
            }
        } catch (error) {
            this.debugLog(`Failed to load settings: ${error.message}`, 'error');
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('tradingBotSettings', JSON.stringify(this.settings));
            this.debugLog('📤 Settings saved to localStorage', 'info');
        } catch (error) {
            this.debugLog(`Failed to save settings: ${error.message}`, 'error');
        }
    }

    /**
     * Initialize chart data storage
     */
    initializeChartData() {
        if (this.marketType === 'crypto') {
            const pairs = ['BTCGBP', 'XRPGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
            pairs.forEach(pair => {
                this.chartData[pair] = [];
            });
        } else {
            const stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC', 'SPY', 'QQQ', 'IWM', 'VTI'];
            stocks.forEach(stock => {
                this.chartData[stock] = [];
            });
        }
        this.debugLog(`📊 Chart data storage initialized for ${this.marketType}`, 'info');
    }

    /**
     * Start trading
     */
    async startTrading() {
        try {
            if (this.isTrading) {
                this.debugLog('⚠️ Trading already active', 'warning');
                return false;
            }

            this.debugLog('🚀 Starting trading bot...', 'info');
            
            // Check if we have API connection
            if (window.app && !window.app.krakenAPI.isConnected) {
                this.debugLog('❌ No API connection available', 'error');
                return false;
            }

            this.isTrading = true;
            this.debugLog('✅ Trading bot started successfully', 'success');
            
            // Log to trading log
            if (window.app) {
                window.app.logMessage('🤖 Trading bot started', 'info');
            }
            
            return true;
        } catch (error) {
            this.debugLog(`❌ Failed to start trading: ${error.message}`, 'error');
            this.isTrading = false;
            return false;
        }
    }

    /**
     * Stop trading
     */
    stopTrading() {
        this.debugLog('⏹️ Stopping trading bot...', 'info');
        this.isTrading = false;
        
        // Close all active trades
        Object.keys(this.activeTrades).forEach(pair => {
            this.closeTrade(pair, 'Manual stop');
        });
        
        this.debugLog('✅ Trading bot stopped', 'success');
        
        // Log to trading log
        if (window.app) {
            window.app.logMessage('⏹️ Trading bot stopped', 'info');
        }
    }

    /**
     * Set trading mode
     */
    setTradingMode(mode) {
        this.tradingMode = mode;
        this.debugLog(`Trading mode set to: ${mode}`, 'info');
    }

    /**
     * Set market type
     */
    setMarketType(type) {
        this.marketType = type;
        this.initializeChartData();
        this.debugLog(`Market type set to: ${type}`, 'info');
    }

    /**
     * Update trading settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        this.debugLog('⚙️ Trading settings updated', 'info');
    }

    /**
     * Update chart data for a pair
     */
    updateChartData(pair, price, timestamp) {
        // Don't reset chartData if it already has historical data
        if (!this.chartData[pair]) {
            this.chartData[pair] = [];
        }
        
        const currentTime = timestamp || Date.now();
        
        // If we have historical data, preserve it and only update the current candle
        if (this.chartData[pair].length > 0) {
            const lastCandle = this.chartData[pair][this.chartData[pair].length - 1];
            const timeDiff = currentTime - lastCandle.time;
            
            // Create new candle every 60 seconds (1 minute) for consistency with historical data
            if (timeDiff > 60000) {
                const newCandle = {
                    time: currentTime,
                    open: lastCandle.close, // Open at previous close
                    high: price,
                    low: price,
                    close: price
                };
                this.chartData[pair].push(newCandle);
                
                // Keep only last 1440 candles (24 hours of 1-minute candles)
                if (this.chartData[pair].length > 1440) {
                    this.chartData[pair] = this.chartData[pair].slice(-1440);
                }
                
                this.debugLog(`[updateChartData] ${pair}: O:${newCandle.open.toFixed(4)} H:${newCandle.high.toFixed(4)} L:${newCandle.low.toFixed(4)} C:${newCandle.close.toFixed(4)}`, 'info');
            } else {
                // Update current candle
                lastCandle.high = Math.max(lastCandle.high, price);
                lastCandle.low = Math.min(lastCandle.low, price);
                lastCandle.close = price;
            }
        } else {
            // Only create first data point if we don't have historical data
            // This prevents overwriting historical data loaded during initialization
            if (this.chartData[pair].length === 0) {
                const dataPoint = {
                    time: currentTime,
                    open: price,
                    high: price,
                    low: price,
                    close: price
                };
                this.chartData[pair].push(dataPoint);
                this.debugLog(`[updateChartData] ${pair}: O:${dataPoint.open.toFixed(4)} H:${dataPoint.high.toFixed(4)} L:${dataPoint.low.toFixed(4)} C:${dataPoint.close.toFixed(4)}`, 'info');
            }
        }
    }

    /**
     * Get chart data for a pair
     */
    getChartData(pair, type = 'line') {
        if (!this.chartData[pair]) {
            this.debugLog(`[getChartData] No data for ${pair}`, 'warning');
            return [];
        }
        if (type === 'line') {
            const lineData = this.chartData[pair].map(point => ({
                time: point.time,
                price: point.close
            }));
            this.debugLog(`[getChartData] Returning line data for ${pair}: ${JSON.stringify(lineData[0])}`, 'info');
            return lineData;
        } else {
            const candleData = this.chartData[pair].map(point => ({
                time: point.time,
                open: point.open,
                high: point.high,
                low: point.low,
                close: point.close
            }));
            this.debugLog(`[getChartData] Returning candlestick data for ${pair}: ${JSON.stringify(candleData[0])}`, 'info');
            return candleData;
        }
    }

    /**
     * Check active trades for take profit/stop loss and perform high-frequency scalping
     */
    async checkActiveTrades(tickerData) {
        // Close trades using AI levels
        for (const pair of Object.keys(this.activeTrades)) {
            const trades = this.activeTrades[pair];
            if (!Array.isArray(trades)) continue;
            
            for (let idx = trades.length - 1; idx >= 0; idx--) {
                const trade = trades[idx];
                const currentPrice = tickerData[pair]?.price;
                if (!currentPrice) continue;
                
                // Use AI levels if available, otherwise fall back to manual settings
                const stopLoss = trade.aiStopLoss || trade.stopLoss;
                const takeProfit = trade.aiTakeProfit || trade.takeProfit;
                
                // Check for take profit
                if (trade.side === 'BUY' && currentPrice >= takeProfit) {
                    await this.closeTrade(pair, 'AI Take Profit', idx);
                    continue;
                } else if (trade.side === 'SELL' && currentPrice <= takeProfit) {
                    await this.closeTrade(pair, 'AI Take Profit', idx);
                    continue;
                }
                
                // Check for stop loss
                if (trade.side === 'BUY' && currentPrice <= stopLoss) {
                    await this.closeTrade(pair, 'AI Stop Loss', idx);
                    continue;
                } else if (trade.side === 'SELL' && currentPrice >= stopLoss) {
                    await this.closeTrade(pair, 'AI Stop Loss', idx);
                    continue;
                }
                
                // Update unrealized P&L
                trade.unrealizedPnL = this.calculatePnL(trade, currentPrice);
            }
        }
        
        // Swing trading: intelligent decisions based on longer-term trends
        if (this.isTrading) {
            this.swingTrade(tickerData);
        }
    }

    /**
     * Swing Trading Strategy - Hold positions for hours to days
     */
    async swingTrade(tickerData) {
        // Debug log: show number of candles for each pair before trading decisions
        Object.keys(this.chartData).forEach(pair => {
            this.debugLog(`[SWING] ${pair} candles available: ${this.chartData[pair]?.length}`);
        });
        
        // Swing trading: Check for new opportunities every 5 minutes (more aggressive for testing)
        const nowMinute = Math.floor(Date.now() / 300000); // 5 minutes
        if (nowMinute !== this.lastTradeMinute) {
            this.tradeCounter = 0;
            this.lastTradeMinute = nowMinute;
        }
        
        // Get total active trades count
        const totalActiveTrades = Object.values(this.activeTrades).reduce((sum, trades) => sum + (Array.isArray(trades) ? trades.length : 0), 0);
        
        // Don't trade if we have too many active trades
        if (totalActiveTrades >= this.settings.maxActiveTrades) {
            this.debugLog(`[SWING] Skipping trade analysis - max active trades reached (${totalActiveTrades}/${this.settings.maxActiveTrades})`, 'warning');
            return;
        }
        
        // --- Batch all getSwingDecision calls in parallel ---
        const pairs = Object.keys(tickerData);
        const decisionPromises = pairs.map(pair => {
            const data = tickerData[pair];
            if (!data || !data.price || data.price <= 0) return null;
            return this.getSwingDecision(pair, data).then(decision => ({ pair, data, decision }));
        });
        const results = (await Promise.all(decisionPromises)).filter(Boolean);
        
        // Debug log for every pair
        for (const r of results) {
            this.debugLog(`[AI] ${r.pair}: side=${r.decision.side} shouldTrade=${r.decision.shouldTrade} conf=${(r.decision.confidence*100).toFixed(1)}% reason=${r.decision.reason}`,'info');
        }
        
        // Sort opportunities by confidence and risk/reward ratio
        const opportunities = results
            .filter(r => r.decision.shouldTrade && this.canTrade(r.pair))
            .sort((a, b) => {
                // Prioritize by confidence first, then by risk/reward ratio
                if (Math.abs(a.decision.confidence - b.decision.confidence) > 0.1) {
                    return b.decision.confidence - a.decision.confidence;
                }
                return (b.decision.riskRewardRatio || 0) - (a.decision.riskRewardRatio || 0);
            });
        
        // Only trade the best opportunity (if any) and respect trade limits
        if (opportunities.length > 0 && this.tradeCounter < 3) { // Increased from 1 to 3 for testing
            const best = opportunities[0];
            
            // Additional safety check: ensure we're not over-risking
            if (this.calculateTradeRisk(best.pair, best.data.price, best.decision.stopLoss) <= this.settings.maxRiskPerTrade) {
                if (this.executeTrade(best.pair, best.decision.side, best.data.price, `AI Swing: ${best.decision.reason}`, best.decision.stopLoss, best.decision.takeProfit, best.decision.confidence)) {
                    this.tradeCounter++;
                    this.debugLog(`🤖 AI Trade: ${best.decision.side} ${best.pair} | Confidence: ${(best.decision.confidence*100).toFixed(1)}% | R/R: ${best.decision.riskRewardRatio}:1 | SL: £${best.decision.stopLoss} | TP: £${best.decision.takeProfit}`, 'success');
                    
                    // --- For learning: log signals used ---
                    if (!this.signalHistory) this.signalHistory = [];
                    this.signalHistory.push({
                        pair: best.pair,
                        time: Date.now(),
                        signals: best.decision,
                        result: null // will be filled on closeTrade
                    });
                }
            } else {
                this.debugLog(`[SWING] Skipping ${best.pair} - risk too high for current position`, 'warning');
            }
        } else if (opportunities.length === 0) {
            this.debugLog(`[SWING] No suitable trading opportunities found`, 'info');
        }
    }

    /**
     * AI Swing Trading Decision Making - Complete strategy with dynamic SL/TP
     */
    async getSwingDecision(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        
        // Check if we have enough data, but be more lenient for testing
        if (!chartData || chartData.length < 20) { // Reduced from 50 to 20
            this.debugLog(`[AI] ${pair}: Insufficient data (${chartData?.length || 0} candles), using simplified analysis`, 'warning');
            return this.getSimplifiedDecision(pair, data);
        }
        
        // Calculate swing trading indicators
        const indicators = this.calculateSwingIndicators(chartData);
        
        // AI decision logic with confidence scoring
        let buySignals = 0;
        let sellSignals = 0;
        let reasons = [];
        let confidence = 0;
        const w = this.signalWeights || {trend:1,rsi:1,macd:1,volume:1,swing:1,support:1,adx:1};
        
        // 1. Trend Analysis (50-period SMA) - use shorter period if needed
        const smaPeriod = Math.min(50, Math.floor(chartData.length / 2));
        const sma = chartData.slice(-smaPeriod).reduce((sum, d) => sum + d.close, 0) / smaPeriod;
        
        if (data.price > sma) {
            buySignals += 3 * w.trend;
            confidence += 20 * w.trend;
            reasons.push(`Above ${smaPeriod} SMA (bullish trend)`);
        } else {
            sellSignals += 3 * w.trend;
            confidence += 20 * w.trend;
            reasons.push(`Below ${smaPeriod} SMA (bearish trend)`);
        }
        
        // 2. RSI
        if (indicators.rsi < 25) {
            buySignals += 4 * w.rsi;
            confidence += 25 * w.rsi;
            reasons.push('RSI deeply oversold');
        } else if (indicators.rsi > 75) {
            sellSignals += 4 * w.rsi;
            confidence += 25 * w.rsi;
            reasons.push('RSI strongly overbought');
        } else if (indicators.rsi < 35) {
            buySignals += 2 * w.rsi;
            confidence += 15 * w.rsi;
            reasons.push('RSI oversold');
        } else if (indicators.rsi > 65) {
            sellSignals += 2 * w.rsi;
            confidence += 15 * w.rsi;
            reasons.push('RSI overbought');
        }
        
        // 3. MACD
        if (indicators.macd > indicators.macdSignal && indicators.macd > 0) {
            buySignals += 3 * w.macd;
            confidence += 20 * w.macd;
            reasons.push('MACD bullish trend');
        } else if (indicators.macd < indicators.macdSignal && indicators.macd < 0) {
            sellSignals += 3 * w.macd;
            confidence += 20 * w.macd;
            reasons.push('MACD bearish trend');
        }
        
        // 4. Volume
        if (indicators.volumeRatio > 2.0) {
            buySignals += 2 * w.volume;
            confidence += 15 * w.volume;
            reasons.push('High volume breakout');
        } else if (indicators.volumeRatio > 1.5) {
            buySignals += 1 * w.volume;
            confidence += 10 * w.volume;
            reasons.push('Above average volume');
        }
        
        // 5. Price Action (Swing Highs/Lows)
        if (indicators.isSwingLow) {
            buySignals += 3 * w.swing;
            confidence += 20 * w.swing;
            reasons.push('Swing low formation');
        } else if (indicators.isSwingHigh) {
            sellSignals += 3 * w.swing;
            confidence += 20 * w.swing;
            reasons.push('Swing high formation');
        }
        
        // 6. Support/Resistance
        if (data.price < indicators.majorSupport * 1.02) {
            buySignals += 3 * w.support;
            confidence += 25 * w.support;
            reasons.push('Near major support');
        } else if (data.price > indicators.majorResistance * 0.98) {
            sellSignals += 3 * w.support;
            confidence += 25 * w.support;
            reasons.push('Near major resistance');
        }
        
        // 7. ADX
        if (indicators.adx > 25) {
            if (buySignals > sellSignals) {
                buySignals += 2 * w.adx;
                confidence += 15 * w.adx;
                reasons.push('Strong uptrend');
            } else if (sellSignals > buySignals) {
                sellSignals += 2 * w.adx;
                confidence += 15 * w.adx;
                reasons.push('Strong downtrend');
            }
        }
        
        // --- Neural net advisor ---
        const features = this.extractFeatures(indicators, data);
        let nnResult = {action: 'hold', confidence: 0};
        if (this.nnModel) {
            nnResult = await this.neuralNetDecision(features);
        }
        
        // Combine: if neural net is very confident, override rule-based; else, use rule-based
        let finalSide = null;
        if (nnResult.confidence > 0.85 && nnResult.action !== 'HOLD') {
            finalSide = nnResult.action;
            reasons.unshift('NeuralNet override');
        } else {
            finalSide = buySignals > sellSignals ? 'BUY' : sellSignals > buySignals ? 'SELL' : null;
        }
        
        // Calculate AI-recommended stop loss and take profit
        const aiLevels = this.calculateAITradeLevels(pair, data, indicators, finalSide);
        
        // Additional swing trading filters
        let shouldTrade = finalSide !== null && aiLevels !== null;
        let finalConfidence = Math.max(confidence/100, nnResult.confidence);
        
        // Minimum confidence threshold for swing trading - reduced for testing
        if (finalConfidence < 0.3) { // Reduced from 0.4 to 0.3 for testing
            shouldTrade = false;
            reasons.push('Insufficient confidence for swing trade');
        }
        
        // Minimum risk/reward ratio for swing trading - reduced for testing
        if (aiLevels && aiLevels.riskRewardRatio < 1.1) { // Reduced from 1.2 to 1.1 for testing
            shouldTrade = false;
            reasons.push('Risk/reward ratio too low for swing trade');
        }
        
        // Check if we're in a strong trend (prefer trend-following for swing trading)
        const trendStrength = Math.abs(indicators.adx);
        if (trendStrength < 15) { // Reduced from 20 to 15
            finalConfidence *= 0.8; // Reduce confidence in low trend strength
            reasons.push('Weak trend strength');
        }
        
        // Market volatility check (avoid extremely volatile or stagnant markets)
        const atr = this.calculateATR(chartData, 14);
        const volatilityRatio = atr / data.price;
        if (volatilityRatio > 0.05) { // More than 5% volatility
            finalConfidence *= 0.9; // Reduce confidence in high volatility
            reasons.push('High volatility');
        } else if (volatilityRatio < 0.01) { // Less than 1% volatility
            finalConfidence *= 0.7; // Reduce confidence in low volatility
            reasons.push('Low volatility');
        }
        
        return {
            shouldTrade: shouldTrade,
            side: finalSide,
            reason: reasons.slice(0, 3).join(', '),
            confidence: finalConfidence,
            stopLoss: aiLevels?.stopLoss || null,
            takeProfit: aiLevels?.takeProfit || null,
            riskRewardRatio: aiLevels?.riskRewardRatio || null,
            signalsUsed: {trend: w.trend, rsi: w.rsi, macd: w.macd, volume: w.volume, swing: w.swing, support: w.support, adx: w.adx},
            nnConfidence: nnResult.confidence,
            trendStrength: trendStrength,
            volatilityRatio: volatilityRatio
        };
    }

    /**
     * Simplified decision making for when we have limited data
     */
    getSimplifiedDecision(pair, data) {
        // Use basic price action and momentum for limited data
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < 5) {
            return { shouldTrade: false, side: null, reason: 'Insufficient data for any analysis' };
        }
        
        const prices = chartData.map(d => d.close);
        const currentPrice = data.price;
        const prevPrice = prices[prices.length - 2] || currentPrice;
        const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100;
        
        let side = null;
        let confidence = 0.3; // Base confidence for simplified analysis
        let reasons = [];
        
        // Simple momentum-based decision
        if (priceChange > 1.0) { // 1% price increase
            side = 'BUY';
            confidence += 0.2;
            reasons.push('Positive momentum');
        } else if (priceChange < -1.0) { // 1% price decrease
            side = 'SELL';
            confidence += 0.2;
            reasons.push('Negative momentum');
        } else if (priceChange > 0.5) {
            side = 'BUY';
            confidence += 0.1;
            reasons.push('Slight positive momentum');
        } else if (priceChange < -0.5) {
            side = 'SELL';
            confidence += 0.1;
            reasons.push('Slight negative momentum');
        }
        
        // Calculate simple stop loss and take profit
        let stopLoss, takeProfit;
        if (side === 'BUY') {
            stopLoss = currentPrice * 0.95; // 5% stop loss
            takeProfit = currentPrice * 1.15; // 15% take profit
        } else if (side === 'SELL') {
            stopLoss = currentPrice * 1.05; // 5% stop loss
            takeProfit = currentPrice * 0.85; // 15% take profit
        }
        
        const shouldTrade = side !== null && confidence >= 0.3;
        
        return {
            shouldTrade: shouldTrade,
            side: side,
            reason: reasons.join(', ') || 'Simplified analysis',
            confidence: confidence,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            riskRewardRatio: 3.0, // 3:1 risk/reward ratio
            signalsUsed: {momentum: 1.0},
            nnConfidence: 0,
            trendStrength: Math.abs(priceChange),
            volatilityRatio: 0.02
        };
    }

    /**
     * Calculate swing trading indicators
     */
    calculateSwingIndicators(chartData) {
        const prices = chartData.map(d => d.close);
        const volumes = chartData.map(d => d.volume || 1000);
        const highs = chartData.map(d => d.high);
        const lows = chartData.map(d => d.low);
        
        // 50-period Simple Moving Average (longer timeframe for swing trading)
        const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
        
        // RSI (14 period) - less sensitive for swing trading
        const rsi = this.calculateRSI(prices, 14);
        
        // MACD with longer periods
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12 - ema26;
        const macdSignal = this.calculateEMA(prices.map((_, i) => i < 26 ? 0 : macd), 9);
        
        // Volume ratio (higher threshold for swing trading)
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.slice(-50).reduce((a, b) => a + b, 0) / 50;
        const volumeRatio = currentVolume / avgVolume;
        
        // Swing High/Low Detection
        const isSwingHigh = this.isSwingHigh(prices, 5);
        const isSwingLow = this.isSwingLow(prices, 5);
        
        // Major Support and Resistance (longer timeframe)
        const majorSupport = Math.min(...prices.slice(-50));
        const majorResistance = Math.max(...prices.slice(-50));
        
        // ADX (Average Directional Index) for trend strength
        const adx = this.calculateADX(chartData, 14);
        
        return {
            sma50,
            rsi,
            macd,
            macdSignal,
            volumeRatio,
            isSwingHigh,
            isSwingLow,
            majorSupport,
            majorResistance,
            adx
        };
    }

    /**
     * Calculate RSI
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const change = prices[prices.length - i] - prices[prices.length - i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate EMA
     */
    calculateEMA(prices, period) {
        if (prices.length < period) return prices[prices.length - 1];
        
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    /**
     * Calculate ATR
     */
    calculateATR(chartData, period = 14) {
        if (chartData.length < period + 1) return 0;
        
        const trueRanges = [];
        for (let i = 1; i < chartData.length; i++) {
            const high = chartData[i].high;
            const low = chartData[i].low;
            const prevClose = chartData[i - 1].close;
            
            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);
            
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    /**
     * Detect swing high
     */
    isSwingHigh(prices, lookback = 5) {
        if (prices.length < lookback * 2 + 1) return false;
        
        const currentPrice = prices[prices.length - 1];
        const leftPrices = prices.slice(-lookback * 2 - 1, -1);
        const rightPrices = prices.slice(-lookback);
        
        // Check if current price is higher than surrounding prices
        const leftMax = Math.max(...leftPrices);
        const rightMax = Math.max(...rightPrices);
        
        return currentPrice > leftMax && currentPrice > rightMax;
    }

    /**
     * Detect swing low
     */
    isSwingLow(prices, lookback = 5) {
        if (prices.length < lookback * 2 + 1) return false;
        
        const currentPrice = prices[prices.length - 1];
        const leftPrices = prices.slice(-lookback * 2 - 1, -1);
        const rightPrices = prices.slice(-lookback);
        
        // Check if current price is lower than surrounding prices
        const leftMin = Math.min(...leftPrices);
        const rightMin = Math.min(...rightPrices);
        
        return currentPrice < leftMin && currentPrice < rightMin;
    }

    /**
     * Calculate ADX (Average Directional Index)
     */
    calculateADX(chartData, period = 14) {
        if (chartData.length < period + 1) return 0;
        
        const plusDM = [];
        const minusDM = [];
        const trueRanges = [];
        
        for (let i = 1; i < chartData.length; i++) {
            const high = chartData[i].high;
            const low = chartData[i].low;
            const prevHigh = chartData[i - 1].high;
            const prevLow = chartData[i - 1].low;
            
            // True Range
            const tr = Math.max(high - low, Math.abs(high - prevHigh), Math.abs(low - prevLow));
            trueRanges.push(tr);
            
            // Directional Movement
            const upMove = high - prevHigh;
            const downMove = prevLow - low;
            
            if (upMove > downMove && upMove > 0) {
                plusDM.push(upMove);
                minusDM.push(0);
            } else if (downMove > upMove && downMove > 0) {
                plusDM.push(0);
                minusDM.push(downMove);
            } else {
                plusDM.push(0);
                minusDM.push(0);
            }
        }
        
        // Calculate smoothed values
        const smoothedTR = this.smoothValues(trueRanges, period);
        const smoothedPlusDM = this.smoothValues(plusDM, period);
        const smoothedMinusDM = this.smoothValues(minusDM, period);
        
        // Calculate DI values
        const plusDI = (smoothedPlusDM / smoothedTR) * 100;
        const minusDI = (smoothedMinusDM / smoothedTR) * 100;
        
        // Calculate DX and ADX
        const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
        const adx = this.smoothValues([dx], period);
        
        return adx;
    }

    /**
     * Smooth values using Wilder's smoothing
     */
    smoothValues(values, period) {
        if (values.length === 0) return 0;
        if (values.length === 1) return values[0];
        
        let smoothed = values[0];
        for (let i = 1; i < values.length; i++) {
            smoothed = smoothed - (smoothed / period) + values[i];
        }
        
        return smoothed;
    }

    /**
     * Calculate AI-recommended stop loss and take profit levels
     */
    calculateAITradeLevels(pair, data, indicators, side) {
        const currentPrice = data.price;
        if (!currentPrice || currentPrice <= 0) {
            this.debugLog(`[AI] Invalid current price for ${pair}: ${currentPrice}`, 'warning');
            return null;
        }

        let stopLoss, takeProfit, riskRewardRatio;

        if (side === 'BUY') {
            // For BUY trades
            // Stop Loss: Below recent swing low or support level
            const swingLow = this.findRecentSwingLow(pair, 20) || currentPrice * 0.95;
            const supportLevel = indicators.majorSupport || currentPrice * 0.95;
            stopLoss = Math.min(swingLow, supportLevel) * 0.995; // 0.5% below support

            // Take Profit: Based on resistance levels and volatility
            const swingHigh = this.findRecentSwingHigh(pair, 20) || currentPrice * 1.05;
            const resistanceLevel = indicators.majorResistance || currentPrice * 1.05;
            const atr = this.calculateATR(this.getChartData(pair, 'candlestick'), 14) || currentPrice * 0.01;
            
            // Multiple take profit targets
            const tp1 = Math.max(swingHigh, resistanceLevel) * 1.005; // 0.5% above resistance
            const tp2 = currentPrice + (atr * 2); // 2x ATR
            const tp3 = currentPrice + (currentPrice - stopLoss) * 2; // 2:1 risk/reward
            
            takeProfit = Math.max(tp1, tp2, tp3);

        } else if (side === 'SELL') {
            // For SELL trades
            // Stop Loss: Above recent swing high or resistance level
            const swingHigh = this.findRecentSwingHigh(pair, 20) || currentPrice * 1.05;
            const resistanceLevel = indicators.majorResistance || currentPrice * 1.05;
            stopLoss = Math.max(swingHigh, resistanceLevel) * 1.005; // 0.5% above resistance

            // Take Profit: Based on support levels and volatility
            const swingLow = this.findRecentSwingLow(pair, 20) || currentPrice * 0.95;
            const supportLevel = indicators.majorSupport || currentPrice * 0.95;
            const atr = this.calculateATR(this.getChartData(pair, 'candlestick'), 14) || currentPrice * 0.01;
            
            // Multiple take profit targets
            const tp1 = Math.min(swingLow, supportLevel) * 0.995; // 0.5% below support
            const tp2 = currentPrice - (atr * 2); // 2x ATR
            const tp3 = currentPrice - (stopLoss - currentPrice) * 2; // 2:1 risk/reward
            
            takeProfit = Math.min(tp1, tp2, tp3);
        } else {
            this.debugLog(`[AI] Invalid side for ${pair}: ${side}`, 'warning');
            return null;
        }

        // Validate calculated values
        if (!stopLoss || !takeProfit || stopLoss <= 0 || takeProfit <= 0) {
            this.debugLog(`[AI] Invalid calculated levels for ${pair}: SL=${stopLoss}, TP=${takeProfit}`, 'warning');
            return null;
        }

        // Calculate risk/reward ratio
        const risk = Math.abs(currentPrice - stopLoss);
        const reward = Math.abs(takeProfit - currentPrice);
        riskRewardRatio = reward / risk;

        // Ensure minimum risk/reward ratio of 1.5:1
        if (riskRewardRatio < 1.5) {
            if (side === 'BUY') {
                takeProfit = currentPrice + (risk * 1.5);
            } else {
                takeProfit = currentPrice - (risk * 1.5);
            }
            riskRewardRatio = 1.5;
        }

        return {
            stopLoss: parseFloat(stopLoss.toFixed(4)),
            takeProfit: parseFloat(takeProfit.toFixed(4)),
            riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2))
        };
    }

    /**
     * Find recent swing low
     */
    findRecentSwingLow(pair, lookback = 20) {
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < lookback) return null;
        
        const recentData = chartData.slice(-lookback);
        const lows = recentData.map(d => d.low).filter(low => low && low > 0);
        return lows.length > 0 ? Math.min(...lows) : null;
    }

    /**
     * Find recent swing high
     */
    findRecentSwingHigh(pair, lookback = 20) {
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < lookback) return null;
        
        const recentData = chartData.slice(-lookback);
        const highs = recentData.map(d => d.high).filter(high => high && high > 0);
        return highs.length > 0 ? Math.max(...highs) : null;
    }

    /**
     * Execute a trade
     */
    async executeTrade(pair, side, price, reason = 'Signal', aiStopLoss = null, aiTakeProfit = null, aiConfidence = 1) {
        try {
            if (!this.canTrade(pair)) {
                this.debugLog(`[executeTrade] Not executing trade for ${pair} - canTrade returned false`, 'warning');
                return false;
            }
            
            // Calculate position size based on risk management
            const accountBalance = this.tradingStats.accountBalance;
            const maxRiskAmount = accountBalance * this.settings.maxRiskPerTrade; // 10% of account
            
            // Calculate position size based on stop loss distance
            let positionSize = 0;
            if (aiStopLoss && aiStopLoss > 0) {
                const riskPerUnit = Math.abs(price - aiStopLoss);
                if (riskPerUnit > 0) {
                    positionSize = maxRiskAmount / riskPerUnit;
                }
            }
            
            // Fallback to fixed investment if no stop loss
            if (positionSize <= 0) {
                positionSize = this.getDynamicInvestment(pair, aiConfidence) / price;
            }
            
            // Ensure position size doesn't exceed max investment
            const maxQuantity = this.settings.maxInvestment / price;
            positionSize = Math.min(positionSize, maxQuantity);
            
            // Calculate actual investment amount
            const investment = positionSize * price;
            
            // Final safety check: ensure we're not over-risking
            const tradeRisk = this.calculateTradeRisk(pair, price, aiStopLoss || (price * 0.9));
            if (tradeRisk > this.settings.maxRiskPerTrade * 100) {
                this.debugLog(`[executeTrade] Blocked: trade risk too high (${tradeRisk.toFixed(1)}%)`, 'warning');
                return false;
            }

            // LIVE TRADING: Execute actual order if in live mode
            let orderResult = null;
            if (this.tradingMode === 'live' && window.app && window.app.apiKey && window.app.apiSecret) {
                try {
                    this.debugLog(`🚀 Executing LIVE ${side} order for ${pair}...`, 'trade');
                    
                    // Get the correct Kraken pair code
                    const krakenPair = window.app.krakenAPI.pairs[pair];
                    if (!krakenPair) {
                        throw new Error(`Unknown pair: ${pair}`);
                    }
                    
                    if (side === 'BUY') {
                        orderResult = await window.app.krakenAPI.placeBuyOrder(
                            window.app.apiKey, 
                            window.app.apiSecret, 
                            krakenPair, 
                            positionSize, 
                            null // Market order
                        );
                    } else if (side === 'SELL') {
                        orderResult = await window.app.krakenAPI.placeSellOrder(
                            window.app.apiKey, 
                            window.app.apiSecret, 
                            krakenPair, 
                            positionSize, 
                            null // Market order
                        );
                    }
                    
                    if (orderResult && orderResult.txid) {
                        this.debugLog(`✅ LIVE order executed successfully: ${orderResult.txid[0]}`, 'success');
                    } else {
                        throw new Error('Order execution failed - no transaction ID returned');
                    }
                } catch (error) {
                    this.debugLog(`❌ LIVE order failed: ${error.message}`, 'error');
                    return false;
                }
            }
            
            const trade = {
                id: orderResult?.txid?.[0] || Date.now().toString(),
                pair: pair,
                side: side,
                entryPrice: price,
                quantity: positionSize,
                investment: investment,
                timestamp: Date.now(),
                reason: reason,
                mode: this.tradingMode,
                aiStopLoss: aiStopLoss,
                aiTakeProfit: aiTakeProfit,
                unrealizedPnL: 0,
                riskPercentage: tradeRisk,
                orderResult: orderResult
            };

            // Initialize array if not exists
            if (!this.activeTrades[pair]) {
                this.activeTrades[pair] = [];
            }

            this.activeTrades[pair].push(trade);
            this.tradingStats.totalTrades++;
            this.riskManager.lastTradeTime = Date.now();
            this.riskManager.lastTradePerAsset[pair] = Date.now();
            
            // Update total risk exposure
            this.riskManager.totalRiskExposure += (investment / accountBalance) * (tradeRisk / 100);

            const modeIcon = this.tradingMode === 'live' ? '💰' : '📊';
            this.debugLog(`${modeIcon} ${side} ${pair}: £${investment.toFixed(2)} at £${price.toFixed(4)} | Qty: ${positionSize.toFixed(6)} | Risk: ${tradeRisk.toFixed(1)}% | Reason: ${reason}`, 'success');
            
            if (window.app) {
                window.app.addLogEntry({
                    type: 'trade',
                    pair: pair,
                    side: side,
                    price: price,
                    investment: investment,
                    risk: tradeRisk,
                    mode: this.tradingMode,
                    timestamp: new Date(),
                    aiStopLoss: aiStopLoss,
                    aiTakeProfit: aiTakeProfit,
                    orderId: orderResult?.txid?.[0]
                });
                // Update UI immediately after trade execution
                window.app.updateStatistics();
            }
            return true;
        } catch (error) {
            this.debugLog(`Failed to execute trade: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Close a specific trade by index, only with valid price
     */
    async closeTrade(pair, reason, idx) {
        const trades = this.activeTrades[pair];
        if (!Array.isArray(trades) || trades.length === 0) return;
        const trade = trades[idx];
        if (!trade) return;
        const currentPrice = this.getCurrentPrice(pair);
        if (!currentPrice || currentPrice <= 0) return;
        const pnl = this.calculatePnL(trade, currentPrice);
        
        // LIVE TRADING: Execute actual sell order if in live mode
        let closeOrderResult = null;
        if (this.tradingMode === 'live' && window.app && window.app.apiKey && window.app.apiSecret && trade.orderResult?.txid) {
            try {
                this.debugLog(`🚀 Executing LIVE close order for ${pair}...`, 'trade');
                
                // Get the correct Kraken pair code
                const krakenPair = window.app.krakenAPI.pairs[pair];
                if (!krakenPair) {
                    throw new Error(`Unknown pair: ${pair}`);
                }
                
                // For closing a BUY trade, we need to SELL
                // For closing a SELL trade, we need to BUY
                const closeSide = trade.side === 'BUY' ? 'SELL' : 'BUY';
                
                if (closeSide === 'SELL') {
                    closeOrderResult = await window.app.krakenAPI.placeSellOrder(
                        window.app.apiKey, 
                        window.app.apiSecret, 
                        krakenPair, 
                        trade.quantity, 
                        null // Market order
                    );
                } else {
                    closeOrderResult = await window.app.krakenAPI.placeBuyOrder(
                        window.app.apiKey, 
                        window.app.apiSecret, 
                        krakenPair, 
                        trade.quantity, 
                        null // Market order
                    );
                }
                
                if (closeOrderResult && closeOrderResult.txid) {
                    this.debugLog(`✅ LIVE close order executed successfully: ${closeOrderResult.txid[0]}`, 'success');
                } else {
                    throw new Error('Close order execution failed - no transaction ID returned');
                }
            } catch (error) {
                this.debugLog(`❌ LIVE close order failed: ${error.message}`, 'error');
                // Continue with paper trading close for now
            }
        }
        
        // Update statistics
        this.tradingStats.totalPnL += pnl;
        this.tradingStats.todayPnL += pnl;
        if (this.tradingMode === 'demo' || this.tradingMode === 'paper') {
            this.tradingStats.accountBalance += pnl;
        }
        if (pnl > 0) {
            this.tradingStats.winningTrades++;
        } else {
            this.tradingStats.losingTrades++;
        }
        
        // Update risk exposure (remove this trade's risk from total)
        if (trade.investment && trade.riskPercentage) {
            const accountBalance = this.tradingStats.accountBalance;
            const riskContribution = (trade.investment / accountBalance) * (trade.riskPercentage / 100);
            this.riskManager.totalRiskExposure = Math.max(0, this.riskManager.totalRiskExposure - riskContribution);
        }
        
        const closedTrade = {
            ...trade,
            exitPrice: currentPrice,
            exitTime: Date.now(),
            pnl: pnl,
            reason: reason,
            closeOrderResult: closeOrderResult
        };
        this.tradeHistory.push(closedTrade);
        trades.splice(idx, 1);
        
        const modeIcon = this.tradingMode === 'live' ? '💰' : '📊';
        this.debugLog(`${modeIcon} Closed ${pair}: ${pnl >= 0 ? '+' : ''}£${pnl.toFixed(2)} (${reason}) | Total Risk: ${(this.riskManager.totalRiskExposure*100).toFixed(1)}%`, pnl >= 0 ? 'success' : 'error');
        
        if (window.app) {
            window.app.addLogEntry({
                type: 'closure',
                pair: pair,
                price: currentPrice,
                pnl: pnl,
                reason: reason,
                mode: this.tradingMode,
                timestamp: new Date(),
                closeOrderId: closeOrderResult?.txid?.[0]
            });
            // Update UI immediately after trade closure
            window.app.updateStatistics();
        }
        
        // --- Learning: update signal weights based on trade result ---
        if (this.signalHistory && this.signalHistory.length > 0) {
            const last = this.signalHistory[this.signalHistory.length - 1];
            if (last && last.pair === pair && last.result === null) {
                last.result = pnl;
                // Simple learning: increase weights for signals if trade was profitable, decrease if not
                const lr = 0.05; // learning rate
                const used = last.signals.signalsUsed || {};
                Object.keys(used).forEach(sig => {
                    if (!this.signalWeights[sig]) this.signalWeights[sig] = 1.0;
                    if (pnl > 0) {
                        this.signalWeights[sig] += lr * used[sig];
                    } else {
                        this.signalWeights[sig] -= lr * used[sig];
                        if (this.signalWeights[sig] < 0.1) this.signalWeights[sig] = 0.1;
                    }
                });
                // --- Neural net online training ---
                if (this.nnModel && last.signals && last.signals.nnConfidence !== undefined) {
                    const features = this.extractFeaturesFromHistory(last);
                    const actionIdx = last.signals.side === 'BUY' ? 0 : last.signals.side === 'SELL' ? 1 : 2;
                    const reward = Math.max(-1, Math.min(1, pnl / 100)); // normalize
                    this.trainNeuralNet(features, actionIdx, reward);
                }
            }
        }
    }

    /**
     * Calculate the risk percentage for a potential trade
     */
    calculateTradeRisk(pair, entryPrice, stopLoss) {
        if (!entryPrice || !stopLoss || entryPrice <= 0 || stopLoss <= 0) {
            return 0;
        }
        
        const riskPerUnit = Math.abs(entryPrice - stopLoss);
        const riskPercentage = (riskPerUnit / entryPrice) * 100;
        
        return riskPercentage;
    }

    /**
     * Check if we can execute a trade with improved risk management
     */
    canTrade(pair) {
        // Check if we already have active trades for this pair (prevent duplicates)
        if (this.activeTrades[pair] && this.activeTrades[pair].length >= 1) {
            this.debugLog(`[canTrade] Blocked: already have active trade for ${pair}`, 'warning');
            return false;
        }
        
        // Check cooldown period for this asset
        const lastTradeTime = this.riskManager.lastTradePerAsset[pair];
        const cooldownMs = this.settings.cooldownMinutes * 60 * 1000;
        if (lastTradeTime && (Date.now() - lastTradeTime) < cooldownMs) {
            const remainingMinutes = Math.ceil((cooldownMs - (Date.now() - lastTradeTime)) / (60 * 1000));
            this.debugLog(`[canTrade] Blocked: ${pair} in cooldown (${remainingMinutes}min remaining)`, 'warning');
            return false;
        }
        
        // Check total active trades limit
        const totalActiveTrades = Object.values(this.activeTrades).reduce((sum, trades) => sum + (Array.isArray(trades) ? trades.length : 0), 0);
        if (totalActiveTrades >= this.settings.maxActiveTrades) {
            this.debugLog(`[canTrade] Blocked: max active trades reached (${totalActiveTrades}/${this.settings.maxActiveTrades})`, 'warning');
            return false;
        }
        
        // Check daily loss limit
        if (this.riskManager.dailyLoss <= -this.riskManager.maxDailyLoss) {
            this.debugLog('[canTrade] Blocked: daily loss limit reached', 'warning');
            return false;
        }
        
        // Check total risk exposure
        if (this.riskManager.totalRiskExposure >= this.settings.maxTotalRisk) {
            this.debugLog(`[canTrade] Blocked: max total risk reached (${(this.riskManager.totalRiskExposure*100).toFixed(1)}%)`, 'warning');
            return false;
        }
        
        this.debugLog(`[canTrade] Allowed: can trade ${pair}`, 'info');
        return true;
    }

    /**
     * Get trade interval based on frequency setting (Swing Trading)
     */
    getTradeInterval() {
        switch (this.settings.tradeFrequency) {
            case 'conservative': return 3600000; // 1 hour
            case 'moderate': return 1800000;     // 30 minutes
            case 'aggressive': return 900000;    // 15 minutes
            default: return 1800000;
        }
    }

    /**
     * Calculate P&L for a trade
     */
    calculatePnL(trade, currentPrice) {
        if (trade.side === 'BUY') {
            return (currentPrice - trade.entryPrice) * trade.quantity;
        } else {
            return (trade.entryPrice - currentPrice) * trade.quantity;
        }
    }

    /**
     * Get current price for a pair
     */
    getCurrentPrice(pair) {
        if (window.app && window.app.pairData && window.app.pairData[pair]) {
            const price = window.app.pairData[pair].price;
            if (price && price > 0) {
                return price;
            }
        }
        
        // Fallback: try to get price from the most recent chart data
        const chartData = this.getChartData(pair, 'candlestick');
        if (chartData && chartData.length > 0) {
            const lastCandle = chartData[chartData.length - 1];
            if (lastCandle && lastCandle.close > 0) {
                this.debugLog(`📊 Using chart data price for ${pair}: £${lastCandle.close.toFixed(4)}`, 'info');
                return lastCandle.close;
            }
        }
        
        this.debugLog(`⚠️ No current price available for ${pair}`, 'warning');
        return null;
    }

    /**
     * Get active trades (flattened)
     */
    getActiveTrades() {
        // Flatten all trades for UI
        const all = {};
        Object.keys(this.activeTrades).forEach(pair => {
            if (Array.isArray(this.activeTrades[pair])) {
                this.activeTrades[pair].forEach((trade, i) => {
                    all[`${pair}_${i}`] = trade;
                });
            }
        });
        return all;
    }

    /**
     * Get trading statistics
     */
    getStats() {
        // Calculate unrealized PnL from all active trades
        let unrealizedPnL = 0;
        Object.values(this.activeTrades).forEach(tradesArr => {
            if (Array.isArray(tradesArr)) {
                tradesArr.forEach(trade => {
                    const currentPrice = this.getCurrentPrice(trade.pair);
                    if (currentPrice && trade.entryPrice) {
                        if (trade.side === 'BUY') {
                            unrealizedPnL += (currentPrice - trade.entryPrice) * trade.quantity;
                        } else if (trade.side === 'SELL') {
                            unrealizedPnL += (trade.entryPrice - currentPrice) * trade.quantity;
                        }
                    }
                });
            }
        });
        return {
            accountBalance: this.tradingStats.accountBalance + unrealizedPnL,
            totalPnL: this.tradingStats.totalPnL + unrealizedPnL,
            todayPnL: this.tradingStats.todayPnL + unrealizedPnL,
            totalTrades: this.tradingStats.totalTrades,
            winRate: this.tradingStats.totalTrades > 0 ? Math.round(100 * this.tradingStats.winningTrades / this.tradingStats.totalTrades) : 0
        };
    }

    /**
     * Reset daily statistics
     */
    resetDailyStats() {
        this.tradingStats.todayPnL = 0;
        this.riskManager.dailyLoss = 0;
        this.debugLog('📅 Daily statistics reset', 'info');
    }

    /**
     * Get trade history
     */
    getTradeHistory(limit = 50) {
        return this.tradeHistory.slice(-limit);
    }

    /**
     * Export trading data
     */
    exportData() {
        return {
            settings: this.settings,
            stats: this.tradingStats,
            history: this.tradeHistory,
            activeTrades: this.activeTrades
        };
    }

    /**
     * Import trading data
     */
    importData(data) {
        if (data.settings) this.settings = data.settings;
        if (data.stats) this.tradingStats = data.stats;
        if (data.history) this.tradeHistory = data.history;
        if (data.activeTrades) this.activeTrades = data.activeTrades;
        
        this.saveSettings();
        this.debugLog('📥 Trading data imported', 'info');
    }

    /**
     * Fetch and store real OHLC data for charting
     */
    async fetchAndStoreOHLC(pair, interval = 1) {
        if (!window.app || !window.app.krakenAPI) return;
        const ohlcData = await window.app.krakenAPI.getOHLCData(pair, interval);
        this.chartData[pair] = ohlcData;
    }

    /**
     * Force reload historical data for all pairs (1440 candles each)
     */
    async reloadAllHistoricalData() {
        if (!window.app || !window.app.krakenAPI) {
            this.debugLog('❌ No API connection available for historical data reload', 'error');
            return;
        }

        this.debugLog('🔄 Reloading historical data for all pairs...', 'info');
        const pairs = ['BTCGBP', 'XRPGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
        
        for (const pair of pairs) {
            const krakenPair = window.app.krakenAPI.pairs[pair];
            if (!krakenPair) {
                this.debugLog(`[RELOAD] No Kraken pair mapping found for ${pair}`, 'warning');
                continue;
            }
            
            this.debugLog(`[RELOAD] Fetching 1440 candles for ${pair} (${krakenPair})...`, 'info');
            try {
                const ohlc = await window.app.krakenAPI.getOHLCData(krakenPair, 1, null, 1); // 1-minute candles, 1 day
                if (ohlc && ohlc.length >= 1440) {
                    this.chartData[pair] = ohlc.slice(-1440); // keep last 1440 candles
                    this.debugLog(`[RELOAD] ✅ ${pair} candles loaded: ${this.chartData[pair].length}`);
                } else if (ohlc && ohlc.length >= 100) {
                    this.chartData[pair] = ohlc.slice(-100); // fallback to 100 if not enough data
                    this.debugLog(`[RELOAD] ⚠️ ${pair} limited data: ${this.chartData[pair].length} candles (wanted 1440)`, 'warning');
                } else {
                    this.debugLog(`[RELOAD] ⚠️ ${pair} insufficient data: ${ohlc?.length || 0} candles`, 'warning');
                }
            } catch (error) {
                this.debugLog(`[RELOAD] ❌ Failed to fetch ${pair} data: ${error.message}`, 'error');
            }
        }
        
        this.debugLog('✅ Historical data reload complete', 'success');
    }

    /**
     * Get total unrealized PnL from all open trades
     */
    getUnrealizedPnL() {
        let unrealized = 0;
        Object.keys(this.activeTrades).forEach(pair => {
            const trades = this.activeTrades[pair];
            if (!Array.isArray(trades)) return;
            trades.forEach(trade => {
                const currentPrice = this.getCurrentPrice(pair);
                if (currentPrice && trade) {
                    unrealized += this.calculatePnL(trade, currentPrice);
                }
            });
        });
        return unrealized;
    }

    async initNeuralNet() {
        if (typeof tf === 'undefined') return;
        // 7 input features, 1 output (buy/sell/hold)
        this.nnModel = tf.sequential();
        this.nnModel.add(tf.layers.dense({inputShape: [7], units: 16, activation: 'relu'}));
        this.nnModel.add(tf.layers.dense({units: 8, activation: 'relu'}));
        this.nnModel.add(tf.layers.dense({units: 3, activation: 'softmax'}));
        this.nnModel.compile({optimizer: 'adam', loss: 'categoricalCrossentropy'});
    }

    // Extract features for neural net: [price/sma50, rsi, macd, macdSignal, volumeRatio, adx, price/majorSupport]
    extractFeatures(indicators, data) {
        return [
            data.price / (indicators.sma50 || 1),
            indicators.rsi / 100,
            indicators.macd / ((Math.abs(indicators.macdSignal) || 1)),
            indicators.macdSignal / 100,
            indicators.volumeRatio / 10,
            indicators.adx / 100,
            data.price / ((indicators.majorSupport || 1))
        ];
    }

    // Train neural net on a single trade outcome
    async trainNeuralNet(features, actionIdx, reward) {
        if (!this.nnModel) return;
        // actionIdx: 0=buy, 1=sell, 2=hold
        const xs = tf.tensor2d([features]);
        const ys = tf.tensor2d([[actionIdx === 0 ? reward : 0, actionIdx === 1 ? reward : 0, actionIdx === 2 ? reward : 0]]);
        await this.nnModel.fit(xs, ys, {epochs: 1, verbose: 0});
        xs.dispose(); ys.dispose();
    }

    // Get neural net action/confidence
    async neuralNetDecision(features) {
        if (!this.nnModel) return {action: 'hold', confidence: 0};
        const xs = tf.tensor2d([features]);
        const preds = this.nnModel.predict(xs);
        const arr = await preds.data();
        xs.dispose(); preds.dispose();
        const maxIdx = arr.indexOf(Math.max(...arr));
        return {
            action: maxIdx === 0 ? 'BUY' : maxIdx === 1 ? 'SELL' : 'HOLD',
            confidence: arr[maxIdx]
        };
    }

    extractFeaturesFromHistory(entry) {
        // For online training from history
        if (!entry || !entry.signals) return [0,0,0,0,0,0,0];
        const s = entry.signals;
        return [
            s.priceSMA || 1,
            s.rsi || 0,
            s.macd || 0,
            s.macdSignal || 0,
            s.volumeRatio || 0,
            s.adx || 0,
            s.priceSupport || 1
        ];
    }

    /**
     * Pre-train the neural net with 10 years of historical data for all pairs
     */
    async pretrainNeuralNetWithHistory() {
        if (!this.nnModel || !window.app || !window.app.krakenAPI) return;
        const pairs = ['BTCGBP', 'XRPGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
        for (const pair of pairs) {
            // Use Kraken code for each pair
            const krakenPair = window.app.krakenAPI.pairs[pair];
            if (!krakenPair) {
                this.debugLog(`[PRETRAIN] No Kraken pair mapping found for ${pair}`, 'warning');
                continue;
            }
            this.debugLog(`Pre-training NN with history for ${pair} (${krakenPair})...`, 'info');
            try {
                const ohlc = await window.app.krakenAPI.getOHLCData(krakenPair, 60, null, 10); // 1h candles, 10 years
                if (!ohlc || ohlc.length < 100) {
                    this.debugLog(`[PRETRAIN] ⚠️ ${pair} insufficient data: ${ohlc?.length || 0} candles`, 'warning');
                    continue;
                }
                // For each bar, extract features and simulate a trade
                for (let i = 50; i < ohlc.length - 1; i++) { // start after enough bars for indicators
                    const chartData = ohlc.slice(i-49, i+1); // last 50 bars
                    const indicators = this.calculateSwingIndicators(chartData);
                    const data = { price: ohlc[i].close };
                    const features = this.extractFeatures(indicators, data);
                    // Simulate: if price rises next bar, label as BUY; if falls, SELL; else HOLD
                    const nextClose = ohlc[i+1].close;
                    let actionIdx = 2; // hold
                    if (nextClose > ohlc[i].close * 1.002) actionIdx = 0; // buy
                    else if (nextClose < ohlc[i].close * 0.998) actionIdx = 1; // sell
                    const reward = Math.abs(nextClose - ohlc[i].close) / ohlc[i].close;
                    await this.trainNeuralNet(features, actionIdx, reward);
                }
                this.debugLog(`NN pre-training complete for ${pair}.`, 'success');
            } catch (error) {
                this.debugLog(`[PRETRAIN] ❌ Failed to fetch ${pair} data: ${error.message}`, 'error');
            }
        }
        this.debugLog('Neural net pre-training with historical data complete!', 'success');
    }

    // Dynamic position sizing based on AI confidence (0-1)
    getDynamicInvestment(pair, aiConfidence) {
        const min = 0.1 * this.settings.maxInvestment;
        const max = this.settings.maxInvestment;
        const scaled = min + (max - min) * Math.min(Math.max(aiConfidence, 0), 1);
        this.debugLog(`[AI] Dynamic investment for ${pair}: £${scaled.toFixed(2)} (confidence: ${aiConfidence})`, 'info');
        return scaled;
    }
}

// Export for use in other modules
window.TradingBot = TradingBot; 
