// Export all models from a single file for easier imports
export { default as Property, IProperty } from './Property';
export { default as UnitBlock, IUnitBlock } from './UnitBlock';
export { default as PaymentPlan, IPaymentPlan } from './PaymentPlan';
export { default as Facility, IFacility } from './Facility';

// Re-export mongoose types for convenience
export { Document, Types } from 'mongoose';
