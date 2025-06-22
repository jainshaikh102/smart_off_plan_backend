import axios, { AxiosResponse } from "axios";
import config from "../config";

export interface RealtyApiProperty {
  id: number;
  name: string;
  area: string;
  area_unit?: string;
  cover_image_url: string | null;
  developer: string;
  is_partner_project?: boolean;
  min_price: number | null;
  max_price: number | null;
  price_currency: string;
  sale_status: string;
  status: string;
  completion_datetime: string | null;
  coordinates?: string;
  normalized_type?: string;
  description?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  size_sqft?: number;
  size_sqm?: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface RealtyApiResponse {
  items?: RealtyApiProperty[];
  data?: RealtyApiProperty[];
  properties?: RealtyApiProperty[];
  // Handle different response structures
  [key: string]: any;
}

export class RealtyApiService {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number = 15000; // 15 seconds

  constructor() {
    this.baseUrl = config.externalApi.baseUrl;
    this.apiKey = config.externalApi.apiKey;
  }

  /**
   * Get authentication headers for Realty API
   */
  private getAuthHeaders(): Record<string, string> {
    const baseHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Smart-Off-Plan-Backend/1.0.0",
    };

    if (!this.apiKey) {
      return baseHeaders;
    }

    // Try different authentication methods
    const authOptions = [
      { Authorization: `Bearer ${this.apiKey}` },
      { "X-API-Key": this.apiKey },
      {
        "X-RapidAPI-Key": this.apiKey,
        "X-RapidAPI-Host": "realty-in-us.p.rapidapi.com",
      },
      { apikey: this.apiKey },
    ];

    // For now, use Bearer token as default
    return { ...baseHeaders, ...authOptions[0] };
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequest(
    url: string,
    retries: number = 3
  ): Promise<AxiosResponse> {
    const headers = this.getAuthHeaders();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `📡 Attempting Realty API request (${attempt}/${retries}): ${url}`
        );

        const response = await axios.get(url, {
          headers,
          timeout: this.timeout,
          validateStatus: (status) => status < 500, // Retry on 5xx errors
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`✅ Realty API request successful: ${response.status}`);
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

        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      } catch (error) {
        console.log(
          `❌ Realty API request failed (attempt ${attempt}):`,
          error instanceof Error ? error.message : error
        );

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Max retries exceeded");
  }

  /**
   * Fetch all properties from Realty API
   */
  async fetchProperties(
    params: {
      page?: number;
      limit?: number;
      area?: string;
      developer?: string;
      status?: string;
      min_price?: number;
      max_price?: number;
    } = {}
  ): Promise<RealtyApiProperty[]> {
    try {
      if (!this.baseUrl) {
        throw new Error("Realty API base URL not configured");
      }

      // Build query parameters
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());
      if (params.area) queryParams.append("area", params.area);
      if (params.developer) queryParams.append("developer", params.developer);
      if (params.status) queryParams.append("status", params.status);
      if (params.min_price)
        queryParams.append("min_price", params.min_price.toString());
      if (params.max_price)
        queryParams.append("max_price", params.max_price.toString());

      const url = `${this.baseUrl}/v1/properties${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const response = await this.makeRequest(url);
      const data: RealtyApiResponse = response.data;

      // Handle different response structures
      let properties: RealtyApiProperty[] = [];

      if (data.items && Array.isArray(data.items)) {
        properties = data.items;
      } else if (data.data && Array.isArray(data.data)) {
        properties = data.data;
      } else if (data.properties && Array.isArray(data.properties)) {
        properties = data.properties;
      } else if (Array.isArray(data)) {
        properties = data;
      } else {
        console.log("⚠️ Unexpected API response structure:", Object.keys(data));
        properties = [];
      }

      console.log(`✅ Fetched ${properties.length} properties from Realty API`);
      return properties;
    } catch (error) {
      console.error("❌ Error fetching properties from Realty API:", error);
      throw new Error(
        `Failed to fetch properties: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Fetch single property by ID from Realty API
   */
  async fetchPropertyById(id: number): Promise<RealtyApiProperty | null> {
    try {
      if (!this.baseUrl) {
        throw new Error("Realty API base URL not configured");
      }

      const url = `${this.baseUrl}/v1/properties/${id}`;
      const response = await this.makeRequest(url);
      const data = response.data;

      // Handle different response structures
      let property: RealtyApiProperty | null = null;

      if (data.data && typeof data.data === "object") {
        property = data.data;
      } else if (data.property && typeof data.property === "object") {
        property = data.property;
      } else if (typeof data === "object" && data.id) {
        property = data;
      }

      if (property) {
        console.log(`✅ Fetched property ${id} from Realty API`);
      } else {
        console.log(`⚠️ Property ${id} not found in Realty API`);
      }

      return property;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        console.log(`📭 Property ${id} not found in Realty API`);
        return null;
      }

      console.error(`❌ Error fetching property ${id} from Realty API:`, error);
      throw new Error(
        `Failed to fetch property: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.baseUrl) {
        console.log("⚠️ Realty API base URL not configured");
        return false;
      }

      const url = `${this.baseUrl}/v1/properties?limit=1`;
      await this.makeRequest(url);

      console.log("✅ Realty API connection test successful");
      return true;
    } catch (error) {
      console.error("❌ Realty API connection test failed:", error);
      return false;
    }
  }

  /**
   * Get API configuration status
   */
  getConfigStatus(): {
    hasBaseUrl: boolean;
    hasApiKey: boolean;
    baseUrl: string;
  } {
    return {
      hasBaseUrl: !!this.baseUrl,
      hasApiKey: !!this.apiKey,
      baseUrl: this.baseUrl,
    };
  }
}

export default new RealtyApiService();
