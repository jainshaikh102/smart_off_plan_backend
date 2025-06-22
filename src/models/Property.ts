import mongoose, { Schema, Document } from "mongoose";

// Interface for Property document
export interface IProperty extends Document {
  // Basic property information
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
  status: string;
  completion_datetime: string | null;
  coordinates?: string;
  normalized_type?: string;

  // Additional fields from Realty API
  description?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  size_sqft?: number;
  size_sqm?: number;

  // SEO fields
  seoTitle?: string;
  seoDescription?: string;

  // Complete API data storage
  completePropertyData?: any; // Store the complete API response from /v1/properties/{id}

  // Featured property flag
  featured: boolean; // Mark property as featured (default: false)

  // Cache metadata
  lastFetchedAt: Date;
  cacheExpiresAt: Date;
  source: "realty_api" | "manual";

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isExpired(): boolean;
  refreshCache(hours?: number): void;
}

// Property Schema
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
    status: {
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
    normalized_type: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    bedrooms: {
      type: Number,
      min: 0,
    },
    bathrooms: {
      type: Number,
      min: 0,
    },
    size_sqft: {
      type: Number,
      min: 0,
    },
    size_sqm: {
      type: Number,
      min: 0,
    },
    seoTitle: {
      type: String,
      trim: true,
    },
    seoDescription: {
      type: String,
      trim: true,
    },
    completePropertyData: {
      type: Schema.Types.Mixed, // Store complete API response as flexible object
      default: null,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true, // Index for efficient querying of featured properties
    },
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
PropertySchema.index({ cacheExpiresAt: 1 });
PropertySchema.index({ lastFetchedAt: -1 });

// Methods
PropertySchema.methods.isExpired = function (): boolean {
  return new Date() > this.cacheExpiresAt;
};

PropertySchema.methods.refreshCache = function (hours: number = 24): void {
  this.lastFetchedAt = new Date();
  this.cacheExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
};

// Define interface for static methods
interface IPropertyModel extends mongoose.Model<IProperty> {
  findByExternalId(externalId: number): Promise<IProperty | null>;
  findExpired(): Promise<IProperty[]>;
  findByArea(area: string): Promise<IProperty[]>;
  findByDeveloper(developer: string): Promise<IProperty[]>;
}

// Static methods
PropertySchema.statics.findByExternalId = function (externalId: number) {
  return this.findOne({ externalId });
};

PropertySchema.statics.findExpired = function () {
  return this.find({ cacheExpiresAt: { $lt: new Date() } });
};

PropertySchema.statics.findByArea = function (area: string) {
  return this.find({ area: new RegExp(area, "i") });
};

PropertySchema.statics.findByDeveloper = function (developer: string) {
  return this.find({ developer: new RegExp(developer, "i") });
};

export default mongoose.model<IProperty, IPropertyModel>(
  "Property",
  PropertySchema
);
