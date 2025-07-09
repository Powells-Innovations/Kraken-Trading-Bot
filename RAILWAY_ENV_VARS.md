# Railway Environment Variables

## Required Environment Variables for Railway Deployment

### Service URLs
Set these in your Railway project dashboard:

```
BACKEND_URL=https://kraken-trading-bot-production.up.railway.app
BINANCE_PROXY_URL=https://binance-proxy-production.up.railway.app
KRAKEN_PROXY_URL=https://kraken-proxy-production.up.railway.app
```

### API Base URLs
```
BACKEND_API_BASE=https://kraken-trading-bot-production.up.railway.app/api
BINANCE_API_BASE=https://binance-proxy-production.up.railway.app/api/binance
KRAKEN_API_BASE=https://kraken-proxy-production.up.railway.app/api/kraken
```

### System Variables
```
PORT=8000
DATABASE_URL=/tmp/trading_bot.db
ENCRYPTION_KEY=your-secret-encryption-key-32-chars-long!
RAILWAY_ENVIRONMENT=production
```

## How to Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Add each variable with its corresponding value
5. Click "Save" to apply changes

## Important Notes

- The `PORT` variable is automatically set by Railway
- The `DATABASE_URL` should point to `/tmp` for ephemeral storage
- Change the `ENCRYPTION_KEY` to a secure 32-character string
- The `RAILWAY_ENVIRONMENT=production` enables Railway-specific configurations 