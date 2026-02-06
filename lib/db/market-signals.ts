import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

import type { MarketSignalItem } from "@/lib/mock-market-signals"

type MarketSignalDbRow = {
  id: string
  org_id: string
  created_at: string
  source_type: "official" | "portal"
  source: string
  timeframe: "QoQ" | "WoW" | string
  type: string
  severity: "info" | "watch" | "urgent" | string
  status: "new" | "acknowledged" | "dismissed" | "routed" | string
  geo_type: string
  geo_id: string
  geo_name?: string | null
  segment: string
  metric: string
  current_value: number
  prev_value?: number | null
  delta_value?: number | null
  delta_pct?: number | null
  confidence_score?: number | null
  evidence?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

function metricLabel(metric: string) {
  switch (metric) {
    case "median_price_psf":
      return "Median price (psf)"
    case "median_rent_annual":
      return "Median rent (annual)"
    case "gross_yield":
      return "Gross yield (median)"
    case "active_listings":
      return "Active listings"
    case "price_cuts_count":
      return "Price cuts"
    case "stale_listings_count":
      return "Stale listings"
    default:
      return metric
  }
}

function formatValue(metric: string, value: number) {
  if (!Number.isFinite(value)) return String(value)
  if (metric === "gross_yield") return `${(value * 100).toFixed(1)}%`
  if (metric === "median_price_psf") return `AED ${Math.round(value).toLocaleString()}/psf`
  if (metric === "median_rent_annual") return `AED ${Math.round(value).toLocaleString()}/yr`
  if (metric === "active_listings" || metric === "price_cuts_count" || metric === "stale_listings_count") {
    return `${Math.round(value).toLocaleString()}`
  }
  return String(value)
}

function asTimeframe(t: string): "QoQ" | "WoW" {
  return t === "WoW" ? "WoW" : "QoQ"
}

export async function listMarketSignalsFeed(args: { tenantId: string; limit?: number }): Promise<MarketSignalItem[]> {
  const supabase = getSupabaseAdminClient()
  const limit = args.limit ?? 50

  const { data, error } = await supabase
    .from("market_signal")
    .select(
      "id, org_id, created_at, source_type, source, timeframe, type, severity, status, geo_type, geo_id, geo_name, segment, metric, current_value, prev_value, delta_value, delta_pct, confidence_score, evidence, metadata"
    )
    .eq("org_id", args.tenantId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  const signals = ((data ?? []) as MarketSignalDbRow[]).filter((r) => r && r.id)

  if (signals.length === 0) return []

  // Investor match count (targets) per signal
  const ids = signals.map((s) => s.id)
  const { data: targets, error: targetsErr } = await supabase
    .from("market_signal_target")
    .select("signal_id")
    .eq("org_id", args.tenantId)
    .in("signal_id", ids)

  if (targetsErr) throw targetsErr

  const counts = new Map<string, number>()
  for (const t of (targets ?? []) as Array<{ signal_id: string }>) {
    counts.set(t.signal_id, (counts.get(t.signal_id) ?? 0) + 1)
  }

  // Fetch portal listing titles for pricing_opportunity signals
  const pricingOpportunitySignals = signals.filter((s) => s.type === "pricing_opportunity")
  const listingTitles = new Map<string, string>()
  
  if (pricingOpportunitySignals.length > 0) {
    const listingIds: string[] = []
    const portals: string[] = []
    
    for (const s of pricingOpportunitySignals) {
      const evidence = (s.evidence as Record<string, unknown>) || {}
      const listingId = evidence.listing_id as string
      const portal = (evidence.portal as string) || "bayut"
      if (listingId) {
        listingIds.push(listingId)
        portals.push(portal)
      }
    }
    
    if (listingIds.length > 0) {
      // Fetch portal listings to get titles
      const uniquePortals = [...new Set(portals)]
      for (const portal of uniquePortals) {
        const portalListingIds = listingIds.filter((_, i) => portals[i] === portal)
        const { data: listings } = await supabase
          .from("portal_listings")
          .select("listing_id, building_name, project_name, bedrooms, area_name")
          .eq("portal", portal)
          .in("listing_id", portalListingIds)
        
        if (listings) {
          for (const listing of listings) {
            // Construct title from available fields
            const parts: string[] = []
            if (listing.project_name) parts.push(listing.project_name)
            if (listing.building_name && listing.building_name !== listing.project_name) parts.push(listing.building_name)
            if (listing.bedrooms) parts.push(`${listing.bedrooms}BR`)
            if (listing.area_name) parts.push(listing.area_name)
            
            const title = parts.length > 0 ? parts.join(" • ") : listing.area_name || "Property"
            listingTitles.set(listing.listing_id, title)
          }
        }
      }
    }
  }

  return signals.map((s) => {
    // Get property title for pricing_opportunity signals
    let propertyTitle: string | null = null
    if (s.type === "pricing_opportunity" && s.evidence) {
      const evidence = s.evidence as Record<string, unknown>
      const listingId = evidence.listing_id as string
      if (listingId) {
        propertyTitle = listingTitles.get(listingId) || null
      }
    }
    
    return {
      id: s.id,
      createdAt: s.created_at,
      sourceType: s.source_type,
      source: s.source,
      timeframe: asTimeframe(s.timeframe),
      type: s.type as MarketSignalItem["type"],
      severity: s.severity as MarketSignalItem["severity"],
      status: s.status as MarketSignalItem["status"],
      geoType: s.geo_type as MarketSignalItem["geoType"],
      geoId: s.geo_id,
      geoName: s.geo_name ?? s.geo_id,
      segment: s.segment,
      metric: s.metric as MarketSignalItem["metric"],
      metricLabel: metricLabel(s.metric),
      currentValue: s.current_value,
      currentValueLabel: formatValue(s.metric, s.current_value),
      prevValue: s.prev_value ?? null,
      prevValueLabel: typeof s.prev_value === "number" ? formatValue(s.metric, s.prev_value) : null,
      deltaValue: s.delta_value ?? null,
      deltaPct: s.delta_pct ?? null,
      confidenceScore: typeof s.confidence_score === "number" ? s.confidence_score : 0.6,
      investorMatches: counts.get(s.id) ?? 0,
      propertyTitle,
      metadata: s.metadata || undefined,
    }
  })
}

export async function updateMarketSignalStatus(args: {
  tenantId: string
  signalId: string
  status: "acknowledged" | "dismissed" | "new"
  actorUserId?: string | null
}) {
  const supabase = getSupabaseAdminClient()
  const now = new Date().toISOString()

  const patch: Record<string, unknown> = { status: args.status, updated_at: now }
  if (args.status === "acknowledged") {
    patch.acknowledged_at = now
    patch.acknowledged_by = args.actorUserId ?? null
  }
  if (args.status === "dismissed") {
    patch.dismissed_at = now
    patch.dismissed_by = args.actorUserId ?? null
  }

  const { data, error } = await supabase
    .from("market_signal")
    .update(patch)
    .eq("org_id", args.tenantId)
    .eq("id", args.signalId)
    .select("id")
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}


