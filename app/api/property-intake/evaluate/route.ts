import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { propertyEvaluationSchema } from "@/lib/validation/schemas"
import { validateRequest } from "@/lib/validation/helpers"
import { requireAuthContext } from "@/lib/auth/server"
import { canRunAIEvaluation } from "@/lib/plans/usage"
import type { PlanTier } from "@/lib/plans/config"

/**
 * Evaluate property viability and generate IC memo content
 * POST /api/property-intake/evaluate
 */

interface PropertyData {
  source: string
  listingId: string | null
  title: string
  price: number
  pricePerSqft: number | null
  size: number | null
  bedrooms: number
  bathrooms: number
  propertyType: string
  area: string
  subArea: string | null
  address?: string | null
  furnished: boolean
  parking: number | null
  amenities: string[]
  description: string | null
  listingUrl: string
  listedDate: string | null
  coordinates?: { lat: number; lng: number } | null
  // Extended properties
  completionStatus?: "ready" | "off_plan" | "under_construction" | "unknown"
  developer?: string | null
  handoverDate?: string | null
  serviceCharge?: number | null
  rentalPotential?: number | null
  referenceNumber?: string | null
  permitNumber?: string | null
  purpose?: "for-sale" | "for-rent" | null
  buildingName?: string | null
  buildingFloors?: number | null
  totalParkingSpaces?: number | null
  elevators?: number | null
  plotSize?: number | null
  paymentPlan?: {
    downPaymentPercent?: number | null
    preHandoverPercent?: number | null
    handoverPercent?: number | null
    postHandoverPercent?: number | null
  } | null
  verified?: boolean
}

interface MarketContext {
  areaMedianPrice: number
  areaMedianPricePerSqft: number
  areaAverageYield: number
  priceVsMarket: number // percentage: -10 = 10% below, +15 = 15% above
  marketTrend: "rising" | "stable" | "declining"
  demandLevel: "high" | "medium" | "low"
  supplyLevel: "high" | "medium" | "low"
  averageDaysOnMarket: number
  // Extended market data
  areaGrade: "A" | "B" | "C" | "D"
  liquidityScore: number // 1-10
  tenantDemand: "high" | "medium" | "low"
  priceVolatility: "high" | "medium" | "low"
  newSupplyUnits: number // upcoming supply
  occupancyRate: number // percentage
  historicalAppreciation: number // yearly %
  rentalGrowth: number // yearly %
  investorProfile: "core" | "core_plus" | "value_add" | "opportunistic"
}

interface EvaluationResult {
  overallScore: number
  factors: {
    mandateFit: number
    marketTiming: number
    portfolioFit: number
    riskAlignment: number
  }
  headline: string
  reasoning: string
  keyStrengths: string[]
  considerations: string[]
  recommendation: "strong_buy" | "buy" | "hold" | "pass"
  
  // Rich IC Memo format matching existing memo structure
  analysis: {
    summary: string
    keyPoints: string[]
    
    neighborhood: {
      name: string
      grade: string
      profile: string
      highlights: string[]
      metrics: { label: string; value: string; trend?: string }[]
    }
    
    property: {
      description: string
      condition: string
      specs: { label: string; value: string }[]
      highlights: string[]
    }
    
    market: {
      overview: string
      drivers: string[]
      supply: string
      demand: string
      absorption: string
    }
    growth?: {
      narrative: string
      neighborhoodTrend: string
      annualGrowthBase: number
      annualGrowthConservative: number
      annualGrowthUpside: number
      projectedValue1Y: number
      projectedValue3Y: number
      projectedValue5Y: number
      drivers: string[]
      sensitivities: string[]
    }
    
    pricing: {
      askingPrice: number
      pricePerSqft: number | null
      marketAvgPricePerSqft: number | null
      recommendedOffer: number
      stabilizedValue: number
      valueAddBudget: number
      rentCurrent: number
      rentPotential: number
      irr: number
      equityMultiple: number
    }
    
    comparables: {
      name: string
      distance: string
      size: string
      closingDate: string
      price: number
      pricePerSqft: number
      provenanceLabel?: string
      note?: string
    }[]
    
    strategy: {
      plan: string
      holdPeriod: string
      exit: string
      focusPoints: string[]
    }
    
    investmentThesis: string

    developerProfile?: {
      name: string
      tier: "tier_1" | "tier_2" | "tier_3" | "unknown"
      overview: string
      trackRecord: string
      notableProjects: string[]
      strengths: string[]
      concerns: string[]
      escrowStatus: string
      riskAssessment: string
    }

    investmentDecision?: {
      verdict: "PROCEED" | "CONDITIONAL" | "PASS"
      confidenceLevel: "high" | "medium" | "low"
      rationale: string
      keyDrivers: string[]
      conditionsToMeet: string[]
      dealBreakers: string[]
      suggestedNextSteps: string[]
      exitStrategy: string
      timelineGuidance: string
    }
    
    financialAnalysis: {
      noi: number
      capRate: number
      targetIrr: number
      holdPeriod: string
      returnBridge?: {
        purchasePrice: number
        dldRatePct: number
        dldFee: number
        brokerFeePct: number
        brokerFee: number
        renovation: number
        totalProjectCost: number
        mortgageLtvPct: number
        mortgageAmount: number
        equityInvested: number
        annualInterestRatePct: number
        annualInterest: number
        resalePrice: number
        netSaleProceedsAfterMortgage: number
        netProfitAfterInterest: number
        roiOnEquityPct: number
        assumptions: string
      }
    }
    
    risks: { risk: string; mitigation: string }[]
    
    finalRecommendation: {
      decision: "PROCEED" | "CONDITIONAL" | "PASS"
      condition?: string
    }

    /* ---- New narrative-rich fields ---- */
    locationNarrative?: {
      areaOverview: string
      growthCatalyst: string
      amenities: { category: string; items: { name: string; status: string }[] }[]
      missingAmenities: string[]
      connectivity: { destination: string; distance: string; driveTime: string }[]
    }

    enhancedDeveloperProfile?: {
      name: string
      legalName: string
      tier: "tier_1" | "tier_2" | "tier_3" | "unverified"
      tierLabel: string
      founded?: string
      listingStatus: "public" | "private" | "unknown"
      exchange?: string
      marketCap?: string
      unitsDelivered?: string
      notableProjects: string[]
      deliveryTrackRecord: "on_time" | "mixed" | "delayed" | "unknown"
      buildQuality: "premium" | "good" | "average" | "poor" | "unknown"
      overview: string
      riskAssessment: string
      concerns: string[]
      escrowStatus: string
    }

    riskMatrix?: {
      name: string
      category: string
      likelihood: number
      impact: number
      score: number
      scoreBand: string
      mitigation: string
    }[]

    stressTests?: {
      label: string
      description: string
      impact: string
      quantifiedEffect: string
    }[]

    neighborhoodBenchmarks?: {
      community: string
      priceRange: string
      maturity: string
      hasMetro: boolean
      character: string
      isSubject?: boolean
    }[]

    dataGaps?: {
      field: string
      status: string
      detail?: string
    }[]

    plainEnglishThesis?: string
    executionSteps?: string[]

    scoringMethodology?: {
      dimensions: { name: string; weight: string; description: string }[]
      bands: { range: string; label: string; action: string }[]
      keyFactorsUp: string[]
      keyFactorsDown: string[]
    }
  }
}

// Comprehensive market data for Dubai areas
// In production, this would query DLD database for real-time data
interface AreaMarketData {
  median: number          // AED per sqft
  yield: number           // Gross yield %
  trend: "rising" | "stable" | "declining"
  grade: "A" | "B" | "C" | "D"
  liquidity: number       // 1-10
  tenantDemand: "high" | "medium" | "low"
  volatility: "high" | "medium" | "low"
  newSupply: number       // units coming
  occupancy: number       // %
  appreciation: number    // yearly %
  rentalGrowth: number    // yearly %
  daysOnMarket: number
  profile: "core" | "core_plus" | "value_add" | "opportunistic"
}

// Generic fallback market data when DLD database query returns insufficient data.
// This does NOT represent any specific area -- it signals that real data is unavailable.
const DEFAULT_MARKET_DATA: AreaMarketData = {
  median: 1200, yield: 6.0, trend: "stable", grade: "C",
  liquidity: 5, tenantDemand: "medium", volatility: "medium",
  newSupply: 1000, occupancy: 85, appreciation: 3.0, rentalGrowth: 3.0,
  daysOnMarket: 50, profile: "value_add"
}

/**
 * Get market context for an area by querying real DLD transaction data.
 * Falls back to generic defaults when DB data is unavailable.
 */
async function getMarketContext(area: string, propertyType: string, bedrooms: number): Promise<MarketContext> {
  // Try querying real DLD data from the database first
  try {
    const supabase = getSupabaseAdminClient()

    // Map property types to DLD terminology
    const dldPropertyType = propertyType?.toLowerCase().includes("villa") ? "Villa"
      : propertyType?.toLowerCase().includes("townhouse") ? "Villa"
      : propertyType?.toLowerCase().includes("land") ? "Land"
      : "Unit"

    // Resolve Bayut community name to DLD area name
    // (Bayut uses "Majan", "Dubai Marina"; DLD uses "Wadi Al Safa 3", "Marsa Dubai")
    let resolvedArea = area
    const { data: directCheck } = await supabase
      .from("dld_area_stats")
      .select("area_name_en")
      .eq("area_name_en", area)
      .limit(1)

    if (!directCheck || directCheck.length === 0) {
      try {
        const { data: resolved } = await supabase.rpc("resolve_area_name", {
          p_community_name: area,
        }).maybeSingle()
        if (resolved?.dld_area_name) {
          console.log(`[evaluate] Resolved area "${area}" → "${resolved.dld_area_name}"`)
          resolvedArea = resolved.dld_area_name
        }
      } catch {
        // Ignore resolution failure, will use original name
      }
    }

    // Query the pre-computed area stats view
    const { data: stats } = await supabase
      .from("dld_area_stats")
      .select("*")
      .eq("area_name_en", resolvedArea)
      .eq("property_type_en", dldPropertyType)
      .maybeSingle()

    if (stats && Number(stats.transaction_count) > 5) {
      const avgPricePerSqm = Number(stats.avg_price_per_sqm)
      const avgPricePerSqft = avgPricePerSqm > 0 ? Math.round(avgPricePerSqm * 0.092903) : 0
      const avgPrice = Number(stats.avg_price)

      // Query monthly trends to determine market direction
      let marketTrend: MarketContext["marketTrend"] = "stable"
      let rentalGrowth = 3.0
      let historicalAppreciation = 4.0

      const { data: trends } = await supabase
        .from("dld_monthly_trends")
        .select("month, avg_price, avg_price_per_sqm, transaction_count")
        .eq("area_name_en", resolvedArea)
        .order("month", { ascending: false })
        .limit(6)

      if (trends && trends.length >= 3) {
        // Compare recent 3 months to prior 3 months
        const recent = trends.slice(0, 3)
        const prior = trends.slice(3, 6)
        const avgRecent = recent.reduce((s, t) => s + Number(t.avg_price_per_sqm), 0) / recent.length
        const avgPrior = prior.length > 0
          ? prior.reduce((s, t) => s + Number(t.avg_price_per_sqm), 0) / prior.length
          : avgRecent

        const changePct = avgPrior > 0 ? ((avgRecent - avgPrior) / avgPrior) * 100 : 0
        if (changePct > 3) marketTrend = "rising"
        else if (changePct < -3) marketTrend = "declining"
        // else stays "stable"

        historicalAppreciation = Math.round(changePct * 2 * 10) / 10 // annualize roughly
        rentalGrowth = Math.round(changePct * 0.6 * 10) / 10 // rent tracks ~60% of price moves
      }

      // Estimate yield based on area grade and property type
      let estimatedYield = avgPricePerSqft > 1500 ? 4.5 : avgPricePerSqft > 1000 ? 5.5 : avgPricePerSqft > 700 ? 6.5 : 7.5
      if (propertyType.toLowerCase().includes("studio")) estimatedYield += 0.5
      if (bedrooms >= 3) estimatedYield -= 0.3
      if (propertyType.toLowerCase().includes("villa") || propertyType.toLowerCase().includes("townhouse")) {
        estimatedYield -= 0.8
      }

      // Derive area grade from price level
      const grade: MarketContext["areaGrade"] = avgPricePerSqft > 2000 ? "A"
        : avgPricePerSqft > 1200 ? "B"
        : avgPricePerSqft > 700 ? "C"
        : "D"

      const txnCount = Number(stats.transaction_count)
      const liquidity = Math.min(10, Math.max(1, Math.round(Math.log2(txnCount + 1))))

      console.log(`[evaluate] Using real DLD data for ${area} (${dldPropertyType}): ${txnCount} transactions, avg AED ${avgPricePerSqft}/sqft`)

      return {
        areaMedianPrice: avgPrice,
        areaMedianPricePerSqft: avgPricePerSqft,
        areaAverageYield: Math.round(estimatedYield * 10) / 10,
        priceVsMarket: 0, // Calculated later
        marketTrend,
        demandLevel: txnCount > 500 ? "high" : txnCount > 100 ? "medium" : "low",
        supplyLevel: txnCount > 1000 ? "high" : txnCount > 300 ? "medium" : "low",
        averageDaysOnMarket: grade === "A" ? 50 : grade === "B" ? 40 : 35,
        areaGrade: grade,
        liquidityScore: liquidity,
        tenantDemand: txnCount > 500 ? "high" : txnCount > 100 ? "medium" : "low",
        priceVolatility: Math.abs(historicalAppreciation) > 8 ? "high" : Math.abs(historicalAppreciation) > 4 ? "medium" : "low",
        newSupplyUnits: 0, // Not available from DLD stats
        occupancyRate: grade === "A" ? 92 : grade === "B" ? 90 : 87,
        historicalAppreciation: Math.max(0, historicalAppreciation),
        rentalGrowth: Math.max(0, rentalGrowth),
        investorProfile: grade === "A" ? "core" : grade === "B" ? "core_plus" : "value_add",
      }
    }
  } catch (err) {
    console.warn("[evaluate] DLD query failed, using generic fallback:", err)
  }

  // Fallback: return generic market context when DB is unavailable
  console.warn(`[evaluate] No real DLD data for "${area}" - using generic defaults`)
  const data = DEFAULT_MARKET_DATA
  let adjustedYield = data.yield
  if (propertyType.toLowerCase().includes("studio")) adjustedYield += 0.5
  if (bedrooms >= 3) adjustedYield -= 0.3
  if (propertyType.toLowerCase().includes("villa") || propertyType.toLowerCase().includes("townhouse")) {
    adjustedYield -= 0.8
  }
  return {
    areaMedianPrice: data.median * 1000,
    areaMedianPricePerSqft: data.median,
    areaAverageYield: Math.round(adjustedYield * 10) / 10,
    priceVsMarket: 0,
    marketTrend: data.trend,
    demandLevel: data.tenantDemand,
    supplyLevel: data.newSupply > 3000 ? "high" : data.newSupply > 1000 ? "medium" : "low",
    averageDaysOnMarket: data.daysOnMarket,
    areaGrade: data.grade,
    liquidityScore: data.liquidity,
    tenantDemand: data.tenantDemand,
    priceVolatility: data.volatility,
    newSupplyUnits: data.newSupply,
    occupancyRate: data.occupancy,
    historicalAppreciation: data.appreciation,
    rentalGrowth: data.rentalGrowth,
    investorProfile: data.profile,
  }
}

