/**
 * Trading Bot Backend Server
 * Provides persistent storage for API credentials, active trades, and trading history
 * 
 * Copyright (c) 2025 Trading Bot AI
 * All rights reserved.
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors({
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000'],
    credentials: true
}));
app.use(express.json());

// Encryption key (in production, use environment variable)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-32-chars-long!';
const ALGORITHM = 'aes-256-cbc';

// Database setup
const dbPath = path.join(__dirname, 'trading_bot.db');
const db = new sqlite3.Database(dbPath);

// Trading Engine State
let tradingEngine = {
    isRunning: false,
    tradingInterval: null,
    lastPriceUpdate: null,
    activeTrades: {},
    settings: {},
    apiCredentials: null
};

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // API Credentials table
        db.run(`CREATE TABLE IF NOT EXISTS api_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            kraken_api_key TEXT,
            kraken_api_secret TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Active Trades table
        db.run(`CREATE TABLE IF NOT EXISTS active_trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trade_id TEXT UNIQUE NOT NULL,
            pair TEXT NOT NULL,
            side TEXT NOT NULL,
            entry_price REAL NOT NULL,
            quantity REAL NOT NULL,
            investment REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            reason TEXT,
            mode TEXT DEFAULT 'demo',
            ai_stop_loss REAL,
            ai_take_profit REAL,
            unrealized_pnl REAL DEFAULT 0,
            risk_percentage REAL,
            order_result TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Trading History table
        db.run(`CREATE TABLE IF NOT EXISTS trading_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trade_id TEXT NOT NULL,
            pair TEXT NOT NULL,
            side TEXT NOT NULL,
            entry_price REAL NOT NULL,
            exit_price REAL NOT NULL,
            quantity REAL NOT NULL,
            investment REAL NOT NULL,
            pnl REAL NOT NULL,
            entry_time INTEGER NOT NULL,
            exit_time INTEGER NOT NULL,
            reason TEXT,
            mode TEXT DEFAULT 'demo',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Trading Statistics table
        db.run(`CREATE TABLE IF NOT EXISTS trading_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            account_balance REAL DEFAULT 1000,
            total_pnl REAL DEFAULT 0,
            today_pnl REAL DEFAULT 0,
            total_trades INTEGER DEFAULT 0,
            winning_trades INTEGER DEFAULT 0,
            losing_trades INTEGER DEFAULT 0,
            win_rate REAL DEFAULT 0,
            live_balance REAL,
            last_reset_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Settings table
        db.run(`CREATE TABLE IF NOT EXISTS trading_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            max_investment REAL DEFAULT 50,
            take_profit REAL DEFAULT 15,
            stop_loss REAL DEFAULT 10,
            trade_frequency TEXT DEFAULT 'moderate',
            max_active_trades INTEGER DEFAULT 5,
            max_risk_per_trade REAL DEFAULT 0.10,
            max_total_risk REAL DEFAULT 0.10,
            cooldown_minutes INTEGER DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('✅ Database initialized successfully');
    });
}

// Encryption/Decryption functions
function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
        const textParts = encryptedText.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encrypted = textParts.join(':');
        const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Credentials endpoints
app.post('/api/credentials', (req, res) => {
    const { user_id, kraken_api_key, kraken_api_secret } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    const encrypted_key = kraken_api_key ? encrypt(kraken_api_key) : null;
    const encrypted_secret = kraken_api_secret ? encrypt(kraken_api_secret) : null;

    db.run(
        `INSERT OR REPLACE INTO api_credentials (user_id, kraken_api_key, kraken_api_secret, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [user_id, encrypted_key, encrypted_secret],
        function(err) {
            if (err) {
                console.error('Error saving credentials:', err);
                return res.status(500).json({ error: 'Failed to save credentials' });
            }
            res.json({ success: true, message: 'Credentials saved successfully' });
        }
    );
});

app.get('/api/credentials/:user_id', (req, res) => {
    const { user_id } = req.params;

    db.get(
        'SELECT kraken_api_key, kraken_api_secret FROM api_credentials WHERE user_id = ?',
        [user_id],
        (err, row) => {
            if (err) {
                console.error('Error retrieving credentials:', err);
                return res.status(500).json({ error: 'Failed to retrieve credentials' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'No credentials found' });
            }

            const decrypted_key = row.kraken_api_key ? decrypt(row.kraken_api_key) : null;
            const decrypted_secret = row.kraken_api_secret ? decrypt(row.kraken_api_secret) : null;

            res.json({
                kraken_api_key: decrypted_key,
                kraken_api_secret: decrypted_secret
            });
        }
    );
});

app.delete('/api/credentials/:user_id', (req, res) => {
    const { user_id } = req.params;

    db.run(
        'DELETE FROM api_credentials WHERE user_id = ?',
        [user_id],
        function(err) {
            if (err) {
                console.error('Error deleting credentials:', err);
                return res.status(500).json({ error: 'Failed to delete credentials' });
            }
            res.json({ success: true, message: 'Credentials deleted successfully' });
        }
    );
});

// Active Trades endpoints
app.post('/api/trades', (req, res) => {
    const trade = req.body;
    
    db.run(
        `INSERT INTO active_trades (
            trade_id, pair, side, entry_price, quantity, investment, timestamp, 
            reason, mode, ai_stop_loss, ai_take_profit, risk_percentage, order_result
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            trade.trade_id, trade.pair, trade.side, trade.entry_price, trade.quantity,
            trade.investment, trade.timestamp, trade.reason, trade.mode,
            trade.ai_stop_loss, trade.ai_take_profit, trade.risk_percentage,
            trade.order_result ? JSON.stringify(trade.order_result) : null
        ],
        function(err) {
            if (err) {
                console.error('Error saving trade:', err);
                return res.status(500).json({ error: 'Failed to save trade' });
            }
            res.json({ success: true, trade_id: trade.trade_id });
        }
    );
});

app.get('/api/trades', (req, res) => {
    db.all(
        'SELECT * FROM active_trades ORDER BY timestamp DESC',
        (err, rows) => {
            if (err) {
                console.error('Error retrieving trades:', err);
                return res.status(500).json({ error: 'Failed to retrieve trades' });
            }
            
            // Parse order_result JSON
            const trades = rows.map(row => ({
                ...row,
                order_result: row.order_result ? JSON.parse(row.order_result) : null
            }));
            
            res.json(trades);
        }
    );
});

app.put('/api/trades/:trade_id', (req, res) => {
    const { trade_id } = req.params;
    const updates = req.body;

    const setClause = Object.keys(updates)
        .filter(key => key !== 'trade_id')
        .map(key => `${key} = ?`)
        .join(', ');

    const values = Object.keys(updates)
        .filter(key => key !== 'trade_id')
        .map(key => {
            if (key === 'order_result' && updates[key]) {
                return JSON.stringify(updates[key]);
            }
            return updates[key];
        });

    values.push(trade_id);

    db.run(
        `UPDATE active_trades SET ${setClause} WHERE trade_id = ?`,
        values,
        function(err) {
            if (err) {
                console.error('Error updating trade:', err);
                return res.status(500).json({ error: 'Failed to update trade' });
            }
            res.json({ success: true, message: 'Trade updated successfully' });
        }
    );
});

app.delete('/api/trades/:trade_id', (req, res) => {
    const { trade_id } = req.params;

    db.run(
        'DELETE FROM active_trades WHERE trade_id = ?',
        [trade_id],
        function(err) {
            if (err) {
                console.error('Error deleting trade:', err);
                return res.status(500).json({ error: 'Failed to delete trade' });
            }
            res.json({ success: true, message: 'Trade deleted successfully' });
        }
    );
});

// Trading History endpoints
app.post('/api/history', (req, res) => {
    const trade = req.body;
    
    db.run(
        `INSERT INTO trading_history (
            trade_id, pair, side, entry_price, exit_price, quantity, investment,
            pnl, entry_time, exit_time, reason, mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            trade.trade_id, trade.pair, trade.side, trade.entry_price, trade.exit_price,
            trade.quantity, trade.investment, trade.pnl, trade.entry_time, trade.exit_time,
            trade.reason, trade.mode
        ],
        function(err) {
            if (err) {
                console.error('Error saving trade history:', err);
                return res.status(500).json({ error: 'Failed to save trade history' });
            }
            res.json({ success: true, trade_id: trade.trade_id });
        }
    );
});

app.get('/api/history', (req, res) => {
    const { limit = 100, offset = 0 } = req.query;
    
    db.all(
        'SELECT * FROM trading_history ORDER BY exit_time DESC LIMIT ? OFFSET ?',
        [parseInt(limit), parseInt(offset)],
        (err, rows) => {
            if (err) {
                console.error('Error retrieving trade history:', err);
                return res.status(500).json({ error: 'Failed to retrieve trade history' });
            }
            res.json(rows);
        }
    );
});

// Trading Statistics endpoints
app.post('/api/stats', (req, res) => {
    const stats = req.body;
    
    db.run(
        `INSERT OR REPLACE INTO trading_stats (
            user_id, account_balance, total_pnl, today_pnl, total_trades,
            winning_trades, losing_trades, win_rate, live_balance, last_reset_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
            stats.user_id, stats.account_balance, stats.total_pnl, stats.today_pnl,
            stats.total_trades, stats.winning_trades, stats.losing_trades, stats.win_rate,
            stats.live_balance, stats.last_reset_date
        ],
        function(err) {
            if (err) {
                console.error('Error saving stats:', err);
                return res.status(500).json({ error: 'Failed to save stats' });
            }
            res.json({ success: true, message: 'Stats saved successfully' });
        }
    );
});

app.get('/api/stats/:user_id', (req, res) => {
    const { user_id } = req.params;

    db.get(
        'SELECT * FROM trading_stats WHERE user_id = ?',
        [user_id],
        (err, row) => {
            if (err) {
                console.error('Error retrieving stats:', err);
                return res.status(500).json({ error: 'Failed to retrieve stats' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'No stats found' });
            }
            
            res.json(row);
        }
    );
});

// Trading Settings endpoints
app.post('/api/settings', (req, res) => {
    const settings = req.body;
    
    db.run(
        `INSERT OR REPLACE INTO trading_settings (
            user_id, max_investment, take_profit, stop_loss, trade_frequency,
            max_active_trades, max_risk_per_trade, max_total_risk, cooldown_minutes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
            settings.user_id, settings.max_investment, settings.take_profit, settings.stop_loss,
            settings.trade_frequency, settings.max_active_trades, settings.max_risk_per_trade,
            settings.max_total_risk, settings.cooldown_minutes
        ],
        function(err) {
            if (err) {
                console.error('Error saving settings:', err);
                return res.status(500).json({ error: 'Failed to save settings' });
            }
            res.json({ success: true, message: 'Settings saved successfully' });
        }
    );
});

app.get('/api/settings/:user_id', (req, res) => {
    const { user_id } = req.params;

    db.get(
        'SELECT * FROM trading_settings WHERE user_id = ?',
        [user_id],
        (err, row) => {
            if (err) {
                console.error('Error retrieving settings:', err);
                return res.status(500).json({ error: 'Failed to retrieve settings' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'No settings found' });
            }
            
            res.json(row);
        }
    );
});

// Data export endpoint
app.get('/api/export/:user_id', (req, res) => {
    const { user_id } = req.params;

    db.all(
        `SELECT 
            (SELECT COUNT(*) FROM active_trades) as active_trades_count,
            (SELECT COUNT(*) FROM trading_history) as history_count,
            (SELECT COUNT(*) FROM trading_stats WHERE user_id = ?) as stats_count,
            (SELECT COUNT(*) FROM trading_settings WHERE user_id = ?) as settings_count`,
        [user_id, user_id],
        (err, rows) => {
            if (err) {
                console.error('Error getting export info:', err);
                return res.status(500).json({ error: 'Failed to get export info' });
            }
            
            const info = rows[0];
            res.json({
                message: 'Export info retrieved successfully',
                data: info
            });
        }
    );
});

// Trading Engine Functions

/**
 * Start the trading engine
 */
