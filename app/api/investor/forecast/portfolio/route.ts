import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/investor/forecast/portfolio
 * 
 * Aggregates forecasts across all holdings for a portfolio-level view.
 * Uses the individual holding forecast API internally, then combines results.
 * Falls back to deterministic projections if AI forecasts are not available.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const supabase = getSupabaseAdminClient()

    // Fetch all holdings for this investor
    const { data: holdings, error: holdingsError } = await supabase
      .from("holdings")
      .select(`
        id,
        listing_id,
        purchase_price,
        purchase_date,
        current_value,
        monthly_rent,
        occupancy_rate,
        annual_expenses
      `)
      .eq("investor_id", ctx.investorId)

    if (holdingsError) {
      return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 })
    }

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({
        investorId: ctx.investorId,
        generatedAt: new Date().toISOString(),
        holdingCount: 0,
        portfolioForecast: null,
        message: "No holdings found for forecasting",
      })
    }

    // Get listing details for each holding
    const listingIds = holdings.map(h => h.listing_id).filter(Boolean)
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, area, type")
      .in("id", listingIds)

    const listingMap = new Map((listings ?? []).map(l => [l.id, l]))

    // Calculate current portfolio metrics
    const totalCurrentValue = holdings.reduce((s, h) => s + Number(h.current_value), 0)
    const totalPurchasePrice = holdings.reduce((s, h) => s + Number(h.purchase_price), 0)
    const totalMonthlyRent = holdings.reduce((s, h) => s + Number(h.monthly_rent) * Number(h.occupancy_rate), 0)
    const totalAnnualExpenses = holdings.reduce((s, h) => s + Number(h.annual_expenses), 0)
    const netAnnualIncome = totalMonthlyRent * 12 - totalAnnualExpenses

    // Fetch historical snapshots for the entire portfolio
    const { data: snapshots } = await supabase
      .from("portfolio_snapshots")
      .select("snapshot_date, market_value, monthly_rent, holding_id")
      .eq("investor_id", ctx.investorId)
      .order("snapshot_date", { ascending: true })

    // Aggregate snapshots by date
    const snapshotsByDate = new Map<string, { totalValue: number; totalRent: number; count: number }>()
    for (const snap of snapshots ?? []) {
      const date = snap.snapshot_date
      const existing = snapshotsByDate.get(date) ?? { totalValue: 0, totalRent: 0, count: 0 }
      existing.totalValue += Number(snap.market_value)
      existing.totalRent += Number(snap.monthly_rent ?? 0)
      existing.count += 1
      snapshotsByDate.set(date, existing)
    }

    const historicalPortfolioValue = Array.from(snapshotsByDate.entries())
      .map(([date, data]) => ({
        date,
        totalValue: Math.round(data.totalValue),
        totalRent: Math.round(data.totalRent),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Generate portfolio-level forecast (deterministic aggregate approach)
    const now = new Date()
    const months: string[] = []
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push(d.toISOString().slice(0, 7))
    }

    // Determine overall portfolio trend from snapshots
    let portfolioTrend = "stable"
    if (historicalPortfolioValue.length >= 3) {
      const recent = historicalPortfolioValue.slice(-3)
      const earlier = historicalPortfolioValue.slice(-6, -3)
      if (earlier.length > 0) {
        const recentAvg = recent.reduce((s, v) => s + v.totalValue, 0) / recent.length
        const earlierAvg = earlier.reduce((s, v) => s + v.totalValue, 0) / earlier.length
        const changePct = ((recentAvg - earlierAvg) / earlierAvg) * 100
        portfolioTrend = changePct > 2 ? "rising" : changePct < -2 ? "declining" : "stable"
      }
    }

    // Build scenarios for the entire portfolio
    const trendMult = portfolioTrend === "rising" ? 1.2 : portfolioTrend === "declining" ? 0.8 : 1.0
    const scenarioConfigs = [
      { name: "bear" as const, valueGrowth: -0.03 * trendMult, rentGrowth: -0.02, occShift: -0.05 },
      { name: "base" as const, valueGrowth: 0.05 * trendMult, rentGrowth: 0.03, occShift: 0.0 },
      { name: "bull" as const, valueGrowth: 0.12 * trendMult, rentGrowth: 0.07, occShift: 0.03 },
    ]

    const avgOccupancy = holdings.reduce((s, h) => s + Number(h.occupancy_rate), 0) / holdings.length

    const scenarios = scenarioConfigs.map((config) => {
      const valueMonthly = months.map((month, i) => {
        const progress = (i + 1) / 12
        const value = Math.round(totalCurrentValue * (1 + config.valueGrowth * progress))
        return { month, value }
      })

      const incomeMonthly = months.map((month, i) => {
        const progress = (i + 1) / 12
        const rent = totalMonthlyRent * (1 + config.rentGrowth * progress)
        const occ = Math.min(1, Math.max(0.5, avgOccupancy + config.occShift * progress))
        const netIncome = Math.round(rent * (occ / avgOccupancy) - totalAnnualExpenses / 12)
        return { month, grossRent: Math.round(rent * (occ / avgOccupancy)), netIncome, expenses: Math.round(totalAnnualExpenses / 12) }
      })

      const finalValue = valueMonthly[11].value
      const totalNetIncome = incomeMonthly.reduce((s, m) => s + m.netIncome, 0)

      return {
        name: config.name,
        value: {
          monthly: valueMonthly,
          finalValue,
          appreciationPct: Math.round(((finalValue - totalCurrentValue) / totalCurrentValue) * 1000) / 10,
        },
        income: {
          monthly: incomeMonthly,
          annualNetIncome: totalNetIncome,
          projectedYieldPct: finalValue > 0 ? Math.round((totalNetIncome / finalValue) * 1000) / 10 : 0,
        },
      }
    })

    // Per-holding summary for breakdown
    const holdingSummaries = holdings.map(h => {
      const listing = listingMap.get(h.listing_id)
      const value = Number(h.current_value)
      const purchasePrice = Number(h.purchase_price)
      const rent = Number(h.monthly_rent) * Number(h.occupancy_rate)
      const expenses = Number(h.annual_expenses)
      const netYield = value > 0 ? ((rent * 12 - expenses) / value) * 100 : 0
      const appreciation = purchasePrice > 0 ? ((value - purchasePrice) / purchasePrice) * 100 : 0

      return {
        holdingId: h.id,
        propertyTitle: listing?.title ?? "Unknown",
        area: listing?.area ?? "Dubai",
        type: listing?.type ?? "apartment",
        currentValue: value,
        monthlyRent: rent,
        netYieldPct: Math.round(netYield * 10) / 10,
        appreciationPct: Math.round(appreciation * 10) / 10,
        weightPct: totalCurrentValue > 0 ? Math.round((value / totalCurrentValue) * 1000) / 10 : 0,
      }
    }).sort((a, b) => b.currentValue - a.currentValue)

    // Diversification analysis
    const byArea = new Map<string, number>()
    const byType = new Map<string, number>()
    for (const h of holdingSummaries) {
      byArea.set(h.area, (byArea.get(h.area) ?? 0) + h.currentValue)
      byType.set(h.type, (byType.get(h.type) ?? 0) + h.currentValue)
    }

    const diversification = {
      byArea: Array.from(byArea.entries()).map(([area, value]) => ({
        area,
        value,
        pct: Math.round((value / totalCurrentValue) * 1000) / 10,
      })),
      byType: Array.from(byType.entries()).map(([type, value]) => ({
        type,
        value,
        pct: Math.round((value / totalCurrentValue) * 1000) / 10,
      })),
      concentrationRisk: byArea.size === 1 ? "high" : byArea.size <= 3 ? "moderate" : "low",
    }

    return NextResponse.json({
      investorId: ctx.investorId,
      generatedAt: new Date().toISOString(),
      holdingCount: holdings.length,
      currentMetrics: {
        totalValue: totalCurrentValue,
        totalPurchasePrice,
        totalMonthlyIncome: Math.round(totalMonthlyRent - totalAnnualExpenses / 12),
        netAnnualIncome: Math.round(netAnnualIncome),
        avgYieldPct: totalCurrentValue > 0 ? Math.round((netAnnualIncome / totalCurrentValue) * 1000) / 10 : 0,
        avgOccupancy: Math.round(avgOccupancy * 1000) / 10,
        appreciationPct: totalPurchasePrice > 0 ? Math.round(((totalCurrentValue - totalPurchasePrice) / totalPurchasePrice) * 1000) / 10 : 0,
        portfolioTrend,
      },
      scenarios,
      holdingSummaries,
      diversification,
      historicalPortfolioValue,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[portfolio-forecast] Error:", err)
    return NextResponse.json({ error: "Failed to generate portfolio forecast" }, { status: 500 })
  }
}