/**
 * Robustly extract a JSON object from a string that may contain markdown or trailing text.
 */
function extractJSON(raw: string): any {
  try { return JSON.parse(raw) } catch { /* continue */ }
  const start = raw.indexOf("{")
  if (start === -1) throw new Error("No JSON object found in response")
  let depth = 0, inString = false, escape = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"' && !escape) { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") depth++
    if (ch === "}") { depth--; if (depth === 0) { try { return JSON.parse(raw.slice(start, i + 1)) } catch { /* continue */ } } }
  }
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch { /* continue */ } }
  throw new Error("Failed to parse JSON from AI response")
}

// AI-powered evaluation using Claude Sonnet
async function evaluateWithAI(
  property: PropertyData,
  marketContext: MarketContext
): Promise<EvaluationResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  })
  // Use Sonnet for evaluation (faster + cheaper); Opus stays for extraction
  const CLAUDE_MODEL = process.env.ANTHROPIC_EVAL_MODEL || "claude-sonnet-4-20250514"

  const estimatedAnnualRent = property.price * (marketContext.areaAverageYield / 100)
  const estimatedMonthlyRent = estimatedAnnualRent / 12
  const fallbackGrowth = buildGrowthAnalysis(
    property,
    marketContext,
    property.price,
    Math.round(property.price * 1.08),
  )

  const prompt = `You are a senior real estate investment analyst evaluating a property in Dubai, UAE for institutional investors and family offices.

PROPERTY DETAILS:
- Title: ${property.title}
- Type: ${property.propertyType}
- Location: ${property.area}${property.subArea ? `, ${property.subArea}` : ""}${property.buildingName ? ` — ${property.buildingName}` : ""}
- Address: ${property.address || "Not specified"}
- Price: AED ${property.price.toLocaleString()}
- Size: ${property.size ? `${property.size} sqft` : "Unknown"}${property.plotSize ? ` (Plot: ${property.plotSize} sqft)` : ""}
- Price/sqft: ${property.pricePerSqft ? `AED ${property.pricePerSqft.toLocaleString()}` : "Unknown"}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Furnished: ${property.furnished ? "Yes" : "No"}
- Parking: ${property.totalParkingSpaces ?? property.parking ?? "Unknown"}
- Completion Status: ${property.completionStatus?.replace(/_/g, " ") || "Ready"}
- Developer: ${property.developer || "Unknown"}
- Handover: ${property.handoverDate || "Immediate"}
- Service Charge: ${property.serviceCharge ? `AED ${property.serviceCharge}/sqft` : "Unknown"}
- Building: ${property.buildingName || "Unknown"}${property.buildingFloors ? `, ${property.buildingFloors} floors` : ""}${property.elevators ? `, ${property.elevators} elevators` : ""}
- Amenities: ${property.amenities.join(", ") || "Not specified"}
- Description: ${property.description || "Not provided"}
- Source: ${property.source}
- Listed: ${property.listedDate || "Unknown"}
- Purpose: ${property.purpose || "for-sale"}
- Reference: ${property.referenceNumber || "N/A"}
- Permit: ${property.permitNumber || "N/A"}
- Verified: ${property.verified ? "Yes" : "No"}${property.paymentPlan ? `\n- Payment Plan: ${property.paymentPlan.downPaymentPercent ?? "?"}% down / ${property.paymentPlan.preHandoverPercent ?? "?"}% pre-handover / ${property.paymentPlan.handoverPercent ?? "?"}% handover / ${property.paymentPlan.postHandoverPercent ?? "?"}% post-handover` : ""}

COMPREHENSIVE MARKET CONTEXT (${property.area}):
- Area Grade: ${marketContext.areaGrade} (A=Premium, B=Established, C=Emerging)
- Area Average Yield: ${marketContext.areaAverageYield}%
- Estimated Monthly Rent: AED ${Math.round(estimatedMonthlyRent).toLocaleString()}
- Market Trend: ${marketContext.marketTrend}
- Historical Appreciation: ${marketContext.historicalAppreciation}% per year
- Rental Growth: ${marketContext.rentalGrowth}% per year
- Liquidity Score: ${marketContext.liquidityScore}/10
- Tenant Demand: ${marketContext.tenantDemand}
- Price Volatility: ${marketContext.priceVolatility}
- Occupancy Rate: ${marketContext.occupancyRate}%
- New Supply Coming: ${marketContext.newSupplyUnits.toLocaleString()} units
- Avg Days on Market: ${marketContext.averageDaysOnMarket}
- Investor Profile Match: ${marketContext.investorProfile}

Evaluate this property and provide your assessment in the following JSON format. You MUST populate ALL fields — never leave a field as null/undefined/empty string. For developer name: NEVER output "Unknown Developer" — if unresolvable use "Unverified Developer". For risk names: NEVER output "undefined".

{
  "overallScore": <0-100>,
  "factors": {
    "mandateFit": <0-25>,
    "marketTiming": <0-25>,
    "portfolioFit": <0-25>,
    "riskAlignment": <0-25>
  },
  "headline": "<8 words max summarizing the opportunity>",
  "reasoning": "<1-2 sentences explaining the score with specific numbers>",
  "keyStrengths": ["<complete sentence strength with data>", "<strength 2>", "<strength 3>", "<strength 4>"],
  "considerations": ["<consideration explaining WHY it's a risk>", "<consideration 2>", "<consideration 3>"],
  "recommendation": "<strong_buy|buy|hold|pass>",
  "analysis": {
    "summary": "<2-3 sentence executive summary with key metrics>",
    "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],

    "plainEnglishThesis": "<2-3 paragraphs written for someone who has NEVER visited this city. Define jargon on first use (e.g. 'off-plan — a purchase made before construction completes'). Explain: what you are buying, exactly where it is, why it might appreciate, and what the main risks are. Be honest about uncertainty. Include at least one concrete comparison anchor (e.g. 'This area is 30 minutes south of the city's financial district, equivalent to a planned suburb still early in its development arc').>",

    "locationNarrative": {
      "areaOverview": "<~250 words prose. What is this district/zone? When was it established? What is the master plan vision? What development stage is it at (early/maturing/established)? What does it feel like TODAY — honest ground-level description, no marketing copy. How does it compare to better-known areas (use a specific comparison anchor with drive times). What daily amenities exist NOW? Be specific.>",
      "growthCatalyst": "<~200 words prose. Identify the PRIMARY growth driver for this location. What is it (airport expansion, metro line, landmark project, free zone, masterplan anchor)? Investment scale if known. Timeline — what is delivered vs what is still promised? How has it already impacted prices/absorption? Honest caveat: have timelines slipped before? What could go wrong? If no clear catalyst, state: 'Value is driven by established demand and relative scarcity rather than a single transformative infrastructure event.'>",
      "amenities": [
        {"category": "Recreation", "items": [{"name": "<amenity name>", "status": "<operational|under_construction|planned>"}]},
        {"category": "Education", "items": [{"name": "<school/university>", "status": "<operational|under_construction|planned>"}]},
        {"category": "Retail & F&B", "items": [{"name": "<mall/supermarket/restaurant>", "status": "<operational|under_construction|planned>"}]},
        {"category": "Health", "items": [{"name": "<hospital/clinic>", "status": "<operational|under_construction|planned>"}]},
        {"category": "Transport", "items": [{"name": "<metro/bus/highway>", "status": "<operational|under_construction|planned>"}]}
      ],
      "missingAmenities": ["<thing NOT in the area yet>", "<second gap>", "<third gap>", "<fourth gap — must have at least 3>"],
      "connectivity": [
        {"destination": "International Airport (nearest)", "distance": "<X km>", "driveTime": "<X-X min>"},
        {"destination": "Metro Station (nearest)", "distance": "<X km>", "driveTime": "<X min>"},
        {"destination": "CBD / Financial District", "distance": "<X km>", "driveTime": "<X-X min>"},
        {"destination": "Nearest Major Mall", "distance": "<X km>", "driveTime": "<X min>"},
        {"destination": "Major Highway (nearest on-ramp)", "distance": "<X km>", "driveTime": "<X min>"},
        {"destination": "Hospital (nearest)", "distance": "<X km>", "driveTime": "<X min>"},
        {"destination": "International School (nearest)", "distance": "<X km>", "driveTime": "<X min>"}
      ]
    },

    "enhancedDeveloperProfile": {
      "name": "<NEVER 'Unknown Developer'. If cannot verify: 'Unverified Developer'>",
      "legalName": "<full legal entity name including PJSC/LLC/etc. or 'Not confirmed'>",
      "tier": "<tier_1|tier_2|tier_3|unverified>",
      "tierLabel": "<Tier 1 — Publicly Listed | Tier 2 — Established Private | Tier 3 — Boutique/New | Unverified — Cannot Confirm>",
      "founded": "<year or 'Not confirmed'>",
      "listingStatus": "<public|private|unknown>",
      "exchange": "<e.g. 'DFM: EMAAR' — or null if private>",
      "marketCap": "<e.g. 'AED 71B+' — or null>",
      "unitsDelivered": "<e.g. '50,000+' — or 'Not confirmed'>",
      "notableProjects": ["<project 1>", "<project 2>", "<project 3>"],
      "deliveryTrackRecord": "<on_time|mixed|delayed|unknown>",
      "buildQuality": "<premium|good|average|poor|unknown>",
      "overview": "<2 analytical paragraphs: developer history, market positioning, reputation. NO marketing copy — write in analytical consultant voice. Note any controversies, delays, or quality issues.>",
      "riskAssessment": "<1 paragraph specifically assessing developer risk for THIS investment. For Tier 1: acknowledge it but note it is minimal. For unverified: flag as critical risk.>",
      "concerns": ["<specific concern — e.g. 'History of 6-12 month delays on 2020-2022 projects'>"],
      "escrowStatus": "<registered|unverified|unknown>"
    },

    "neighborhood": {
      "name": "<area name>",
      "grade": "<A|B|C|D>",
      "profile": "<brief profile>",
      "highlights": ["<highlight>"],
      "metrics": [{"label": "<label>", "value": "<value>", "trend": "<trend>"}]
    },

    "property": {
      "description": "<detailed property description>",
      "condition": "<condition assessment>",
      "specs": [{"label": "<label>", "value": "<value>"}],
      "highlights": ["<highlight>"]
    },

    "market": {
      "overview": "<market overview paragraph>",
      "drivers": ["<driver>"],
      "supply": "<supply analysis>",
      "demand": "<demand analysis>",
      "absorption": "<absorption data>"
    },

    "growth": {
      "narrative": "<growth narrative>",
      "neighborhoodTrend": "<trend description>",
      "annualGrowthBase": <number>,
      "annualGrowthConservative": <number>,
      "annualGrowthUpside": <number>,
      "projectedValue1Y": <number>,
      "projectedValue3Y": <number>,
      "projectedValue5Y": <number>,
      "drivers": ["<driver>"],
      "sensitivities": ["<sensitivity>"]
    },

    "pricing": {
      "askingPrice": <number>,
      "pricePerSqft": <number or null>,
      "marketAvgPricePerSqft": <number or null>,
      "recommendedOffer": <number>,
      "stabilizedValue": <number>,
      "valueAddBudget": <number>,
      "rentCurrent": <number>,
      "rentPotential": <number>,
      "irr": <decimal>,
      "equityMultiple": <number>
    },

    "neighborhoodBenchmarks": [
      {
        "community": "<premium benchmark community — e.g. Downtown Dubai>",
        "priceRange": "<e.g. AED 2,500-3,200/sqft>",
        "maturity": "<Fully mature|Maturing|Early stage|Pre-launch>",
        "hasMetro": <true|false>,
        "character": "<brief character — e.g. 'Premium CBD, Burj Khalifa'>",
        "isSubject": false
      },
      {
        "community": "<second premium benchmark>",
        "priceRange": "<range>",
        "maturity": "<maturity>",
        "hasMetro": <true|false>,
        "character": "<character>",
        "isSubject": false
      },
      {
        "community": "<SUBJECT PROPERTY community — highlighted>",
        "priceRange": "<subject property actual price/sqft>",
        "maturity": "<maturity>",
        "hasMetro": <true|false>,
        "character": "<honest character description>",
        "isSubject": true
      },
      {
        "community": "<comparable maturing community>",
        "priceRange": "<range>",
        "maturity": "<maturity>",
        "hasMetro": <true|false>,
        "character": "<character>",
        "isSubject": false
      },
      {
        "community": "<cheaper/emerging comparator — floor>",
        "priceRange": "<range>",
        "maturity": "<Early stage|Pre-launch>",
        "hasMetro": <true|false>,
        "character": "<character>",
        "isSubject": false
      }
    ],

    "comparables": [
      {
        "name": "<property name>",
        "distance": "<distance>",
        "size": "<size>",
        "closingDate": "<date>",
        "price": <number>,
        "pricePerSqft": <number>,
        "provenanceLabel": "<[DLD Verified] | [Listed] | [Developer Price] | [AI Estimate] | [Agent Reported]>",
        "note": "<brief context — e.g. 'Same tower, 2 floors above'. If no verified transactions exist, state: 'No recorded transactions found. Treat as indicative only.'>"
      }
    ],

    "riskMatrix": [
      {
        "name": "Market Price Correction",
        "category": "Market",
        "likelihood": <1-5 — never leave undefined>,
        "impact": <1-5>,
        "score": <likelihood × impact>,
        "scoreBand": "<Low ≤6 | Medium 7-12 | High 13-20 | Critical 21-25>",
        "mitigation": "<1-2 sentences specific to this property>"
      },
      {
        "name": "Rental Demand / Vacancy Risk",
        "category": "Market",
        "likelihood": <1-5>,
        "impact": <1-5>,
        "score": <l×i>,
        "scoreBand": "<band>",
        "mitigation": "<specific mitigation>"
      },
      {
        "name": "Developer Execution Risk",
        "category": "Execution",
        "likelihood": <1-5>,
        "impact": <1-5>,
        "score": <l×i>,
        "scoreBand": "<band>",
        "mitigation": "<specific mitigation>"
      },
      {
        "name": "Area Maturity / Infrastructure Completion",
        "category": "Execution",
        "likelihood": <1-5>,
        "impact": <1-5>,
        "score": <l×i>,
        "scoreBand": "<band>",
        "mitigation": "<specific mitigation>"
      },
      {
        "name": "Liquidity / Exit Difficulty",
        "category": "Financial",
        "likelihood": <1-5>,
        "impact": <1-5>,
        "score": <l×i>,
        "scoreBand": "<band>",
        "mitigation": "<specific mitigation>"
      },
      {
        "name": "Service Charge Escalation",
        "category": "Financial",
        "likelihood": <1-5>,
        "impact": <1-5>,
        "score": <l×i>,
        "scoreBand": "<band>",
        "mitigation": "<specific mitigation>"
      },
      {
        "name": "Regulatory / Policy Change",
        "category": "Regulatory",
        "likelihood": <1-5>,
        "impact": <1-5>,
        "score": <l×i>,
        "scoreBand": "<band>",
        "mitigation": "<specific mitigation>"
      }
      // ALSO include any applicable CONDITIONAL risks from this list:
      // - "Oversupply in Micro-Market" (if high new supply) — category: Market
      // - "Currency Risk" (if cross-border investor likely) — category: Financial
      // - "Geopolitical / Macro-Economic" (if relevant) — category: Market
      // - "Infrastructure Dependency" (if value relies on catalyst) — category: Execution
      // - "STR Regulatory Risk" (if holiday-let strategy) — category: Regulatory
      // - "Financing / Interest Rate Risk" (if likely leveraged) — category: Financial
      // - "Construction / Delivery Delay" (if off-plan) — category: Execution
    ],

    "stressTests": [
      {
        "label": "15% Value Decline at Exit",
        "description": "Property sells at 15% below purchase price after 5-year hold",
        "impact": "<describe equity impact — e.g. 'Negative equity if leveraged at 70% LTV'>",
        "quantifiedEffect": "<e.g. 'Net loss of AED 291,000 vs base case profit of AED 450,000. ROI on equity drops from +22% to -8%'>"
      },
      {
        "label": "6-Month Vacancy in Year 1",
        "description": "No rental income for first 6 months post-handover",
        "impact": "<cash flow impact>",
        "quantifiedEffect": "<AED impact on Year 1 net cash flow>"
      },
      {
        "label": "25% Service Charge Increase",
        "description": "Annual service charge rises 25% above current estimate",
        "impact": "<net yield compression>",
        "quantifiedEffect": "<AED/% impact on net yield>"
      },
      {
        "label": "Combined Stress (All Three)",
        "description": "15% price drop + 6-month vacancy + 25% service charge increase",
        "impact": "<combined worst-case scenario>",
        "quantifiedEffect": "<break-even timeline and minimum hold period for positive return>"
      }
    ],

    "dataGaps": [
      {"field": "Transaction data", "status": "<verified|assumed|unverified|missing>", "detail": "<explanation>"},
      {"field": "Handover date", "status": "<verified|assumed|unverified|missing>", "detail": "<guaranteed or estimated>"},
      {"field": "Service charges", "status": "<verified|assumed|unverified|missing>", "detail": "<confirmed or assumed per sqft>"},
      {"field": "Rental projections", "status": "<verified|assumed|unverified|missing>", "detail": "<actual leases or modeled>"},
      {"field": "Site visit conducted", "status": "<verified|missing>", "detail": "<confirmed or not conducted>"},
      {"field": "Floor plan reviewed", "status": "<verified|missing>", "detail": "<confirmed or not reviewed>"},
      {"field": "View permanence", "status": "<verified|assumed|unverified>", "detail": "<permanent or subject to obstruction>"},
      {"field": "Developer registry verification", "status": "<verified|unverified|missing>", "detail": "<RERA/DLD check status>"},
      {"field": "Parking/storage in SPA", "status": "<verified|assumed|unverified>", "detail": "<confirmed in SPA or assumed>"},
      {"field": "STR licensing availability", "status": "<verified|unverified|missing>", "detail": "<DTCM permit eligibility>"},
      {"field": "Construction progress", "status": "<verified|assumed|unverified>", "detail": "<independently verified or as stated>"}
    ],

    "executionSteps": [
      "Verify developer identity against RERA/DLD registry and request escrow account confirmation",
      "Engage independent legal counsel to review SPA before any payment",
      "Request and review unit-specific floor plan and confirm exact unit number, floor, and view direction",
      "Conduct site visit to assess construction progress and area amenities firsthand",
      "Pull fresh comparable transactions from DLD records within 0.5km radius",
      "Confirm payment plan schedule in writing and model cash flow impact",
      "Obtain written service charge confirmation from developer/RERA filing",
      "Check visa/residency eligibility and minimum purchase thresholds",
      "If leveraged: obtain financing pre-approval from at least two banks before SPA signature",
      "Set milestone monitoring calendar for catalyst infrastructure (metro completion, mall opening, etc.)"
    ],

    "scoringMethodology": {
      "dimensions": [
        {"name": "Mandate Fit", "weight": "0–25 pts", "description": "Property type appeal, area grade, price point, yield alignment, bedroom configuration"},
        {"name": "Market Timing", "weight": "0–25 pts", "description": "Market trend direction, supply pipeline risk, days-on-market velocity, rental growth trajectory"},
        {"name": "Portfolio Fit", "weight": "0–25 pts", "description": "Area liquidity, diversification value, tenant demand depth, occupancy profile"},
        {"name": "Risk Alignment", "weight": "0–25 pts", "description": "Price volatility, completion status penalty, developer reputation, service charge risk, exit liquidity"}
      ],
      "bands": [
        {"range": "80–100", "label": "Strong Buy", "action": "Priority capital deployment, act within 1–2 weeks"},
        {"range": "65–79", "label": "Buy", "action": "Proceed with standard diligence, 2–4 week timeline"},
        {"range": "50–64", "label": "Conditional", "action": "Address specific conditions before deploying capital"},
        {"range": "35–49", "label": "Hold / Monitor", "action": "Significant concerns — monitor only, do not commit"},
        {"range": "0–34", "label": "Pass", "action": "Does not meet investment criteria at current terms"}
      ],
      "keyFactorsUp": ["<specific factor positively impacting score>", "<second factor>"],
      "keyFactorsDown": ["<specific factor negatively impacting score>", "<second factor>"]
    },

    "strategy": {
      "plan": "<strategy plan>",
      "holdPeriod": "<hold period>",
      "exit": "<exit strategy>",
      "focusPoints": ["<focus point>"]
    },

    "investmentThesis": "<investment thesis>",

    "developerProfile": {
      "name": "<developer name — NEVER 'Unknown Developer'>",
      "tier": "<tier_1|tier_2|tier_3|unknown>",
      "overview": "<developer overview>",
      "trackRecord": "<track record>",
      "notableProjects": ["<project>"],
      "strengths": ["<strength>"],
      "concerns": ["<concern>"],
      "escrowStatus": "<escrow status>",
      "riskAssessment": "<risk assessment>"
    },

    "investmentDecision": {
      "verdict": "<PROCEED|CONDITIONAL|PASS>",
      "confidenceLevel": "<high|medium|low>",
      "rationale": "<2-3 paragraph rationale referencing specific numbers>",
      "keyDrivers": ["<driver>"],
      "conditionsToMeet": ["<condition>"],
      "dealBreakers": ["<deal breaker>"],
      "suggestedNextSteps": ["<next step>"],
      "exitStrategy": "<exit strategy paragraph>",
      "timelineGuidance": "<1 sentence urgency guidance>"
    },

    "financialAnalysis": {
      "noi": <number>,
      "capRate": <number>,
      "targetIrr": <number>,
      "holdPeriod": "<hold period string>"
    },

    "risks": [{"risk": "<risk>", "mitigation": "<mitigation>"}],

    "finalRecommendation": {
      "decision": "<PROCEED|CONDITIONAL|PASS>",
      "condition": "<condition>"
    }
  }
}

ENHANCED SCORING CRITERIA:

1. MANDATE FIT (0-25 points):
   - Property type appeal (apartments score higher than niche types)
   - Area desirability (Grade A/B areas score higher)
   - Price point (AED 1-5M sweet spot for most mandates)
   - Yield alignment (5-8% target range)
   - Bedroom count (1-2 BR highest demand for rentals)

2. MARKET TIMING (0-25 points):
   - Market trend (rising/stable = higher)
   - Supply pipeline risk (high supply = lower score)
   - Days on market (faster = healthier market)
   - Rental growth trajectory

3. PORTFOLIO FIT (0-25 points):
   - Area diversification potential
   - Liquidity score (easier exit = higher)
   - Tenant demand level
   - Occupancy rates
   - Institutional appeal

4. RISK ALIGNMENT (0-25 points):
   - Price volatility (lower = higher score)
   - Completion status (ready > off-plan)
   - Developer reputation (if off-plan)
   - Service charge reasonableness
   - Exit liquidity

SCORING GUIDELINES:
- 80-100: Exceptional opportunity, rare find → Strong Buy
- 65-79: Strong investment, proceed with standard diligence → Buy
- 50-64: Moderate opportunity, specific use case → Conditional
- 35-49: Below average, significant concerns → Hold/Monitor
- 0-34: Pass, fundamental issues

CRITICAL UNDERWRITING RULES:
- DEVELOPER NAME: NEVER output "Unknown Developer". If you cannot identify the developer, output "Unverified Developer" — NEVER leave this blank.
- RISK FIELDS: NEVER output "undefined" for risk name, category, or description. Every risk entry must have all fields populated.
- If developer is absent/unverified, cap score at 55 max and flag for enhanced due diligence. Tier 1 developer (Emaar, Nakheel, DAMAC, Meraas, Aldar, Dubai Properties, Sobha, Omniyat, Select Group, Azizi) lowers Developer Execution and Construction Delay risk scores by 1-2 points.
- If completion date is TBD for off-plan, penalize Risk Alignment by 5+ points
- neighborhoodBenchmarks MUST include the SUBJECT PROPERTY (isSubject: true) plus at least 4 other communities — minimum 5 rows total
- ONLY reference comparables from the SAME micro-market/community (${property.area}). Never use comps from different submarkets
- Growth assumptions MUST be supported by the market data provided — do not use generic 3-6% unless justified
- All financial projections must reference specific market data points, not generic templates
- Marketing claims from developer brochures must be labeled as "developer-stated" not verified
- Every risk in riskMatrix must have all fields: name, category, likelihood (1-5), impact (1-5), score (l×i), scoreBand, mitigation
- Score bands: Low ≤6 | Medium 7-12 | High 13-20 | Critical 21-25
- stressTests must quantify ALL impacts in AED amounts — never give vague descriptions
- dataGaps must be honest — if data was not in the input, mark it as "assumed" or "missing"
- locationNarrative.missingAmenities must list at least 3 things the area does NOT have yet
- plainEnglishThesis must explain the investment in plain language for a non-specialist — define "off-plan", "DLD", "freehold" etc. on first use
- executionSteps must be specific and actionable (10 steps)

Be specific and reference actual numbers in your analysis. Include specific data points in strengths/considerations.`

  try {
    // Use streaming for reliable completion of long responses
    const stream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      system: "You are a senior real estate investment analyst writing for institutional investors and family offices. Always respond with valid JSON only — no explanation or markdown outside the JSON.\n\nWRITING STYLE:\n- Use flowing prose paragraphs (not bullet fragments) for locationNarrative.areaOverview, locationNarrative.growthCatalyst, enhancedDeveloperProfile.overview, and plainEnglishThesis.\n- Write in an honest consultant tone — factual, balanced, direct. Acknowledge uncertainty.\n- NEVER copy developer marketing language — rewrite analytically.\n- Define jargon on first use (off-plan, DLD, Oqood, RERA, freehold, etc.).\n- Balance positive and negative — every strength mention should also note limitations.\n- Always tell the reader how reliable each data point is.\n- Use comparison anchors — distances in drive minutes, prices relative to well-known areas.\n- locationNarrative.areaOverview must be at least 200 words of readable prose.\n- locationNarrative.growthCatalyst must be at least 150 words.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const completion = await stream.finalMessage()

    const textBlock = completion.content.find(block => block.type === "text")
    const content = textBlock && textBlock.type === "text" ? textBlock.text : null
    if (!content) {
      throw new Error("No response from AI")
    }

    // Extract JSON from potential markdown wrapping — use balanced brace matching
    const result = extractJSON(content)

    // If AI didn't return full analysis, create it from the response
    if (!result.analysis) {
      const fallback = createFallbackEvaluation(property, marketContext, estimatedMonthlyRent)
      result.analysis = fallback.analysis
    }

    // Ensure future growth analysis always exists for PDF + IC memo.
    if (!result.analysis.growth) {
      result.analysis.growth = fallbackGrowth
    } else {
      result.analysis.growth = {
        ...fallbackGrowth,
        ...result.analysis.growth,
        drivers: Array.isArray(result.analysis.growth.drivers) && result.analysis.growth.drivers.length > 0
          ? result.analysis.growth.drivers
          : fallbackGrowth.drivers,
        sensitivities: Array.isArray(result.analysis.growth.sensitivities) && result.analysis.growth.sensitivities.length > 0
          ? result.analysis.growth.sensitivities
          : fallbackGrowth.sensitivities,
      }
    }

    // Sanitize developer name — never allow "Unknown Developer"
    if (result.analysis.developerProfile) {
      const devName = result.analysis.developerProfile.name || ""
      if (!devName || devName.toLowerCase().includes("unknown")) {
        result.analysis.developerProfile.name = property.developer || "Unverified Developer"
      }
    }
    if (result.analysis.enhancedDeveloperProfile) {
      const devName = result.analysis.enhancedDeveloperProfile.name || ""
      if (!devName || devName.toLowerCase().includes("unknown")) {
        result.analysis.enhancedDeveloperProfile.name = property.developer || "Unverified Developer"
      }
    }

    // Sanitize risk matrix — fix any undefined fields
    if (Array.isArray(result.analysis.riskMatrix)) {
      result.analysis.riskMatrix = result.analysis.riskMatrix.map((r: Record<string, unknown>, i: number) => ({
        name: r.name && String(r.name) !== "undefined" ? String(r.name) : `Risk Item ${i + 1}`,
        category: r.category && String(r.category) !== "undefined" ? String(r.category) : "Market",
        likelihood: Number(r.likelihood) || 2,
        impact: Number(r.impact) || 2,
        score: Number(r.score) || (Number(r.likelihood) || 2) * (Number(r.impact) || 2),
        scoreBand: r.scoreBand && String(r.scoreBand) !== "undefined" ? String(r.scoreBand) : "Low",
        mitigation: r.mitigation && String(r.mitigation) !== "undefined" ? String(r.mitigation) : "Data not available — flagged for manual assessment",
      }))
    }

    const askingPrice = Number(result.analysis?.pricing?.askingPrice ?? property.price)
    const renovationBudget = Number(
      result.analysis?.pricing?.valueAddBudget ??
      (property.furnished ? 0 : Math.round(askingPrice * 0.02)),
    )
    const resalePrice = Number(
      result.analysis?.growth?.projectedValue5Y ??
      result.analysis?.pricing?.stabilizedValue ??
      Math.round(askingPrice * 1.2),
    )
    const holdYearsRaw = String(result.analysis?.financialAnalysis?.holdPeriod ?? "5")
    const holdYearsMatch = holdYearsRaw.match(/\d+/)
    const holdYears = holdYearsMatch ? Number(holdYearsMatch[0]) : 5
    const fallbackReturnBridge = buildReturnBridge(askingPrice, renovationBudget, resalePrice, holdYears)
    const currentReturnBridge = result.analysis?.financialAnalysis?.returnBridge
    result.analysis.financialAnalysis = {
      ...(result.analysis.financialAnalysis ?? {}),
      returnBridge: currentReturnBridge
        ? { ...fallbackReturnBridge, ...currentReturnBridge }
        : fallbackReturnBridge,
    }

    return result
  } catch (error) {
    console.error("AI evaluation error:", error)
    // Return fallback evaluation
    return createFallbackEvaluation(property, marketContext, estimatedMonthlyRent)
  }
}