async function startTradingEngine() {
    if (tradingEngine.isRunning) {
        console.log('⚠️ Trading engine is already running');
        return;
    }

    try {
        console.log('🚀 Starting trading engine...');
        
        // Load settings and active trades
        await loadTradingEngineData();
        
        // Start price monitoring
        tradingEngine.isRunning = true;
        tradingEngine.tradingInterval = setInterval(async () => {
            await monitorPricesAndTrade();
        }, 5000); // Check every 5 seconds
        
        console.log('✅ Trading engine started successfully');
        
        // Initial price check
        await monitorPricesAndTrade();
        
    } catch (error) {
        console.error('❌ Failed to start trading engine:', error);
        tradingEngine.isRunning = false;
    }
}

/**
 * Stop the trading engine
 */
function stopTradingEngine() {
    if (!tradingEngine.isRunning) {
        console.log('⚠️ Trading engine is not running');
        return;
    }

    console.log('🛑 Stopping trading engine...');
    
    if (tradingEngine.tradingInterval) {
        clearInterval(tradingEngine.tradingInterval);
        tradingEngine.tradingInterval = null;
    }
    
    tradingEngine.isRunning = false;
    console.log('✅ Trading engine stopped');
}

/**
 * Load trading engine data from database
 */
async function loadTradingEngineData() {
    return new Promise((resolve, reject) => {
        // Load settings
        db.get('SELECT * FROM trading_settings WHERE user_id = ?', ['default'], (err, settings) => {
            if (err) {
                console.error('Error loading settings:', err);
                reject(err);
                return;
            }
            
                    if (settings) {
            tradingEngine.settings = {
                maxInvestment: settings.max_investment,
                takeProfit: settings.take_profit,
                stopLoss: settings.stop_loss,
                tradeFrequency: settings.trade_frequency,
                maxActiveTrades: settings.max_active_trades,
                maxRiskPerTrade: settings.max_risk_per_trade,
                maxTotalRisk: settings.max_total_risk,
                cooldownMinutes: settings.cooldown_minutes
            };
        } else {
            // Default optimal settings for 5% capital increase
            tradingEngine.settings = {
                maxInvestment: 50,
                takeProfit: 5.0,        // 5% take profit target
                stopLoss: 2.5,          // 2.5% stop loss (2:1 risk/reward ratio)
                tradeFrequency: 'moderate',
                maxActiveTrades: 3,     // Limit concurrent trades for risk management
                maxRiskPerTrade: 0.05,  // 5% max risk per trade
                maxTotalRisk: 0.15,     // 15% max total portfolio risk
                cooldownMinutes: 10     // 10 minute cooldown between trades
            };
        }
            
            // Load active trades
            db.all('SELECT * FROM active_trades', (err, trades) => {
                if (err) {
                    console.error('Error loading active trades:', err);
                    reject(err);
                    return;
                }
                
                tradingEngine.activeTrades = {};
                trades.forEach(trade => {
                    if (!tradingEngine.activeTrades[trade.pair]) {
                        tradingEngine.activeTrades[trade.pair] = [];
                    }
                    tradingEngine.activeTrades[trade.pair].push({
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
                        unrealizedPnL: trade.unrealized_pnl,
                        riskPercentage: trade.risk_percentage
                    });
                });
                
                console.log(`📊 Loaded ${trades.length} active trades`);
                resolve();
            });
        });
    });
}

