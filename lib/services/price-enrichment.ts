import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"
import { mapAreaToGeo } from "@/lib/ingestion/shared/geo-mapper"
import { mapToSegment } from "@/lib/ingestion/shared/segment-mapper"
import type { Property, PriceContrast } from "@/lib/types"

/**
 * PRICE ENRICHMENT SERVICE
 * ------------------------
 * Enriches property data with price contrast information from DLD market data.
 * 
 * Features:
 * - Compares asking price to DLD median prices
 * - Estimates rental yield from Ejari data
 * - Provides price assessment (underpriced/fair/overpriced)
 * - Caches results to avoid repeated DB queries
 */

// Thresholds for price assessment
const PRICE_THRESHOLDS = {
  underpriced: -0.10,  // 10% or more below market
  overpriced: 0.15,    // 15% or more above market
}

interface MarketMetricRow {
  geo_id: string
  geo_name: string
  segment: string
  metric: string
  value: number
  sample_size: number | null
  window_end: string
}

// In-memory cache for market metrics
const marketMetricCache = new Map<string, {
  data: Map<string, MarketMetricRow[]>
  timestamp: number
}>()

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get market metrics for an org (with caching)
 */
async function getMarketMetrics(orgId: string): Promise<Map<string, MarketMetricRow[]>> {
  const cached = marketMetricCache.get(orgId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }
  
  const supabase = getSupabaseAdminClient()
  
  // Get latest metrics per geo/segment/metric
  const { data, error } = await supabase
    .from("market_metric_snapshot")
    .select("geo_id, geo_name, segment, metric, value, sample_size, window_end")
    .eq("org_id", orgId)
    .order("window_end", { ascending: false })
  
  if (error) {
    console.error("[price-enrichment] Error fetching market metrics:", error)
    return new Map()
  }
  
  // Group by geo_id + segment
  const metricsMap = new Map<string, MarketMetricRow[]>()
  
  for (const row of (data ?? []) as MarketMetricRow[]) {
    const key = `${row.geo_id}|${row.segment}`
    const existing = metricsMap.get(key) ?? []
    
    // Only keep the latest of each metric type
    const hasMetric = existing.some(m => m.metric === row.metric)
    if (!hasMetric) {
      existing.push(row)
      metricsMap.set(key, existing)
    }
  }
  
  marketMetricCache.set(orgId, {
    data: metricsMap,
    timestamp: Date.now(),
  })
  
  return metricsMap
}

/**
 * Calculate price assessment based on difference from market
 */
function calculateAssessment(priceVsTruthPct: number): {
  assessment: 'underpriced' | 'fair' | 'overpriced'
  label: string
} {
  const pctStr = Math.abs(priceVsTruthPct * 100).toFixed(0)
  
  if (priceVsTruthPct <= PRICE_THRESHOLDS.underpriced) {
    return {
      assessment: 'underpriced',
      label: `${pctStr}% below market`,
    }
  }
  
  if (priceVsTruthPct >= PRICE_THRESHOLDS.overpriced) {
    return {
      assessment: 'overpriced',
      label: `${pctStr}% above market`,
    }
  }
  
  if (priceVsTruthPct > 0) {
    return {
      assessment: 'fair',
      label: `${pctStr}% above market`,
    }
  } else if (priceVsTruthPct < 0) {
    return {
      assessment: 'fair',
      label: `${pctStr}% below market`,
    }
  }
  
  return {
    assessment: 'fair',
    label: 'At market price',
  }
}

/**
 * Calculate confidence level based on sample size
 */
function calculateConfidence(sampleSize: number | null): {
  confidence: 'high' | 'medium' | 'low'
  reason: string
} {
  if (!sampleSize || sampleSize < 10) {
    return {
      confidence: 'low',
      reason: sampleSize ? `Only ${sampleSize} transactions` : 'No transaction data',
    }
  }
  
  if (sampleSize < 30) {
    return {
      confidence: 'medium',
      reason: `Based on ${sampleSize} transactions`,
    }
  }
  
  return {
    confidence: 'high',
    reason: `Based on ${sampleSize} transactions`,
  }
}

/**
 * Format quarter from date
 */
function formatQuarter(dateStr: string): string {
  const date = new Date(dateStr)
  const quarter = Math.floor(date.getMonth() / 3) + 1
  const year = date.getFullYear()
  return `Q${quarter} ${year}`
}

/**
 * Enrich a single property with price contrast data
 */