function buildGrowthAnalysis(
  property: PropertyData,
  marketContext: MarketContext,
  askingPrice: number,
  stabilizedValue: number,
) {
  const baseRateRaw = (marketContext.historicalAppreciation * 0.75) + (marketContext.rentalGrowth * 0.25)
  const annualGrowthBase = Math.max(1.5, Math.min(12, Math.round(baseRateRaw * 10) / 10))
  const annualGrowthConservative = Math.max(0.5, Math.round((annualGrowthBase - 2) * 10) / 10)
  const annualGrowthUpside = Math.round(
    (annualGrowthBase + (marketContext.marketTrend === "rising" ? 2.5 : 1.5)) * 10,
  ) / 10

  const baseline = Math.max(askingPrice, stabilizedValue)
  const projectedValue1Y = Math.round(baseline * (1 + annualGrowthBase / 100))
  const projectedValue3Y = Math.round(baseline * Math.pow(1 + annualGrowthBase / 100, 3))
  const projectedValue5Y = Math.round(baseline * Math.pow(1 + annualGrowthBase / 100, 5))

  const neighborhoodTrend =
    marketContext.marketTrend === "rising"
      ? "Neighborhood is in an expansion phase with positive transaction momentum."
      : marketContext.marketTrend === "stable"
        ? "Neighborhood shows stable pricing behavior with resilient end-user demand."
        : "Neighborhood is currently in a softer cycle; underwriting assumes slower near-term growth."

  return {
    narrative: `${property.area} shows ${marketContext.marketTrend} neighborhood tendencies with ${marketContext.historicalAppreciation}% historical annual appreciation and ${marketContext.rentalGrowth}% rental growth. Base underwriting assumes ${annualGrowthBase}% annual capital growth, supporting a 5-year value estimate near AED ${projectedValue5Y.toLocaleString()}.`,
    neighborhoodTrend,
    annualGrowthBase,
    annualGrowthConservative,
    annualGrowthUpside,
    projectedValue1Y,
    projectedValue3Y,
    projectedValue5Y,
    drivers: [
      `${marketContext.tenantDemand.charAt(0).toUpperCase() + marketContext.tenantDemand.slice(1)} tenant demand with ${marketContext.occupancyRate}% occupancy`,
      `${marketContext.liquidityScore}/10 liquidity profile supporting eventual exit pricing`,
      `${marketContext.newSupplyUnits < 2000 ? "Limited" : "Moderate"} pipeline supply in the surrounding micro-market`,
    ],
    sensitivities: [
      "Higher-than-expected new launches can cap short-term resale upside.",
      "Interest rate changes may affect buyer affordability and absorption speed.",
      "Execution quality and service-charge competitiveness influence long-term premium retention.",
    ],
  }
}

