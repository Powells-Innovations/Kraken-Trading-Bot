# Trading Bot Backend Server

This backend server provides persistent storage for your trading bot, ensuring that your API credentials, active trades, and trading history are preserved even when you close the browser.

## Features

- **🔐 Secure API Credential Storage**: Encrypted storage of Kraken API keys
- **📊 Active Trade Persistence**: Trades continue running even after browser restart
- **📈 Trading History**: Complete record of all closed trades
- **⚙️ Settings Persistence**: Trading parameters saved across sessions
- **📊 Statistics Tracking**: Account balance, P&L, win rate, etc.
- **🔄 Auto-Save**: Automatic data synchronization every 30 seconds
- **🤖 24/7 Trading Engine**: Continuous trading even when browser is closed
- **📊 Real-time Price Monitoring**: Server-side price monitoring and trade execution
- **🛡️ Risk Management**: Server-side risk controls and trade validation

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Backend Server

**Option A: Using the batch file (Windows)**
```bash
start-backend.bat
```

**Option B: Using npm**
```bash
npm start
```

**Option C: Using node directly**
```bash
node server.js
```

The server will start on `http://localhost:3000`

### 3. Start Your Trading Bot

1. Start your proxy servers:
   ```bash
   node binance-proxy.js
   node kraken-proxy.js
   ```

2. Start your web server:
   ```bash
   python -m http.server 8000
   ```

3. Open your browser to `http://localhost:8000`

### 4. Start 24/7 Trading Engine (Optional)

To enable continuous trading even when the browser is closed:

```bash
# Start the trading engine
node trading-engine-control.js start

# Check status
node trading-engine-control.js status

# Stop the trading engine
node trading-engine-control.js stop
```

## How It Works

### Data Storage

The backend uses SQLite database (`trading_bot.db`) to store:

- **API Credentials**: Encrypted Kraken API keys
- **Active Trades**: Currently open positions
- **Trading History**: Closed trades with P&L
- **Trading Statistics**: Account balance, win rate, etc.
- **Trading Settings**: Risk parameters, investment limits

### Security

- API credentials are encrypted using AES-256-CBC
- No credentials are stored in browser memory
- Database file is local to your machine
- HTTPS encryption for all API communications

### Auto-Save

- Data is automatically saved every 30 seconds when trading
- Manual save on trading start/stop
- Settings saved immediately when changed
- Trades saved when opened/closed

### 24/7 Trading Engine

- **Continuous Operation**: Trading continues even when browser is closed
- **Price Monitoring**: Server monitors prices every 5 seconds
- **Trade Execution**: Automatic take profit/stop loss execution
- **Risk Management**: Server-side validation of all trades
- **Data Persistence**: All trades and settings saved to database

## API Endpoints

### Health Check
- `GET /api/health` - Check if server is running

### API Credentials
- `POST /api/credentials` - Save API credentials
- `GET /api/credentials/:user_id` - Get API credentials
- `DELETE /api/credentials/:user_id` - Delete API credentials

### Active Trades
- `POST /api/trades` - Save active trade
- `GET /api/trades` - Get all active trades
- `PUT /api/trades/:trade_id` - Update active trade
- `DELETE /api/trades/:trade_id` - Delete active trade

### Trading History
- `POST /api/history` - Save trade to history
- `GET /api/history` - Get trade history

### Trading Statistics
- `POST /api/stats` - Save trading statistics
- `GET /api/stats/:user_id` - Get trading statistics

### Trading Settings
- `POST /api/settings` - Save trading settings
- `GET /api/settings/:user_id` - Get trading settings

### Trading Engine
- `POST /api/trading/start` - Start 24/7 trading engine
- `POST /api/trading/stop` - Stop trading engine
- `GET /api/trading/status` - Get trading engine status

## Database Schema

### api_credentials
```sql
CREATE TABLE api_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    kraken_api_key TEXT,
    kraken_api_secret TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### active_trades
```sql
CREATE TABLE active_trades (
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
);
```

### trading_history
```sql
CREATE TABLE trading_history (
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
);
```

## Troubleshooting

### Server Won't Start
1. Check if Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check if port 3000 is available
4. Check console for error messages

### Database Issues
1. Delete `trading_bot.db` to reset database
2. Restart server to recreate tables
3. Check file permissions in project directory

### Connection Issues
1. Ensure server is running on `http://localhost:3000`
2. Check browser console for CORS errors
3. Verify proxy servers are running
4. Check firewall settings

### Data Not Persisting
1. Check if auto-save is enabled
2. Verify backend connection in debug logs
3. Check database file exists and is writable
4. Restart server and try again

## Security Notes

- **Never share your database file** - it contains encrypted API credentials
- **Keep your encryption key secure** - change it in production
- **Use HTTPS in production** - current setup is for local development only
- **Regular backups** - backup your `trading_bot.db` file regularly

## Production Deployment

For production use:

1. Set environment variables:
   ```bash
   export ENCRYPTION_KEY="your-secure-32-character-key"
   export PORT=3000
   ```

2. Use HTTPS with proper SSL certificates

3. Set up proper firewall rules

4. Use a production database (PostgreSQL, MySQL) instead of SQLite

5. Set up automated backups

6. Monitor server logs and performance

## Support

If you encounter issues:

1. Check the debug console in your browser
2. Check server console for error messages
3. Verify all services are running (backend, proxies, web server)
4. Check database file permissions
5. Restart all services if needed

The backend server ensures your trading bot data persists across browser sessions, making it safe to close and reopen your browser without losing active trades or settings. 