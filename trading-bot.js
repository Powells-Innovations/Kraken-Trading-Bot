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
            takeProfit: 15,    // 15% take profit for swing trading
            stopLoss: 5,       // 5% stop loss (dynamic stops will override)
            tradeFrequency: 'moderate', // Swing trading is moderate frequency
            maxActiveTrades: 6,  // Reduced to 6 for better risk management
            maxRiskPerTrade: 0.02, // 2% max risk per trade (professional standard)
            maxTotalRisk: 0.10,    // 10% max total risk across all trades
            cooldownMinutes: 60    // 1 hour cooldown between trades on same pair
        };
        
        // Trading statistics
        this.tradingStats = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalPnL: 0,
            todayPnL: 0,
            accountBalance: 1000, // Demo balance
            startDate: new Date()
        };
        
        // Live balance storage (for live trading mode)
        this.liveBalance = null;
        
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
                const pairs = Object.keys(window.app.krakenAPI.pairs);
                for (const pair of pairs) {
                    const krakenPair = window.app.krakenAPI.pairs[pair];
                    if (!krakenPair) {
                        this.debugLog(`[INIT] No Kraken pair mapping found for ${pair}`, 'warning');
                        continue;
                    }
                    this.debugLog(`[INIT] Fetching 2880 historical candles for ${pair} (${krakenPair})...`, 'info');
                    try {
                        const ohlc = await window.app.krakenAPI.getOHLCData(krakenPair, 1, null, 2); // 1-minute candles, 2 days
                        if (ohlc && ohlc.length >= 2880) {
                            this.chartData[pair] = ohlc.slice(-2880); // keep last 2880 candles
                            this.debugLog(`[INIT] ✅ ${pair} candles loaded: ${this.chartData[pair].length}`);
                        } else if (ohlc && ohlc.length >= 100) {
                            this.chartData[pair] = ohlc.slice(-100); // fallback to 100 if not enough data
                            this.debugLog(`[INIT] ⚠️ ${pair} limited data: ${this.chartData[pair].length} candles (wanted 2880)`, 'warning');
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
            const pairs = window.app && window.app.krakenAPI ? Object.keys(window.app.krakenAPI.pairs) : [];
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
     * Update live balance (called from app.js when fetching real balance)
     */
    updateLiveBalance(balance) {
        this.liveBalance = balance;
        this.debugLog(`Live balance updated: £${balance}`, 'info');
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
                
                // Keep last 2880 candles (48 hours of 1-minute candles) for swing trading
                if (this.chartData[pair].length > 2880) {
                    this.chartData[pair] = this.chartData[pair].slice(-2880);
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
        // Debug log: show data availability
        const dataStats = Object.keys(this.chartData).map(pair => 
            `${pair}: ${this.chartData[pair]?.length || 0} candles`
        ).join(', ');
        this.debugLog(`[SWING] Data available: ${dataStats}`, 'info');
        
        // Swing trading: Check for opportunities every 15 minutes
        const nowMinute = Math.floor(Date.now() / (15 * 60000)); // 15 minutes
        if (nowMinute !== this.lastTradeMinute) {
            this.tradeCounter = 0;
            this.lastTradeMinute = nowMinute;
            this.debugLog('[SWING] New 15-minute trading window started', 'info');
        }
        
        // Get total active trades count
        const totalActiveTrades = Object.values(this.activeTrades).reduce((sum, trades) => 
            sum + (Array.isArray(trades) ? trades.length : 0), 0
        );
        
        // Don't trade if we have too many active trades
        if (totalActiveTrades >= this.settings.maxActiveTrades) {
            this.debugLog(`[SWING] Max active trades reached (${totalActiveTrades}/${this.settings.maxActiveTrades})`, 'warning');
            return;
        }
        
        // Analyze all pairs in parallel
        const pairs = Object.keys(tickerData);
        const decisionPromises = pairs.map(async pair => {
            const data = tickerData[pair];
            if (!data || !data.price || data.price <= 0) return null;
            
            try {
                const decision = await this.getSwingDecision(pair, data);
                return { pair, data, decision };
            } catch (error) {
                this.debugLog(`[SWING] Error analyzing ${pair}: ${error.message}`, 'error');
                return null;
            }
        });
        
        const results = (await Promise.all(decisionPromises)).filter(Boolean);
        
        // Log summary of analysis
        const summary = {
            analyzed: results.length,
            shouldTrade: results.filter(r => r.decision.shouldTrade).length,
            canTrade: results.filter(r => r.decision.shouldTrade && this.canTrade(r.pair)).length,
            buySignals: results.filter(r => r.decision.side === 'BUY').length,
            sellSignals: results.filter(r => r.decision.side === 'SELL').length
        };
        
        this.debugLog(`[SWING] Analysis complete: ${JSON.stringify(summary)}`, 'info');
        
        // Sort opportunities by confidence and risk/reward
        const opportunities = results
            .filter(r => r.decision.shouldTrade && this.canTrade(r.pair))
            .sort((a, b) => {
                // First sort by confidence
                const confDiff = b.decision.confidence - a.decision.confidence;
                if (Math.abs(confDiff) > 0.1) return confDiff;
                
                // Then by risk/reward ratio
                return (b.decision.riskRewardRatio || 0) - (a.decision.riskRewardRatio || 0);
            });
        
        // Log top opportunities
        if (opportunities.length > 0) {
            this.debugLog(`[SWING] Top opportunities:`, 'info');
            opportunities.slice(0, 3).forEach((opp, i) => {
                const d = opp.decision;
                this.debugLog(
                    `  ${i+1}. ${opp.pair}: ${d.side} | Conf: ${(d.confidence*100).toFixed(1)}% | ` +
                    `R/R: ${d.riskRewardRatio.toFixed(2)} | ${d.reason}`, 
                    'info'
                );
            });
        }
        
        // Execute trades (max 2 per window for swing trading)
        const maxTradesPerWindow = 2;
        let tradesExecuted = 0;
        
        for (const opportunity of opportunities) {
            if (tradesExecuted >= maxTradesPerWindow || this.tradeCounter >= 5) break;
            
            const { pair, data, decision } = opportunity;
            
            // Final risk check
            const tradeRisk = this.calculateTradeRisk(pair, data.price, decision.stopLoss);
            if (tradeRisk > this.settings.maxRiskPerTrade * 100) {
                this.debugLog(`[SWING] Skipping ${pair} - risk too high (${tradeRisk.toFixed(1)}%)`, 'warning');
                continue;
            }
            
            // Execute trade
            this.debugLog(`[SWING] Executing trade for ${pair}...`, 'info');
            const executionResult = await this.executeTrade(
                pair, 
                decision.side, 
                data.price, 
                `AI Swing: ${decision.reason}`, 
                decision.stopLoss, 
                decision.takeProfit, 
                decision.confidence
            );
            
            if (executionResult) {
                tradesExecuted++;
                this.tradeCounter++;
                
                // Log detailed trade info
                this.debugLog(
                    `🤖 AI SWING TRADE EXECUTED:\n` +
                    `   Pair: ${pair}\n` +
                    `   Side: ${decision.side}\n` +
                    `   Confidence: ${(decision.confidence*100).toFixed(1)}%\n` +
                    `   Risk/Reward: ${decision.riskRewardRatio.toFixed(2)}:1\n` +
                    `   Stop Loss: £${decision.stopLoss.toFixed(4)}\n` +
                    `   Take Profit: £${decision.takeProfit.toFixed(4)}\n` +
                    `   Market Regime: ${decision.marketRegime || 'Unknown'}\n` +
                    `   Patterns: ${decision.patterns ? 
                        (decision.patterns.bullish.concat(decision.patterns.bearish)
                            .map(p => p.name).join(', ') || 'None') : 'None'}`,
                    'success'
                );
                
                // Store decision data for learning
                if (!this.decisionHistory) this.decisionHistory = [];
                this.decisionHistory.push({
                    pair: pair,
                    time: Date.now(),
                    decision: decision,
                    entryPrice: data.price,
                    result: null // Will be filled on trade close
                });
            }
        }
        
        if (opportunities.length === 0) {
            this.debugLog(`[SWING] No suitable opportunities found in this cycle`, 'info');
        } else if (tradesExecuted === 0) {
            this.debugLog(`[SWING] Had ${opportunities.length} opportunities but none were executed`, 'warning');
        }
    }

    /**
     * AI Swing Trading Decision Making - Advanced strategy with multi-timeframe analysis
     */
    async getSwingDecision(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        
        // Need at least 200 candles for proper analysis
        if (!chartData || chartData.length < 200) {
            this.debugLog(`[AI] ${pair}: Insufficient data (${chartData?.length || 0} candles), using simplified analysis`, 'warning');
            return this.getSimplifiedDecision(pair, data);
        }
        
        // Calculate comprehensive indicators
        const indicators = this.calculateAdvancedIndicators(chartData);
        const marketRegime = this.detectMarketRegime(chartData, indicators);
        const patterns = this.detectPatterns(chartData);
        const multiTimeframe = await this.multiTimeframeAnalysis(pair, data);
        
        // Initialize scoring system
        let buyScore = 0;
        let sellScore = 0;
        let confidence = 0;
        let reasons = [];
        
        // 1. Market Regime Analysis (25% weight)
        if (marketRegime.type === 'strong_uptrend') {
            buyScore += 25;
            confidence += 0.25;
            reasons.push('Strong uptrend detected');
        } else if (marketRegime.type === 'strong_downtrend') {
            sellScore += 25;
            confidence += 0.25;
            reasons.push('Strong downtrend detected');
        } else if (marketRegime.type === 'uptrend') {
            buyScore += 15;
            confidence += 0.15;
            reasons.push('Uptrend');
        } else if (marketRegime.type === 'downtrend') {
            sellScore += 15;
            confidence += 0.15;
            reasons.push('Downtrend');
        } else if (marketRegime.type === 'ranging') {
            // Range trading logic
            if (data.price <= indicators.bollingerLower * 1.02) {
                buyScore += 20;
                confidence += 0.20;
                reasons.push('Near range bottom');
            } else if (data.price >= indicators.bollingerUpper * 0.98) {
                sellScore += 20;
                confidence += 0.20;
                reasons.push('Near range top');
            }
        }
        
        // 2. Technical Indicators Confluence (30% weight)
        const technicalScore = this.calculateTechnicalScore(indicators, data.price);
        if (technicalScore.signal === 'BUY') {
            buyScore += technicalScore.strength * 30;
            confidence += technicalScore.confidence * 0.30;
            reasons.push(technicalScore.reason);
        } else if (technicalScore.signal === 'SELL') {
            sellScore += technicalScore.strength * 30;
            confidence += technicalScore.confidence * 0.30;
            reasons.push(technicalScore.reason);
        }
        
        // 3. Pattern Recognition (20% weight)
        if (patterns.bullish.length > 0) {
            const patternStrength = patterns.bullish[0].strength || 0.7;
            buyScore += patternStrength * 20;
            confidence += patternStrength * 0.20;
            reasons.push(`Bullish pattern: ${patterns.bullish[0].name}`);
        } else if (patterns.bearish.length > 0) {
            const patternStrength = patterns.bearish[0].strength || 0.7;
            sellScore += patternStrength * 20;
            confidence += patternStrength * 0.20;
            reasons.push(`Bearish pattern: ${patterns.bearish[0].name}`);
        }
        
        // 4. Multi-timeframe Confluence (15% weight)
        if (multiTimeframe.signal === 'BUY') {
            buyScore += multiTimeframe.strength * 15;
            confidence += multiTimeframe.confidence * 0.15;
            reasons.push('Multi-TF bullish');
        } else if (multiTimeframe.signal === 'SELL') {
            sellScore += multiTimeframe.strength * 15;
            confidence += multiTimeframe.confidence * 0.15;
            reasons.push('Multi-TF bearish');
        }
        
        // 5. Volume Analysis (10% weight)
        const volumeSignal = this.analyzeVolume(chartData, indicators);
        if (volumeSignal.signal === 'BUY') {
            buyScore += volumeSignal.strength * 10;
            confidence += volumeSignal.confidence * 0.10;
            reasons.push(volumeSignal.reason);
        } else if (volumeSignal.signal === 'SELL') {
            sellScore += volumeSignal.strength * 10;
            confidence += volumeSignal.confidence * 0.10;
            reasons.push(volumeSignal.reason);
        }
        
        // Machine Learning Enhancement
        if (this.nnModel) {
            const features = this.extractAdvancedFeatures(indicators, data, marketRegime, patterns);
            const nnResult = await this.neuralNetDecision(features);
            
            if (nnResult.confidence > 0.7) {
                if (nnResult.action === 'BUY') {
                    buyScore += nnResult.confidence * 20;
                    confidence = Math.max(confidence, nnResult.confidence);
                    reasons.unshift('AI Neural Net: Strong Buy');
                } else if (nnResult.action === 'SELL') {
                    sellScore += nnResult.confidence * 20;
                    confidence = Math.max(confidence, nnResult.confidence);
                    reasons.unshift('AI Neural Net: Strong Sell');
                }
            }
        }
        
        // Determine final decision
        const scoreDiff = Math.abs(buyScore - sellScore);
        let finalSide = null;
        
        if (buyScore > sellScore && scoreDiff >= 20) {
            finalSide = 'BUY';
        } else if (sellScore > buyScore && scoreDiff >= 20) {
            finalSide = 'SELL';
        }
        
        // Calculate dynamic stop loss and take profit based on market conditions
        const riskParams = this.calculateDynamicRiskParameters(
            pair, data, indicators, marketRegime, finalSide
        );
        
        // Additional filters for swing trading
        let shouldTrade = finalSide !== null;
        
        // Market quality filters
        if (indicators.atr < data.price * 0.002) { // Less than 0.2% ATR
            shouldTrade = false;
            reasons.push('Market too quiet');
        }
        
        if (marketRegime.volatility > 3.0) { // Extreme volatility
            confidence *= 0.7;
            reasons.push('Extreme volatility');
        }
        
        // Time-based filters
        const hour = new Date().getUTCHours();
        if (hour >= 21 || hour <= 7) { // Low liquidity hours
            confidence *= 0.8;
            reasons.push('Low liquidity period');
        }
        
        // Risk/Reward validation
        if (riskParams.riskRewardRatio < 1.5) {
            shouldTrade = false;
            reasons.push('Poor risk/reward');
        }
        
        // Final confidence adjustment
        confidence = Math.min(confidence, 0.95); // Cap at 95%
        confidence = Math.max(confidence, 0.1); // Floor at 10%
        
        return {
            shouldTrade: shouldTrade && confidence >= 0.4,
            side: finalSide,
            reason: reasons.slice(0, 3).join(', '),
            confidence: confidence,
            stopLoss: riskParams.stopLoss,
            takeProfit: riskParams.takeProfit,
            riskRewardRatio: riskParams.riskRewardRatio,
            marketRegime: marketRegime.type,
            technicalScore: technicalScore,
            patterns: patterns,
            multiTimeframe: multiTimeframe,
            scores: { buy: buyScore, sell: sellScore }
        };
    }

    /**
     * Simplified but still intelligent decision making for limited data
     */
    getSimplifiedDecision(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < 20) {
            return { 
                shouldTrade: false, 
                side: null, 
                reason: 'Insufficient data for analysis',
                confidence: 0
            };
        }
        
        const prices = chartData.map(d => d.close);
        const highs = chartData.map(d => d.high);
        const lows = chartData.map(d => d.low);
        const volumes = chartData.map(d => d.volume || 1000);
        const currentPrice = data.price;
        
        // Calculate what we can with limited data
        const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
        const pricePosition = (currentPrice - sma) / sma;
        
        // Simple RSI
        const rsi = this.calculateRSI(prices, Math.min(14, prices.length - 1));
        
        // Price momentum
        const momentum5 = prices.length >= 5 ? 
            ((currentPrice - prices[prices.length - 5]) / prices[prices.length - 5]) * 100 : 0;
        const momentum10 = prices.length >= 10 ? 
            ((currentPrice - prices[prices.length - 10]) / prices[prices.length - 10]) * 100 : 0;
        
        // Volume analysis
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const volumeRatio = currentVolume / avgVolume;
        
        // Support/Resistance
        const recentHigh = Math.max(...highs.slice(-20));
        const recentLow = Math.min(...lows.slice(-20));
        const range = recentHigh - recentLow;
        const positionInRange = (currentPrice - recentLow) / range;
        
        // Scoring system
        let buyScore = 0;
        let sellScore = 0;
        let confidence = 0.3; // Base confidence for simplified
        let reasons = [];
        
        // Trend analysis
        if (pricePosition > 0.02) {
            buyScore += 20;
            reasons.push('Above average price');
        } else if (pricePosition < -0.02) {
            sellScore += 20;
            reasons.push('Below average price');
        }
        
        // RSI
        if (rsi < 30) {
            buyScore += 30;
            confidence += 0.2;
            reasons.push('RSI oversold');
        } else if (rsi > 70) {
            sellScore += 30;
            confidence += 0.2;
            reasons.push('RSI overbought');
        } else if (rsi < 40) {
            buyScore += 15;
            confidence += 0.1;
        } else if (rsi > 60) {
            sellScore += 15;
            confidence += 0.1;
        }
        
        // Momentum
        if (momentum5 > 2 && momentum10 > 3) {
            buyScore += 25;
            confidence += 0.15;
            reasons.push('Strong upward momentum');
        } else if (momentum5 < -2 && momentum10 < -3) {
            sellScore += 25;
            confidence += 0.15;
            reasons.push('Strong downward momentum');
        }
        
        // Volume confirmation
        if (volumeRatio > 1.5) {
            if (momentum5 > 0) {
                buyScore += 15;
                reasons.push('Volume confirms up move');
            } else if (momentum5 < 0) {
                sellScore += 15;
                reasons.push('Volume confirms down move');
            }
            confidence += 0.1;
        }
        
        // Position in range
        if (positionInRange < 0.2) {
            buyScore += 20;
            reasons.push('Near range bottom');
        } else if (positionInRange > 0.8) {
            sellScore += 20;
            reasons.push('Near range top');
        }
        
        // Determine decision
        let side = null;
        if (buyScore > sellScore && buyScore >= 50) {
            side = 'BUY';
        } else if (sellScore > buyScore && sellScore >= 50) {
            side = 'SELL';
        }
        
        // Calculate simple risk parameters
        const atr = this.calculateATR(chartData, Math.min(14, chartData.length - 1));
        let stopLoss, takeProfit;
        
        if (side === 'BUY') {
            stopLoss = Math.max(currentPrice - (atr * 2), recentLow);
            takeProfit = currentPrice + (atr * 4);
        } else if (side === 'SELL') {
            stopLoss = Math.min(currentPrice + (atr * 2), recentHigh);
            takeProfit = currentPrice - (atr * 4);
        }
        
        const riskRewardRatio = side ? 2.0 : 0;
        
        return {
            shouldTrade: side !== null && confidence >= 0.4,
            side: side,
            reason: reasons.slice(0, 2).join(', ') || 'Limited data analysis',
            confidence: Math.min(confidence, 0.7), // Cap confidence for simplified
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            riskRewardRatio: riskRewardRatio,
            scores: { buy: buyScore, sell: sellScore }
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

        // Ensure minimum risk/reward ratio of 1.2:1 (reduced from 1.5)
        if (riskRewardRatio < 1.2) {
            if (side === 'BUY') {
                takeProfit = currentPrice + (risk * 1.2);
            } else {
                takeProfit = currentPrice - (risk * 1.2);
            }
            riskRewardRatio = 1.2;
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
            this.debugLog(`[executeTrade] Starting trade execution for ${pair}: ${side} at £${price}`, 'info');
            
            if (!this.canTrade(pair)) {
                this.debugLog(`[executeTrade] Not executing trade for ${pair} - canTrade returned false`, 'warning');
                return false;
            }
            
            // Calculate position size based on risk management
            const accountBalance = this.tradingStats.accountBalance;
            const maxRiskAmount = accountBalance * this.settings.maxRiskPerTrade; // 10% of account
            this.debugLog(`[executeTrade] Account balance: £${accountBalance}, Max risk amount: £${maxRiskAmount}`, 'info');
            
            // Calculate position size based on stop loss distance
            let positionSize = 0;
            if (aiStopLoss && aiStopLoss > 0) {
                const riskPerUnit = Math.abs(price - aiStopLoss);
                if (riskPerUnit > 0) {
                    positionSize = maxRiskAmount / riskPerUnit;
                    this.debugLog(`[executeTrade] Position size from stop loss: ${positionSize.toFixed(6)}`, 'info');
                }
            }
            
            // Fallback to fixed investment if no stop loss
            if (positionSize <= 0) {
                const dynamicInvestment = this.getDynamicInvestment(pair, aiConfidence);
                positionSize = dynamicInvestment / price;
                this.debugLog(`[executeTrade] Position size from dynamic investment: ${positionSize.toFixed(6)}`, 'info');
            }
            
            // Ensure minimum position size
            if (positionSize <= 0) {
                positionSize = this.settings.maxInvestment / price;
                this.debugLog(`[executeTrade] Position size from max investment: ${positionSize.toFixed(6)}`, 'info');
            }
            
            // Ensure position size doesn't exceed max investment
            const maxQuantity = this.settings.maxInvestment / price;
            positionSize = Math.min(positionSize, maxQuantity);
            
            // Calculate actual investment amount
            const investment = positionSize * price;
            this.debugLog(`[executeTrade] Final position size: ${positionSize.toFixed(6)}, Investment: £${investment.toFixed(2)}`, 'info');
            
            // Final safety check: ensure we're not over-risking
            const tradeRisk = this.calculateTradeRisk(pair, price, aiStopLoss || (price * 0.9));
            this.debugLog(`[executeTrade] Calculated trade risk: ${tradeRisk.toFixed(1)}% (max: ${this.settings.maxRiskPerTrade * 100}%)`, 'info');
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
            this.debugLog(`[executeTrade] Trade successfully executed and recorded`, 'success');
            
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
            this.debugLog(`[executeTrade] Trade execution completed successfully`, 'success');
            return true;
        } catch (error) {
            this.debugLog(`[executeTrade] Failed to execute trade: ${error.message}`, 'error');
            this.debugLog(`[executeTrade] Error stack: ${error.stack}`, 'error');
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
        // Check if we already have too many active trades for this pair (allow up to 2)
        if (this.activeTrades[pair] && this.activeTrades[pair].length >= 2) {
            this.debugLog(`[canTrade] Blocked: too many active trades for ${pair} (${this.activeTrades[pair].length})`, 'warning');
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
        
        // Use live balance if available and in live mode, otherwise use demo balance
        const baseBalance = (this.tradingMode === 'live' && this.liveBalance !== null) 
            ? this.liveBalance 
            : this.tradingStats.accountBalance;
        
        return {
            accountBalance: baseBalance + unrealizedPnL,
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
        const pairs = window.app && window.app.krakenAPI ? Object.keys(window.app.krakenAPI.pairs) : [];
        
        for (const pair of pairs) {
            const krakenPair = window.app.krakenAPI.pairs[pair];
            if (!krakenPair) {
                this.debugLog(`[RELOAD] No Kraken pair mapping found for ${pair}`, 'warning');
                continue;
            }
            
            this.debugLog(`[RELOAD] Fetching 2880 candles for ${pair} (${krakenPair})...`, 'info');
            try {
                const ohlc = await window.app.krakenAPI.getOHLCData(krakenPair, 1, null, 2); // 1-minute candles, 2 days
                if (ohlc && ohlc.length >= 2880) {
                    this.chartData[pair] = ohlc.slice(-2880); // keep last 2880 candles
                    this.debugLog(`[RELOAD] ✅ ${pair} candles loaded: ${this.chartData[pair].length}`);
                } else if (ohlc && ohlc.length >= 100) {
                    this.chartData[pair] = ohlc.slice(-100); // fallback to 100 if not enough data
                    this.debugLog(`[RELOAD] ⚠️ ${pair} limited data: ${this.chartData[pair].length} candles (wanted 2880)`, 'warning');
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
        // 13 input features for advanced analysis, 3 outputs (buy/sell/hold)
        this.nnModel = tf.sequential();
        this.nnModel.add(tf.layers.dense({inputShape: [13], units: 32, activation: 'relu'}));
        this.nnModel.add(tf.layers.dropout({rate: 0.2}));
        this.nnModel.add(tf.layers.dense({units: 16, activation: 'relu'}));
        this.nnModel.add(tf.layers.dropout({rate: 0.1}));
        this.nnModel.add(tf.layers.dense({units: 8, activation: 'relu'}));
        this.nnModel.add(tf.layers.dense({units: 3, activation: 'softmax'}));
        this.nnModel.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        this.debugLog('Neural network initialized with advanced architecture', 'success');
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
        const pairs = Object.keys(window.app.krakenAPI.pairs);
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

    /**
     * Calculate advanced technical indicators for swing trading
     */
    calculateAdvancedIndicators(chartData) {
        const prices = chartData.map(d => d.close);
        const highs = chartData.map(d => d.high);
        const lows = chartData.map(d => d.low);
        const volumes = chartData.map(d => d.volume || 1000);
        
        // Basic indicators from original method
        const basicIndicators = this.calculateSwingIndicators(chartData);
        
        // EMA Ribbon (8, 13, 21, 55)
        const ema8 = this.calculateEMA(prices, 8);
        const ema13 = this.calculateEMA(prices, 13);
        const ema21 = this.calculateEMA(prices, 21);
        const ema55 = this.calculateEMA(prices, 55);
        const ema200 = this.calculateEMA(prices, 200);
        
        // Bollinger Bands (20, 2)
        const bb = this.calculateBollingerBands(prices, 20, 2);
        
        // Stochastic RSI
        const stochRSI = this.calculateStochasticRSI(prices, 14, 14, 3, 3);
        
        // VWAP (Volume Weighted Average Price)
        const vwap = this.calculateVWAP(chartData);
        
        // Ichimoku Cloud
        const ichimoku = this.calculateIchimokuCloud(highs, lows, prices);
        
        // Williams %R
        const williamsR = this.calculateWilliamsR(highs, lows, prices, 14);
        
        // OBV (On Balance Volume)
        const obv = this.calculateOBV(prices, volumes);
        
        // Fibonacci Levels
        const fibLevels = this.calculateFibonacciLevels(chartData);
        
        // Support/Resistance Clusters
        const srClusters = this.findSupportResistanceClusters(chartData);
        
        // Momentum indicators
        const momentum = this.calculateMomentum(prices, 14);
        const roc = this.calculateROC(prices, 14);
        
        return {
            ...basicIndicators,
            ema8, ema13, ema21, ema55, ema200,
            bollingerUpper: bb.upper,
            bollingerMiddle: bb.middle,
            bollingerLower: bb.lower,
            bollingerWidth: bb.width,
            stochRSI: stochRSI,
            vwap: vwap,
            ichimoku: ichimoku,
            williamsR: williamsR,
            obv: obv,
            fibLevels: fibLevels,
            supportClusters: srClusters.support,
            resistanceClusters: srClusters.resistance,
            momentum: momentum,
            roc: roc,
            atr: this.calculateATR(chartData, 14),
            currentPrice: prices[prices.length - 1]
        };
    }

    /**
     * Calculate Bollinger Bands
     */
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) {
            return { upper: 0, middle: 0, lower: 0, width: 0 };
        }
        
        const slice = prices.slice(-period);
        const sma = slice.reduce((a, b) => a + b, 0) / period;
        
        const variance = slice.reduce((sum, price) => {
            return sum + Math.pow(price - sma, 2);
        }, 0) / period;
        
        const std = Math.sqrt(variance);
        
        return {
            upper: sma + (std * stdDev),
            middle: sma,
            lower: sma - (std * stdDev),
            width: (std * stdDev * 2) / sma
        };
    }

    /**
     * Calculate Stochastic RSI
     */
    calculateStochasticRSI(prices, rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
        if (prices.length < rsiPeriod + stochPeriod) {
            return { k: 50, d: 50 };
        }
        
        // Calculate RSI values
        const rsiValues = [];
        for (let i = rsiPeriod; i < prices.length; i++) {
            const slice = prices.slice(i - rsiPeriod, i);
            rsiValues.push(this.calculateRSI(slice, rsiPeriod));
        }
        
        if (rsiValues.length < stochPeriod) {
            return { k: 50, d: 50 };
        }
        
        // Calculate Stochastic of RSI
        const recentRSI = rsiValues.slice(-stochPeriod);
        const currentRSI = rsiValues[rsiValues.length - 1];
        const lowestRSI = Math.min(...recentRSI);
        const highestRSI = Math.max(...recentRSI);
        
        const k = highestRSI !== lowestRSI ? 
            ((currentRSI - lowestRSI) / (highestRSI - lowestRSI)) * 100 : 50;
        
        return { k: k, d: k }; // Simplified - would need to track K values for D
    }

    /**
     * Calculate VWAP
     */
    calculateVWAP(chartData) {
        if (chartData.length === 0) return 0;
        
        let cumulativeTPV = 0; // Total Price * Volume
        let cumulativeVolume = 0;
        
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayStartTime = todayStart.getTime() / 1000;
        
        for (const candle of chartData) {
            if (candle.time >= todayStartTime) {
                const typicalPrice = (candle.high + candle.low + candle.close) / 3;
                const volume = candle.volume || 1;
                cumulativeTPV += typicalPrice * volume;
                cumulativeVolume += volume;
            }
        }
        
        return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : chartData[chartData.length - 1].close;
    }

    /**
     * Calculate Ichimoku Cloud
     */
    calculateIchimokuCloud(highs, lows, prices) {
        const tenkan = this.calculateDonchian(highs, lows, 9);
        const kijun = this.calculateDonchian(highs, lows, 26);
        const senkouA = (tenkan + kijun) / 2;
        const senkouB = this.calculateDonchian(highs, lows, 52);
        const chikou = prices[prices.length - 26] || prices[prices.length - 1];
        
        return {
            tenkan: tenkan,
            kijun: kijun,
            senkouA: senkouA,
            senkouB: senkouB,
            chikou: chikou,
            cloudTop: Math.max(senkouA, senkouB),
            cloudBottom: Math.min(senkouA, senkouB)
        };
    }

    /**
     * Calculate Donchian Channel (for Ichimoku)
     */
    calculateDonchian(highs, lows, period) {
        if (highs.length < period) return (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
        
        const recentHighs = highs.slice(-period);
        const recentLows = lows.slice(-period);
        
        return (Math.max(...recentHighs) + Math.min(...recentLows)) / 2;
    }

    /**
     * Calculate Williams %R
     */
    calculateWilliamsR(highs, lows, prices, period = 14) {
        if (prices.length < period) return -50;
        
        const recentHighs = highs.slice(-period);
        const recentLows = lows.slice(-period);
        const currentPrice = prices[prices.length - 1];
        
        const highest = Math.max(...recentHighs);
        const lowest = Math.min(...recentLows);
        
        if (highest === lowest) return -50;
        
        return -100 * ((highest - currentPrice) / (highest - lowest));
    }

    /**
     * Calculate OBV (On Balance Volume)
     */
    calculateOBV(prices, volumes) {
        if (prices.length < 2) return 0;
        
        let obv = 0;
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) {
                obv += volumes[i];
            } else if (prices[i] < prices[i - 1]) {
                obv -= volumes[i];
            }
        }
        
        return obv;
    }

    /**
     * Calculate Fibonacci Levels
     */
    calculateFibonacciLevels(chartData) {
        if (chartData.length < 50) return {};
        
        const recent = chartData.slice(-100);
        const highs = recent.map(d => d.high);
        const lows = recent.map(d => d.low);
        
        const swingHigh = Math.max(...highs);
        const swingLow = Math.min(...lows);
        const diff = swingHigh - swingLow;
        
        return {
            high: swingHigh,
            low: swingLow,
            fib236: swingLow + (diff * 0.236),
            fib382: swingLow + (diff * 0.382),
            fib50: swingLow + (diff * 0.5),
            fib618: swingLow + (diff * 0.618),
            fib786: swingLow + (diff * 0.786)
        };
    }

    /**
     * Find Support/Resistance Clusters
     */
    findSupportResistanceClusters(chartData) {
        if (chartData.length < 50) return { support: [], resistance: [] };
        
        const pricePoints = [];
        
        // Collect significant price points
        for (let i = 10; i < chartData.length - 10; i++) {
            const isLocalHigh = this.isLocalExtreme(chartData, i, 10, true);
            const isLocalLow = this.isLocalExtreme(chartData, i, 10, false);
            
            if (isLocalHigh) {
                pricePoints.push({ price: chartData[i].high, type: 'resistance' });
            }
            if (isLocalLow) {
                pricePoints.push({ price: chartData[i].low, type: 'support' });
            }
        }
        
        // Cluster nearby levels
        const clusters = this.clusterPriceLevels(pricePoints, 0.01); // 1% threshold
        
        return {
            support: clusters.filter(c => c.type === 'support').map(c => c.price),
            resistance: clusters.filter(c => c.type === 'resistance').map(c => c.price)
        };
    }

    /**
     * Check if a point is a local extreme
     */
    isLocalExtreme(data, index, lookback, isHigh) {
        if (index < lookback || index >= data.length - lookback) return false;
        
        const point = isHigh ? data[index].high : data[index].low;
        
        for (let i = index - lookback; i <= index + lookback; i++) {
            if (i === index) continue;
            const compare = isHigh ? data[i].high : data[i].low;
            if (isHigh && compare > point) return false;
            if (!isHigh && compare < point) return false;
        }
        
        return true;
    }

    /**
     * Cluster price levels
     */
    clusterPriceLevels(pricePoints, threshold) {
        const clusters = [];
        const used = new Set();
        
        for (let i = 0; i < pricePoints.length; i++) {
            if (used.has(i)) continue;
            
            const cluster = [pricePoints[i]];
            used.add(i);
            
            for (let j = i + 1; j < pricePoints.length; j++) {
                if (used.has(j)) continue;
                
                const priceDiff = Math.abs(pricePoints[i].price - pricePoints[j].price) / pricePoints[i].price;
                if (priceDiff <= threshold) {
                    cluster.push(pricePoints[j]);
                    used.add(j);
                }
            }
            
            if (cluster.length >= 2) {
                const avgPrice = cluster.reduce((sum, p) => sum + p.price, 0) / cluster.length;
                const types = cluster.map(p => p.type);
                const dominantType = types.filter(t => t === 'support').length > types.length / 2 ? 'support' : 'resistance';
                
                clusters.push({
                    price: avgPrice,
                    strength: cluster.length,
                    type: dominantType
                });
            }
        }
        
        return clusters.sort((a, b) => b.strength - a.strength);
    }

    /**
     * Calculate Momentum
     */
    calculateMomentum(prices, period = 14) {
        if (prices.length < period + 1) return 0;
        
        const currentPrice = prices[prices.length - 1];
        const pastPrice = prices[prices.length - 1 - period];
        
        return ((currentPrice - pastPrice) / pastPrice) * 100;
    }

    /**
     * Calculate Rate of Change (ROC)
     */
    calculateROC(prices, period = 14) {
        return this.calculateMomentum(prices, period); // Same calculation
    }

    /**
     * Detect market regime (trending, ranging, volatile)
     */
    detectMarketRegime(chartData, indicators) {
        const prices = chartData.map(d => d.close);
        const atr = indicators.atr;
        const adx = indicators.adx;
        const currentPrice = prices[prices.length - 1];
        
        // Calculate trend strength using multiple EMAs
        const emaOrder = indicators.ema8 > indicators.ema13 && 
                        indicators.ema13 > indicators.ema21 && 
                        indicators.ema21 > indicators.ema55;
        const emaOrderBear = indicators.ema8 < indicators.ema13 && 
                           indicators.ema13 < indicators.ema21 && 
                           indicators.ema21 < indicators.ema55;
        
        // Calculate volatility
        const volatilityRatio = atr / currentPrice;
        const bbWidth = indicators.bollingerWidth;
        
        // Price position relative to key levels
        const aboveCloud = currentPrice > indicators.ichimoku.cloudTop;
        const belowCloud = currentPrice < indicators.ichimoku.cloudBottom;
        const inCloud = !aboveCloud && !belowCloud;
        
        // Determine regime
        let type = 'ranging';
        let strength = 0;
        let volatility = volatilityRatio;
        
        if (adx > 40 && emaOrder && aboveCloud) {
            type = 'strong_uptrend';
            strength = 0.9;
        } else if (adx > 40 && emaOrderBear && belowCloud) {
            type = 'strong_downtrend';
            strength = 0.9;
        } else if (adx > 25 && emaOrder) {
            type = 'uptrend';
            strength = 0.7;
        } else if (adx > 25 && emaOrderBear) {
            type = 'downtrend';
            strength = 0.7;
        } else if (adx < 20 && bbWidth < 0.1) {
            type = 'tight_range';
            strength = 0.5;
        } else if (volatilityRatio > 0.05) {
            type = 'volatile';
            strength = 0.6;
        }
        
        return {
            type: type,
            strength: strength,
            volatility: volatility,
            adx: adx,
            trending: adx > 25,
            emaAlignment: emaOrder ? 'bullish' : emaOrderBear ? 'bearish' : 'neutral'
        };
    }

    /**
     * Detect chart patterns
     */
    detectPatterns(chartData) {
        const patterns = {
            bullish: [],
            bearish: [],
            neutral: []
        };
        
        if (chartData.length < 50) return patterns;
        
        // Detect various patterns
        const candlePatterns = this.detectCandlestickPatterns(chartData);
        const chartPatterns = this.detectChartPatterns(chartData);
        
        // Combine all patterns
        patterns.bullish = [...candlePatterns.bullish, ...chartPatterns.bullish]
            .sort((a, b) => b.strength - a.strength);
        patterns.bearish = [...candlePatterns.bearish, ...chartPatterns.bearish]
            .sort((a, b) => b.strength - a.strength);
        
        return patterns;
    }

    /**
     * Detect candlestick patterns
     */
    detectCandlestickPatterns(chartData) {
        const patterns = { bullish: [], bearish: [] };
        
        if (chartData.length < 3) return patterns;
        
        const last = chartData[chartData.length - 1];
        const prev = chartData[chartData.length - 2];
        const prev2 = chartData[chartData.length - 3];
        
        // Bullish patterns
        if (this.isHammer(last) && prev.close < prev.open) {
            patterns.bullish.push({ name: 'Hammer', strength: 0.7 });
        }
        
        if (this.isBullishEngulfing(prev, last)) {
            patterns.bullish.push({ name: 'Bullish Engulfing', strength: 0.8 });
        }
        
        if (this.isMorningStar(prev2, prev, last)) {
            patterns.bullish.push({ name: 'Morning Star', strength: 0.9 });
        }
        
        // Bearish patterns
        if (this.isShootingStar(last) && prev.close > prev.open) {
            patterns.bearish.push({ name: 'Shooting Star', strength: 0.7 });
        }
        
        if (this.isBearishEngulfing(prev, last)) {
            patterns.bearish.push({ name: 'Bearish Engulfing', strength: 0.8 });
        }
        
        if (this.isEveningStar(prev2, prev, last)) {
            patterns.bearish.push({ name: 'Evening Star', strength: 0.9 });
        }
        
        return patterns;
    }

    /**
     * Detect chart patterns (triangles, flags, etc.)
     */
    detectChartPatterns(chartData) {
        const patterns = { bullish: [], bearish: [] };
        
        // Detect triangle patterns
        const triangle = this.detectTriangle(chartData);
        if (triangle) {
            if (triangle.type === 'ascending') {
                patterns.bullish.push({ name: 'Ascending Triangle', strength: 0.75 });
            } else if (triangle.type === 'descending') {
                patterns.bearish.push({ name: 'Descending Triangle', strength: 0.75 });
            }
        }
        
        // Detect flag patterns
        const flag = this.detectFlag(chartData);
        if (flag) {
            if (flag.type === 'bull') {
                patterns.bullish.push({ name: 'Bull Flag', strength: 0.8 });
            } else if (flag.type === 'bear') {
                patterns.bearish.push({ name: 'Bear Flag', strength: 0.8 });
            }
        }
        
        // Detect double top/bottom
        const doublePattern = this.detectDoubleTopBottom(chartData);
        if (doublePattern) {
            if (doublePattern.type === 'bottom') {
                patterns.bullish.push({ name: 'Double Bottom', strength: 0.85 });
            } else if (doublePattern.type === 'top') {
                patterns.bearish.push({ name: 'Double Top', strength: 0.85 });
            }
        }
        
        return patterns;
    }

    // Candlestick pattern helpers
    isHammer(candle) {
        const body = Math.abs(candle.close - candle.open);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        
        return lowerWick > body * 2 && upperWick < body * 0.5;
    }

    isShootingStar(candle) {
        const body = Math.abs(candle.close - candle.open);
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        
        return upperWick > body * 2 && lowerWick < body * 0.5;
    }

    isBullishEngulfing(prev, current) {
        return prev.close < prev.open && // Previous bearish
               current.close > current.open && // Current bullish
               current.open < prev.close && // Opens below previous close
               current.close > prev.open; // Closes above previous open
    }

    isBearishEngulfing(prev, current) {
        return prev.close > prev.open && // Previous bullish
               current.close < current.open && // Current bearish
               current.open > prev.close && // Opens above previous close
               current.close < prev.open; // Closes below previous open
    }

    isMorningStar(first, second, third) {
        const firstBearish = first.close < first.open;
        const secondSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3;
        const thirdBullish = third.close > third.open;
        const gapDown = second.high < first.low;
        const gapUp = third.low > second.high;
        
        return firstBearish && secondSmall && thirdBullish && (gapDown || gapUp);
    }

    isEveningStar(first, second, third) {
        const firstBullish = first.close > first.open;
        const secondSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3;
        const thirdBearish = third.close < third.open;
        const gapUp = second.low > first.high;
        const gapDown = third.high < second.low;
        
        return firstBullish && secondSmall && thirdBearish && (gapUp || gapDown);
    }

    // Chart pattern helpers
    detectTriangle(chartData) {
        if (chartData.length < 50) return null;
        
        const highs = chartData.slice(-50).map(d => d.high);
        const lows = chartData.slice(-50).map(d => d.low);
        
        // Find trend lines
        const upperTrend = this.calculateTrendLine(highs, true);
        const lowerTrend = this.calculateTrendLine(lows, false);
        
        if (!upperTrend || !lowerTrend) return null;
        
        // Determine triangle type
        if (upperTrend.slope < -0.001 && Math.abs(lowerTrend.slope) < 0.001) {
            return { type: 'descending', strength: 0.75 };
        } else if (lowerTrend.slope > 0.001 && Math.abs(upperTrend.slope) < 0.001) {
            return { type: 'ascending', strength: 0.75 };
        } else if (upperTrend.slope < -0.001 && lowerTrend.slope > 0.001) {
            return { type: 'symmetrical', strength: 0.7 };
        }
        
        return null;
    }

    detectFlag(chartData) {
        if (chartData.length < 30) return null;
        
        // Look for strong move followed by consolidation
        const recentMove = chartData.slice(-30, -10);
        const consolidation = chartData.slice(-10);
        
        const moveRange = Math.max(...recentMove.map(d => d.high)) - Math.min(...recentMove.map(d => d.low));
        const moveDirection = recentMove[recentMove.length - 1].close - recentMove[0].close;
        
        const consRange = Math.max(...consolidation.map(d => d.high)) - Math.min(...consolidation.map(d => d.low));
        
        if (consRange < moveRange * 0.3) {
            if (moveDirection > 0) {
                return { type: 'bull', strength: 0.8 };
            } else {
                return { type: 'bear', strength: 0.8 };
            }
        }
        
        return null;
    }

    detectDoubleTopBottom(chartData) {
        if (chartData.length < 100) return null;
        
        const prices = chartData.map(d => d.close);
        const peaks = [];
        const troughs = [];
        
        // Find peaks and troughs
        for (let i = 10; i < prices.length - 10; i++) {
            if (this.isLocalExtreme(chartData, i, 10, true)) {
                peaks.push({ index: i, price: chartData[i].high });
            }
            if (this.isLocalExtreme(chartData, i, 10, false)) {
                troughs.push({ index: i, price: chartData[i].low });
            }
        }
        
        // Check for double patterns
        if (peaks.length >= 2) {
            const lastTwo = peaks.slice(-2);
            const priceDiff = Math.abs(lastTwo[0].price - lastTwo[1].price) / lastTwo[0].price;
            if (priceDiff < 0.02) { // Within 2%
                return { type: 'top', strength: 0.85 };
            }
        }
        
        if (troughs.length >= 2) {
            const lastTwo = troughs.slice(-2);
            const priceDiff = Math.abs(lastTwo[0].price - lastTwo[1].price) / lastTwo[0].price;
            if (priceDiff < 0.02) { // Within 2%
                return { type: 'bottom', strength: 0.85 };
            }
        }
        
        return null;
    }

    calculateTrendLine(data, isUpper) {
        // Simple linear regression for trend line
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += data[i];
            sumXY += i * data[i];
            sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return { slope, intercept };
    }

    /**
     * Multi-timeframe analysis
     */
    async multiTimeframeAnalysis(pair, data) {
        // For swing trading, we'll simulate different timeframes from 1-minute data
        const chartData = this.getChartData(pair, 'candlestick');
        
        if (!chartData || chartData.length < 240) { // Need at least 4 hours of data
            return { signal: 'NEUTRAL', strength: 0, confidence: 0 };
        }
        
        // Aggregate candles for different timeframes
        const tf5m = this.aggregateCandles(chartData, 5);
        const tf15m = this.aggregateCandles(chartData, 15);
        const tf1h = this.aggregateCandles(chartData, 60);
        
        // Calculate indicators for each timeframe
        const indicators5m = this.calculateSwingIndicators(tf5m.slice(-100));
        const indicators15m = this.calculateSwingIndicators(tf15m.slice(-100));
        const indicators1h = this.calculateSwingIndicators(tf1h.slice(-50));
        
        // Analyze trend alignment across timeframes
        let bullishCount = 0;
        let bearishCount = 0;
        
        // 5-minute timeframe
        if (indicators5m.rsi > 50 && indicators5m.macd > indicators5m.macdSignal) {
            bullishCount++;
        } else if (indicators5m.rsi < 50 && indicators5m.macd < indicators5m.macdSignal) {
            bearishCount++;
        }
        
        // 15-minute timeframe
        if (indicators15m.rsi > 50 && indicators15m.macd > indicators15m.macdSignal) {
            bullishCount++;
        } else if (indicators15m.rsi < 50 && indicators15m.macd < indicators15m.macdSignal) {
            bearishCount++;
        }
        
        // 1-hour timeframe
        if (indicators1h.rsi > 50 && indicators1h.macd > indicators1h.macdSignal) {
            bullishCount += 2; // Higher weight for longer timeframe
        } else if (indicators1h.rsi < 50 && indicators1h.macd < indicators1h.macdSignal) {
            bearishCount += 2;
        }
        
        // Determine signal
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        
        if (bullishCount >= 3) {
            signal = 'BUY';
            strength = bullishCount / 4;
            confidence = strength * 0.8;
        } else if (bearishCount >= 3) {
            signal = 'SELL';
            strength = bearishCount / 4;
            confidence = strength * 0.8;
        }
        
        return { signal, strength, confidence };
    }

    /**
     * Aggregate candles for different timeframes
     */
    aggregateCandles(candles, periodMinutes) {
        const aggregated = [];
        
        for (let i = 0; i < candles.length; i += periodMinutes) {
            const slice = candles.slice(i, i + periodMinutes);
            if (slice.length === 0) continue;
            
            aggregated.push({
                time: slice[0].time,
                open: slice[0].open,
                high: Math.max(...slice.map(c => c.high)),
                low: Math.min(...slice.map(c => c.low)),
                close: slice[slice.length - 1].close,
                volume: slice.reduce((sum, c) => sum + (c.volume || 0), 0)
            });
        }
        
        return aggregated;
    }

    /**
     * Calculate technical score based on multiple indicators
     */
    calculateTechnicalScore(indicators, currentPrice) {
        let buyPoints = 0;
        let sellPoints = 0;
        let totalPoints = 0;
        let reasons = [];
        
        // RSI Analysis (weight: 15%)
        if (indicators.rsi < 30) {
            buyPoints += 15;
            reasons.push('RSI oversold');
        } else if (indicators.rsi > 70) {
            sellPoints += 15;
            reasons.push('RSI overbought');
        } else if (indicators.rsi > 50 && indicators.rsi < 70) {
            buyPoints += 7;
        } else if (indicators.rsi < 50 && indicators.rsi > 30) {
            sellPoints += 7;
        }
        totalPoints += 15;
        
        // Stochastic RSI (weight: 10%)
        if (indicators.stochRSI.k < 20) {
            buyPoints += 10;
            reasons.push('StochRSI oversold');
        } else if (indicators.stochRSI.k > 80) {
            sellPoints += 10;
            reasons.push('StochRSI overbought');
        }
        totalPoints += 10;
        
        // MACD (weight: 15%)
        if (indicators.macd > indicators.macdSignal && indicators.macd > 0) {
            buyPoints += 15;
            reasons.push('MACD bullish');
        } else if (indicators.macd < indicators.macdSignal && indicators.macd < 0) {
            sellPoints += 15;
            reasons.push('MACD bearish');
        } else if (indicators.macd > indicators.macdSignal) {
            buyPoints += 7;
        } else {
            sellPoints += 7;
        }
        totalPoints += 15;
        
        // Bollinger Bands (weight: 10%)
        if (currentPrice < indicators.bollingerLower) {
            buyPoints += 10;
            reasons.push('Below BB lower');
        } else if (currentPrice > indicators.bollingerUpper) {
            sellPoints += 10;
            reasons.push('Above BB upper');
        }
        totalPoints += 10;
        
        // Moving Average Alignment (weight: 20%)
        if (indicators.ema8 > indicators.ema21 && indicators.ema21 > indicators.ema55) {
            buyPoints += 20;
            reasons.push('Bullish EMA alignment');
        } else if (indicators.ema8 < indicators.ema21 && indicators.ema21 < indicators.ema55) {
            sellPoints += 20;
            reasons.push('Bearish EMA alignment');
        } else {
            totalPoints += 10; // Reduce weight if not aligned
        }
        totalPoints += 20;
        
        // Ichimoku Cloud (weight: 15%)
        if (currentPrice > indicators.ichimoku.cloudTop) {
            buyPoints += 15;
            reasons.push('Above Ichimoku cloud');
        } else if (currentPrice < indicators.ichimoku.cloudBottom) {
            sellPoints += 15;
            reasons.push('Below Ichimoku cloud');
        }
        totalPoints += 15;
        
        // Williams %R (weight: 5%)
        if (indicators.williamsR < -80) {
            buyPoints += 5;
        } else if (indicators.williamsR > -20) {
            sellPoints += 5;
        }
        totalPoints += 5;
        
        // VWAP (weight: 10%)
        if (currentPrice > indicators.vwap) {
            buyPoints += 5;
        } else if (currentPrice < indicators.vwap) {
            sellPoints += 5;
        }
        totalPoints += 10;
        
        // Calculate final score
        const buyScore = buyPoints / totalPoints;
        const sellScore = sellPoints / totalPoints;
        
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        
        if (buyScore > sellScore && buyScore > 0.4) {
            signal = 'BUY';
            strength = buyScore;
            confidence = buyScore;
            reasons = reasons.filter(r => r.includes('bullish') || r.includes('oversold') || r.includes('Below') || r.includes('Above Ichimoku'));
        } else if (sellScore > buyScore && sellScore > 0.4) {
            signal = 'SELL';
            strength = sellScore;
            confidence = sellScore;
            reasons = reasons.filter(r => r.includes('bearish') || r.includes('overbought') || r.includes('Above') || r.includes('Below Ichimoku'));
        }
        
        return {
            signal: signal,
            strength: strength,
            confidence: confidence,
            reason: reasons.slice(0, 2).join(', '),
            buyScore: buyScore,
            sellScore: sellScore
        };
    }

    /**
     * Analyze volume patterns
     */
    analyzeVolume(chartData, indicators) {
        if (chartData.length < 50) {
            return { signal: 'NEUTRAL', strength: 0, confidence: 0, reason: 'Insufficient data' };
        }
        
        const volumes = chartData.map(d => d.volume || 0);
        const prices = chartData.map(d => d.close);
        
        // Calculate volume metrics
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const avgVolume50 = volumes.slice(-50).reduce((a, b) => a + b, 0) / 50;
        const volumeRatio = currentVolume / avgVolume20;
        
        // OBV trend
        const obvTrend = this.calculateTrendLine(volumes.slice(-20).map((_, i) => indicators.obv), false);
        
        // Price-volume correlation
        const priceChange = (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2];
        const volumeChange = (currentVolume - volumes[volumes.length - 2]) / volumes[volumes.length - 2];
        
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        let reason = '';
        
        // High volume breakout
        if (volumeRatio > 2.0 && priceChange > 0.01) {
            signal = 'BUY';
            strength = Math.min(volumeRatio / 3, 1);
            confidence = strength * 0.8;
            reason = 'High volume breakout';
        } else if (volumeRatio > 2.0 && priceChange < -0.01) {
            signal = 'SELL';
            strength = Math.min(volumeRatio / 3, 1);
            confidence = strength * 0.8;
            reason = 'High volume breakdown';
        }
        // OBV divergence
        else if (obvTrend.slope > 0 && priceChange < 0) {
            signal = 'BUY';
            strength = 0.6;
            confidence = 0.5;
            reason = 'Bullish OBV divergence';
        } else if (obvTrend.slope < 0 && priceChange > 0) {
            signal = 'SELL';
            strength = 0.6;
            confidence = 0.5;
            reason = 'Bearish OBV divergence';
        }
        // Volume confirmation
        else if (volumeRatio > 1.5 && priceChange > 0) {
            signal = 'BUY';
            strength = 0.5;
            confidence = 0.4;
            reason = 'Volume confirms uptrend';
        } else if (volumeRatio > 1.5 && priceChange < 0) {
            signal = 'SELL';
            strength = 0.5;
            confidence = 0.4;
            reason = 'Volume confirms downtrend';
        }
        
        return { signal, strength, confidence, reason };
    }

    /**
     * Extract advanced features for neural network
     */
    extractAdvancedFeatures(indicators, data, marketRegime, patterns) {
        // Normalize all features to 0-1 range
        const features = [
            // Price relative to key levels
            Math.min(data.price / indicators.ema200, 2) / 2,
            Math.min(data.price / indicators.vwap, 2) / 2,
            (data.price - indicators.bollingerLower) / (indicators.bollingerUpper - indicators.bollingerLower),
            
            // Technical indicators
            indicators.rsi / 100,
            indicators.stochRSI.k / 100,
            (indicators.macd + 1) / 2, // Normalize MACD
            Math.min(indicators.adx / 100, 1),
            
            // Market regime
            marketRegime.type === 'strong_uptrend' ? 1 : marketRegime.type === 'uptrend' ? 0.7 : 
            marketRegime.type === 'strong_downtrend' ? 0 : marketRegime.type === 'downtrend' ? 0.3 : 0.5,
            
            // Volatility
            Math.min(marketRegime.volatility * 20, 1),
            
            // Pattern strength
            patterns.bullish.length > 0 ? patterns.bullish[0].strength : 
            patterns.bearish.length > 0 ? 1 - patterns.bearish[0].strength : 0.5,
            
            // Volume
            Math.min(indicators.volumeRatio / 3, 1),
            
            // Momentum
            (indicators.momentum + 50) / 100,
            
            // Support/Resistance distance
            indicators.supportClusters.length > 0 ? 
                Math.min((data.price - Math.max(...indicators.supportClusters)) / data.price, 0.1) * 10 : 0.5
        ];
        
        return features;
    }

    /**
     * Calculate dynamic risk parameters based on market conditions
     */
    calculateDynamicRiskParameters(pair, data, indicators, marketRegime, side) {
        const currentPrice = data.price;
        const atr = indicators.atr;
        
        // Base risk parameters
        let stopLossDistance = atr * 2; // 2x ATR for swing trading
        let takeProfitDistance = atr * 6; // 6x ATR for swing trading
        
        // Adjust based on market regime
        if (marketRegime.type === 'volatile') {
            stopLossDistance *= 1.5; // Wider stop in volatile markets
            takeProfitDistance *= 1.2;
        } else if (marketRegime.type === 'tight_range') {
            stopLossDistance *= 0.8; // Tighter stop in ranging markets
            takeProfitDistance *= 0.8;
        }
        
        // Adjust based on support/resistance levels
        if (side === 'BUY') {
            // Find nearest support for stop loss
            const nearestSupport = this.findNearestLevel(
                currentPrice, indicators.supportClusters, false
            );
            if (nearestSupport && nearestSupport > currentPrice - stopLossDistance) {
                stopLossDistance = (currentPrice - nearestSupport) * 1.1; // 10% below support
            }
            
            // Find nearest resistance for take profit
            const nearestResistance = this.findNearestLevel(
                currentPrice, indicators.resistanceClusters, true
            );
            if (nearestResistance && nearestResistance < currentPrice + takeProfitDistance) {
                takeProfitDistance = (nearestResistance - currentPrice) * 0.95; // 5% below resistance
            }
        } else if (side === 'SELL') {
            // Find nearest resistance for stop loss
            const nearestResistance = this.findNearestLevel(
                currentPrice, indicators.resistanceClusters, true
            );
            if (nearestResistance && nearestResistance < currentPrice + stopLossDistance) {
                stopLossDistance = (nearestResistance - currentPrice) * 1.1; // 10% above resistance
            }
            
            // Find nearest support for take profit
            const nearestSupport = this.findNearestLevel(
                currentPrice, indicators.supportClusters, false
            );
            if (nearestSupport && nearestSupport > currentPrice - takeProfitDistance) {
                takeProfitDistance = (currentPrice - nearestSupport) * 0.95; // 5% above support
            }
        }
        
        // Use Fibonacci levels if available
        if (indicators.fibLevels && Object.keys(indicators.fibLevels).length > 0) {
            if (side === 'BUY' && currentPrice < indicators.fibLevels.fib618) {
                takeProfitDistance = Math.min(
                    takeProfitDistance,
                    indicators.fibLevels.fib618 - currentPrice
                );
            } else if (side === 'SELL' && currentPrice > indicators.fibLevels.fib382) {
                takeProfitDistance = Math.min(
                    takeProfitDistance,
                    currentPrice - indicators.fibLevels.fib382
                );
            }
        }
        
        // Calculate final levels
        const stopLoss = side === 'BUY' ? 
            currentPrice - stopLossDistance : 
            currentPrice + stopLossDistance;
            
        const takeProfit = side === 'BUY' ? 
            currentPrice + takeProfitDistance : 
            currentPrice - takeProfitDistance;
            
        const riskRewardRatio = takeProfitDistance / stopLossDistance;
        
        // Ensure minimum risk/reward ratio
        if (riskRewardRatio < 1.5) {
            // Adjust take profit to achieve minimum ratio
            takeProfitDistance = stopLossDistance * 1.5;
            const newTakeProfit = side === 'BUY' ? 
                currentPrice + takeProfitDistance : 
                currentPrice - takeProfitDistance;
                
            return {
                stopLoss: stopLoss,
                takeProfit: newTakeProfit,
                riskRewardRatio: 1.5,
                stopDistance: stopLossDistance,
                profitDistance: takeProfitDistance
            };
        }
        
        return {
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            riskRewardRatio: riskRewardRatio,
            stopDistance: stopLossDistance,
            profitDistance: takeProfitDistance
        };
    }

    /**
     * Find nearest support/resistance level
     */
    findNearestLevel(currentPrice, levels, findAbove) {
        if (!levels || levels.length === 0) return null;
        
        const filtered = levels.filter(level => 
            findAbove ? level > currentPrice : level < currentPrice
        );
        
        if (filtered.length === 0) return null;
        
        return findAbove ? 
            Math.min(...filtered) : 
            Math.max(...filtered);
    }
}

// Export for use in other modules
window.TradingBot = TradingBot; 
