import "server-only"

import type { PortalApiListing, PortalApiResponse, PortalQueryParams, PortalListing } from "./types"
import { mapAreaToGeo } from "../shared/geo-mapper"
import { mapToSegment } from "../shared/segment-mapper"
import { createRateLimiter, withRetry } from "../shared/rate-limiter"

/**
 * Bayut API Client
 * ----------------
 * Client for fetching listing data from Bayut portal.
 * 
 * Note: This is an abstraction layer. The actual API endpoints and authentication
 * will need to be configured based on whether you have:
 * 1. Official Bayut API partnership
 * 2. Web scraping solution
 * 3. Third-party data provider
 */

const BAYUT_API_BASE_URL = process.env.BAYUT_API_BASE_URL || 'https://api.bayut.com/v1'
const BAYUT_API_KEY = process.env.BAYUT_API_KEY || ''

// Rate limiter: 5 requests per second (conservative for scraping)
const rateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 1000,
})

/**
 * Calculate days on market from listed date
 */
function calculateDaysOnMarket(listedDate?: string): number {
  if (!listedDate) return 0
  
  const listed = new Date(listedDate)
  const now = new Date()
  const diffMs = now.getTime() - listed.getTime()
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
}

/**
 * Transform API response to normalized listing
 */
async function transformListing(raw: PortalApiListing, asOfDate: string): Promise<PortalListing> {
  // Map area to canonical geo
  const areaName = raw.location?.community || raw.location?.area || raw.location?.city || ''
  const geoResult = await mapAreaToGeo(areaName)
  
  // Map to segment
  const segmentResult = mapToSegment({
    propertyType: raw.property_sub_type || raw.property_type,
    bedrooms: raw.bedrooms,
  })
  
  // Detect price cut
  const hadPriceCut = raw.original_price 
    ? raw.price < raw.original_price 
    : (raw.price_history?.length ?? 0) > 1
  
  const priceCutPct = raw.original_price && raw.original_price > raw.price
    ? (raw.original_price - raw.price) / raw.original_price
    : undefined
  
  // Calculate size in sqft
  const sizeSqft = raw.size_sqft ?? (raw.size_sqm ? raw.size_sqm * 10.7639 : undefined)
  
  // Calculate price per sqft
  const pricePerSqft = raw.price_per_sqft ?? (sizeSqft && sizeSqft > 0 ? raw.price / sizeSqft : undefined)
  
  return {
    portal: 'Bayut',
    listingId: raw.listing_id,
    asOfDate,
    
    geoType: geoResult.geoType as 'community' | 'district' | 'city',
    geoId: geoResult.geoId,
    geoName: geoResult.geoName,
    
    segment: segmentResult.segment,
    propertyType: raw.property_type,
    listingType: raw.listing_type,
    
    price: raw.price,
    pricePerSqft,
    originalPrice: raw.original_price,
    hadPriceCut,
    priceCutPct,
    
    sizeSqft,
    bedrooms: raw.bedrooms,
    bathrooms: raw.bathrooms,
    
    isActive: raw.is_active ?? true,
    daysOnMarket: raw.days_on_market ?? calculateDaysOnMarket(raw.listed_date),
    listedDate: raw.listed_date,
    
    isVerified: raw.is_verified ?? false,
    furnishing: raw.furnishing,
    completionStatus: raw.completion_status,
    
    metadata: {
      title: raw.title,
      building: raw.location?.building,
      agent: raw.agent,
      photosCount: raw.photos_count,
      hasVideo: raw.has_video,
      url: raw.url,
      amenities: raw.amenities,
      geoConfidence: geoResult.confidence,
      segmentConfidence: segmentResult.confidence,
    },
  }
}

/**
 * Fetch listings from Bayut API
 */
