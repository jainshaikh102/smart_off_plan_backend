import mongoose from "mongoose";
import config from "../config";

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("📊 Database already connected");
      return;
    }

    try {
      const mongoUri = config.database.url || this.buildMongoUri();

      if (!mongoUri) {
        console.log("⚠️ MongoDB URI not configured, running without database");
        return;
      }

      console.log("🔌 Connecting to MongoDB...");

      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      this.isConnected = true;
      console.log("✅ MongoDB connected successfully");

      // Handle connection events
      mongoose.connection.on("error", (error) => {
        console.error("❌ MongoDB connection error:", error);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        console.log("📴 MongoDB disconnected");
        this.isConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        console.log("🔄 MongoDB reconnected");
        this.isConnected = true;
      });
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      this.isConnected = false;
      // Don't throw error - allow app to run without database
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("📴 MongoDB disconnected gracefully");
    } catch (error) {
      console.error("❌ Error disconnecting from MongoDB:", error);
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  private buildMongoUri(): string {
    const { host, port, name, user, password } = config.database;

    if (!host || !name) {
      return "";
    }

    if (user && password) {
      return `mongodb://${user}:${password}@${host}:${port}/${name}`;
    }

    return `mongodb://${host}:${port}/${name}`;
  }
}

export default DatabaseConnection.getInstance();
