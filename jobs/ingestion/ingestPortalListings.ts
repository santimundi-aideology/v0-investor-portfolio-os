import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"
import { fetchAllBayutListings, generateMockBayutListings } from "@/lib/ingestion/portals/bayut-client"
import { fetchAllPropertyFinderListings, generateMockPropertyFinderListings } from "@/lib/ingestion/portals/propertyfinder-client"
import { mapAreaToGeo } from "@/lib/ingestion/shared/geo-mapper"
import { mapToSegment } from "@/lib/ingestion/shared/segment-mapper"
import type { PortalIngestionResult, PortalApiListing, PortalListing } from "@/lib/ingestion/portals/types"

/**
 * Portal Listings Ingestion Job
 * -----------------------------
 * Fetches listings from portals (Bayut, PropertyFinder) and ingests them into raw_portal_listings.
 * 
 * Features:
 * - Daily snapshots (same listing tracked across days)
 * - Price cut detection by comparing with previous day
 * - Days on market calculation
 * - Geo and segment normalization
 * 
 * Usage:
 *   await ingestPortalListings({ orgId: 'tenant-1', portals: ['Bayut'] })
 *   await ingestPortalListings({ orgId: 'tenant-1', useMockData: true })
 */

export interface IngestPortalOptions {
  orgId: string
  portals?: ('Bayut' | 'PropertyFinder')[]  // Default: both
  listingType?: 'sale' | 'rent'              // Default: 'sale'
  areas?: string[]                           // Specific areas to fetch
  useMockData?: boolean                      // Use mock data for testing
  mockCountPerPortal?: number                // Number of mock listings per portal
  onProgress?: (message: string, fetched?: number, total?: number) => void
}

interface CombinedIngestionResult {
  success: boolean
  results: PortalIngestionResult[]
  totalFetched: number
  totalIngested: number
  totalSkipped: number
  totalPriceCuts: number
  durationMs: number
}

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
 * Transform a portal listing to database row format
 */
async function transformToDbRow(
  listing: PortalListing,
  orgId: string,
  previousListings: Map<string, { price: number }>
): Promise<Record<string, unknown>> {
  // Check for price cut compared to previous snapshot
  const key = `${listing.portal}|${listing.listingId}`
  const previous = previousListings.get(key)
  
  let hadPriceCut = listing.hadPriceCut
  if (previous && previous.price > listing.price) {
    hadPriceCut = true
  }
  
  return {
    org_id: orgId,
    portal: listing.portal,
    listing_id: listing.listingId,
    as_of_date: listing.asOfDate,
    geo_type: listing.geoType,
    geo_id: listing.geoId,
    geo_name: listing.geoName,
    segment: listing.segment,
    is_active: listing.isActive,
    price: listing.price,
    had_price_cut: hadPriceCut,
    days_on_market: listing.daysOnMarket,
    metadata: {
      propertyType: listing.propertyType,
      listingType: listing.listingType,
      pricePerSqft: listing.pricePerSqft,
      originalPrice: listing.originalPrice,
      priceCutPct: listing.priceCutPct,
      sizeSqft: listing.sizeSqft,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      listedDate: listing.listedDate,
      isVerified: listing.isVerified,
      furnishing: listing.furnishing,
      completionStatus: listing.completionStatus,
      ...(listing.metadata ?? {}),
    },
  }
}

/**
 * Get previous day's listings for price cut detection
 */
async function getPreviousListings(
  orgId: string,
  portal: string
): Promise<Map<string, { price: number }>> {
  const supabase = getSupabaseAdminClient()
  
  // Get yesterday's date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  
  const { data, error } = await supabase
    .from("raw_portal_listings")
    .select("listing_id, price")
    .eq("org_id", orgId)
    .eq("portal", portal)
    .eq("as_of_date", yesterdayStr)
  
  if (error || !data) {
    return new Map()
  }
  
  const map = new Map<string, { price: number }>()
  for (const row of data as Array<{ listing_id: string; price: number }>) {
    map.set(`${portal}|${row.listing_id}`, { price: row.price })
  }
  
  return map
}

/**
 * Ingest listings from a single portal
 */
