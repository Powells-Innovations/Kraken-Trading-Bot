# Kraken Trading Bot

A sophisticated cryptocurrency trading bot with AI-powered decision making, real-time market data, and comprehensive risk management.

## ⚠️ IMPORTANT LEGAL DISCLAIMERS

### 🔐 API Key Security & Storage
- **Memory Storage Only**: API keys are temporarily stored in browser memory (RAM) only while the application is running
- **No Persistent Storage**: API keys are NEVER saved to localStorage, sessionStorage, cookies, or any persistent storage
- **Session Only**: API keys are automatically cleared when you close the browser tab or refresh the page
- **Secure Transmission**: API keys are transmitted securely via HTTPS to our proxy server for Kraken API calls
- **No Server Storage**: Our proxy server does not store your API keys - they are used only for the duration of each API request

### ⚖️ Legal Compliance
- **GDPR Compliance**: No personal data is stored or processed beyond what's necessary for API communication
- **Data Minimization**: We only collect and process the minimum data required for trading functionality
- **Right to Deletion**: You can clear all data by simply closing the browser tab
- **No Third-Party Sharing**: Your API credentials are never shared with third parties

### ⚠️ Risk Disclaimers
- **Trading Risk**: Cryptocurrency trading involves substantial risk of loss. Only trade with funds you can afford to lose
- **No Financial Advice**: This software is for educational and research purposes only. Not financial advice
- **API Permissions**: Ensure your Kraken API keys have appropriate permissions (read-only for demo mode)
- **Technical Risk**: Software bugs or technical issues may result in financial losses
- **Market Risk**: Cryptocurrency markets are highly volatile and unpredictable

### 🔒 Security Recommendations
- Use API keys with minimal required permissions
- Never share your API credentials with anyone
- Monitor your account activity regularly
- Use demo mode for testing before live trading
- Keep your browser and system updated

## Features

### 🤖 AI-Powered Trading
- Neural network-based decision making
- Multi-signal analysis (RSI, MACD, Volume, ADX, etc.)
- Dynamic risk/reward optimization
- Swing trading strategies

### 📊 Real-Time Data
- Live market data from Kraken API
- Historical OHLC data (up to 10 years)
- Multiple timeframe analysis
- Interactive charts with Plotly.js

### 🛡️ Risk Management
- Configurable stop-loss and take-profit levels
- Position sizing based on account balance
- Maximum risk per trade limits
- Daily loss limits
- Cooldown periods between trades

### 💱 Supported Markets
- **Cryptocurrency**: BTC/GBP, XRP/GBP, LINK/GBP, AAVE/GBP, FIL/GBP
- **Stocks**: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA (via Yahoo Finance)

## Installation

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Accept the legal disclaimer
4. Configure your trading parameters
5. Start trading in demo mode first

## Configuration

### Trading Parameters
- **Max Investment**: Maximum amount per trade (£10-£1000)
- **Take Profit**: Percentage gain target (0.1%-100%)
- **Stop Loss**: Percentage loss limit (0.1%-50%)
- **Trade Frequency**: Conservative, Moderate, or Aggressive
- **Max Active Trades**: Maximum number of simultaneous positions

### API Setup (Live Trading)
1. Create a Kraken API key with appropriate permissions
2. Enter your API credentials in the application
3. Test the connection before live trading
4. Start with small amounts

## Security Features

### API Key Protection
- No persistent storage of API credentials
- Automatic clearing on page close/refresh
- Secure HTTPS transmission
- Server-side proxy for API calls

### Data Privacy
- No personal data collection
- Local storage only for trading settings
- No analytics or tracking
- GDPR compliant

## Technical Architecture

### Frontend
- Vanilla JavaScript (ES6+)
- Plotly.js for charts
- TensorFlow.js for neural networks
- Responsive CSS design

### Backend Integration
- Kraken API via secure proxy
- Yahoo Finance API for stocks
- CoinGecko API for additional crypto data

### AI Components
- Neural network for trade decisions
- Technical indicator analysis
- Risk/reward optimization
- Historical data training

## Usage

### Demo Mode
1. Select "Paper Trading" mode
2. Configure trading parameters
3. Start trading with virtual funds
4. Monitor performance and adjust settings

### Live Trading
1. Accept legal disclaimers
2. Enter Kraken API credentials
3. Test API connection
4. Start with small amounts
5. Monitor trades closely

## Monitoring

### Real-Time Statistics
- Account balance and P&L
- Win rate and trade count
- Active trades and positions
- Risk exposure levels

### Trading Log
- Detailed trade history
- Entry/exit reasons
- AI confidence levels
- Performance metrics

## Support

For technical support or licensing inquiries:
- Email: licensing@tradingbotai.com
- Documentation: See inline code comments
- Issues: Check browser console for errors

## License

Copyright (c) 2025 Trading Bot AI
All rights reserved.

This software is proprietary and confidential. Unauthorized copying, 
distribution, or use of this software, via any medium, is strictly prohibited.

## Disclaimer

This software is provided "as is" without warranty of any kind. The authors 
are not responsible for any financial losses incurred through the use of this 
software. Cryptocurrency trading involves substantial risk and should only be 
undertaken with funds you can afford to lose.

By using this software, you acknowledge that you have read, understood, and 
agree to all terms and conditions outlined in this documentation. 