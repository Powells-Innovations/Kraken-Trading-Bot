/**
 * CoinGecko API Integration Module
 * Fetches comprehensive cryptocurrency data
 */

class CoinGeckoAPI {
    constructor() {
        this.baseUrl = 'https://api.coingecko.com/api/v3';
        this.isConnected = false;
        this.lastUpdate = null;
        
        // Mapping of trading pairs to CoinGecko IDs
        this.coinMapping = {
            'BTCGBP': 'bitcoin',
            'XRPGBP': 'ripple',
            'LINKGBP': 'chainlink',
            'AAVEGBP': 'aave',
            'FILGBP': 'filecoin',
            'ETHGBP': 'ethereum',
            'ADAGBP': 'cardano',
            'DOTGBP': 'polkadot',
            'SOLGBP': 'solana'
        };
        
        this.coinNames = {
            'BTCGBP': 'Bitcoin',
            'XRPGBP': 'Ripple',
            'LINKGBP': 'Chainlink',
            'AAVEGBP': 'Aave',
            'FILGBP': 'Filecoin',
            'ETHGBP': 'Ethereum',
            'ADAGBP': 'Cardano',
            'DOTGBP': 'Polkadot',
            'SOLGBP': 'Solana'
        };
    }

    debugLog(message, type = 'info') {
        if (window.app && window.app.debugLog) {
            window.app.debugLog(`[CoinGecko] ${message}`, type);
        } else {
            console.log(`[CoinGecko] ${message}`);
        }
    }

