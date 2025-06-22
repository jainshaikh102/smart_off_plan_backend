import { Router, Request, Response } from "express";
import config from "../config";
import database from "../database/connection";
import cacheService from "../services/cacheService";
import realtyApiService from "../services/realtyApiService";

const router = Router();

// Health check endpoint
router.get("/", (req: Request, res: Response) => {
  const healthCheck = {
    success: true,
    message: "Smart Off Plan Backend is healthy!",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: "1.0.0",
    memory: {
      used:
        Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total:
        Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    },
  };

  res.status(200).json(healthCheck);
});

// Detailed health check
router.get("/detailed", async (req: Request, res: Response) => {
  try {
    // Get cache statistics
    const cacheStats = await cacheService.getCacheStats();

    // Get API configuration status
    const apiConfig = realtyApiService.getConfigStatus();

    const detailedHealth = {
      success: true,
      message: "Detailed health check",
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: "healthy",
          responseTime: "< 100ms",
        },
        database: {
          status: database.getConnectionStatus() ? "connected" : "disconnected",
          message: database.getConnectionStatus()
            ? "MongoDB connected"
            : "MongoDB not connected",
        },
        externalApi: {
          status:
            apiConfig.hasBaseUrl && apiConfig.hasApiKey
              ? "configured"
              : "not_configured",
          baseUrl: apiConfig.baseUrl,
          hasApiKey: apiConfig.hasApiKey,
        },
        cache: {
          status: database.getConnectionStatus() ? "available" : "unavailable",
          stats: cacheStats,
        },
      },
      configuration: {
        port: config.port,
        environment: config.nodeEnv,
        frontendUrl: config.frontendUrl,
        allowedOrigins: config.allowedOrigins,
        database: {
          host: config.database.host,
          port: config.database.port,
          name: config.database.name,
        },
      },
    };

    res.status(200).json(detailedHealth);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
