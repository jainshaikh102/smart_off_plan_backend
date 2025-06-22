import {
  Property,
  UnitBlock,
  PaymentPlan,
  Facility,
  IProperty,
} from "../models";
import database from "../database/connection";

export interface CacheOptions {
  ttlHours?: number; // Time to live in hours
  forceRefresh?: boolean; // Force refresh from external API
}

export class CacheService {
  private defaultTTL = 24; // 24 hours default cache TTL

  /**
   * Check if database is available
   */
  private isDatabaseAvailable(): boolean {
    return database.getConnectionStatus();
  }

  /**
   * Get property from cache by external ID
   */
  async getPropertyFromCache(externalId: number): Promise<IProperty | null> {
    if (!this.isDatabaseAvailable()) {
      console.log("📊 Database not available, skipping cache check");
      return null;
    }

    try {
      const property = await Property.findOne({ externalId });

      if (!property) {
        console.log(`📊 Property ${externalId} not found in cache`);
        return null;
      }

      if (new Date() > property.cacheExpiresAt) {
        console.log(`📊 Property ${externalId} cache expired`);
        return null;
      }

      console.log(`✅ Property ${externalId} found in cache`);
      return property;
    } catch (error) {
      console.error("❌ Error checking cache for property:", error);
      return null;
    }
  }

  /**
   * Get all properties from cache with filtering
   */
  async getPropertiesFromCache(
    filters: {
      area?: string;
      developer?: string;
      status?: string;
      min_price?: number;
      max_price?: number;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<IProperty[]> {
    if (!this.isDatabaseAvailable()) {
      console.log("📊 Database not available, skipping cache check");
      return [];
    }

    try {
      let query: any = {
        cacheExpiresAt: { $gt: new Date() }, // Only non-expired items
      };

      // Apply filters
      if (filters.area) {
        query.area = new RegExp(filters.area, "i");
      }

      if (filters.developer) {
        query.developer = new RegExp(filters.developer, "i");
      }

      if (filters.status) {
        query.$or = [
          { status: new RegExp(filters.status, "i") },
          { sale_status: new RegExp(filters.status, "i") },
        ];
      }

      if (filters.min_price) {
        query.min_price = { $gte: filters.min_price };
      }

      if (filters.max_price) {
        query.max_price = { $lte: filters.max_price };
      }

      let queryBuilder = Property.find(query).sort({ lastFetchedAt: -1 });

      // Apply pagination
      if (filters.page && filters.limit) {
        const skip = (filters.page - 1) * filters.limit;
        queryBuilder = queryBuilder.skip(skip).limit(filters.limit);
      } else if (filters.limit) {
        queryBuilder = queryBuilder.limit(filters.limit);
      }

      const properties = await queryBuilder.exec();
      console.log(`✅ Found ${properties.length} properties in cache`);
      return properties;
    } catch (error) {
      console.error("❌ Error getting properties from cache:", error);
      return [];
    }
  }

  /**
   * Save property to cache
   */
  async savePropertyToCache(
    propertyData: any,
    options: CacheOptions = {}
  ): Promise<IProperty | null> {
    if (!this.isDatabaseAvailable()) {
      console.log("📊 Database not available, skipping cache save");
      return null;
    }

    try {
      const ttlHours = options.ttlHours || this.defaultTTL;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

      const propertyDoc = {
        externalId: propertyData.id,
        name: propertyData.name,
        area: propertyData.area,
        area_unit: propertyData.area_unit,
        cover_image_url: propertyData.cover_image_url,
        developer: propertyData.developer,
        is_partner_project: propertyData.is_partner_project || false,
        min_price: propertyData.min_price,
        max_price: propertyData.max_price,
        price_currency: propertyData.price_currency || "AED",
        sale_status: propertyData.sale_status,
        status: propertyData.status,
        completion_datetime: propertyData.completion_datetime,
        coordinates: propertyData.coordinates,
        normalized_type: propertyData.normalized_type,
        description: propertyData.description,
        address: propertyData.address,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        size_sqft: propertyData.size_sqft,
        size_sqm: propertyData.size_sqm,
        seoTitle: propertyData.seoTitle,
        seoDescription: propertyData.seoDescription,
        lastFetchedAt: now,
        cacheExpiresAt: expiresAt,
        source: "realty_api",
      };

      const property = await Property.findOneAndUpdate(
        { externalId: propertyData.id },
        propertyDoc,
        { upsert: true, new: true, runValidators: true }
      );

      console.log(`✅ Property ${propertyData.id} saved to cache`);
      return property;
    } catch (error) {
      console.error("❌ Error saving property to cache:", error);
      return null;
    }
  }

  /**
   * Save multiple properties to cache
   */
  async savePropertiesToCache(
    propertiesData: any[],
    options: CacheOptions = {}
  ): Promise<IProperty[]> {
    if (!this.isDatabaseAvailable()) {
      console.log("📊 Database not available, skipping cache save");
      return [];
    }

    const savedProperties: IProperty[] = [];

    for (const propertyData of propertiesData) {
      const saved = await this.savePropertyToCache(propertyData, options);
      if (saved) {
        savedProperties.push(saved);
      }
    }

    console.log(`✅ Saved ${savedProperties.length} properties to cache`);
    return savedProperties;
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    if (!this.isDatabaseAvailable()) {
      return;
    }

    try {
      const now = new Date();

      const [
        propertiesResult,
        unitBlocksResult,
        paymentPlansResult,
        facilitiesResult,
      ] = await Promise.all([
        Property.deleteMany({ cacheExpiresAt: { $lt: now } }),
        UnitBlock.deleteMany({ cacheExpiresAt: { $lt: now } }),
        PaymentPlan.deleteMany({ cacheExpiresAt: { $lt: now } }),
        Facility.deleteMany({ cacheExpiresAt: { $lt: now } }),
      ]);

      const totalDeleted =
        propertiesResult.deletedCount +
        unitBlocksResult.deletedCount +
        paymentPlansResult.deletedCount +
        facilitiesResult.deletedCount;

      if (totalDeleted > 0) {
        console.log(`🧹 Cleared ${totalDeleted} expired cache entries`);
      }
    } catch (error) {
      console.error("❌ Error clearing expired cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    properties: number;
    unitBlocks: number;
    paymentPlans: number;
    facilities: number;
    expired: number;
  }> {
    if (!this.isDatabaseAvailable()) {
      return {
        properties: 0,
        unitBlocks: 0,
        paymentPlans: 0,
        facilities: 0,
        expired: 0,
      };
    }

    try {
      const now = new Date();

      const [
        properties,
        unitBlocks,
        paymentPlans,
        facilities,
        expiredProperties,
      ] = await Promise.all([
        Property.countDocuments(),
        UnitBlock.countDocuments(),
        PaymentPlan.countDocuments(),
        Facility.countDocuments(),
        Property.countDocuments({ cacheExpiresAt: { $lt: now } }),
      ]);

      return {
        properties,
        unitBlocks,
        paymentPlans,
        facilities,
        expired: expiredProperties,
      };
    } catch (error) {
      console.error("❌ Error getting cache stats:", error);
      return {
        properties: 0,
        unitBlocks: 0,
        paymentPlans: 0,
        facilities: 0,
        expired: 0,
      };
    }
  }
}

export default new CacheService();
