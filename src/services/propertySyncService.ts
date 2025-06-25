import axios, { AxiosResponse } from "axios";
import config from "../config";
import Property, { IProperty } from "../models/Property";

/**
 * Property Sync Service
 *
 * This service automatically fetches and stores property data from the Reelly API.
 * It handles pagination, duplicate checking, and error recovery.
 *
 * Features:
 * - Fetches all properties from /v1/properties with pagination
 * - Fetches detailed data from /v1/properties/{id} for each property
 * - Stores complete property data in database
 * - Prevents duplicates using externalId
 * - Robust error handling and retry logic
 * - Comprehensive logging for monitoring
 */

export interface PropertySyncStats {
  totalProcessed: number;
  newProperties: number;
  updatedProperties: number;
  skippedDuplicates: number;
  markedInactive: number; // NEW: Properties marked as inactive
  errors: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface PropertySyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxRetries: number;
  requestTimeout: number;
  batchSize: number;
  delayBetweenRequests: number;
  minSyncIntervalHours: number; // Minimum hours between syncs
  skipIfRecentData: boolean; // Skip sync if we have recent data
}

export interface LastSyncInfo {
  lastSyncTime: Date | null;
  lastSuccessfulSync: Date | null;
  totalProperties: number;
  lastSyncDuration: number;
}

export class PropertySyncService {
  private baseUrl: string;
  private apiKey: string;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private config: PropertySyncConfig;

  constructor() {
    this.baseUrl = config.externalApi.baseUrl;
    this.apiKey = config.externalApi.apiKey;

    // Default configuration
    this.config = {
      enabled: process.env.PROPERTY_SYNC_ENABLED === "true" || true,
      intervalMinutes: parseInt(process.env.PROPERTY_SYNC_INTERVAL || "1440"), // 24 hours default (1440 minutes)
      maxRetries: parseInt(process.env.PROPERTY_SYNC_MAX_RETRIES || "3"),
      requestTimeout: parseInt(process.env.PROPERTY_SYNC_TIMEOUT || "30000"), // 30 seconds
      batchSize: parseInt(process.env.PROPERTY_SYNC_BATCH_SIZE || "10"),
      delayBetweenRequests: parseInt(process.env.PROPERTY_SYNC_DELAY || "1000"), // 1 second
      minSyncIntervalHours: parseInt(
        process.env.PROPERTY_SYNC_MIN_INTERVAL_HOURS || "24"
      ), // 24 hours minimum
      skipIfRecentData:
        process.env.PROPERTY_SYNC_SKIP_IF_RECENT === "true" || true, // Skip if recent data exists
    };

    console.log(
      "🔄 Property Sync Service initialized with config:",
      this.config
    );
  }

  /**
   * Start the property sync service with smart scheduling
   */
  public start(): void {
    if (!this.config.enabled) {
      console.log("⏸️ Property Sync Service is disabled");
      return;
    }

    if (this.isRunning) {
      console.log("⚠️ Property Sync Service is already running");
      return;
    }

    console.log("🚀 Starting Property Sync Service...");
    this.isRunning = true;

    // Run initial smart sync (checks if sync is needed)
    this.runSmartSync().catch((error) => {
      console.error("❌ Initial property sync failed:", error);
    });

    // Schedule periodic smart syncs
    this.intervalId = setInterval(() => {
      this.runSmartSync().catch((error) => {
        console.error("❌ Scheduled property sync failed:", error);
      });
    }, this.config.intervalMinutes * 60 * 1000);

    console.log(
      `✅ Property Sync Service started (interval: ${this.config.intervalMinutes} minutes, min interval: ${this.config.minSyncIntervalHours} hours)`
    );
  }

