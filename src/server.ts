import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import config from "./config";
import {
  errorHandler,
  notFound,
  createRateLimit,
  corsOptions,
} from "./middleware";
import propertyRoutes from "./routes/properties";
import healthRoutes from "./routes/health";
import testRoutes from "./routes/test";
import listingsRoutes from "./routes/listings";
import database from "./database/connection";

const app = express();

// Trust proxy (important for rate limiting and IP detection)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS middleware
app.use(cors(corsOptions));

// Rate limiting
app.use(createRateLimit());

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// API Routes
app.use("/api/health", healthRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/test", testRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Off Plan Backend API",
    version: "1.0.0",
    environment: config.nodeEnv,
    endpoints: {
      health: "/api/health",
      properties: "/api/properties",
      listings: "/api/listings",
      test: "/api/test",
    },
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize database connection
database.connect();

// Start server
const server = app.listen(config.port, () => {
  console.log(`
🚀 Smart Off Plan Backend Server Started!
📍 Environment: ${config.nodeEnv}
🌐 Server: http://localhost:${config.port}
🔗 Frontend: ${config.frontendUrl}
📊 Health Check: http://localhost:${config.port}/api/health
🏠 Properties API: http://localhost:${config.port}/api/properties
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received, shutting down gracefully");
  server.close(async () => {
    await database.disconnect();
    console.log("💤 Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received, shutting down gracefully");
  server.close(async () => {
    await database.disconnect();
    console.log("💤 Process terminated");
  });
});

export default app;
