import { NextResponse } from "next/server"
import OpenAI from "openai"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * GET /api/investor/forecast/[holdingId]
 * 
 * AI-powered forecast for a specific holding.
 * Aggregates DLD trends, market signals, Ejari data, and portal listings
 * to generate 12-month rental revenue and property value forecasts
 * with base/bull/bear scenarios.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ holdingId: string }> }
) {
  const holdingId = (await params).holdingId

  try {
    const ctx = await requireAuthContext(req)
    const supabase = getSupabaseAdminClient()

    // Fetch the holding
    const { data: holding, error: holdingError } = await supabase
      .from("holdings")
      .select("*")
      .eq("id", holdingId)
      .maybeSingle()

    if (holdingError || !holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 })
    }

    // Security: verify access
    if (ctx.role === "investor" && ctx.investorId !== holding.investor_id) {
      throw new AccessError("Can only forecast your own holdings")
    }

    // Fetch property details
    const { data: listing } = await supabase
      .from("listings")
      .select("title, area, type, size, bedrooms, bathrooms, price, developer")
      .eq("id", holding.listing_id)
      .maybeSingle()

    const area = listing?.area ?? "Dubai"
    const propertyType = listing?.type ?? "apartment"
    const propertyTitle = listing?.title ?? "Property"

    // Gather market context in parallel
    const [
      areaStatsResult,
      monthlyTrendsResult,
      marketSignalsResult,
      rentalMetricsResult,
      portalListingsResult,
      snapshotsResult,
    ] = await Promise.all([
      // 1. Area stats from DLD
      supabase
        .from("dld_area_stats")
        .select("*")
        .eq("area_name_en", area)
        .maybeSingle(),

      // 2. Monthly price trends
      supabase
        .from("dld_monthly_trends")
        .select("month, avg_price, total_volume")
        .eq("area_name_en", area)
        .order("month", { ascending: false })
        .limit(24),

      // 3. Market signals for the area
      supabase
        .from("market_signal")
        .select("type, severity, metric, current_value, prev_value, delta_pct, created_at")
        .eq("geo_name", area)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(10),

      // 4. Rental metrics from market snapshots
      supabase
        .from("market_metric_snapshot")
        .select("metric, value, window_end, sample_size")
        .eq("geo_name", area)
        .in("metric", ["median_rent_annual", "gross_yield", "median_price_psf"])
        .order("window_end", { ascending: false })
        .limit(20),

      // 5. Portal listings for supply context
      supabase
        .from("portal_listings")
        .select("asking_price, price_per_sqm, days_on_market, is_active")
        .eq("area_name", area)
        .eq("property_type", propertyType)
        .eq("is_active", true)
        .limit(50),

      // 6. Historical snapshots for this holding
      supabase
        .from("portfolio_snapshots")
        .select("snapshot_date, market_value, monthly_rent, occupancy_rate, area_median_price")
        .eq("holding_id", holdingId)
        .order("snapshot_date", { ascending: true }),
    ])

    // Process gathered data
    const areaStats = areaStatsResult.data
    const monthlyTrends = (monthlyTrendsResult.data ?? []).reverse()
    const marketSignals = marketSignalsResult.data ?? []
    const rentalMetrics = rentalMetricsResult.data ?? []
    const portalListings = portalListingsResult.data ?? []
    const snapshots = snapshotsResult.data ?? []

    // Calculate current metrics
    const purchasePrice = Number(holding.purchase_price)
    const currentValue = Number(holding.current_value)
    const monthlyRent = Number(holding.monthly_rent)
    const occupancyRate = Number(holding.occupancy_rate)
    const annualExpenses = Number(holding.annual_expenses)
    const appreciationPct = purchasePrice > 0 ? ((currentValue - purchasePrice) / purchasePrice) * 100 : 0
    const netYield = currentValue > 0 ? ((monthlyRent * 12 * occupancyRate - annualExpenses) / currentValue) * 100 : 0

    // Build market context summary for the AI
    const activeListingsCount = portalListings.length
    const avgDaysOnMarket = portalListings.length > 0
      ? portalListings.reduce((sum, l) => sum + (l.days_on_market ?? 0), 0) / portalListings.length
      : 0

    const medianRent = rentalMetrics.find(m => m.metric === "median_rent_annual")
    const medianPricePsf = rentalMetrics.find(m => m.metric === "median_price_psf")
    const grossYield = rentalMetrics.find(m => m.metric === "gross_yield")

    // Calculate price trend from DLD data
    let priceTrend = "stable"
    if (monthlyTrends.length >= 6) {
      const recent3Avg = monthlyTrends.slice(-3).reduce((s, t) => s + Number(t.avg_price), 0) / 3
      const prev3Avg = monthlyTrends.slice(-6, -3).reduce((s, t) => s + Number(t.avg_price), 0) / 3
      const trendPct = prev3Avg > 0 ? ((recent3Avg - prev3Avg) / prev3Avg) * 100 : 0
      priceTrend = trendPct > 2 ? "rising" : trendPct < -2 ? "declining" : "stable"
    }

    // Build the AI prompt
    const marketContext = {
      area,
      propertyType,
      propertyTitle,
      currentValue,
      purchasePrice,
      monthlyRent,
      occupancyRate: occupancyRate * 100,
      annualExpenses,
      appreciationPct: Math.round(appreciationPct * 10) / 10,
      currentNetYield: Math.round(netYield * 10) / 10,
      areaMedianPrice: areaStats?.median_price ? Number(areaStats.median_price) : null,
      areaMedianRent: medianRent?.value ? Number(medianRent.value) : null,
      areaGrossYield: grossYield?.value ? Number(grossYield.value) : null,
      areaPricePsf: medianPricePsf?.value ? Number(medianPricePsf.value) : null,
      priceTrend,
      activeListingsInArea: activeListingsCount,
      avgDaysOnMarket: Math.round(avgDaysOnMarket),
      recentSignals: marketSignals.slice(0, 5).map(s => ({
        type: s.type,
        severity: s.severity,
        deltaPct: s.delta_pct ? Number(s.delta_pct) : null,
      })),
      historicalTrends: monthlyTrends.slice(-12).map(t => ({
        month: t.month,
        avgPrice: Number(t.avg_price),
        volume: Number(t.total_volume),
      })),
      historicalSnapshots: snapshots.slice(-12).map(s => ({
        date: s.snapshot_date,
        value: Number(s.market_value),
        rent: s.monthly_rent ? Number(s.monthly_rent) : null,
      })),
    }

    const systemPrompt = `You are an expert real estate investment analyst specializing in the Dubai property market. 
You provide detailed, data-driven forecasts for property investments.

IMPORTANT: You must respond ONLY with valid JSON matching the exact schema provided. No markdown, no explanations outside the JSON.`

    const userPrompt = `Generate a 12-month forecast for the following property investment. Use the market data provided to create realistic base, bull, and bear scenarios.

PROPERTY:
- Title: ${propertyTitle}
- Area: ${area}
- Type: ${propertyType}
- Current Value: AED ${currentValue.toLocaleString()}
- Purchase Price: AED ${purchasePrice.toLocaleString()}
- Monthly Rent: AED ${monthlyRent.toLocaleString()}
- Occupancy Rate: ${(occupancyRate * 100).toFixed(0)}%
- Annual Expenses: AED ${annualExpenses.toLocaleString()}
- Current Appreciation: ${appreciationPct.toFixed(1)}%
- Current Net Yield: ${netYield.toFixed(1)}%

MARKET CONTEXT:
${JSON.stringify(marketContext, null, 2)}

Return a JSON object with this EXACT structure:
{
  "rentalForecast": {
    "scenarios": [
      {
        "name": "bear",
        "monthly": [{"month": "2026-03", "rent": <number>, "occupancy": <0-1>, "netIncome": <number>}, ... 12 months],
        "annualTotal": <number>,
        "yieldPct": <number>
      },
      {
        "name": "base",
        "monthly": [... 12 months same format],
        "annualTotal": <number>,
        "yieldPct": <number>
      },
      {
        "name": "bull",
        "monthly": [... 12 months same format],
        "annualTotal": <number>,
        "yieldPct": <number>
      }
    ],
    "assumptions": ["<assumption 1>", "<assumption 2>", "<assumption 3>"]
  },
  "valueForecast": {
    "scenarios": [
      {
        "name": "bear",
        "monthly": [{"month": "2026-03", "value": <number>, "changeFromCurrent": <number>}, ... 12 months],
        "finalValue": <number>,
        "appreciationPct": <number>
      },
      {
        "name": "base",
        "monthly": [... 12 months],
        "finalValue": <number>,
        "appreciationPct": <number>
      },
      {
        "name": "bull",
        "monthly": [... 12 months],
        "finalValue": <number>,
        "appreciationPct": <number>
      }
    ],
    "assumptions": ["<assumption 1>", "<assumption 2>", "<assumption 3>"]
  },
  "riskFactors": [
    {"factor": "<name>", "impact": "high|medium|low", "description": "<detail>"},
    ... 3-5 risk factors
  ],
  "narrative": "<2-3 paragraph analysis of the investment outlook, referencing specific market data>"
}

Generate realistic numbers based on current Dubai market conditions and the specific area trends provided. Months should start from the current month and go 12 months forward.`

    let forecast: Record<string, unknown>

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error("Empty AI response")
      }
      forecast = JSON.parse(content)
    } catch (aiError) {
      console.error("[forecast] AI generation failed, using deterministic fallback:", aiError)
      forecast = generateDeterministicForecast({
        currentValue,
        monthlyRent,
        occupancyRate,
        annualExpenses,
        priceTrend,
        netYield,
      })
    }

    // Build response
    const response = {
      holdingId,
      propertyTitle,
      area,
      propertyType,
      generatedAt: new Date().toISOString(),
      currentMetrics: {
        currentValue,
        purchasePrice,
        monthlyRent,
        occupancyRate: occupancyRate * 100,
        annualExpenses,
        appreciationPct: Math.round(appreciationPct * 10) / 10,
        netYieldPct: Math.round(netYield * 10) / 10,
      },
      ...forecast,
      marketContext: {
        areaMedianPrice: areaStats?.median_price ? Number(areaStats.median_price) : null,
        areaMedianRent: medianRent?.value ? Number(medianRent.value) : null,
        areaPriceTrend: priceTrend,
        supplyLevel: activeListingsCount > 30 ? "high" : activeListingsCount > 15 ? "moderate" : "low",
        avgDaysOnMarket: Math.round(avgDaysOnMarket),
        activeListings: activeListingsCount,
      },
      historicalSnapshots: snapshots.map(s => ({
        date: s.snapshot_date,
        value: Number(s.market_value),
        rent: s.monthly_rent ? Number(s.monthly_rent) : null,
        occupancy: s.occupancy_rate ? Number(s.occupancy_rate) : null,
      })),
    }

    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[forecast] Error:", err)
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 })
  }
}

