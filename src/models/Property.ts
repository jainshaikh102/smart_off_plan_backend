import mongoose, { Schema, Document } from "mongoose";

// Interface for Property document with new improved schema
export interface IProperty extends Document {
  // Core property information
  externalId: number; // ID from Realty API
  name: string;
  area: string;
  area_unit?: string;
  cover_image_url: string | null;
  developer: string;
  is_partner_project: boolean;
  min_price: number | null;
  max_price: number | null;
  price_currency: string;
  sale_status: string;
  completion_datetime: string | null;
  coordinates?: string;
  description?: string;

  // Complete API data storage
  completePropertyData?: any; // Store the complete API response from /v1/properties/{id}

  // Property status and control fields
  status: "active" | "disabled" | "draft"; // Manual control over property visibility
  featured: boolean; // Mark property as featured (default: false)
  pendingReview: boolean; // Flags listings awaiting admin review
  featureReason: string[]; // Reasons why property was marked as featured
  reelly_status: boolean; // Tracks whether property is still active in Reelly's API
  lastFeaturedAt: Date | null; // When property was last marked as featured

  // Cache and sync metadata
  lastFetchedAt: Date;
  cacheExpiresAt: Date;
  source: "realty_api" | "manual";

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isExpired(): boolean;
  refreshCache(hours?: number): void;
  markAsFeatured(reason: string): void;
  markForReview(): void;
}

// Property Schema with new improved structure
const PropertySchema: Schema = new Schema(
  {
    externalId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    area_unit: {
      type: String,
      trim: true,
    },
    cover_image_url: {
      type: String,
      default: null,
    },
    developer: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    is_partner_project: {
      type: Boolean,
      default: false,
      index: true,
    },
    min_price: {
      type: Number,
      default: null,
      index: true,
    },
    max_price: {
      type: Number,
      default: null,
      index: true,
    },
    price_currency: {
      type: String,
      required: true,
      default: "AED",
    },
    sale_status: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    completion_datetime: {
      type: String,
      default: null,
    },
    coordinates: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Complete API data storage
    completePropertyData: {
      type: Schema.Types.Mixed, // Store complete API response as flexible object
      default: null,
    },

    // Property status and control fields
    status: {
      type: String,
      enum: ["active", "disabled", "draft"],
      default: "active",
      required: true,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: false, // Index for efficient querying of featured properties
    },
    pendingReview: {
      type: Boolean,
      default: false,
      index: true, // Index for admin review queries
    },
    featureReason: {
      type: [String], // Array of reasons why property was marked as featured
      default: [],
    },
    reelly_status: {
      type: Boolean,
      default: true, // Tracks whether property is still active in Reelly's API
      index: true,
    },
    lastFeaturedAt: {
      type: Date,
      default: null, // When property was last marked as featured
    },

    // Cache and sync metadata
    lastFetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    cacheExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      index: true,
    },
    source: {
      type: String,
      enum: ["realty_api", "manual"],
      default: "realty_api",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "properties",
  }
);

// Indexes for better query performance
PropertySchema.index({ area: 1, developer: 1 });
PropertySchema.index({ min_price: 1, max_price: 1 });
PropertySchema.index({ status: 1, sale_status: 1 });
PropertySchema.index({ featured: 1, status: 1 }); // For featured property queries
PropertySchema.index({ pendingReview: 1, status: 1 }); // For admin review queries
PropertySchema.index({ reelly_status: 1 }); // For tracking Reelly API status
PropertySchema.index({ cacheExpiresAt: 1 });
PropertySchema.index({ lastFetchedAt: -1 });
PropertySchema.index({ lastFeaturedAt: -1 }); // For featured property rotation

// Instance Methods
PropertySchema.methods.isExpired = function (): boolean {
  return new Date() > this.cacheExpiresAt;
};

PropertySchema.methods.refreshCache = function (hours: number = 24): void {
  this.lastFetchedAt = new Date();
  this.cacheExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
};

PropertySchema.methods.markAsFeatured = function (reason: string): void {
  this.featured = true;
  this.lastFeaturedAt = new Date();
  if (!this.featureReason.includes(reason)) {
    this.featureReason.push(reason);
  }
};

PropertySchema.methods.markForReview = function (): void {
  this.pendingReview = true;
};

// Define interface for static methods
interface IPropertyModel extends mongoose.Model<IProperty> {
  findByExternalId(externalId: number): Promise<IProperty | null>;
  findExpired(): Promise<IProperty[]>;
  findByArea(area: string): Promise<IProperty[]>;
  findByDeveloper(developer: string): Promise<IProperty[]>;
  findFeatured(limit?: number): Promise<IProperty[]>;
  findPendingReview(): Promise<IProperty[]>;
  findActiveProperties(): Promise<IProperty[]>;
  findByReallyStatus(status: boolean): Promise<IProperty[]>;
}

// Static methods
PropertySchema.statics.findByExternalId = function (externalId: number) {
  return this.findOne({ externalId });
};

PropertySchema.statics.findExpired = function () {
  return this.find({ cacheExpiresAt: { $lt: new Date() } });
};

PropertySchema.statics.findByArea = function (area: string) {
  return this.find({ area: new RegExp(area, "i"), status: "active" });
};

PropertySchema.statics.findByDeveloper = function (developer: string) {
  return this.find({ developer: new RegExp(developer, "i"), status: "active" });
};

PropertySchema.statics.findFeatured = function (limit: number = 10) {
  return this.find({ featured: true, status: "active" })
    .sort({ lastFeaturedAt: -1 })
    .limit(limit);
};

PropertySchema.statics.findPendingReview = function () {
  return this.find({ pendingReview: true, status: "active" }).sort({
    updatedAt: -1,
  });
};

PropertySchema.statics.findActiveProperties = function () {
  return this.find({ status: "active", reelly_status: true });
};

PropertySchema.statics.findByReallyStatus = function (status: boolean) {
  return this.find({ reelly_status: status });
};

export default mongoose.model<IProperty, IPropertyModel>(
  "Property",
  PropertySchema
);
