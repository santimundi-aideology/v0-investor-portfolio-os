/**
 * External Data Context Builder
 * Combines DLD, Ejari, Portal data into AI-ready context
 */

import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"
import type { Property } from "@/lib/types"
import { compressMarketContext, compressPropertyContext } from "../compression/compress-context"
import { getCachedMarketContext, type CompressedMarketContext, type CompressedPropertyContext } from "../cache/context-cache"
import { getNewsForArea } from "./news-fetcher"

// Types
export type ExternalDataContext = {
  // DLD Truth Data
  dld: {
    medianPricePsf: number | null
    medianTransactionPrice: number | null
    transactionVolume: number
    priceChangeQoQ: number | null
    sampleSize: number
    lastQuarter: string | null
  }
  
  // Ejari Rental Truth
  ejari: {
    medianRentAnnual: number | null
    avgLeaseLength: number | null
    renewalRate: number | null
    sampleSize: number
    lastQuarter: string | null
  }
  
  // Derived Metrics
  derived: {
    grossYield: number | null
    priceVsMarket: number | null
    rentVsMarket: number | null
    assessment: "underpriced" | "fair" | "overpriced" | "unknown"
  }
  
  // Portal Data
  portal: {
    activeListings: number
    avgDaysOnMarket: number
    priceCutRate: number
    competingProperties: number
  }
  
  // Market Signals
  signals: Array<{
    type: string
    severity: string
    metric: string
    value: number
    delta: number | null
    summary: string
  }>
  
  // News Context (compressed)
  news: string | null
  
  // Combined summary for AI
  summaryText: string
}

/**
 * Get external data context for a property
 */
export async function getExternalDataForProperty(args: {
  property: Property
  orgId: string
  includeNews?: boolean
}): Promise<ExternalDataContext> {
  const { property, orgId, includeNews = false } = args
  const supabase = getSupabaseAdminClient()
  
  // Parallel fetch all data
  const [dldData, ejariData, portalData, signalsData, newsText] = await Promise.all([
    getDLDData(supabase, orgId, property.area, property.type),
    getEjariData(supabase, orgId, property.area, property.type),
    getPortalData(supabase, orgId, property.area, property.type, property.price),
    getSignalsData(supabase, orgId, property.area),
    includeNews ? getNewsForArea(property.area, orgId) : Promise.resolve(null),
  ])
  
  // Calculate derived metrics
  const derived = calculateDerivedMetrics(property, dldData, ejariData)
  
  // Build summary text
  const summaryText = buildSummaryText({
    property,
    dld: dldData,
    ejari: ejariData,
    derived,
    portal: portalData,
    signals: signalsData,
    news: newsText,
  })
  
  return {
    dld: dldData,
    ejari: ejariData,
    derived,
    portal: portalData,
    signals: signalsData,
    news: newsText,
    summaryText,
  }
}

/**
 * Get compressed property context with external data
 */
export async function getCompressedPropertyWithExternalData(
  property: Property,
  orgId: string
): Promise<CompressedPropertyContext> {
  // Try to get cached market context first
  const cachedMarket = await getCachedMarketContext(orgId, property.area)
  
  let priceVsMarket: number | null = null
  let competingCount = 0
  
  if (cachedMarket) {
    // Calculate price vs market using cached data
    if (cachedMarket.medianPricePsf && property.size) {
      const propertyPsf = property.price / property.size
      priceVsMarket = (propertyPsf - cachedMarket.medianPricePsf) / cachedMarket.medianPricePsf
    }
  } else {
    // Fetch fresh data
    const supabase = getSupabaseAdminClient()
    const [dldData, portalData] = await Promise.all([
      getDLDData(supabase, orgId, property.area, property.type),
      getPortalData(supabase, orgId, property.area, property.type, property.price),
    ])
    
    if (dldData.medianPricePsf && property.size) {
      const propertyPsf = property.price / property.size
      priceVsMarket = (propertyPsf - dldData.medianPricePsf) / dldData.medianPricePsf
    }
    competingCount = portalData.competingProperties
  }
  
  return compressPropertyContext(property, priceVsMarket, competingCount)
}

// ============================================
// Internal Data Fetchers
// ============================================

type SupabaseClient = ReturnType<typeof getSupabaseAdminClient>