  /**
   * Stop the property sync service
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log("⚠️ Property Sync Service is not running");
      return;
    }

    console.log("🛑 Stopping Property Sync Service...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log("✅ Property Sync Service stopped");
  }

  /**
   * Get service status with sync information
   */
  public async getStatus(): Promise<{
    isRunning: boolean;
    config: PropertySyncConfig;
    hasApiKey: boolean;
    hasBaseUrl: boolean;
    lastSyncInfo: LastSyncInfo;
    nextSyncTime: Date | null;
  }> {
    const lastSyncInfo = await this.getLastSyncInfo();
    let nextSyncTime: Date | null = null;

    if (lastSyncInfo.lastSuccessfulSync) {
      nextSyncTime = new Date(
        lastSyncInfo.lastSuccessfulSync.getTime() +
          this.config.minSyncIntervalHours * 60 * 60 * 1000
      );
    }

    return {
      isRunning: this.isRunning,
      config: this.config,
      hasApiKey: !!this.apiKey,
      hasBaseUrl: !!this.baseUrl,
      lastSyncInfo,
      nextSyncTime,
    };
  }

  /**
   * Smart sync that checks if sync is needed before running
   */
  public async runSmartSync(): Promise<PropertySyncStats | null> {
    try {
      console.log("🧠 Smart sync: Checking if sync is needed...");

      // Check if we should skip sync based on recent data
      if (this.config.skipIfRecentData) {
        const shouldSkip = await this.shouldSkipSync();
        if (shouldSkip.skip) {
          console.log(`⏭️ Skipping sync: ${shouldSkip.reason}`);
          return null;
        }
      }

      // Check minimum interval between syncs
      const lastSyncInfo = await this.getLastSyncInfo();
      if (lastSyncInfo.lastSuccessfulSync) {
        const hoursSinceLastSync =
          (Date.now() - lastSyncInfo.lastSuccessfulSync.getTime()) /
          (1000 * 60 * 60);

        if (hoursSinceLastSync < this.config.minSyncIntervalHours) {
          const hoursRemaining =
            this.config.minSyncIntervalHours - hoursSinceLastSync;
          console.log(
            `⏭️ Skipping sync: Last sync was ${hoursSinceLastSync.toFixed(
              1
            )} hours ago. Next sync in ${hoursRemaining.toFixed(1)} hours.`
          );
          return null;
        }
      }

      console.log("✅ Smart sync: Sync is needed, proceeding...");
      return await this.runSync();
    } catch (error) {
      console.error("❌ Smart sync check failed:", error);
      // If smart check fails, run sync anyway as fallback
      return await this.runSync();
    }
  }

  /**
   * Check if we should skip sync based on recent data
   */
  private async shouldSkipSync(): Promise<{ skip: boolean; reason: string }> {
    try {
      // Check if we have any properties in database
      const propertyCount = await Property.countDocuments({
        status: "active",
        reelly_status: true,
      });

      if (propertyCount === 0) {
        return { skip: false, reason: "No properties in database" };
      }

      // Check if we have recent properties (within last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPropertiesCount = await Property.countDocuments({
        status: "active",
        reelly_status: true,
        lastFetchedAt: { $gte: oneDayAgo },
      });

      if (recentPropertiesCount === 0) {
        return { skip: false, reason: "No recent properties found" };
      }

      // Check if most properties are recent (>80%)
      const recentPercentage = (recentPropertiesCount / propertyCount) * 100;
      if (recentPercentage < 80) {
        return {
          skip: false,
          reason: `Only ${recentPercentage.toFixed(
            1
          )}% of properties are recent`,
        };
      }