    async connect() {
        try {
            this.debugLog('🔗 Connecting to CoinGecko API...', 'connection');
            const response = await fetch(`${this.baseUrl}/ping`);
            
            if (response.ok) {
                this.isConnected = true;
                this.lastUpdate = new Date();
                this.debugLog('✅ Connected to CoinGecko API', 'success');
                return true;
            } else {
                this.debugLog('❌ Failed to connect to CoinGecko API', 'error');
                return false;
            }
        } catch (error) {
            this.debugLog(`❌ Connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    async makeRequest(endpoint, params = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to CoinGecko API');
        }

        try {
            const url = new URL(`${this.baseUrl}${endpoint}`);
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            this.debugLog(`Making request to: ${url.toString()}`, 'api');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            this.debugLog(`❌ Request failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async getMarketData(coinIds = null) {
        try {
            const ids = coinIds || Object.values(this.coinMapping).join(',');
            this.debugLog(`Fetching market data for coins...`, 'api');
            
            const data = await this.makeRequest('/coins/markets', {
                vs_currency: 'gbp',
                ids: ids,
                order: 'market_cap_desc',
                per_page: 250,
                page: 1,
                sparkline: false,
                price_change_percentage: '1h,24h,7d,30d,1y'
            });

            return this.processMarketData(data);
        } catch (error) {
            this.debugLog(`Failed to fetch market data: ${error.message}`, 'error');
            throw error;
        }
    }

    async getCoinData(coinId) {
        try {
            this.debugLog(`Fetching detailed data for ${coinId}...`, 'api');
            
            const data = await this.makeRequest(`/coins/${coinId}`, {
                localization: false,
                tickers: false,
                market_data: true,
                community_data: false,
                developer_data: false,
                sparkline: false
            });

            return this.processCoinData(data);
        } catch (error) {
            this.debugLog(`Failed to fetch data for ${coinId}: ${error.message}`, 'error');
            throw error;
        }
    }

    async getGlobalData() {
        try {
            this.debugLog('Fetching global market data...', 'api');
            const data = await this.makeRequest('/global');
            return this.processGlobalData(data);
        } catch (error) {
            this.debugLog(`Failed to fetch global data: ${error.message}`, 'error');
            throw error;
        }
    }

    processMarketData(data) {
        const processedData = {};
        
        data.forEach(coin => {
            const symbol = coin.symbol.toUpperCase();
            const pairKey = `${symbol}GBP`;
            
            if (this.coinMapping[pairKey]) {
                processedData[pairKey] = {
                    price: coin.current_price || 0,
                    market_cap: coin.market_cap || 0,
                    market_cap_rank: coin.market_cap_rank || 0,
                    total_volume: coin.total_volume || 0,
                    high_24h: coin.high_24h || 0,
                    low_24h: coin.low_24h || 0,
                    price_change_24h: coin.price_change_24h || 0,
                    price_change_percentage_24h: coin.price_change_percentage_24h || 0,
                    price_change_percentage_1h: coin.price_change_percentage_1h || 0,
                    price_change_percentage_7d: coin.price_change_percentage_7d || 0,
                    price_change_percentage_30d: coin.price_change_percentage_30d || 0,
                    price_change_percentage_1y: coin.price_change_percentage_1y || 0,
                    circulating_supply: coin.circulating_supply || 0,
                    total_supply: coin.total_supply || 0,
                    max_supply: coin.max_supply || 0,
                    ath: coin.ath || 0,
                    ath_change_percentage: coin.ath_change_percentage || 0,
                    atl: coin.atl || 0,
                    atl_change_percentage: coin.atl_change_percentage || 0,
                    last_update: Date.now(),
                    isRealData: true,
                    image: coin.image || '',
                    name: coin.name || symbol
                };
            }
        });
        
        this.debugLog(`✅ Processed market data for ${Object.keys(processedData).length} coins`, 'success');
        return processedData;
    }

    processCoinData(data) {
        const marketData = data.market_data;
        
        return {
            id: data.id,
            symbol: data.symbol.toUpperCase(),
            name: data.name,
            current_price: marketData?.current_price?.gbp || 0,
            market_cap: marketData?.market_cap?.gbp || 0,
            market_cap_rank: data.market_cap_rank || 0,
            total_volume: marketData?.total_volume?.gbp || 0,
            high_24h: marketData?.high_24h?.gbp || 0,
            low_24h: marketData?.low_24h?.gbp || 0,
            price_change_24h: marketData?.price_change_24h || 0,
            price_change_percentage_24h: marketData?.price_change_percentage_24h || 0,
            price_change_percentage_1h: marketData?.price_change_percentage_1h_in_currency?.gbp || 0,
            price_change_percentage_7d: marketData?.price_change_percentage_7d_in_currency?.gbp || 0,
            price_change_percentage_30d: marketData?.price_change_percentage_30d_in_currency?.gbp || 0,
            price_change_percentage_1y: marketData?.price_change_percentage_1y_in_currency?.gbp || 0,
            circulating_supply: marketData?.circulating_supply || 0,
            total_supply: marketData?.total_supply || 0,
            max_supply: marketData?.max_supply || 0,
            ath: marketData?.ath?.gbp || 0,
            ath_change_percentage: marketData?.ath_change_percentage?.gbp || 0,
            atl: marketData?.atl?.gbp || 0,
            atl_change_percentage: marketData?.atl_change_percentage?.gbp || 0,
            last_updated: marketData?.last_updated || new Date().toISOString(),
            image: data.image?.large || '',
            description: data.description?.en || '',
            categories: data.categories || [],
            links: data.links || {},
            isRealData: true
        };
    }

    processGlobalData(data) {
        const globalData = data.data;
        
        return {
            active_cryptocurrencies: globalData.active_cryptocurrencies || 0,
            total_market_cap: globalData.total_market_cap?.gbp || 0,
            total_volume: globalData.total_volume?.gbp || 0,
            market_cap_percentage: globalData.market_cap_percentage || {},
            market_cap_change_percentage_24h_gbp: globalData.market_cap_change_percentage_24h_gbp || 0,
            updated_at: globalData.updated_at || Date.now()
        };
    }

    async getAllTradingData() {
        try {
            this.debugLog('Fetching comprehensive data for all trading pairs...', 'api');
            
            const marketData = await this.getMarketData();
            const globalData = await this.getGlobalData();
            
            return {
                marketData: marketData,
                globalData: globalData,
                lastUpdate: Date.now()
            };
        } catch (error) {
            this.debugLog(`Failed to fetch all trading data: ${error.message}`, 'error');
            throw error;
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            lastUpdate: this.lastUpdate,
            baseUrl: this.baseUrl
        };
    }

    disconnect() {
        this.isConnected = false;
        this.lastUpdate = null;
        this.debugLog('🔌 Disconnected from CoinGecko API', 'info');
    }
}

window.CoinGeckoAPI = CoinGeckoAPI; 