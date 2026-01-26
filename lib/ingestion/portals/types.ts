/**
 * Portal Listing Types
 * --------------------
 * Type definitions for portal API responses (Bayut, PropertyFinder, etc.)
 */

/**
 * Raw portal API listing response
 */
export interface PortalApiListing {
  listing_id: string
  portal: string                    // 'Bayut', 'PropertyFinder', etc.
  
  // Basic info
  title?: string
  description?: string
  
  // Location
  location: {
    area?: string
    community?: string
    building?: string
    city?: string
  }
  
  // Property details
  property_type: string             // 'Apartment', 'Villa', 'Office'
  property_sub_type?: string
  bedrooms?: number
  bathrooms?: number
  
  // Size
  size_sqft?: number
  size_sqm?: number
  
  // Pricing
  price: number
  price_currency?: string           // Default: 'AED'
  listing_type: 'sale' | 'rent'
  price_per_sqft?: number
  
  // Price history (for detecting cuts)
  original_price?: number
  price_history?: Array<{
    date: string
    price: number
  }>
  
  // Market health indicators
  listed_date?: string              // When first listed
  last_updated?: string             // Last modification
  days_on_market?: number
  is_active?: boolean
  
  // Verification
  is_verified?: boolean             // TruCheck, etc.
  verification_status?: string
  
  // Agent/broker info
  agent?: {
    id?: string
    name?: string
    company?: string
    phone?: string
  }
  
  // Features
  amenities?: string[]
  furnishing?: string               // 'Furnished', 'Unfurnished', 'Semi'
  completion_status?: string        // 'Ready', 'Off-Plan'
  
  // Media
  photos_count?: number
  has_video?: boolean
  has_floor_plan?: boolean
  
  // URL
  url?: string
  
  // Raw data
  _raw?: Record<string, unknown>
}

/**
 * Normalized portal listing for internal use
 */
export interface PortalListing {
  portal: string
  listingId: string
  asOfDate: string                  // YYYY-MM-DD snapshot date
  
  // Location (normalized)
  geoType: 'community' | 'district' | 'city'
  geoId: string
  geoName: string
  
  // Property
  segment: string                   // '1BR', '2BR', 'Villa', etc.
  propertyType: string
  listingType: 'sale' | 'rent'
  
  // Pricing
  price: number
  pricePerSqft?: number
  originalPrice?: number
  hadPriceCut: boolean
  priceCutPct?: number
  
  // Size
  sizeSqft?: number
  bedrooms?: number
  bathrooms?: number
  
  // Market health
  isActive: boolean
  daysOnMarket: number
  listedDate?: string
  
  // Metadata
  isVerified: boolean
  furnishing?: string
  completionStatus?: string
  
  metadata?: Record<string, unknown>
}

/**
 * Portal query parameters
 */
export interface PortalQueryParams {
  area?: string
  propertyType?: string
  listingType?: 'sale' | 'rent'
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  limit?: number
  offset?: number
}

/**
 * Portal API response wrapper
 */
export interface PortalApiResponse {
  success: boolean
  data: PortalApiListing[]
  total?: number
  page?: number
  hasMore?: boolean
  error?: string
}

/**
 * Portal ingestion result
 */
export interface PortalIngestionResult {
  success: boolean
  listingsFetched: number
  listingsIngested: number
  listingsSkipped: number
  priceCutsDetected: number
  errors: string[]
  portal: string
  asOfDate: string
  durationMs: number
}
