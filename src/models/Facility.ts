import mongoose, { Schema, Document } from 'mongoose';

export interface IFacility extends Document {
  externalId: number;
  name: string;
  category: string;
  image_url: string | null;
  property_id: number; // Reference to external property ID
  propertyRef: mongoose.Types.ObjectId; // Reference to our Property model
  
  // Cache metadata
  lastFetchedAt: Date;
  cacheExpiresAt: Date;
  source: 'realty_api' | 'manual';
  
  createdAt: Date;
  updatedAt: Date;
}

const FacilitySchema: Schema = new Schema({
  externalId: {
    type: Number,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  image_url: {
    type: String,
    default: null
  },
  property_id: {
    type: Number,
    required: true,
    index: true
  },
  propertyRef: {
    type: Schema.Types.ObjectId,
    ref: 'Property',
    index: true
  },
  lastFetchedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  cacheExpiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: true
  },
  source: {
    type: String,
    enum: ['realty_api', 'manual'],
    default: 'realty_api',
    required: true
  }
}, {
  timestamps: true,
  collection: 'facilities'
});

// Compound index for property-specific queries
FacilitySchema.index({ property_id: 1, externalId: 1 }, { unique: true });
FacilitySchema.index({ propertyRef: 1 });
FacilitySchema.index({ category: 1 });

export default mongoose.model<IFacility>('Facility', FacilitySchema);
