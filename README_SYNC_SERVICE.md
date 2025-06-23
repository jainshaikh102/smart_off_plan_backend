# Property Sync Service - Quick Start Guide

## 🚀 Overview

The Property Sync Service is a robust backend service that automatically fetches and stores property data from the Reelly API. It runs independently and starts automatically when the backend server starts.

## ✅ Features

- **Smart Scheduling**: Only syncs when needed, prevents redundant API calls
- **Automatic Property Fetching**: Fetches all properties with pagination
- **Detailed Data Storage**: Stores complete property information in MongoDB
- **Duplicate Prevention**: Prevents duplicate properties using unique identifiers
- **Featuring Analysis**: Analyzes properties for featuring potential (manual featuring required)
- **Error Recovery**: Robust error handling with retry logic
- **Real-time Monitoring**: API endpoints for status and control
- **Intelligent Caching**: Skips sync if recent data exists (configurable)

## 🔧 Quick Setup

### 1. Environment Configuration

Add these variables to your `.env` file:

```bash
# Required API Configuration
EXTERNAL_API_BASE_URL=https://search-listings-production.up.railway.app
EXTERNAL_API_KEY=your-reelly-api-key

# Optional Sync Configuration
PROPERTY_SYNC_ENABLED=true
PROPERTY_SYNC_INTERVAL=1440                    # 24 hours (1440 minutes)
PROPERTY_SYNC_MAX_RETRIES=3
PROPERTY_SYNC_TIMEOUT=30000
PROPERTY_SYNC_BATCH_SIZE=10
PROPERTY_SYNC_DELAY=1000
PROPERTY_SYNC_MIN_INTERVAL_HOURS=24            # Minimum 24 hours between syncs
PROPERTY_SYNC_SKIP_IF_RECENT=true              # Skip sync if recent data exists
```

### 2. Start the Backend

```bash
npm run dev
```

The service will automatically start after 5 seconds and intelligently check if syncing is needed.

### 3. Monitor the Service

```bash
# Check service status
npm run sync:status

# Trigger manual sync
npm run sync:trigger

# View sync statistics
curl http://localhost:5000/api/sync/status
```

## 📊 Service Management

### NPM Scripts

```bash
# Service Control
npm run sync:status    # Check service status
npm run sync:start     # Start the service
npm run sync:stop      # Stop the service
npm run sync:trigger   # Trigger manual sync
npm run sync:cleanup   # Clean up expired properties

# Testing
npm run test:sync      # Run sync service tests
```

### API Endpoints

| Method | Endpoint            | Description                       |
| ------ | ------------------- | --------------------------------- |
| GET    | `/api/sync/status`  | Get service status and statistics |
| POST   | `/api/sync/start`   | Start the sync service            |
| POST   | `/api/sync/stop`    | Stop the sync service             |
| POST   | `/api/sync/trigger` | Trigger manual sync               |
| POST   | `/api/sync/cleanup` | Clean up expired properties       |
| PUT    | `/api/sync/config`  | Update service configuration      |

## 📈 Monitoring

### Console Logs

The service provides detailed logging:

```
🔄 Initializing Property Sync Service...
🚀 Property Sync Service started (interval: 60 minutes)
🔄 Starting property sync cycle...
📋 Found 150 properties to process
📦 Processing batch 1/15 (10 properties)
🔍 Fetching detailed data for property 2127...
✨ Created new property 2127
⭐ Auto-featured property 2127 for: is_partner_project
✅ Property sync cycle completed: { duration: "45s", newProperties: 5, updatedProperties: 10 }
```

### Status Response

```json
{
  "success": true,
  "data": {
    "service": {
      "isRunning": true,
      "config": {
        "enabled": true,
        "intervalMinutes": 60,
        "maxRetries": 3,
        "requestTimeout": 30000,
        "batchSize": 10,
        "delayBetweenRequests": 1000
      },
      "hasApiKey": true,
      "hasBaseUrl": true
    },
    "statistics": {
      "totalProperties": 150,
      "activeProperties": 145,
      "featuredProperties": 25,
      "pendingReview": 5,
      "lastSyncTime": "2024-01-15T10:30:00Z",
      "expiredProperties": 2
    }
  }
}
```

## 🎯 Featuring Potential Analysis

The service analyzes properties for featuring potential and stores reasons in `featureReason` array, but does NOT automatically feature them. Manual featuring is required.

**Analyzed Criteria:**

1. **Partner Projects**: `is_partner_project: true`
2. **Rich Facilities**: 10+ facilities
3. **High-Quality Images**: 5+ architecture images
4. **Premium Locations**: Downtown Dubai, Dubai Marina, Palm Jumeirah, Business Bay, DIFC