function buildReturnBridge(
  purchasePrice: number,
  renovationBudget: number,
  resalePrice: number,
  holdYears: number,
  assumptions?: {
    dldRatePct?: number
    brokerFeePct?: number
    mortgageLtvPct?: number
    annualInterestRatePct?: number
  },
) {
  const dldRatePct = assumptions?.dldRatePct ?? 4
  const brokerFeePct = assumptions?.brokerFeePct ?? 2
  const mortgageLtvPct = assumptions?.mortgageLtvPct ?? 70
  const annualInterestRatePct = assumptions?.annualInterestRatePct ?? 3.5
  const dldFee = Math.round(purchasePrice * (dldRatePct / 100))
  const brokerFee = Math.round(purchasePrice * (brokerFeePct / 100))
  const totalProjectCost = purchasePrice + dldFee + brokerFee + renovationBudget
  const mortgageAmount = Math.round(purchasePrice * (mortgageLtvPct / 100))
  const equityInvested = Math.max(0, totalProjectCost - mortgageAmount)
  const annualInterest = Math.round(mortgageAmount * (annualInterestRatePct / 100))
  const totalInterest = Math.round(annualInterest * Math.max(1, holdYears))
  const netSaleProceedsAfterMortgage = Math.round(resalePrice - mortgageAmount)
  const netProfitAfterInterest = Math.round(netSaleProceedsAfterMortgage - equityInvested - totalInterest)
  const roiOnEquityPct = equityInvested > 0 ? Math.round((netProfitAfterInterest / equityInvested) * 1000) / 10 : 0

  return {
    purchasePrice,
    dldRatePct,
    dldFee,
    brokerFeePct,
    brokerFee,
    renovation: renovationBudget,
    totalProjectCost,
    mortgageLtvPct,
    mortgageAmount,
    equityInvested,
    annualInterestRatePct,
    annualInterest,
    resalePrice,
    netSaleProceedsAfterMortgage,
    netProfitAfterInterest,
    roiOnEquityPct,
    assumptions: `Assumes ${mortgageLtvPct}% LTV, ${annualInterestRatePct}% annual interest, and ${Math.max(1, holdYears)}-year hold.`,
  }
}

/* ------------------------------------------------------------------ */
/*  Enhanced PDF data builders (Feedback #1-#4)                        */
/* ------------------------------------------------------------------ */

import type {
  CashFlowTable,
  CashFlowRow,
  OperatingExpenses,
  ScenarioRow,
  ComparableTransaction,
} from "@/lib/pdf/intake-report"

interface EnhancedPdfData {
  cashFlowTable: CashFlowTable
  operatingExpenses: OperatingExpenses
  scenarios: ScenarioRow[]
  comparables: ComparableTransaction[]
}

/**
 * Build the year-by-year cash-flow table (Feedback #1).
 * Shows gross rent, expenses, mortgage, net cash-flow, property value,
 * and cumulative return for each year of the hold period.
 */
function buildCashFlowTable(params: {
  purchasePrice: number
  mortgageAmount: number
  mortgageRate: number       // annual %
  mortgageTerm: number       // years (for amortization)
  annualRent: number
  annualExpenses: number     // total OPEX per year
  appreciationPct: number    // annual %
  holdPeriod: number
  equityInvested: number
}): CashFlowTable {
  const {
    purchasePrice, mortgageAmount, mortgageRate, mortgageTerm,
    annualRent, annualExpenses, appreciationPct, holdPeriod, equityInvested,
  } = params

  // Monthly mortgage payment (P&I)
  const monthlyRate = mortgageRate / 100 / 12
  const totalPayments = mortgageTerm * 12
  const monthlyPayment =
    mortgageAmount > 0 && monthlyRate > 0
      ? mortgageAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0
  const annualMortgagePayment = Math.round(monthlyPayment * 12)

  const rows: CashFlowRow[] = []
  let cumulativeReturn = 0

  for (let year = 1; year <= holdPeriod; year++) {
    const grossRent = Math.round(annualRent * Math.pow(1.03, year - 1)) // 3% rental growth
    const expenses = Math.round(annualExpenses * Math.pow(1.02, year - 1)) // 2% expense inflation
    const netCashFlow = grossRent - expenses - annualMortgagePayment
    cumulativeReturn += netCashFlow
    const propertyValue = Math.round(purchasePrice * Math.pow(1 + appreciationPct / 100, year))

    rows.push({
      year,
      grossRent,
      expenses,
      mortgagePayment: annualMortgagePayment,
      netCashFlow,
      propertyValue,
      cumulativeReturn,
    })
  }

  // Exit proceeds
  const finalValue = rows[rows.length - 1]?.propertyValue ?? purchasePrice
  const remainingPayments = Math.max(0, totalPayments - holdPeriod * 12)
  const outstandingLoan =
    remainingPayments > 0 && monthlyRate > 0
      ? mortgageAmount *
        (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, holdPeriod * 12)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0
  const exitProceeds = Math.round(finalValue - outstandingLoan)
  const totalProfit = Math.round(exitProceeds + cumulativeReturn - equityInvested)

  return { rows, exitProceeds, totalProfit, holdPeriod }
}

/**
 * Build operating expenses breakdown (Feedback #2).
 */
function buildOperatingExpenses(params: {
  purchasePrice: number
  annualRent: number
  sizeSqft: number | null
  serviceChargePerSqft: number | null
}): OperatingExpenses {
  const { purchasePrice, annualRent, sizeSqft, serviceChargePerSqft } = params

  // Service charge: use extracted value or estimate from area average
  const scPerSqft = serviceChargePerSqft ?? 18 // AED/sqft fallback (Dubai average)
  const effectiveSize = sizeSqft ?? Math.round(purchasePrice / 1200) // rough fallback
  const serviceCharge = Math.round(scPerSqft * effectiveSize)

  // Management fee: 5% of gross rent (typical Dubai property management)
  const managementFee = Math.round(annualRent * 0.05)

  // Maintenance reserve: 1% of property value
  const maintenanceReserve = Math.round(purchasePrice * 0.01)

  // Insurance: ~0.1% of property value (minimal in Dubai)
  const insurance = Math.round(purchasePrice * 0.001)

  const totalAnnual = serviceCharge + managementFee + maintenanceReserve + insurance
  const netRent = annualRent - totalAnnual

  return {
    serviceCharge,
    managementFee,
    maintenanceReserve,
    insurance,
    totalAnnual,
    grossRent: annualRent,
    netRent,
    serviceChargePerSqft: scPerSqft,
    notes: serviceChargePerSqft
      ? "Service charge from listing data"
      : "Service charge estimated from area average (~AED 18/sqft)",
  }
}

/**
 * Run 3 scenarios — upside / base / downside (Feedback #3).
 * Varies rent, occupancy and exit price; keeps purchase costs constant.
 */
function buildScenarios(params: {
  purchasePrice: number
  annualRent: number
  appreciationPct: number
  holdPeriod: number
  equityInvested: number
  mortgageAmount: number
  mortgageRate: number
  totalExpenses: number
}): ScenarioRow[] {
  const {
    purchasePrice, annualRent, appreciationPct, holdPeriod,
    equityInvested, mortgageAmount, mortgageRate, totalExpenses,
  } = params

  const annualInterest = Math.round(mortgageAmount * (mortgageRate / 100))

  function runScenario(
    label: string,
    rentMultiplier: number,
    occupancy: number,
    growthDelta: number,
  ): ScenarioRow {
    const adjRent = Math.round(annualRent * rentMultiplier * (occupancy / 100))
    const adjGrowth = appreciationPct + growthDelta
    const exitPrice = Math.round(purchasePrice * Math.pow(1 + adjGrowth / 100, holdPeriod))

    // Total rental income over hold period (simple; ignores rental growth for clarity)
    const totalRentalIncome = adjRent * holdPeriod
    const totalExpensesCost = totalExpenses * holdPeriod
    const totalInterestCost = annualInterest * holdPeriod
    const netSale = exitPrice - mortgageAmount
    const netProfit = Math.round(
      netSale + totalRentalIncome - totalExpensesCost - totalInterestCost - equityInvested,
    )

    // IRR approximation (equity-multiple based)
    const totalCashIn = netSale + totalRentalIncome - totalExpensesCost - totalInterestCost
    const equityMultiple = equityInvested > 0 ? totalCashIn / equityInvested : 1
    const fiveYearIrr = holdPeriod > 0
      ? Math.round((Math.pow(Math.max(equityMultiple, 0), 1 / holdPeriod) - 1) * 1000) / 10
      : 0

    return { label, annualRent: adjRent, occupancy, exitPrice, fiveYearIrr, netProfit }
  }

  return [
    runScenario("Upside", 1.10, 95, 2),
    runScenario("Base", 1.00, 90, 0),
    runScenario("Downside", 0.90, 80, -2),
  ]
}

/**
 * Fetch DLD-based comparables and merge with AI-generated ones (Feedback #4).
 * Returns a unified list with source attribution.
 */
async function fetchDLDComparables(params: {
  area: string
  propertyType: string
  bedrooms: number
  sizeSqft: number | null
  buildingName: string | null
}): Promise<ComparableTransaction[]> {
  try {
    const supabase = getSupabaseAdminClient()
    const dldPropertyType = params.propertyType?.toLowerCase().includes("villa")
      ? "Villa"
      : params.propertyType?.toLowerCase().includes("townhouse")
        ? "Villa"
        : params.propertyType?.toLowerCase().includes("land")
          ? "Land"
          : "Unit"

    const sizeSqm = params.sizeSqft ? params.sizeSqft * 0.092903 : null

    // Resolve area name
    let resolvedArea = params.area
    const { data: directCheck } = await supabase
      .from("dld_area_stats")
      .select("area_name_en")
      .eq("area_name_en", params.area)
      .limit(1)

    if (!directCheck || directCheck.length === 0) {
      try {
        const { data: resolved } = await supabase
          .rpc("resolve_area_name" as any, { p_community_name: params.area })
          .maybeSingle()
        const r = resolved as Record<string, unknown> | null
        if (r?.dld_area_name) resolvedArea = String(r.dld_area_name)
      } catch {
        // ignore
      }
    }

    // Query tiered comparables
    const { data: tiers } = await supabase.rpc("find_best_comparables", {
      p_area_name: params.area,
      p_property_type: dldPropertyType,
      p_bedrooms: params.bedrooms ? String(params.bedrooms) : "0",
      p_size_sqm: sizeSqm ?? 0,
      p_building_name: params.buildingName || undefined,
    })

    const comps: ComparableTransaction[] = []

    if (tiers && tiers.length > 0) {
      for (const tier of tiers) {
        comps.push({
          name: `${String(tier.match_description || resolvedArea)} (Tier ${tier.match_tier})`,
          distance: tier.match_tier === 1 ? "Same building" : tier.match_tier === 2 ? "Same area" : "Nearby",
          price: Number(tier.median_price),
          pricePerSqft: Math.round(Number(tier.median_price_per_sqm) * 0.092903),
          date: "Recent",
          source: "DLD",
          provenanceLabel: "[DLD Verified]",
          type: "sale",
          note: `${tier.comparable_count} transactions, ${Math.round(Number(tier.confidence_score))}% confidence`,
        })
      }
    }

    // Also fetch latest individual transactions if available
    try {
      const { data: txns } = await supabase
        .from("dld_transactions")
        .select("instance_date, actual_worth, area_name_en, building_name_en, procedure_area, rooms_en")
        .eq("area_name_en", resolvedArea)
        .eq("property_type_en", dldPropertyType)
        .eq("trans_group_en", "Sales")
        .order("instance_date", { ascending: false })
        .limit(6)

      if (txns && txns.length > 0) {
        for (const txn of txns) {
          const areaSqm = Number(txn.procedure_area)
          const areaSqft = areaSqm > 0 ? Math.round(areaSqm / 0.092903) : 0
          const price = Number(txn.actual_worth)
          const psf = areaSqft > 0 ? Math.round(price / areaSqft) : 0
          comps.push({
            name: txn.building_name_en || txn.area_name_en || resolvedArea,
            distance: "Same area",
            price,
            pricePerSqft: psf,
            size: areaSqft > 0 ? `${areaSqft.toLocaleString()} sqft` : undefined,
            date: txn.instance_date || "Recent",
            source: "DLD",
            provenanceLabel: "[DLD Verified]",
            type: "sale",
            note: txn.rooms_en ? String(txn.rooms_en) : undefined,
          })
        }
      }
    } catch {
      // individual transactions not available, that's fine
    }

    return comps
  } catch (err) {
    console.warn("[evaluate] DLD comparables fetch failed:", err)
    return []
  }
}

