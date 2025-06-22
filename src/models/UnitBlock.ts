import mongoose, { Schema, Document } from 'mongoose';

export interface IUnitBlock extends Document {
  externalId: number;
  name: string;
  units_area_from_m2: number;
  units_price_from_aed: number;
  units_price_to_aed: number;
  typical_unit_image_url: string | null;
  property_id: number; // Reference to external property ID
  propertyRef: mongoose.Types.ObjectId; // Reference to our Property model
  
  // Cache metadata
  lastFetchedAt: Date;
  cacheExpiresAt: Date;
  source: 'realty_api' | 'manual';
  
  createdAt: Date;
  updatedAt: Date;
}

const UnitBlockSchema: Schema = new Schema({
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
  units_area_from_m2: {
    type: Number,
    required: true,
    min: 0
  },
  units_price_from_aed: {
    type: Number,
    required: true,
    min: 0
  },
  units_price_to_aed: {
    type: Number,
    required: true,
    min: 0
  },
  typical_unit_image_url: {
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
  collection: 'unit_blocks'
});

// Compound index for property-specific queries
UnitBlockSchema.index({ property_id: 1, externalId: 1 }, { unique: true });
UnitBlockSchema.index({ propertyRef: 1 });

export default mongoose.model<IUnitBlock>('UnitBlock', UnitBlockSchema);
