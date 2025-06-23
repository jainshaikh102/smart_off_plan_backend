import { Router, Request, Response } from "express";
import propertySyncService from "../services/propertySyncService";

const router = Router();

/**
 * GET /api/sync/status
 * Get the current status of the property sync service
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = await propertySyncService.getStatus();
    const stats = await propertySyncService.getSyncStatistics();

    res.json({
      success: true,
      data: {
        service: status,
        statistics: stats,
      },
    });
  } catch (error) {
    console.error("❌ Error getting sync status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get sync status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/sync/start
 * Start the property sync service
 */
router.post("/start", async (req: Request, res: Response) => {
  try {
    propertySyncService.start();
    const status = await propertySyncService.getStatus();

    res.json({
      success: true,
      message: "Property sync service started",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error starting sync service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start sync service",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/sync/stop
 * Stop the property sync service
 */
router.post("/stop", async (req: Request, res: Response) => {
  try {
    propertySyncService.stop();
    const status = await propertySyncService.getStatus();

    res.json({
      success: true,
      message: "Property sync service stopped",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error stopping sync service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop sync service",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/sync/trigger
 * Manually trigger a property sync cycle
 */
router.post("/trigger", async (req: Request, res: Response) => {
  try {
    console.log("🔧 Manual sync triggered via API");
    const stats = await propertySyncService.triggerManualSync();

    res.json({
      success: true,
      message: "Manual sync completed",
      data: stats,
    });
  } catch (error) {
    console.error("❌ Error triggering manual sync:", error);
    res.status(500).json({
      success: false,
      message: "Failed to trigger manual sync",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/sync/cleanup
 * Clean up expired and inactive properties
 */
router.post("/cleanup", async (req: Request, res: Response) => {
  try {
    console.log("🧹 Property cleanup triggered via API");
    const result = await propertySyncService.cleanupProperties();

    res.json({
      success: true,
      message: "Property cleanup completed",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error during property cleanup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup properties",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/sync/config
 * Update sync service configuration
 */
router.put("/config", async (req: Request, res: Response) => {
  try {
    const {
      enabled,
      intervalMinutes,
      maxRetries,
      requestTimeout,
      batchSize,
      delayBetweenRequests,
      minSyncIntervalHours,
      skipIfRecentData,
    } = req.body;

    const configUpdate: any = {};
    if (typeof enabled === "boolean") configUpdate.enabled = enabled;
    if (typeof intervalMinutes === "number" && intervalMinutes > 0)
      configUpdate.intervalMinutes = intervalMinutes;
    if (typeof maxRetries === "number" && maxRetries > 0)
      configUpdate.maxRetries = maxRetries;
    if (typeof requestTimeout === "number" && requestTimeout > 0)
      configUpdate.requestTimeout = requestTimeout;
    if (typeof batchSize === "number" && batchSize > 0)
      configUpdate.batchSize = batchSize;
    if (typeof delayBetweenRequests === "number" && delayBetweenRequests >= 0)
      configUpdate.delayBetweenRequests = delayBetweenRequests;
    if (typeof minSyncIntervalHours === "number" && minSyncIntervalHours > 0)
      configUpdate.minSyncIntervalHours = minSyncIntervalHours;
    if (typeof skipIfRecentData === "boolean")
      configUpdate.skipIfRecentData = skipIfRecentData;

    if (Object.keys(configUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid configuration parameters provided",
      });
    }

    propertySyncService.updateConfig(configUpdate);
    const status = await propertySyncService.getStatus();

    res.json({
      success: true,
      message: "Sync service configuration updated",
      data: status,
    });
  } catch (error) {
    console.error("❌ Error updating sync config:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update sync configuration",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/sync/logs
 * Get recent sync logs (placeholder for future implementation)
 */
router.get("/logs", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Sync logs endpoint - to be implemented",
    data: {
      logs: [],
      note: "Log collection will be implemented in future version",
    },
  });
});

export default router;
