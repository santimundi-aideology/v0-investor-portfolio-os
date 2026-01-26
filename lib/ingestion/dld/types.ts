/**
 * DLD (Dubai Land Department) Types
 * ----------------------------------
 * Type definitions for DLD API responses and internal data structures.
 */

/**
 * Raw DLD API response for a transaction
 */
export interface DLDApiTransaction {
  transaction_id: string
  transaction_number?: string
  transaction_date: string          // ISO date string
  registration_date?: string
  
  // Location
  area_name: string
  area_name_en?: string
  area_name_ar?: string
  building_name?: string
  project_name?: string
  
  // Property details
  property_type: string             // 'Unit', 'Villa', 'Land', 'Building'
  property_sub_type?: string        // 'Apartment', 'Townhouse', etc.
  property_usage?: string           // 'Residential', 'Commercial'
  rooms?: string                    // '1 B/R', '2 B/R', 'Studio', etc.
  
  // Size
  procedure_area?: number           // Size in square meters
  actual_area?: number
  balcony_area?: number
  
  // Transaction details
  transaction_type?: string         // 'Sales', 'Mortgage', 'Gift'
  transaction_value: number         // Transaction amount in AED
  
  // Additional metadata
  is_offplan?: boolean
  is_freehold?: boolean
  nearest_landmark?: string
  nearest_metro?: string
  nearest_mall?: string
  
  // Raw response data
  _raw?: Record<string, unknown>
}

/**
 * Normalized DLD transaction for internal use
 */
export interface DLDTransaction {
  externalId: string
  transactionDate: string           // YYYY-MM-DD
  
  // Location (normalized)
  geoType: 'community' | 'district' | 'city'
  geoId: string                     // Canonical geo ID
  geoName: string                   // Human-readable name
  
  // Property
  segment: string                   // '1BR', '2BR', 'Villa', etc.
  propertyType: string              // Original property type
  propertySubType?: string
  
  // Size and price
  salePrice: number                 // Transaction value in AED
  areaSqft: number                  // Converted to sqft
  pricePerSqft?: number             // Derived
  
  // Metadata
  isOffplan: boolean
  isFreehold: boolean
  currency: 'AED'
  
  // Original data for reference
  metadata?: Record<string, unknown>
}

/**
 * DLD API query parameters
 */
export interface DLDQueryParams {
  fromDate?: string                 // YYYY-MM-DD
  toDate?: string                   // YYYY-MM-DD
  areaName?: string
  propertyType?: string
  transactionType?: string          // Default: 'Sales'
  limit?: number
  offset?: number
}

/**
 * DLD API response wrapper
 */
export interface DLDApiResponse {
  success: boolean
  data: DLDApiTransaction[]
  total?: number
  page?: number
  hasMore?: boolean
  error?: string
}

/**
 * Ingestion result
 */
export interface DLDIngestionResult {
  success: boolean
  transactionsFetched: number
  transactionsIngested: number
  transactionsSkipped: number
  errors: string[]
  dateRange: {
    from: string
    to: string
  }
  durationMs: number
}
