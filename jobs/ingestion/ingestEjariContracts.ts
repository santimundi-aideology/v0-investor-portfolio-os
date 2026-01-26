import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"
import { fetchAllEjariContracts, generateMockEjariContracts } from "@/lib/ingestion/ejari/client"
import { mapAreaToGeo } from "@/lib/ingestion/shared/geo-mapper"
import { mapToSegment } from "@/lib/ingestion/shared/segment-mapper"
import type { EjariIngestionResult, EjariApiContract } from "@/lib/ingestion/ejari/types"

/**
 * Ejari Contract Ingestion Job
 * ----------------------------
 * Fetches Ejari rental contracts and ingests them into raw_ejari_contracts table.
 * 
 * Features:
 * - Incremental ingestion (date range based)
 * - Idempotent (upsert on external_id)
 * - Geo normalization via geo_mapper
 * - Segment normalization via segment_mapper
 * 
 * Usage:
 *   await ingestEjariContracts({ orgId: 'tenant-1' })
 *   await ingestEjariContracts({ orgId: 'tenant-1', fromDate: '2024-01-01', toDate: '2024-12-31' })
 */

export interface IngestEjariOptions {
  orgId: string
  fromDate?: string         // YYYY-MM-DD (default: 30 days ago)
  toDate?: string           // YYYY-MM-DD (default: today)
  areaName?: string         // Filter by area
  useMockData?: boolean     // Use mock data for testing
  mockCount?: number        // Number of mock contracts
  onProgress?: (message: string, fetched?: number, total?: number) => void
}

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
 * Transform and map a raw Ejari API contract to database row format
 */
