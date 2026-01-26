/**
 * Ejari (Dubai Rental Registration) Types
 * ----------------------------------------
 * Type definitions for Ejari API responses and internal data structures.
 */

/**
 * Raw Ejari API response for a contract
 */
export interface EjariApiContract {
  contract_id: string
  contract_number?: string
  
  // Dates
  contract_start: string            // ISO date string
  contract_end?: string             // ISO date string
  registration_date?: string
  
  // Location
  area_name: string
  area_name_en?: string
  area_name_ar?: string
  building_name?: string
  community_name?: string
  
  // Property details
  property_type: string             // 'Apartment', 'Villa', 'Office', etc.
  property_sub_type?: string
  property_usage: string            // 'Residential', 'Commercial'
  rooms?: string                    // '1 B/R', '2 B/R', 'Studio', etc.
  bedrooms?: number
  
  // Size
  property_size?: number            // Size in square meters
  
  // Contract details
  annual_rent: number               // Annual rent amount in AED
  contract_value?: number           // Total contract value
  contract_duration_months?: number
  
  // Additional metadata
  is_renewal?: boolean
  landlord_type?: string            // 'Individual', 'Company'
  tenant_type?: string              // 'Individual', 'Company'
  
  // Raw response data
  _raw?: Record<string, unknown>
}

/**
 * Normalized Ejari contract for internal use
 */
export interface EjariContract {
  externalId: string
  contractStart: string             // YYYY-MM-DD
  contractEnd: string | null        // YYYY-MM-DD
  
  // Location (normalized)
  geoType: 'community' | 'district' | 'city'
  geoId: string                     // Canonical geo ID
  geoName: string                   // Human-readable name
  
  // Property
  segment: string                   // '1BR', '2BR', 'Villa', etc.
  propertyType: string              // Original property type
  propertyUsage: 'residential' | 'commercial'
  
  // Rental
  annualRent: number                // Annual rent in AED
  monthlyRent: number               // Derived from annual
  currency: 'AED'
  
  // Metadata
  isRenewal: boolean
  contractDurationMonths: number
  
  // Original data for reference
  metadata?: Record<string, unknown>
}

/**
 * Ejari API query parameters
 */
export interface EjariQueryParams {
  fromDate?: string                 // YYYY-MM-DD
  toDate?: string                   // YYYY-MM-DD
  areaName?: string
  propertyType?: string
  propertyUsage?: string            // 'Residential', 'Commercial'
  limit?: number
  offset?: number
}

/**
 * Ejari API response wrapper
 */
export interface EjariApiResponse {
  success: boolean
  data: EjariApiContract[]
  total?: number
  page?: number
  hasMore?: boolean
  error?: string
}

/**
 * Ingestion result
 */
export interface EjariIngestionResult {
  success: boolean
  contractsFetched: number
  contractsIngested: number
  contractsSkipped: number
  errors: string[]
  dateRange: {
    from: string
    to: string
  }
  durationMs: number
}
