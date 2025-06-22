import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Frontend Configuration
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:3001",
  ],

  // External API Configuration
  externalApi: {
    baseUrl: process.env.EXTERNAL_API_BASE_URL || "https://api.reelly.io",
    apiKey: process.env.EXTERNAL_API_KEY || "",
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "logs/app.log",
  },

  // Database Configuration
  database: {
    url: process.env.MONGODB_URI || process.env.DATABASE_URL || "",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "27017", 10),
    name: process.env.DB_NAME || "smart_off_plan",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  },
};

export default config;