async function ingestSinglePortal(
  portal: 'Bayut' | 'PropertyFinder',
  options: IngestPortalOptions
): Promise<PortalIngestionResult> {
  const supabase = getSupabaseAdminClient()
  const started = Date.now()
  const errors: string[] = []
  const asOfDate = new Date().toISOString().slice(0, 10)
  
  options.onProgress?.(`Starting ${portal} ingestion`)
  
  let listings: PortalListing[] = []
  
  if (options.useMockData) {
    // Use mock data
    options.onProgress?.(`Using mock data for ${portal}`)
    const mockCount = options.mockCountPerPortal ?? 100
    
    const mockRaw = portal === 'Bayut'
      ? generateMockBayutListings(mockCount)
      : generateMockPropertyFinderListings(mockCount)
    
    // Transform mock data to PortalListing format
    for (const raw of mockRaw) {
      const geoResult = await mapAreaToGeo(raw.location?.area || 'Unknown')
      const segmentResult = mapToSegment({
        propertyType: raw.property_type,
        bedrooms: raw.bedrooms,
      })
      
      listings.push({
        portal,
        listingId: raw.listing_id,
        asOfDate,
        geoType: geoResult.geoType as 'community' | 'district' | 'city',
        geoId: geoResult.geoId,
        geoName: geoResult.geoName,
        segment: segmentResult.segment,
        propertyType: raw.property_type,
        listingType: raw.listing_type,
        price: raw.price,
        pricePerSqft: raw.price_per_sqft,
        originalPrice: raw.original_price,
        hadPriceCut: !!raw.original_price && raw.price < raw.original_price,
        sizeSqft: raw.size_sqft,
        bedrooms: raw.bedrooms,
        bathrooms: raw.bathrooms,
        isActive: raw.is_active ?? true,
        daysOnMarket: raw.days_on_market ?? calculateDaysOnMarket(raw.listed_date),
        listedDate: raw.listed_date,
        isVerified: raw.is_verified ?? false,
        furnishing: raw.furnishing,
        completionStatus: raw.completion_status,
      })
    }
  } else {
    // Fetch from portal API
    options.onProgress?.(`Fetching from ${portal} API...`)
    
    const fetchResult = portal === 'Bayut'
      ? await fetchAllBayutListings({
          areas: options.areas,
          listingType: options.listingType ?? 'sale',
          onProgress: (fetched, total) => {
            options.onProgress?.(`[${portal}] Fetched ${fetched}/${total}`, fetched, total)
          },
        })
      : await fetchAllPropertyFinderListings({
          areas: options.areas,
          listingType: options.listingType ?? 'sale',
          onProgress: (fetched, total) => {
            options.onProgress?.(`[${portal}] Fetched ${fetched}/${total}`, fetched, total)
          },
        })
    
    if (fetchResult.error) {
      errors.push(fetchResult.error)
    }
    
    listings = fetchResult.listings
  }
  
  options.onProgress?.(`[${portal}] Fetched ${listings.length} listings, processing...`)
  
  if (listings.length === 0) {
    return {
      success: errors.length === 0,
      listingsFetched: 0,
      listingsIngested: 0,
      listingsSkipped: 0,
      priceCutsDetected: 0,
      errors,
      portal,
      asOfDate,
      durationMs: Date.now() - started,
    }
  }
  
  // Get previous listings for price cut detection
  const previousListings = await getPreviousListings(options.orgId, portal)
  options.onProgress?.(`[${portal}] Loaded ${previousListings.size} previous listings for comparison`)
  
  // Transform to database rows
  const dbRows: Array<Record<string, unknown>> = []
  let priceCutsDetected = 0
  
  for (const listing of listings) {
    try {
      const row = await transformToDbRow(listing, options.orgId, previousListings)
      dbRows.push(row)
      
      if (row.had_price_cut) {
        priceCutsDetected++
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Transform error for ${listing.listingId}: ${msg}`)
    }
  }
  
  options.onProgress?.(`[${portal}] Transformed ${dbRows.length} listings, upserting...`)
  
  // Upsert in batches
  const batchSize = 100
  let ingested = 0
  let skipped = 0
  
  for (let i = 0; i < dbRows.length; i += batchSize) {
    const batch = dbRows.slice(i, i + batchSize)
    
    try {
      const { data, error } = await supabase
        .from("raw_portal_listings")
        .upsert(batch, {
          onConflict: "org_id,portal,listing_id,as_of_date",
        })
        .select("id")
      
      if (error) {
        errors.push(`[${portal}] Upsert error (batch ${Math.floor(i / batchSize) + 1}): ${error.message}`)
        skipped += batch.length
      } else {
        ingested += data?.length ?? 0
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`[${portal}] Batch error: ${msg}`)
      skipped += batch.length
    }
    
    options.onProgress?.(`[${portal}] Upserted ${Math.min(i + batchSize, dbRows.length)}/${dbRows.length}`)
  }
  
  const duration = Date.now() - started
  
  console.log(
    `[ingestPortalListings] portal=${portal} orgId=${options.orgId} ` +
    `fetched=${listings.length} ingested=${ingested} skipped=${skipped} ` +
    `priceCuts=${priceCutsDetected} errors=${errors.length} duration=${duration}ms`
  )
  
  return {
    success: errors.length === 0,
    listingsFetched: listings.length,
    listingsIngested: ingested,
    listingsSkipped: skipped,
    priceCutsDetected,
    errors,
    portal,
    asOfDate,
    durationMs: duration,
  }
}

/**
 * Ingest listings from all specified portals
 */
export async function ingestPortalListings(options: IngestPortalOptions): Promise<CombinedIngestionResult> {
  const started = Date.now()
  const portals = options.portals ?? ['Bayut', 'PropertyFinder']
  
  options.onProgress?.(`Starting portal ingestion for ${portals.join(', ')}`)
  
  const results: PortalIngestionResult[] = []
  
  for (const portal of portals) {
    const result = await ingestSinglePortal(portal, options)
    results.push(result)
  }
  
  const totalFetched = results.reduce((sum, r) => sum + r.listingsFetched, 0)
  const totalIngested = results.reduce((sum, r) => sum + r.listingsIngested, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.listingsSkipped, 0)
  const totalPriceCuts = results.reduce((sum, r) => sum + r.priceCutsDetected, 0)
  const allSuccess = results.every(r => r.success)
  
  const duration = Date.now() - started
  
  console.log(
    `[ingestPortalListings] Combined: portals=${portals.length} ` +
    `fetched=${totalFetched} ingested=${totalIngested} skipped=${totalSkipped} ` +
    `priceCuts=${totalPriceCuts} duration=${duration}ms`
  )
  
  return {
    success: allSuccess,
    results,
    totalFetched,
    totalIngested,
    totalSkipped,
    totalPriceCuts,
    durationMs: duration,
  }
}

/**
 * Get portal ingestion stats
 */
export async function getPortalIngestionStats(orgId: string): Promise<{
  totalListings: number
  byPortal: Record<string, number>
  byDate: Array<{ date: string; count: number }>
  priceCutRate: number
  avgDaysOnMarket: number
  staleListingsCount: number
}> {
  const supabase = getSupabaseAdminClient()
  
  // Get total count
  const { count: totalCount } = await supabase
    .from("raw_portal_listings")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
  
  // Get by portal
  const { data: portalData } = await supabase
    .from("raw_portal_listings")
    .select("portal")
    .eq("org_id", orgId)
  
  const byPortal: Record<string, number> = {}
  for (const row of (portalData ?? []) as Array<{ portal: string }>) {
    byPortal[row.portal] = (byPortal[row.portal] ?? 0) + 1
  }
  
  // Get by date (last 7 days)
  const { data: dateData } = await supabase
    .from("raw_portal_listings")
    .select("as_of_date")
    .eq("org_id", orgId)
    .gte("as_of_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  
  const dateCounts = new Map<string, number>()
  for (const row of (dateData ?? []) as Array<{ as_of_date: string }>) {
    dateCounts.set(row.as_of_date, (dateCounts.get(row.as_of_date) ?? 0) + 1)
  }
  
  const byDate = Array.from(dateCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  // Get price cut stats
  const { data: statsData } = await supabase
    .from("raw_portal_listings")
    .select("had_price_cut, days_on_market")
    .eq("org_id", orgId)
    .eq("is_active", true)
  
  const stats = statsData as Array<{ had_price_cut: boolean; days_on_market: number }> | null
  const priceCuts = stats?.filter(s => s.had_price_cut).length ?? 0
  const priceCutRate = stats?.length ? priceCuts / stats.length : 0
  
  const daysOnMarketSum = stats?.reduce((sum, s) => sum + (s.days_on_market ?? 0), 0) ?? 0
  const avgDaysOnMarket = stats?.length ? daysOnMarketSum / stats.length : 0
  
  const staleThreshold = 60 // 60+ days = stale
  const staleListingsCount = stats?.filter(s => (s.days_on_market ?? 0) >= staleThreshold).length ?? 0
  
  return {
    totalListings: totalCount ?? 0,
    byPortal,
    byDate,
    priceCutRate,
    avgDaysOnMarket: Math.round(avgDaysOnMarket),
    staleListingsCount,
  }
}
