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
        // Initialize backend API
        this.backendAPI = new BackendAPI();
        
        // Trading state
        this.isTrading = false;
        this.tradingMode = 'demo'; // 'demo' or 'live'
        this.marketType = 'crypto'; // 'crypto' or 'stocks'
        this.liveBalance = null; // For live trading balance
        
        // Active trades storage
        this.activeTrades = {};
        
        // Trade history storage
        this.tradeHistory = [];
        
        // Trading statistics
        this.tradingStats = {
            accountBalance: 1000,
            totalPnL: 0,
            todayPnL: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            lastResetDate: new Date().toDateString()
        };
        
        // Chart data storage
        this.chartData = {};
        
        // Risk management - OPTIMIZED FOR 4-7% DAILY RETURN
        this.riskManager = {
            totalRiskExposure: 0,
            maxDailyLoss: 50, // £50 daily loss limit (5% of £1000)
            dailyLoss: 0,
            lastTradeTime: null,
            lastTradePerAsset: {},
            targetDailyReturn: 0.05, // 5% daily target
            maxConcurrentTrades: 5, // Increased for higher frequency
            minTradeInterval: 30000 // 30 seconds between trades
        };
        
        // Enhanced AI Systems
        this.neuralNet = null;
        this.lstmModel = null; // NEW: LSTM for time series prediction
        this.ensembleModel = null; // NEW: Ensemble of multiple models
        this.isNeuralNetReady = false;
        this.isLSTMReady = false;
        
        // AI Decision Weights - OPTIMIZED PRECEDENCE
        this.aiWeights = {
            lstmPrediction: 0.35,    // Highest weight for LSTM time series
            technicalSignals: 0.25,  // Technical indicators
            neuralNet: 0.20,         // Neural network
            marketStructure: 0.15,   // Market structure analysis
            volumeAnalysis: 0.05     // Volume confirmation
        };
        
        // LSTM Configuration
        this.lstmConfig = {
            sequenceLength: 60,      // 60 time steps (1 hour of 1-minute data)
            features: 8,             // OHLCV + RSI + MACD + Volume
            hiddenUnits: 64,
            predictionHorizon: 5     // Predict next 5 minutes
        };
        
        // Performance tracking
        this.performanceMetrics = {
            dailyTarget: 0.05,       // 5% daily target
            winRateTarget: 0.65,     // 65% win rate target
            avgTradeDuration: 0,     // Average trade duration in minutes
            sharpeRatio: 0,
            maxDrawdown: 0
        };
        
        // Load settings
        this.loadSettings();
        
        // Initialize chart data storage
        this.initializeChartDataStorage();
        
        this.debugLog('🤖 Trading Bot initialized with OPTIMIZED AI for 4-7% daily returns', 'info');
    }

    /**
     * Initialize chart data storage
     */
    initializeChartDataStorage() {
        // Initialize empty chart data storage for all pairs
        const pairs = ['BTCGBP', 'XRPGBP', 'XLMGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
        pairs.forEach(pair => {
            if (!this.chartData[pair]) {
                this.chartData[pair] = [];
            }
        });
        this.debugLog('📊 Chart data storage initialized', 'info');
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
            this.debugLog('🚀 Initializing OPTIMIZED Trading Bot for 4-7% daily returns...', 'info');
            
            // Load settings from backend
            await this.loadSettings();
            
            // Try to load existing data from backend
            await this.loadFromBackend();

            // Load previous trades (trade history) from backend
            if (this.backendAPI && this.backendAPI.loadTradeHistory) {
                try {
                    const backendHistory = await this.backendAPI.loadTradeHistory(100);
                    if (Array.isArray(backendHistory)) {
                        this.tradeHistory = backendHistory.map(trade => ({
                            id: trade.trade_id,
                            pair: trade.pair,
                            side: trade.side,
                            entryPrice: trade.entry_price,
                            exitPrice: trade.exit_price,
                            quantity: trade.quantity,
                            investment: trade.investment,
                            pnl: trade.pnl,
                            timestamp: trade.entry_time,
                            exitTime: trade.exit_time,
                            reason: trade.reason,
                            mode: trade.mode
                        }));
                        this.debugLog(`✅ Loaded ${this.tradeHistory.length} previous trades from backend`, 'success');
                    }
                } catch (err) {
                    this.debugLog('❌ Failed to load previous trades from backend: ' + err.message, 'error');
                }
            }
            
            // Initialize AI models
            await this.initNeuralNet();
            await this.initLSTMModel();
            await this.initEnsembleModel();
            
            // Reset daily stats if needed
            this.resetDailyStats();
            
            // Start background sync polling
            this.startBackgroundSync();
            
            this.debugLog('✅ OPTIMIZED Trading Bot initialized successfully', 'success');
            
            // Start auto-save if backend is available
            const isConnected = await this.backendAPI.testConnection();
            if (isConnected) {
                this.startAutoSave();
            }
            
        } catch (error) {
            this.debugLog(`❌ Failed to initialize trading bot: ${error.message}`, 'error');
        }
    }

    /**
     * Load settings from backend or use OPTIMIZED defaults for 4-7% daily returns
     */
    async loadSettings() {
        try {
            // Try to load settings from backend
            const savedSettings = await this.backendAPI.loadSettings();
            if (savedSettings) {
                this.settings = {
                    maxInvestment: savedSettings.max_investment || 100,    // Increased for higher returns
                    takeProfit: savedSettings.take_profit || 2.5,         // 2.5% take profit (aggressive)
                    stopLoss: savedSettings.stop_loss || 1.5,             // 1.5% stop loss (tight)
                    tradeFrequency: savedSettings.trade_frequency || 'aggressive',
                    maxActiveTrades: savedSettings.max_active_trades || 5, // Increased for higher frequency
                    maxRiskPerTrade: savedSettings.max_risk_per_trade || 0.03, // 3% max risk per trade
                    maxTotalRisk: savedSettings.max_total_risk || 0.15,   // 15% max total portfolio risk
                    cooldownMinutes: savedSettings.cooldown_minutes || 0.5 // 30 seconds cooldown
                };
                this.debugLog('✅ Settings loaded from backend', 'success');
            } else {
                // OPTIMIZED settings for 4-7% daily capital increase
                this.settings = {
                    maxInvestment: 100,        // £100 max per trade
                    takeProfit: 2.5,           // 2.5% take profit target (aggressive)
                    stopLoss: 1.5,             // 1.5% stop loss (tight for scalping)
                    tradeFrequency: 'aggressive',
                    maxActiveTrades: 5,        // 5 concurrent trades for high frequency
                    maxRiskPerTrade: 0.03,     // 3% max risk per trade
                    maxTotalRisk: 0.15,        // 15% max total portfolio risk
                    cooldownMinutes: 0.5       // 30 seconds between trades
                };
                this.debugLog('ℹ️ Using OPTIMIZED settings for 4-7% daily returns', 'info');
            }
        } catch (error) {
            this.debugLog(`❌ Error loading settings: ${error.message}`, 'error');
            // Use optimized settings as fallback
            this.settings = {
                maxInvestment: 100,
                takeProfit: 2.5,
                stopLoss: 1.5,
                tradeFrequency: 'aggressive',
                maxActiveTrades: 5,
                maxRiskPerTrade: 0.03,
                maxTotalRisk: 0.15,
                cooldownMinutes: 0.5
            };
        }
    }

    /**
     * Initialize LSTM Model for time series prediction
     */
    async initLSTMModel() {
        if (typeof tf === 'undefined') return;
        
        try {
            this.debugLog('🧠 Initializing LSTM Model for time series prediction...', 'info');
            
            // Create LSTM model for price prediction
            this.lstmModel = tf.sequential();
            
            // Input layer - LSTM with return sequences
            this.lstmModel.add(tf.layers.lstm({
                units: this.lstmConfig.hiddenUnits,
                returnSequences: true,
                inputShape: [this.lstmConfig.sequenceLength, this.lstmConfig.features]
            }));
            
            // Dropout for regularization
            this.lstmModel.add(tf.layers.dropout({ rate: 0.2 }));
            
            // Second LSTM layer
            this.lstmModel.add(tf.layers.lstm({
                units: this.lstmConfig.hiddenUnits / 2,
                returnSequences: false
            }));
            
            // Dropout
            this.lstmModel.add(tf.layers.dropout({ rate: 0.2 }));
            
            // Dense layers for prediction
            this.lstmModel.add(tf.layers.dense({
                units: 32,
                activation: 'relu'
            }));
            
            // Output layer - predict price direction and magnitude
            this.lstmModel.add(tf.layers.dense({
                units: 3, // [price_change, direction, confidence]
                activation: 'tanh'
            }));
            
            // Compile model
            this.lstmModel.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'meanSquaredError',
                metrics: ['accuracy']
            });
            
            this.isLSTMReady = true;
            this.debugLog('✅ LSTM Model initialized successfully', 'success');
            
        } catch (error) {
            this.debugLog(`❌ Failed to initialize LSTM: ${error.message}`, 'error');
        }
    }

    /**
     * Initialize Ensemble Model combining multiple AI approaches
     */
    async initEnsembleModel() {
        if (typeof tf === 'undefined') return;
        
        try {
            this.debugLog('🎯 Initializing Ensemble Model...', 'info');
            
            // Create ensemble model that combines LSTM, Neural Net, and Technical signals
            this.ensembleModel = tf.sequential();
            
            // Input layer for combined features
            this.ensembleModel.add(tf.layers.dense({
                inputShape: [15], // Combined features from all models
                units: 32,
                activation: 'relu'
            }));
            
            // Hidden layers
            this.ensembleModel.add(tf.layers.dense({
                units: 16,
                activation: 'relu'
            }));
            
            // Output layer - final decision
            this.ensembleModel.add(tf.layers.dense({
                units: 3, // [BUY, SELL, HOLD]
                activation: 'softmax'
            }));
            
            // Compile ensemble
            this.ensembleModel.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });
            
            this.debugLog('✅ Ensemble Model initialized successfully', 'success');
            
        } catch (error) {
            this.debugLog(`❌ Failed to initialize Ensemble: ${error.message}`, 'error');
        }
    }

    /**
     * Initialize the trading bot
     */
    async initNeuralNet() {
        if (typeof tf === 'undefined') return;
        
        try {
            this.debugLog('🧠 Initializing Enhanced Neural Network...', 'info');
            
            // Enhanced neural network with more layers and features
            this.neuralNet = tf.sequential();
            
            // Input layer - more features for better prediction
            this.neuralNet.add(tf.layers.dense({
                inputShape: [12], // Increased from 7 to 12 features
                units: 32,
                activation: 'relu'
            }));
            
            // Dropout for regularization
            this.neuralNet.add(tf.layers.dropout({ rate: 0.2 }));
            
            // Hidden layers
            this.neuralNet.add(tf.layers.dense({
                units: 24,
                activation: 'relu'
            }));
            
            this.neuralNet.add(tf.layers.dropout({ rate: 0.2 }));
            
            this.neuralNet.add(tf.layers.dense({
                units: 16,
                activation: 'relu'
            }));
            
            // Output layer
            this.neuralNet.add(tf.layers.dense({
                units: 3, // [BUY, SELL, HOLD]
                activation: 'softmax'
            }));
            
            // Compile with better optimizer
            this.neuralNet.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });
            
            this.isNeuralNetReady = true;
            this.debugLog('✅ Enhanced Neural Network initialized successfully', 'success');
            
        } catch (error) {
            this.debugLog(`❌ Failed to initialize Neural Network: ${error.message}`, 'error');
        }
    }

    /**
     * Prepare LSTM input sequence from chart data
     */
    prepareLSTMSequence(chartData) {
        if (!chartData || chartData.length < this.lstmConfig.sequenceLength) {
            return null;
        }
        
        const recentData = chartData.slice(-this.lstmConfig.sequenceLength);
        const sequence = [];
        
        for (let i = 0; i < recentData.length; i++) {
            const candle = recentData[i];
            const features = [
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume || 1000,
                this.calculateRSI(chartData.slice(0, i + 1).map(d => d.close), 14),
                this.calculateEMA(chartData.slice(0, i + 1).map(d => d.close), 12) - 
                this.calculateEMA(chartData.slice(0, i + 1).map(d => d.close), 26),
                (candle.volume || 1000) / (chartData.slice(-50).reduce((sum, d) => sum + (d.volume || 1000), 0) / 50)
            ];
            sequence.push(features);
        }
        
        return sequence;
    }

    /**
     * Get LSTM prediction for price movement
     */
    async getLSTMPrediction(pair, data) {
        if (!this.lstmModel || !this.isLSTMReady) {
            return { priceChange: 0, direction: 0, confidence: 0 };
        }
        
        try {
            const chartData = this.getChartData(pair, 'candlestick');
            const sequence = this.prepareLSTMSequence(chartData);
            
            if (!sequence) {
                return { priceChange: 0, direction: 0, confidence: 0 };
            }
            
            // Prepare input tensor
            const inputTensor = tf.tensor3d([sequence], [1, this.lstmConfig.sequenceLength, this.lstmConfig.features]);
            
            // Get prediction
            const prediction = this.lstmModel.predict(inputTensor);
            const predictionArray = await prediction.data();
            
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            
            return {
                priceChange: predictionArray[0],
                direction: predictionArray[1], // -1 to 1 (bearish to bullish)
                confidence: Math.abs(predictionArray[2])
            };
            
        } catch (error) {
            this.debugLog(`❌ LSTM prediction failed: ${error.message}`, 'error');
            return { priceChange: 0, direction: 0, confidence: 0 };
        }
    }

    /**
     * Get ensemble decision combining all AI models
     */
    async getEnsembleDecision(pair, data) {
        try {
            // Get predictions from all models
            const lstmPrediction = await this.getLSTMPrediction(pair, data);
            const technicalSignals = this.getTechnicalSignals(pair, data);
            const neuralNetPrediction = await this.getNeuralNetPrediction(pair, data);
            const marketStructure = this.getMarketStructureAnalysis(pair, data);
            const volumeAnalysis = this.getVolumeAnalysis(pair, data);
            
            // Combine all predictions with weights
            const combinedFeatures = [
                // LSTM features (3)
                lstmPrediction.priceChange,
                lstmPrediction.direction,
                lstmPrediction.confidence,
                
                // Technical signals (3)
                technicalSignals.buyScore,
                technicalSignals.sellScore,
                technicalSignals.neutralScore,
                
                // Neural net features (3)
                neuralNetPrediction.buyProb,
                neuralNetPrediction.sellProb,
                neuralNetPrediction.holdProb,
                
                // Market structure (3)
                marketStructure.trendStrength,
                marketStructure.volatility,
                marketStructure.momentum,
                
                // Volume analysis (3)
                volumeAnalysis.volumeRatio,
                volumeAnalysis.volumeTrend,
                volumeAnalysis.volumeConfidence
            ];
            
            // Get ensemble prediction
            if (this.ensembleModel) {
                const inputTensor = tf.tensor2d([combinedFeatures]);
                const prediction = this.ensembleModel.predict(inputTensor);
                const predictionArray = await prediction.data();
                
                inputTensor.dispose();
                prediction.dispose();
                
                const maxIndex = predictionArray.indexOf(Math.max(...predictionArray));
                const actions = ['BUY', 'SELL', 'HOLD'];
                
                return {
                    action: actions[maxIndex],
                    confidence: predictionArray[maxIndex],
                    buyProb: predictionArray[0],
                    sellProb: predictionArray[1],
                    holdProb: predictionArray[2],
                    lstmPrediction,
                    technicalSignals,
                    neuralNetPrediction,
                    marketStructure,
                    volumeAnalysis
                };
            } else {
                // Fallback to weighted average
                const buyScore = (lstmPrediction.direction * lstmPrediction.confidence * this.aiWeights.lstmPrediction) +
                               (technicalSignals.buyScore * this.aiWeights.technicalSignals) +
                               (neuralNetPrediction.buyProb * this.aiWeights.neuralNet);
                
                const sellScore = (-lstmPrediction.direction * lstmPrediction.confidence * this.aiWeights.lstmPrediction) +
                                (technicalSignals.sellScore * this.aiWeights.technicalSignals) +
                                (neuralNetPrediction.sellProb * this.aiWeights.neuralNet);
                
                const holdScore = technicalSignals.neutralScore * this.aiWeights.technicalSignals +
                                neuralNetPrediction.holdProb * this.aiWeights.neuralNet;
                
                const maxScore = Math.max(buyScore, sellScore, holdScore);
                let action = 'HOLD';
                let confidence = holdScore;
                
                if (buyScore === maxScore && buyScore > 0.3) {
                    action = 'BUY';
                    confidence = buyScore;
                } else if (sellScore === maxScore && sellScore > 0.3) {
                    action = 'SELL';
                    confidence = sellScore;
                }
                
                return {
                    action,
                    confidence,
                    buyProb: buyScore,
                    sellProb: sellScore,
                    holdProb: holdScore,
                    lstmPrediction,
                    technicalSignals,
                    neuralNetPrediction,
                    marketStructure,
                    volumeAnalysis
                };
            }
            
        } catch (error) {
            this.debugLog(`❌ Ensemble decision failed: ${error.message}`, 'error');
            return {
                action: 'HOLD',
                confidence: 0,
                buyProb: 0,
                sellProb: 0,
                holdProb: 1
            };
        }
    }

    /**
     * Get technical signals with enhanced scoring
     */
    getTechnicalSignals(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < 50) {
            return { buyScore: 0, sellScore: 0, neutralScore: 1 };
        }
        
        const indicators = this.calculateAllIndicators(chartData, data);
        let buyScore = 0;
        let sellScore = 0;
        let totalSignals = 0;
        
        // RSI signals
        if (indicators.rsi < 30) buyScore += 0.3;
        else if (indicators.rsi > 70) sellScore += 0.3;
        totalSignals++;
        
        // MACD signals
        if (indicators.macd > indicators.macdSignal && indicators.macd > 0) buyScore += 0.25;
        else if (indicators.macd < indicators.macdSignal && indicators.macd < 0) sellScore += 0.25;
        totalSignals++;
        
        // Moving average signals
        if (data.price > indicators.sma20 && data.price > indicators.sma50) buyScore += 0.2;
        else if (data.price < indicators.sma20 && data.price < indicators.sma50) sellScore += 0.2;
        totalSignals++;
        
        // Bollinger Bands signals
        if (data.price < indicators.bbLower) buyScore += 0.15;
        else if (data.price > indicators.bbUpper) sellScore += 0.15;
        totalSignals++;
        
        // Volume signals
        if (indicators.volumeRatio > 1.5) {
            if (buyScore > sellScore) buyScore += 0.1;
            else if (sellScore > buyScore) sellScore += 0.1;
        }
        totalSignals++;
        
        // Normalize scores
        buyScore = buyScore / totalSignals;
        sellScore = sellScore / totalSignals;
        const neutralScore = Math.max(0, 1 - buyScore - sellScore);
        
        return { buyScore, sellScore, neutralScore };
    }

    /**
     * Get neural network prediction
     */
    async getNeuralNetPrediction(pair, data) {
        if (!this.neuralNet || !this.isNeuralNetReady) {
            return { buyProb: 0, sellProb: 0, holdProb: 1 };
        }
        
        try {
            const chartData = this.getChartData(pair, 'candlestick');
            const indicators = this.calculateAllIndicators(chartData, data);
            const features = this.extractEnhancedFeatures(indicators, data);
            
            const inputTensor = tf.tensor2d([features]);
            const prediction = this.neuralNet.predict(inputTensor);
            const predictionArray = await prediction.data();
            
            inputTensor.dispose();
            prediction.dispose();
            
            return {
                buyProb: predictionArray[0],
                sellProb: predictionArray[1],
                holdProb: predictionArray[2]
            };
            
        } catch (error) {
            this.debugLog(`❌ Neural net prediction failed: ${error.message}`, 'error');
            return { buyProb: 0, sellProb: 0, holdProb: 1 };
        }
    }

    /**
     * Extract enhanced features for neural network
     */
    extractEnhancedFeatures(indicators, data) {
        return [
            data.price / (indicators.sma50 || 1),
            indicators.rsi / 100,
            indicators.macd / ((Math.abs(indicators.macdSignal) || 1)),
            indicators.macdSignal / 100,
            indicators.volumeRatio / 10,
            indicators.adx / 100,
            data.price / ((indicators.majorSupport || 1)),
            indicators.stochK / 100,
            indicators.stochD / 100,
            indicators.williamsR / 100,
            indicators.atrRatio,
            indicators.obvTrend / 1000
        ];
    }

    /**
     * Get market structure analysis
     */
    getMarketStructureAnalysis(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < 20) {
            return { trendStrength: 0, volatility: 0, momentum: 0 };
        }
        
        const prices = chartData.map(d => d.close);
        const recentPrices = prices.slice(-20);
        
        // Trend strength
        const trendStrength = this.calculateTrendStrength(recentPrices);
        
        // Volatility
        const volatility = this.calculateVolatility(recentPrices);
        
        // Momentum
        const momentum = this.calculateMomentum(recentPrices);
        
        return { trendStrength, volatility, momentum };
    }

    /**
     * Get volume analysis
     */
    getVolumeAnalysis(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < 50) {
            return { volumeRatio: 1, volumeTrend: 0, volumeConfidence: 0 };
        }
        
        const volumes = chartData.map(d => d.volume || 1000);
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.slice(-50).reduce((a, b) => a + b, 0) / 50;
        
        const volumeRatio = currentVolume / avgVolume;
        const volumeTrend = this.calculateTrend(volumes.slice(-20));
        const volumeConfidence = Math.min(1, volumeRatio / 3);
        
        return { volumeRatio, volumeTrend, volumeConfidence };
    }

    /**
     * Calculate trend strength
     */
    calculateTrendStrength(prices) {
        if (prices.length < 2) return 0;
        
        const first = prices[0];
        const last = prices[prices.length - 1];
        const change = (last - first) / first;
        
        return Math.tanh(change * 10); // Normalize to -1 to 1
    }

    /**
     * Calculate volatility
     */
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Calculate momentum
     */
    calculateMomentum(prices) {
        if (prices.length < 5) return 0;
        
        const shortTerm = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const longTerm = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
        
        return (shortTerm - longTerm) / longTerm;
    }

    /**
     * Calculate trend from array of values
     */
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        return (last - first) / first;
    }

    /**
     * OPTIMIZED AI Swing Trading Decision Making for 4-7% daily returns
     */
    async getSwingDecision(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        
        // Check if we have enough data
        if (!chartData || chartData.length < 50) {
            this.debugLog(`[AI] ${pair}: Insufficient data (${chartData?.length || 0} candles), using simplified analysis`, 'warning');
            return this.getSimplifiedDecision(pair, data);
        }
        
        // Get ensemble decision with all AI models
        const ensembleDecision = await this.getEnsembleDecision(pair, data);
        
        // Calculate all technical indicators
        const indicators = this.calculateAllIndicators(chartData, data);
        
        // Enhanced decision logic with optimal precedence
        let finalSide = null;
        let confidence = ensembleDecision.confidence;
        let reasons = [];
        
        // 1. LSTM PREDICTION (Highest precedence - 35% weight)
        if (ensembleDecision.lstmPrediction.confidence > 0.6) {
            if (ensembleDecision.lstmPrediction.direction > 0.3) {
                finalSide = 'BUY';
                confidence *= 1.2;
                reasons.push(`LSTM Bullish (${(ensembleDecision.lstmPrediction.direction*100).toFixed(1)}%)`);
            } else if (ensembleDecision.lstmPrediction.direction < -0.3) {
                finalSide = 'SELL';
                confidence *= 1.2;
                reasons.push(`LSTM Bearish (${(ensembleDecision.lstmPrediction.direction*100).toFixed(1)}%)`);
            }
        }
        
        // 2. ENSEMBLE DECISION (25% weight)
        if (ensembleDecision.action !== 'HOLD' && ensembleDecision.confidence > 0.5) {
            if (ensembleDecision.action === 'BUY' && (!finalSide || finalSide === 'BUY')) {
                finalSide = 'BUY';
                confidence = Math.max(confidence, ensembleDecision.confidence);
                reasons.push(`Ensemble BUY (${(ensembleDecision.confidence*100).toFixed(1)}%)`);
            } else if (ensembleDecision.action === 'SELL' && (!finalSide || finalSide === 'SELL')) {
                finalSide = 'SELL';
                confidence = Math.max(confidence, ensembleDecision.confidence);
                reasons.push(`Ensemble SELL (${(ensembleDecision.confidence*100).toFixed(1)}%)`);
            }
        }
        
        // 3. TECHNICAL SIGNALS (20% weight)
        if (ensembleDecision.technicalSignals.buyScore > 0.6 && (!finalSide || finalSide === 'BUY')) {
            finalSide = 'BUY';
            confidence = Math.max(confidence, ensembleDecision.technicalSignals.buyScore);
            reasons.push(`Technical BUY (${(ensembleDecision.technicalSignals.buyScore*100).toFixed(1)}%)`);
        } else if (ensembleDecision.technicalSignals.sellScore > 0.6 && (!finalSide || finalSide === 'SELL')) {
            finalSide = 'SELL';
            confidence = Math.max(confidence, ensembleDecision.technicalSignals.sellScore);
            reasons.push(`Technical SELL (${(ensembleDecision.technicalSignals.sellScore*100).toFixed(1)}%)`);
        }
        
        // 4. MARKET STRUCTURE (15% weight)
        if (ensembleDecision.marketStructure.trendStrength > 0.5) {
            if (ensembleDecision.marketStructure.trendStrength > 0 && (!finalSide || finalSide === 'BUY')) {
                finalSide = 'BUY';
                confidence = Math.max(confidence, Math.abs(ensembleDecision.marketStructure.trendStrength));
                reasons.push(`Strong Uptrend (${(ensembleDecision.marketStructure.trendStrength*100).toFixed(1)}%)`);
            } else if (ensembleDecision.marketStructure.trendStrength < 0 && (!finalSide || finalSide === 'SELL')) {
                finalSide = 'SELL';
                confidence = Math.max(confidence, Math.abs(ensembleDecision.marketStructure.trendStrength));
                reasons.push(`Strong Downtrend (${(ensembleDecision.marketStructure.trendStrength*100).toFixed(1)}%)`);
            }
        }
        
        // 5. VOLUME CONFIRMATION (5% weight)
        if (ensembleDecision.volumeAnalysis.volumeRatio > 1.5 && ensembleDecision.volumeAnalysis.volumeConfidence > 0.5) {
            confidence *= 1.1;
            reasons.push(`High Volume Confirmation (${(ensembleDecision.volumeAnalysis.volumeRatio).toFixed(1)}x)`);
        }
        
        // Calculate dynamic AI levels based on current market conditions
        const aiLevels = this.calculateDynamicAITradeLevels(pair, data, indicators, finalSide);
        
        // Evaluate current stop loss and take profit levels
        const levelEvaluation = this.evaluateCurrentLevels(pair, data, indicators, aiLevels);
        
        // Adjust confidence based on level evaluation
        if (levelEvaluation.score > 0.7) {
            confidence *= 1.2; // Boost confidence if levels are good
            reasons.push('Optimal SL/TP levels');
        } else if (levelEvaluation.score < 0.3) {
            confidence *= 0.7; // Reduce confidence if levels are poor
            reasons.push('Poor SL/TP levels');
        }
        
        // OPTIMIZED decision criteria for 4-7% daily returns
        let shouldTrade = finalSide !== null && confidence >= 0.5 && aiLevels !== null;
        
        // Enhanced risk/reward ratio check for aggressive trading
        if (aiLevels && aiLevels.riskRewardRatio < 1.5) { // Reduced from 2.0 to 1.5 for more trades
            shouldTrade = false;
            reasons.push('Risk/reward ratio too low (< 1.5:1)');
        }
        
        // Market volatility check - allow higher volatility for scalping
        if (indicators.atrRatio > 3.0) { // Increased from 2.0 to 3.0
            confidence *= 0.8;
            reasons.push('Extreme volatility');
        }
        
        // Volume confirmation - less strict for scalping
        if (indicators.volumeRatio < 0.3) { // Reduced from 0.5 to 0.3
            confidence *= 0.9;
            reasons.push('Low volume');
        }
        
        return {
            shouldTrade: shouldTrade,
            side: finalSide,
            reason: reasons.slice(0, 5).join(', '), // Top 5 reasons
            confidence: Math.min(1.0, confidence),
            stopLoss: aiLevels?.stopLoss || null,
            takeProfit: aiLevels?.takeProfit || null,
            riskRewardRatio: aiLevels?.riskRewardRatio || null,
            levelEvaluation: levelEvaluation,
            indicators: indicators,
            buySignals: ensembleDecision.buyProb,
            sellSignals: ensembleDecision.sellProb,
            totalScore: confidence * 100,
            maxPossibleScore: 100,
            lstmPrediction: ensembleDecision.lstmPrediction,
            ensembleDecision: ensembleDecision
        };
    }

    /**
     * Start trading
     */
    async startTrading() {
        if (this.isTrading) {
            this.debugLog('⚠️ Trading is already active', 'warning');
            return false;
        }

        try {
            this.debugLog('🚀 Starting trading...', 'info');
            
            // Save current state to backend
            await this.saveToBackend();
            
            this.isTrading = true;
            
            // Start auto-save
            this.startAutoSave();
            
            // Ensure background sync is running
            this.startBackgroundSync();
            
            this.debugLog('✅ Trading started successfully', 'success');
            return true;
        } catch (error) {
            this.debugLog(`❌ Failed to start trading: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Stop trading
     */
    async stopTrading() {
        if (!this.isTrading) {
            this.debugLog('⚠️ Trading is not active', 'warning');
            return;
        }

        try {
            this.debugLog('🛑 Stopping trading...', 'info');
            
            this.isTrading = false;
            
            // Stop auto-save
            this.stopAutoSave();
            
            // Keep background sync running for data updates
            // this.stopBackgroundSync(); // Don't stop background sync when trading stops
            
            // Save final state to backend
            await this.saveToBackend();
            
            this.debugLog('✅ Trading stopped successfully', 'success');
        } catch (error) {
            this.debugLog(`❌ Error stopping trading: ${error.message}`, 'error');
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
        this.initializeChartDataStorage();
        this.debugLog(`Market type set to: ${type}`, 'info');
    }

    /**
     * Update trading settings
     */
    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Save to backend
        await this.saveSettings();
        
        this.debugLog('⚙️ Settings updated and saved to backend', 'info');
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
     * OPTIMIZED High-Frequency Scalping Strategy for 4-7% daily returns
     */
    async swingTrade(tickerData) {
        // Debug log: show number of candles for each pair before trading decisions
        Object.keys(this.chartData).forEach(pair => {
            this.debugLog(`[SCALPING] ${pair} candles available: ${this.chartData[pair]?.length}`);
        });
        
        // High-frequency scalping: Check for new opportunities every 30 seconds
        const nowSecond = Math.floor(Date.now() / 30000); // 30 seconds
        if (nowSecond !== this.lastTradeSecond) {
            this.tradeCounter = 0;
            this.lastTradeSecond = nowSecond;
        }
        
        // Get total active trades count
        const totalActiveTrades = Object.values(this.activeTrades).reduce((sum, trades) => sum + (Array.isArray(trades) ? trades.length : 0), 0);
        
        // Don't trade if we have too many active trades
        if (totalActiveTrades >= this.settings.maxActiveTrades) {
            this.debugLog(`[SCALPING] Skipping trade analysis - max active trades reached (${totalActiveTrades}/${this.settings.maxActiveTrades})`, 'warning');
            return;
        }
        
        // Check if we have any remaining capital to invest
        const accountBalance = (this.tradingMode === 'live' && this.liveBalance !== null) 
            ? this.liveBalance 
            : this.tradingStats.accountBalance;
        const totalActiveInvestment = Object.values(this.activeTrades).reduce((sum, trades) => {
            if (Array.isArray(trades)) {
                return sum + trades.reduce((pairSum, trade) => pairSum + (trade.investment || 0), 0);
            }
            return sum;
        }, 0);
        const maxTotalInvestment = accountBalance * this.settings.maxTotalRisk;
        const remainingInvestment = Math.max(0, maxTotalInvestment - totalActiveInvestment);
        
        if (remainingInvestment <= 0) {
            this.debugLog(`[SCALPING] Skipping trade analysis - no remaining capital available (total active: £${totalActiveInvestment.toFixed(2)}, max allowed: £${maxTotalInvestment.toFixed(2)})`, 'warning');
            return;
        }
        
        // Check daily performance against target
        const dailyReturn = this.tradingStats.todayPnL / accountBalance;
        if (dailyReturn >= this.performanceMetrics.dailyTarget) {
            this.debugLog(`[SCALPING] Daily target reached (${(dailyReturn*100).toFixed(2)}%), reducing trade frequency`, 'info');
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
        
        // Enhanced debug log for every pair with detailed AI analysis
        for (const r of results) {
            const decision = r.decision;
            this.debugLog(`[AI] ${r.pair}: side=${decision.side} shouldTrade=${decision.shouldTrade} conf=${(decision.confidence*100).toFixed(1)}%`, 'info');
            this.debugLog(`[AI] ${r.pair}: LSTM=${decision.lstmPrediction?.direction?.toFixed(3) || 'N/A'} Ensemble=${decision.ensembleDecision?.action || 'N/A'}`, 'info');
            this.debugLog(`[AI] ${r.pair}: R/R=${decision.riskRewardRatio} Level Score=${(decision.levelEvaluation?.score*100).toFixed(1)}%`, 'info');
            this.debugLog(`[AI] ${r.pair}: Reason=${decision.reason}`, 'info');
        }
        
        // Sort opportunities by AI confidence and risk/reward ratio
        const opportunities = results
            .filter(r => r.decision.shouldTrade && this.canTrade(r.pair))
            .sort((a, b) => {
                // Prioritize by AI confidence first, then by risk/reward ratio
                if (Math.abs(a.decision.confidence - b.decision.confidence) > 0.0001) {
                    return b.decision.confidence - a.decision.confidence;
                }
                return (b.decision.riskRewardRatio || 0) - (a.decision.riskRewardRatio || 0);
            });
        
        // OPTIMIZED: Trade multiple opportunities for higher frequency
        if (opportunities.length > 0 && this.tradeCounter < 12) { // Increased to 12 trades per cycle
            const maxTradesThisCycle = Math.min(3, opportunities.length); // Trade up to 3 pairs simultaneously

            for (let i = 0; i < maxTradesThisCycle; i++) {
                const opportunity = opportunities[i];
                const conf = opportunity.decision.confidence;
                if (conf < 0.7) {
                    this.debugLog(`[SCALPING] Skipping ${opportunity.pair} - confidence too low (${(conf*100).toFixed(1)}%)`, 'warning');
                    continue;
                }
                this.debugLog(`[SCALPING] Found ${opportunities.length} opportunities, executing trade ${i+1}/${maxTradesThisCycle}`, 'info');
                // Additional safety check: ensure we're not over-risking
                const risk = this.calculateTradeRisk(opportunity.pair, opportunity.data.price, opportunity.decision.stopLoss);
                if (risk <= this.settings.maxRiskPerTrade * 100) {
                    if (await this.executeTrade(opportunity.pair, opportunity.decision.side, opportunity.data.price, `AI Scalping: ${opportunity.decision.reason}`, opportunity.decision.stopLoss, opportunity.decision.takeProfit, conf)) {
                        this.tradeCounter++;
                        const decision = opportunity.decision;
                        this.debugLog(`🚀 AI Scalping: ${decision.side} ${opportunity.pair} | Confidence: ${(decision.confidence*100).toFixed(1)}% | LSTM: ${(decision.lstmPrediction?.direction*100).toFixed(1)}%`, 'success');
                        this.debugLog(`🚀 AI Scalping: R/R: ${decision.riskRewardRatio}:1 | SL: £${decision.stopLoss} | TP: £${decision.takeProfit}`, 'success');
                        this.debugLog(`🚀 AI Scalping: Reason: ${decision.reason}`, 'success');
                        // --- For learning: log signals used ---
                        if (!this.signalHistory) this.signalHistory = [];
                        this.signalHistory.push({
                            pair: opportunity.pair,
                            time: Date.now(),
                            signals: decision,
                            result: null // will be filled on closeTrade
                        });
                        // Update performance metrics
                        this.updatePerformanceMetrics();
                    }
                } else {
                    this.debugLog(`[SCALPING] Skipping ${opportunity.pair} - risk too high (risk=${risk.toFixed(2)}%, max allowed=${(this.settings.maxRiskPerTrade*100).toFixed(2)}%)`, 'warning');
                }
            }
        } else if (opportunities.length === 0) {
            this.debugLog(`[SCALPING] No suitable trading opportunities found`, 'info');
        }
    }

    /**
     * AI Swing Trading Decision Making - Enhanced with 20 Statistical Analyses
     */
    async getSwingDecision(pair, data) {
        const chartData = this.getChartData(pair, 'candlestick');
        
        // Check if we have enough data
        if (!chartData || chartData.length < 50) {
            this.debugLog(`[AI] ${pair}: Insufficient data (${chartData?.length || 0} candles), using simplified analysis`, 'warning');
            return this.getSimplifiedDecision(pair, data);
        }
        
        // Calculate all 20 statistical indicators
        const indicators = this.calculateAllIndicators(chartData, data);
        
        // AI decision logic with comprehensive scoring
        let buySignals = 0;
        let sellSignals = 0;
        let reasons = [];
        let confidence = 0;
        let totalScore = 0;
        let maxPossibleScore = 0;
        
        // 1. TREND ANALYSIS (3 indicators)
        // 1.1 Simple Moving Average (SMA) Analysis
        if (data.price > indicators.sma20) {
            buySignals += 3;
            totalScore += 15;
            reasons.push('Above 20 SMA');
        } else {
            sellSignals += 3;
            totalScore += 15;
            reasons.push('Below 20 SMA');
        }
        maxPossibleScore += 15;
        
        if (data.price > indicators.sma50) {
            buySignals += 4;
            totalScore += 20;
            reasons.push('Above 50 SMA');
        } else {
            sellSignals += 4;
            totalScore += 20;
            reasons.push('Below 50 SMA');
        }
        maxPossibleScore += 20;
        
        if (data.price > indicators.sma200) {
            buySignals += 5;
            totalScore += 25;
            reasons.push('Above 200 SMA (major trend)');
        } else {
            sellSignals += 5;
            totalScore += 25;
            reasons.push('Below 200 SMA (major trend)');
        }
        maxPossibleScore += 25;
        
        // 1.2 Exponential Moving Average (EMA) Analysis
        if (indicators.ema12 > indicators.ema26) {
            buySignals += 4;
            totalScore += 20;
            reasons.push('EMA12 > EMA26 (bullish crossover)');
        } else {
            sellSignals += 4;
            totalScore += 20;
            reasons.push('EMA12 < EMA26 (bearish crossover)');
        }
        maxPossibleScore += 20;
        
        // 1.3 Trend Strength (ADX)
        if (indicators.adx > 25) {
            if (buySignals > sellSignals) {
                buySignals += 3;
                totalScore += 15;
                reasons.push('Strong uptrend (ADX > 25)');
            } else {
                sellSignals += 3;
                totalScore += 15;
                reasons.push('Strong downtrend (ADX > 25)');
            }
        }
        maxPossibleScore += 15;
        
        // 2. MOMENTUM INDICATORS (4 indicators)
        // 2.1 RSI Analysis
        if (indicators.rsi < 30) {
            buySignals += 5;
            totalScore += 25;
            reasons.push('RSI oversold (< 30)');
        } else if (indicators.rsi > 70) {
            sellSignals += 5;
            totalScore += 25;
            reasons.push('RSI overbought (> 70)');
        } else if (indicators.rsi < 40) {
            buySignals += 3;
            totalScore += 15;
            reasons.push('RSI moderately oversold');
        } else if (indicators.rsi > 60) {
            sellSignals += 3;
            totalScore += 15;
            reasons.push('RSI moderately overbought');
        }
        maxPossibleScore += 25;
        
        // 2.2 Stochastic Oscillator
        if (indicators.stochK < 20 && indicators.stochD < 20) {
            buySignals += 4;
            totalScore += 20;
            reasons.push('Stochastic oversold');
        } else if (indicators.stochK > 80 && indicators.stochD > 80) {
            sellSignals += 4;
            totalScore += 20;
            reasons.push('Stochastic overbought');
        }
        maxPossibleScore += 20;
        
        // 2.3 Williams %R
        if (indicators.williamsR < -80) {
            buySignals += 3;
            totalScore += 15;
            reasons.push('Williams %R oversold');
        } else if (indicators.williamsR > -20) {
            sellSignals += 3;
            totalScore += 15;
            reasons.push('Williams %R overbought');
        }
        maxPossibleScore += 15;
        
        // 2.4 MACD Analysis
        if (indicators.macd > indicators.macdSignal && indicators.macd > 0) {
            buySignals += 4;
            totalScore += 20;
            reasons.push('MACD bullish (above signal & zero)');
        } else if (indicators.macd < indicators.macdSignal && indicators.macd < 0) {
            sellSignals += 4;
            totalScore += 20;
            reasons.push('MACD bearish (below signal & zero)');
        }
        maxPossibleScore += 20;
        
        // 3. VOLUME ANALYSIS (3 indicators)
        // 3.1 Volume Ratio
        if (indicators.volumeRatio > 2.0) {
            buySignals += 3;
            totalScore += 15;
            reasons.push('High volume breakout (> 2x avg)');
        } else if (indicators.volumeRatio > 1.5) {
            buySignals += 2;
            totalScore += 10;
            reasons.push('Above average volume');
        }
        maxPossibleScore += 15;
        
        // 3.2 On-Balance Volume (OBV)
        if (indicators.obvTrend > 0) {
            buySignals += 3;
            totalScore += 15;
            reasons.push('OBV trending up');
        } else {
            sellSignals += 3;
            totalScore += 15;
            reasons.push('OBV trending down');
        }
        maxPossibleScore += 15;
        
        // 3.3 Volume Price Trend (VPT)
        if (indicators.vptTrend > 0) {
            buySignals += 2;
            totalScore += 10;
            reasons.push('VPT positive');
        } else {
            sellSignals += 2;
            totalScore += 10;
            reasons.push('VPT negative');
        }
        maxPossibleScore += 10;
        
        // 4. VOLATILITY INDICATORS (3 indicators)
        // 4.1 Bollinger Bands
        if (data.price < indicators.bbLower) {
            buySignals += 4;
            totalScore += 20;
            reasons.push('Price below lower Bollinger Band');
        } else if (data.price > indicators.bbUpper) {
            sellSignals += 4;
            totalScore += 20;
            reasons.push('Price above upper Bollinger Band');
        }
        maxPossibleScore += 20;
        
        // 4.2 Average True Range (ATR)
        if (indicators.atrRatio > 1.5) {
            // High volatility - reduce confidence
            totalScore *= 0.9;
            reasons.push('High volatility (reduced confidence)');
        } else if (indicators.atrRatio < 0.5) {
            // Low volatility - reduce confidence
            totalScore *= 0.8;
            reasons.push('Low volatility (reduced confidence)');
        }
        
        // 4.3 Keltner Channels
        if (data.price < indicators.kcLower) {
            buySignals += 3;
            totalScore += 15;
            reasons.push('Price below Keltner lower band');
        } else if (data.price > indicators.kcUpper) {
            sellSignals += 3;
            totalScore += 15;
            reasons.push('Price above Keltner upper band');
        }
        maxPossibleScore += 15;
        
        // 5. SUPPORT/RESISTANCE ANALYSIS (3 indicators)
        // 5.1 Pivot Points
        if (data.price > indicators.pivotR1) {
            sellSignals += 3;
            totalScore += 15;
            reasons.push('Above R1 resistance');
        } else if (data.price < indicators.pivotS1) {
            buySignals += 3;
            totalScore += 15;
            reasons.push('Below S1 support');
        }
        maxPossibleScore += 15;
        
        // 5.2 Fibonacci Retracement
        if (indicators.fibLevel === 'support') {
            buySignals += 4;
            totalScore += 20;
            reasons.push('At Fibonacci support level');
        } else if (indicators.fibLevel === 'resistance') {
            sellSignals += 4;
            totalScore += 20;
            reasons.push('At Fibonacci resistance level');
        }
        maxPossibleScore += 20;
        
        // 5.3 Price Action (Swing Highs/Lows)
        if (indicators.isSwingLow) {
            buySignals += 4;
            totalScore += 20;
            reasons.push('Swing low formation');
        } else if (indicators.isSwingHigh) {
            sellSignals += 4;
            totalScore += 20;
            reasons.push('Swing high formation');
        }
        maxPossibleScore += 20;
        
        // 6. MOMENTUM DIVERGENCE (2 indicators)
        // 6.1 RSI Divergence
        if (indicators.rsiDivergence === 'bullish') {
            buySignals += 5;
            totalScore += 25;
            reasons.push('Bullish RSI divergence');
        } else if (indicators.rsiDivergence === 'bearish') {
            sellSignals += 5;
            totalScore += 25;
            reasons.push('Bearish RSI divergence');
        }
        maxPossibleScore += 25;
        
        // 6.2 MACD Divergence
        if (indicators.macdDivergence === 'bullish') {
            buySignals += 4;
            totalScore += 20;
            reasons.push('Bullish MACD divergence');
        } else if (indicators.macdDivergence === 'bearish') {
            sellSignals += 4;
            totalScore += 20;
            reasons.push('Bearish MACD divergence');
        }
        maxPossibleScore += 20;
        
        // 7. MARKET STRUCTURE (2 indicators)
        // 7.1 Higher Highs/Lower Lows
        if (indicators.marketStructure === 'uptrend') {
            buySignals += 3;
            totalScore += 15;
            reasons.push('Higher highs and higher lows');
        } else if (indicators.marketStructure === 'downtrend') {
            sellSignals += 3;
            totalScore += 15;
            reasons.push('Lower highs and lower lows');
        }
        maxPossibleScore += 15;
        
        // 7.2 Price Position in Range
        if (indicators.pricePosition < 0.3) {
            buySignals += 2;
            totalScore += 10;
            reasons.push('Price in lower range');
        } else if (indicators.pricePosition > 0.7) {
            sellSignals += 2;
            totalScore += 10;
            reasons.push('Price in upper range');
        }
        maxPossibleScore += 10;
        
        // Calculate final confidence based on total score
        confidence = Math.min(1.0, totalScore / maxPossibleScore);
        
        // Determine side based on signal strength
        let finalSide = null;
        if (buySignals > sellSignals && buySignals >= 8) {
            finalSide = 'BUY';
        } else if (sellSignals > buySignals && sellSignals >= 8) {
            finalSide = 'SELL';
        }
        
        // Calculate dynamic AI levels based on current market conditions
        const aiLevels = this.calculateDynamicAITradeLevels(pair, data, indicators, finalSide);
        
        // Evaluate current stop loss and take profit levels
        const levelEvaluation = this.evaluateCurrentLevels(pair, data, indicators, aiLevels);
        
        // Adjust confidence based on level evaluation
        if (levelEvaluation.score > 0.7) {
            confidence *= 1.2; // Boost confidence if levels are good
            reasons.push('Optimal SL/TP levels');
        } else if (levelEvaluation.score < 0.3) {
            confidence *= 0.7; // Reduce confidence if levels are poor
            reasons.push('Poor SL/TP levels');
        }
        
        // Final decision criteria
        let shouldTrade = finalSide !== null && confidence >= 0.4 && aiLevels !== null;
        
        // Minimum risk/reward ratio check
        if (aiLevels && aiLevels.riskRewardRatio < 2.0) {
            shouldTrade = false;
            reasons.push('Risk/reward ratio too low (< 2:1)');
        }
        
        // Market volatility check
        if (indicators.atrRatio > 2.0) {
            confidence *= 0.8;
            reasons.push('Extreme volatility');
        }
        
        // Volume confirmation
        if (indicators.volumeRatio < 0.5) {
            confidence *= 0.9;
            reasons.push('Low volume');
        }
        
        return {
            shouldTrade: shouldTrade,
            side: finalSide,
            reason: reasons.slice(0, 5).join(', '), // Top 5 reasons
            confidence: Math.min(1.0, confidence),
            stopLoss: aiLevels?.stopLoss || null,
            takeProfit: aiLevels?.takeProfit || null,
            riskRewardRatio: aiLevels?.riskRewardRatio || null,
            levelEvaluation: levelEvaluation,
            indicators: indicators,
            buySignals: buySignals,
            sellSignals: sellSignals,
            totalScore: totalScore,
            maxPossibleScore: maxPossibleScore
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

        // Ensure minimum risk/reward ratio of 2.0:1 for 5% capital increase
        if (riskRewardRatio < 2.0) {
            if (side === 'BUY') {
                takeProfit = currentPrice + (risk * 2.0);
            } else {
                takeProfit = currentPrice - (risk * 2.0);
            }
            riskRewardRatio = 2.0;
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
     * OPTIMIZED Execute a trade for high-frequency scalping
     */
    async executeTrade(pair, side, price, reason = 'Signal', aiStopLoss = null, aiTakeProfit = null, aiConfidence = 1) {
        try {
            // Get current account balance (use live balance if available, otherwise demo balance)
            const accountBalance = (this.tradingMode === 'live' && this.liveBalance !== null) 
                ? this.liveBalance 
                : this.tradingStats.accountBalance;
            
            // OPTIMIZED: Calculate maximum investment based on account balance and risk management for scalping
            const maxRiskAmount = accountBalance * this.settings.maxRiskPerTrade; // 3% of account balance
            
            // Calculate current total active investment
            const totalActiveInvestment = Object.values(this.activeTrades).reduce((sum, trades) => {
                if (Array.isArray(trades)) {
                    return sum + trades.reduce((pairSum, trade) => pairSum + (trade.investment || 0), 0);
                }
                return sum;
            }, 0);
            
            // Calculate maximum allowed total investment (15% of account for scalping)
            const maxTotalInvestment = accountBalance * this.settings.maxTotalRisk;
            
            // Calculate remaining available investment
            const remainingInvestment = Math.max(0, maxTotalInvestment - totalActiveInvestment);
            
            // OPTIMIZED: Calculate maximum investment for this trade (considering remaining capital)
            const maxInvestmentAmount = Math.min(this.settings.maxInvestment, remainingInvestment, accountBalance * 0.15);
            
            this.debugLog(`[executeTrade] Account balance: £${accountBalance.toFixed(2)}, Current active: £${totalActiveInvestment.toFixed(2)}, Max total: £${maxTotalInvestment.toFixed(2)}, Remaining: £${remainingInvestment.toFixed(2)}, Max investment: £${maxInvestmentAmount.toFixed(2)}`, 'info');
            
            // OPTIMIZED: Calculate position size based on stop loss distance (aggressive risk management for scalping)
            let positionSize = 0;
            let investment = 0;
            
            if (aiStopLoss && aiStopLoss > 0) {
                const riskPerUnit = Math.abs(price - aiStopLoss);
                if (riskPerUnit > 0) {
                    // Calculate position size based on risk amount
                    positionSize = maxRiskAmount / riskPerUnit;
                    investment = positionSize * price;
                    
                    // Ensure we don't exceed max investment amount
                    if (investment > maxInvestmentAmount) {
                        positionSize = maxInvestmentAmount / price;
                        investment = maxInvestmentAmount;
                    }
                }
            }
            
            // Fallback to dynamic investment if no stop loss
            if (positionSize <= 0) {
                const dynamicInvestment = this.getDynamicInvestment(pair, aiConfidence);
                // OPTIMIZED: Scale dynamic investment based on account balance for scalping
                const scaledInvestment = Math.min(dynamicInvestment, maxInvestmentAmount);
                positionSize = scaledInvestment / price;
                investment = scaledInvestment;
            }
            
            // Check if we have any remaining capital to invest
            if (remainingInvestment <= 0) {
                this.debugLog(`[executeTrade] Blocked: no remaining capital available for ${pair} (total active: £${totalActiveInvestment.toFixed(2)}, max allowed: £${maxTotalInvestment.toFixed(2)})`, 'warning');
                return false;
            }
            
            // OPTIMIZED: Final safety check: ensure investment doesn't exceed account balance (more aggressive for scalping)
            if (investment > accountBalance * 0.90) { // Leave 10% buffer for scalping
                const maxAllowedInvestment = accountBalance * 0.90;
                positionSize = maxAllowedInvestment / price;
                investment = maxAllowedInvestment;
                this.debugLog(`[executeTrade] Investment capped to £${maxAllowedInvestment.toFixed(2)} (90% of account balance)`, 'warning');
            }
            
            // CRITICAL FIX: Now check if we can trade with the calculated investment amount
            if (!this.canTrade(pair, investment)) {
                this.debugLog(`[executeTrade] Blocked: canTrade returned false for ${pair} with investment £${investment.toFixed(2)}`, 'warning');
                return false;
            }
            
            // Calculate actual risk percentage
            const tradeRisk = this.calculateTradeRisk(pair, price, aiStopLoss || (price * 0.9));
            const actualRiskAmount = investment * (tradeRisk / 100);
            
            // Final safety check: ensure we're not over-risking
            if (actualRiskAmount > maxRiskAmount) {
                this.debugLog(`[executeTrade] Blocked: actual risk amount (£${actualRiskAmount.toFixed(2)}) exceeds max risk amount (£${maxRiskAmount.toFixed(2)})`, 'warning');
                return false;
            }
            
            if (positionSize <= 0 || investment <= 0) {
                this.debugLog(`[executeTrade] Blocked: position size or investment is zero (positionSize=${positionSize}, investment=${investment})`, 'warning');
                return false;
            }
            
            // Check total exposure across all active trades (using already calculated totalActiveInvestment)
            const totalExposure = totalActiveInvestment + investment;
            if (totalExposure > accountBalance * this.settings.maxTotalRisk) { // Use maxTotalRisk setting (15%)
                this.debugLog(`[executeTrade] Blocked: total exposure would be £${totalExposure.toFixed(2)} (${(totalExposure/accountBalance*100).toFixed(1)}% of account), max allowed ${(this.settings.maxTotalRisk*100).toFixed(1)}%`, 'warning');
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
            
            // Debug logging for investment amount
            this.debugLog(`[Trade Created] ${pair}: Final investment amount = £${investment.toFixed(2)}`, 'info');

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
            this.debugLog(`${modeIcon} ${side} ${pair}: £${investment.toFixed(2)} at £${price.toFixed(4)} | Qty: ${positionSize.toFixed(6)} | Risk: ${tradeRisk.toFixed(1)}% | Total Exposure: ${(totalExposure/accountBalance*100).toFixed(1)}% | Reason: ${reason}`, 'success');
            
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
                    orderId: orderResult?.txid?.[0],
                    confidence: Math.max(aiConfidence, 0.7) // Enforce minimum 0.7
                });
                // Update UI immediately after trade execution
                window.app.updateStatistics();
            }

            // Save trade to backend
            await this.backendAPI.saveTrade({
                trade_id: trade.id,
                pair: trade.pair,
                side: trade.side,
                entry_price: trade.entryPrice,
                quantity: trade.quantity,
                investment: trade.investment,
                timestamp: trade.timestamp,
                reason: trade.reason,
                mode: trade.mode,
                ai_stop_loss: trade.aiStopLoss,
                ai_take_profit: trade.aiTakeProfit,
                unrealized_pnl: trade.unrealizedPnL,
                risk_percentage: trade.riskPercentage,
                order_result: trade.orderResult
            });

            this.debugLog(`💰 Trade executed: ${trade.side} ${trade.pair} at £${trade.entryPrice.toFixed(4)}`, 'success');
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
        
        // Debug logging
        this.debugLog(`[Trade History] Added trade to history: ${pair} - £${pnl.toFixed(2)} (${reason})`, 'info');
        this.debugLog(`[Trade History] Total history length: ${this.tradeHistory.length}`, 'info');
        
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
            window.app.updatePreviousTrades();
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
                if (this.neuralNet && last.signals && last.signals.nnConfidence !== undefined) {
                    const features = this.extractFeaturesFromHistory(last);
                    const actionIdx = last.signals.side === 'BUY' ? 0 : last.signals.side === 'SELL' ? 1 : 2;
                    const reward = Math.max(-1, Math.min(1, pnl / 100)); // normalize
                    this.trainNeuralNet(features, actionIdx, reward);
                }
            }
        }

        // Save to trade history in backend
        await this.backendAPI.saveTradeHistory({
            trade_id: trade.id,
            pair: trade.pair,
            side: trade.side,
            entry_price: trade.entryPrice,
            exit_price: currentPrice,
            quantity: trade.quantity,
            investment: trade.investment,
            pnl: pnl,
            entry_time: trade.timestamp,
            exit_time: Date.now(),
            reason: reason,
            mode: trade.mode
        });

        // Remove from active trades in backend
        await this.backendAPI.deleteTrade(trade.id);

        this.debugLog(`📊 Trade closed: ${trade.side} ${trade.pair} - P&L: £${pnl.toFixed(2)} (${((pnl / trade.investment) * 100).toFixed(2)}%)`, 'success');
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
     * OPTIMIZED Check if we can execute a trade for high-frequency scalping
     */
    canTrade(pair, nextInvestment = 0) {
        // OPTIMIZED: Check if we already have active trades for this pair (allow more trades for scalping)
        if (this.activeTrades[pair] && this.activeTrades[pair].length >= 2) { // Reduced from 3 to 2 for scalping
            this.debugLog(`[canTrade] Blocked: already have max active trades for ${pair} (${this.activeTrades[pair].length}/2)`, 'warning');
            return false;
        }
        
        // OPTIMIZED: Check cooldown period for this asset (reduced for scalping)
        const lastTradeTime = this.riskManager.lastTradePerAsset[pair];
        const cooldownMs = this.settings.cooldownMinutes * 60 * 1000; // 30 seconds
        if (lastTradeTime && (Date.now() - lastTradeTime) < cooldownMs) {
            const remainingSeconds = Math.ceil((cooldownMs - (Date.now() - lastTradeTime)) / 1000);
            this.debugLog(`[canTrade] Blocked: ${pair} in cooldown (${remainingSeconds}s remaining)`, 'warning');
            return false;
        }
        
        // Check total active trades limit
        const totalActiveTrades = Object.values(this.activeTrades).reduce((sum, trades) => sum + (Array.isArray(trades) ? trades.length : 0), 0);
        if (totalActiveTrades >= this.settings.maxActiveTrades) {
            this.debugLog(`[canTrade] Blocked: max active trades reached (${totalActiveTrades}/${this.settings.maxActiveTrades})`, 'warning');
            return false;
        }
        
        // OPTIMIZED: Check daily loss limit (more aggressive for scalping)
        if (this.riskManager.dailyLoss <= -this.riskManager.maxDailyLoss) {
            this.debugLog('[canTrade] Blocked: daily loss limit reached', 'warning');
            return false;
        }
        
        // Check total risk exposure (risk %)
        if (this.riskManager.totalRiskExposure >= this.settings.maxTotalRisk) {
            this.debugLog(`[canTrade] Blocked: max total risk reached (${(this.riskManager.totalRiskExposure*100).toFixed(1)}%)`, 'warning');
            return false;
        }
        
        // OPTIMIZED: Check total invested capital exposure (enforce after refresh)
        const accountBalance = (this.tradingMode === 'live' && this.liveBalance !== null) 
            ? this.liveBalance 
            : this.tradingStats.accountBalance;
        const totalActiveInvestment = Object.values(this.activeTrades).reduce((sum, trades) => {
            if (Array.isArray(trades)) {
                return sum + trades.reduce((pairSum, trade) => pairSum + (trade.investment || 0), 0);
            }
            return sum;
        }, 0);
        const maxAllowedInvestment = accountBalance * this.settings.maxTotalRisk;
        if ((totalActiveInvestment + nextInvestment) > maxAllowedInvestment) {
            this.debugLog(`[canTrade] Blocked: total invested capital would be £${(totalActiveInvestment + nextInvestment).toFixed(2)} (max allowed: £${maxAllowedInvestment.toFixed(2)} = ${(this.settings.maxTotalRisk*100).toFixed(1)}% of account)`, 'warning');
            return false;
        }
        
        // OPTIMIZED: Check daily performance target
        const dailyReturn = this.tradingStats.todayPnL / accountBalance;
        if (dailyReturn >= this.performanceMetrics.dailyTarget) {
            this.debugLog(`[canTrade] Blocked: daily target reached (${(dailyReturn*100).toFixed(2)}%)`, 'info');
            return false;
        }
        
        this.debugLog(`[canTrade] Allowed: can trade ${pair}`, 'info');
        return true;
    }

    /**
     * Update performance metrics for tracking 4-7% daily returns
     */
    updatePerformanceMetrics() {
        const accountBalance = (this.tradingMode === 'live' && this.liveBalance !== null) 
            ? this.liveBalance 
            : this.tradingStats.accountBalance;
        
        // Calculate daily return
        const dailyReturn = this.tradingStats.todayPnL / accountBalance;
        
        // Calculate win rate
        const winRate = this.tradingStats.totalTrades > 0 ? 
            this.tradingStats.winningTrades / this.tradingStats.totalTrades : 0;
        
        // Calculate average trade duration (if we have trade history)
        if (this.tradeHistory.length > 0) {
            const recentTrades = this.tradeHistory.slice(-10); // Last 10 trades
            const totalDuration = recentTrades.reduce((sum, trade) => {
                if (trade.exitTime && trade.timestamp) {
                    return sum + (trade.exitTime - trade.timestamp);
                }
                return sum;
            }, 0);
            this.performanceMetrics.avgTradeDuration = totalDuration / recentTrades.length / (1000 * 60); // Convert to minutes
        }
        
        // Calculate Sharpe ratio (simplified)
        if (this.tradeHistory.length > 0) {
            const returns = this.tradeHistory.slice(-20).map(trade => trade.pnl / trade.investment);
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
            this.performanceMetrics.sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;
        }
        
        // Update max drawdown
        let maxDrawdown = 0;
        let peak = accountBalance;
        let currentBalance = accountBalance;
        
        for (const trade of this.tradeHistory.slice(-50)) {
            currentBalance += trade.pnl;
            if (currentBalance > peak) {
                peak = currentBalance;
            }
            const drawdown = (peak - currentBalance) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        this.performanceMetrics.maxDrawdown = maxDrawdown;
        
        this.debugLog(`📊 Performance: Daily Return: ${(dailyReturn*100).toFixed(2)}% | Win Rate: ${(winRate*100).toFixed(1)}% | Avg Duration: ${this.performanceMetrics.avgTradeDuration.toFixed(1)}min | Sharpe: ${this.performanceMetrics.sharpeRatio.toFixed(2)} | Max DD: ${(maxDrawdown*100).toFixed(1)}%`, 'info');
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
        const history = this.tradeHistory.slice(-limit);
        this.debugLog(`[getTradeHistory] Returning ${history.length} trades (limit: ${limit}, total: ${this.tradeHistory.length})`, 'info');
        return history;
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
        if (data.history) {
            // Merge backend history with local
            this.tradeHistory = Array.isArray(data.history) ? data.history : [];
        }
        if (data.activeTrades) this.activeTrades = data.activeTrades;
        
        this.saveSettings();
        this.debugLog('📥 Trading data imported', 'info');
    }

    /**
     * Fetch and store real OHLC data for charting
     */
    async fetchAndStoreOHLC(pair, interval = 1, limit = 1440) {
        if (!window.app || !window.app.binanceAPI) return;
        const binanceSymbol = window.app.binanceAPI.pairs[pair];
        if (!binanceSymbol) {
            this.debugLog(`[fetchAndStoreOHLC] No Binance symbol mapping found for ${pair}`, 'warning');
            return;
        }
        // Pass the display pair name, interval, and limit
        const ohlcData = await window.app.binanceAPI.getOHLCData(pair, interval);
        // Only keep the last 'limit' candles
        this.chartData[pair] = ohlcData && ohlcData.length > limit ? ohlcData.slice(-limit) : ohlcData;
    }

    /**
     * Load initial historical data for all pairs (1440 candles each)
     */
    async loadInitialHistoricalData() {
        if (!window.app || !window.app.binanceAPI || !window.app.binanceAPI.isConnected) {
            this.debugLog('❌ No API connection available for historical data loading', 'error');
            return;
        }

        this.debugLog('🔄 Loading initial historical data for all pairs...', 'info');
        const pairs = ['BTCGBP', 'XRPGBP', 'XLMGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
        
        for (const pair of pairs) {
            const binanceSymbol = window.app.binanceAPI.pairs[pair];
            if (!binanceSymbol) {
                this.debugLog(`[LOAD] No Binance symbol mapping found for ${pair}`, 'warning');
                continue;
            }
            
            this.debugLog(`[LOAD] Fetching 1440 candles for ${pair} (${binanceSymbol})...`, 'info');
            try {
                // Calculate the start time to get 1440 candles (1 minute each = 24 hours)
                const now = Date.now();
                const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                const startTime = now - oneDayMs;
                
                // Fetch data with explicit start time to ensure we get enough candles
                const ohlc = await window.app.binanceAPI.getOHLCData(pair, 1, startTime, 1);
                
                if (ohlc && ohlc.length >= 1440) {
                    this.chartData[pair] = ohlc.slice(-1440); // keep last 1440 candles
                    this.debugLog(`[LOAD] ✅ ${pair} candles loaded: ${this.chartData[pair].length}`);
                } else if (ohlc && ohlc.length >= 100) {
                    this.chartData[pair] = ohlc.slice(-100); // fallback to 100 if not enough data
                    this.debugLog(`[LOAD] ⚠️ ${pair} limited data: ${this.chartData[pair].length} candles (wanted 1440)`, 'warning');
                } else {
                    this.debugLog(`[LOAD] ⚠️ ${pair} insufficient data: ${ohlc?.length || 0} candles`, 'warning');
                }
            } catch (error) {
                this.debugLog(`[LOAD] ❌ Failed to fetch ${pair} data: ${error.message}`, 'error');
            }
        }
        
        this.debugLog('✅ Initial historical data loading complete', 'success');
    }

    /**
     * Force reload historical data for all pairs (1440 candles each)
     */
    async reloadAllHistoricalData() {
        if (!window.app || !window.app.binanceAPI) {
            this.debugLog('❌ No API connection available for historical data reload', 'error');
            return;
        }

        this.debugLog('🔄 Reloading historical data for all pairs...', 'info');
        const pairs = ['BTCGBP', 'XRPGBP', 'XLMGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
        
        for (const pair of pairs) {
            const binanceSymbol = window.app.binanceAPI.pairs[pair];
            if (!binanceSymbol) {
                this.debugLog(`[RELOAD] No Binance symbol mapping found for ${pair}`, 'warning');
                continue;
            }
            
            this.debugLog(`[RELOAD] Fetching 1440 candles for ${pair} (${binanceSymbol})...`, 'info');
            try {
                // Calculate the start time to get 1440 candles (1 minute each = 24 hours)
                const now = Date.now();
                const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                const startTime = now - oneDayMs;
                
                // Fetch data with explicit start time to ensure we get enough candles
                const ohlc = await window.app.binanceAPI.getOHLCData(pair, 1, startTime, 1);
                
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
        this.neuralNet = tf.sequential();
        this.neuralNet.add(tf.layers.dense({inputShape: [7], units: 16, activation: 'relu'}));
        this.neuralNet.add(tf.layers.dense({units: 8, activation: 'relu'}));
        this.neuralNet.add(tf.layers.dense({units: 3, activation: 'softmax'}));
        this.neuralNet.compile({optimizer: 'adam', loss: 'categoricalCrossentropy'});
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
        if (!this.neuralNet) return;
        // actionIdx: 0=buy, 1=sell, 2=hold
        const xs = tf.tensor2d([features]);
        const ys = tf.tensor2d([[actionIdx === 0 ? reward : 0, actionIdx === 1 ? reward : 0, actionIdx === 2 ? reward : 0]]);
        await this.neuralNet.fit(xs, ys, {epochs: 1, verbose: 0});
        xs.dispose(); ys.dispose();
    }

    // Get neural net action/confidence
    async neuralNetDecision(features) {
        if (!this.neuralNet) return {action: 'hold', confidence: 0};
        const xs = tf.tensor2d([features]);
        const preds = this.neuralNet.predict(xs);
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
     * OPTIMIZED Pre-train all AI models with historical data for 4-7% daily returns
     */
    async pretrainNeuralNetWithHistory() {
        if (!this.neuralNet || !this.lstmModel || !window.app || !window.app.binanceAPI) return;
        
        this.debugLog('🚀 Starting OPTIMIZED pre-training of all AI models for 4-7% daily returns...', 'info');
        
        const pairs = ['BTCGBP', 'XRPGBP', 'XLMGBP', 'LINKGBP', 'AAVEGBP', 'FILGBP'];
        
        for (const pair of pairs) {
            // Use Binance symbol for each pair
            const binanceSymbol = window.app.binanceAPI.pairs[pair];
            if (!binanceSymbol) {
                this.debugLog(`[PRETRAIN] No Binance symbol mapping found for ${pair}`, 'warning');
                continue;
            }
            
            this.debugLog(`🧠 Pre-training AI models with history for ${pair} (${binanceSymbol})...`, 'info');
            
            try {
                // Get 1-minute data for more granular training
                const ohlc = await window.app.binanceAPI.getOHLCData(pair, 1, null, 5); // 1min candles, 5 years
                if (!ohlc || ohlc.length < 1000) {
                    this.debugLog(`[PRETRAIN] ⚠️ ${pair} insufficient data: ${ohlc?.length || 0} candles`, 'warning');
                    continue;
                }
                
                // Train LSTM model
                await this.trainLSTMWithHistory(pair, ohlc);
                
                // Train Neural Network
                await this.trainNeuralNetWithHistory(pair, ohlc);
                
                // Train Ensemble Model
                await this.trainEnsembleWithHistory(pair, ohlc);
                
                this.debugLog(`✅ AI pre-training complete for ${pair}.`, 'success');
                
            } catch (error) {
                this.debugLog(`[PRETRAIN] ❌ Failed to fetch ${pair} data: ${error.message}`, 'error');
            }
        }
        
        this.debugLog('🎯 OPTIMIZED AI pre-training complete! All models ready for 4-7% daily returns!', 'success');
    }

    /**
     * Train LSTM model with historical data
     */
    async trainLSTMWithHistory(pair, ohlc) {
        if (!this.lstmModel || !this.isLSTMReady) return;
        
        try {
            const sequences = [];
            const targets = [];
            
            // Create sequences for LSTM training
            for (let i = this.lstmConfig.sequenceLength; i < ohlc.length - this.lstmConfig.predictionHorizon; i++) {
                const sequence = [];
                
                // Create sequence of features
                for (let j = i - this.lstmConfig.sequenceLength; j < i; j++) {
                    const candle = ohlc[j];
                    const features = [
                        candle.open,
                        candle.high,
                        candle.low,
                        candle.close,
                        candle.volume || 1000,
                        this.calculateRSI(ohlc.slice(0, j + 1).map(d => d.close), 14),
                        this.calculateEMA(ohlc.slice(0, j + 1).map(d => d.close), 12) - 
                        this.calculateEMA(ohlc.slice(0, j + 1).map(d => d.close), 26),
                        (candle.volume || 1000) / (ohlc.slice(Math.max(0, j - 50), j + 1).reduce((sum, d) => sum + (d.volume || 1000), 0) / Math.min(50, j + 1))
                    ];
                    sequence.push(features);
                }
                
                // Create target (price change, direction, confidence)
                const currentPrice = ohlc[i].close;
                const futurePrice = ohlc[i + this.lstmConfig.predictionHorizon].close;
                const priceChange = (futurePrice - currentPrice) / currentPrice;
                const direction = priceChange > 0 ? 1 : priceChange < 0 ? -1 : 0;
                const confidence = Math.abs(priceChange);
                
                sequences.push(sequence);
                targets.push([priceChange, direction, confidence]);
            }
            
            // Convert to tensors
            const xs = tf.tensor3d(sequences);
            const ys = tf.tensor2d(targets);
            
            // Train LSTM
            await this.lstmModel.fit(xs, ys, {
                epochs: 5,
                batchSize: 32,
                verbose: 0,
                validationSplit: 0.2
            });
            
            // Clean up tensors
            xs.dispose();
            ys.dispose();
            
            this.debugLog(`✅ LSTM training complete for ${pair}`, 'success');
            
        } catch (error) {
            this.debugLog(`❌ LSTM training failed for ${pair}: ${error.message}`, 'error');
        }
    }

    /**
     * Train Neural Network with historical data
     */
    async trainNeuralNetWithHistory(pair, ohlc) {
        if (!this.neuralNet || !this.isNeuralNetReady) return;
        
        try {
            const features = [];
            const targets = [];
            
            // For each bar, extract features and simulate a trade
            for (let i = 50; i < ohlc.length - 1; i++) {
                const chartData = ohlc.slice(i-49, i+1); // last 50 bars
                const indicators = this.calculateAllIndicators(chartData, { price: ohlc[i].close });
                const featureVector = this.extractEnhancedFeatures(indicators, { price: ohlc[i].close });
                
                // Simulate: if price rises next bar, label as BUY; if falls, SELL; else HOLD
                const nextClose = ohlc[i+1].close;
                const currentClose = ohlc[i].close;
                const priceChange = (nextClose - currentClose) / currentClose;
                
                let actionIdx = 2; // hold
                if (priceChange > 0.001) actionIdx = 0; // buy (0.1% threshold)
                else if (priceChange < -0.001) actionIdx = 1; // sell
                
                features.push(featureVector);
                targets.push([actionIdx === 0 ? 1 : 0, actionIdx === 1 ? 1 : 0, actionIdx === 2 ? 1 : 0]);
            }
            
            // Convert to tensors
            const xs = tf.tensor2d(features);
            const ys = tf.tensor2d(targets);
            
            // Train Neural Network
            await this.neuralNet.fit(xs, ys, {
                epochs: 10,
                batchSize: 32,
                verbose: 0,
                validationSplit: 0.2
            });
            
            // Clean up tensors
            xs.dispose();
            ys.dispose();
            
            this.debugLog(`✅ Neural Network training complete for ${pair}`, 'success');
            
        } catch (error) {
            this.debugLog(`❌ Neural Network training failed for ${pair}: ${error.message}`, 'error');
        }
    }

    /**
     * Train Ensemble Model with historical data
     */
    async trainEnsembleWithHistory(pair, ohlc) {
        if (!this.ensembleModel) return;
        
        try {
            const features = [];
            const targets = [];
            
            // For each bar, create ensemble features
            for (let i = 50; i < ohlc.length - 1; i++) {
                const chartData = ohlc.slice(i-49, i+1);
                const indicators = this.calculateAllIndicators(chartData, { price: ohlc[i].close });
                
                // Create ensemble features (15 features total)
                const ensembleFeatures = [
                    // LSTM-like features (3)
                    (ohlc[i].close - ohlc[i-1].close) / ohlc[i-1].close,
                    indicators.rsi / 100,
                    indicators.volumeRatio / 10,
                    
                    // Technical signals (3)
                    indicators.macd / 100,
                    indicators.stochK / 100,
                    indicators.adx / 100,
                    
                    // Neural net features (3)
                    indicators.ema12 / indicators.ema26,
                    indicators.bbUpper / indicators.bbLower,
                    indicators.atrRatio,
                    
                    // Market structure (3)
                    indicators.marketStructure === 'uptrend' ? 1 : indicators.marketStructure === 'downtrend' ? -1 : 0,
                    indicators.pricePosition,
                    indicators.obvTrend / 1000,
                    
                    // Volume analysis (3)
                    indicators.volumeRatio,
                    indicators.vptTrend / 1000,
                    indicators.volumeRatio > 1.5 ? 1 : 0
                ];
                
                // Create target
                const nextClose = ohlc[i+1].close;
                const currentClose = ohlc[i].close;
                const priceChange = (nextClose - currentClose) / currentClose;
                
                let actionIdx = 2; // hold
                if (priceChange > 0.001) actionIdx = 0; // buy
                else if (priceChange < -0.001) actionIdx = 1; // sell
                
                features.push(ensembleFeatures);
                targets.push([actionIdx === 0 ? 1 : 0, actionIdx === 1 ? 1 : 0, actionIdx === 2 ? 1 : 0]);
            }
            
            // Convert to tensors
            const xs = tf.tensor2d(features);
            const ys = tf.tensor2d(targets);
            
            // Train Ensemble
            await this.ensembleModel.fit(xs, ys, {
                epochs: 8,
                batchSize: 32,
                verbose: 0,
                validationSplit: 0.2
            });
            
            // Clean up tensors
            xs.dispose();
            ys.dispose();
            
            this.debugLog(`✅ Ensemble training complete for ${pair}`, 'success');
            
        } catch (error) {
            this.debugLog(`❌ Ensemble training failed for ${pair}: ${error.message}`, 'error');
        }
    }

    // OPTIMIZED Dynamic position sizing based on AI confidence for high-frequency scalping
    getDynamicInvestment(pair, aiConfidence) {
        // Get current account balance
        const accountBalance = (this.tradingMode === 'live' && this.liveBalance !== null) 
            ? this.liveBalance 
            : this.tradingStats.accountBalance;
        
        // Calculate current total active investment
        const totalActiveInvestment = Object.values(this.activeTrades).reduce((sum, trades) => {
            if (Array.isArray(trades)) {
                return sum + trades.reduce((pairSum, trade) => pairSum + (trade.investment || 0), 0);
            }
            return sum;
        }, 0);
        
        // OPTIMIZED: Calculate maximum allowed total investment (15% of account for scalping)
        const maxTotalInvestment = accountBalance * this.settings.maxTotalRisk;
        
        // Calculate remaining available investment
        const remainingInvestment = Math.max(0, maxTotalInvestment - totalActiveInvestment);
        
        // OPTIMIZED: Calculate maximum investment as percentage of account balance (aggressive for scalping)
        const maxAccountPercentage = 0.10; // Max 10% of account per trade (aggressive for scalping)
        const maxInvestmentFromAccount = accountBalance * maxAccountPercentage;
        
        // Use the smallest of: maxInvestment setting, maxAccountPercentage, or remaining investment
        const maxInvestment = Math.min(this.settings.maxInvestment, maxInvestmentFromAccount, remainingInvestment);
        
        // OPTIMIZED: Scale investment based on AI confidence (50% to 100% of max for scalping)
        const min = 0.5 * maxInvestment; // Increased from 30% to 50%
        const max = maxInvestment;
        const scaled = min + (max - min) * Math.min(Math.max(aiConfidence, 0), 1);
        
        // OPTIMIZED: Boost investment for high-confidence LSTM predictions
        let finalInvestment = scaled;
        if (aiConfidence > 0.7) {
            finalInvestment *= 1.2; // 20% boost for high confidence
        }
        
        this.debugLog(`[AI] OPTIMIZED Dynamic investment for ${pair}: £${finalInvestment.toFixed(2)} (confidence: ${aiConfidence}, max: £${maxInvestment.toFixed(2)}, remaining: £${remainingInvestment.toFixed(2)}, account: £${accountBalance.toFixed(2)})`, 'info');
        return finalInvestment;
    }

    /**
     * Load all data from backend
     */
    async loadFromBackend() {
        try {
            this.debugLog('🔄 Loading data from backend...', 'info');
            
            // Test backend connection first
            const isConnected = await this.backendAPI.testConnection();
            if (!isConnected) {
                this.debugLog('❌ Backend server not available', 'error');
                return false;
            }

            // Load data into trading bot
            const success = await this.backendAPI.loadIntoBot(this);
            if (success) {
                this.debugLog('✅ Data loaded from backend successfully', 'success');
                return true;
            } else {
                this.debugLog('❌ Failed to load data from backend', 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error loading from backend: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Save all data to backend
     */
    async saveToBackend() {
        try {
            this.debugLog('🔄 Saving data to backend...', 'info');
            
            // Test backend connection first
            const isConnected = await this.backendAPI.testConnection();
            if (!isConnected) {
                this.debugLog('❌ Backend server not available', 'error');
                return false;
            }

            // Sync data to backend
            const success = await this.backendAPI.syncFromBot(this);
            if (success) {
                this.debugLog('✅ Data saved to backend successfully', 'success');
                return true;
            } else {
                this.debugLog('❌ Failed to save data to backend', 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error saving to backend: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Auto-save data periodically
     */
    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(async () => {
            if (this.isTrading) {
                await this.saveToBackend();
            }
        }, 30000); // Save every 30 seconds when trading
        
        this.debugLog('✅ Auto-save enabled (every 30 seconds when trading)', 'info');
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            this.debugLog('🛑 Auto-save disabled', 'info');
        }
    }

    /**
     * Start background sync polling
     */
    startBackgroundSync() {
        if (this.backgroundSyncInterval) {
            clearInterval(this.backgroundSyncInterval);
        }
        
        this.backgroundSyncInterval = setInterval(async () => {
            await this.pollBackgroundSync();
        }, 15000); // Poll every 15 seconds
        
        this.debugLog('✅ Background sync polling enabled (every 15 seconds)', 'info');
    }

    /**
     * Stop background sync polling
     */
    stopBackgroundSync() {
        if (this.backgroundSyncInterval) {
            clearInterval(this.backgroundSyncInterval);
            this.backgroundSyncInterval = null;
            this.debugLog('🛑 Background sync polling disabled', 'info');
        }
    }

    /**
     * Poll background sync data from backend
     */
    async pollBackgroundSync() {
        try {
            const syncData = await this.backendAPI.getBackgroundSyncData();
            if (syncData) {
                await this.applyBackgroundSyncData(syncData);
            }
        } catch (error) {
            this.debugLog(`❌ Background sync polling failed: ${error.message}`, 'error');
        }
    }

    /**
     * Apply background sync data to trading bot
     */
    async applyBackgroundSyncData(syncData) {
        try {
            // Update active trades with real-time data
            if (syncData.active_trades && Array.isArray(syncData.active_trades)) {
                this.activeTrades = {};
                syncData.active_trades.forEach(trade => {
                    if (!this.activeTrades[trade.pair]) {
                        this.activeTrades[trade.pair] = [];
                    }
                    this.activeTrades[trade.pair].push({
                        id: trade.trade_id,
                        pair: trade.pair,
                        side: trade.side,
                        entryPrice: trade.entry_price,
                        quantity: trade.quantity,
                        investment: trade.investment,
                        timestamp: trade.timestamp,
                        reason: trade.reason,
                        mode: trade.mode,
                        aiStopLoss: trade.ai_stop_loss,
                        aiTakeProfit: trade.ai_take_profit,
                        unrealizedPnL: trade.unrealized_pnl || 0,
                        riskPercentage: trade.risk_percentage,
                        orderResult: trade.order_result
                    });
                });
            }

            // Update trade history
            if (syncData.trade_history && Array.isArray(syncData.trade_history)) {
                this.tradeHistory = syncData.trade_history.map(trade => ({
                    id: trade.trade_id,
                    pair: trade.pair,
                    side: trade.side,
                    entryPrice: trade.entry_price,
                    exitPrice: trade.exit_price,
                    quantity: trade.quantity,
                    investment: trade.investment,
                    pnl: trade.pnl,
                    timestamp: trade.entry_time,
                    exitTime: trade.exit_time,
                    reason: trade.reason,
                    mode: trade.mode
                }));
            }

            // Update statistics
            if (syncData.statistics) {
                this.tradingStats = {
                    accountBalance: syncData.statistics.account_balance || 1000,
                    totalPnL: syncData.statistics.total_pnl || 0,
                    todayPnL: syncData.statistics.today_pnl || 0,
                    totalTrades: syncData.statistics.total_trades || 0,
                    winningTrades: syncData.statistics.winning_trades || 0,
                    losingTrades: syncData.statistics.losing_trades || 0,
                    winRate: syncData.statistics.win_rate || 0,
                    lastResetDate: syncData.statistics.last_reset_date || new Date().toDateString()
                };
            }

            // Update UI if app is available
            if (window.app) {
                window.app.updateActiveTrades();
                window.app.updatePreviousTrades();
                window.app.updateStatistics();
            }

            this.debugLog(`📊 Background sync applied: ${syncData.active_trades?.length || 0} active trades, ${syncData.trade_history?.length || 0} history records`, 'info');
            
        } catch (error) {
            this.debugLog(`❌ Failed to apply background sync data: ${error.message}`, 'error');
        }
    }

    // ... existing code ...
    recalculateAllUnrealizedPnL(pairData) {
        Object.keys(this.activeTrades).forEach(pair => {
            const trades = this.activeTrades[pair];
            if (Array.isArray(trades)) {
                const currentPrice = pairData[pair]?.price;
                if (currentPrice) {
                    trades.forEach(trade => {
                        trade.unrealizedPnL = this.calculatePnL(trade, currentPrice);
                    });
                }
            }
        });
    }
    // ... existing code ...

    /**
     * Calculate all 20 statistical indicators for comprehensive analysis
     */
    calculateAllIndicators(chartData, data) {
        const prices = chartData.map(d => d.close);
        const highs = chartData.map(d => d.high);
        const lows = chartData.map(d => d.low);
        const volumes = chartData.map(d => d.volume || 1000);
        const currentPrice = data.price;
        
        // 1. TREND INDICATORS
        // 1.1 Simple Moving Averages
        const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
        const sma200 = prices.slice(-200).reduce((a, b) => a + b, 0) / 200;
        
        // 1.2 Exponential Moving Averages
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        
        // 1.3 ADX (Average Directional Index)
        const adx = this.calculateADX(chartData, 14);
        
        // 2. MOMENTUM INDICATORS
        // 2.1 RSI
        const rsi = this.calculateRSI(prices, 14);
        
        // 2.2 Stochastic Oscillator
        const stoch = this.calculateStochastic(chartData, 14);
        const stochK = stoch.k;
        const stochD = stoch.d;
        
        // 2.3 Williams %R
        const williamsR = this.calculateWilliamsR(chartData, 14);
        
        // 2.4 MACD
        const macd = ema12 - ema26;
        const macdSignal = this.calculateEMA(prices.map((_, i) => i < 26 ? 0 : macd), 9);
        
        // 3. VOLUME INDICATORS
        // 3.1 Volume Ratio
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.slice(-50).reduce((a, b) => a + b, 0) / 50;
        const volumeRatio = currentVolume / avgVolume;
        
        // 3.2 On-Balance Volume (OBV)
        const obv = this.calculateOBV(chartData);
        const obvTrend = this.calculateTrend(obv.slice(-20));
        
        // 3.3 Volume Price Trend (VPT)
        const vpt = this.calculateVPT(chartData);
        const vptTrend = this.calculateTrend(vpt.slice(-20));
        
        // 4. VOLATILITY INDICATORS
        // 4.1 Bollinger Bands
        const bb = this.calculateBollingerBands(prices, 20, 2);
        const bbUpper = bb.upper;
        const bbMiddle = bb.middle;
        const bbLower = bb.lower;
        
        // 4.2 Average True Range (ATR)
        const atr = this.calculateATR(chartData, 14);
        const atrRatio = atr / currentPrice;
        
        // 4.3 Keltner Channels
        const kc = this.calculateKeltnerChannels(chartData, 20, 2);
        const kcUpper = kc.upper;
        const kcMiddle = kc.middle;
        const kcLower = kc.lower;
        
        // 5. SUPPORT/RESISTANCE
        // 5.1 Pivot Points
        const pivot = this.calculatePivotPoints(chartData);
        
        // 5.2 Fibonacci Retracement
        const fibLevel = this.calculateFibonacciLevel(chartData, currentPrice);
        
        // 5.3 Swing Highs/Lows
        const isSwingHigh = this.isSwingHigh(prices, 5);
        const isSwingLow = this.isSwingLow(prices, 5);
        
        // 6. DIVERGENCE ANALYSIS
        // 6.1 RSI Divergence
        const rsiDivergence = this.detectRSIDivergence(prices, chartData);
        
        // 6.2 MACD Divergence
        const macdDivergence = this.detectMACDDivergence(prices, chartData);
        
        // 7. MARKET STRUCTURE
        // 7.1 Higher Highs/Lower Lows
        const marketStructure = this.analyzeMarketStructure(prices);
        
        // 7.2 Price Position in Range
        const pricePosition = this.calculatePricePosition(prices, currentPrice);
        
        return {
            // Trend Indicators
            sma20, sma50, sma200,
            ema12, ema26,
            adx,
            
            // Momentum Indicators
            rsi,
            stochK, stochD,
            williamsR,
            macd, macdSignal,
            
            // Volume Indicators
            volumeRatio,
            obvTrend,
            vptTrend,
            
            // Volatility Indicators
            bbUpper, bbMiddle, bbLower,
            atr, atrRatio,
            kcUpper, kcMiddle, kcLower,
            
            // Support/Resistance
            pivot,
            fibLevel,
            isSwingHigh, isSwingLow,
            
            // Divergence
            rsiDivergence,
            macdDivergence,
            
            // Market Structure
            marketStructure,
            pricePosition
        };
    }

    /**
     * Calculate dynamic AI trade levels based on current market conditions
     */
    calculateDynamicAITradeLevels(pair, data, indicators, side) {
        const currentPrice = data.price;
        if (!currentPrice || currentPrice <= 0) {
            this.debugLog(`[AI] Invalid current price for ${pair}: ${currentPrice}`, 'warning');
            return null;
        }
        
        // Get chart data for calculations
        const chartData = this.getChartData(pair, 'candlestick');
        if (!chartData || chartData.length < 20) {
            this.debugLog(`[AI] Insufficient chart data for ${pair}: ${chartData?.length || 0} candles`, 'warning');
            return null;
        }

        let stopLoss, takeProfit, riskRewardRatio;

        if (side === 'BUY') {
            // For BUY trades - Multiple stop loss candidates
            const stopLossCandidates = [];
            
            // 1. Bollinger Band lower
            if (indicators.bbLower && indicators.bbLower < currentPrice) {
                stopLossCandidates.push(indicators.bbLower * 0.995);
            }
            
            // 2. Keltner Channel lower
            if (indicators.kcLower && indicators.kcLower < currentPrice) {
                stopLossCandidates.push(indicators.kcLower * 0.995);
            }
            
            // 3. Pivot Point S1
            if (indicators.pivot && indicators.pivot.s1 && indicators.pivot.s1 < currentPrice) {
                stopLossCandidates.push(indicators.pivot.s1 * 0.995);
            }
            
            // 4. Recent swing low
            const recentLow = Math.min(...chartData.slice(-20).map(d => d.low));
            if (recentLow < currentPrice) {
                stopLossCandidates.push(recentLow * 0.995);
            }
            
            // 5. ATR-based stop loss (2x ATR)
            const atrStop = currentPrice - (indicators.atr * 2);
            if (atrStop > 0) {
                stopLossCandidates.push(atrStop);
            }
            
            // Choose the highest stop loss (closest to current price)
            stopLoss = Math.max(...stopLossCandidates);
            
            // Multiple take profit candidates
            const takeProfitCandidates = [];
            
            // 1. Bollinger Band upper
            if (indicators.bbUpper && indicators.bbUpper > currentPrice) {
                takeProfitCandidates.push(indicators.bbUpper * 1.005);
            }
            
            // 2. Keltner Channel upper
            if (indicators.kcUpper && indicators.kcUpper > currentPrice) {
                takeProfitCandidates.push(indicators.kcUpper * 1.005);
            }
            
            // 3. Pivot Point R1
            if (indicators.pivot && indicators.pivot.r1 && indicators.pivot.r1 > currentPrice) {
                takeProfitCandidates.push(indicators.pivot.r1 * 1.005);
            }
            
            // 4. Recent swing high
            const recentHigh = Math.max(...chartData.slice(-20).map(d => d.high));
            if (recentHigh > currentPrice) {
                takeProfitCandidates.push(recentHigh * 1.005);
            }
            
            // 5. ATR-based take profit (3x ATR)
            const atrTarget = currentPrice + (indicators.atr * 3);
            takeProfitCandidates.push(atrTarget);
            
            // 6. Risk/Reward based (minimum 2:1)
            const risk = currentPrice - stopLoss;
            const minReward = currentPrice + (risk * 2);
            takeProfitCandidates.push(minReward);
            
            // Choose the lowest take profit (closest to current price)
            takeProfit = Math.min(...takeProfitCandidates);

        } else if (side === 'SELL') {
            // For SELL trades - Multiple stop loss candidates
            const stopLossCandidates = [];
            
            // 1. Bollinger Band upper
            if (indicators.bbUpper && indicators.bbUpper > currentPrice) {
                stopLossCandidates.push(indicators.bbUpper * 1.005);
            }
            
            // 2. Keltner Channel upper
            if (indicators.kcUpper && indicators.kcUpper > currentPrice) {
                stopLossCandidates.push(indicators.kcUpper * 1.005);
            }
            
            // 3. Pivot Point R1
            if (indicators.pivot && indicators.pivot.r1 && indicators.pivot.r1 > currentPrice) {
                stopLossCandidates.push(indicators.pivot.r1 * 1.005);
            }
            
            // 4. Recent swing high
            const recentHigh = Math.max(...chartData.slice(-20).map(d => d.high));
            if (recentHigh > currentPrice) {
                stopLossCandidates.push(recentHigh * 1.005);
            }
            
            // 5. ATR-based stop loss (2x ATR)
            const atrStop = currentPrice + (indicators.atr * 2);
            stopLossCandidates.push(atrStop);
            
            // Choose the lowest stop loss (closest to current price)
            stopLoss = Math.min(...stopLossCandidates);
            
            // Multiple take profit candidates
            const takeProfitCandidates = [];
            
            // 1. Bollinger Band lower
            if (indicators.bbLower && indicators.bbLower < currentPrice) {
                takeProfitCandidates.push(indicators.bbLower * 0.995);
            }
            
            // 2. Keltner Channel lower
            if (indicators.kcLower && indicators.kcLower < currentPrice) {
                takeProfitCandidates.push(indicators.kcLower * 0.995);
            }
            
            // 3. Pivot Point S1
            if (indicators.pivot && indicators.pivot.s1 && indicators.pivot.s1 < currentPrice) {
                takeProfitCandidates.push(indicators.pivot.s1 * 0.995);
            }
            
            // 4. Recent swing low
            const recentLow = Math.min(...chartData.slice(-20).map(d => d.low));
            if (recentLow < currentPrice) {
                takeProfitCandidates.push(recentLow * 0.995);
            }
            
            // 5. ATR-based take profit (3x ATR)
            const atrTarget = currentPrice - (indicators.atr * 3);
            takeProfitCandidates.push(atrTarget);
            
            // 6. Risk/Reward based (minimum 2:1)
            const risk = stopLoss - currentPrice;
            const minReward = currentPrice - (risk * 2);
            takeProfitCandidates.push(minReward);
            
            // Choose the highest take profit (closest to current price)
            takeProfit = Math.max(...takeProfitCandidates);
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

        // Ensure minimum risk/reward ratio of 2.0:1
        if (riskRewardRatio < 2.0) {
            if (side === 'BUY') {
                takeProfit = currentPrice + (risk * 2.0);
            } else {
                takeProfit = currentPrice - (risk * 2.0);
            }
            riskRewardRatio = 2.0;
        }

        return {
            stopLoss: parseFloat(stopLoss.toFixed(4)),
            takeProfit: parseFloat(takeProfit.toFixed(4)),
            riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2))
        };
    }

    /**
     * Evaluate current stop loss and take profit levels
     */
    evaluateCurrentLevels(pair, data, indicators, aiLevels) {
        if (!aiLevels) return { score: 0, reasons: ['No AI levels available'] };
        
        const currentPrice = data.price;
        let score = 0;
        let maxScore = 0;
        const reasons = [];
        
        // 1. Risk/Reward Ratio Evaluation (30 points)
        maxScore += 30;
        if (aiLevels.riskRewardRatio >= 3.0) {
            score += 30;
            reasons.push('Excellent R/R ratio (≥3:1)');
        } else if (aiLevels.riskRewardRatio >= 2.5) {
            score += 25;
            reasons.push('Good R/R ratio (≥2.5:1)');
        } else if (aiLevels.riskRewardRatio >= 2.0) {
            score += 20;
            reasons.push('Acceptable R/R ratio (≥2:1)');
        } else {
            reasons.push('Poor R/R ratio (<2:1)');
        }
        
        // 2. Stop Loss Quality (25 points)
        maxScore += 25;
        const stopLossDistance = Math.abs(currentPrice - aiLevels.stopLoss) / currentPrice * 100;
        
        if (stopLossDistance <= 2.0) {
            score += 25;
            reasons.push('Tight stop loss (≤2%)');
        } else if (stopLossDistance <= 3.0) {
            score += 20;
            reasons.push('Reasonable stop loss (≤3%)');
        } else if (stopLossDistance <= 5.0) {
            score += 15;
            reasons.push('Wide stop loss (≤5%)');
        } else {
            reasons.push('Very wide stop loss (>5%)');
        }
        
        // 3. Take Profit Realism (25 points)
        maxScore += 25;
        const takeProfitDistance = Math.abs(aiLevels.takeProfit - currentPrice) / currentPrice * 100;
        
        if (takeProfitDistance <= 6.0) {
            score += 25;
            reasons.push('Realistic take profit (≤6%)');
        } else if (takeProfitDistance <= 10.0) {
            score += 20;
            reasons.push('Moderate take profit (≤10%)');
        } else if (takeProfitDistance <= 15.0) {
            score += 15;
            reasons.push('Aggressive take profit (≤15%)');
        } else {
            reasons.push('Very aggressive take profit (>15%)');
        }
        
        // 4. Support/Resistance Alignment (20 points)
        maxScore += 20;
        let alignmentScore = 0;
        
        // Check if stop loss is near support
        if (indicators.bbLower && Math.abs(aiLevels.stopLoss - indicators.bbLower) / currentPrice < 0.01) {
            alignmentScore += 10;
            reasons.push('Stop loss near Bollinger support');
        }
        if (indicators.kcLower && Math.abs(aiLevels.stopLoss - indicators.kcLower) / currentPrice < 0.01) {
            alignmentScore += 10;
            reasons.push('Stop loss near Keltner support');
        }
        
        // Check if take profit is near resistance
        if (indicators.bbUpper && Math.abs(aiLevels.takeProfit - indicators.bbUpper) / currentPrice < 0.01) {
            alignmentScore += 10;
            reasons.push('Take profit near Bollinger resistance');
        }
        if (indicators.kcUpper && Math.abs(aiLevels.takeProfit - indicators.kcUpper) / currentPrice < 0.01) {
            alignmentScore += 10;
            reasons.push('Take profit near Keltner resistance');
        }
        
        score += Math.min(20, alignmentScore);
        
        // Calculate final score
        const finalScore = score / maxScore;
        
        return {
            score: finalScore,
            reasons: reasons.slice(0, 3), // Top 3 reasons
            riskRewardRatio: aiLevels.riskRewardRatio,
            stopLossDistance: stopLossDistance,
            takeProfitDistance: takeProfitDistance
        };
    }

    /**
     * Calculate Stochastic Oscillator
     */
    calculateStochastic(chartData, period = 14) {
        if (chartData.length < period) {
            return { k: 50, d: 50 };
        }
        
        const recentData = chartData.slice(-period);
        const highestHigh = Math.max(...recentData.map(d => d.high));
        const lowestLow = Math.min(...recentData.map(d => d.low));
        const currentClose = recentData[recentData.length - 1].close;
        
        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        const d = this.calculateEMA([k], 3); // 3-period EMA of %K
        
        return { k, d };
    }

    /**
     * Calculate Williams %R
     */
    calculateWilliamsR(chartData, period = 14) {
        if (chartData.length < period) {
            return -50;
        }
        
        const recentData = chartData.slice(-period);
        const highestHigh = Math.max(...recentData.map(d => d.high));
        const lowestLow = Math.min(...recentData.map(d => d.low));
        const currentClose = recentData[recentData.length - 1].close;
        
        return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    }

    /**
     * Calculate On-Balance Volume (OBV)
     */
    calculateOBV(chartData) {
        let obv = 0;
        const obvValues = [];
        
        for (let i = 1; i < chartData.length; i++) {
            const currentClose = chartData[i].close;
            const prevClose = chartData[i - 1].close;
            const volume = chartData[i].volume || 1000;
            
            if (currentClose > prevClose) {
                obv += volume;
            } else if (currentClose < prevClose) {
                obv -= volume;
            }
            
            obvValues.push(obv);
        }
        
        return obvValues;
    }

    /**
     * Calculate Volume Price Trend (VPT)
     */
    calculateVPT(chartData) {
        let vpt = 0;
        const vptValues = [];
        
        for (let i = 1; i < chartData.length; i++) {
            const currentClose = chartData[i].close;
            const prevClose = chartData[i - 1].close;
            const volume = chartData[i].volume || 1000;
            
            const priceChange = (currentClose - prevClose) / prevClose;
            vpt += volume * priceChange;
            
            vptValues.push(vpt);
        }
        
        return vptValues;
    }

    /**
     * Calculate trend direction from array of values
     */
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        return last - first;
    }

    /**
     * Calculate Bollinger Bands
     */
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) {
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            return { upper: avg, middle: avg, lower: avg };
        }
        
        const recentPrices = prices.slice(-period);
        const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
        
        const variance = recentPrices.reduce((sum, price) => {
            return sum + Math.pow(price - sma, 2);
        }, 0) / period;
        
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    /**
     * Calculate Keltner Channels
     */
    calculateKeltnerChannels(chartData, period = 20, multiplier = 2) {
        if (chartData.length < period) {
            const avg = chartData.reduce((sum, d) => sum + d.close, 0) / chartData.length;
            return { upper: avg, middle: avg, lower: avg };
        }
        
        const recentData = chartData.slice(-period);
        const sma = recentData.reduce((sum, d) => sum + d.close, 0) / period;
        const atr = this.calculateATR(recentData, period);
        
        return {
            upper: sma + (atr * multiplier),
            middle: sma,
            lower: sma - (atr * multiplier)
        };
    }

    /**
     * Calculate Pivot Points
     */
    calculatePivotPoints(chartData) {
        if (chartData.length === 0) return null;
        
        const lastCandle = chartData[chartData.length - 1];
        const high = lastCandle.high;
        const low = lastCandle.low;
        const close = lastCandle.close;
        
        const pivot = (high + low + close) / 3;
        const r1 = (2 * pivot) - low;
        const s1 = (2 * pivot) - high;
        const r2 = pivot + (high - low);
        const s2 = pivot - (high - low);
        
        return { pivot, r1, r2, s1, s2 };
    }

    /**
     * Calculate Fibonacci Retracement Level
     */
    calculateFibonacciLevel(chartData, currentPrice) {
        if (chartData.length < 20) return null;
        
        const recentData = chartData.slice(-20);
        const high = Math.max(...recentData.map(d => d.high));
        const low = Math.min(...recentData.map(d => d.low));
        const range = high - low;
        
        const fibLevels = {
            0: low,
            0.236: low + (range * 0.236),
            0.382: low + (range * 0.382),
            0.5: low + (range * 0.5),
            0.618: low + (range * 0.618),
            0.786: low + (range * 0.786),
            1: high
        };
        
        // Find which level current price is closest to
        let closestLevel = null;
        let minDistance = Infinity;
        
        Object.entries(fibLevels).forEach(([level, price]) => {
            const distance = Math.abs(currentPrice - price);
            if (distance < minDistance) {
                minDistance = distance;
                closestLevel = level;
            }
        });
        
        // Determine if it's support or resistance
        if (closestLevel <= 0.5) {
            return 'support';
        } else {
            return 'resistance';
        }
    }

    /**
     * Detect RSI Divergence
     */
    detectRSIDivergence(prices, chartData) {
        if (prices.length < 20) return null;
        
        const recentPrices = prices.slice(-20);
        const rsiValues = [];
        
        // Calculate RSI for recent period
        for (let i = 14; i < recentPrices.length; i++) {
            const rsi = this.calculateRSI(recentPrices.slice(0, i + 1), 14);
            rsiValues.push(rsi);
        }
        
        // Check for divergence
        const priceHighs = this.findPeaks(recentPrices);
        const rsiHighs = this.findPeaks(rsiValues);
        
        if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
            const lastPriceHigh = priceHighs[priceHighs.length - 1];
            const prevPriceHigh = priceHighs[priceHighs.length - 2];
            const lastRsiHigh = rsiHighs[rsiHighs.length - 1];
            const prevRsiHigh = rsiHighs[rsiHighs.length - 2];
            
            if (lastPriceHigh > prevPriceHigh && lastRsiHigh < prevRsiHigh) {
                return 'bearish';
            } else if (lastPriceHigh < prevPriceHigh && lastRsiHigh > prevRsiHigh) {
                return 'bullish';
            }
        }
        
        return null;
    }

    /**
     * Detect MACD Divergence
     */
    detectMACDDivergence(prices, chartData) {
        if (prices.length < 20) return null;
        
        const recentPrices = prices.slice(-20);
        const macdValues = [];
        
        // Calculate MACD for recent period
        for (let i = 26; i < recentPrices.length; i++) {
            const ema12 = this.calculateEMA(recentPrices.slice(0, i + 1), 12);
            const ema26 = this.calculateEMA(recentPrices.slice(0, i + 1), 26);
            const macd = ema12 - ema26;
            macdValues.push(macd);
        }
        
        // Check for divergence
        const priceHighs = this.findPeaks(recentPrices);
        const macdHighs = this.findPeaks(macdValues);
        
        if (priceHighs.length >= 2 && macdHighs.length >= 2) {
            const lastPriceHigh = priceHighs[priceHighs.length - 1];
            const prevPriceHigh = priceHighs[priceHighs.length - 2];
            const lastMacdHigh = macdHighs[macdHighs.length - 1];
            const prevMacdHigh = macdHighs[macdHighs.length - 2];
            
            if (lastPriceHigh > prevPriceHigh && lastMacdHigh < prevMacdHigh) {
                return 'bearish';
            } else if (lastPriceHigh < prevPriceHigh && lastMacdHigh > prevMacdHigh) {
                return 'bullish';
            }
        }
        
        return null;
    }

    /**
     * Find peaks in an array
     */
    findPeaks(values) {
        const peaks = [];
        for (let i = 1; i < values.length - 1; i++) {
            if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
                peaks.push(i);
            }
        }
        return peaks;
    }

    /**
     * Analyze market structure (higher highs/lower lows)
     */
    analyzeMarketStructure(prices) {
        if (prices.length < 10) return null;
        
        const recentPrices = prices.slice(-10);
        const highs = [];
        const lows = [];
        
        // Find swing highs and lows
        for (let i = 1; i < recentPrices.length - 1; i++) {
            if (recentPrices[i] > recentPrices[i - 1] && recentPrices[i] > recentPrices[i + 1]) {
                highs.push(recentPrices[i]);
            }
            if (recentPrices[i] < recentPrices[i - 1] && recentPrices[i] < recentPrices[i + 1]) {
                lows.push(recentPrices[i]);
            }
        }
        
        if (highs.length >= 2 && lows.length >= 2) {
            const lastHigh = highs[highs.length - 1];
            const prevHigh = highs[highs.length - 2];
            const lastLow = lows[lows.length - 1];
            const prevLow = lows[lows.length - 2];
            
            if (lastHigh > prevHigh && lastLow > prevLow) {
                return 'uptrend';
            } else if (lastHigh < prevHigh && lastLow < prevLow) {
                return 'downtrend';
            }
        }
        
        return null;
    }

    /**
     * Calculate price position in range
     */
    calculatePricePosition(prices, currentPrice) {
        if (prices.length === 0) return 0.5;
        
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min;
        
        if (range === 0) return 0.5;
        
        return (currentPrice - min) / range;
    }
}

// Export for use in other modules
window.TradingBot = TradingBot; 