/**
 * Merge AI comparables with DLD comparables, deduplicating by name.
 */
function mergeComparables(
  aiComps: EvaluationResult["analysis"]["comparables"],
  dldComps: ComparableTransaction[],
): ComparableTransaction[] {
  const merged: ComparableTransaction[] = []
  const seen = new Set<string>()

  // DLD comps first (higher trust)
  for (const comp of dldComps) {
    const key = `${comp.name}-${comp.price}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(comp)
    }
  }

  // Then AI comps
  for (const comp of aiComps) {
    const key = `${comp.name}-${comp.price}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push({
        name: comp.name,
        distance: comp.distance,
        price: comp.price,
        pricePerSqft: comp.pricePerSqft,
        size: comp.size,
        date: comp.closingDate,
        source: "AI",
        provenanceLabel: (comp as { provenanceLabel?: string }).provenanceLabel || "[AI Estimate]",
        type: "sale",
        note: comp.note,
      })
    }
  }

  return merged.slice(0, 10) // cap at 10
}

/**
 * Builds all enhanced PDF data from the evaluation result.
 */
async function buildEnhancedPdfData(
  property: PropertyData,
  marketContext: MarketContext,
  evaluation: EvaluationResult,
): Promise<EnhancedPdfData> {
  const analysis = evaluation.analysis
  const rb = analysis.financialAnalysis.returnBridge
  const growth = analysis.growth

  const purchasePrice = analysis.pricing.askingPrice || property.price
  const annualRent = Math.round(analysis.pricing.rentPotential || analysis.pricing.rentCurrent || purchasePrice * (marketContext.areaAverageYield / 100))
  const mortgageAmount = rb?.mortgageAmount ?? Math.round(purchasePrice * 0.7)
  const mortgageRate = rb?.annualInterestRatePct ?? 3.5
  const equityInvested = rb?.equityInvested ?? Math.round(purchasePrice * 0.36) // ~30% equity + fees
  const appreciationPct = growth?.annualGrowthBase ?? marketContext.historicalAppreciation
  const holdPeriod = 5

  // 1. Operating expenses
  const opex = buildOperatingExpenses({
    purchasePrice,
    annualRent,
    sizeSqft: property.size ?? null,
    serviceChargePerSqft: property.serviceCharge ?? null,
  })

  // 2. Cash flow table (uses net expenses)
  const cashFlowTable = buildCashFlowTable({
    purchasePrice,
    mortgageAmount,
    mortgageRate,
    mortgageTerm: 25,
    annualRent,
    annualExpenses: opex.totalAnnual,
    appreciationPct,
    holdPeriod,
    equityInvested,
  })

  // 3. Scenarios
  const scenarios = buildScenarios({
    purchasePrice,
    annualRent,
    appreciationPct,
    holdPeriod,
    equityInvested,
    mortgageAmount,
    mortgageRate,
    totalExpenses: opex.totalAnnual,
  })

  // 4. Enhanced comparables (merge DLD + AI)
  const dldComps = await fetchDLDComparables({
    area: property.area,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    sizeSqft: property.size,
    buildingName: property.buildingName || null,
  })
  const comparables = mergeComparables(analysis.comparables, dldComps)

  return { cashFlowTable, operatingExpenses: opex, scenarios, comparables }
}

/** Resolve developer name — never return "Unknown Developer" */
function resolveDevName(property: PropertyData): string {
  if (property.developer && !["unknown", "tbd", "tbc", "n/a", "", "none"].includes(property.developer.toLowerCase().trim())) {
    return property.developer
  }
  return "Unverified Developer"
}

/** Pre-populate a risk matrix that never has undefined fields */
function buildFallbackRiskMatrix(property: PropertyData, marketContext: MarketContext): EvaluationResult["analysis"]["riskMatrix"] {
  const devName = resolveDevName(property)
  const isOffPlan = property.completionStatus === "off_plan" || property.completionStatus === "under_construction"
  const devUnverified = devName === "Unverified Developer"
  const tier1Names = ["emaar", "nakheel", "damac", "meraas", "aldar", "dubai properties", "sobha", "omniyat", "select group", "azizi", "majid al futtaim"]
  const isTier1 = !devUnverified && tier1Names.some(t => devName.toLowerCase().includes(t))

  function band(score: number): string {
    if (score <= 6) return "Low"
    if (score <= 12) return "Medium"
    if (score <= 20) return "High"
    return "Critical"
  }

  const risks: NonNullable<EvaluationResult["analysis"]["riskMatrix"]> = []

  if (isOffPlan) {
    const l = isTier1 ? 2 : devUnverified ? 4 : 3
    const i = 4
    risks.push({
      name: "Construction / Delivery Delay",
      category: "Execution",
      likelihood: l,
      impact: i,
      score: l * i,
      scoreBand: band(l * i),
      mitigation: isTier1
        ? `${devName} has a generally strong delivery record. Include milestone-based payment clauses in SPA and monitor quarterly construction updates.`
        : "Require developer to provide construction milestone schedule and Oqood registration. Include penalty clauses for delay in SPA.",
    })
  }

  const devL = devUnverified ? 4 : isTier1 ? 1 : 2
  const devI = isOffPlan ? 4 : 3
  risks.push({
    name: "Developer Execution Risk",
    category: "Execution",
    likelihood: devL,
    impact: devI,
    score: devL * devI,
    scoreBand: band(devL * devI),
    mitigation: devUnverified
      ? "CRITICAL: Verify developer against RERA/DLD registry before any capital commitment. Confirm escrow registration and review completed project portfolio and financial stability."
      : isTier1
        ? `${devName} is a publicly listed Tier 1 developer. Verify escrow account status via RERA portal. Standard SPA review applies.`
        : `Independently verify ${devName}'s delivery history and escrow status. Request completed project references from prior buyers.`,
  })

  const areaMat = marketContext.areaGrade === "A" ? 1 : marketContext.areaGrade === "B" ? 2 : 3
  risks.push({
    name: "Area Maturity / Infrastructure Completion",
    category: "Execution",
    likelihood: areaMat,
    impact: 3,
    score: areaMat * 3,
    scoreBand: band(areaMat * 3),
    mitigation: "Conduct site visit to assess current infrastructure status. Verify utility connections, road access, and community amenities before committing capital.",
  })

  const corrL = marketContext.priceVolatility === "high" ? 3 : marketContext.priceVolatility === "medium" ? 2 : 1
  risks.push({
    name: "Market Price Correction",
    category: "Market",
    likelihood: corrL,
    impact: 4,
    score: corrL * 4,
    scoreBand: band(corrL * 4),
    mitigation: "Underwrite to conservative exit price (10–15% below base case). Target long hold period (5+ years) to ride through a correction cycle.",
  })

  const vacL = marketContext.tenantDemand === "low" ? 3 : marketContext.tenantDemand === "medium" ? 2 : 1
  risks.push({
    name: "Rental Demand / Vacancy Risk",
    category: "Market",
    likelihood: vacL,
    impact: 3,
    score: vacL * 3,
    scoreBand: band(vacL * 3),
    mitigation: "Verify active comparable listings before purchase. Engage a local property manager to assess realistic time-to-let. Budget 1–2 months vacancy per year.",
  })

  const liqL = marketContext.liquidityScore < 5 ? 3 : marketContext.liquidityScore < 7 ? 2 : 1
  risks.push({
    name: "Liquidity / Exit Difficulty",
    category: "Financial",
    likelihood: liqL,
    impact: 3,
    score: liqL * 3,
    scoreBand: band(liqL * 3),
    mitigation: "Pre-qualify target buyer profile before purchase. Ensure listing is ready 6–12 months before intended exit. Price 2–3% below market at launch to accelerate absorption.",
  })

  risks.push({
    name: "Service Charge Escalation",
    category: "Financial",
    likelihood: 2,
    impact: 2,
    score: 4,
    scoreBand: "Low",
    mitigation: "Confirm current service charge rate with RERA/developer. Request historical rate trend for the building. Factor 3–5% annual escalation into net yield projections.",
  })

  risks.push({
    name: "Regulatory / Policy Change",
    category: "Regulatory",
    likelihood: 1,
    impact: 3,
    score: 3,
    scoreBand: "Low",
    mitigation: "Monitor RERA policy announcements and visa/residency regulation changes. Ensure investment structure is compliant with current ownership laws.",
  })

  if (marketContext.newSupplyUnits > 3000) {
    risks.push({
      name: "Oversupply in Micro-Market",
      category: "Market",
      likelihood: 3,
      impact: 3,
      score: 9,
      scoreBand: "Medium",
      mitigation: `${marketContext.newSupplyUnits.toLocaleString()} units in pipeline. Focus on premium positioning, furnishing, and lease-up timing to compete with new launches.`,
    })
  }

  return risks
}

/** Build stress tests with quantified AED impacts */
function buildFallbackStressTests(
  property: PropertyData,
  marketContext: MarketContext,
  annualRent: number,
  serviceCharge: number,
  equityInvested: number,
): EvaluationResult["analysis"]["stressTests"] {
  const price = property.price
  const baseExitPrice = Math.round(price * Math.pow(1 + Math.max(1.5, marketContext.historicalAppreciation) / 100, 5))
  const baseRoiProfit = Math.round(baseExitPrice - equityInvested + annualRent * 5 * 0.85)

  // 1: 15% value decline
  const declineExitPrice = Math.round(price * 0.85)
  const declineProfit = Math.round(declineExitPrice - equityInvested + annualRent * 5 * 0.85)

  // 2: 6-month vacancy Y1
  const vacancyLoss = Math.round(annualRent * 0.5)

  // 3: 25% service charge increase
  const scIncrease = Math.round(serviceCharge * 0.25)
  const scYieldImpact = price > 0 ? Math.round((scIncrease / price) * 10000) / 100 : 0

  // 4: All combined
  const combinedProfit = Math.round(declineExitPrice - equityInvested + annualRent * 4.5 * 0.85 - scIncrease * 5 - vacancyLoss)
  const breakEvenHold = combinedProfit < 0 ? "8–10 years" : "6–7 years"

  return [
    {
      label: "15% Value Decline at Exit",
      description: "Property sells at 15% below purchase price after 5-year hold; rental income unchanged",
      impact: "Capital loss on exit significantly reduces total return; equity wiped if highly leveraged",
      quantifiedEffect: `Exit value drops from AED ${baseExitPrice.toLocaleString()} to AED ${declineExitPrice.toLocaleString()}. Net profit ${declineProfit >= 0 ? "reduces to" : "swings to a loss of"} AED ${Math.abs(declineProfit).toLocaleString()} vs base case AED ${baseRoiProfit.toLocaleString()}.`,
    },
    {
      label: "6-Month Vacancy in Year 1",
      description: "No rental income for first 6 months post-handover due to slow tenant absorption",
      impact: "Year 1 cash flow negative; investor must fund mortgage/service charge from own pocket",
      quantifiedEffect: `AED ${vacancyLoss.toLocaleString()} rental income lost in Year 1. If leveraged, total cash call in Y1 is AED ${Math.round(vacancyLoss + serviceCharge + Math.round(price * 0.7 * 0.035)).toLocaleString()} from own funds.`,
    },
    {
      label: "25% Service Charge Increase",
      description: "Annual service charge rises 25% above current estimate or disclosure",
      impact: "Net yield compressed; reduces annual cash flow",
      quantifiedEffect: `Service charge rises by AED ${scIncrease.toLocaleString()}/year. Net yield compressed by ~${scYieldImpact}% (e.g. from ${marketContext.areaAverageYield}% gross to ${Math.max(0, marketContext.areaAverageYield - scYieldImpact).toFixed(1)}% net). Total cost over 5-year hold: AED ${(scIncrease * 5).toLocaleString()}.`,
    },
    {
      label: "Combined Stress Scenario",
      description: "15% price decline + 6-month Y1 vacancy + 25% service charge escalation",
      impact: "Worst-case stacking of all three adverse events simultaneously",
      quantifiedEffect: `Total 5-year outcome: AED ${combinedProfit.toLocaleString()} net ${combinedProfit >= 0 ? "profit" : "loss"}. Break-even hold period under these conditions: ${breakEvenHold}. Minimum entry point for positive return: AED ${Math.round(price * 0.78).toLocaleString()} (22% below asking).`,
    },
  ]
}

/** Build data gaps checklist */
function buildFallbackDataGaps(property: PropertyData, dldCompsAvailable: boolean): EvaluationResult["analysis"]["dataGaps"] {
  return [
    {
      field: "Transaction data",
      status: dldCompsAvailable ? "verified" : "assumed",
      detail: dldCompsAvailable ? "DLD registry records available" : "No verified DLD transactions found — all comparables are AI-estimated",
    },
    {
      field: "Handover date",
      status: property.handoverDate ? "assumed" : "missing",
      detail: property.handoverDate ? `Listed as ${property.handoverDate} — developer confirmation required` : "Not specified — request from developer",
    },
    {
      field: "Service charges",
      status: property.serviceCharge ? "assumed" : "missing",
      detail: property.serviceCharge ? `Listed at AED ${property.serviceCharge}/sqft — verify against RERA filing` : "Not disclosed — assumed AED 15–20/sqft; verify before SPA",
    },
    {
      field: "Rental projections",
      status: "assumed",
      detail: "Modeled from area average yield — not based on actual signed leases or agent-verified comps",
    },
    {
      field: "Site visit conducted",
      status: "missing",
      detail: "No site visit recorded in this workflow — required before capital commitment",
    },
    {
      field: "Floor plan reviewed",
      status: property.size ? "assumed" : "missing",
      detail: property.size ? "Size known but specific unit floor plan not confirmed" : "Floor plan not available",
    },
    {
      field: "View permanence",
      status: "unverified",
      detail: "View direction and obstruction risk not assessed — requires site visit and floor plan review",
    },
    {
      field: "Developer registry verification",
      status: property.developer && !["unknown", "tbd"].includes(property.developer.toLowerCase()) ? "unverified" : "missing",
      detail: "RERA/DLD developer registration not independently confirmed in this workflow",
    },
    {
      field: "Parking/storage confirmed in SPA",
      status: property.parking || property.totalParkingSpaces ? "assumed" : "missing",
      detail: "Parking shown in listing — confirm it is legally included in the Sale & Purchase Agreement",
    },
    {
      field: "STR / holiday let licensing",
      status: "unverified",
      detail: "DTCM permit eligibility for short-term rental not assessed — verify if holiday let strategy intended",
    },
    {
      field: "Construction progress (off-plan)",
      status: property.completionStatus === "off_plan" || property.completionStatus === "under_construction" ? "unverified" : "not_applicable",
      detail: property.completionStatus === "off_plan" || property.completionStatus === "under_construction"
        ? "Construction progress percentage not independently verified — request Oqood certificate and site visit"
        : "Property is ready — not applicable",
    },
  ]
}

