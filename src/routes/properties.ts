import { Router } from "express";
import { PropertyController } from "../controllers/propertyController";
import {
  validateQuery,
  validateParams,
  getPropertiesQuerySchema,
  propertyIdSchema,
  searchQuerySchema,
} from "../validation/propertyValidation";

const router = Router();
const propertyController = new PropertyController();

// GET /api/properties - Get all properties from database (NEW: Database-first approach)
router.get(
  "/",
  validateQuery(getPropertiesQuerySchema),
  propertyController.getAllProperties
);

// GET /api/properties/legacy - Get all properties from API (LEGACY: API-first approach)
router.get(
  "/legacy",
  validateQuery(getPropertiesQuerySchema),
  propertyController.getAllPropertiesLegacy
);

// GET /api/properties/search - Search properties
router.get(
  "/search",
  validateQuery(searchQuerySchema),
  propertyController.searchProperties
);

// GET /api/properties/featured - Get featured properties (all featured properties without limit)
router.get("/featured", propertyController.getFeaturedProperties);

// GET /api/properties/by-completion - Get properties by completion date (ascending order)
router.get("/by-completion", propertyController.getPropertiesByCompletion);

// GET /api/properties/by-developer/:developer - Get properties by developer
router.get(
  "/by-developer/:developer",
  propertyController.getPropertiesByDeveloper
);

// GET /api/properties/by-area/:area - Get properties by area
router.get("/by-area/:area", propertyController.getPropertiesByArea);

// GET /api/properties/stats - Get properties statistics
router.get("/stats", propertyController.getPropertiesStats);

// GET /api/properties/:id - Get property by ID
router.get(
  "/:id",
  validateParams(propertyIdSchema),
  propertyController.getPropertyById
);

export default router;
