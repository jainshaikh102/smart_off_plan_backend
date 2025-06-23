import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";

const router = Router();

// Third-party API configuration
const REALTY_API_BASE_URL = "https://search-listings-production.up.railway.app";
const REALTY_API_KEY = "reelly-680ffbdd-FEuCzeraBCN5dtByJeLb8AeCesrTvlFz";

/**
 * GET /api/listings
 * Fetch all property listings directly from third-party API
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("📋 Listings API called with query:", req.query);

    // Build the third-party API URL
    const apiUrl = `${REALTY_API_BASE_URL}/v1/properties`;

    // Prepare query parameters
    const queryParams = new URLSearchParams();

    // Add query parameters from request
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const fullUrl = queryParams.toString()
      ? `${apiUrl}?${queryParams.toString()}`
      : apiUrl;

    console.log(`📡 Calling third-party API: ${fullUrl}`);

    // Call the third-party API
    const response = await axios.get(fullUrl, {
      headers: {
        "X-API-Key": REALTY_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000, // 30 seconds timeout
    });

    console.log(
      `✅ Third-party API response received: { status: ${
        response.status
      }, dataLength: ${response.data?.length || 0} }`
    );

    // Extract pagination info from query params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;

    console.log(`📊 Third-party API response structure:`, {
      hasData: !!response.data,
      dataType: Array.isArray(response.data) ? "array" : typeof response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      hasPagination: !!response.data?.pagination,
    });

    // Check if third-party API returns pagination info
    let paginationData;
    let itemsData;
    let total;

    if (response.data?.pagination) {
      // Third-party API provides pagination - map to our expected format
      const thirdPartyPagination = response.data.pagination;
      paginationData = {
        page: thirdPartyPagination.page,
        limit: thirdPartyPagination.per_page || limit,
        total: thirdPartyPagination.total,
        totalPages: thirdPartyPagination.pages,
        has_next: thirdPartyPagination.has_next,
        has_prev: thirdPartyPagination.has_prev,
      };
      itemsData = response.data.items || response.data.data || response.data;
      total = paginationData.total;
      console.log(`✅ Using third-party pagination:`, thirdPartyPagination);
      console.log(`📊 Mapped pagination:`, paginationData);
    } else {
      // Calculate our own pagination
      itemsData = response.data;
      total = Array.isArray(itemsData) ? itemsData.length : 0;
      paginationData = {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1,
      };
      console.log(`📊 Created pagination:`, paginationData);
    }

    // Return the response with proper structure
    res.json({
      success: true,
      data: {
        items: itemsData,
        pagination: paginationData,
      },
      total: total,
      source: "third-party-api",
    });
  } catch (error) {
    console.error("❌ Error in listings API:", error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;

      res.status(status).json({
        success: false,
        message: `Third-party API error: ${message}`,
        error: "THIRD_PARTY_API_ERROR",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to fetch property listings",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});

/**
 * GET /api/listings/:id
 * Fetch single property listing by ID from third-party API
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const propertyId = parseInt(req.params.id, 10);

    if (isNaN(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID",
      });
    }

    console.log(`📋 Listings API called for property ID: ${propertyId}`);

    // Build the third-party API URL for single property
    const apiUrl = `${REALTY_API_BASE_URL}/v1/properties/${propertyId}`;

    console.log(`📡 Calling third-party API for property: ${apiUrl}`);

    // Call the third-party API
    const response = await axios.get(apiUrl, {
      headers: {
        "X-API-Key": REALTY_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000, // 30 seconds timeout
    });

    console.log(
      `✅ Third-party API response received for property ${propertyId}: { status: ${response.status} }`
    );

    // Return the response from third-party API
    res.json({
      success: true,
      data: response.data,
      source: "third-party-api",
    });
  } catch (error) {
    console.error("❌ Error in listings API for single property:", error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;

      res.status(status).json({
        success: false,
        message: `Third-party API error: ${message}`,
        error: "THIRD_PARTY_API_ERROR",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to fetch property listing",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});

export default router;
