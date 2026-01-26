import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"
import { fetchAllDLDTransactions, generateMockDLDTransactions } from "@/lib/ingestion/dld/client"
import { mapAreaToGeo } from "@/lib/ingestion/shared/geo-mapper"
import { mapToSegment } from "@/lib/ingestion/shared/segment-mapper"
import type { DLDIngestionResult, DLDApiTransaction } from "@/lib/ingestion/dld/types"

/**
 * DLD Transaction Ingestion Job
 * -----------------------------
 * Fetches DLD transactions and ingests them into raw_dld_transactions table.
 * 
 * Features:
 * - Incremental ingestion (date range based)
 * - Idempotent (upsert on external_id)
 * - Geo normalization via geo_mapper
 * - Segment normalization via segment_mapper
 * 
 * Usage:
 *   await ingestDldTransactions({ orgId: 'tenant-1' })
 *   await ingestDldTransactions({ orgId: 'tenant-1', fromDate: '2024-01-01', toDate: '2024-12-31' })
 */

export interface IngestDldOptions {
  orgId: string
  fromDate?: string         // YYYY-MM-DD (default: 7 days ago)
  toDate?: string           // YYYY-MM-DD (default: today)
  areaName?: string         // Filter by area
  useMockData?: boolean     // Use mock data for testing
  mockCount?: number        // Number of mock transactions
  onProgress?: (message: string, fetched?: number, total?: number) => void
}

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
 * Transform and map a raw DLD API transaction to database row format
 */
async function transformToDbRow(raw: DLDApiTransaction, orgId: string): Promise<Record<string, unknown>> {
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
  
  return {
    org_id: orgId,
    external_id: raw.transaction_id || raw.transaction_number || `dld-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    transaction_date: raw.transaction_date.slice(0, 10),
    geo_type: geoResult.geoType,
    geo_id: geoResult.geoId,
    geo_name: geoResult.geoName,
    segment: segmentResult.segment,
    sale_price: raw.transaction_value,
    area_sqft: areaSqft > 0 ? areaSqft : null,
    currency: 'AED',
    metadata: {
      propertyType: raw.property_type,
      propertySubType: raw.property_sub_type,
      propertyUsage: raw.property_usage,
      rooms: raw.rooms,
      bedrooms,
      buildingName: raw.building_name,
      projectName: raw.project_name,
      areaMeters,
      isOffplan: raw.is_offplan,
      isFreehold: raw.is_freehold,
      transactionType: raw.transaction_type,
      geoConfidence: geoResult.confidence,
      segmentConfidence: segmentResult.confidence,
    },
  }
}

/**
 * Ingest DLD transactions into the database
 */
export async function ingestDldTransactions(options: IngestDldOptions): Promise<DLDIngestionResult> {
  const supabase = getSupabaseAdminClient()
  const started = Date.now()
  const errors: string[] = []
  
  // Default date range: last 7 days
  const today = new Date()
  const defaultFromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const fromDate = options.fromDate ?? defaultFromDate.toISOString().slice(0, 10)
  const toDate = options.toDate ?? today.toISOString().slice(0, 10)
  
  options.onProgress?.(`Starting DLD ingestion for ${fromDate} to ${toDate}`)
  
  let rawTransactions: DLDApiTransaction[] = []
  
  if (options.useMockData) {
    // Use mock data for testing
    options.onProgress?.('Using mock data')
    rawTransactions = generateMockDLDTransactions(options.mockCount ?? 100)
    
    // Filter by date range
    rawTransactions = rawTransactions.filter(t => {
      const date = t.transaction_date.slice(0, 10)
      return date >= fromDate && date <= toDate
    })
  } else {
    // Fetch from DLD API
    options.onProgress?.('Fetching from DLD API...')
    
    const fetchResult = await fetchAllDLDTransactions({
      fromDate,
      toDate,
      areaName: options.areaName,
      onProgress: (fetched, total) => {
        options.onProgress?.(`Fetched ${fetched}/${total} transactions`, fetched, total)
      },
    })
    
    if (fetchResult.error) {
      errors.push(fetchResult.error)
    }
    
    rawTransactions = fetchResult.transactions as unknown as DLDApiTransaction[]
  }
  
  options.onProgress?.(`Fetched ${rawTransactions.length} transactions, transforming...`)
  
  if (rawTransactions.length === 0) {
    return {
      success: errors.length === 0,
      transactionsFetched: 0,
      transactionsIngested: 0,
      transactionsSkipped: 0,
      errors,
      dateRange: { from: fromDate, to: toDate },
      durationMs: Date.now() - started,
    }
  }
  
  // Transform transactions to database format
  const dbRows: Array<Record<string, unknown>> = []
  
  for (const raw of rawTransactions) {
    try {
      const row = await transformToDbRow(raw, options.orgId)
      dbRows.push(row)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Transform error for ${raw.transaction_id}: ${msg}`)
    }
  }
  
  options.onProgress?.(`Transformed ${dbRows.length} transactions, upserting...`)
  
  // Upsert in batches
  const batchSize = 100
  let ingested = 0
  let skipped = 0
  
  for (let i = 0; i < dbRows.length; i += batchSize) {
    const batch = dbRows.slice(i, i + batchSize)
    
    try {
      const { data, error } = await supabase
        .from("raw_dld_transactions")
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
    `[ingestDldTransactions] orgId=${options.orgId} ` +
    `fetched=${rawTransactions.length} ingested=${ingested} skipped=${skipped} ` +
    `errors=${errors.length} duration=${duration}ms`
  )
  
  return {
    success: errors.length === 0,
    transactionsFetched: rawTransactions.length,
    transactionsIngested: ingested,
    transactionsSkipped: skipped,
    errors,
    dateRange: { from: fromDate, to: toDate },
    durationMs: duration,
  }
}

