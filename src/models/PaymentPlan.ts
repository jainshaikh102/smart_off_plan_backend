import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentPlan extends Document {
  externalId: number;
  name: string;
  percentage: number;
  amount: number;
  due_date: string;
  property_id: number; // Reference to external property ID
  propertyRef: mongoose.Types.ObjectId; // Reference to our Property model
  
  // Cache metadata
  lastFetchedAt: Date;
  cacheExpiresAt: Date;
  source: 'realty_api' | 'manual';
  
  createdAt: Date;
  updatedAt: Date;
}

const PaymentPlanSchema: Schema = new Schema({
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
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  due_date: {
    type: String,
    required: true
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
  collection: 'payment_plans'
});

// Compound index for property-specific queries
PaymentPlanSchema.index({ property_id: 1, externalId: 1 }, { unique: true });
PaymentPlanSchema.index({ propertyRef: 1 });

export default mongoose.model<IPaymentPlan>('PaymentPlan', PaymentPlanSchema);
