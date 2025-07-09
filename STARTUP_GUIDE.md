# 🚀 Trading Bot Startup Guide

## Quick Start

### Option 1: One-Click Launcher (Recommended)
1. **Double-click** `LAUNCH-TRADING-BOT.bat`
2. **Wait** for the system to start (about 10-15 seconds)
3. **Browser opens automatically** to `http://localhost:8080`
4. **Start trading!**

### Option 2: PowerShell Script (Advanced)
1. **Right-click** `start-trading-bot.ps1`
2. **Select** "Run with PowerShell"
3. **Follow** the on-screen instructions

### Option 3: Manual Start
1. **Open Command Prompt** in the trading bot directory
2. **Run**: `start-trading-bot.bat`
3. **Wait** for startup to complete

## 🎯 What Gets Started

### Backend Server (Port 8000)
- ✅ **Background Sync Process** - Updates data every 10 seconds
- ✅ **Real-time P&L Calculations** - Uses current market prices
- ✅ **Database Management** - SQLite storage for all trades
- ✅ **API Endpoints** - RESTful API for frontend communication

### Frontend Server (Port 8080)
- ✅ **Web Interface** - Modern trading dashboard
- ✅ **Real-time Updates** - Background polling every 15 seconds
- ✅ **Manual Sync Button** - Force immediate data refresh
- ✅ **Responsive Design** - Works on desktop and mobile

## 🔄 Background Sync Features

### Automatic Updates
- **Every 10 seconds**: Backend calculates real-time P&L
- **Every 15 seconds**: Frontend fetches updated data
- **Real-time prices**: Uses current market data for calculations
- **Data persistence**: All data saved to database

### Manual Sync
- **🔄 Force Sync Button**: Immediate data refresh
- **Page Refresh**: Automatically loads latest data
- **Real-time P&L**: Shows current profit/loss on all trades

### Data Synchronization
- **Active Trades**: Entry prices, quantities, current P&L
- **Trade History**: Complete trade records with exit prices
- **Statistics**: Account balance, win rate, total P&L
- **Settings**: Trading parameters and risk management

## 📊 API Endpoints

### Health & Status
```
GET  /api/health          - Server health check
GET  /api/status          - Trading engine status
```

### Background Sync
```
GET  /api/sync/data       - Get all synchronized data
POST /api/sync/force      - Force immediate sync
```

### Trading Data
```
GET  /api/trades          - Active trades
GET  /api/history         - Trade history
GET  /api/statistics      - Trading statistics
```

### Settings
```
GET  /api/settings        - Current settings
POST /api/settings        - Update settings
```

## 🎮 How to Use

### 1. Start the System
```bash
# Double-click the launcher or run:
LAUNCH-TRADING-BOT.bat
```

### 2. Access the Interface
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000

### 3. Trading Features
- **Start Trading**: Click "Start Trading" button
- **Monitor Trades**: View active trades and P&L
- **Force Sync**: Click "🔄 Force Sync" for immediate updates
- **View History**: See all completed trades
- **Check Statistics**: Monitor performance metrics

### 4. Background Sync Benefits
- **No Data Loss**: All trades saved to database
- **Page Refresh Safe**: Data persists across refreshes
- **Real-time P&L**: Current profit/loss always accurate
- **Automatic Updates**: No manual refresh needed

## 🛠️ Troubleshooting

### Server Won't Start
1. **Check Node.js**: Ensure Node.js is installed
2. **Check Ports**: Make sure ports 8000 and 8080 are free
3. **Check Files**: Ensure all required files are present
4. **Check Dependencies**: Run `npm install` if needed

### Background Sync Issues
1. **Check Backend**: Visit http://localhost:8000/api/health
2. **Check Sync Data**: Visit http://localhost:8000/api/sync/data
3. **Force Sync**: Click the "🔄 Force Sync" button
4. **Check Console**: Look for error messages

### Data Not Persisting
1. **Check Database**: Ensure `trading-bot.db` file exists
2. **Check Permissions**: Ensure write permissions to directory
3. **Check Backend**: Verify backend server is running
4. **Manual Save**: Use "🔄 Force Sync" button

## 📁 File Structure

```
TRADINGBOT2/
├── LAUNCH-TRADING-BOT.bat      # One-click launcher
├── start-trading-bot.ps1       # PowerShell launcher
├── start-trading-bot.bat       # Batch file launcher
├── server.js                   # Backend server
├── trading-bot.js              # Trading logic
├── app.js                      # Frontend application
├── index.html                  # Web interface
├── backend-api.js              # API communication
├── trading-bot.db              # SQLite database
└── node_modules/               # Dependencies
```

## 🔧 Configuration

### Port Configuration
- **Backend**: Port 8000 (configurable in server.js)
- **Frontend**: Port 8080 (configurable in launcher)

### Background Sync Intervals
- **Backend Sync**: 10 seconds (configurable in server.js)
- **Frontend Polling**: 15 seconds (configurable in trading-bot.js)

### Database
- **Type**: SQLite
- **File**: `trading-bot.db`
- **Auto-backup**: Automatic on startup

## 🚀 Advanced Usage

### Custom Ports
Edit `server.js`:
```javascript
const port = process.env.PORT || 8000; // Change 8000 to desired port
```

### Custom Sync Intervals
Edit `server.js`:
```javascript
backgroundSyncInterval = setInterval(async () => {
    await syncDataToFrontend();
}, 10000); // Change 10000 to desired interval (milliseconds)
```

### Manual Database Reset
```bash
# Stop the system first, then:
del trading-bot.db
# Restart the system
```

## 📞 Support

### Common Issues
1. **Port Already in Use**: The launcher automatically kills existing processes
2. **Node.js Not Found**: Download and install Node.js from https://nodejs.org/
3. **Missing Files**: Ensure all files are in the same directory
4. **Permission Errors**: Run as administrator if needed

### Debug Mode
To see detailed logs:
1. **Open Command Prompt** in the trading bot directory
2. **Run**: `node server.js`
3. **Check console output** for error messages

### Log Files
- **Backend Logs**: Displayed in console when running manually
- **Frontend Logs**: Available in browser developer tools
- **Database**: SQLite file contains all trade data

## 🎉 Success Indicators

When the system starts successfully, you should see:
- ✅ Backend server running on http://localhost:8000
- ✅ Frontend interface at http://localhost:8080
- ✅ Background sync data available
- ✅ Database initialized
- ✅ All API endpoints responding

The trading interface will automatically open in your default browser, and you can start trading immediately with full background sync functionality! 