async function getDLDData(
  supabase: SupabaseClient,
  orgId: string,
  area: string,
  propertyType: string
): Promise<ExternalDataContext["dld"]> {
  try {
    const { data } = await supabase
      .from("market_metric_snapshot")
      .select("*")
      .eq("org_id", orgId)
      .eq("geo_id", area)
      .order("window_end", { ascending: false })
      .limit(5)
    
    if (!data?.length) {
      return emptyDLDData()
    }
    
    // Find relevant metrics
    const pricePsf = data.find(d => d.metric === "median_price_psf")
    const priceChange = data.find(d => d.metric === "price_change_qoq")
    
    return {
      medianPricePsf: pricePsf?.value ?? null,
      medianTransactionPrice: pricePsf?.value ? pricePsf.value * 1000 : null, // Estimate
      transactionVolume: pricePsf?.sample_size ?? 0,
      priceChangeQoQ: priceChange?.value ?? null,
      sampleSize: pricePsf?.sample_size ?? 0,
      lastQuarter: pricePsf?.window_end ?? null,
    }
  } catch (error) {
    console.warn(`[external-data] Failed to fetch DLD data for ${area}:`, error)
    return emptyDLDData()
  }
}

function emptyDLDData(): ExternalDataContext["dld"] {
  return {
    medianPricePsf: null,
    medianTransactionPrice: null,
    transactionVolume: 0,
    priceChangeQoQ: null,
    sampleSize: 0,
    lastQuarter: null,
  }
}

async function getEjariData(
  supabase: SupabaseClient,
  orgId: string,
  area: string,
  propertyType: string
): Promise<ExternalDataContext["ejari"]> {
  try {
    const { data } = await supabase
      .from("market_metric_snapshot")
      .select("*")
      .eq("org_id", orgId)
      .eq("geo_id", area)
      .eq("metric", "median_rent_annual")
      .order("window_end", { ascending: false })
      .limit(1)
    
    if (!data?.length) {
      return emptyEjariData()
    }
    
    const rent = data[0]
    
    return {
      medianRentAnnual: rent.value ?? null,
      avgLeaseLength: 12, // Default to annual
      renewalRate: null,
      sampleSize: rent.sample_size ?? 0,
      lastQuarter: rent.window_end ?? null,
    }
  } catch (error) {
    console.warn(`[external-data] Failed to fetch Ejari data for ${area}:`, error)
    return emptyEjariData()
  }
}

function emptyEjariData(): ExternalDataContext["ejari"] {
  return {
    medianRentAnnual: null,
    avgLeaseLength: null,
    renewalRate: null,
    sampleSize: 0,
    lastQuarter: null,
  }
}

async function getPortalData(
  supabase: SupabaseClient,
  orgId: string,
  area: string,
  propertyType: string,
  propertyPrice: number
): Promise<ExternalDataContext["portal"]> {
  try {
    const { data } = await supabase
      .from("portal_listing_snapshot")
      .select("*")
      .eq("org_id", orgId)
      .eq("geo_id", area)
      .order("as_of_date", { ascending: false })
      .limit(1)
    
    if (!data?.length) {
      return emptyPortalData()
    }
    
    const portal = data[0]
    
    // Estimate competing properties (same area, ±20% price)
    const priceMin = propertyPrice * 0.8
    const priceMax = propertyPrice * 1.2
    
    const { count } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", orgId)
      .eq("area", area)
      .eq("status", "available")
      .gte("price", priceMin)
      .lte("price", priceMax)
    
    return {
      activeListings: portal.active_listings ?? 0,
      avgDaysOnMarket: portal.avg_days_on_market ?? 0,
      priceCutRate: portal.active_listings > 0
        ? (portal.price_cuts_count ?? 0) / portal.active_listings
        : 0,
      competingProperties: count ?? 0,
    }
  } catch (error) {
    console.warn(`[external-data] Failed to fetch portal data for ${area}:`, error)
    return emptyPortalData()
  }
}

function emptyPortalData(): ExternalDataContext["portal"] {
  return {
    activeListings: 0,
    avgDaysOnMarket: 0,
    priceCutRate: 0,
    competingProperties: 0,
  }
}

