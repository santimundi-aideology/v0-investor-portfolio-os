import "server-only"

import type { DLDApiTransaction, DLDApiResponse, DLDQueryParams, DLDTransaction } from "./types"
import { mapAreaToGeo } from "../shared/geo-mapper"
import { mapToSegment } from "../shared/segment-mapper"
import { createRateLimiter, withRetry } from "../shared/rate-limiter"

/**
 * DLD API Client
 * --------------
 * Client for fetching transaction data from Dubai Land Department.
 * 
 * API Documentation: https://dubaiapi.ae/open-data/real-estate
 * 
 * Note: This is an abstraction layer. The actual API endpoints and authentication
 * will need to be configured based on the specific DLD API being used.
 */

const DLD_API_BASE_URL = process.env.DLD_API_BASE_URL || 'https://api.dubaiapi.ae/dld/v1'
const DLD_API_KEY = process.env.DLD_API_KEY || ''

// Rate limiter: 10 requests per second
const rateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 1000,
})

/**
 * Convert square meters to square feet
 */
function sqmToSqft(sqm: number): number {
  return sqm * 10.7639
}

/**
 * Parse room string to bedroom count
 */
function parseRooms(rooms: string | undefined): number | null {
  if (!rooms) return null
  
  const normalized = rooms.toLowerCase().trim()
  
  if (normalized.includes('studio')) return 0
  
  const match = normalized.match(/(\d+)\s*b\/r/i) || normalized.match(/(\d+)\s*bed/i)
  if (match) {
    return parseInt(match[1], 10)
  }
  
  return null
}

/**
 * Transform API response to normalized transaction
 */