/**
 * Monitor prices and execute trades
 */
async function monitorPricesAndTrade() {
    try {
        // Get current prices from Binance
        const prices = await getCurrentPrices();
        
        // Check active trades for take profit/stop loss
        await checkActiveTrades(prices);
        
        // Execute new trades if conditions are met
        await executeNewTrades(prices);
        
        tradingEngine.lastPriceUpdate = new Date();
        
    } catch (error) {
        console.error('❌ Error in price monitoring:', error);
    }
}

/**
 * Get current prices from Binance
 */
async function getCurrentPrices() {
    try {
        const response = await fetch('http://localhost:3003/api/binance/ticker');
        const data = await response.json();
        
        const prices = {};
        const pairs = ['BTCUSDT', 'XRPUSDT', 'XLMUSDT', 'LINKUSDT', 'AAVEUSDT', 'FILUSDT'];
        
        data.forEach(ticker => {
            if (pairs.includes(ticker.symbol)) {
                // Convert USDT to GBP (approximate)
                const gbpPrice = parseFloat(ticker.lastPrice) * 0.79;
                prices[ticker.symbol] = {
                    price: gbpPrice,
                    change24h: parseFloat(ticker.priceChangePercent),
                    volume: parseFloat(ticker.volume)
                };
            }
        });
        
        return prices;
    } catch (error) {
        console.error('❌ Failed to get prices:', error);
        return {};
    }
}

