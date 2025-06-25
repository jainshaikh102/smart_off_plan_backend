// Property Types
export interface Property {
  id: number;
  name: string;
  area: string;
  area_unit: string;
  cover_image_url: string;
  developer: string;
  is_partner_project: boolean;
  min_price: number;
  max_price: number;
  price_currency: string;
  sale_status: string;
  status: string;
  development_status: string; // Development status from complete property data
  completion_datetime: string;
  coordinates: string;
  description: string;
  featured: boolean;
  pendingReview: boolean;
  featureReason: string[];
  reelly_status: boolean;
  lastFeaturedAt?: string;
  lastFetchedAt: Date;
  cacheExpiresAt: Date;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface FullProperty {
  _id?: string;
  externalId: number;
  name: string;
  area: string;
  area_unit: string;
  cover_image_url: string;
  developer: string;
  is_partner_project: boolean;
  min_price: number;
  max_price: number;
  price_currency: string;
  sale_status: string;
  status: string;
  completion_datetime: string;
  coordinates: string;
  description: string;
  completePropertyData: any; // Or define a specific type for completePropertyData
  featured: boolean;
  pendingReview: boolean;
  featureReason: string[];
  reelly_status: boolean;
  lastFeaturedAt?: string;
  lastFetchedAt: Date;
  cacheExpiresAt: Date;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}

// Unit Block Types
export interface UnitBlock {
  id: number;
  name: string;
  units_area_from_m2: number;
  units_price_from_aed: number;
  units_price_to_aed: number;
  typical_unit_image_url: string | null;
  property_id: number;
}

// Payment Plan Types
export interface PaymentPlan {
  id: number;
  name: string;
  percentage: number;
  amount: number;
  due_date: string;
  property_id: number;
}

// Facility Types
export interface Facility {
  id: number;
  name: string;
  category: string;
  image_url: string | null;
  property_id: number;
}

// Map Point Types
export interface MapPoint {
  id: number;
  name: string;
  type: string;
  coordinates: string;
  property_id: number;
}

// Architecture Image Types
export interface ArchitectureImage {
  id: number;
  url: string;
  caption?: string;
  property_id: number;
}

// Request/Response Types
export interface GetPropertiesQuery {
  page?: number;
  limit?: number;
  sort?:
    | "completion_asc"
    | "completion_desc"
    | "price_asc"
    | "price_desc"
    | "name_asc"
    | "name_desc"
    | "featured";
  area?: string;
  developer?: string;
  status?: string;
  min_price?: number;
  max_price?: number;
  forceRefresh?: boolean | string;
}

export interface PropertyDetailsResponse extends Property {
  unit_blocks?: UnitBlock[];
  payment_plans?: PaymentPlan[];
  facilities?: Facility[];
  map_points?: MapPoint[];
  architecture?: ArchitectureImage[];
}