export async function fetchBayutListings(params: PortalQueryParams): Promise<{
  listings: PortalListing[]
  total: number
  hasMore: boolean
  error?: string
}> {
  await rateLimiter.acquire()
  
  const asOfDate = new Date().toISOString().slice(0, 10)
  
  // Build query parameters
  const queryParams = new URLSearchParams()
  
  if (params.area) queryParams.set('location', params.area)
  if (params.propertyType) queryParams.set('category', params.propertyType)
  if (params.listingType) queryParams.set('purpose', params.listingType === 'rent' ? 'for-rent' : 'for-sale')
  if (params.minPrice) queryParams.set('price_min', String(params.minPrice))
  if (params.maxPrice) queryParams.set('price_max', String(params.maxPrice))
  if (params.bedrooms) queryParams.set('beds', String(params.bedrooms))
  queryParams.set('hits', String(params.limit ?? 100))
  queryParams.set('page', String(Math.floor((params.offset ?? 0) / (params.limit ?? 100))))
  
  const url = `${BAYUT_API_BASE_URL}/listings?${queryParams.toString()}`
  
  try {
    const response = await withRetry(
      async () => {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': BAYUT_API_KEY ? `Bearer ${BAYUT_API_KEY}` : '',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unknown error')
          throw new Error(`Bayut API error: ${res.status} - ${errorText}`)
        }
        
        return res.json() as Promise<PortalApiResponse>
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
      }
    )
    
    if (!response.success || !response.data) {
      return {
        listings: [],
        total: 0,
        hasMore: false,
        error: response.error || 'No data returned',
      }
    }
    
    // Transform all listings
    const listings = await Promise.all(
      response.data.map(raw => transformListing(raw, asOfDate))
    )
    
    return {
      listings,
      total: response.total ?? listings.length,
      hasMore: response.hasMore ?? false,
    }
  } catch (error) {
    console.error('[Bayut Client] Fetch error:', error)
    return {
      listings: [],
      total: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Fetch all listings for a set of areas
 */
export async function fetchAllBayutListings(params: {
  areas?: string[]
  listingType?: 'sale' | 'rent'
  onProgress?: (fetched: number, total: number) => void
}): Promise<{
  listings: PortalListing[]
  error?: string
}> {
  const allListings: PortalListing[] = []
  const areas = params.areas ?? ['Dubai Marina', 'Downtown Dubai', 'Business Bay', 'JVC', 'Palm Jumeirah']
  
  for (const area of areas) {
    let offset = 0
    const pageSize = 100
    let hasMore = true
    
    while (hasMore) {
      const result = await fetchBayutListings({
        area,
        listingType: params.listingType ?? 'sale',
        limit: pageSize,
        offset,
      })
      
      if (result.error) {
        console.warn(`[Bayut] Error fetching ${area}: ${result.error}`)
        break
      }
      
      allListings.push(...result.listings)
      hasMore = result.hasMore && result.listings.length === pageSize
      offset += pageSize
      
      params.onProgress?.(allListings.length, result.total * areas.length)
      
      // Safety limit per area
      if (offset > 1000) break
    }
  }
  
  return { listings: allListings }
}

/**
 * Test API connection
 */
export async function testBayutConnection(): Promise<{
  success: boolean
  message: string
}> {
  try {
    const result = await fetchBayutListings({
      limit: 1,
      area: 'Dubai Marina',
    })
    
    if (result.error) {
      return {
        success: false,
        message: `API error: ${result.error}`,
      }
    }
    
    return {
      success: true,
      message: `Connected successfully. Found ${result.total} listings.`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Generate mock Bayut listings for development/testing
 */
export function generateMockBayutListings(count: number = 100): PortalApiListing[] {
  const areas = [
    'Dubai Marina', 'Downtown Dubai', 'Business Bay', 'Palm Jumeirah',
    'Jumeirah Village Circle', 'Dubai Hills Estate', 'Arabian Ranches',
    'Jumeirah Lakes Towers', 'DIFC', 'City Walk'
  ]
  
  const propertyTypes = ['Apartment', 'Villa', 'Townhouse', 'Penthouse']
  const today = new Date()
  
  const listings: PortalApiListing[] = []
  
  for (let i = 0; i < count; i++) {
    const area = areas[Math.floor(Math.random() * areas.length)]
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]
    const bedrooms = propType === 'Apartment' ? Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 3)
    const isVilla = propType === 'Villa' || propType === 'Townhouse'
    
    // Generate realistic price
    const basePrice = isVilla ? 3000000 : 1000000 + bedrooms * 500000
    const areaMultiplier = area === 'Palm Jumeirah' ? 2 : area === 'Downtown Dubai' ? 1.7 : 1
    const price = Math.round(basePrice * areaMultiplier * (0.8 + Math.random() * 0.4))
    
    // Generate size
    const baseSqft = isVilla ? 2500 : 500 + bedrooms * 400
    const sizeSqft = Math.round(baseSqft * (0.9 + Math.random() * 0.2))
    
    // Days on market (some new, some old)
    const daysOnMarket = Math.floor(Math.random() * 180)
    const listedDate = new Date(today.getTime() - daysOnMarket * 24 * 60 * 60 * 1000)
    
    // Some have price cuts
    const hasPriceCut = Math.random() > 0.75
    const originalPrice = hasPriceCut ? Math.round(price * (1.05 + Math.random() * 0.15)) : undefined
    
    listings.push({
      listing_id: `BAYUT-MOCK-${i + 1}`,
      portal: 'Bayut',
      title: `${bedrooms} BR ${propType} in ${area}`,
      location: {
        area,
        community: area,
        city: 'Dubai',
      },
      property_type: propType,
      bedrooms,
      bathrooms: Math.ceil(bedrooms * 1.2),
      size_sqft: sizeSqft,
      price,
      price_currency: 'AED',
      listing_type: 'sale',
      price_per_sqft: Math.round(price / sizeSqft),
      original_price: originalPrice,
      listed_date: listedDate.toISOString().slice(0, 10),
      days_on_market: daysOnMarket,
      is_active: true,
      is_verified: Math.random() > 0.5,
      furnishing: Math.random() > 0.6 ? 'Unfurnished' : 'Furnished',
      completion_status: Math.random() > 0.8 ? 'Off-Plan' : 'Ready',
    })
  }
  
  return listings
}
