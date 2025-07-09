/**
 * Railway Configuration
 * Handles environment variables and service URLs for Railway deployment
 */

// Railway environment configuration
const RAILWAY_CONFIG = {
    // Base URLs for services
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
    BINANCE_PROXY_URL: process.env.BINANCE_PROXY_URL || 'http://localhost:3003',
    KRAKEN_PROXY_URL: process.env.KRAKEN_PROXY_URL || 'http://localhost:3004',
    
    // API endpoints
    BACKEND_API_BASE: process.env.BACKEND_API_BASE || 'http://localhost:8000/api',
    BINANCE_API_BASE: process.env.BINANCE_API_BASE || 'http://localhost:3003/api/binance',
    KRAKEN_API_BASE: process.env.KRAKEN_API_BASE || 'http://localhost:3004/api/kraken',
    
    // Port configuration
    PORT: process.env.PORT || 8000,
    
    // Database configuration
    DATABASE_URL: process.env.DATABASE_URL || 'trading_bot.db',
    
    // Environment detection
    IS_RAILWAY: process.env.RAILWAY_ENVIRONMENT === 'production',
    IS_LOCAL: !process.env.RAILWAY_ENVIRONMENT
};

// Helper function to get service URL
function getServiceURL(service) {
    switch (service) {
        case 'backend':
            return RAILWAY_CONFIG.BACKEND_URL;
        case 'binance-proxy':
            return RAILWAY_CONFIG.BINANCE_PROXY_URL;
        case 'kraken-proxy':
            return RAILWAY_CONFIG.KRAKEN_PROXY_URL;
        default:
            return RAILWAY_CONFIG.BACKEND_URL;
    }
}

// Helper function to get API base URL
function getAPIBaseURL(service) {
    switch (service) {
        case 'backend':
            return RAILWAY_CONFIG.BACKEND_API_BASE;
        case 'binance':
            return RAILWAY_CONFIG.BINANCE_API_BASE;
        case 'kraken':
            return RAILWAY_CONFIG.KRAKEN_API_BASE;
        default:
            return RAILWAY_CONFIG.BACKEND_API_BASE;
    }
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RAILWAY_CONFIG,
        getServiceURL,
        getAPIBaseURL
    };
} else {
    window.RAILWAY_CONFIG = RAILWAY_CONFIG;
    window.getServiceURL = getServiceURL;
    window.getAPIBaseURL = getAPIBaseURL;
} 