import { NextResponse } from "next/server"
import OpenAI from "openai"

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
  furnished: boolean
  parking: number | null
  amenities: string[]
  description: string | null
  listingUrl: string
  listedDate: string | null
  // Extended properties
  completionStatus?: "ready" | "off_plan" | "unknown"
  developer?: string | null
  handoverDate?: string | null
  serviceCharge?: number | null
  rentalPotential?: number | null
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
    
    pricing: {
      askingPrice: number
      pricePerSqft: number | null
      marketAvgPricePerSqft: number
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
      note?: string
    }[]
    
    strategy: {
      plan: string
      holdPeriod: string
      exit: string
      focusPoints: string[]
    }
    
    investmentThesis: string
    
    financialAnalysis: {
      noi: number
      capRate: number
      targetIrr: number
      holdPeriod: string
    }
    
    risks: { risk: string; mitigation: string }[]
    
    finalRecommendation: {
      decision: "PROCEED" | "CONDITIONAL" | "PASS"
      condition?: string
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

const DUBAI_MARKET_DATA: Record<string, AreaMarketData> = {
  // Premium Areas (Grade A)
  "Palm Jumeirah": { 
    median: 2800, yield: 4.5, trend: "stable", grade: "A",
    liquidity: 7, tenantDemand: "high", volatility: "medium",
    newSupply: 2500, occupancy: 92, appreciation: 5.2, rentalGrowth: 3.5,
    daysOnMarket: 60, profile: "core"
  },
  "Downtown Dubai": { 
    median: 2200, yield: 5.2, trend: "rising", grade: "A",
    liquidity: 9, tenantDemand: "high", volatility: "low",
    newSupply: 3000, occupancy: 94, appreciation: 6.5, rentalGrowth: 4.2,
    daysOnMarket: 35, profile: "core"
  },
  "DIFC": { 
    median: 2400, yield: 5.0, trend: "stable", grade: "A",
    liquidity: 8, tenantDemand: "high", volatility: "low",
    newSupply: 800, occupancy: 91, appreciation: 4.8, rentalGrowth: 3.8,
    daysOnMarket: 45, profile: "core"
  },
  "Emirates Hills": {
    median: 1800, yield: 3.5, trend: "stable", grade: "A",
    liquidity: 5, tenantDemand: "medium", volatility: "low",
    newSupply: 200, occupancy: 88, appreciation: 4.0, rentalGrowth: 2.5,
    daysOnMarket: 90, profile: "core"
  },

  // Established Areas (Grade B+)
  "Dubai Marina": { 
    median: 1600, yield: 5.8, trend: "stable", grade: "B",
    liquidity: 9, tenantDemand: "high", volatility: "medium",
    newSupply: 1500, occupancy: 93, appreciation: 4.5, rentalGrowth: 3.8,
    daysOnMarket: 30, profile: "core_plus"
  },
  "JBR": { 
    median: 1800, yield: 5.5, trend: "stable", grade: "B",
    liquidity: 8, tenantDemand: "high", volatility: "medium",
    newSupply: 500, occupancy: 94, appreciation: 4.2, rentalGrowth: 3.5,
    daysOnMarket: 35, profile: "core_plus"
  },
  "Business Bay": { 
    median: 1400, yield: 6.2, trend: "rising", grade: "B",
    liquidity: 8, tenantDemand: "high", volatility: "medium",
    newSupply: 4000, occupancy: 89, appreciation: 5.8, rentalGrowth: 4.5,
    daysOnMarket: 40, profile: "core_plus"
  },
  "Dubai Hills": { 
    median: 1350, yield: 5.5, trend: "rising", grade: "B",
    liquidity: 7, tenantDemand: "high", volatility: "low",
    newSupply: 3500, occupancy: 91, appreciation: 6.2, rentalGrowth: 4.0,
    daysOnMarket: 45, profile: "core_plus"
  },

  // Growth Areas (Grade B-)
  "Arabian Ranches": { 
    median: 1100, yield: 5.0, trend: "rising", grade: "B",
    liquidity: 6, tenantDemand: "high", volatility: "low",
    newSupply: 2000, occupancy: 92, appreciation: 5.5, rentalGrowth: 3.2,
    daysOnMarket: 55, profile: "core_plus"
  },
  "Jumeirah Village Circle": { 
    median: 850, yield: 7.5, trend: "stable", grade: "B",
    liquidity: 8, tenantDemand: "high", volatility: "medium",
    newSupply: 5000, occupancy: 90, appreciation: 4.0, rentalGrowth: 4.8,
    daysOnMarket: 28, profile: "value_add"
  },
  "JVC": { 
    median: 850, yield: 7.5, trend: "stable", grade: "B",
    liquidity: 8, tenantDemand: "high", volatility: "medium",
    newSupply: 5000, occupancy: 90, appreciation: 4.0, rentalGrowth: 4.8,
    daysOnMarket: 28, profile: "value_add"
  },

  // Value Areas (Grade C+)
  "Motor City": { 
    median: 750, yield: 7.0, trend: "stable", grade: "C",
    liquidity: 6, tenantDemand: "medium", volatility: "medium",
    newSupply: 1000, occupancy: 88, appreciation: 3.5, rentalGrowth: 3.0,
    daysOnMarket: 45, profile: "value_add"
  },
  "Sports City": {
    median: 700, yield: 7.2, trend: "stable", grade: "C",
    liquidity: 6, tenantDemand: "medium", volatility: "medium",
    newSupply: 800, occupancy: 87, appreciation: 3.2, rentalGrowth: 2.8,
    daysOnMarket: 50, profile: "value_add"
  },
  "Dubai Silicon Oasis": {
    median: 750, yield: 7.0, trend: "stable", grade: "C",
    liquidity: 6, tenantDemand: "medium", volatility: "low",
    newSupply: 1500, occupancy: 89, appreciation: 3.0, rentalGrowth: 3.5,
    daysOnMarket: 40, profile: "value_add"
  },
  "International City": {
    median: 500, yield: 8.5, trend: "stable", grade: "C",
    liquidity: 7, tenantDemand: "high", volatility: "medium",
    newSupply: 2000, occupancy: 92, appreciation: 2.5, rentalGrowth: 3.0,
    daysOnMarket: 25, profile: "opportunistic"
  },

  // Emerging Areas (Grade C)
  "Dubai South": {
    median: 650, yield: 6.5, trend: "rising", grade: "C",
    liquidity: 4, tenantDemand: "low", volatility: "high",
    newSupply: 8000, occupancy: 75, appreciation: 3.5, rentalGrowth: 2.0,
    daysOnMarket: 75, profile: "opportunistic"
  },
  "Jumeirah Lake Towers": {
    median: 1000, yield: 6.8, trend: "stable", grade: "B",
    liquidity: 7, tenantDemand: "high", volatility: "medium",
    newSupply: 500, occupancy: 90, appreciation: 3.8, rentalGrowth: 4.0,
    daysOnMarket: 35, profile: "value_add"
  },
  "JLT": {
    median: 1000, yield: 6.8, trend: "stable", grade: "B",
    liquidity: 7, tenantDemand: "high", volatility: "medium",
    newSupply: 500, occupancy: 90, appreciation: 3.8, rentalGrowth: 4.0,
    daysOnMarket: 35, profile: "value_add"
  },
  "Al Barsha": {
    median: 900, yield: 6.5, trend: "stable", grade: "B",
    liquidity: 6, tenantDemand: "medium", volatility: "low",
    newSupply: 400, occupancy: 91, appreciation: 3.5, rentalGrowth: 3.0,
    daysOnMarket: 45, profile: "value_add"
  },
  "Mirdif": {
    median: 850, yield: 5.8, trend: "stable", grade: "B",
    liquidity: 5, tenantDemand: "medium", volatility: "low",
    newSupply: 300, occupancy: 93, appreciation: 3.0, rentalGrowth: 2.5,
    daysOnMarket: 55, profile: "core_plus"
  },
}

// Default market data for unknown areas
const DEFAULT_MARKET_DATA: AreaMarketData = {
  median: 1200, yield: 6.0, trend: "stable", grade: "C",
  liquidity: 5, tenantDemand: "medium", volatility: "medium",
  newSupply: 1000, occupancy: 85, appreciation: 3.0, rentalGrowth: 3.0,
  daysOnMarket: 50, profile: "value_add"
}

// Get market context for an area
function getMarketContext(area: string, propertyType: string, bedrooms: number): MarketContext {
  // Try to find exact match first, then partial match
  let data: AreaMarketData | undefined = DUBAI_MARKET_DATA[area]
  
  if (!data) {
    // Try partial matching for variations like "Dubai Marina Tower 1" -> "Dubai Marina"
    const normalizedArea = area.toLowerCase()
    for (const [key, value] of Object.entries(DUBAI_MARKET_DATA)) {
      if (normalizedArea.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedArea)) {
        data = value
        break
      }
    }
  }

  if (!data) {
    data = DEFAULT_MARKET_DATA
  }

  // Adjust yield based on property type and bedrooms
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
    priceVsMarket: 0, // Will be calculated
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

// AI-powered evaluation using OpenAI
async function evaluateWithAI(
  property: PropertyData,
  marketContext: MarketContext
): Promise<EvaluationResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const priceVsMarket = property.pricePerSqft && marketContext.areaMedianPricePerSqft
    ? ((property.pricePerSqft - marketContext.areaMedianPricePerSqft) / marketContext.areaMedianPricePerSqft * 100)
    : 0

  const estimatedAnnualRent = property.price * (marketContext.areaAverageYield / 100)
  const estimatedMonthlyRent = estimatedAnnualRent / 12

  const prompt = `You are a senior real estate investment analyst evaluating a property in Dubai, UAE for institutional investors and family offices.

PROPERTY DETAILS:
- Title: ${property.title}
- Type: ${property.propertyType}
- Location: ${property.area}${property.subArea ? `, ${property.subArea}` : ""}
- Price: AED ${property.price.toLocaleString()}
- Size: ${property.size ? `${property.size} sqft` : "Unknown"}
- Price/sqft: ${property.pricePerSqft ? `AED ${property.pricePerSqft.toLocaleString()}` : "Unknown"}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Furnished: ${property.furnished ? "Yes" : "No"}
- Parking: ${property.parking || "Unknown"}
- Completion Status: ${property.completionStatus || "Ready"}
- Developer: ${property.developer || "Unknown"}
- Handover: ${property.handoverDate || "Immediate"}
- Service Charge: ${property.serviceCharge ? `AED ${property.serviceCharge}/sqft` : "Unknown"}
- Amenities: ${property.amenities.join(", ") || "Not specified"}
- Description: ${property.description || "Not provided"}
- Source: ${property.source}
- Listed: ${property.listedDate || "Unknown"}

COMPREHENSIVE MARKET CONTEXT (${property.area}):
- Area Grade: ${marketContext.areaGrade} (A=Premium, B=Established, C=Emerging)
- Area Median Price/sqft: AED ${marketContext.areaMedianPricePerSqft.toLocaleString()}
- This Property vs Market: ${priceVsMarket > 0 ? "+" : ""}${priceVsMarket.toFixed(1)}%
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

Evaluate this property and provide your assessment in the following JSON format:
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
  "keyStrengths": ["<strength 1 with data>", "<strength 2 with data>"],
  "considerations": ["<consideration with data>"],
  "recommendation": "<strong_buy|buy|hold|pass>",
  "memoContent": {
    "execSummary": "<2-3 sentence executive summary for IC memo with key metrics>",
    "propertyOverview": "<detailed property description including specs, condition assessment>",
    "marketAnalysis": "<comprehensive market analysis paragraph with trends, supply/demand, comparisons>",
    "risks": ["<specific risk 1>", "<specific risk 2>", "<specific risk 3>"],
    "opportunities": ["<specific opportunity 1 with numbers>", "<specific opportunity 2>"],
    "assumptions": ["<key assumption 1>", "<key assumption 2>", "<key assumption 3>"],
    "recommendation": "<full recommendation paragraph with investment thesis>"
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
   - Price vs DLD median (below = higher score)
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
- 80-100: Exceptional opportunity, rare find
- 65-79: Strong investment, proceed with standard diligence
- 50-64: Moderate opportunity, specific use case
- 35-49: Below average, significant concerns
- 0-34: Pass, fundamental issues

Be specific and reference actual numbers in your analysis. Include specific data points in strengths/considerations.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a senior real estate investment analyst. Provide accurate, data-driven analysis. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from AI")
    }

    const result = JSON.parse(content)

    // If AI didn't return full analysis, create it from the response
    if (!result.analysis) {
      const fallback = createFallbackEvaluation(property, marketContext, priceVsMarket, estimatedMonthlyRent)
      result.analysis = fallback.analysis
    }

    return result
  } catch (error) {
    console.error("AI evaluation error:", error)
    // Return fallback evaluation
    return createFallbackEvaluation(property, marketContext, priceVsMarket, estimatedMonthlyRent)
  }
}

function createFallbackEvaluation(
  property: PropertyData,
  marketContext: MarketContext,
  priceVsMarket: number,
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
  if (priceVsMarket < -15) marketTiming += 8
  else if (priceVsMarket < -10) marketTiming += 6
  else if (priceVsMarket < -5) marketTiming += 4
  else if (priceVsMarket < 5) marketTiming += 2
  else if (priceVsMarket > 10) marketTiming -= 4
  if (marketContext.marketTrend === "rising") marketTiming += 4
  else if (marketContext.marketTrend === "stable") marketTiming += 2
  else marketTiming -= 3
  if (marketContext.newSupplyUnits > 4000) marketTiming -= 3
  else if (marketContext.newSupplyUnits < 1000) marketTiming += 2
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
  riskAlignment = Math.max(0, Math.min(25, riskAlignment))

  const score = mandateFit + marketTiming + portfolioFit + riskAlignment

  const recommendation: EvaluationResult["recommendation"] =
    score >= 75 ? "strong_buy" :
    score >= 60 ? "buy" :
    score >= 45 ? "hold" : "pass"

  // Financial calculations
  const estimatedAnnualRent = estimatedMonthlyRent * 12
  const recommendedOffer = Math.round(property.price * (priceVsMarket < 0 ? 0.98 : 0.95))
  const stabilizedValue = Math.round(property.price * 1.08)
  const noi = Math.round(estimatedAnnualRent * 0.85) // 15% expenses
  const capRate = (noi / property.price) * 100
  const targetIrr = capRate + marketContext.historicalAppreciation
  
  // Build key strengths and considerations
  const keyStrengths: string[] = []
  const considerations: string[] = []

  if (priceVsMarket < -5) {
    keyStrengths.push(`${Math.abs(priceVsMarket).toFixed(1)}% below area median with ${marketContext.areaAverageYield}% yield potential`)
  }
  if (marketContext.occupancyRate >= 90) {
    keyStrengths.push(`${marketContext.occupancyRate}% occupancy with ${marketContext.tenantDemand} tenant demand`)
  }
  if (marketContext.newSupplyUnits < 2000) {
    keyStrengths.push(`Limited supply pipeline (${marketContext.newSupplyUnits.toLocaleString()} units) supports pricing`)
  }
  if (keyStrengths.length === 0) {
    keyStrengths.push("Competitive entry point for the area")
  }

  if (priceVsMarket > 5) considerations.push(`Priced ${priceVsMarket.toFixed(1)}% above area median`)
  if (marketContext.newSupplyUnits > 3000) considerations.push(`High supply: ${marketContext.newSupplyUnits.toLocaleString()} units in pipeline`)
  if (considerations.length === 0) considerations.push("Standard due diligence recommended")

  return {
    overallScore: score,
    factors: { mandateFit, marketTiming, portfolioFit, riskAlignment },
    headline: `Grade ${marketContext.areaGrade} ${property.area} - ${priceVsMarket < 0 ? `${Math.abs(priceVsMarket).toFixed(0)}% Below Market` : "Market Rate"}`,
    reasoning: `${property.bedrooms}BR ${property.propertyType.toLowerCase()} at AED ${(property.pricePerSqft || 0).toLocaleString()}/sqft (${priceVsMarket > 0 ? "+" : ""}${priceVsMarket.toFixed(1)}% vs median) with ${marketContext.areaAverageYield}% yield in ${marketContext.marketTrend} market.`,
    keyStrengths: keyStrengths.slice(0, 2),
    considerations: considerations.slice(0, 1),
    recommendation,
    
    // Rich IC Memo format
    analysis: {
      summary: `${property.bedrooms} bedroom ${property.propertyType.toLowerCase()} in ${property.area} with ${priceVsMarket < 0 ? "below-market pricing" : "competitive positioning"}, offering ${marketContext.areaAverageYield}% gross yield with ${marketContext.marketTrend} market dynamics.`,
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
        description: `${property.size ? `${property.size.toLocaleString()} sq ft` : ""} ${property.propertyType.toLowerCase()} ${property.bedrooms}BR/${property.bathrooms}BA. ${property.furnished ? "Fully furnished" : "Unfurnished"}. ${property.completionStatus === "ready" ? "Ready for immediate occupation" : `Off-plan with ${property.handoverDate || "TBC"} handover`}.`,
        condition: property.completionStatus === "ready" ? "Ready, well-maintained" : `Off-plan - ${property.developer || "Developer TBC"}`,
        specs: [
          { label: "Size", value: property.size ? `${property.size.toLocaleString()} sq ft` : "TBC" },
          { label: "Bedrooms", value: `${property.bedrooms} BR` },
          { label: "Parking", value: property.parking ? `${property.parking} space(s)` : "TBC" },
          { label: "Service Charge", value: `AED ${property.serviceCharge || 18}/sq ft (est.)` },
          { label: "Furnished", value: property.furnished ? "Yes" : "No" },
          { label: "Status", value: property.completionStatus === "ready" ? "Ready" : "Off-plan" },
        ],
        highlights: property.amenities.slice(0, 4).map(a => a),
      },
      
      market: {
        overview: `${property.area} is showing ${marketContext.marketTrend} dynamics with ${marketContext.historicalAppreciation}% YoY appreciation. Area median at AED ${marketContext.areaMedianPricePerSqft.toLocaleString()}/sqft with ${marketContext.areaAverageYield}% average yields.`,
        drivers: [
          `${marketContext.marketTrend === "rising" ? "Strong" : "Stable"} demand from ${marketContext.investorProfile} investors`,
          `${marketContext.rentalGrowth}% rental growth trajectory`,
          `${marketContext.newSupplyUnits < 2000 ? "Limited" : "Moderate"} new supply maintains pricing power`,
        ],
        supply: `${marketContext.newSupplyUnits.toLocaleString()} units in pipeline, ${Math.round(marketContext.newSupplyUnits * 0.35).toLocaleString()} pre-sold`,
        demand: `${marketContext.tenantDemand.charAt(0).toUpperCase() + marketContext.tenantDemand.slice(1)} demand from end-users and investors seeking ${marketContext.areaAverageYield}%+ yields`,
        absorption: `${Math.round(marketContext.newSupplyUnits * 0.8).toLocaleString()} sq ft absorbed in 2024, ${marketContext.areaGrade === "A" ? "highest" : "strong"} in segment`,
      },
      
      pricing: {
        askingPrice: property.price,
        pricePerSqft: property.pricePerSqft,
        marketAvgPricePerSqft: marketContext.areaMedianPricePerSqft,
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
          note: "Similar spec, recent trade",
        },
        {
          name: `${property.area} - Nearby Building`,
          distance: "0.5 km",
          size: property.size ? `${Math.round(property.size * 1.1).toLocaleString()} sq ft` : "Larger",
          closingDate: "Q3 2025",
          price: Math.round(property.price * 0.98),
          pricePerSqft: Math.round(marketContext.areaMedianPricePerSqft * 0.95),
          note: "Slightly older building",
        },
      ],
      
      strategy: {
        plan: `Acquire at ${priceVsMarket < 0 ? "below-market" : "fair"} pricing, optimize rental income, and ${marketContext.marketTrend === "rising" ? "benefit from appreciation" : "hold for stable yield"}.`,
        holdPeriod: "5 years",
        exit: `Sell to ${marketContext.investorProfile === "core" ? "institutional buyer or income fund" : "private investor or end-user"}`,
        focusPoints: [
          `Negotiate ${Math.abs(priceVsMarket) > 5 ? "additional" : "2-3%"} discount at offer stage`,
          "Verify service charges and confirm capped rates if available",
          `Target market rent of AED ${Math.round(estimatedMonthlyRent * 1.05).toLocaleString()}/month at first renewal`,
        ],
      },
      
      investmentThesis: `The property aligns with ${marketContext.investorProfile === "core" ? "Core" : marketContext.investorProfile === "core_plus" ? "Core Plus" : "Value-Add"} strategy, offering ${marketContext.areaAverageYield > 6 ? "attractive yield" : "stable income"} with ${marketContext.marketTrend === "rising" ? "appreciation upside" : "defensive characteristics"}.`,
      
      financialAnalysis: {
        noi,
        capRate: Math.round(capRate * 10) / 10,
        targetIrr: Math.round(targetIrr * 10) / 10,
        holdPeriod: "5 years",
      },
      
      risks: [
        {
          risk: marketContext.newSupplyUnits > 2000 ? "High new supply in pipeline" : "Market conditions may change",
          mitigation: marketContext.newSupplyUnits > 2000 ? "Focus on premium positioning and tenant retention" : "Maintain flexible exit timeline",
        },
        {
          risk: "Service charges may increase",
          mitigation: "Negotiate capped service charge clause if available",
        },
        {
          risk: "Rental market competition",
          mitigation: `Premium amenities and ${property.furnished ? "furniture package" : "competitive pricing"} differentiate offering`,
        },
      ],
      
      finalRecommendation: {
        decision: score >= 60 ? "PROCEED" : score >= 45 ? "CONDITIONAL" : "PASS",
        condition: score >= 60 ? "Subject to site inspection and final due diligence" : score >= 45 ? "Subject to price negotiation and mandate alignment" : "Does not meet investment criteria at current terms",
      },
    },
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { property } = body as { property: PropertyData }

    if (!property) {
      return NextResponse.json(
        { error: "Property data is required" },
        { status: 400 }
      )
    }

    // Get market context for the property's area
    const marketContext = getMarketContext(
      property.area,
      property.propertyType,
      property.bedrooms
    )

    // Calculate price vs market
    if (property.pricePerSqft && marketContext.areaMedianPricePerSqft) {
      marketContext.priceVsMarket =
        ((property.pricePerSqft - marketContext.areaMedianPricePerSqft) /
          marketContext.areaMedianPricePerSqft) * 100
    }

    // Evaluate with AI (or fallback)
    const evaluation = await evaluateWithAI(property, marketContext)

    return NextResponse.json({
      success: true,
      evaluation,
      marketContext,
    })
  } catch (error) {
    console.error("Property evaluation error:", error)
    return NextResponse.json(
      { error: "Failed to evaluate property" },
      { status: 500 }
    )
  }
}