export async function enrichPropertyWithPriceContrast(
  property: Property,
  orgId: string
): Promise<Property> {
  try {
    // Map property area to geo_id
    const geoResult = await mapAreaToGeo(property.area)
    
    // Map to segment
    const segmentResult = mapToSegment({
      propertyType: property.type,
      bedrooms: property.bedrooms,
    })
    
    // Get market metrics
    const metricsMap = await getMarketMetrics(orgId)
    const key = `${geoResult.geoId}|${segmentResult.segment}`
    const metrics = metricsMap.get(key)
    
    if (!metrics || metrics.length === 0) {
      // No market data available
      return {
        ...property,
        priceContrast: {
          confidence: 'low',
          confidenceReason: `No DLD data for ${geoResult.geoName} ${segmentResult.segment}`,
        },
      }
    }
    
    // Extract metrics
    const medianPricePsf = metrics.find(m => m.metric === 'median_price_psf')
    const medianRentAnnual = metrics.find(m => m.metric === 'median_rent_annual')
    const grossYield = metrics.find(m => m.metric === 'gross_yield')
    
    // Calculate price contrast
    let priceContrast: PriceContrast = {}
    
    if (medianPricePsf) {
      // Calculate asking price per sqft
      const askingPricePerSqft = property.size > 0 
        ? property.price / property.size 
        : null
      
      // Estimate median price (assume avg size for the segment)
      const estimatedMedianPrice = medianPricePsf.value * property.size
      
      priceContrast = {
        dldMedianPricePerSqft: medianPricePsf.value,
        dldMedianPrice: estimatedMedianPrice,
        dldSampleSize: medianPricePsf.sample_size ?? undefined,
        dldQuarter: formatQuarter(medianPricePsf.window_end),
        dldDataDate: medianPricePsf.window_end,
      }
      
      // Calculate price vs truth percentage
      if (askingPricePerSqft && medianPricePsf.value > 0) {
        const priceVsTruthPct = (askingPricePerSqft - medianPricePsf.value) / medianPricePsf.value
        priceContrast.pricePerSqftVsTruthPct = priceVsTruthPct
        priceContrast.priceVsTruthPct = priceVsTruthPct
        
        const { assessment, label } = calculateAssessment(priceVsTruthPct)
        priceContrast.assessment = assessment
        priceContrast.assessmentLabel = label
      }
      
      const { confidence, reason } = calculateConfidence(medianPricePsf.sample_size)
      priceContrast.confidence = confidence
      priceContrast.confidenceReason = reason
    }
    
    // Add rental yield estimate
    if (medianRentAnnual && property.price > 0) {
      priceContrast.estimatedRentAnnual = medianRentAnnual.value
      priceContrast.estimatedGrossYield = medianRentAnnual.value / property.price
    } else if (grossYield) {
      priceContrast.estimatedGrossYield = grossYield.value
      priceContrast.estimatedRentAnnual = property.price * grossYield.value
    }
    
    return {
      ...property,
      priceContrast,
    }
  } catch (error) {
    console.error("[price-enrichment] Error enriching property:", error)
    return property
  }
}

/**
 * Enrich multiple properties with price contrast data (batch)
 */
export async function enrichPropertiesWithPriceContrast(
  properties: Property[],
  orgId: string
): Promise<Property[]> {
  if (properties.length === 0) {
    return properties
  }
  
  // Pre-load market metrics (will be cached)
  await getMarketMetrics(orgId)
  
  // Enrich all properties in parallel
  const enrichedProperties = await Promise.all(
    properties.map(property => enrichPropertyWithPriceContrast(property, orgId))
  )
  
  return enrichedProperties
}

/**
 * Get price contrast summary for an area
 */
export async function getAreaPriceContrast(
  orgId: string,
  geoId: string,
  segment?: string
): Promise<{
  geoName: string
  segment: string
  medianPrice: number | null
  medianPricePerSqft: number | null
  sampleSize: number | null
  quarter: string | null
  medianRentAnnual: number | null
  grossYield: number | null
} | null> {
  const metricsMap = await getMarketMetrics(orgId)
  
  // If segment not provided, try common segments
  const segments = segment 
    ? [segment] 
    : ['2BR', '1BR', '3BR', 'Apartment', 'Villa']
  
  for (const seg of segments) {
    const key = `${geoId}|${seg}`
    const metrics = metricsMap.get(key)
    
    if (metrics && metrics.length > 0) {
      const medianPricePsf = metrics.find(m => m.metric === 'median_price_psf')
      const medianRentAnnual = metrics.find(m => m.metric === 'median_rent_annual')
      const grossYield = metrics.find(m => m.metric === 'gross_yield')
      
      return {
        geoName: medianPricePsf?.geo_name ?? geoId,
        segment: seg,
        medianPrice: medianPricePsf ? medianPricePsf.value * 1000 : null, // Estimate based on avg size
        medianPricePerSqft: medianPricePsf?.value ?? null,
        sampleSize: medianPricePsf?.sample_size ?? null,
        quarter: medianPricePsf ? formatQuarter(medianPricePsf.window_end) : null,
        medianRentAnnual: medianRentAnnual?.value ?? null,
        grossYield: grossYield?.value ?? null,
      }
    }
  }
  
  return null
}

/**
 * Clear the market metrics cache
 */
export function clearPriceEnrichmentCache(): void {
  marketMetricCache.clear()
}
