import { PropertySyncService } from "../services/propertySyncService";
import Property from "../models/Property";
import axios from "axios";

// Mock dependencies
jest.mock("axios");
jest.mock("../models/Property");
jest.mock("../config", () => ({
  externalApi: {
    baseUrl: "https://test-api.example.com",
    apiKey: "test-api-key",
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedProperty = Property as jest.Mocked<typeof Property>;

describe("PropertySyncService", () => {
  let syncService: PropertySyncService;

  beforeEach(() => {
    syncService = new PropertySyncService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    syncService.stop();
  });

  describe("Service Lifecycle", () => {
    test("should initialize with correct default configuration", () => {
      const status = syncService.getStatus();

      expect(status.config.enabled).toBe(true);
      expect(status.config.intervalMinutes).toBe(60);
      expect(status.config.maxRetries).toBe(3);
      expect(status.config.requestTimeout).toBe(30000);
      expect(status.config.batchSize).toBe(10);
      expect(status.config.delayBetweenRequests).toBe(1000);
    });

    test("should start and stop service correctly", () => {
      expect(syncService.getStatus().isRunning).toBe(false);

      syncService.start();
      expect(syncService.getStatus().isRunning).toBe(true);

      syncService.stop();
      expect(syncService.getStatus().isRunning).toBe(false);
    });

    test("should not start service if already running", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      syncService.start();
      syncService.start(); // Try to start again

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ Property Sync Service is already running"
      );
      consoleSpy.mockRestore();
    });

    test("should update configuration correctly", () => {
      const newConfig = {
        intervalMinutes: 120,
        batchSize: 20,
        maxRetries: 5,
      };

      syncService.updateConfig(newConfig);
      const status = syncService.getStatus();

      expect(status.config.intervalMinutes).toBe(120);
      expect(status.config.batchSize).toBe(20);
      expect(status.config.maxRetries).toBe(5);
    });
  });

  describe("API Integration", () => {
    test("should fetch property IDs with pagination", async () => {
      // Mock API responses for pagination
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 1 }, { id: 2 }],
            pagination: { has_next: true, page: 1, pages: 2 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 3 }, { id: 4 }],
            pagination: { has_next: false, page: 2, pages: 2 },
          },
        });

      // Access private method for testing
      const fetchAllPropertyIds = (syncService as any).fetchAllPropertyIds.bind(
        syncService
      );
      const propertyIds = await fetchAllPropertyIds();

      expect(propertyIds).toEqual([1, 2, 3, 4]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    test("should handle API errors gracefully", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

      const fetchAllPropertyIds = (syncService as any).fetchAllPropertyIds.bind(
        syncService
      );

      await expect(fetchAllPropertyIds()).rejects.toThrow("API Error");
    });

    test("should fetch property details correctly", async () => {
      const mockPropertyData = {
        id: 123,
        name: "Test Property",
        area: "Test Area",
        developer: "Test Developer",
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { data: mockPropertyData },
      });

      const fetchPropertyDetails = (
        syncService as any
      ).fetchPropertyDetails.bind(syncService);
      const result = await fetchPropertyDetails(123);

      expect(result).toEqual(mockPropertyData);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://test-api.example.com/v1/properties/123",
        expect.any(Object)
      );
    });

    test("should handle 404 errors for property details", async () => {
      mockedAxios.get.mockRejectedValueOnce(
        new Error("Resource not found: 404 Not Found")
      );

      const fetchPropertyDetails = (
        syncService as any
      ).fetchPropertyDetails.bind(syncService);
      const result = await fetchPropertyDetails(999);

      expect(result).toBeNull();
    });
  });

  describe("Database Operations", () => {
    test("should create new property when not exists", async () => {
      const mockPropertyData = {
        id: 123,
        name: "Test Property",
        area: "Test Area",
        developer: "Test Developer",
        is_partner_project: true,
      };

      mockedProperty.findByExternalId.mockResolvedValueOnce(null);
      mockedProperty.prototype.save = jest
        .fn()
        .mockResolvedValueOnce(mockPropertyData);

      const createProperty = (syncService as any).createProperty.bind(
        syncService
      );
      const result = await createProperty(mockPropertyData);

      expect(mockedProperty.prototype.save).toHaveBeenCalled();
    });

    test("should update existing property when found", async () => {
      const existingProperty = {
        externalId: 123,
        name: "Old Name",
        isExpired: () => true,
        save: jest.fn().mockResolvedValueOnce(true),
      };

      const mockPropertyData = {
        id: 123,
        name: "Updated Property",
        area: "Updated Area",
      };

      mockedProperty.findByExternalId.mockResolvedValueOnce(
        existingProperty as any
      );

      const updateProperty = (syncService as any).updateProperty.bind(
        syncService
      );
      await updateProperty(existingProperty, mockPropertyData);

      expect(existingProperty.save).toHaveBeenCalled();
      expect(existingProperty.name).toBe("Updated Property");
    });

    test("should skip non-expired properties", async () => {
      const existingProperty = {
        externalId: 123,
        isExpired: () => false,
      };

      mockedProperty.findByExternalId.mockResolvedValueOnce(
        existingProperty as any
      );

      const stats = {
        totalProcessed: 0,
        newProperties: 0,
        updatedProperties: 0,
        skippedDuplicates: 0,
        errors: 0,
        startTime: new Date(),
      };

      const processProperty = (syncService as any).processProperty.bind(
        syncService
      );
      await processProperty(123, stats);

      expect(stats.skippedDuplicates).toBe(1);
      expect(stats.totalProcessed).toBe(1);
    });
  });

  describe("Featuring Potential Analysis", () => {
    test("should analyze partner projects for featuring potential", () => {
      const property = {
        featured: false,
        lastFeaturedAt: null,
        featureReason: [],
      };

      const propertyData = {
        id: 123,
        is_partner_project: true,
      };

      const analyzeFeaturingPotential = (
        syncService as any
      ).analyzeFeaturingPotential.bind(syncService);
      analyzeFeaturingPotential(property, propertyData);

      expect(property.featured).toBe(false); // Should not auto-feature
      expect(property.featureReason).toContain("is_partner_project");
      expect(property.lastFeaturedAt).toBeNull(); // Should not set featured date
    });

    test("should analyze properties with many facilities for featuring potential", () => {
      const property = {
        featured: false,
        lastFeaturedAt: null,
        featureReason: [],
      };

      const propertyData = {
        id: 123,
        facilities: new Array(15).fill({ name: "Test Facility" }),
      };

      const analyzeFeaturingPotential = (
        syncService as any
      ).analyzeFeaturingPotential.bind(syncService);
      analyzeFeaturingPotential(property, propertyData);

      expect(property.featured).toBe(false); // Should not auto-feature
      expect(property.featureReason).toContain("facilities.length >= 10");
    });

    test("should analyze properties in premium locations for featuring potential", () => {
      const property = {
        featured: false,
        lastFeaturedAt: null,
        featureReason: [],
      };

      const propertyData = {
        id: 123,
        area: "Downtown Dubai",
      };

      const analyzeFeaturingPotential = (
        syncService as any
      ).analyzeFeaturingPotential.bind(syncService);
      analyzeFeaturingPotential(property, propertyData);

      expect(property.featured).toBe(false); // Should not auto-feature
      expect(property.featureReason).toContain("premium_location");
    });

    test("should not add featuring reasons for properties that do not meet criteria", () => {
      const property = {
        featured: false,
        lastFeaturedAt: null,
        featureReason: [],
      };

      const propertyData = {
        id: 123,
        is_partner_project: false,
        facilities: [],
        area: "Regular Area",
      };

      const analyzeFeaturingPotential = (
        syncService as any
      ).analyzeFeaturingPotential.bind(syncService);
      analyzeFeaturingPotential(property, propertyData);

      expect(property.featured).toBe(false);
      expect(property.featureReason).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    test("should handle network errors with retry logic", async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error("Network Error"))
        .mockRejectedValueOnce(new Error("Network Error"))
        .mockResolvedValueOnce({ data: { items: [] } });

      const makeApiRequest = (syncService as any).makeApiRequest.bind(
        syncService
      );
      const result = await makeApiRequest("https://test-api.example.com/test");

      expect(result.data).toEqual({ items: [] });
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    test("should fail after max retries", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Persistent Error"));

      const makeApiRequest = (syncService as any).makeApiRequest.bind(
        syncService
      );

      await expect(
        makeApiRequest("https://test-api.example.com/test")
      ).rejects.toThrow("Persistent Error");
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Default max retries
    });
  });

  describe("Statistics and Monitoring", () => {
    test("should return correct sync statistics", async () => {
      mockedProperty.countDocuments
        .mockResolvedValueOnce(100) // totalProperties
        .mockResolvedValueOnce(95) // activeProperties
        .mockResolvedValueOnce(20) // featuredProperties
        .mockResolvedValueOnce(5) // pendingReview
        .mockResolvedValueOnce(3); // expiredProperties

      mockedProperty.findOne.mockResolvedValueOnce({
        lastFetchedAt: new Date("2024-01-15T10:00:00Z"),
      });

      const stats = await syncService.getSyncStatistics();

      expect(stats.totalProperties).toBe(100);
      expect(stats.activeProperties).toBe(95);
      expect(stats.featuredProperties).toBe(20);
      expect(stats.pendingReview).toBe(5);
      expect(stats.expiredProperties).toBe(3);
      expect(stats.lastSyncTime).toEqual(new Date("2024-01-15T10:00:00Z"));
    });
  });
});