/**
 * Check active trades for take profit/stop loss
 */
async function checkActiveTrades(prices) {
    for (const [pair, trades] of Object.entries(tradingEngine.activeTrades)) {
        const currentPrice = prices[pair]?.price;
        if (!currentPrice) continue;
        
        for (let i = trades.length - 1; i >= 0; i--) {
            const trade = trades[i];
            
            // Calculate optimal stop loss and take profit for 5% capital increase
            let stopLoss, takeProfit;
            
            if (trade.side === 'BUY') {
                // For BUY trades: 5% take profit, 2.5% stop loss (2:1 risk/reward ratio)
                takeProfit = trade.entryPrice * 1.05;  // 5% profit target
                stopLoss = trade.entryPrice * 0.975;   // 2.5% loss limit
            } else {
                // For SELL trades: 5% take profit, 2.5% stop loss (2:1 risk/reward ratio)
                takeProfit = trade.entryPrice * 0.95;  // 5% profit target
                stopLoss = trade.entryPrice * 1.025;   // 2.5% loss limit
            }
            
            // Use AI levels if available, otherwise use calculated levels
            stopLoss = trade.aiStopLoss || stopLoss;
            takeProfit = trade.aiTakeProfit || takeProfit;
            
            // Check for take profit
            if (trade.side === 'BUY' && currentPrice >= takeProfit) {
                await closeTrade(trade, 'Take Profit', currentPrice);
                trades.splice(i, 1);
                continue;
            } else if (trade.side === 'SELL' && currentPrice <= takeProfit) {
                await closeTrade(trade, 'Take Profit', currentPrice);
                trades.splice(i, 1);
                continue;
            }
            
            // Check for stop loss
            if (trade.side === 'BUY' && currentPrice <= stopLoss) {
                await closeTrade(trade, 'Stop Loss', currentPrice);
                trades.splice(i, 1);
                continue;
            } else if (trade.side === 'SELL' && currentPrice >= stopLoss) {
                await closeTrade(trade, 'Stop Loss', currentPrice);
                trades.splice(i, 1);
                continue;
            }
        }
    }
}