/**
 * Deterministic fallback forecast when AI is unavailable.
 * Uses simple projection models based on current metrics.
 */
function generateDeterministicForecast(params: {
  currentValue: number
  monthlyRent: number
  occupancyRate: number
  annualExpenses: number
  priceTrend: string
  netYield: number
}) {
  const { currentValue, monthlyRent, occupancyRate, annualExpenses, priceTrend, netYield } = params

  const now = new Date()
  const months: string[] = []
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(d.toISOString().slice(0, 7))
  }

  // Growth rates per scenario
  const trendMultiplier = priceTrend === "rising" ? 1.2 : priceTrend === "declining" ? 0.8 : 1.0
  const valueGrowthRates = {
    bear: -0.02 * trendMultiplier,
    base: 0.04 * trendMultiplier,
    bull: 0.10 * trendMultiplier,
  }
  const rentGrowthRates = {
    bear: -0.01,
    base: 0.03,
    bull: 0.07,
  }
  const occupancyShifts = {
    bear: -0.05,
    base: 0.0,
    bull: 0.02,
  }

  const scenarios = (["bear", "base", "bull"] as const).map((name) => {
    const valueGrowth = valueGrowthRates[name]
    const rentGrowth = rentGrowthRates[name]
    const occShift = occupancyShifts[name]

    const rentalMonthly = months.map((month, i) => {
      const progress = (i + 1) / 12
      const rent = Math.round(monthlyRent * (1 + rentGrowth * progress))
      const occ = Math.min(1, Math.max(0.5, occupancyRate + occShift * progress))
      const netIncome = Math.round(rent * occ - annualExpenses / 12)
      return { month, rent, occupancy: Math.round(occ * 100) / 100, netIncome }
    })

    const valueMonthly = months.map((month, i) => {
      const progress = (i + 1) / 12
      const value = Math.round(currentValue * (1 + valueGrowth * progress))
      return { month, value, changeFromCurrent: value - currentValue }
    })

    const finalValue = valueMonthly[11].value
    const annualRentalTotal = rentalMonthly.reduce((s, m) => s + m.netIncome, 0)

    return {
      name,
      rentalMonthly,
      valueMonthly,
      finalValue,
      annualRentalTotal,
      rentalYield: finalValue > 0 ? Math.round((annualRentalTotal / finalValue) * 1000) / 10 : 0,
      valueAppreciation: Math.round(((finalValue - currentValue) / currentValue) * 1000) / 10,
    }
  })

  return {
    rentalForecast: {
      scenarios: scenarios.map((s) => ({
        name: s.name,
        monthly: s.rentalMonthly,
        annualTotal: s.annualRentalTotal,
        yieldPct: s.rentalYield,
      })),
      assumptions: [
        `${priceTrend.charAt(0).toUpperCase() + priceTrend.slice(1)} price trend in ${priceTrend === "rising" ? "the area" : "Dubai market"}`,
        `Current occupancy rate of ${(occupancyRate * 100).toFixed(0)}% as baseline`,
        "Annual expenses assumed constant across scenarios",
      ],
    },
    valueForecast: {
      scenarios: scenarios.map((s) => ({
        name: s.name,
        monthly: s.valueMonthly,
        finalValue: s.finalValue,
        appreciationPct: s.valueAppreciation,
      })),
      assumptions: [
        `Based on ${priceTrend} DLD transaction trends in ${priceTrend === "declining" ? "the area" : "this market segment"}`,
        "Bear scenario accounts for potential market correction",
        "Bull scenario reflects continued demand in premium areas",
      ],
    },
    riskFactors: [
      { factor: "Market Correction", impact: "high" as const, description: "Dubai property market may experience a correction affecting values" },
      { factor: "Vacancy Risk", impact: "medium" as const, description: "Changes in tenant demand could affect occupancy rates" },
      { factor: "New Supply", impact: "medium" as const, description: "New developments in the area may increase competition" },
      { factor: "Regulatory Changes", impact: "low" as const, description: "Changes in property regulations or visa policies could impact demand" },
    ],
    narrative: `This property in ${priceTrend === "rising" ? "a rising" : priceTrend === "declining" ? "a softening" : "a stable"} market currently yields ${netYield.toFixed(1)}% net. The base scenario projects moderate growth aligned with recent DLD trends, while the bear case accounts for a potential market pullback. The bull scenario reflects continued strong demand in ${priceTrend === "rising" ? "this high-growth area" : "Dubai's premium segments"}.`,
  }
}