async function getSignalsData(
  supabase: SupabaseClient,
  orgId: string,
  area: string
): Promise<ExternalDataContext["signals"]> {
  try {
    const { data } = await supabase
      .from("market_signal")
      .select("*")
      .eq("org_id", orgId)
      .eq("geo_id", area)
      .order("created_at", { ascending: false })
      .limit(5)
    
    if (!data?.length) {
      return []
    }
    
    return data.map(s => ({
      type: s.type,
      severity: s.severity,
      metric: s.metric,
      value: s.current_value,
      delta: s.delta_pct ?? null,
      summary: buildSignalSummary(s),
    }))
  } catch (error) {
    console.warn(`[external-data] Failed to fetch signals for ${area}:`, error)
    return []
  }
}

function buildSignalSummary(signal: Record<string, unknown>): string {
  const type = signal.type as string
  const delta = signal.delta_pct as number | null
  const deltaStr = delta ? `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(0)}%` : ""
  return `${type} ${deltaStr}`.trim()
}

// ============================================
// Derived Metrics
// ============================================

function calculateDerivedMetrics(
  property: Property,
  dld: ExternalDataContext["dld"],
  ejari: ExternalDataContext["ejari"]
): ExternalDataContext["derived"] {
  // Calculate gross yield
  let grossYield: number | null = null
  if (ejari.medianRentAnnual && property.price > 0) {
    grossYield = ejari.medianRentAnnual / property.price
  }
  
  // Calculate price vs market
  let priceVsMarket: number | null = null
  if (dld.medianPricePsf && property.size && property.size > 0) {
    const propertyPsf = property.price / property.size
    priceVsMarket = (propertyPsf - dld.medianPricePsf) / dld.medianPricePsf
  }
  
  // Determine assessment
  let assessment: ExternalDataContext["derived"]["assessment"] = "unknown"
  if (priceVsMarket !== null) {
    if (priceVsMarket < -0.10) assessment = "underpriced"
    else if (priceVsMarket > 0.15) assessment = "overpriced"
    else assessment = "fair"
  }
  
  return {
    grossYield,
    priceVsMarket,
    rentVsMarket: null, // Would need listed rent to calculate
    assessment,
  }
}

// ============================================
// Summary Builder
// ============================================

function buildSummaryText(data: {
  property: Property
  dld: ExternalDataContext["dld"]
  ejari: ExternalDataContext["ejari"]
  derived: ExternalDataContext["derived"]
  portal: ExternalDataContext["portal"]
  signals: ExternalDataContext["signals"]
  news: string | null
}): string {
  const { property, dld, ejari, derived, portal, signals, news } = data
  const sections: string[] = []
  
  // Market data section
  sections.push(`MARKET (${property.area}, ${property.type}):`)
  
  if (dld.medianPricePsf) {
    const trend = dld.priceChangeQoQ
      ? ` (${dld.priceChangeQoQ > 0 ? "+" : ""}${(dld.priceChangeQoQ * 100).toFixed(0)}% QoQ)`
      : ""
    sections.push(`DLD: AED ${Math.round(dld.medianPricePsf)}/psf${trend}, ${dld.sampleSize} txns`)
  } else {
    sections.push("DLD: No recent data")
  }
  
  if (ejari.medianRentAnnual) {
    sections.push(`Ejari: AED ${Math.round(ejari.medianRentAnnual).toLocaleString()}/yr median rent`)
  }
  
  // Derived metrics
  if (derived.priceVsMarket !== null) {
    const pct = Math.round(derived.priceVsMarket * 100)
    sections.push(`vs Market: ${pct >= 0 ? "+" : ""}${pct}% (${derived.assessment})`)
  }
  
  if (derived.grossYield !== null) {
    sections.push(`Yield: ${(derived.grossYield * 100).toFixed(1)}% gross`)
  }
  
  // Competition
  if (portal.activeListings > 0) {
    sections.push(`Competition: ${portal.competingProperties} similar, ${portal.activeListings} total active`)
  }
  
  // Top signal
  if (signals.length > 0) {
    sections.push(`Signal: ${signals[0].summary}`)
  }
  
  // News (truncated)
  if (news) {
    sections.push(`News: ${news.slice(0, 80)}`)
  }
  
  return sections.join("\n")
}