/** Build neighborhood benchmarks with subject property highlighted */
function buildFallbackNeighborhoodBenchmarks(
  property: PropertyData,
  marketContext: MarketContext,
): EvaluationResult["analysis"]["neighborhoodBenchmarks"] {
  const subjectPsf = property.pricePerSqft
    ? `AED ${property.pricePerSqft.toLocaleString()}/sqft`
    : `AED ${marketContext.areaMedianPricePerSqft.toLocaleString()}/sqft (est.)`

  const grade = marketContext.areaGrade

  const benchmarks: NonNullable<EvaluationResult["analysis"]["neighborhoodBenchmarks"]> = [
    {
      community: "Downtown Dubai",
      priceRange: "AED 2,500–3,500/sqft",
      maturity: "Fully mature",
      hasMetro: true,
      character: "Premium CBD — Burj Khalifa, Dubai Mall, high-end F&B",
      isSubject: false,
    },
    {
      community: "Dubai Marina",
      priceRange: "AED 1,800–2,800/sqft",
      maturity: "Fully mature",
      hasMetro: true,
      character: "Waterfront, walkable, strong expat demand, established rental market",
      isSubject: false,
    },
    {
      community: property.area,
      priceRange: subjectPsf,
      maturity: grade === "A" ? "Fully mature" : grade === "B" ? "Maturing" : "Early stage",
      hasMetro: false,
      character: `${grade}-grade zone — subject property location`,
      isSubject: true,
    },
    {
      community: "Jumeirah Village Circle (JVC)",
      priceRange: "AED 900–1,300/sqft",
      maturity: "Maturing",
      hasMetro: false,
      character: "Mid-market, high supply, affordable entry, maturing community",
      isSubject: false,
    },
    {
      community: "Dubai South / Expo City",
      priceRange: "AED 700–1,100/sqft",
      maturity: "Early stage",
      hasMetro: true,
      character: "Near Al Maktoum Airport, government-backed, long-term growth play",
      isSubject: false,
    },
  ]

  return benchmarks
}