/**
 * Execute new trades based on AI signals
 */
async function executeNewTrades(prices) {
    // This would implement your AI trading logic
    // For now, just log that we're checking for opportunities
    console.log('🤖 Checking for new trading opportunities...');
}

/**
 * Close a trade
 */
async function closeTrade(trade, reason, currentPrice) {
    try {
        const pnl = trade.side === 'BUY' 
            ? (currentPrice - trade.entryPrice) * trade.quantity
            : (trade.entryPrice - currentPrice) * trade.quantity;
        
        console.log(`📊 Closing trade: ${trade.side} ${trade.pair} - P&L: £${pnl.toFixed(2)} (${reason})`);
        
        // Save to trading history
        db.run(
            `INSERT INTO trading_history (
                trade_id, pair, side, entry_price, exit_price, quantity, investment,
                pnl, entry_time, exit_time, reason, mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                trade.id, trade.pair, trade.side, trade.entryPrice, currentPrice,
                trade.quantity, trade.investment, pnl, trade.timestamp, Date.now(),
                reason, trade.mode
            ]
        );
        
        // Remove from active trades
        db.run('DELETE FROM active_trades WHERE trade_id = ?', [trade.id]);
        
    } catch (error) {
        console.error('❌ Error closing trade:', error);
    }
}

// Trading Engine API Endpoints

app.post('/api/trading/start', (req, res) => {
    startTradingEngine().then(() => {
        res.json({ success: true, message: 'Trading engine started' });
    }).catch(error => {
        res.status(500).json({ error: error.message });
    });
});

app.post('/api/trading/stop', (req, res) => {
    stopTradingEngine();
    res.json({ success: true, message: 'Trading engine stopped' });
});

app.get('/api/trading/status', (req, res) => {
    res.json({
        isRunning: tradingEngine.isRunning,
        lastPriceUpdate: tradingEngine.lastPriceUpdate,
        activeTradesCount: Object.values(tradingEngine.activeTrades).reduce((sum, trades) => sum + trades.length, 0)
    });
});

// Background Data Sync Process
let backgroundSyncInterval = null;
let lastSyncTimestamp = 0;

/**
 * Start background data sync process
 */
function startBackgroundDataSync() {
    if (backgroundSyncInterval) {
        clearInterval(backgroundSyncInterval);
    }
    
    console.log('🔄 Starting background data sync process...');
    
    backgroundSyncInterval = setInterval(async () => {
        try {
            await syncDataToFrontend();
        } catch (error) {
            console.error('❌ Background sync error:', error);
        }
    }, 10000); // Sync every 10 seconds
    
    console.log('✅ Background data sync started');
}

/**
 * Stop background data sync process
 */
function stopBackgroundDataSync() {
    if (backgroundSyncInterval) {
        clearInterval(backgroundSyncInterval);
        backgroundSyncInterval = null;
        console.log('🛑 Background data sync stopped');
    }
}

/**
 * Sync all trading data to frontend
 */
async function syncDataToFrontend() {
    try {
        const currentTime = Date.now();
        
        // Get all active trades
        const activeTrades = await getActiveTradesFromDB();
        
        // Get recent trade history (last 24 hours)
        const tradeHistory = await getRecentTradeHistory();
        
        // Get current statistics
        const statistics = await getCurrentStatistics();
        
        // Get current prices for P&L calculations
        const currentPrices = await getCurrentPrices();
        
        // Calculate real-time P&L for active trades
        const activeTradesWithPnL = activeTrades.map(trade => {
            const currentPrice = currentPrices[trade.pair]?.price || trade.entry_price;
            const pnl = trade.side === 'BUY' 
                ? (currentPrice - trade.entry_price) * trade.quantity
                : (trade.entry_price - currentPrice) * trade.quantity;
            
            return {
                ...trade,
                current_price: currentPrice,
                unrealized_pnl: pnl,
                price_change_percent: ((currentPrice - trade.entry_price) / trade.entry_price) * 100
            };
        });
        
        // Prepare sync data
        const syncData = {
            timestamp: currentTime,
            active_trades: activeTradesWithPnL,
            trade_history: tradeHistory,
            statistics: statistics,
            last_update: new Date().toISOString()
        };
        
        // Store sync data for frontend to fetch
        global.lastSyncData = syncData;
        
        console.log(`📊 Background sync completed: ${activeTradesWithPnL.length} active trades, ${tradeHistory.length} history records`);
        
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

/**
 * Get active trades from database
 */
async function getActiveTradesFromDB() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM active_trades ORDER BY timestamp DESC', (err, trades) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(trades || []);
        });
    });
}

/**
 * Get recent trade history from database
 */
async function getRecentTradeHistory() {
    return new Promise((resolve, reject) => {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        
        db.all(
            'SELECT * FROM trading_history WHERE exit_time > ? ORDER BY exit_time DESC LIMIT 100',
            [oneDayAgo],
            (err, history) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(history || []);
            }
        );
    });
}

/**
 * Get current statistics from database
 */
async function getCurrentStatistics() {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM trading_stats WHERE user_id = ?', ['default'], (err, stats) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stats || {
                account_balance: 1000,
                total_pnl: 0,
                today_pnl: 0,
                total_trades: 0,
                winning_trades: 0,
                losing_trades: 0,
                win_rate: 0
            });
        });
    });
}

// Background sync data endpoint
app.get('/api/sync/data', (req, res) => {
    try {
        if (global.lastSyncData) {
            res.json(global.lastSyncData);
        } else {
            // If no sync data available, return empty data
            res.json({
                timestamp: Date.now(),
                active_trades: [],
                trade_history: [],
                statistics: {
                    account_balance: 1000,
                    total_pnl: 0,
                    today_pnl: 0,
                    total_trades: 0,
                    winning_trades: 0,
                    losing_trades: 0,
                    win_rate: 0
                },
                last_update: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error serving sync data:', error);
        res.status(500).json({ error: 'Failed to get sync data' });
    }
});

// Force sync endpoint
app.post('/api/sync/force', async (req, res) => {
    try {
        await syncDataToFrontend();
        res.json({ success: true, message: 'Sync completed' });
    } catch (error) {
        console.error('Error forcing sync:', error);
        res.status(500).json({ error: 'Failed to force sync' });
    }
});

// Start server
function startServer() {
    const port = process.env.PORT || 8000;
    
    // Initialize database first
    initializeDatabase();
    
    app.listen(port, () => {
        console.log(`🚀 Trading Bot Backend Server running on http://localhost:${port}`);
        console.log(`📊 Trading engine status: ${tradingEngine.isRunning ? 'Running' : 'Stopped'}`);
        
        // Start background data sync process
        startBackgroundDataSync();
        
        // Auto-start trading engine if not already running
        if (!tradingEngine.isRunning) {
            startTradingEngine().catch(error => {
                console.error('❌ Failed to auto-start trading engine:', error);
            });
        }
        
        console.log('📊 Available endpoints:');
        console.log('  POST /api/credentials - Save API credentials');
        console.log('  GET /api/credentials/:user_id - Get API credentials');
        console.log('  DELETE /api/credentials/:user_id - Delete API credentials');
        console.log('  POST /api/trades - Save active trade');
        console.log('  GET /api/trades - Get all active trades');
        console.log('  PUT /api/trades/:trade_id - Update active trade');
        console.log('  DELETE /api/trades/:trade_id - Delete active trade');
        console.log('  POST /api/history - Save trade to history');
        console.log('  GET /api/history - Get trade history');
        console.log('  POST /api/stats - Save trading statistics');
        console.log('  GET /api/stats/:user_id - Get trading statistics');
        console.log('  POST /api/settings - Save trading settings');
        console.log('  GET /api/settings/:user_id - Get trading settings');
        console.log('  GET /api/export/:user_id - Get data export info');
        console.log('  GET /api/health - Health check');
        console.log('🤖 Trading Engine endpoints:');
        console.log('  POST /api/trading/start - Start trading engine');
        console.log('  POST /api/trading/stop - Stop trading engine');
        console.log('  GET /api/trading/status - Get trading engine status');
        console.log('📊 Background Sync endpoints:');
        console.log('  GET /api/sync/data - Get latest sync data');
        console.log('  POST /api/sync/force - Force a full sync');
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

// Start the server
startServer();

module.exports = app; 
