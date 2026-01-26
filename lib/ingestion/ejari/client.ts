import "server-only"

import type { EjariApiContract, EjariApiResponse, EjariQueryParams, EjariContract } from "./types"
import { mapAreaToGeo } from "../shared/geo-mapper"
import { mapToSegment } from "../shared/segment-mapper"
import { createRateLimiter, withRetry } from "../shared/rate-limiter"

/**
 * Ejari API Client
 * ----------------
 * Client for fetching rental contract data from Dubai's Ejari system.
 * 
 * Note: This is an abstraction layer. The actual API endpoints and authentication
 * will need to be configured based on the specific Ejari API being used.
 */

const EJARI_API_BASE_URL = process.env.EJARI_API_BASE_URL || 'https://api.dubaiapi.ae/ejari/v1'
const EJARI_API_KEY = process.env.EJARI_API_KEY || ''

// Rate limiter: 10 requests per second
const rateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 1000,
})

/**
 * Parse room string to bedroom count
 */
function parseRooms(rooms: string | undefined, bedroomsField: number | undefined): number | null {
  if (bedroomsField !== undefined) return bedroomsField
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
 * Transform API response to normalized contract
 */
async function transformContract(raw: EjariApiContract): Promise<EjariContract> {
  // Map area to canonical geo
  const geoResult = await mapAreaToGeo(raw.area_name_en || raw.area_name || raw.community_name || '')
  
  // Parse bedrooms and map to segment
  const bedrooms = parseRooms(raw.rooms, raw.bedrooms)
  const segmentResult = mapToSegment({
    propertyType: raw.property_sub_type || raw.property_type,
    bedrooms,
  })
  
  // Calculate monthly rent
  const monthlyRent = raw.annual_rent / 12
  
  // Default contract duration
  const durationMonths = raw.contract_duration_months ?? 12
  
  return {
    externalId: raw.contract_id || raw.contract_number || `ejari-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    contractStart: raw.contract_start.slice(0, 10),
    contractEnd: raw.contract_end ? raw.contract_end.slice(0, 10) : null,
    
    geoType: geoResult.geoType as 'community' | 'district' | 'city',
    geoId: geoResult.geoId,
    geoName: geoResult.geoName,
    
    segment: segmentResult.segment,
    propertyType: raw.property_type,
    propertyUsage: raw.property_usage?.toLowerCase() === 'commercial' ? 'commercial' : 'residential',
    
    annualRent: raw.annual_rent,
    monthlyRent,
    currency: 'AED',
    
    isRenewal: raw.is_renewal ?? false,
    contractDurationMonths: durationMonths,
    
    metadata: {
      buildingName: raw.building_name,
      propertySize: raw.property_size,
      rooms: raw.rooms,
      bedrooms,
      landlordType: raw.landlord_type,
      tenantType: raw.tenant_type,
      contractValue: raw.contract_value,
      registrationDate: raw.registration_date,
      geoConfidence: geoResult.confidence,
      segmentConfidence: segmentResult.confidence,
    },
  }
}

/**
 * Fetch contracts from Ejari API
 */
export async function fetchEjariContracts(params: EjariQueryParams): Promise<{
  contracts: EjariContract[]
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
  if (params.propertyUsage) queryParams.set('property_usage', params.propertyUsage)
  queryParams.set('limit', String(params.limit ?? 100))
  queryParams.set('offset', String(params.offset ?? 0))
  
  const url = `${EJARI_API_BASE_URL}/contracts?${queryParams.toString()}`
  
  try {
    const response = await withRetry(
      async () => {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': EJARI_API_KEY ? `Bearer ${EJARI_API_KEY}` : '',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unknown error')
          throw new Error(`Ejari API error: ${res.status} - ${errorText}`)
        }
        
        return res.json() as Promise<EjariApiResponse>
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        shouldRetry: (error) => {
          if (error instanceof Error) {
            return error.message.includes('5') || error.message.includes('network')
          }
          return false
        },
      }
    )
    
    if (!response.success || !response.data) {
      return {
        contracts: [],
        total: 0,
        hasMore: false,
        error: response.error || 'No data returned',
      }
    }
    
    // Transform all contracts
    const contracts = await Promise.all(
      response.data.map(transformContract)
    )
    
    return {
      contracts,
      total: response.total ?? contracts.length,
      hasMore: response.hasMore ?? false,
    }
  } catch (error) {
    console.error('[Ejari Client] Fetch error:', error)
    return {
      contracts: [],
      total: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Fetch all contracts within a date range (handles pagination)
 */
export async function fetchAllEjariContracts(params: {
  fromDate: string
  toDate: string
  areaName?: string
  onProgress?: (fetched: number, total: number) => void
}): Promise<{
  contracts: EjariContract[]
  error?: string
}> {
  const allContracts: EjariContract[] = []
  const pageSize = 100
  let offset = 0
  let hasMore = true
  let total = 0
  
  while (hasMore) {
    const result = await fetchEjariContracts({
      fromDate: params.fromDate,
      toDate: params.toDate,
      areaName: params.areaName,
      limit: pageSize,
      offset,
    })
    
    if (result.error) {
      return {
        contracts: allContracts,
        error: result.error,
      }
    }
    
    allContracts.push(...result.contracts)
    total = result.total
    hasMore = result.hasMore && result.contracts.length === pageSize
    offset += pageSize
    
    params.onProgress?.(allContracts.length, total)
    
    // Safety limit
    if (offset > 10000) {
      console.warn('[Ejari Client] Safety limit reached, stopping pagination')
      break
    }
  }
  
  return { contracts: allContracts }
}

/**
 * Test API connection
 */
export async function testEjariConnection(): Promise<{
  success: boolean
  message: string
}> {
  if (!EJARI_API_KEY) {
    return {
      success: false,
      message: 'EJARI_API_KEY not configured',
    }
  }
  
  try {
    const result = await fetchEjariContracts({
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
      message: `Connected successfully. Found ${result.total} contracts.`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Generate mock Ejari contracts for development/testing
 */
export function generateMockEjariContracts(count: number = 100): EjariApiContract[] {
  const areas = [
    'Dubai Marina', 'Downtown Dubai', 'Business Bay', 'Palm Jumeirah',
    'Jumeirah Village Circle', 'Dubai Hills Estate', 'Arabian Ranches',
    'Jumeirah Lakes Towers', 'DIFC', 'City Walk'
  ]
  
  const propertyTypes = ['Apartment', 'Villa', 'Townhouse', 'Office']
  const rooms = ['Studio', '1 B/R', '2 B/R', '3 B/R', '4 B/R']
  
  const contracts: EjariApiContract[] = []
  const today = new Date()
  
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 365)
    const startDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    
    const area = areas[Math.floor(Math.random() * areas.length)]
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]
    const room = propType === 'Apartment' ? rooms[Math.floor(Math.random() * rooms.length)] : undefined
    const isCommercial = propType === 'Office'
    
    // Generate realistic rent based on area and property type
    const baseRent = propType === 'Villa' ? 200000 :
                     propType === 'Office' ? 150000 :
                     propType === 'Townhouse' ? 120000 : 80000
    const areaMultiplier = area === 'Palm Jumeirah' ? 1.8 :
                           area === 'Downtown Dubai' ? 1.5 :
                           area === 'Dubai Marina' ? 1.3 : 1
    const annualRent = Math.round(baseRent * areaMultiplier * (0.8 + Math.random() * 0.4))
    
    contracts.push({
      contract_id: `MOCK-EJARI-${i + 1}`,
      contract_start: startDate.toISOString().slice(0, 10),
      contract_end: endDate.toISOString().slice(0, 10),
      area_name: area,
      area_name_en: area,
      property_type: propType,
      property_usage: isCommercial ? 'Commercial' : 'Residential',
      rooms: room,
      annual_rent: annualRent,
      contract_duration_months: 12,
      is_renewal: Math.random() > 0.6,
    })
  }
  
  return contracts
}