function createFallbackEvaluation(
  property: PropertyData,
  marketContext: MarketContext,
  estimatedMonthlyRent: number
): EvaluationResult {
  // Enhanced rule-based scoring with multiple factors
  
  // 1. MANDATE FIT (0-25)
  let mandateFit = 12
  if (property.propertyType.toLowerCase().includes("apartment")) mandateFit += 5
  else if (property.propertyType.toLowerCase().includes("villa")) mandateFit += 3
  else if (property.propertyType.toLowerCase().includes("townhouse")) mandateFit += 4
  if (marketContext.areaGrade === "A") mandateFit += 4
  else if (marketContext.areaGrade === "B") mandateFit += 3
  else mandateFit += 1
  if (property.bedrooms >= 1 && property.bedrooms <= 2) mandateFit += 4
  else if (property.bedrooms === 3) mandateFit += 2
  mandateFit = Math.min(25, mandateFit)

  // 2. MARKET TIMING (0-25)
  let marketTiming = 10
  if (marketContext.marketTrend === "rising") marketTiming += 4
  else if (marketContext.marketTrend === "stable") marketTiming += 2
  else marketTiming -= 3
  if (marketContext.tenantDemand === "high") marketTiming += 3
  else if (marketContext.tenantDemand === "low") marketTiming -= 2
  if (marketContext.newSupplyUnits > 4000) marketTiming -= 3
  else if (marketContext.newSupplyUnits < 1000) marketTiming += 2
  if (marketContext.averageDaysOnMarket <= 35) marketTiming += 2
  else if (marketContext.averageDaysOnMarket >= 60) marketTiming -= 2
  marketTiming = Math.max(0, Math.min(25, marketTiming))

  // 3. PORTFOLIO FIT (0-25)
  let portfolioFit = 10
  portfolioFit += Math.floor(marketContext.liquidityScore / 2)
  if (marketContext.tenantDemand === "high") portfolioFit += 5
  else if (marketContext.tenantDemand === "medium") portfolioFit += 3
  if (marketContext.occupancyRate >= 92) portfolioFit += 4
  else if (marketContext.occupancyRate >= 88) portfolioFit += 2
  else portfolioFit -= 2
  portfolioFit = Math.min(25, portfolioFit)

  // 4. RISK ALIGNMENT (0-25)
  let riskAlignment = 12
  if (marketContext.priceVolatility === "low") riskAlignment += 5
  else if (marketContext.priceVolatility === "medium") riskAlignment += 2
  else riskAlignment -= 2
  if (property.completionStatus === "ready") riskAlignment += 4
  else if (property.completionStatus === "off_plan") riskAlignment -= 3
  if (marketContext.averageDaysOnMarket <= 35) riskAlignment += 3
  else if (marketContext.averageDaysOnMarket <= 50) riskAlignment += 1
  // Developer risk penalty in fallback scoring
  if (!property.developer || property.developer.toLowerCase() === "unknown") riskAlignment -= 6
  riskAlignment = Math.max(0, Math.min(25, riskAlignment))

  const score = mandateFit + marketTiming + portfolioFit + riskAlignment

  const recommendation: EvaluationResult["recommendation"] =
    score >= 75 ? "strong_buy" :
    score >= 60 ? "buy" :
    score >= 45 ? "hold" : "pass"

  // Financial calculations
  const estimatedAnnualRent = estimatedMonthlyRent * 12
  const liquidityAdj = marketContext.liquidityScore >= 7 ? 0.98 : 0.96
  const recommendedOffer = Math.round(property.price * liquidityAdj)
  const stabilizedValue = Math.round(property.price * 1.08)
  const noi = Math.round(estimatedAnnualRent * 0.85) // 15% expenses
  const capRate = (noi / property.price) * 100
  const targetIrr = capRate + marketContext.historicalAppreciation
  const growth = buildGrowthAnalysis(property, marketContext, property.price, stabilizedValue)
  const returnBridge = buildReturnBridge(
    property.price,
    property.furnished ? 0 : Math.round(property.price * 0.02),
    growth.projectedValue5Y,
    5,
  )
  
  // Build key strengths and considerations
  const keyStrengths: string[] = []
  const considerations: string[] = []

  keyStrengths.push(`${marketContext.areaAverageYield}% yield potential in a ${marketContext.marketTrend} market`)
  if (marketContext.occupancyRate >= 90) {
    keyStrengths.push(`${marketContext.occupancyRate}% occupancy with ${marketContext.tenantDemand} tenant demand`)
  }
  if (marketContext.newSupplyUnits < 2000) {
    keyStrengths.push(`Limited supply pipeline (${marketContext.newSupplyUnits.toLocaleString()} units) supports pricing`)
  }
  if (keyStrengths.length === 0) {
    keyStrengths.push("Competitive entry point for the area")
  }

  if (marketContext.newSupplyUnits > 3000) considerations.push(`High supply: ${marketContext.newSupplyUnits.toLocaleString()} units in pipeline`)
  if (considerations.length === 0) considerations.push("Standard due diligence recommended")

  return {
    overallScore: score,
    factors: { mandateFit, marketTiming, portfolioFit, riskAlignment },
    headline: `Grade ${marketContext.areaGrade} ${property.area} - ${marketContext.marketTrend.toUpperCase()} demand`,
    reasoning: `${property.bedrooms}BR ${property.propertyType.toLowerCase()} with projected ${marketContext.areaAverageYield}% yield, ${marketContext.occupancyRate}% occupancy backdrop, and ${marketContext.marketTrend} market momentum.`,
    keyStrengths: keyStrengths.slice(0, 2),
    considerations: considerations.slice(0, 1),
    recommendation,
    
    // Rich IC Memo format
    analysis: {
      summary: `${property.bedrooms} bedroom ${property.propertyType.toLowerCase()} in ${property.area}, offering ${marketContext.areaAverageYield}% gross yield with ${marketContext.marketTrend} market dynamics.`,
      keyPoints: [
        `${capRate.toFixed(1)}% in-place cap rate with ${marketContext.rentalGrowth}% annual rent escalation potential`,
        `Vacancy at ${100 - marketContext.occupancyRate}% with ${marketContext.newSupplyUnits < 2000 ? "limited" : marketContext.newSupplyUnits.toLocaleString()} new supply through 2026`,
        `${property.area} Grade ${marketContext.areaGrade} location with ${marketContext.liquidityScore}/10 liquidity score`,
      ],
      
      neighborhood: {
        name: `${property.area} ${property.subArea ? `- ${property.subArea}` : ""}`,
        grade: marketContext.areaGrade,
        profile: `${marketContext.areaGrade === "A" ? "Premium" : marketContext.areaGrade === "B" ? "Established" : "Emerging"} ${property.area} location with ${marketContext.tenantDemand} tenant demand from ${marketContext.investorProfile === "core" ? "institutional" : "diverse"} occupier base.`,
        highlights: [
          `${marketContext.averageDaysOnMarket} day average time on market`,
          `${marketContext.historicalAppreciation}% historical price appreciation`,
          `${marketContext.tenantDemand.charAt(0).toUpperCase() + marketContext.tenantDemand.slice(1)} rental demand with ${marketContext.occupancyRate}% occupancy`,
        ],
        metrics: [
          { label: "Vacancy", value: `${(100 - marketContext.occupancyRate).toFixed(1)}%`, trend: `↓ YoY` },
          { label: "Avg Rent", value: `AED ${Math.round(marketContext.areaMedianPricePerSqft * 0.06 / 12)} / sq ft`, trend: `+${marketContext.rentalGrowth}% YoY` },
          { label: "Absorption 2024", value: `${Math.round(marketContext.newSupplyUnits * 0.8).toLocaleString()} sq ft`, trend: "Strong" },
          { label: "Pipeline", value: `${marketContext.newSupplyUnits.toLocaleString()} units`, trend: marketContext.newSupplyUnits > 3000 ? "High" : "Moderate" },
        ],
      },
      
      property: {
        description: `${property.size ? `${property.size.toLocaleString()} sq ft` : ""} ${property.propertyType.toLowerCase()} ${property.bedrooms}BR/${property.bathrooms}BA${property.buildingName ? ` in ${property.buildingName}` : ""}. ${property.furnished ? "Fully furnished" : "Unfurnished"}. ${property.completionStatus === "ready" || property.completionStatus === "unknown" ? "Ready for immediate occupation" : `Off-plan with ${property.handoverDate || "TBC"} handover${property.developer ? ` by ${property.developer}` : ""}`}.${property.plotSize ? ` Plot: ${property.plotSize.toLocaleString()} sq ft.` : ""}`,
        condition: property.completionStatus === "ready" || property.completionStatus === "unknown"
          ? "Ready, well-maintained"
          : `Off-plan - ${property.developer || "Developer TBC"}`,
        specs: [
          { label: "Size", value: property.size ? `${property.size.toLocaleString()} sq ft` : "TBC" },
          ...(property.plotSize ? [{ label: "Plot Size", value: `${property.plotSize.toLocaleString()} sq ft` }] : []),
          { label: "Bedrooms", value: `${property.bedrooms} BR` },
          { label: "Bathrooms", value: `${property.bathrooms} BA` },
          { label: "Parking", value: property.totalParkingSpaces ? `${property.totalParkingSpaces} space(s)` : property.parking ? `${property.parking} space(s)` : "TBC" },
          { label: "Service Charge", value: `AED ${property.serviceCharge || 18}/sq ft (est.)` },
          { label: "Furnished", value: property.furnished ? "Yes" : "No" },
          { label: "Status", value: property.completionStatus === "ready" ? "Ready" : property.completionStatus === "under_construction" ? "Under Construction" : property.completionStatus === "off_plan" ? "Off-Plan" : "Ready" },
          ...(property.developer ? [{ label: "Developer", value: property.developer }] : []),
          ...(property.buildingFloors ? [{ label: "Floors", value: `${property.buildingFloors}` }] : []),
        ],
        highlights: property.amenities.slice(0, 6).map(a => a),
      },
      
      market: {
        overview: `${property.area} is showing ${marketContext.marketTrend} dynamics with ${marketContext.historicalAppreciation}% YoY appreciation and ${marketContext.areaAverageYield}% average yields.`,
        drivers: [
          `${marketContext.marketTrend === "rising" ? "Strong" : "Stable"} demand from ${marketContext.investorProfile} investors`,
          `${marketContext.rentalGrowth}% rental growth trajectory`,
          `${marketContext.newSupplyUnits < 2000 ? "Limited" : "Moderate"} new supply maintains pricing power`,
        ],
        supply: `${marketContext.newSupplyUnits.toLocaleString()} units in pipeline, ${Math.round(marketContext.newSupplyUnits * 0.35).toLocaleString()} pre-sold`,
        demand: `${marketContext.tenantDemand.charAt(0).toUpperCase() + marketContext.tenantDemand.slice(1)} demand from end-users and investors seeking ${marketContext.areaAverageYield}%+ yields`,
        absorption: `${Math.round(marketContext.newSupplyUnits * 0.8).toLocaleString()} sq ft absorbed in 2024, ${marketContext.areaGrade === "A" ? "highest" : "strong"} in segment`,
      },
      growth,
      
      pricing: {
        askingPrice: property.price,
        pricePerSqft: property.pricePerSqft,
        marketAvgPricePerSqft: null,
        recommendedOffer,
        stabilizedValue,
        valueAddBudget: property.furnished ? 0 : Math.round(property.price * 0.02),
        rentCurrent: Math.round(estimatedAnnualRent),
        rentPotential: Math.round(estimatedAnnualRent * 1.1),
        irr: targetIrr / 100,
        equityMultiple: 1 + (targetIrr * 5) / 100,
      },
      
      comparables: [
        {
          name: `${property.area} Tower - Similar Unit`,
          distance: "0.3 km",
          size: property.size ? `${property.size.toLocaleString()} sq ft` : "Similar",
          closingDate: "Q4 2025",
          price: Math.round(property.price * 1.02),
          pricePerSqft: Math.round(marketContext.areaMedianPricePerSqft * 1.02),
          provenanceLabel: "[AI Estimate]",
          note: "AI-generated comparable — no recorded DLD transaction. Treat as indicative only.",
        },
        {
          name: `${property.area} - Nearby Building`,
          distance: "0.5 km",
          size: property.size ? `${Math.round(property.size * 1.1).toLocaleString()} sq ft` : "Larger",
          closingDate: "Q3 2025",
          price: Math.round(property.price * 0.98),
          pricePerSqft: Math.round(marketContext.areaMedianPricePerSqft * 0.95),
          provenanceLabel: "[AI Estimate]",
          note: "AI-generated comparable — estimated from area median data.",
        },
      ],
      
      strategy: {
        plan: `Acquire with disciplined entry terms, optimize rental income, and ${marketContext.marketTrend === "rising" ? "benefit from appreciation" : "hold for stable yield"}.`,
        holdPeriod: "5 years",
        exit: `Sell to ${marketContext.investorProfile === "core" ? "institutional buyer or income fund" : "private investor or end-user"}`,
        focusPoints: [
          "Negotiate 2-4% discount at offer stage",
          "Verify service charges and confirm capped rates if available",
          `Target market rent of AED ${Math.round(estimatedMonthlyRent * 1.05).toLocaleString()}/month at first renewal`,
          `Underwrite to AED ${growth.projectedValue5Y.toLocaleString()} 5-year value in base case (${growth.annualGrowthBase}% annual growth)`,
        ],
      },
      
      investmentThesis: `The property aligns with ${marketContext.investorProfile === "core" ? "Core" : marketContext.investorProfile === "core_plus" ? "Core Plus" : "Value-Add"} strategy, offering ${marketContext.areaAverageYield > 6 ? "attractive yield" : "stable income"} with ${marketContext.marketTrend === "rising" ? "appreciation upside" : "defensive characteristics"}.`,

      developerProfile: (() => {
        const devName = resolveDevName(property)
        const devUnverified = devName === "Unverified Developer"
        const tier1 = ["emaar", "nakheel", "damac", "meraas", "aldar", "dubai properties", "sobha", "omniyat", "select group", "azizi", "majid al futtaim"]
        const isTier1 = !devUnverified && tier1.some(t => devName.toLowerCase().includes(t))
        const tier = devUnverified ? "unknown" as const : isTier1 ? "tier_1" as const : "tier_2" as const

        return {
          name: devName,
          tier,
          overview: devUnverified
            ? "Developer identity could not be confirmed from available listing data. This is a significant data gap requiring immediate resolution — no basis exists to assess delivery capability, financial strength, or quality history."
            : isTier1
              ? `${devName} is a Tier 1 developer in the UAE — publicly listed or a major established group with an extensive portfolio of completed projects and a recognizable brand. As one of the top developers in the Dubai market, they bring significant credibility to this investment.`
              : `${devName} is an active developer in the Dubai real estate market. Specific delivery history and financial stability require independent verification through RERA records before capital deployment.`,
          trackRecord: devUnverified
            ? "No track record data available. RERA registration, escrow account status, completion history, and litigation records must be verified independently before proceeding."
            : isTier1
              ? `${devName} has a generally strong track record delivering large-scale projects in the UAE. Their portfolio demonstrates consistent build quality, with post-handover management services available for buyers. Verify specific project completion timelines for any recent developments.`
              : `${devName} has delivered projects in the Dubai market. Specific completion timelines and quality assessments should be verified through RERA records and conversations with prior buyers.`,
          notableProjects: devUnverified ? [] : isTier1 ? [`${devName} landmark developments across Dubai`] : [`${devName} developments in ${property.area}`],
          strengths: devUnverified
            ? []
            : isTier1
              ? ["Established brand and strong market trust", "Proven delivery track record at scale", "Strong resale value retention vs lesser-known developers", "Listed/regulated with public accountability"]
              : ["Active developer with market presence"],
          concerns: devUnverified
            ? ["Developer unverified — delivery risk, quality risk, and escrow risk are all unquantifiable", "Escrow status unknown", "No track record to assess"]
            : isTier1
              ? ["Premium developer brand typically commands premium pricing that can compress yield", "Large project scale means less bespoke attention per unit"]
              : ["Independent delivery track record verification required", "Escrow registration must be confirmed with RERA"],
          escrowStatus: devUnverified ? "Unknown — must be verified immediately with RERA/DLD" : "Verification recommended via RERA portal",
          riskAssessment: devUnverified
            ? "ELEVATED RISK: Unverified developer is the single largest risk factor in this analysis. Without confirmed identity, there is no basis to assess construction quality, delivery probability, or financial stability. Any investment approval must be conditional on full developer verification."
            : isTier1
              ? `LOW RISK: ${devName} is an established Tier 1 developer with strong market credibility. Developer risk is well below sector average, though standard escrow verification and SPA review remain mandatory.`
              : `MODERATE RISK: ${devName} is present in the market but requires independent verification of their delivery record. Review RERA complaint filings and speak with prior buyers before committing capital.`,
        }
      })(),

      investmentDecision: (() => {
        const devName = property.developer || "Unknown"
        const devUnknown = !property.developer || property.developer.toLowerCase() === "unknown"
        const verdict = score >= 60 ? "PROCEED" as const : score >= 45 ? "CONDITIONAL" as const : "PASS" as const
        const confidence = devUnknown ? "low" as const : marketContext.liquidityScore >= 7 ? "high" as const : "medium" as const

        const yieldAssessment = marketContext.areaAverageYield >= 7 ? "attractive" : marketContext.areaAverageYield >= 5 ? "acceptable" : "below target"
        const trendAssessment = marketContext.marketTrend === "rising" ? "positive momentum" : marketContext.marketTrend === "stable" ? "stable conditions" : "softening conditions"

        return {
          verdict,
          confidenceLevel: confidence,
          rationale: verdict === "PROCEED"
            ? `This ${property.bedrooms}BR ${property.propertyType.toLowerCase()} in ${property.area} presents a sound investment case. At AED ${property.price.toLocaleString()} (AED ${property.pricePerSqft?.toLocaleString() ?? "N/A"}/sqft), the entry point is ${marketContext.areaAverageYield >= 6 ? "supported by" : "partially offset by"} an estimated ${marketContext.areaAverageYield}% gross yield, translating to approximately AED ${Math.round(estimatedMonthlyRent).toLocaleString()}/month in rental income. The ${property.area} micro-market shows ${trendAssessment} with ${marketContext.historicalAppreciation}% historical appreciation, ${marketContext.occupancyRate}% occupancy, and ${marketContext.tenantDemand} tenant demand.\n\nThe financial structure supports a ${Math.round(capRate * 10) / 10}% cap rate with projected ${growth.annualGrowthBase}% annual value appreciation over a 5-year hold. Key value drivers include ${marketContext.newSupplyUnits < 2000 ? "limited competing supply" : "strong area fundamentals"} and ${marketContext.liquidityScore >= 7 ? "high exit liquidity" : "reasonable exit prospects"}. ${devUnknown ? "However, the unknown developer status is a material concern that must be resolved." : `${devName} provides ${devName.toLowerCase().includes("emaar") || devName.toLowerCase().includes("nakheel") ? "strong" : "adequate"} developer credibility.`}`
            : verdict === "CONDITIONAL"
              ? `This property has potential but presents material concerns that must be addressed before capital deployment. At AED ${property.price.toLocaleString()}, the ${yieldAssessment} yield of ${marketContext.areaAverageYield}% and ${trendAssessment} in ${property.area} provide a baseline investment case. However, ${devUnknown ? "the unknown developer represents a critical risk — without verified track record, escrow status, and financial stability, the delivery risk is unquantifiable" : "certain factors require additional verification"}.\n\nThe underwriting assumes ${growth.annualGrowthBase}% annual growth and ${marketContext.occupancyRate}% occupancy, which ${marketContext.marketTrend === "rising" ? "are supported by current trends" : "should be stress-tested against downside scenarios"}. ${marketContext.newSupplyUnits > 2000 ? `The supply pipeline of ${marketContext.newSupplyUnits.toLocaleString()} units introduces absorption risk.` : ""} This investment can proceed ONLY once the stated conditions are met.`
              : `This property does not meet the threshold for investment recommendation at current terms. The combination of ${devUnknown ? "unknown developer, " : ""}${marketContext.marketTrend === "declining" ? "declining market conditions, " : ""}${marketContext.areaAverageYield < 5 ? "below-target yield, " : ""}and ${score < 35 ? "fundamental structural concerns" : "multiple risk factors"} makes the risk-reward profile unattractive.\n\nAt AED ${property.price.toLocaleString()}, the property would need to demonstrate ${marketContext.areaAverageYield < 6 ? "materially higher rental yields" : "stronger capital growth prospects"} or a significant price correction to become viable. We recommend monitoring the asset for price adjustments and revisiting if conditions change.`,
          keyDrivers: [
            `${yieldAssessment.charAt(0).toUpperCase() + yieldAssessment.slice(1)} yield at ${marketContext.areaAverageYield}% gross`,
            `${trendAssessment.charAt(0).toUpperCase() + trendAssessment.slice(1)} in ${property.area}`,
            `${devUnknown ? "Unknown developer — critical risk" : `${devName} developer credibility`}`,
            `${marketContext.newSupplyUnits < 2000 ? "Favorable" : "Elevated"} supply dynamics (${marketContext.newSupplyUnits.toLocaleString()} units)`,
          ],
          conditionsToMeet: verdict === "PASS" ? [] : [
            ...(devUnknown ? ["Verify developer identity and RERA registration", "Confirm escrow account status"] : []),
            "Complete site inspection / unit inspection",
            "Verify service charges and any capped-rate agreements",
            ...(property.completionStatus === "off_plan" ? ["Verify construction progress and milestone schedule"] : []),
            "Confirm rental comparable rates with at least 2 active market listings",
          ],
          dealBreakers: [
            ...(devUnknown ? ["Developer cannot be identified or has RERA complaints/defaults"] : []),
            "Escrow account not registered or underfunded",
            `Achievable rent below AED ${Math.round(estimatedMonthlyRent * 0.8).toLocaleString()}/month (20% below underwriting)`,
            "Material undisclosed defects or pending litigation on the property",
          ],
          suggestedNextSteps: [
            ...(devUnknown ? ["Run developer background check via RERA and DLD records"] : []),
            verdict !== "PASS" ? "Schedule site visit within 2 weeks" : "Monitor for 15%+ price reduction",
            verdict !== "PASS" ? "Obtain 3 rental comparables from active Bayut/PF listings" : "Set price alert on portal",
            verdict !== "PASS" ? "Request SPA template and review with legal counsel" : "Explore alternative properties in the pipeline",
          ],
          exitStrategy: `Recommended exit via ${marketContext.investorProfile === "core" ? "direct sale to institutional buyer or REIT" : "open market listing"} after ${score >= 60 ? "3-5" : "5-7"} year hold period. Target buyer profile: ${marketContext.investorProfile === "core" ? "income-focused institutional investors" : "end-users or private investors"} seeking ${property.area} exposure. Projected exit value: AED ${growth.projectedValue5Y.toLocaleString()} (base case). Pre-exit strategy: optimize rental yield to maximize cap-rate-based valuation.`,
          timelineGuidance: verdict === "PROCEED"
            ? `Act within 2-4 weeks — ${marketContext.marketTrend === "rising" ? "rising market conditions favor early entry" : "stable conditions allow measured due diligence"}.`
            : verdict === "CONDITIONAL"
              ? "Address conditions within 4-6 weeks. Do not deploy capital until all conditions are met."
              : "No urgency to act. Monitor the asset and revisit if pricing or conditions materially improve.",
        }
      })(),
      
      financialAnalysis: {
        noi,
        capRate: Math.round(capRate * 10) / 10,
        targetIrr: Math.round(targetIrr * 10) / 10,
        holdPeriod: "5 years",
        returnBridge,
      },
      
      risks: [
        ...(resolveDevName(property) === "Unverified Developer" ? [{
          risk: "Unverified developer — delivery risk, quality risk, and escrow risk are all unquantifiable",
          mitigation: "Must verify developer identity, RERA registration, escrow account, and completed project portfolio before any capital commitment",
        }] : []),
        {
          risk: marketContext.newSupplyUnits > 2000 ? "High new supply in pipeline" : "Market conditions may change",
          mitigation: marketContext.newSupplyUnits > 2000 ? "Focus on premium positioning and tenant retention" : "Maintain flexible exit timeline",
        },
        {
          risk: "Service charges may increase above current estimate",
          mitigation: "Negotiate capped service charge clause if available; factor 3–5% annual escalation into projections",
        },
        {
          risk: "Rental market competition from comparable new supply",
          mitigation: `Premium amenities and ${property.furnished ? "furniture package" : "competitive pricing strategy"} differentiate offering`,
        },
      ],
      
      finalRecommendation: {
        decision: score >= 60 ? "PROCEED" : score >= 45 ? "CONDITIONAL" : "PASS",
        condition: score >= 60 ? "Subject to site inspection and final due diligence" : score >= 45 ? "Subject to price negotiation and mandate alignment" : "Does not meet investment criteria at current terms",
      },

      /* ---- New narrative-rich fields (fallback values) ---- */
      riskMatrix: buildFallbackRiskMatrix(property, marketContext),

      stressTests: buildFallbackStressTests(
        property,
        marketContext,
        estimatedMonthlyRent * 12,
        property.serviceCharge ? property.serviceCharge * (property.size ?? 1000) : 18000,
        Math.round(property.price * 0.36),
      ),

      dataGaps: buildFallbackDataGaps(property, false),

      neighborhoodBenchmarks: buildFallbackNeighborhoodBenchmarks(property, marketContext),

      enhancedDeveloperProfile: (() => {
        const devName = resolveDevName(property)
        const devUnverified = devName === "Unverified Developer"
        const tier1Names = ["emaar", "nakheel", "damac", "meraas", "aldar", "dubai properties", "sobha", "omniyat", "select group", "azizi", "majid al futtaim"]
        const isTier1 = !devUnverified && tier1Names.some(t => devName.toLowerCase().includes(t))
        const tier = devUnverified ? "unverified" as const : isTier1 ? "tier_1" as const : "tier_2" as const
        return {
          name: devName,
          legalName: devUnverified ? "Not confirmed" : devName,
          tier,
          tierLabel: devUnverified ? "Unverified — Cannot Confirm" : isTier1 ? "Tier 1 — Publicly Listed / Major Group" : "Tier 2 — Established Private Developer",
          founded: "Not confirmed",
          listingStatus: isTier1 ? "public" as const : devUnverified ? "unknown" as const : "private" as const,
          exchange: isTier1 ? "Verify via stock exchange" : undefined,
          marketCap: isTier1 ? "Verify via public records" : undefined,
          unitsDelivered: isTier1 ? "10,000+" : devUnverified ? "Not confirmed" : "Verify independently",
          notableProjects: devUnverified ? [] : isTier1 ? [`${devName} landmark developments`] : [`Developments in ${property.area}`],
          deliveryTrackRecord: devUnverified ? "unknown" as const : isTier1 ? "on_time" as const : "unknown" as const,
          buildQuality: devUnverified ? "unknown" as const : isTier1 ? "premium" as const : "unknown" as const,
          overview: devUnverified
            ? `Developer identity could not be confirmed from available listing data. The listing references no developer name, or only a generic/unverifiable name. This is a material data gap. Before any investment decision, the developer must be identified and verified against the RERA developer registry at dubailand.gov.ae. An unverified developer means delivery risk, quality risk, and escrow risk are all unquantifiable — any pre-approval must be explicitly conditional.\n\nInvestors should request the Oqood registration certificate (off-plan project registration with DLD), the escrow account number, and a list of completed projects with buyer references. Do not release any funds until verification is complete.`
            : isTier1
              ? `${devName} is one of the UAE's leading real estate developers, with a publicly recognized brand and an extensive portfolio spanning residential, commercial, and mixed-use developments across Dubai and internationally. As a Tier 1 developer, they bring significant institutional credibility to any off-plan or ready purchase.\n\nTheir projects are consistently registered with RERA, with escrow accounts properly constituted and regularly audited. Build quality is generally considered premium to high across their portfolio. Independent verification of specific project escrow status and completion timelines is still recommended as standard practice.`
              : `${devName} is an active developer in the Dubai real estate market. Detailed verification of their project completion history, RERA standing, and escrow compliance is required before capital commitment.\n\nRequest completed project references, RERA registration certificate, and escrow account details. Conduct a site visit to at least one completed ${devName} development before committing to an off-plan purchase.`,
          riskAssessment: devUnverified
            ? "ELEVATED RISK: This is the single highest-priority risk in this analysis. Without developer confirmation, no meaningful risk assessment can be performed on delivery, quality, or capital recovery. Treat as HIGH RISK until resolved."
            : isTier1
              ? `LOW RISK: ${devName}'s established track record, public accountability, and RERA compliance materially reduce developer-related risk. Standard escrow verification and SPA legal review remain mandatory. The primary developer risk for Tier 1 is pricing premium — verify that the price per sqft reflects genuine value rather than brand premium alone.`
              : `MODERATE RISK: ${devName} requires independent due diligence. Verify RERA registration, escrow account, and delivery history. Risk is manageable with proper verification but cannot be assumed low.`,
          concerns: devUnverified
            ? ["Developer unverified — cannot assess delivery capability", "Escrow status unknown", "Quality track record unavailable"]
            : isTier1
              ? ["Brand premium may be priced into the asking price — verify value vs comparables"]
              : ["Independent delivery history verification required", "Escrow registration must be confirmed"],
          escrowStatus: devUnverified ? "Unknown — verify immediately with RERA" : "Confirm via RERA portal before SPA signature",
        }
      })(),

      plainEnglishThesis: (() => {
        const devName = resolveDevName(property)
        const isOffPlan = property.completionStatus === "off_plan" || property.completionStatus === "under_construction"
        const yieldStr = `${marketContext.areaAverageYield.toFixed(1)}%`
        return `This report analyzes a ${property.bedrooms}-bedroom ${property.propertyType.toLowerCase()} in ${property.area}, ${property.subArea ? `${property.subArea}, ` : ""}priced at AED ${property.price.toLocaleString()}${property.pricePerSqft ? ` (AED ${property.pricePerSqft.toLocaleString()} per square foot)` : ""}. ${isOffPlan ? `This is an off-plan purchase — meaning you are buying the property before it is built, paying in installments over the construction period, with final handover expected ${property.handoverDate ? `around ${property.handoverDate}` : "at a future date to be confirmed"}. Off-plan investments typically offer lower entry prices than completed units but carry construction and delivery risk.` : "The property is ready for immediate occupation or rental."}\n\n${property.area} is a ${marketContext.areaGrade}-grade location in Dubai with ${marketContext.historicalAppreciation}% historical annual price appreciation and an estimated ${yieldStr} gross rental yield. ${marketContext.marketTrend === "rising" ? "The area is currently in a rising price cycle." : marketContext.marketTrend === "stable" ? "The area shows stable pricing with resilient demand." : "The area is currently in a softer pricing phase."} Developer: ${devName}. ${devName === "Unverified Developer" ? "IMPORTANT: The developer has not been confirmed — this is a significant data gap that must be resolved before any capital commitment." : ""}\n\nThe opportunity thesis rests on ${marketContext.tenantDemand} rental demand, a ${yieldStr} income profile, and expected capital appreciation over a 5-year hold period. Key risks include ${isOffPlan ? "construction delivery uncertainty, " : ""}market price volatility, and the area's current stage of infrastructure maturity. The score of this property reflects a balanced view of upside potential against these risks — see the Risk Assessment section for a full probability-impact analysis.`
      })(),

      executionSteps: [
        `Verify ${resolveDevName(property) === "Unverified Developer" ? "developer identity" : resolveDevName(property)} against RERA/DLD registry and confirm escrow account status`,
        "Engage independent legal counsel (not developer-recommended) to review SPA before any payment",
        "Request and review the specific unit floor plan and confirm unit number, floor level, and view direction",
        "Conduct a site visit to assess construction progress and current area amenities",
        "Pull fresh comparable transactions from DLD registry within 1km radius (last 6 months)",
        "Confirm payment schedule in writing and model full cash flow including construction period",
        "Obtain written service charge confirmation from developer or RERA filing",
        "Check residency visa eligibility (Dubai: AED 750K threshold for 2-year visa, AED 2M for Golden Visa)",
        ...(property.completionStatus === "off_plan" ? ["If financing planned: get pre-approval from at least 2 UAE banks — confirm they lend on off-plan from this developer"] : ["If financing planned: obtain mortgage pre-approval before SPA to confirm loan terms"]),
        "Set a milestone monitoring calendar: note catalyst infrastructure timelines (metro, mall opening) and review investment thesis at each milestone",
      ],

      scoringMethodology: {
        dimensions: [
          { name: "Mandate Fit", weight: "0–25 pts", description: "Property type, area grade (A/B/C/D), price point, yield alignment (5–8% target), bedroom configuration (1–2BR highest demand)" },
          { name: "Market Timing", weight: "0–25 pts", description: "Market trend (rising/stable/declining), supply pipeline risk, days-on-market velocity, rental growth trajectory" },
          { name: "Portfolio Fit", weight: "0–25 pts", description: "Area liquidity score, diversification value, tenant demand depth, occupancy profile, institutional appeal" },
          { name: "Risk Alignment", weight: "0–25 pts", description: "Price volatility (lower = higher score), completion status penalty for off-plan, developer quality impact, service charge risk, exit liquidity score" },
        ],
        bands: [
          { range: "80–100", label: "Strong Buy", action: "Priority capital deployment — act within 1–2 weeks" },
          { range: "65–79", label: "Buy", action: "Proceed with standard diligence — 2–4 week timeline" },
          { range: "50–64", label: "Conditional", action: "Address specific conditions before deploying capital" },
          { range: "35–49", label: "Hold / Monitor", action: "Significant concerns — monitor only, do not commit" },
          { range: "0–34", label: "Pass", action: "Does not meet investment criteria at current terms" },
        ],
        keyFactorsUp: [
          `${marketContext.areaAverageYield}% estimated yield (${marketContext.areaAverageYield >= 6 ? "above" : "at"} target range)`,
          `${marketContext.areaGrade}-grade location with ${marketContext.tenantDemand} tenant demand`,
          `${marketContext.liquidityScore}/10 liquidity score`,
        ],
        keyFactorsDown: [
          ...(resolveDevName(property) === "Unverified Developer" ? ["Unverified developer — score capped and risk elevated"] : []),
          ...(property.completionStatus === "off_plan" ? ["Off-plan status introduces delivery and construction risk"] : []),
          ...(marketContext.newSupplyUnits > 3000 ? [`High supply pipeline: ${marketContext.newSupplyUnits.toLocaleString()} units`] : []),
          ...(marketContext.priceVolatility === "high" ? ["High price volatility reduces risk alignment score"] : []),
        ],
      },
    },
  }
}

