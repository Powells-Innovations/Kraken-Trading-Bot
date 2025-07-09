# 🤖 Advanced Trading Bot

**Real-time cryptocurrency trading bot with AI-powered decision making and live trade execution.**

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.7 or higher)
- **Kraken API Key** with **Trade permissions**

### 2. Start All Servers (Windows)
```bash
# Double-click this file or run in PowerShell:
start-servers.bat
```

### 3. Start All Servers (Linux/Mac)
```bash
# Make executable and run:
chmod +x start-servers.sh
./start-servers.sh
```

### 4. Open the Application
- Open your browser to: `http://localhost:8000`
- Accept the legal disclaimer
- Configure your trading settings

## 🔐 Security & API Setup

### Kraken API Configuration
1. **Create API Key**: Go to [Kraken.com](https://www.kraken.com/u/settings/api)
2. **Required Permissions**:
   - ✅ **View** (for account balance)
   - ✅ **Trade** (for live trading)
   - ❌ **Withdraw** (NOT needed)
3. **IP Restrictions**: Set to your current IP address
4. **Save the API Key and Secret**

### Security Features
- **Memory-only storage**: API keys never saved to disk
- **Automatic cleanup**: Credentials cleared when browser closes
- **Secure proxy**: All API calls via HTTPS with HMAC signing
- **Permission validation**: Bot checks for required trading permissions

## ⚙️ Configuration

### Trading Settings (Aggressive Mode)
- **Max Investment**: £100 per trade
- **Take Profit**: 20% (reduced for faster profits)
- **Stop Loss**: 15% (increased tolerance)
- **Max Risk**: 25% per trade, 60% total
- **Trade Frequency**: Every 2 minutes
- **Max Active Trades**: 20 concurrent

### Market Data
- **Binance**: Real-time market data (BTC, XRP, XLM, LINK, AAVE, FIL)
- **Kraken**: Live trade execution
- **CoinGecko**: Backup market data

## 📊 Features

### AI Trading Engine
- **Neural Network**: TensorFlow.js-based decision making
- **Technical Indicators**: RSI, MACD, ADX, Volume analysis
- **Risk Management**: Dynamic position sizing and stop-loss
- **Multi-timeframe**: 1-minute to 1-week analysis

### Real-time Monitoring
- **Live Price Charts**: Candlestick and line charts
- **Active Trades**: Real-time P&L tracking
- **Trading Log**: Complete trade history
- **Debug Console**: Detailed system logs

### Live Trading
- **Paper Trading**: Test with real data, no real money
- **Live Trading**: Execute real trades on Kraken
- **Order Management**: Automatic stop-loss and take-profit
- **Balance Tracking**: Real account balance integration

## 🔧 Troubleshooting

### Common Issues

#### "Proxy servers offline"
```bash
# Check if servers are running:
curl http://localhost:3001/api/binance/ping
curl http://localhost:3002/api/kraken/ping

# Restart servers:
start-servers.bat
```

#### "API credentials invalid"
- Verify API key length (should be 50+ characters)
- Check API permissions include "Trade"
- Ensure IP restrictions allow your current IP

#### "No chart data available"
- Click "Reload Historical Data" button
- Check Binance proxy is running on port 3001
- Verify internet connection

#### "Trades not executing"
- Check trading mode is set to "Live Trading"
- Verify API credentials are valid
- Ensure account has sufficient balance
- Check debug console for error messages

### Manual Server Start
If auto-start fails, run these commands in separate terminals:

```bash
# Terminal 1: Binance Proxy
node binance-proxy.js

# Terminal 2: Kraken Proxy  
node kraken-proxy.js

# Terminal 3: Web Server
python -m http.server 8000
```

## �� Trading Strategy

### AI Decision Making
1. **Technical Analysis**: RSI, MACD, ADX, Volume
2. **Price Action**: Swing highs/lows, support/resistance
3. **Neural Network**: Pattern recognition from historical data
4. **Risk Assessment**: Dynamic position sizing based on confidence

### Risk Management
- **Position Sizing**: 25% max risk per trade
- **Stop Loss**: AI-calculated based on support/resistance
- **Take Profit**: AI-calculated based on resistance/volatility
- **Cooldown**: 2-minute minimum between trades per asset

## 🛡️ Legal & Risk Disclaimer

### Important Warnings
- **High Risk**: Cryptocurrency trading involves substantial risk
- **No Guarantees**: Past performance doesn't guarantee future results
- **Educational Use**: This software is for educational purposes
- **Real Money**: Live trading uses real money - trade responsibly

### Data Privacy
- **No Data Storage**: API keys stored only in browser memory
- **No Server Logs**: Proxy servers don't store sensitive data
- **GDPR Compliant**: Minimal data collection and processing

## 🔄 Updates & Maintenance

### Version Control
- **Cache Busting**: Version numbers in HTML force updates
- **Auto-refresh**: Browser refresh loads latest code
- **Debug Logs**: Comprehensive logging for troubleshooting

### Performance Monitoring
- **Latency Tracking**: Real-time API response times
- **Server Health**: Automatic proxy server monitoring
- **Error Reporting**: Detailed error messages in debug console

## 📞 Support

### Debug Information
- **Debug Console**: Press F12 to view detailed logs
- **Network Tab**: Monitor API requests and responses
- **Console Logs**: Real-time system status updates

### Common Commands
```javascript
// In browser console:
window.app.debugLog('Test message', 'info');
window.app.updateChart();
window.app.tradingBot.getStats();
```

---

**⚠️ WARNING: This is advanced trading software. Only use with funds you can afford to lose. Test thoroughly in paper trading mode before live trading.**

**© 2025 Trading Bot AI - All rights reserved** 