      return {
        skip: true,
        reason: `${recentPropertiesCount}/${propertyCount} (${recentPercentage.toFixed(
          1
        )}%) properties are recent`,
      };
    } catch (error) {
      console.error("❌ Error checking if sync should be skipped:", error);
      return { skip: false, reason: "Error checking recent data" };
    }
  }

  /**
   * Get information about the last sync
   */
  private async getLastSyncInfo(): Promise<LastSyncInfo> {
    try {
      const lastProperty = await Property.findOne(
        { source: "realty_api" },
        {},
        { sort: { lastFetchedAt: -1 } }
      );

      const totalProperties = await Property.countDocuments({
        status: "active",
        reelly_status: true,
      });

      return {
        lastSyncTime: lastProperty?.lastFetchedAt || null,
        lastSuccessfulSync: lastProperty?.lastFetchedAt || null,
        totalProperties,
        lastSyncDuration: 0, // Could be stored in a separate collection if needed
      };
    } catch (error) {
      console.error("❌ Error getting last sync info:", error);
      return {
        lastSyncTime: null,
        lastSuccessfulSync: null,
        totalProperties: 0,
        lastSyncDuration: 0,
      };
    }
  }

  /**
   * Run a complete property sync cycle
   */
  public async runSync(): Promise<PropertySyncStats> {
    const stats: PropertySyncStats = {
      totalProcessed: 0,
      newProperties: 0,
      updatedProperties: 0,
      skippedDuplicates: 0,
      markedInactive: 0,
      errors: 0,
      startTime: new Date(),
    };

    try {
      console.log("🔄 Starting property sync cycle...");

      // Validate configuration
      if (!this.baseUrl || !this.apiKey) {
        throw new Error("Missing API configuration (baseUrl or apiKey)");
      }

      // Fetch all property IDs with pagination
      const propertyIds = await this.fetchAllPropertyIds();
      console.log(`📋 Found ${propertyIds.length} properties to process`);

      // Process properties in batches
      for (let i = 0; i < propertyIds.length; i += this.config.batchSize) {
        const batch = propertyIds.slice(i, i + this.config.batchSize);
        console.log(
          `📦 Processing batch ${
            Math.floor(i / this.config.batchSize) + 1
          }/${Math.ceil(propertyIds.length / this.config.batchSize)} (${
            batch.length
          } properties)`
        );

        await this.processBatch(batch, stats);

        // Delay between batches to avoid overwhelming the API
        if (i + this.config.batchSize < propertyIds.length) {
          await this.delay(this.config.delayBetweenRequests);
        }
      }

      // STEP 2: Mark properties as inactive if they no longer exist in Reelly API
      console.log(
        "🔍 Checking for properties that no longer exist in Reelly API..."
      );
      const inactiveCount = await this.markInactiveProperties(propertyIds);
      stats.markedInactive = inactiveCount;

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      console.log("✅ Property sync cycle completed:", {
        duration: `${Math.round(stats.duration / 1000)}s`,
        totalProcessed: stats.totalProcessed,
        newProperties: stats.newProperties,
        updatedProperties: stats.updatedProperties,
        skippedDuplicates: stats.skippedDuplicates,
        markedInactive: stats.markedInactive,
        errors: stats.errors,
      });

      return stats;
    } catch (error) {
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      stats.errors++;

      console.error("❌ Property sync cycle failed:", error);
      throw error;
    }
  }

  /**
   * Fetch all property IDs from the listings endpoint with pagination
   */
  private async fetchAllPropertyIds(): Promise<number[]> {
    const propertyIds: number[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        console.log(`📄 Fetching property IDs from page ${currentPage}...`);

        const response = await this.makeApiRequest(
          `${this.baseUrl}/v1/properties?page=${currentPage}&limit=50`
        );

        const data = response.data;
        let properties: any[] = [];

        // Handle different response structures
        if (data.items && Array.isArray(data.items)) {
          properties = data.items;
        } else if (data.data && Array.isArray(data.data)) {
          properties = data.data;
        } else if (Array.isArray(data)) {
          properties = data;
        }

        if (properties.length === 0) {
          hasMorePages = false;
          console.log(`📄 No more properties found on page ${currentPage}`);
        } else {
          const pageIds = properties.map((p) => p.id).filter((id) => id);
          propertyIds.push(...pageIds);
          console.log(
            `📄 Found ${pageIds.length} property IDs on page ${currentPage}`
          );

          // Check pagination metadata
          if (data.pagination) {
            hasMorePages =
              data.pagination.has_next || currentPage < data.pagination.pages;
          } else {
            // If no pagination metadata, check if we got a full page
            hasMorePages = properties.length >= 50;
          }

          currentPage++;
        }

        // Delay between page requests
        await this.delay(this.config.delayBetweenRequests);
      } catch (error) {
        console.error(
          `❌ Error fetching property IDs from page ${currentPage}:`,
          error
        );

        // If it's a 404 or similar, we've reached the end
        if (error instanceof Error && error.message.includes("404")) {
          hasMorePages = false;
        } else {
          throw error;
        }
      }
    }

    console.log(`📋 Total property IDs collected: ${propertyIds.length}`);
    return propertyIds;
  }

  /**
   * Process a batch of property IDs
   */
  private async processBatch(
    propertyIds: number[],
    stats: PropertySyncStats
  ): Promise<void> {
    for (const propertyId of propertyIds) {
      try {
        await this.processProperty(propertyId, stats);
        await this.delay(this.config.delayBetweenRequests / 2); // Shorter delay within batch
      } catch (error) {
        stats.errors++;
        console.error(`❌ Error processing property ${propertyId}:`, error);
        // Continue with next property instead of failing the entire batch
      }
    }
  }

  /**
   * Process a single property
   */
  private async processProperty(
    propertyId: number,
    stats: PropertySyncStats
  ): Promise<void> {
    try {
      stats.totalProcessed++;
      console.log(`🔍 Processing property ${propertyId}...`);

      // Check if property already exists
      console.log(
        `📋 Checking if property ${propertyId} exists in database...`
      );
      const existingProperty = await Property.findByExternalId(propertyId);
      console.log(`📋 Property ${propertyId} exists: ${!!existingProperty}`);

      if (existingProperty) {
        // If property exists and is not expired, skip it
        const isExpired = existingProperty.isExpired();
        console.log(`📋 Property ${propertyId} is expired: ${isExpired}`);

        if (!isExpired) {
          stats.skippedDuplicates++;
          console.log(
            `⏭️ Skipping property ${propertyId} (already exists and not expired)`
          );

          // Still mark it as active in Reelly API (in case it was previously marked inactive)
          if (!existingProperty.reelly_status) {
            existingProperty.reelly_status = true;
            existingProperty.lastFetchedAt = new Date();
            await existingProperty.save();
            console.log(
              `✅ Reactivated property ${propertyId} (found in API again)`
            );
          }

          return;
        }

        console.log(
          `🔄 Property ${propertyId} exists but is expired, will update...`
        );
      }

      // Fetch detailed property data
      console.log(`🔍 Fetching detailed data for property ${propertyId}...`);
      const propertyData = await this.fetchPropertyDetails(propertyId);

      if (!propertyData) {
        console.log(`⚠️ No data found for property ${propertyId}`);
        return;
      }

      console.log(`📊 Property ${propertyId} data fetched successfully`);

      // Save or update property
      if (existingProperty) {
        console.log(`🔄 Updating existing property ${propertyId}...`);
        await this.updateProperty(existingProperty, propertyData);
        stats.updatedProperties++;
        console.log(`✅ Updated property ${propertyId}`);
      } else {
        console.log(`✨ Creating new property ${propertyId}...`);
        await this.createProperty(propertyData);
        stats.newProperties++;
        console.log(`✅ Created new property ${propertyId}`);
      }
    } catch (error) {
      console.error(`❌ Error processing property ${propertyId}:`, error);
      console.error(`❌ Error details:`, {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
        propertyId,
      });
      throw error;
    }
  }

  /**
   * Fetch detailed property data from /v1/properties/{id}
   */
  private async fetchPropertyDetails(propertyId: number): Promise<any | null> {
    try {
      const response = await this.makeApiRequest(
        `${this.baseUrl}/v1/properties/${propertyId}`
      );

      const data = response.data;

      // Handle different response structures
      if (data.data && typeof data.data === "object") {
        return data.data;
      } else if (data.property && typeof data.property === "object") {
        return data.property;
      } else if (typeof data === "object" && data.id) {
        return data;
      }

      console.log(
        `⚠️ Unexpected response structure for property ${propertyId}:`,
        Object.keys(data)
      );
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        console.log(`📭 Property ${propertyId} not found in API`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new property in the database
   */
  private async createProperty(propertyData: any): Promise<IProperty> {
    try {
      console.log(`💾 Creating property ${propertyData.id} with data:`, {
        id: propertyData.id,
        name: propertyData.name,
        area: propertyData.area,
        developer: propertyData.developer,
        hasCompleteData: !!propertyData,
      });

      const property = new Property({
        externalId: propertyData.id,
        name: propertyData.name || "Unknown Property",
        area: propertyData.area || "Unknown Area",
        area_unit: propertyData.area_unit || "sqft",
        cover_image_url: propertyData.cover_image_url || null,
        developer: propertyData.developer || "Unknown Developer",
        is_partner_project: propertyData.is_partner_project || false,
        min_price: propertyData.min_price || null,
        max_price: propertyData.max_price || null,
        price_currency: propertyData.price_currency || "AED",
        sale_status:
          propertyData.sale_status || propertyData.status || "Available",
        completion_datetime: propertyData.completion_datetime || null,
        coordinates: propertyData.coordinates || null,
        description: propertyData.description || propertyData.overview || "",

        // Store complete API response
        completePropertyData: propertyData,

        // Set metadata
        status: "active",
        featured: false,
        pendingReview: false,
        featureReason: [],
        reelly_status: true,
        lastFeaturedAt: null,
        lastFetchedAt: new Date(),
        cacheExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        source: "realty_api",
      });

      console.log(`💾 Property object created, attempting to save...`);

      // Analyze featuring potential (but don't auto-feature)
      this.analyzeFeaturingPotential(property, propertyData);

      const savedProperty = await property.save();
      console.log(
        `✅ Successfully saved property ${propertyData.id} to database`
      );

      return savedProperty;
    } catch (error) {
      console.error(`❌ Error creating property ${propertyData.id}:`, error);
      console.error(`❌ Property data that failed:`, {
        id: propertyData?.id,
        name: propertyData?.name,
        area: propertyData?.area,
        developer: propertyData?.developer,
        dataKeys: propertyData ? Object.keys(propertyData) : "No data",
      });
      throw error;
    }
  }

  /**
   * Update an existing property in the database
   */
  private async updateProperty(
    existingProperty: IProperty,
    propertyData: any
  ): Promise<IProperty> {
    try {
      // Update basic fields
      existingProperty.name = propertyData.name || existingProperty.name;
      existingProperty.area = propertyData.area || existingProperty.area;
      existingProperty.area_unit =
        propertyData.area_unit || existingProperty.area_unit;
      existingProperty.cover_image_url =
        propertyData.cover_image_url || existingProperty.cover_image_url;
      existingProperty.developer =
        propertyData.developer || existingProperty.developer;
      existingProperty.is_partner_project =
        propertyData.is_partner_project ?? existingProperty.is_partner_project;
      existingProperty.min_price =
        propertyData.min_price ?? existingProperty.min_price;
      existingProperty.max_price =
        propertyData.max_price ?? existingProperty.max_price;
      existingProperty.price_currency =
        propertyData.price_currency || existingProperty.price_currency;
      existingProperty.sale_status =
        propertyData.sale_status ||
        propertyData.status ||
        existingProperty.sale_status;
      existingProperty.completion_datetime =
        propertyData.completion_datetime ||
        existingProperty.completion_datetime;
      existingProperty.coordinates =
        propertyData.coordinates || existingProperty.coordinates;
      existingProperty.description =
        propertyData.description ||
        propertyData.overview ||
        existingProperty.description;

      // Update complete API data
      existingProperty.completePropertyData = propertyData;

      // Update metadata
      existingProperty.reelly_status = true;
      existingProperty.refreshCache(24); // Refresh cache for 24 hours

      // Analyze featuring potential based on updated criteria (but don't auto-feature)
      this.analyzeFeaturingPotential(existingProperty, propertyData);

      const savedProperty = await existingProperty.save();
      console.log(`💾 Updated property ${propertyData.id} in database`);

      return savedProperty;
    } catch (error) {
      console.error(`❌ Error updating property ${propertyData.id}:`, error);
      throw error;
    }
  }

  /**
   * Analyze property for potential featuring criteria (but don't auto-feature)
   */
  private analyzeFeaturingPotential(
    property: IProperty,
    propertyData: any
  ): void {
    const reasons: string[] = [];

    // Check if property could be featured for being a partner project
    if (propertyData.is_partner_project) {
      reasons.push("is_partner_project");
    }

    // Check if property could be featured for having many facilities
    if (
      propertyData.facilities &&
      Array.isArray(propertyData.facilities) &&
      propertyData.facilities.length >= 10
    ) {
      reasons.push("facilities.length >= 10");
    }

    // Check if property could be featured for having high-quality images
    if (
      propertyData.architecture &&
      Array.isArray(propertyData.architecture) &&
      propertyData.architecture.length >= 5
    ) {
      reasons.push("architecture.length >= 5");
    }

    // Check if property could be featured for being in premium areas
    const premiumAreas = [
      "Downtown Dubai",
      "Dubai Marina",
      "Palm Jumeirah",
      "Business Bay",
      "DIFC",
    ];
    if (
      propertyData.area &&
      premiumAreas.some((area) => propertyData.area.includes(area))
    ) {
      reasons.push("premium_location");
    }

    // Store potential featuring reasons for admin reference (but don't auto-feature)
    if (reasons.length > 0) {
      property.featureReason = [
        ...new Set([...property.featureReason, ...reasons]),
      ]; // Merge unique reasons
      console.log(
        `📋 Property ${propertyData.id} has featuring potential: ${reasons.join(
          ", "
        )} (manual featuring required)`
      );
    }
  }

  /**
   * Mark properties as inactive if they no longer exist in Reelly API
   */
  private async markInactiveProperties(
    activePropertyIds: number[]
  ): Promise<number> {
    try {
      console.log(
        `🔍 Checking database properties against ${activePropertyIds.length} active API properties...`
      );

      // Get all properties from database that currently have reelly_status: true
      const dbProperties = await Property.find(
        { reelly_status: true },
        { externalId: 1, name: 1, _id: 1 }
      );

      console.log(
        `📊 Found ${dbProperties.length} properties in database with reelly_status: true`
      );

      // Find properties that exist in database but not in API
      const inactiveProperties = dbProperties.filter(
        (dbProperty) => !activePropertyIds.includes(dbProperty.externalId)
      );

      if (inactiveProperties.length === 0) {
        console.log(
          "✅ All database properties are still active in Reelly API"
        );
        return 0;
      }

      console.log(
        `⚠️ Found ${inactiveProperties.length} properties that no longer exist in Reelly API:`
      );

      // Mark each inactive property
      let markedCount = 0;
      for (const inactiveProperty of inactiveProperties) {
        try {
          await Property.updateOne(
            { _id: inactiveProperty._id },
            {
              reelly_status: false,
              lastFetchedAt: new Date(), // Update timestamp to track when we marked it inactive
            }
          );

          console.log(
            `❌ Marked property ${inactiveProperty.externalId} (${inactiveProperty.name}) as inactive`
          );
          markedCount++;
        } catch (error) {
          console.error(
            `❌ Error marking property ${inactiveProperty.externalId} as inactive:`,
            error
          );
        }
      }

      console.log(
        `✅ Successfully marked ${markedCount} properties as inactive (reelly_status: false)`
      );
      return markedCount;
    } catch (error) {
      console.error("❌ Error in markInactiveProperties:", error);
      return 0;
    }
  }

  /**
   * Make API request with retry logic and proper error handling
   */
  private async makeApiRequest(url: string): Promise<AxiosResponse> {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Smart-Off-Plan-Sync/1.0.0",
      "X-API-Key": this.apiKey,
    };

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(
          `📡 API Request (${attempt}/${this.config.maxRetries}): ${url}`
        );

        const response = await axios.get(url, {
          headers,
          timeout: this.config.requestTimeout,
          validateStatus: (status) => status < 500, // Retry on 5xx errors
        });

        if (response.status >= 200 && response.status < 300) {
          return response;
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Authentication failed: ${response.status} ${response.statusText}`
          );
        }

        if (response.status === 404) {
          throw new Error(
            `Resource not found: ${response.status} ${response.statusText}`
          );
        }

        if (response.status === 429) {
          // Rate limited - wait longer before retry
          const delay = Math.pow(2, attempt) * 2000; // Exponential backoff with longer delay
          console.log(`⏳ Rate limited, waiting ${delay}ms before retry...`);
          await this.delay(delay);
          continue;
        }

        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      } catch (error) {
        console.log(
          `❌ API request failed (attempt ${attempt}):`,
          error instanceof Error ? error.message : error
        );

        if (attempt === this.config.maxRetries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }

    throw new Error("Max retries exceeded");
  }

  /**
   * Utility method to add delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update service configuration
   */
  public updateConfig(newConfig: Partial<PropertySyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("🔧 Property Sync Service configuration updated:", this.config);

    // Restart service if interval changed and service is running
    if (newConfig.intervalMinutes && this.isRunning) {
      console.log("🔄 Restarting service with new interval...");
      this.stop();
      this.start();
    }
  }

  /**
   * Manual sync trigger (for testing or admin use)
   */
  public async triggerManualSync(): Promise<PropertySyncStats> {
    console.log("🔧 Manual property sync triggered");
    return await this.runSync();
  }

  /**
   * Get sync statistics from database
   */
  public async getSyncStatistics(): Promise<{
    totalProperties: number;
    activeProperties: number;
    featuredProperties: number;
    pendingReview: number;
    lastSyncTime: Date | null;
    expiredProperties: number;
  }> {
    try {
      const [
        totalProperties,
        activeProperties,
        featuredProperties,
        pendingReview,
        lastSyncProperty,
        expiredProperties,
      ] = await Promise.all([
        Property.countDocuments(),
        Property.countDocuments({ status: "active", reelly_status: true }),
        Property.countDocuments({ featured: true, status: "active" }),
        Property.countDocuments({ pendingReview: true, status: "active" }),
        Property.findOne({}, {}, { sort: { lastFetchedAt: -1 } }),
        Property.countDocuments({ cacheExpiresAt: { $lt: new Date() } }),
      ]);

      return {
        totalProperties,
        activeProperties,
        featuredProperties,
        pendingReview,
        lastSyncTime: lastSyncProperty?.lastFetchedAt || null,
        expiredProperties,
      };
    } catch (error) {
      console.error("❌ Error getting sync statistics:", error);
      throw error;
    }
  }

  /**
   * Clean up expired and inactive properties
   */
  public async cleanupProperties(): Promise<{
    expiredRemoved: number;
    inactiveMarked: number;
  }> {
    try {
      console.log("🧹 Starting property cleanup...");

      // Mark expired properties for review
      const expiredProperties = await Property.find({
        cacheExpiresAt: { $lt: new Date() },
      });
      let inactiveMarked = 0;

      for (const property of expiredProperties) {
        property.markForReview();
        await property.save();
        inactiveMarked++;
      }

      // Remove properties that haven't been updated in 30 days and are marked as inactive
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Property.deleteMany({
        reelly_status: false,
        lastFetchedAt: { $lt: thirtyDaysAgo },
        status: "disabled",
      });

      console.log(
        `🧹 Cleanup completed: ${result.deletedCount} expired properties removed, ${inactiveMarked} marked for review`
      );

      return {
        expiredRemoved: result.deletedCount || 0,
        inactiveMarked,
      };
    } catch (error) {
      console.error("❌ Error during property cleanup:", error);
      throw error;
    }
  }
}

// Export singleton instance
export default new PropertySyncService();
