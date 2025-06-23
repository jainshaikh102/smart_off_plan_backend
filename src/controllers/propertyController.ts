import { Request, Response, NextFunction } from "express";
import { PropertyService } from "../services/propertyService";
import { GetPropertiesQuery, PropertyDetailsResponse } from "../types";

export class PropertyController {
  private propertyService: PropertyService;

  constructor() {
    this.propertyService = new PropertyService();
  }

  // Get featured properties
  getFeaturedProperties = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      console.log(`🌟 Featured properties API called with limit: ${limit}`);

      const result = await this.propertyService.getFeaturedProperties(limit);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error("❌ Error in getFeaturedProperties controller:", error);
      next(error);
    }
  };

  // Get all properties
  getAllProperties = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query: GetPropertiesQuery = {
        page: req.query.page
          ? parseInt(req.query.page as string, 10)
          : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : undefined,
        sort: req.query.sort as GetPropertiesQuery["sort"],
        area: req.query.area as string,
        developer: req.query.developer as string,
        status: req.query.status as string,
        min_price: req.query.min_price
          ? parseInt(req.query.min_price as string, 10)
          : undefined,
        max_price: req.query.max_price
          ? parseInt(req.query.max_price as string, 10)
          : undefined,
      };

      console.log("📊 Fetching properties with query:", query);

      const result = await this.propertyService.getAllProperties(query);

      console.log(`✅ Successfully fetched ${result.data.length} properties`);

      res.status(200).json(result);
    } catch (error) {
      console.error("❌ Error in getAllProperties:", error);
      next(error);
    }
  };

  // Get property by ID (NEW SCHEMA)
  getPropertyById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid ID",
          message: "Property ID must be a valid number",
        });
      }

      console.log(`🏠 [NEW SCHEMA] Fetching property with ID: ${id}`);

      const result = await this.propertyService.getPropertyById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      console.log(`✅ Successfully fetched property ${id} with new schema`);

      res.status(200).json(result);
    } catch (error) {
      console.error("❌ Error in getPropertyById (NEW SCHEMA):", error);
      next(error);
    }
  };

  // Get properties pending review (NEW SCHEMA)
  getPropertiesPendingReview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      console.log(`📋 Getting properties pending review`);

      // This would use the new static method from the model
      const PropertyModel = require("../models/Property").default;
      const pendingProperties = await PropertyModel.findPendingReview();

      res.status(200).json({
        success: true,
        data: pendingProperties,
        message: `Found ${pendingProperties.length} properties pending review`,
      });
    } catch (error) {
      console.error("❌ Error in getPropertiesPendingReview:", error);
      next(error);
    }
  };

  // Get featured properties with new schema
  getFeaturedPropertiesV2 = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      console.log(
        `🌟 [NEW SCHEMA] Getting featured properties (limit: ${limit})`
      );

      const PropertyModel = require("../models/Property").default;
      const featuredProperties = await PropertyModel.findFeatured(limit);

      res.status(200).json({
        success: true,
        data: featuredProperties,
        message: `Found ${featuredProperties.length} featured properties`,
      });
    } catch (error) {
      console.error("❌ Error in getFeaturedPropertiesV2:", error);
      next(error);
    }
  };

  // Get properties statistics
  getPropertiesStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      console.log("📊 Fetching properties statistics");

      const allPropertiesResult = await this.propertyService.getAllProperties();
      const properties = allPropertiesResult.data;

      const stats = {
        total: properties.length,
        byStatus: properties.reduce((acc, property) => {
          const status = property.status || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byArea: properties.reduce((acc, property) => {
          const area = property.area || "Unknown";
          acc[area] = (acc[area] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byDeveloper: properties.reduce((acc, property) => {
          const developer = property.developer || "Unknown";
          acc[developer] = (acc[developer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        priceRange: {
          min: Math.min(
            ...properties.filter((p) => p.min_price).map((p) => p.min_price!)
          ),
          max: Math.max(
            ...properties.filter((p) => p.max_price).map((p) => p.max_price!)
          ),
          average:
            properties.reduce((sum, p) => sum + (p.min_price || 0), 0) /
            properties.length,
        },
        completionDates: properties
          .filter((p) => p.completion_datetime)
          .map((p) => ({
            id: p.id,
            name: p.name,
            completion: p.completion_datetime,
          }))
          .sort(
            (a, b) =>
              new Date(a.completion!).getTime() -
              new Date(b.completion!).getTime()
          ),
      };

      console.log("✅ Successfully calculated properties statistics");

      res.status(200).json({
        success: true,
        data: stats,
        message: "Properties statistics fetched successfully",
      });
    } catch (error) {
      console.error("❌ Error in getPropertiesStats:", error);
      next(error);
    }
  };

  // Search properties
  searchProperties = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const searchTerm = req.query.q as string;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: "Missing search term",
          message: "Search term (q) is required",
        });
      }

      console.log(`🔍 Searching properties with term: "${searchTerm}"`);

      const allPropertiesResult = await this.propertyService.getAllProperties();
      const properties = allPropertiesResult.data;

      const searchResults = properties.filter(
        (property) =>
          property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.developer.toLowerCase().includes(searchTerm.toLowerCase())
      );

      console.log(
        `✅ Found ${searchResults.length} properties matching "${searchTerm}"`
      );

      res.status(200).json({
        success: true,
        data: searchResults,
        message: `Found ${searchResults.length} properties matching "${searchTerm}"`,
        searchTerm,
      });
    } catch (error) {
      console.error("❌ Error in searchProperties:", error);
      next(error);
    }
  };
}