/**
 * Get last ingestion date for an org
 */
export async function getLastDldIngestionDate(orgId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient()
  
  const { data, error } = await supabase
    .from("raw_dld_transactions")
    .select("transaction_date")
    .eq("org_id", orgId)
    .order("transaction_date", { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (error || !data) {
    return null
  }
  
  return data.transaction_date as string
}

/**
 * Get DLD ingestion stats for an org
 */
export async function getDldIngestionStats(orgId: string): Promise<{
  totalTransactions: number
  dateRange: { earliest: string | null; latest: string | null }
  topAreas: Array<{ geoName: string; count: number }>
}> {
  const supabase = getSupabaseAdminClient()
  
  // Get total count
  const { count } = await supabase
    .from("raw_dld_transactions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
  
  // Get date range
  const { data: dateRangeData } = await supabase
    .from("raw_dld_transactions")
    .select("transaction_date")
    .eq("org_id", orgId)
    .order("transaction_date", { ascending: true })
    .limit(1)
  
  const { data: latestData } = await supabase
    .from("raw_dld_transactions")
    .select("transaction_date")
    .eq("org_id", orgId)
    .order("transaction_date", { ascending: false })
    .limit(1)
  
  // Get top areas
  const { data: areaData } = await supabase
    .from("raw_dld_transactions")
    .select("geo_name")
    .eq("org_id", orgId)
  
  const areaCounts = new Map<string, number>()
  for (const row of (areaData ?? []) as Array<{ geo_name: string }>) {
    const name = row.geo_name ?? 'Unknown'
    areaCounts.set(name, (areaCounts.get(name) ?? 0) + 1)
  }
  
  const topAreas = Array.from(areaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([geoName, count]) => ({ geoName, count }))
  
  return {
    totalTransactions: count ?? 0,
    dateRange: {
      earliest: (dateRangeData?.[0] as { transaction_date: string } | undefined)?.transaction_date ?? null,
      latest: (latestData?.[0] as { transaction_date: string } | undefined)?.transaction_date ?? null,
    },
    topAreas,
  }
}
