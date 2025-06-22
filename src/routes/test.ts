import { Router, Request, Response } from 'express';
import cacheService from '../services/cacheService';

const router = Router();

// Test endpoint to populate cache with mock data
router.post('/populate-cache', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Test: Populating cache with mock data...');
    
    // Mock property data to save to MongoDB
    const mockProperties = [
      {
        id: 1001,
        name: "Marina Vista Towers - Cached",
        area: "Dubai Marina",
        area_unit: "sqft",
        cover_image_url: JSON.stringify([{
          url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
        }]),
        developer: "Emaar Properties",
        is_partner_project: true,
        min_price: 1200000,
        max_price: 2500000,
        price_currency: "AED",
        sale_status: "Available",
        status: "Off-plan",
        completion_datetime: "2025-06-15T00:00:00Z",
        coordinates: "25.0771, 55.1408",
        normalized_type: "Apartment"
      },
      {
        id: 1002,
        name: "Downtown Heights - Cached",
        area: "Downtown Dubai",
        area_unit: "sqft",
        cover_image_url: JSON.stringify([{
          url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
        }]),
        developer: "Damac Properties",
        is_partner_project: false,
        min_price: 2200000,
        max_price: 4500000,
        price_currency: "AED",
        sale_status: "Available",
        status: "Under Construction",
        completion_datetime: "2025-03-20T00:00:00Z",
        coordinates: "25.1972, 55.2744",
        normalized_type: "Apartment"
      }
    ];

    // Save to cache (MongoDB)
    const savedProperties = await cacheService.savePropertiesToCache(mockProperties);
    
    console.log(`✅ Test: Saved ${savedProperties.length} properties to MongoDB cache`);
    
    // Get cache stats
    const stats = await cacheService.getCacheStats();
    
    res.json({
      success: true,
      message: `Successfully populated cache with ${savedProperties.length} properties`,
      data: {
        savedProperties: savedProperties.length,
        cacheStats: stats
      }
    });
  } catch (error) {
    console.error('❌ Test: Error populating cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to populate cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to clear cache
router.delete('/clear-cache', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Test: Clearing cache...');
    
    await cacheService.clearExpiredCache();
    
    // Force clear all cache (for testing)
    const { Property } = await import('../models');
    await Property.deleteMany({});
    
    const stats = await cacheService.getCacheStats();
    
    console.log('✅ Test: Cache cleared');
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      data: {
        cacheStats: stats
      }
    });
  } catch (error) {
    console.error('❌ Test: Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to get cache stats
router.get('/cache-stats', async (req: Request, res: Response) => {
  try {
    const stats = await cacheService.getCacheStats();
    
    res.json({
      success: true,
      message: 'Cache statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('❌ Test: Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