async function transformTransaction(raw: DLDApiTransaction): Promise<DLDTransaction> {
  // Map area to canonical geo
  const geoResult = await mapAreaToGeo(raw.area_name_en || raw.area_name)
  
  // Parse bedrooms and map to segment
  const bedrooms = parseRooms(raw.rooms)
  const segmentResult = mapToSegment({
    propertyType: raw.property_sub_type || raw.property_type,
    bedrooms,
  })
  
  // Calculate area in sqft
  const areaMeters = raw.procedure_area || raw.actual_area || 0
  const areaSqft = sqmToSqft(areaMeters)
  
  // Calculate price per sqft
  const pricePerSqft = areaSqft > 0 ? raw.transaction_value / areaSqft : undefined
  
  return {
    externalId: raw.transaction_id || raw.transaction_number || `dld-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    transactionDate: raw.transaction_date.slice(0, 10), // Ensure YYYY-MM-DD
    
    geoType: geoResult.geoType as 'community' | 'district' | 'city',
    geoId: geoResult.geoId,
    geoName: geoResult.geoName,
    
    segment: segmentResult.segment,
    propertyType: raw.property_type,
    propertySubType: raw.property_sub_type,
    
    salePrice: raw.transaction_value,
    areaSqft,
    pricePerSqft,
    
    isOffplan: raw.is_offplan ?? false,
    isFreehold: raw.is_freehold ?? true,
    currency: 'AED',
    
    metadata: {
      buildingName: raw.building_name,
      projectName: raw.project_name,
      propertyUsage: raw.property_usage,
      rooms: raw.rooms,
      areaMeters,
      registrationDate: raw.registration_date,
      transactionType: raw.transaction_type,
      nearestLandmark: raw.nearest_landmark,
      nearestMetro: raw.nearest_metro,
      nearestMall: raw.nearest_mall,
      geoConfidence: geoResult.confidence,
      segmentConfidence: segmentResult.confidence,
    },
  }
}

/**
 * Fetch transactions from DLD API
 */
export async function fetchDLDTransactions(params: DLDQueryParams): Promise<{
  transactions: DLDTransaction[]
  total: number
  hasMore: boolean
  error?: string
}> {
  await rateLimiter.acquire()
  
  // Build query parameters
  const queryParams = new URLSearchParams()
  
  if (params.fromDate) queryParams.set('from_date', params.fromDate)
  if (params.toDate) queryParams.set('to_date', params.toDate)
  if (params.areaName) queryParams.set('area_name', params.areaName)
  if (params.propertyType) queryParams.set('property_type', params.propertyType)
  if (params.transactionType) queryParams.set('transaction_type', params.transactionType)
  queryParams.set('limit', String(params.limit ?? 100))
  queryParams.set('offset', String(params.offset ?? 0))
  
  const url = `${DLD_API_BASE_URL}/transactions?${queryParams.toString()}`
  
  try {
    const response = await withRetry(
      async () => {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': DLD_API_KEY ? `Bearer ${DLD_API_KEY}` : '',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unknown error')
          throw new Error(`DLD API error: ${res.status} - ${errorText}`)
        }
        
        return res.json() as Promise<DLDApiResponse>
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        shouldRetry: (error) => {
          // Retry on network errors or 5xx errors
          if (error instanceof Error) {
            return error.message.includes('5') || error.message.includes('network')
          }
          return false
        },
      }
    )
    
    if (!response.success || !response.data) {
      return {
        transactions: [],
        total: 0,
        hasMore: false,
        error: response.error || 'No data returned',
      }
    }
    
    // Transform all transactions
    const transactions = await Promise.all(
      response.data.map(transformTransaction)
    )
    
    return {
      transactions,
      total: response.total ?? transactions.length,
      hasMore: response.hasMore ?? false,
    }
  } catch (error) {
    console.error('[DLD Client] Fetch error:', error)
    return {
      transactions: [],
      total: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Fetch all transactions within a date range (handles pagination)
 */
export async function fetchAllDLDTransactions(params: {
  fromDate: string
  toDate: string
  areaName?: string
  onProgress?: (fetched: number, total: number) => void
}): Promise<{
  transactions: DLDTransaction[]
  error?: string
}> {
  const allTransactions: DLDTransaction[] = []
  const pageSize = 100
  let offset = 0
  let hasMore = true
  let total = 0
  
  while (hasMore) {
    const result = await fetchDLDTransactions({
      fromDate: params.fromDate,
      toDate: params.toDate,
      areaName: params.areaName,
      transactionType: 'Sales',
      limit: pageSize,
      offset,
    })
    
    if (result.error) {
      return {
        transactions: allTransactions,
        error: result.error,
      }
    }
    
    allTransactions.push(...result.transactions)
    total = result.total
    hasMore = result.hasMore && result.transactions.length === pageSize
    offset += pageSize
    
    params.onProgress?.(allTransactions.length, total)
    
    // Safety limit to prevent infinite loops
    if (offset > 10000) {
      console.warn('[DLD Client] Safety limit reached, stopping pagination')
      break
    }
  }
  
  return { transactions: allTransactions }
}

/**
 * Test API connection
 */
export async function testDLDConnection(): Promise<{
  success: boolean
  message: string
}> {
  if (!DLD_API_KEY) {
    return {
      success: false,
      message: 'DLD_API_KEY not configured',
    }
  }
  
  try {
    const result = await fetchDLDTransactions({
      limit: 1,
      fromDate: new Date().toISOString().slice(0, 10),
      toDate: new Date().toISOString().slice(0, 10),
    })
    
    if (result.error) {
      return {
        success: false,
        message: `API error: ${result.error}`,
      }
    }
    
    return {
      success: true,
      message: `Connected successfully. Found ${result.total} transactions.`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Generate mock DLD transactions for development/testing
 */
export function generateMockDLDTransactions(count: number = 100): DLDApiTransaction[] {
  const areas = [
    'Dubai Marina', 'Downtown Dubai', 'Business Bay', 'Palm Jumeirah',
    'Jumeirah Village Circle', 'Dubai Hills Estate', 'Arabian Ranches',
    'Jumeirah Lakes Towers', 'DIFC', 'City Walk'
  ]
  
  const propertyTypes = ['Unit', 'Villa', 'Townhouse']
  const rooms = ['Studio', '1 B/R', '2 B/R', '3 B/R', '4 B/R', '5 B/R']
  
  const transactions: DLDApiTransaction[] = []
  const today = new Date()
  
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 365)
    const date = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    const area = areas[Math.floor(Math.random() * areas.length)]
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]
    const room = propType === 'Unit' ? rooms[Math.floor(Math.random() * rooms.length)] : undefined
    
    // Generate realistic price based on area and property type
    const basePrice = propType === 'Villa' ? 5000000 : propType === 'Townhouse' ? 2500000 : 1500000
    const areaMultiplier = area === 'Palm Jumeirah' ? 2 : area === 'Downtown Dubai' ? 1.8 : 1
    const price = Math.round(basePrice * areaMultiplier * (0.7 + Math.random() * 0.6))
    
    const areaSqm = propType === 'Villa' ? 300 + Math.random() * 400 :
                    propType === 'Townhouse' ? 150 + Math.random() * 150 :
                    50 + Math.random() * 150
    
    transactions.push({
      transaction_id: `MOCK-${i + 1}`,
      transaction_date: date.toISOString().slice(0, 10),
      area_name: area,
      area_name_en: area,
      property_type: propType,
      rooms: room,
      procedure_area: Math.round(areaSqm),
      transaction_value: price,
      transaction_type: 'Sales',
      is_freehold: true,
      is_offplan: Math.random() > 0.7,
    })
  }
  
  return transactions
}