async function transformToDbRow(raw: EjariApiContract, orgId: string): Promise<Record<string, unknown>> {
  // Map area to canonical geo
  const geoResult = await mapAreaToGeo(raw.area_name_en || raw.area_name || raw.community_name || '')
  
  // Parse bedrooms and map to segment
  const bedrooms = parseRooms(raw.rooms, raw.bedrooms)
  const segmentResult = mapToSegment({
    propertyType: raw.property_sub_type || raw.property_type,
    bedrooms,
  })
  
  return {
    org_id: orgId,
    external_id: raw.contract_id || raw.contract_number || `ejari-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    contract_start: raw.contract_start.slice(0, 10),
    contract_end: raw.contract_end ? raw.contract_end.slice(0, 10) : null,
    geo_type: geoResult.geoType,
    geo_id: geoResult.geoId,
    geo_name: geoResult.geoName,
    segment: segmentResult.segment,
    annual_rent: raw.annual_rent,
    currency: 'AED',
    metadata: {
      propertyType: raw.property_type,
      propertySubType: raw.property_sub_type,
      propertyUsage: raw.property_usage,
      rooms: raw.rooms,
      bedrooms,
      buildingName: raw.building_name,
      propertySize: raw.property_size,
      isRenewal: raw.is_renewal,
      contractDurationMonths: raw.contract_duration_months,
      landlordType: raw.landlord_type,
      tenantType: raw.tenant_type,
      geoConfidence: geoResult.confidence,
      segmentConfidence: segmentResult.confidence,
    },
  }
}

/**
 * Ingest Ejari contracts into the database
 */
export async function ingestEjariContracts(options: IngestEjariOptions): Promise<EjariIngestionResult> {
  const supabase = getSupabaseAdminClient()
  const started = Date.now()
  const errors: string[] = []
  
  // Default date range: last 30 days (contracts are less frequent than sales)
  const today = new Date()
  const defaultFromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  const fromDate = options.fromDate ?? defaultFromDate.toISOString().slice(0, 10)
  const toDate = options.toDate ?? today.toISOString().slice(0, 10)
  
  options.onProgress?.(`Starting Ejari ingestion for ${fromDate} to ${toDate}`)
  
  let rawContracts: EjariApiContract[] = []
  
  if (options.useMockData) {
    // Use mock data for testing
    options.onProgress?.('Using mock data')
    rawContracts = generateMockEjariContracts(options.mockCount ?? 100)
    
    // Filter by date range
    rawContracts = rawContracts.filter(c => {
      const date = c.contract_start.slice(0, 10)
      return date >= fromDate && date <= toDate
    })
  } else {
    // Fetch from Ejari API
    options.onProgress?.('Fetching from Ejari API...')
    
    const fetchResult = await fetchAllEjariContracts({
      fromDate,
      toDate,
      areaName: options.areaName,
      onProgress: (fetched, total) => {
        options.onProgress?.(`Fetched ${fetched}/${total} contracts`, fetched, total)
      },
    })
    
    if (fetchResult.error) {
      errors.push(fetchResult.error)
    }
    
    rawContracts = fetchResult.contracts as unknown as EjariApiContract[]
  }
  
  options.onProgress?.(`Fetched ${rawContracts.length} contracts, transforming...`)
  
  if (rawContracts.length === 0) {
    return {
      success: errors.length === 0,
      contractsFetched: 0,
      contractsIngested: 0,
      contractsSkipped: 0,
      errors,
      dateRange: { from: fromDate, to: toDate },
      durationMs: Date.now() - started,
    }
  }
  
  // Transform contracts to database format
  const dbRows: Array<Record<string, unknown>> = []
  
  for (const raw of rawContracts) {
    try {
      const row = await transformToDbRow(raw, options.orgId)
      dbRows.push(row)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Transform error for ${raw.contract_id}: ${msg}`)
    }
  }
  
  options.onProgress?.(`Transformed ${dbRows.length} contracts, upserting...`)
  
  // Upsert in batches
  const batchSize = 100
  let ingested = 0
  let skipped = 0
  
  for (let i = 0; i < dbRows.length; i += batchSize) {
    const batch = dbRows.slice(i, i + batchSize)
    
    try {
      const { data, error } = await supabase
        .from("raw_ejari_contracts")
        .upsert(batch, {
          onConflict: "org_id,external_id",
        })
        .select("id")
      
      if (error) {
        errors.push(`Upsert error (batch ${Math.floor(i / batchSize) + 1}): ${error.message}`)
        skipped += batch.length
      } else {
        ingested += data?.length ?? 0
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Batch error: ${msg}`)
      skipped += batch.length
    }
    
    options.onProgress?.(`Upserted ${Math.min(i + batchSize, dbRows.length)}/${dbRows.length}`)
  }
  
  const duration = Date.now() - started
  
  console.log(
    `[ingestEjariContracts] orgId=${options.orgId} ` +
    `fetched=${rawContracts.length} ingested=${ingested} skipped=${skipped} ` +
    `errors=${errors.length} duration=${duration}ms`
  )
  
  return {
    success: errors.length === 0,
    contractsFetched: rawContracts.length,
    contractsIngested: ingested,
    contractsSkipped: skipped,
    errors,
    dateRange: { from: fromDate, to: toDate },
    durationMs: duration,
  }
}

/**
 * Get last ingestion date for an org
 */
export async function getLastEjariIngestionDate(orgId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient()
  
  const { data, error } = await supabase
    .from("raw_ejari_contracts")
    .select("contract_start")
    .eq("org_id", orgId)
    .order("contract_start", { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (error || !data) {
    return null
  }
  
  return data.contract_start as string
}

/**
 * Get Ejari ingestion stats for an org
 */
export async function getEjariIngestionStats(orgId: string): Promise<{
  totalContracts: number
  dateRange: { earliest: string | null; latest: string | null }
  avgAnnualRent: number | null
  topAreas: Array<{ geoName: string; count: number; avgRent: number }>
}> {
  const supabase = getSupabaseAdminClient()
  
  // Get total count
  const { count } = await supabase
    .from("raw_ejari_contracts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
  
  // Get date range
  const { data: earliestData } = await supabase
    .from("raw_ejari_contracts")
    .select("contract_start")
    .eq("org_id", orgId)
    .order("contract_start", { ascending: true })
    .limit(1)
  
  const { data: latestData } = await supabase
    .from("raw_ejari_contracts")
    .select("contract_start")
    .eq("org_id", orgId)
    .order("contract_start", { ascending: false })
    .limit(1)
  
  // Get contracts with rent and area data
  const { data: contractData } = await supabase
    .from("raw_ejari_contracts")
    .select("geo_name, annual_rent")
    .eq("org_id", orgId)
  
  // Calculate stats
  const areaStats = new Map<string, { count: number; totalRent: number }>()
  let totalRent = 0
  
  for (const row of (contractData ?? []) as Array<{ geo_name: string; annual_rent: number }>) {
    totalRent += row.annual_rent
    
    const name = row.geo_name ?? 'Unknown'
    const existing = areaStats.get(name) ?? { count: 0, totalRent: 0 }
    existing.count += 1
    existing.totalRent += row.annual_rent
    areaStats.set(name, existing)
  }
  
  const avgAnnualRent = contractData && contractData.length > 0
    ? Math.round(totalRent / contractData.length)
    : null
  
  const topAreas = Array.from(areaStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([geoName, stats]) => ({
      geoName,
      count: stats.count,
      avgRent: Math.round(stats.totalRent / stats.count),
    }))
  
  return {
    totalContracts: count ?? 0,
    dateRange: {
      earliest: (earliestData?.[0] as { contract_start: string } | undefined)?.contract_start ?? null,
      latest: (latestData?.[0] as { contract_start: string } | undefined)?.contract_start ?? null,
    },
    avgAnnualRent,
    topAreas,
  }
}
