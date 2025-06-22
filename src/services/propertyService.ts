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
   * Transform cached property to our internal format
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
      normalized_type: cachedProperty.normalized_type,
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

  // Get featured properties
  async getFeaturedProperties(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      console.log(`🌟 Getting featured properties (limit: ${limit})`);

      const featuredProperties = await PropertyModel.find({ featured: true })
        .sort({ createdAt: -1 })
        .limit(limit)
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

  // Get all properties with optional filtering and sorting
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

  // Get property by ID with smart caching approach
  async getPropertyById(id: number): Promise<ApiResponse<any | null>> {
    try {
      console.log(`🔍 Getting property by ID: ${id}`);

      // Step 1: Check if property exists in our MongoDB database
      const existingProperty = await PropertyModel.findByExternalId(id);

      if (existingProperty) {
        console.log(`✅ Found property ${id} in database`);
        const property = this.transformDatabaseProperty(existingProperty);
        return {
          success: true,
          data: property,
          message: `Successfully fetched property ${id} from database`,
        };
      }

      console.log(
        `📡 Property ${id} not in database, fetching from third-party API...`
      );

      // Step 2: Fetch from third-party API if not in database
      try {
        const apiProperty = await this.fetchPropertyFromThirdPartyAPI(id);

        if (apiProperty) {
          console.log(`✅ Fetched property ${id} from third-party API`);

          // Step 3: Save to MongoDB database for future requests
          await this.savePropertyToDatabase(apiProperty);

          // Transform and return the property
          const property = this.transformThirdPartyProperty(apiProperty);
          return {
            success: true,
            data: property,
            message: `Successfully fetched property ${id} from third-party API`,
          };
        } else {
          console.log(`📭 Property ${id} not found in third-party API`);
        }
      } catch (apiError) {
        console.error(
          `❌ Third-party API error for property ${id}, falling back to mock data:`,
          apiError
        );
      }

      // Step 4: Fallback to mock data if API fails or property not found
      const mockProperties = this.getMockProperties();
      const mockProperty = mockProperties.find((p) => p.id === id);

      if (!mockProperty) {
        return {
          success: false,
          data: null,
          message: `Property with ID ${id} not found`,
        };
      }

      return {
        success: true,
        data: mockProperty,
        message: `Successfully fetched property ${id} from fallback data`,
      };
    } catch (error) {
      console.error("Error fetching property by ID:", error);
      throw new Error("Failed to fetch property");
    }
  }

  // Fetch property from third-party API
  private async fetchPropertyFromThirdPartyAPI(
    id: number
  ): Promise<any | null> {
    try {
      console.log(`🔧 Property Detail API Config: {
  apiBaseUrl: '${this.baseUrl}',
  hasApiKey: ${!!this.apiKey},
  apiKeyLength: ${this.apiKey?.length || 0},
  propertyId: '${id}'
}`);

      if (!this.baseUrl || !this.apiKey) {
        throw new Error("Third-party API configuration missing");
      }

      const url = `${this.baseUrl}/v1/properties/${id}`;
      console.log(`📡 Calling external API for property detail: ${url}`);

      // Try different header configurations
      const headerOptions = [
        {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      ];

      for (let i = 0; i < headerOptions.length; i++) {
        try {
          console.log(
            `📤 Trying header option ${i + 1}: ${JSON.stringify(
              headerOptions[i],
              null,
              2
            )}`
          );

          const response = await axios.get(url, {
            headers: headerOptions[i],
            timeout: 30000, // 30 seconds timeout
          });

          console.log(
            `📥 Response status for option ${i + 1}: ${response.status}`
          );

          if (response.status === 200) {
            console.log(`✅ Success with header option ${i + 1}`);
            console.log(`📥 External API response status: ${response.status}`);
            console.log(`✅ External API response received`);
            console.log(`📊 Response type: ${typeof response.data}`);

            if (response.data && typeof response.data === "object") {
              console.log(
                `📊 Response keys: ${JSON.stringify(
                  Object.keys(response.data),
                  null,
                  2
                )}`
              );
              console.log(`📊 Property detail structure: {
  id: ${response.data.id},
  name: '${response.data.name}',
  area: '${response.data.area}',
  developer: '${response.data.developer}',
  hasImages: ${!!response.data.cover_image_url},
  priceInfo: { min_price: ${response.data.min_price}, max_price: ${
                response.data.max_price
              }, currency: '${response.data.price_currency}' }
}`);
            }

            return response.data;
          }
        } catch (error: any) {
          console.log(
            `📥 Response status for option ${i + 1}: ${
              error.response?.status || "unknown"
            }`
          );
          console.log(
            `❌ Failed with option ${i + 1}: { error: '${
              error.response?.data?.message || error.message
            }' }`
          );

          if (i === headerOptions.length - 1) {
            console.log(`❌ All header options failed`);
            throw error;
          }
        }
      }

      return null;
    } catch (error: any) {
      console.error(
        `❌ Error fetching property ${id} from third-party API:`,
        error.message
      );
      throw error;
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
