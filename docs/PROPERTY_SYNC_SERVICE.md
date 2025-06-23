# Property Sync Service Documentation

## Overview

The Property Sync Service is a comprehensive backend service that automatically fetches and stores property data from the Reelly API. It runs independently of the frontend and executes automatically when the project starts.

## Features

### ✅ Core Functionality

- **Automatic Property Fetching**: Fetches all properties from `/v1/properties` with full pagination support
- **Detailed Data Retrieval**: Fetches complete property details from `/v1/properties/{id}` for each property
- **Duplicate Prevention**: Checks for existing properties using `externalId` before saving
- **Database Storage**: Stores complete property data in MongoDB with proper indexing
- **Featuring Analysis**: Analyzes properties for featuring potential (manual featuring required)

### ✅ Pagination Handling

- **Complete Coverage**: Iterates through all pages of the API response
- **Smart Detection**: Detects the last page using pagination metadata or empty responses
- **Configurable Limits**: Supports different page sizes and batch processing

### ✅ Error Handling & Reliability

- **Retry Logic**: Exponential backoff for failed API requests
- **Rate Limiting**: Handles API rate limits with intelligent delays
- **Graceful Degradation**: Continues processing even if individual properties fail
- **Comprehensive Logging**: Detailed logs for monitoring and debugging

### ✅ Service Management

- **Auto-Start**: Starts automatically when the backend server starts
- **Manual Control**: Start/stop service via API endpoints
- **Configuration**: Runtime configuration updates without restart
- **Status Monitoring**: Real-time status and statistics

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Property Sync Service Configuration
PROPERTY_SYNC_ENABLED=true          # Enable/disable the service
PROPERTY_SYNC_INTERVAL=60           # Sync interval in minutes (default: 60)
PROPERTY_SYNC_MAX_RETRIES=3         # Max retries for failed requests (default: 3)
PROPERTY_SYNC_TIMEOUT=30000         # Request timeout in milliseconds (default: 30000)
PROPERTY_SYNC_BATCH_SIZE=10         # Properties to process in each batch (default: 10)
PROPERTY_SYNC_DELAY=1000            # Delay between requests in milliseconds (default: 1000)
```

### Default Configuration

```typescript
{
  enabled: true,
  intervalMinutes: 60,        // Run every hour
  maxRetries: 3,              // Retry failed requests 3 times
  requestTimeout: 30000,      // 30 second timeout
  batchSize: 10,              // Process 10 properties at a time
  delayBetweenRequests: 1000  // 1 second delay between requests
}
```

## API Endpoints

### Service Control

#### GET `/api/sync/status`

Get the current status of the sync service and statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "service": {
      "isRunning": true,
      "config": { ... },
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

#### POST `/api/sync/start`

Start the property sync service.

#### POST `/api/sync/stop`

Stop the property sync service.

#### POST `/api/sync/trigger`

Manually trigger a sync cycle.

**Response:**

```json
{
  "success": true,
  "message": "Manual sync completed",
  "data": {
    "totalProcessed": 150,
    "newProperties": 5,
    "updatedProperties": 10,
    "skippedDuplicates": 135,
    "errors": 0,
    "startTime": "2024-01-15T10:30:00Z",
    "endTime": "2024-01-15T10:35:00Z",
    "duration": 300000
  }
}
```

#### POST `/api/sync/cleanup`

Clean up expired and inactive properties.

#### PUT `/api/sync/config`

Update service configuration.

**Request Body:**

```json
{
  "enabled": true,
  "intervalMinutes": 120,
  "maxRetries": 5,
  "batchSize": 15
}
```

## Database Schema

The service uses the existing Property model with these key fields:

### Core Fields

- `externalId`: Unique identifier from Reelly API (used for duplicate checking)
- `name`: Property name
- `area`: Location/area
- `developer`: Developer name
- `min_price`/`max_price`: Price range
- `completePropertyData`: Complete API response object

### Sync Metadata

- `lastFetchedAt`: When property was last synced
- `cacheExpiresAt`: When cached data expires
- `reelly_status`: Whether property is still active in Reelly API
- `source`: Data source ("realty_api" or "manual")

### Auto-Featuring

- `featured`: Whether property is featured
- `featureReason`: Array of reasons for featuring
- `lastFeaturedAt`: When property was last featured

## Featuring Potential Analysis

The service analyzes properties for featuring potential and stores reasons in `featureReason` array, but does NOT automatically feature them. Manual featuring is required.

**Analyzed Criteria:**

1. **Partner Projects**: `is_partner_project: true`
2. **Rich Facilities**: 10+ facilities
3. **High-Quality Images**: 5+ architecture images
4. **Premium Locations**: Downtown Dubai, Dubai Marina, Palm Jumeirah, Business Bay, DIFC

**Note**: Properties with featuring potential will have reasons stored in `featureReason` array, but `featured` remains `false` until manually set by admin.

## Monitoring & Logging

### Console Logs

The service provides comprehensive logging:

```
🔄 Starting property sync cycle...
📋 Found 150 properties to process
📦 Processing batch 1/15 (10 properties)
🔍 Fetching detailed data for property 2127...
✨ Created new property 2127
⭐ Auto-featured property 2127 for: is_partner_project, facilities.length >= 10
✅ Property sync cycle completed: { duration: "45s", newProperties: 5, ... }
```

### Error Handling

- Failed API requests are retried with exponential backoff
- Individual property failures don't stop the entire sync
- Comprehensive error logging for debugging

## Performance Considerations

### Batch Processing

- Properties are processed in configurable batches (default: 10)
- Delays between requests prevent API rate limiting
- Memory-efficient processing of large property lists

### Caching Strategy

- Properties are cached for 24 hours by default
- Expired properties are marked for review
- Duplicate checking prevents unnecessary API calls

### Rate Limiting

- Configurable delays between API requests
- Exponential backoff for rate-limited requests
- Batch processing to distribute load

## Troubleshooting

### Common Issues

1. **Service Not Starting**

   - Check API configuration (baseUrl, apiKey)
   - Verify database connection
   - Check environment variables

2. **Sync Failures**

   - Check API credentials
   - Verify network connectivity
   - Review error logs for specific issues

3. **Performance Issues**
   - Adjust batch size and delays
   - Monitor API rate limits
   - Check database performance

### Debug Commands

```bash
# Check service status
curl http://localhost:5000/api/sync/status

# Trigger manual sync
curl -X POST http://localhost:5000/api/sync/trigger

# View configuration
curl http://localhost:5000/api/sync/status | jq '.data.service.config'
```

## Development

### Running Locally

1. Set up environment variables in `.env`
2. Start the backend server: `npm run dev`
3. Service starts automatically after 5 seconds
4. Monitor logs for sync activity

### Testing

```bash
# Manual sync trigger
curl -X POST http://localhost:5000/api/sync/trigger

# Check results
curl http://localhost:5000/api/sync/status
```

## Production Deployment

### Recommendations

- Set `PROPERTY_SYNC_INTERVAL` to appropriate value (60-120 minutes)
- Monitor service logs and statistics
- Set up alerts for sync failures
- Regular cleanup of expired properties

### Scaling Considerations

- Adjust batch size based on server resources
- Monitor API rate limits
- Consider running sync service on separate instance for large datasets