**Note**: Properties with featuring potential will have reasons stored in `featureReason` array, but `featured` remains `false` until manually set by admin.

## 🔧 Configuration Options

| Variable                           | Default | Description                     |
| ---------------------------------- | ------- | ------------------------------- |
| `PROPERTY_SYNC_ENABLED`            | `true`  | Enable/disable the service      |
| `PROPERTY_SYNC_INTERVAL`           | `60`    | Sync interval in minutes        |
| `PROPERTY_SYNC_MAX_RETRIES`        | `3`     | Max retries for failed requests |
| `PROPERTY_SYNC_TIMEOUT`            | `30000` | Request timeout in milliseconds |
| `PROPERTY_SYNC_BATCH_SIZE`         | `10`    | Properties per batch            |
| `PROPERTY_SYNC_DELAY`              | `1000`  | Delay between requests (ms)     |
| `PROPERTY_SYNC_MIN_INTERVAL_HOURS` | `24`    | Minimum hours between syncs     |
| `PROPERTY_SYNC_SKIP_IF_RECENT`     | `true`  | Skip sync if recent data exists |

## 🧠 Smart Scheduling

The service includes intelligent scheduling to prevent unnecessary API calls and resource consumption:

### **Automatic Skip Conditions**

1. **Recent Data Check**: Skips sync if 80%+ of properties were updated within 24 hours
2. **Minimum Interval**: Enforces minimum time between syncs (default: 24 hours)
3. **Database Population**: Only syncs if database is empty or data is stale

### **Smart Sync Logic**

```
🧠 Smart sync: Checking if sync is needed...
⏭️ Skipping sync: 145/150 (96.7%) properties are recent
```

**OR**

```
🧠 Smart sync: Checking if sync is needed...
⏭️ Skipping sync: Last sync was 2.3 hours ago. Next sync in 21.7 hours.
```

**OR**

```
🧠 Smart sync: Checking if sync is needed...
✅ Smart sync: Sync is needed, proceeding...
🔄 Starting property sync cycle...
```

### **Benefits**

- ✅ **Reduces API Calls**: Prevents hitting rate limits
- ✅ **Saves Resources**: Avoids unnecessary processing
- ✅ **Faster Startup**: Server starts quickly without waiting for sync
- ✅ **Configurable**: Adjust intervals based on your needs

## 🐛 Troubleshooting

### Common Issues

1. **Service Not Starting**

   ```bash
   # Check API configuration
   npm run sync:status

   # Verify environment variables
   echo $EXTERNAL_API_BASE_URL
   echo $EXTERNAL_API_KEY
   ```

2. **Sync Failures**

   ```bash
   # Check error logs in console
   # Verify API credentials
   # Test manual sync
   npm run sync:trigger
   ```

3. **Performance Issues**
   ```bash
   # Adjust batch size
   curl -X PUT http://localhost:5000/api/sync/config \
     -H "Content-Type: application/json" \
     -d '{"batchSize": 5, "delayBetweenRequests": 2000}'
   ```

### Debug Commands

```bash
# Full status check
curl -s http://localhost:5000/api/sync/status | jq

# Check specific statistics
curl -s http://localhost:5000/api/sync/status | jq '.data.statistics'

# View service configuration
curl -s http://localhost:5000/api/sync/status | jq '.data.service.config'

# Test manual sync with timing
time npm run sync:trigger
```

## 🚀 Production Deployment

### Recommended Settings

```bash
# Production environment variables
PROPERTY_SYNC_ENABLED=true
PROPERTY_SYNC_INTERVAL=120        # 2 hours
PROPERTY_SYNC_MAX_RETRIES=5       # More retries
PROPERTY_SYNC_TIMEOUT=45000       # Longer timeout
PROPERTY_SYNC_BATCH_SIZE=5        # Smaller batches
PROPERTY_SYNC_DELAY=2000          # Longer delays
```

### Monitoring Setup

1. **Health Checks**: Monitor `/api/sync/status` endpoint
2. **Alerts**: Set up alerts for sync failures
3. **Logs**: Collect and analyze sync logs
4. **Metrics**: Track sync duration and success rates

### Performance Optimization

- Adjust batch size based on server resources
- Monitor API rate limits
- Regular cleanup of expired properties
- Consider separate instance for large datasets

## 📚 Additional Resources

- [Full Documentation](./docs/PROPERTY_SYNC_SERVICE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)

## 🆘 Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify API credentials and network connectivity
3. Test with manual sync trigger
4. Review the full documentation for advanced troubleshooting

The Property Sync Service is designed to be robust and self-healing, automatically recovering from temporary failures and providing comprehensive monitoring capabilities.
