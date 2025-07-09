# Railway Deployment Guide

## Overview
Your AI Trading Bot has been updated to work with Railway deployment. The system now supports both local development and cloud deployment with automatic environment detection.

## What's Been Updated

### 1. Railway Configuration (`railway-config.js`)
- Centralized configuration management
- Environment variable support
- Automatic local vs Railway URL switching

### 2. Server Updates (`server.js`)
- Railway environment detection
- Dynamic CORS configuration
- Ephemeral database storage (`/tmp`)
- Updated proxy URL handling

### 3. API Client Updates
- `backend-api.js` - Railway URL support
- `binance-api.js` - Railway URL support  
- `kraken-api.js` - Railway URL support
- `trading-engine-control.js` - Railway URL support

### 4. Frontend Updates (`index.html`)
- Railway configuration script included
- Automatic Railway URL detection

## Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add Railway deployment support"
git push origin main
```

### Step 2: Deploy to Railway
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Create a new project
3. Connect your GitHub repository
4. Select the repository and branch

### Step 3: Configure Environment Variables
In your Railway project dashboard, add these environment variables:

#### Required Variables:
```
RAILWAY_ENVIRONMENT=production
ENCRYPTION_KEY=your-secure-32-character-encryption-key
```

#### Optional Variables (for custom URLs):
```
BACKEND_URL=https://kraken-trading-bot-production.up.railway.app
BINANCE_PROXY_URL=https://binance-proxy-production.up.railway.app
KRAKEN_PROXY_URL=https://kraken-proxy-production.up.railway.app
```

### Step 4: Deploy Proxy Services (Optional)
If you want to deploy the proxy services separately:

1. **Binance Proxy Service:**
   - Create a new Railway service
   - Set root directory to your project
   - Set start command: `node binance-proxy.js`
   - Add environment variables as needed

2. **Kraken Proxy Service:**
   - Create a new Railway service
   - Set root directory to your project
   - Set start command: `node kraken-proxy.js`
   - Add environment variables as needed

### Step 5: Test Deployment
1. Wait for Railway to build and deploy
2. Check the deployment logs for any errors
3. Test the health endpoint: `https://your-service.up.railway.app/api/health`
4. Open the main URL to test the frontend

## Testing Your Deployment

### Health Check
```bash
curl https://kraken-trading-bot-production.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-XX..."
}
```

### Frontend Test
Open your Railway URL in a browser:
```
https://kraken-trading-bot-production.up.railway.app
```

## Troubleshooting

### Common Issues:

1. **Port Already in Use**
   - Railway automatically sets the PORT environment variable
   - The code now uses `RAILWAY_CONFIG.PORT`

2. **Database Issues**
   - Railway uses ephemeral storage in `/tmp`
   - Database will be recreated on each deployment

3. **CORS Errors**
   - CORS is now configured for Railway domains
   - Check that your Railway URL is in the allowed origins

4. **Proxy Connection Errors**
   - If proxy services aren't deployed, the system will fall back to direct API calls
   - Check the logs for connection errors

### Debug Commands:
```bash
# Check Railway logs
railway logs

# Check service status
railway status

# View environment variables
railway variables
```

## Local Development

For local development, the system will automatically use localhost URLs:

```bash
# Start the backend
npm start

# Start proxy services (if needed)
node binance-proxy.js
node kraken-proxy.js
```

## Security Notes

1. **API Keys**: Never commit API keys to your repository
2. **Encryption Key**: Use a strong, unique encryption key in production
3. **Environment Variables**: Keep sensitive data in Railway environment variables
4. **HTTPS**: Railway provides HTTPS by default

## Performance Optimization

1. **Database**: Consider using a persistent database service for production
2. **Caching**: Implement Redis for session and data caching
3. **Monitoring**: Set up Railway monitoring and alerts
4. **Scaling**: Railway can auto-scale based on traffic

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Verify environment variables are set correctly
3. Test endpoints individually
4. Check browser console for frontend errors 