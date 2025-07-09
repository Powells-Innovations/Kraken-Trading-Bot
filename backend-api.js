/**
 * Backend API Client
 * Handles communication with the backend server for persistent storage
 * 
 * Copyright (c) 2025 Trading Bot AI
 * All rights reserved.
 */

class BackendAPI {
    constructor() {
        this.baseUrl = 'http://localhost:8000/api';
        this.userId = 'default_user'; // You can make this configurable
        this.isConnected = false;
    }

    /**
     * Debug logging function
     */
    debugLog(message, type = 'info') {
        if (window.app && window.app.debugLog) {
            window.app.debugLog(`[BACKEND] ${message}`, type);
        } else {
            console.log(`[BACKEND] ${message}`);
        }
    }

    /**
     * Test connection to backend server
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            if (response.ok) {
                this.isConnected = true;
                this.debugLog('✅ Connected to backend server', 'success');
                return true;
            } else {
                this.isConnected = false;
                this.debugLog('❌ Backend server health check failed', 'error');
                return false;
            }
        } catch (error) {
            this.isConnected = false;
            this.debugLog(`❌ Backend server connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Save API credentials
     */
    async saveCredentials(apiKey, apiSecret) {
        try {
            const response = await fetch(`${this.baseUrl}/credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    kraken_api_key: apiKey,
                    kraken_api_secret: apiSecret
                })
            });

            if (response.ok) {
                this.debugLog('✅ API credentials saved to backend', 'success');
                return true;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to save credentials: ${error.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error saving credentials: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Load API credentials
     */
    async loadCredentials() {
        try {
            const response = await fetch(`${this.baseUrl}/credentials/${this.userId}`);
            
            if (response.ok) {
                const credentials = await response.json();
                this.debugLog('✅ API credentials loaded from backend', 'success');
                return credentials;
            } else if (response.status === 404) {
                this.debugLog('ℹ️ No saved credentials found', 'info');
                return null;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to load credentials: ${error.error}`, 'error');
                return null;
            }
        } catch (error) {
            this.debugLog(`❌ Error loading credentials: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Delete API credentials
     */
    async deleteCredentials() {
        try {
            const response = await fetch(`${this.baseUrl}/credentials/${this.userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.debugLog('✅ API credentials deleted from backend', 'success');
                return true;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to delete credentials: ${error.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error deleting credentials: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Save active trade
     */
    async saveTrade(trade) {
        try {
            const response = await fetch(`${this.baseUrl}/trades`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trade)
            });

            if (response.ok) {
                this.debugLog(`✅ Trade ${trade.trade_id} saved to backend`, 'success');
                return true;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to save trade: ${error.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error saving trade: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Load all active trades
     */
    async loadTrades() {
        try {
            const response = await fetch(`${this.baseUrl}/trades`);
            
            if (response.ok) {
                const trades = await response.json();
                this.debugLog(`✅ Loaded ${trades.length} active trades from backend`, 'success');
                return trades;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to load trades: ${error.error}`, 'error');
                return [];
            }
        } catch (error) {
            this.debugLog(`❌ Error loading trades: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Update active trade
     */
    async updateTrade(tradeId, updates) {
        try {
            const response = await fetch(`${this.baseUrl}/trades/${tradeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                this.debugLog(`✅ Trade ${tradeId} updated in backend`, 'success');
                return true;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to update trade: ${error.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error updating trade: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Delete active trade
     */
    async deleteTrade(tradeId) {
        try {
            const response = await fetch(`${this.baseUrl}/trades/${tradeId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.debugLog(`✅ Trade ${tradeId} deleted from backend`, 'success');
                return true;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to delete trade: ${error.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error deleting trade: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Save trade to history
     */
    async saveTradeHistory(trade) {
        try {
            const response = await fetch(`${this.baseUrl}/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trade)
            });

            if (response.ok) {
                this.debugLog(`✅ Trade ${trade.trade_id} saved to history`, 'success');
                return true;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to save trade history: ${error.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error saving trade history: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Load trade history
     */
    async loadTradeHistory(limit = 100, offset = 0) {
        try {
            const response = await fetch(`${this.baseUrl}/history?limit=${limit}&offset=${offset}`);
            
            if (response.ok) {
                const history = await response.json();
                this.debugLog(`✅ Loaded ${history.length} trade history records`, 'success');
                return history;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to load trade history: ${error.error}`, 'error');
                return [];
            }
        } catch (error) {
            this.debugLog(`❌ Error loading trade history: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Save trading statistics
     */
    async saveStats(stats) {
        try {
            const response = await fetch(`${this.baseUrl}/stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    ...stats
                })
            });

            if (response.ok) {
                this.debugLog('✅ Trading statistics saved to backend', 'success');
                return true;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to save stats: ${error.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error saving stats: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Load trading statistics
     */
    async loadStats() {
        try {
            const response = await fetch(`${this.baseUrl}/stats/${this.userId}`);
            
            if (response.ok) {
                const stats = await response.json();
                this.debugLog('✅ Trading statistics loaded from backend', 'success');
                return stats;
            } else if (response.status === 404) {
                this.debugLog('ℹ️ No saved statistics found', 'info');
                return null;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to load stats: ${error.error}`, 'error');
                return null;
            }
        } catch (error) {
            this.debugLog(`❌ Error loading stats: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Save trading settings
     */
    async saveSettings(settings) {
        try {
            const response = await fetch(`${this.baseUrl}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    ...settings
                })
            });

            if (response.ok) {
                this.debugLog('✅ Trading settings saved to backend', 'success');
                return true;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to save settings: ${error.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Error saving settings: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Load trading settings
     */
    async loadSettings() {
        try {
            const response = await fetch(`${this.baseUrl}/settings/${this.userId}`);
            
            if (response.ok) {
                const settings = await response.json();
                this.debugLog('✅ Trading settings loaded from backend', 'success');
                return settings;
            } else if (response.status === 404) {
                this.debugLog('ℹ️ No saved settings found', 'info');
                return null;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to load settings: ${error.error}`, 'error');
                return null;
            }
        } catch (error) {
            this.debugLog(`❌ Error loading settings: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Get data export info
     */
    async getExportInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/export/${this.userId}`);
            
            if (response.ok) {
                const info = await response.json();
                this.debugLog('✅ Export info retrieved from backend', 'success');
                return info.data;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to get export info: ${error.error}`, 'error');
                return null;
            }
        } catch (error) {
            this.debugLog(`❌ Error getting export info: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Sync all data from trading bot
     */
    async syncFromBot(tradingBot) {
        if (!tradingBot) {
            this.debugLog('❌ No trading bot provided for sync', 'error');
            return false;
        }

        try {
            this.debugLog('🔄 Starting data sync from trading bot...', 'info');

            // Sync settings
            const settings = {
                max_investment: tradingBot.settings.maxInvestment,
                take_profit: tradingBot.settings.takeProfit,
                stop_loss: tradingBot.settings.stopLoss,
                trade_frequency: tradingBot.settings.tradeFrequency,
                max_active_trades: tradingBot.settings.maxActiveTrades,
                max_risk_per_trade: tradingBot.settings.maxRiskPerTrade,
                max_total_risk: tradingBot.settings.maxTotalRisk,
                cooldown_minutes: tradingBot.settings.cooldownMinutes
            };
            await this.saveSettings(settings);

            // Sync active trades
            const activeTrades = tradingBot.getActiveTrades();
            for (const [pair, trades] of Object.entries(activeTrades)) {
                if (Array.isArray(trades)) {
                    for (const trade of trades) {
                        await this.saveTrade({
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
                    }
                }
            }

            // Sync statistics
            const stats = tradingBot.getStats();
            await this.saveStats({
                account_balance: stats.accountBalance,
                total_pnl: stats.totalPnL,
                today_pnl: stats.todayPnL,
                total_trades: stats.totalTrades,
                winning_trades: stats.winningTrades,
                losing_trades: stats.losingTrades,
                win_rate: stats.winRate,
                live_balance: tradingBot.liveBalance,
                last_reset_date: stats.lastResetDate
            });

            this.debugLog('✅ Data sync completed successfully', 'success');
            return true;
        } catch (error) {
            this.debugLog(`❌ Data sync failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Load all data into trading bot
     */
    async loadIntoBot(tradingBot) {
        if (!tradingBot) {
            this.debugLog('❌ No trading bot provided for loading', 'error');
            return false;
        }

        try {
            this.debugLog('🔄 Loading data into trading bot...', 'info');

            // Load settings
            const settings = await this.loadSettings();
            if (settings) {
                tradingBot.updateSettings({
                    maxInvestment: settings.max_investment,
                    takeProfit: settings.take_profit,
                    stopLoss: settings.stop_loss,
                    tradeFrequency: settings.trade_frequency,
                    maxActiveTrades: settings.max_active_trades,
                    maxRiskPerTrade: settings.max_risk_per_trade,
                    maxTotalRisk: settings.max_total_risk,
                    cooldownMinutes: settings.cooldown_minutes
                });
            }

            // Load active trades
            const trades = await this.loadTrades();
            tradingBot.activeTrades = {};
            for (const trade of trades) {
                if (!tradingBot.activeTrades[trade.pair]) {
                    tradingBot.activeTrades[trade.pair] = [];
                }
                tradingBot.activeTrades[trade.pair].push({
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
                    riskPercentage: trade.risk_percentage,
                    orderResult: trade.order_result
                });
            }

            // Load statistics
            const stats = await this.loadStats();
            if (stats) {
                tradingBot.tradingStats = {
                    accountBalance: stats.account_balance,
                    totalPnL: stats.total_pnl,
                    todayPnL: stats.today_pnl,
                    totalTrades: stats.total_trades,
                    winningTrades: stats.winning_trades,
                    losingTrades: stats.losing_trades,
                    winRate: stats.win_rate,
                    lastResetDate: stats.last_reset_date
                };
                tradingBot.liveBalance = stats.live_balance;
            }

            this.debugLog('✅ Data loading completed successfully', 'success');
            return true;
        } catch (error) {
            this.debugLog(`❌ Data loading failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Get background sync data (real-time data from backend)
     */
    async getBackgroundSyncData() {
        try {
            const response = await fetch(`${this.baseUrl}/sync/data`);
            
            if (response.ok) {
                const syncData = await response.json();
                this.debugLog(`✅ Background sync data loaded: ${syncData.active_trades.length} active trades, ${syncData.trade_history.length} history records`, 'success');
                return syncData;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to load background sync data: ${error.error}`, 'error');
                return null;
            }
        } catch (error) {
            this.debugLog(`❌ Error loading background sync data: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Force background sync
     */
    async forceBackgroundSync() {
        try {
            const response = await fetch(`${this.baseUrl}/sync/force`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.debugLog('✅ Background sync forced successfully', 'success');
                return result;
            } else {
                const error = await response.json();
                this.debugLog(`❌ Failed to force background sync: ${error.error}`, 'error');
                return null;
            }
        } catch (error) {
            this.debugLog(`❌ Error forcing background sync: ${error.message}`, 'error');
            return null;
        }
    }
}

// Export for use in other modules
window.BackendAPI = BackendAPI; 