import axios from "axios";
import config from "../config";
import {
  Property,
  ApiResponse,
  GetPropertiesQuery,
  PropertyDetailsResponse,
} from "../types";
import cacheService from "./cacheService";
import realtyApiService, { RealtyApiProperty } from "./realtyApiService";
import { IProperty } from "../models";
import PropertyModel from "../models/Property";

export class PropertyService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.externalApi.baseUrl;
    this.apiKey = config.externalApi.apiKey;
  }

  /**
   * Transform Realty API property to our internal format
   */
  private transformRealtyApiProperty(apiProperty: RealtyApiProperty): Property {
    return {
      id: apiProperty.id,
      name: apiProperty.name,
      area: apiProperty.area,
      area_unit: apiProperty.area_unit,
      cover_image_url: apiProperty.cover_image_url,
      developer: apiProperty.developer,
      is_partner_project: apiProperty.is_partner_project || false,
      min_price: apiProperty.min_price,
      max_price: apiProperty.max_price,
      price_currency: apiProperty.price_currency,
      sale_status: apiProperty.sale_status,
      status: apiProperty.status,
      completion_datetime: apiProperty.completion_datetime,
      coordinates: apiProperty.coordinates,
      normalized_type: apiProperty.normalized_type,
    };
  }

  /**
   * Transform cached property to our internal format (NEW SCHEMA)
   */
  private transformCachedProperty(cachedProperty: IProperty): Property {
    return {
      id: cachedProperty.externalId,
      name: cachedProperty.name,
      area: cachedProperty.area,
      area_unit: cachedProperty.area_unit,
      cover_image_url: cachedProperty.cover_image_url,
      developer: cachedProperty.developer,
      is_partner_project: cachedProperty.is_partner_project,
      min_price: cachedProperty.min_price,
      max_price: cachedProperty.max_price,
      price_currency: cachedProperty.price_currency,
      sale_status: cachedProperty.sale_status,
      status: cachedProperty.status,
      completion_datetime: cachedProperty.completion_datetime,
      coordinates: cachedProperty.coordinates,
      // Remove normalized_type as it's not in new schema
    };
  }

  /**
   * Transform database property to detailed response format (NEW SCHEMA)
   */
  private transformDatabasePropertyToDetail(dbProperty: IProperty): any {
    return {
      // Core property information
      id: dbProperty.externalId,
      externalId: dbProperty.externalId,
      name: dbProperty.name,
      area: dbProperty.area,
      area_unit: dbProperty.area_unit,
      cover_image_url: dbProperty.cover_image_url,
      developer: dbProperty.developer,
      is_partner_project: dbProperty.is_partner_project,
      min_price: dbProperty.min_price,
      max_price: dbProperty.max_price,
      price_currency: dbProperty.price_currency,
      sale_status: dbProperty.sale_status,
      completion_datetime: dbProperty.completion_datetime,
      coordinates: dbProperty.coordinates,
      description: dbProperty.description,

      // Property status and control fields
      status: dbProperty.status,
      featured: dbProperty.featured,
      pendingReview: dbProperty.pendingReview,
      featureReason: dbProperty.featureReason,
      reelly_status: dbProperty.reelly_status,
      lastFeaturedAt: dbProperty.lastFeaturedAt,

      // Complete API data
      completePropertyData: dbProperty.completePropertyData,

      // Cache metadata
      lastFetchedAt: dbProperty.lastFetchedAt,
      cacheExpiresAt: dbProperty.cacheExpiresAt,
      source: dbProperty.source,

      // Timestamps
      createdAt: dbProperty.createdAt,
      updatedAt: dbProperty.updatedAt,
    };
  }

  /**
   * Transform database property to list item format (for property listings)
   */
  private transformDatabasePropertyToListItem(dbProperty: any): Property {
    return {
      id: dbProperty.externalId,
      name: dbProperty.name,
      area: dbProperty.area,
      area_unit: dbProperty.area_unit,
      cover_image_url: dbProperty.cover_image_url,
      developer: dbProperty.developer,
      is_partner_project: dbProperty.is_partner_project,
      min_price: dbProperty.min_price,
      max_price: dbProperty.max_price,
      price_currency: dbProperty.price_currency,
      sale_status: dbProperty.sale_status,
      status: dbProperty.status,
      completion_datetime: dbProperty.completion_datetime,
      coordinates: dbProperty.coordinates,
      normalized_type: dbProperty.normalized_type || "Property",
    };
  }

  // Mock data that matches your frontend's expected structure
  private getMockProperties(): Property[] {
    return [
      {
        id: 1,
        name: "Marina Vista Towers",
        area: "Dubai Marina",
        area_unit: "sqft",
        cover_image_url: JSON.stringify([
          {
            url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          },
        ]),
        developer: "Emaar Properties",
        is_partner_project: true,
        min_price: 1200000,
        max_price: 2500000,
        price_currency: "AED",
        sale_status: "Available",
        status: "Off-plan",
        completion_datetime: "2025-06-15T00:00:00Z",
        coordinates: "25.0771, 55.1408",
        normalized_type: "Apartment",
      },
      {
        id: 2,
        name: "Downtown Heights",
        area: "Downtown Dubai",
        area_unit: "sqft",
        cover_image_url: JSON.stringify([
          {
            url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          },
        ]),
        developer: "Damac Properties",
        is_partner_project: false,
        min_price: 2200000,
        max_price: 4500000,
        price_currency: "AED",
        sale_status: "Available",
        status: "Under Construction",
        completion_datetime: "2025-03-20T00:00:00Z",
        coordinates: "25.1972, 55.2744",
        normalized_type: "Apartment",
      },
      {
        id: 3,
        name: "Business Bay Tower",
        area: "Business Bay",
        area_unit: "sqft",
        cover_image_url: JSON.stringify([
          {
            url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          },
        ]),
        developer: "Select Group",
        is_partner_project: true,
        min_price: 950000,
        max_price: 1800000,
        price_currency: "AED",
        sale_status: "Available",
        status: "Off-plan",
        completion_datetime: "2025-09-10T00:00:00Z",
        coordinates: "25.1881, 55.2604",
        normalized_type: "Studio",
      },
      {
        id: 4,
        name: "Palm Luxury Villa",
        area: "Palm Jumeirah",
        area_unit: "sqft",
        cover_image_url: JSON.stringify([
          {
            url: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          },
        ]),
        developer: "Nakheel",
        is_partner_project: false,
        min_price: 8500000,
        max_price: 15000000,
        price_currency: "AED",
        sale_status: "Available",
        status: "Ready",
        completion_datetime: "2024-12-31T00:00:00Z",
        coordinates: "25.1124, 55.139",
        normalized_type: "Villa",
      },
      {
        id: 5,
        name: "JBR Beachfront",
        area: "Jumeirah Beach Residence",
        area_unit: "sqft",
        cover_image_url: JSON.stringify([
          {
            url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          },
        ]),
        developer: "Dubai Properties",
        is_partner_project: true,
        min_price: 1800000,
        max_price: 3200000,
        price_currency: "AED",
        sale_status: "Available",
        status: "Under Construction",
        completion_datetime: "2025-01-15T00:00:00Z",
        coordinates: "25.0869, 55.1442",
        normalized_type: "Apartment",
      },
    ];
  }

  // Get featured properties (all featured properties without limit)
  async getFeaturedProperties(): Promise<ApiResponse<Property[]>> {
    try {
      console.log(`🌟 Getting all featured properties (no limit)`);

      const featuredProperties = await PropertyModel.find({ featured: true })
        .sort({ createdAt: -1 })
        .lean();

      console.log(`✅ Found ${featuredProperties.length} featured properties`);

      const transformedProperties = featuredProperties.map((property) =>
        this.transformDatabaseProperty(property)
      );

      return {
        success: true,
        data: transformedProperties,
        message: `Successfully fetched ${transformedProperties.length} featured properties`,
      };
    } catch (error) {
      console.error("❌ Error fetching featured properties:", error);
      return {
        success: false,
        data: [],
        message: "Failed to fetch featured properties",
      };
    }
  }

  // Get properties sorted by completion date (ascending order - earliest completion first)
  async getPropertiesByCompletion(): Promise<ApiResponse<Property[]>> {
    try {
      console.log(
        `📅 Getting properties sorted by completion date (ascending)`
      );

      const properties = await PropertyModel.find({
        completion_datetime: { $exists: true, $ne: null },
        reelly_status: true, // Only active properties
      })
        .sort({ completion_datetime: 1 }) // Ascending order (earliest first)
        .lean();

      console.log(
        `✅ Found ${properties.length} properties with completion dates`
      );

      const transformedProperties = properties.map((property) =>
        this.transformDatabaseProperty(property)
      );

      return {
        success: true,
        data: transformedProperties,
        message: `Successfully fetched ${transformedProperties.length} properties sorted by completion date`,
      };
    } catch (error) {
      console.error("❌ Error fetching properties by completion:", error);
      return {
        success: false,
        data: [],
        message: "Failed to fetch properties by completion date",
      };
    }
  }

  // Get properties by developer
  async getPropertiesByDeveloper(
    developer: string
  ): Promise<ApiResponse<Property[]>> {
    try {
      console.log(`🏢 Getting properties by developer: ${developer}`);

      // Case-insensitive search for developer
      const properties = await PropertyModel.find({
        developer: { $regex: new RegExp(developer, "i") },
        reelly_status: true, // Only active properties
      })
        .sort({ name: 1 }) // Sort by property name
        .lean();

      console.log(
        `✅ Found ${properties.length} properties by developer: ${developer}`
      );

      const transformedProperties = properties.map((property) =>
        this.transformDatabaseProperty(property)
      );

      return {
        success: true,
        data: transformedProperties,
        message: `Successfully fetched ${transformedProperties.length} properties by developer: ${developer}`,
      };
    } catch (error) {
      console.error("❌ Error fetching properties by developer:", error);
      return {
        success: false,
        data: [],
        message: "Failed to fetch properties by developer",
      };
    }
  }

  // Get properties by area
  async getPropertiesByArea(area: string): Promise<ApiResponse<Property[]>> {
    try {
      console.log(`🏙️ Getting properties by area: ${area}`);

      // Case-insensitive search for area
      const properties = await PropertyModel.find({
        area: { $regex: new RegExp(area, "i") },
        reelly_status: true, // Only active properties
      })
        .sort({ name: 1 }) // Sort by property name
        .lean();

      console.log(`✅ Found ${properties.length} properties in area: ${area}`);

      const transformedProperties = properties.map((property) =>
        this.transformDatabaseProperty(property)
      );

      return {
        success: true,
        data: transformedProperties,
        message: `Successfully fetched ${transformedProperties.length} properties in area: ${area}`,
      };
    } catch (error) {
      console.error("❌ Error fetching properties by area:", error);
      return {
        success: false,
        data: [],
        message: "Failed to fetch properties by area",
      };
    }
  }

  // Get all properties from database (NEW: Database-first approach)
  async getAllPropertiesFromDatabase(
    query: GetPropertiesQuery = {}
  ): Promise<ApiResponse<Property[]>> {
    try {
      console.log(
        "🗄️ [DATABASE-FIRST] Getting properties from database with query:",
        query
      );

      // Build MongoDB query
      const mongoQuery: any = {
        status: "active", // Only get active properties
        reelly_status: true, // Only get properties that exist in Reelly API
      };

      // Add filters
      if (query.area) {
        mongoQuery.area = { $regex: query.area, $options: "i" };
      }

      if (query.developer) {
        mongoQuery.developer = { $regex: query.developer, $options: "i" };
      }

      if (query.status) {
        // Map frontend status to database fields
        if (query.status.toLowerCase() === "available") {
          mongoQuery.sale_status = { $regex: "available", $options: "i" };
        } else {
          mongoQuery.$or = [
            { sale_status: { $regex: query.status, $options: "i" } },
            { status: { $regex: query.status, $options: "i" } },
          ];
        }
      }

      if (query.min_price) {
        mongoQuery.min_price = { $gte: query.min_price };
      }

      if (query.max_price) {
        mongoQuery.max_price = { $lte: query.max_price };
      }

      console.log("🔍 MongoDB query:", mongoQuery);

      // Build sort criteria
      let sortCriteria: any = {};
      switch (query.sort) {
        case "completion_asc":
          sortCriteria = { completion_datetime: 1 };
          break;
        case "completion_desc":
          sortCriteria = { completion_datetime: -1 };
          break;
        case "price_asc":
          sortCriteria = { min_price: 1 };
          break;
        case "price_desc":
          sortCriteria = { max_price: -1 };
          break;
        case "name_asc":
          sortCriteria = { name: 1 };
          break;
        case "name_desc":
          sortCriteria = { name: -1 };
          break;
        case "featured":
          sortCriteria = { featured: -1, lastFeaturedAt: -1, createdAt: -1 };
          break;
        default:
          // Default: featured first, then by creation date
          sortCriteria = { featured: -1, createdAt: -1 };
      }

      // Pagination
      // const page = query.page || 1;
      // const limit = query.limit || 12;
      // const skip = (page - 1) * limit;

      // console.log(`📄 Pagination: page ${page}, limit ${limit}, skip ${skip}`);

      // Execute query with pagination
      // const [properties, totalCount] = await Promise.all([
      //   PropertyModel.find(mongoQuery)
      //     .sort(sortCriteria)
      //     .skip(skip)
      //     .limit(limit)
      //     .lean(),
      //   PropertyModel.countDocuments(mongoQuery),
      // ]);

      const [properties, totalCount] = await Promise.all([
        PropertyModel.find(mongoQuery).sort(sortCriteria).lean(), // Remove .skip() and .limit()
        PropertyModel.countDocuments(mongoQuery),
      ]);

      console.log(
        `✅ Found ${properties.length} properties in database (total: ${totalCount})`
      );

      // Transform database properties to API format
      const transformedProperties = properties.map(
        this.transformDatabasePropertyToListItem
      );

      return {
        success: true,
        data: transformedProperties,
        message: `Successfully fetched ${transformedProperties.length} properties from database`,
        pagination: {
          page: 1, // Default to page 1 since no pagination
          limit: totalCount, // Set limit to total count since all data is fetched
          total: totalCount,
          totalPages: 1, // Only one page since all data is fetched
        },
        // pagination: {
        //   page,
        //   limit,
        //   total: totalCount,
        //   totalPages: Math.ceil(totalCount / limit),
        // },
      };
    } catch (error) {
      console.error("❌ Error fetching properties from database:", error);
      throw new Error("Failed to fetch properties from database");
    }
  }

  // Get all properties with optional filtering and sorting (LEGACY: API-first approach)
  async getAllProperties(
    query: GetPropertiesQuery = {}
  ): Promise<ApiResponse<Property[]>> {
    try {
      console.log("🔍 Getting properties with query:", query);

      let properties: Property[] = [];
      const forceRefresh =
        query.forceRefresh === "true" || query.forceRefresh === true;

      // Step 1: Try to get properties from cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedProperties = await cacheService.getPropertiesFromCache({
          area: query.area,
          developer: query.developer,
          status: query.status,
          min_price: query.min_price,
          max_price: query.max_price,
          limit: query.limit,
          page: query.page,
        });

        if (cachedProperties.length > 0) {
          console.log(
            `✅ Found ${cachedProperties.length} properties in cache`
          );
          properties = cachedProperties.map(this.transformCachedProperty);
        }
      }

      // Step 2: Fetch from Realty API if cache miss or force refresh
      if (properties.length === 0 || forceRefresh) {
        if (forceRefresh) {
          console.log(
            "🔄 Force refresh: Fetching fresh data from Realty API..."
          );
        } else {
          console.log(
            "📡 No cached properties found, fetching from Realty API..."
          );
        }

        // Fetch from Realty API
        try {
          const apiProperties = await realtyApiService.fetchProperties({
            page: query.page,
            limit: query.limit,
            area: query.area,
            developer: query.developer,
            status: query.status,
            min_price: query.min_price,
            max_price: query.max_price,
          });

          if (apiProperties.length > 0) {
            console.log(
              `✅ Fetched ${apiProperties.length} properties from Realty API`
            );

            // Step 3: Save to cache for future requests
            await cacheService.savePropertiesToCache(apiProperties);

            // Transform for response
            properties = apiProperties.map(this.transformRealtyApiProperty);
          } else {
            console.log("📭 No properties found in Realty API");
          }
        } catch (apiError) {
          console.error(
            "❌ Realty API error, falling back to mock data:",
            apiError
          );
          // Step 4: Fallback to mock data if API fails
          properties = this.getMockProperties();
        }
      }

      // Apply filters
      if (query.area) {
        properties = properties.filter((p) =>
          p.area.toLowerCase().includes(query.area!.toLowerCase())
        );
      }

      if (query.developer) {
        properties = properties.filter((p) =>
          p.developer.toLowerCase().includes(query.developer!.toLowerCase())
        );
      }

      if (query.status) {
        properties = properties.filter(
          (p) =>
            p.status.toLowerCase() === query.status!.toLowerCase() ||
            p.sale_status.toLowerCase() === query.status!.toLowerCase()
        );
      }

      if (query.min_price) {
        properties = properties.filter(
          (p) => p.min_price && p.min_price >= query.min_price!
        );
      }

      if (query.max_price) {
        properties = properties.filter(
          (p) => p.max_price && p.max_price <= query.max_price!
        );
      }

      // Apply sorting
      switch (query.sort) {
        case "completion_asc":
          properties.sort((a, b) => {
            const dateA = a.completion_datetime
              ? new Date(a.completion_datetime).getTime()
              : Infinity;
            const dateB = b.completion_datetime
              ? new Date(b.completion_datetime).getTime()
              : Infinity;
            return dateA - dateB;
          });
          break;
        case "completion_desc":
          properties.sort((a, b) => {
            const dateA = a.completion_datetime
              ? new Date(a.completion_datetime).getTime()
              : -Infinity;
            const dateB = b.completion_datetime
              ? new Date(b.completion_datetime).getTime()
              : -Infinity;
            return dateB - dateA;
          });
          break;
        case "price_asc":
          properties.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
          break;
        case "price_desc":
          properties.sort((a, b) => (b.max_price || 0) - (a.max_price || 0));
          break;
        case "name_asc":
          properties.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "name_desc":
          properties.sort((a, b) => b.name.localeCompare(a.name));
          break;
        default:
          // Default sort by completion date ascending
          properties.sort((a, b) => {
            const dateA = a.completion_datetime
              ? new Date(a.completion_datetime).getTime()
              : Infinity;
            const dateB = b.completion_datetime
              ? new Date(b.completion_datetime).getTime()
              : Infinity;
            return dateA - dateB;
          });
      }

      // Apply pagination
      const page = query.page || 1;
      const limit = query.limit || 50;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProperties = properties.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedProperties,
        message: `Successfully fetched ${paginatedProperties.length} properties`,
        pagination: {
          page,
          limit,
          total: properties.length,
          totalPages: Math.ceil(properties.length / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching properties:", error);
      throw new Error("Failed to fetch properties");
    }
  }

  /**
   * Get property by ID with NEW SCHEMA - Complete rebuild from scratch
   */
  async getPropertyById(id: number): Promise<ApiResponse<any | null>> {
    try {
      console.log(`🔍 [NEW SCHEMA] Getting property by ID: ${id}`);

      // Step 1: Check if property exists in our MongoDB database with new schema
      const existingProperty = await PropertyModel.findByExternalId(id);

      if (existingProperty) {
        // Check if cache is still valid
        const isExpired = existingProperty.isExpired();

        if (!isExpired && existingProperty.reelly_status) {
          console.log(`✅ Found fresh property ${id} in database`);
          const property =
            this.transformDatabasePropertyToDetail(existingProperty);
          return {
            success: true,
            data: property,
            message: `Fetched property ${id} from local database`,
          };
        }

        console.log(
          `♻️ Property ${id} cache expired or Reelly status changed. Refreshing...`
        );
      }

      // Step 2: Fetch from Reelly API
      const apiProperty = await this.fetchPropertyFromReallyAPI(id);

      if (apiProperty) {
        console.log(`✅ Fetched property ${id} from Reelly API`);

        // Step 3: Save/update in database with new schema
        const savedProperty = await this.saveOrUpdatePropertyWithNewSchema(
          id,
          apiProperty
        );

        const property = this.transformDatabasePropertyToDetail(savedProperty);

        return {
          success: true,
          data: property,
          message: `Fetched property ${id} from Reelly API and updated database`,
        };
      }

      // Step 4: If property exists in DB but not in API, mark as inactive
      if (existingProperty) {
        console.log(
          `⚠️ Property ${id} not found in Reelly API, marking as inactive`
        );
        existingProperty.reelly_status = false;
        existingProperty.status = "disabled";
        await existingProperty.save();

        const property =
          this.transformDatabasePropertyToDetail(existingProperty);
        return {
          success: true,
          data: property,
          message: `Property ${id} not found in Reelly API (marked as inactive)`,
        };
      }

      console.log(`📭 Property ${id} not found anywhere`);
      return {
        success: false,
        data: null,
        message: `Property with ID ${id} not found`,
      };
    } catch (error) {
      console.error("❌ Error in getPropertyById (NEW SCHEMA):", error);
      return {
        success: false,
        data: null,
        message: "Failed to fetch property",
      };
    }
  }

  /**
   * Fetch property from Reelly API (NEW SCHEMA)
   */
  private async fetchPropertyFromReallyAPI(id: number): Promise<any | null> {
    try {
      console.log(`📡 [NEW SCHEMA] Calling Reelly API for property: ${id}`);

      if (!this.baseUrl || !this.apiKey) {
        throw new Error("Reelly API configuration missing");
      }

      const url = `${this.baseUrl}/v1/properties/${id}`;
      console.log(`🔗 API URL: ${url}`);

      const response = await axios.get(url, {
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });

      if (response.data && response.data.id) {
        console.log(`✅ Successfully fetched property ${id} from Reelly API`);
        return response.data;
      }

      console.log(`📭 Property ${id} not found in Reelly API`);
      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`📭 Property ${id} not found in Reelly API (404)`);
        return null;
      }
      console.error(
        `❌ Error fetching property ${id} from Reelly API:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Save or update property with NEW SCHEMA
   */
  private async saveOrUpdatePropertyWithNewSchema(
    externalId: number,
    apiData: any
  ): Promise<IProperty> {
    try {
      console.log(
        `💾 [NEW SCHEMA] Saving/updating property ${externalId} in database`
      );

      // Prepare property data with new schema
      const propertyData = {
        externalId: externalId,
        name: apiData.name || "Unknown Property",
        area: apiData.area || "Unknown Area",
        area_unit: apiData.area_unit,
        cover_image_url: apiData.cover_image_url,
        developer: apiData.developer || "Unknown Developer",
        is_partner_project: apiData.is_partner_project || false,
        min_price: apiData.min_price,
        max_price: apiData.max_price,
        price_currency: apiData.price_currency || "AED",
        sale_status: apiData.sale_status || "Available",
        completion_datetime: apiData.completion_datetime,
        coordinates: apiData.coordinates,
        description: apiData.description,

        // Complete API data storage
        completePropertyData: apiData,

        // Property status and control fields (NEW SCHEMA)
        status: "active", // Default to active for new properties
        featured: false, // Will be set by rules later
        pendingReview: false, // Will be set by rules if needed
        featureReason: [], // Will be populated by rules
        reelly_status: true, // Property exists in Reelly API
        lastFeaturedAt: null,

        // Cache metadata
        lastFetchedAt: new Date(),
        cacheExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        source: "realty_api",
      };

      // Apply feature rules
      this.applyFeatureRules(propertyData);

      // Save or update in database
      const savedProperty = await PropertyModel.findOneAndUpdate(
        { externalId: externalId },
        { $set: propertyData },
        { upsert: true, new: true }
      );

      console.log(`✅ Property ${externalId} saved/updated successfully`);
      return savedProperty;
    } catch (error) {
      console.error(`❌ Error saving property ${externalId}:`, error);
      throw error;
    }
  }

  /**
   * Apply feature rules to property data (NEW SCHEMA)
   */
  private applyFeatureRules(propertyData: any): void {
    const reasons: string[] = [];

    // Rule 1: High-value properties (min_price >= 1,000,000 AED)
    if (propertyData.min_price && propertyData.min_price >= 1000000) {
      reasons.push("min_price_aed >= 1000000");
    }

    // Rule 2: Partner projects
    if (propertyData.is_partner_project) {
      reasons.push("is_partner_project");
    }

    // Rule 3: Properties with many facilities (if available in completePropertyData)
    if (propertyData.completePropertyData?.facilities?.length >= 10) {
      reasons.push("facilities.length >= 10");
    }

    // Rule 4: Premium areas
    const premiumAreas = [
      "Downtown Dubai",
      "Dubai Marina",
      "Palm Jumeirah",
      "DIFC",
    ];
    if (premiumAreas.some((area) => propertyData.area?.includes(area))) {
      reasons.push("premium_area");
    }

    // If any rules matched, mark as featured and pending review
    if (reasons.length > 0) {
      propertyData.featured = true;
      propertyData.pendingReview = true;
      propertyData.featureReason = reasons;
      propertyData.lastFeaturedAt = new Date();
      console.log(
        `🌟 Property ${
          propertyData.externalId
        } marked as featured: ${reasons.join(", ")}`
      );
    }
  }

  // Save property to MongoDB database
  private async savePropertyToDatabase(propertyData: any): Promise<void> {
    try {
      console.log(`💾 Saving complete property ${propertyData.id} to database`);
      console.log(`📊 Property data includes: {
  architecture: ${propertyData.architecture?.length || 0} images,
  facilities: ${propertyData.facilities?.length || 0} items,
  payment_plans: ${propertyData.payment_plans?.length || 0} plans,
  unit_blocks: ${propertyData.unit_blocks?.length || 0} unit types,
  interior: ${propertyData.interior?.length || 0} images,
  buildings: ${propertyData.buildings?.length || 0} buildings,
  map_points: ${propertyData.map_points?.length || 0} locations
}`);

      const propertyDoc = new PropertyModel({
        // Basic property information
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
        sale_status: propertyData.sale_status || "Available",
        status: propertyData.status || "Available",
        completion_datetime: propertyData.completion_datetime,
        coordinates: propertyData.coordinates,
        description: propertyData.overview || "",

        // Store the complete API response in the new field
        completePropertyData: propertyData,

        // Featured flag (default: false)
        featured: false,

        // Metadata
        source: "realty_api",
        lastFetchedAt: new Date(),
        cacheExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      await propertyDoc.save();
      console.log(
        `✅ Complete property ${propertyData.id} saved to database with all ${
          Object.keys(propertyData).length
        } fields`
      );
    } catch (error) {
      console.error(
        `❌ Error saving property ${propertyData.id} to database:`,
        error
      );
      // Don't throw error here - we still want to return the data even if saving fails
    }
  }

  // Transform database property to API format
  private transformDatabaseProperty(dbProperty: any): any {
    console.log(
      `🔄 Transforming cached property ${dbProperty.externalId} from database`
    );

    // If we have complete API data stored in the new field, return it
    if (dbProperty.completePropertyData) {
      console.log(
        `✅ Returning complete cached API data for property ${dbProperty.externalId} from completePropertyData field`
      );
      return {
        ...dbProperty.completePropertyData,
        // Ensure the ID is correct
        id: dbProperty.externalId,
        // Add cache metadata
        _cached: true,
        _lastFetched: dbProperty.lastFetchedAt,
        _cacheExpires: dbProperty.cacheExpiresAt,
      };
    }

    // Fallback to basic property structure if complete data not available
    console.log(
      `⚠️ Using basic property structure for ${dbProperty.externalId} (complete data not available)`
    );
    return {
      id: dbProperty.externalId,
      name: dbProperty.name,
      area: dbProperty.area,
      area_unit: dbProperty.area_unit,
      cover_image_url: dbProperty.cover_image_url,
      developer: dbProperty.developer,
      is_partner_project: dbProperty.is_partner_project || false,
      min_price: dbProperty.min_price,
      max_price: dbProperty.max_price,
      price_currency: dbProperty.price_currency,
      sale_status: dbProperty.sale_status || dbProperty.status,
      status: dbProperty.status,
      completion_datetime: dbProperty.completion_datetime,
      coordinates: dbProperty.coordinates,
      description: dbProperty.description,
      _cached: true,
      _lastFetched: dbProperty.lastFetchedAt,
      _cacheExpires: dbProperty.cacheExpiresAt,
    };
  }

  // Transform third-party API property to our format
  private transformThirdPartyProperty(apiProperty: any): any {
    console.log(
      `🔄 Returning complete third-party API data for property ${apiProperty.id}`
    );

    // Return the complete API response with metadata
    return {
      ...apiProperty,
      // Add metadata to indicate this is fresh from API
      _cached: false,
      _fetchedAt: new Date(),
      _source: "third_party_api",
    };
  }

  // Extract image URL from the complex image object
  private extractImageUrl(imageData: any): string {
    if (!imageData) return "/placeholder-property.jpg";

    if (typeof imageData === "string") {
      try {
        const parsed = JSON.parse(imageData);
        return parsed.url || "/placeholder-property.jpg";
      } catch {
        return imageData;
      }
    }

    if (typeof imageData === "object" && imageData.url) {
      return imageData.url;
    }

    return "/placeholder-property.jpg";
  }

  // Method to call external API (for future use)
  async fetchFromExternalAPI(): Promise<Property[]> {
    try {
      if (!this.baseUrl) {
        throw new Error("External API base URL not configured");
      }

      const response = await axios.get(`${this.baseUrl}/v1/properties`, {
        headers: {
          Authorization: this.apiKey ? `Bearer ${this.apiKey}` : undefined,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 seconds timeout
      });

      return response.data;
    } catch (error) {
      console.error("External API error:", error);
      throw new Error("Failed to fetch from external API");
    }
  }
}
