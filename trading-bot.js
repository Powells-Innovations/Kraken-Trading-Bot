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
            tradeFrequency: 'scalping',
            maxActiveTrades: 100
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
            lastTradeTime: null
        };
        
        // Chart data storage
        this.maxChartPoints = 50;
        this.tradeCounter = 0;
        this.lastTradeMinute = Math.floor(Date.now() / 60000);
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
            const pairs = ['BTCGBP', 'XRPGBP', 'XLMGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
            pairs.forEach(pair => {
                this.chartData[pair] = [];
            });
        } else {
            const stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC'];
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
        if (!this.chartData[pair]) {
            this.chartData[pair] = [];
        }
        
        const currentTime = timestamp || Date.now();
        let dataPoint;
        
        if (this.chartData[pair].length === 0) {
            // First data point - create a proper candle
            const variation = price * 0.001; // 0.1% variation
            dataPoint = {
                time: currentTime,
                open: price,
                high: price + variation,
                low: price - variation,
                close: price
            };
        } else {
            // Update existing candle or create new one
            const lastCandle = this.chartData[pair][this.chartData[pair].length - 1];
            const timeDiff = currentTime - lastCandle.time;
            
            // Create new candle every 5 seconds or if price changed significantly
            if (timeDiff > 5000 || Math.abs(price - lastCandle.close) > price * 0.0005) {
                const variation = price * 0.001; // 0.1% variation
                dataPoint = {
                    time: currentTime,
                    open: lastCandle.close, // Open at previous close
                    high: Math.max(price, lastCandle.close) + variation,
                    low: Math.min(price, lastCandle.close) - variation,
                    close: price
                };
            } else {
                // Update current candle
                dataPoint = {
                    time: lastCandle.time,
                    open: lastCandle.open,
                    high: Math.max(lastCandle.high, price),
                    low: Math.min(lastCandle.low, price),
                    close: price
                };
                // Replace the last candle
                this.chartData[pair][this.chartData[pair].length - 1] = dataPoint;
                return; // Don't push, we replaced
            }
        }
        
        this.debugLog(`[updateChartData] ${pair}: O:${dataPoint.open.toFixed(4)} H:${dataPoint.high.toFixed(4)} L:${dataPoint.low.toFixed(4)} C:${dataPoint.close.toFixed(4)}`, 'info');
        this.chartData[pair].push(dataPoint);
        
        if (this.chartData[pair].length > this.maxChartPoints) {
            this.chartData[pair].shift();
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
    checkActiveTrades(tickerData) {
        // Close trades using AI levels
        Object.keys(this.activeTrades).forEach(pair => {
            const trades = this.activeTrades[pair];
            if (!Array.isArray(trades)) return;
            trades.forEach((trade, idx) => {
                const currentPrice = tickerData[pair]?.price;
                if (!currentPrice) return;
                
                // Use AI levels if available, otherwise fall back to manual settings
                const stopLoss = trade.aiStopLoss || trade.stopLoss;
                const takeProfit = trade.aiTakeProfit || trade.takeProfit;
                
                // Check for take profit
                if (trade.side === 'BUY' && currentPrice >= takeProfit) {
                    this.closeTrade(pair, 'AI Take Profit', idx);
                    return;
                } else if (trade.side === 'SELL' && currentPrice <= takeProfit) {
                    this.closeTrade(pair, 'AI Take Profit', idx);
                    return;
                }
                
                // Check for stop loss
                if (trade.side === 'BUY' && currentPrice <= stopLoss) {
                    this.closeTrade(pair, 'AI Stop Loss', idx);
                    return;
                } else if (trade.side === 'SELL' && currentPrice >= stopLoss) {
                    this.closeTrade(pair, 'AI Stop Loss', idx);
                    return;
                }
                
                // Update unrealized P&L
                trade.unrealizedPnL = this.calculatePnL(trade, currentPrice);
            });
        });
        // Swing trading: intelligent decisions based on longer-term trends
        if (this.isTrading) {
            this.swingTrade(tickerData);
        }
    }

                /**
     * Swing Trading Strategy - Hold positions for hours to days
     */
    swingTrade(tickerData) {
        // Swing trading: Check for new opportunities every 15 minutes
        const nowMinute = Math.floor(Date.now() / 900000); // 15 minutes
        if (nowMinute !== this.lastTradeMinute) {
            this.tradeCounter = 0;
            this.lastTradeMinute = nowMinute;
        }
        
        Object.keys(tickerData).forEach(pair => {
            if (this.tradeCounter >= 3) return; // Max 3 swing trades per 15 minutes
            const data = tickerData[pair];
            if (!data || !data.price || data.price <= 0) return;
            
            // Get swing trading decision
            const decision = this.getSwingDecision(pair, data);
            
            if (decision.shouldTrade && this.canTrade(pair)) {
                if (this.executeTrade(pair, decision.side, data.price, `AI Swing: ${decision.reason}`, decision.stopLoss, decision.takeProfit)) {
                    this.tradeCounter++;
                    this.debugLog(`🤖 AI Trade: ${decision.side} ${pair} | Confidence: ${decision.confidence}% | R/R: ${decision.riskRewardRatio}:1 | SL: £${decision.stopLoss} | TP: £${decision.takeProfit}`, 'success');
                }
            }
        });
    }

    /**
     * AI Swing Trading Decision Making - Complete strategy with dynamic SL/TP
     */
    getSwingDecision(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < 50) {
            return { shouldTrade: false, side: null, reason: 'Insufficient data for swing trading' };
        }

        // Calculate swing trading indicators
        const indicators = this.calculateSwingIndicators(chartData);
        
        // AI decision logic with confidence scoring
        let buySignals = 0;
        let sellSignals = 0;
        let reasons = [];
        let confidence = 0;

        // 1. Trend Analysis (50-period SMA) - Weight: 20%
        if (data.price > indicators.sma50) {
            buySignals += 3;
            confidence += 20;
            reasons.push('Above 50 SMA (bullish trend)');
        } else {
            sellSignals += 3;
            confidence += 20;
            reasons.push('Below 50 SMA (bearish trend)');
        }

        // 2. RSI for Swing Trading - Weight: 25%
        if (indicators.rsi < 25) {
            buySignals += 4;
            confidence += 25;
            reasons.push('RSI deeply oversold');
        } else if (indicators.rsi > 75) {
            sellSignals += 4;
            confidence += 25;
            reasons.push('RSI strongly overbought');
        } else if (indicators.rsi < 35) {
            buySignals += 2;
            confidence += 15;
            reasons.push('RSI oversold');
        } else if (indicators.rsi > 65) {
            sellSignals += 2;
            confidence += 15;
            reasons.push('RSI overbought');
        }

        // 3. MACD Trend Confirmation - Weight: 20%
        if (indicators.macd > indicators.macdSignal && indicators.macd > 0) {
            buySignals += 3;
            confidence += 20;
            reasons.push('MACD bullish trend');
        } else if (indicators.macd < indicators.macdSignal && indicators.macd < 0) {
            sellSignals += 3;
            confidence += 20;
            reasons.push('MACD bearish trend');
        }

        // 4. Volume Confirmation - Weight: 15%
        if (indicators.volumeRatio > 2.0) {
            buySignals += 2;
            confidence += 15;
            reasons.push('High volume breakout');
        } else if (indicators.volumeRatio > 1.5) {
            buySignals += 1;
            confidence += 10;
            reasons.push('Above average volume');
        }

        // 5. Price Action (Swing Highs/Lows) - Weight: 20%
        if (indicators.isSwingLow) {
            buySignals += 3;
            confidence += 20;
            reasons.push('Swing low formation');
        } else if (indicators.isSwingHigh) {
            sellSignals += 3;
            confidence += 20;
            reasons.push('Swing high formation');
        }

        // 6. Support/Resistance Levels - Weight: 25%
        if (data.price < indicators.majorSupport * 1.02) {
            buySignals += 3;
            confidence += 25;
            reasons.push('Near major support');
        } else if (data.price > indicators.majorResistance * 0.98) {
            sellSignals += 3;
            confidence += 25;
            reasons.push('Near major resistance');
        }

        // 7. Trend Strength (ADX) - Weight: 15%
        if (indicators.adx > 25) {
            if (buySignals > sellSignals) {
                buySignals += 2;
                confidence += 15;
                reasons.push('Strong uptrend');
            } else if (sellSignals > buySignals) {
                sellSignals += 2;
                confidence += 15;
                reasons.push('Strong downtrend');
            }
        }

        // AI Decision with confidence threshold
        const minSignals = 6;
        const minConfidence = 70; // 70% confidence required
        const side = buySignals > sellSignals && buySignals >= minSignals && confidence >= minConfidence ? 'BUY' : 
                    sellSignals > buySignals && sellSignals >= minSignals && confidence >= minConfidence ? 'SELL' : null;

        // Calculate AI-recommended stop loss and take profit
        const aiLevels = this.calculateAITradeLevels(pair, data, indicators, side);

        return {
            shouldTrade: side !== null,
            side: side,
            reason: reasons.slice(0, 3).join(', '),
            confidence: confidence,
            stopLoss: aiLevels.stopLoss,
            takeProfit: aiLevels.takeProfit,
            riskRewardRatio: aiLevels.riskRewardRatio
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
        let stopLoss, takeProfit, riskRewardRatio;

        if (side === 'BUY') {
            // For BUY trades
            // Stop Loss: Below recent swing low or support level
            const swingLow = this.findRecentSwingLow(pair, 20);
            const supportLevel = indicators.majorSupport;
            stopLoss = Math.min(swingLow, supportLevel) * 0.995; // 0.5% below support

            // Take Profit: Based on resistance levels and volatility
            const swingHigh = this.findRecentSwingHigh(pair, 20);
            const resistanceLevel = indicators.majorResistance;
            const atr = this.calculateATR(this.getChartData(pair, 'candlestick'), 14);
            
            // Multiple take profit targets
            const tp1 = Math.max(swingHigh, resistanceLevel) * 1.005; // 0.5% above resistance
            const tp2 = currentPrice + (atr * 2); // 2x ATR
            const tp3 = currentPrice + (currentPrice - stopLoss) * 2; // 2:1 risk/reward
            
            takeProfit = Math.max(tp1, tp2, tp3);

        } else if (side === 'SELL') {
            // For SELL trades
            // Stop Loss: Above recent swing high or resistance level
            const swingHigh = this.findRecentSwingHigh(pair, 20);
            const resistanceLevel = indicators.majorResistance;
            stopLoss = Math.max(swingHigh, resistanceLevel) * 1.005; // 0.5% above resistance

            // Take Profit: Based on support levels and volatility
            const swingLow = this.findRecentSwingLow(pair, 20);
            const supportLevel = indicators.majorSupport;
            const atr = this.calculateATR(this.getChartData(pair, 'candlestick'), 14);
            
            // Multiple take profit targets
            const tp1 = Math.min(swingLow, supportLevel) * 0.995; // 0.5% below support
            const tp2 = currentPrice - (atr * 2); // 2x ATR
            const tp3 = currentPrice - (stopLoss - currentPrice) * 2; // 2:1 risk/reward
            
            takeProfit = Math.min(tp1, tp2, tp3);
        }

        // Calculate risk/reward ratio
        const risk = Math.abs(currentPrice - stopLoss);
        const reward = Math.abs(takeProfit - currentPrice);
        riskRewardRatio = reward / risk;

        // Adjust levels based on volatility
        const volatility = indicators.atr || 0;
        const volatilityAdjustment = volatility * 0.1;

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
        if (!chartData || chartData.length < lookback) return 0;
        
        const recentData = chartData.slice(-lookback);
        const lows = recentData.map(d => d.low);
        return Math.min(...lows);
    }

    /**
     * Find recent swing high
     */
    findRecentSwingHigh(pair, lookback = 20) {
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < lookback) return 0;
        
        const recentData = chartData.slice(-lookback);
        const highs = recentData.map(d => d.high);
        return Math.max(...highs);
    }

    /**
     * Execute a trade
     */
    executeTrade(pair, side, price, reason = 'Signal', aiStopLoss = null, aiTakeProfit = null) {
        try {
            if (!this.canTrade(pair)) {
                this.debugLog(`Cannot execute trade for ${pair} - trade conditions not met`, 'warning');
                return false;
            }

            const quantity = this.settings.maxInvestment / price;
            const trade = {
                id: Date.now().toString(),
                pair: pair,
                side: side,
                entryPrice: price,
                quantity: quantity,
                timestamp: Date.now(),
                reason: reason,
                mode: this.tradingMode,
                aiStopLoss: aiStopLoss,
                aiTakeProfit: aiTakeProfit,
                unrealizedPnL: 0
            };

            // Initialize array if not exists
            if (!this.activeTrades[pair]) {
                this.activeTrades[pair] = [];
            }

            this.activeTrades[pair].push(trade);
            this.tradingStats.totalTrades++;
            this.riskManager.lastTradeTime = Date.now();

            this.debugLog(`💰 ${side} ${pair}: £${this.settings.maxInvestment} at £${price.toFixed(4)} | Qty: ${quantity.toFixed(6)} | Reason: ${reason}`, 'success');
            
            if (window.app) {
                window.app.addLogEntry({
                    type: 'trade',
                    pair: pair,
                    side: side,
                    price: price,
                    mode: this.tradingMode,
                    timestamp: new Date(),
                    aiStopLoss: aiStopLoss,
                    aiTakeProfit: aiTakeProfit
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
    closeTrade(pair, reason, idx) {
        const trades = this.activeTrades[pair];
        if (!Array.isArray(trades) || trades.length === 0) return;
        const trade = trades[idx];
        if (!trade) return;
        const currentPrice = this.getCurrentPrice(pair);
        if (!currentPrice || currentPrice <= 0) return;
        const pnl = this.calculatePnL(trade, currentPrice);
        this.tradingStats.totalPnL += pnl;
        this.tradingStats.todayPnL += pnl;
        if (pnl > 0) {
            this.tradingStats.winningTrades++;
        } else {
            this.tradingStats.losingTrades++;
        }
        const closedTrade = {
            ...trade,
            exitPrice: currentPrice,
            exitTime: Date.now(),
            pnl: pnl,
            reason: reason
        };
        this.tradeHistory.push(closedTrade);
        trades.splice(idx, 1);
        this.debugLog(`📉 Closed ${pair}: ${pnl >= 0 ? '+' : ''}£${pnl.toFixed(2)} (${reason})`, pnl >= 0 ? 'success' : 'error');
        if (window.app) {
            window.app.addLogEntry({
                type: 'closure',
                pair: pair,
                price: currentPrice,
                pnl: pnl,
                reason: reason,
                mode: this.tradingMode,
                timestamp: new Date()
            });
            // Update UI immediately after trade closure
            window.app.updateStatistics();
        }
    }

    /**
     * Check if we can execute a trade
     */
    canTrade(pair) {
        // Check if already have an active trade for this pair
        if (this.activeTrades[pair]) {
            return false;
        }

        // Check max active trades
        if (Object.keys(this.activeTrades).length >= this.settings.maxActiveTrades) {
            return false;
        }

        // Check daily loss limit
        if (this.riskManager.dailyLoss <= -this.riskManager.maxDailyLoss) {
            this.debugLog('Daily loss limit reached', 'warning');
            return false;
        }

        // Check trade frequency
        if (this.riskManager.lastTradeTime) {
            const timeSinceLastTrade = Date.now() - this.riskManager.lastTradeTime;
            const minInterval = this.getTradeInterval();
            
            if (timeSinceLastTrade < minInterval) {
                return false;
            }
        }

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
        const winRate = this.tradingStats.totalTrades > 0 
            ? (this.tradingStats.winningTrades / this.tradingStats.totalTrades) * 100 
            : 0;

        return {
            totalTrades: this.tradingStats.totalTrades,
            winningTrades: this.tradingStats.winningTrades,
            losingTrades: this.tradingStats.losingTrades,
            winRate: winRate.toFixed(1),
            totalPnL: this.tradingStats.totalPnL,
            todayPnL: this.tradingStats.todayPnL,
            accountBalance: this.tradingStats.accountBalance,
            activeTrades: Object.keys(this.activeTrades).length
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
}

// Export for use in other modules
window.TradingBot = TradingBot; 