export async function POST(req: Request) {
  try {
    // Check authentication and get context
    const ctx = await requireAuthContext(req)
    
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 })
    }
    
    // Get tenant's plan and check AI evaluation limit
    const supabase = getSupabaseAdminClient()
    const { data: tenant } = await supabase
      .from("tenants")
      .select("plan")
      .eq("id", ctx.tenantId)
      .single()
    
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }
    
    const plan = tenant.plan as PlanTier
    const canEvaluate = await canRunAIEvaluation(ctx.tenantId, plan)
    
    if (!canEvaluate.allowed) {
      return NextResponse.json(
        { 
          error: "AI evaluation limit reached", 
          limitReached: true,
          current: canEvaluate.current,
          limit: canEvaluate.limit,
          plan,
        },
        { status: 429 }
      )
    }
    
    const validation = await validateRequest(req, propertyEvaluationSchema)
    if (!validation.success) {
      return validation.error
    }

    const { property } = validation.data

    // Get market context for the property's area (queries DLD DB, falls back to lookup)
    const marketContext = await getMarketContext(
      property.area,
      property.propertyType,
      property.bedrooms
    )

    // Calculate price vs market
    marketContext.priceVsMarket = 0

    // Evaluate with AI (or fallback)
    const evaluation = await evaluateWithAI(property, marketContext)

    // ── Underwriting Guards ──────────────────────────────────────
    // Apply investment-grade discipline on top of AI output
    const {
      applyDeveloperRiskGate,
      generateMandatoryRisks,
      buildSensitivityAnalysis,
      validateComparables,
      assessDataConfidence,
      runUnderwritingChecklist,
    } = await import("@/lib/underwriting/guards")

    const isOffPlan = property.completionStatus === "off_plan" || property.completionStatus === "under_construction"

    // 1. Developer risk gate — cap recommendation for unknown developers
    const devGate = applyDeveloperRiskGate({
      developer: property.developer,
      completionStatus: property.completionStatus,
      handoverDate: property.handoverDate,
      currentRecommendation: evaluation.recommendation,
      currentScore: evaluation.overallScore,
    })
    if (devGate.penaltyApplied) {
      evaluation.overallScore = devGate.score
      evaluation.recommendation = devGate.recommendation as EvaluationResult["recommendation"]
      // Merge conditions into final recommendation
      if (evaluation.analysis?.finalRecommendation) {
        evaluation.analysis.finalRecommendation.decision =
          devGate.recommendation === "hold" || devGate.recommendation === "pass" ? "CONDITIONAL" : evaluation.analysis.finalRecommendation.decision
        evaluation.analysis.finalRecommendation.condition =
          devGate.conditions.join(". ") + (evaluation.analysis.finalRecommendation.condition ? ". " + evaluation.analysis.finalRecommendation.condition : "")
      }
      evaluation.considerations = [
        ...(evaluation.considerations || []),
        ...devGate.conditions,
      ]
    }

    // 2. Mandatory sensitivity analysis (deterministic, never AI-generated)
    const sensitivityAnalysis = buildSensitivityAnalysis({
      currentValue: property.price,
      annualRent: (property.price * (marketContext.areaAverageYield / 100)),
      annualExpenses: (property.price * (marketContext.areaAverageYield / 100)) * 0.15,
      equityInvested: Math.round(property.price * 0.36),
      baseGrowthRate: evaluation.analysis?.growth?.annualGrowthBase ?? marketContext.historicalAppreciation,
      holdYears: 5,
      isOffPlan,
    })

    // 3. Risk matrix with probability-impact scoring
    const scoredRisks = generateMandatoryRisks({
      developer: property.developer,
      completionStatus: property.completionStatus,
      handoverDate: property.handoverDate,
      newSupplyUnits: marketContext.newSupplyUnits,
      priceVolatility: marketContext.priceVolatility,
      area: property.area,
      areaGrade: marketContext.areaGrade,
    })

    // 4. Data confidence assessment
    const dldCompsCount = 0 // Will be updated after enhanced PDF data
    const dataConfidence = assessDataConfidence({
      developer: property.developer,
      completionStatus: property.completionStatus,
      dldCompsCount, // placeholder, updated below
      hasDLDAreaData: marketContext.areaMedianPricePerSqft > 0,
      sourceType: property.source || "portal",
      verified: property.verified ?? false,
    })

    // Build enhanced PDF data (cash flow, expenses, scenarios, DLD comps)
    let enhancedPdfData: EnhancedPdfData | null = null
    try {
      enhancedPdfData = await buildEnhancedPdfData(property as PropertyData, marketContext, evaluation)

      // 5. Validate comparables after build
      if (enhancedPdfData?.comparables) {
        const validated = validateComparables(
          enhancedPdfData.comparables.map(c => ({ ...c, name: c.name ?? "" })),
          property.area
        )
        // Attach confidence to each comparable
        enhancedPdfData.comparables = validated as unknown as typeof enhancedPdfData.comparables
      }

      // Update data confidence with actual DLD comp count
      const actualDldComps = (enhancedPdfData?.comparables ?? []).filter(
        (c) => (c as unknown as { source?: string }).source === "DLD"
      ).length
      dataConfidence.score = Math.min(100, dataConfidence.score + actualDldComps * 4)
      dataConfidence.level = dataConfidence.score >= 70 ? "high" : dataConfidence.score >= 40 ? "medium" : "low"

      // Update data gaps in analysis with actual DLD availability
      if (evaluation.analysis?.dataGaps) {
        const txnGap = evaluation.analysis.dataGaps.find(g => g.field === "Transaction data")
        if (txnGap) {
          txnGap.status = actualDldComps > 0 ? "verified" : "assumed"
          txnGap.detail = actualDldComps > 0
            ? `${actualDldComps} DLD registry records found`
            : "No verified DLD transactions — all comparables are AI-estimated"
        }
      } else if (!evaluation.analysis?.dataGaps) {
        evaluation.analysis.dataGaps = buildFallbackDataGaps(property as PropertyData, actualDldComps > 0)
      }
    } catch (err) {
      console.warn("[evaluate] Enhanced PDF data build failed (non-fatal):", err)
    }

    // 6. Pre-flight underwriting checklist
    const underwritingChecklist = runUnderwritingChecklist({
      developer: property.developer,
      completionStatus: property.completionStatus,
      handoverDate: property.handoverDate,
      dldCompsCount: (enhancedPdfData?.comparables ?? []).filter(
        (c) => (c as unknown as { source?: string }).source === "DLD"
      ).length,
      hasDLDAreaData: marketContext.areaMedianPricePerSqft > 0,
      hasSensitivityAnalysis: true,
      hasRiskMatrix: true,
      hasPaymentPlanModeling: !!property.paymentPlan,
      sourceType: property.source || "portal",
      isOffPlan,
    })
    
    // Log the AI evaluation for usage tracking
    try {
      await supabase.rpc("log_property_intake_action", {
        p_tenant_id: ctx.tenantId,
        p_user_id: ctx.userId,
        p_listing_id: property.listingId || null,
        p_action: "ai_evaluation",
        p_details: {
          property_title: property.title,
          area: property.area,
          price: property.price,
        },
      })
    } catch (logError) {
      console.error("Failed to log AI evaluation:", logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      evaluation,
      marketContext,
      enhancedPdfData,
      // Underwriting quality layer
      underwriting: {
        sensitivityAnalysis,
        scoredRisks,
        dataConfidence,
        checklist: underwritingChecklist,
        developerGate: devGate.penaltyApplied ? {
          penaltyApplied: true,
          originalRecommendation: evaluation.recommendation,
          conditions: devGate.conditions,
        } : null,
      },
    })
  } catch (error) {
    console.error("Property evaluation error:", error)
    return NextResponse.json(
      { error: "Failed to evaluate property" },
      { status: 500 }
    )
  }
}
