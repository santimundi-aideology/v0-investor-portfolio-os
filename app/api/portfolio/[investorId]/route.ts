import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getHoldingsByInvestor, getPortfolioSummary } from "@/lib/db/holdings"

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[investorId]
 * Returns portfolio holdings enriched with DLD market data
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  const investorId = (await params).investorId
  const ctx = await requireAuthContext(req)
  // Portfolio can be accessed by investors (their own) or agents (any investor in their tenant)
  const supabase = getSupabaseAdminClient()

  try {
    // Fetch holdings from DB
    const holdings = await getHoldingsByInvestor(investorId)

    // ── Batch-fetch all listings in one query ──────────────────────
    const listingIds = [...new Set(holdings.map((h) => h.listingId).filter(Boolean))]
    const listingMap = new Map<string, Record<string, unknown>>()
    if (listingIds.length > 0) {
      const { data: listingsData } = await supabase
        .from("listings")
        .select("id, title, area, type, size, bedrooms, bathrooms, attachments")
        .in("id", listingIds)
      for (const l of listingsData ?? []) {
        listingMap.set(l.id as string, l as Record<string, unknown>)
      }
    }

    // ── Batch-fetch DLD area stats for all unique areas ──────────
    const areas = [...new Set(
      holdings.map((h) => {
        const listing = listingMap.get(h.listingId)
        return (listing?.area as string) || null
      }).filter((a): a is string => !!a)
    )]

    const areaStatsMap = new Map<string, number>()
    const areaTrendsMap = new Map<string, { month: string; avgPrice: number; volume: number }[]>()

    if (areas.length > 0) {
      const [{ data: statsRows }, { data: trendRows }] = await Promise.all([
        supabase.from("dld_area_stats").select("area_name_en, transaction_count").in("area_name_en", areas),
        supabase.from("dld_monthly_trends").select("area_name_en, month, avg_price, total_volume").in("area_name_en", areas).order("month", { ascending: false }).limit(areas.length * 12),
      ])
      for (const s of statsRows ?? []) {
        areaStatsMap.set(s.area_name_en as string, Number(s.transaction_count))
      }
      for (const t of trendRows ?? []) {
        const areaName = t.area_name_en as string
        const existing = areaTrendsMap.get(areaName) ?? []
        if (existing.length < 12) {
          existing.push({ month: t.month as string, avgPrice: Number(t.avg_price), volume: Number(t.total_volume) })
        }
        areaTrendsMap.set(areaName, existing)
      }
      // Reverse each area's trends to ascending order
      for (const [k, v] of areaTrendsMap) areaTrendsMap.set(k, v.reverse())
    }

    // ── Build enriched holdings (no per-holding DB calls) ────────
    const enrichedHoldings = holdings.map((holding) => {
      const listingData = listingMap.get(holding.listingId) ?? null
      let property: { title?: string; area?: string; type?: string; imageUrl?: string; size?: number; bedrooms?: number; bathrooms?: number } | null = null
      if (listingData) {
        const attachments = listingData.attachments as Array<{ type?: string; url?: string }> | null
        const imageUrl = attachments?.find((a) => a.type?.startsWith("image"))?.url
        property = {
          title: listingData.title as string,
          area: listingData.area as string,
          type: listingData.type as string,
          size: listingData.size as number,
          bedrooms: listingData.bedrooms as number,
          bathrooms: listingData.bathrooms as number,
          imageUrl,
        }
      }

      const area = property?.area || null
      const marketData = {
        dldMedianPrice: null as number | null,
        dldMedianPsm: null as number | null,
        priceVsMarketPct: null as number | null,
        comparableCount: 0,
        areaTransactionCount: area ? (areaStatsMap.get(area) ?? 0) : 0,
        monthlyTrends: area ? (areaTrendsMap.get(area) ?? []) : [],
        marketYield: null as number | null,
      }

      const appreciationPct =
        holding.purchasePrice > 0
          ? ((holding.currentValue - holding.purchasePrice) / holding.purchasePrice) * 100
          : 0

      const netAnnualRent =
        holding.monthlyRent * 12 * holding.occupancyRate - holding.annualExpenses
      const yieldPct = holding.currentValue > 0 ? (netAnnualRent / holding.currentValue) * 100 : 0
      const grossYieldPct =
        holding.currentValue > 0 ? ((holding.monthlyRent * 12) / holding.currentValue) * 100 : 0

      return {
        id: holding.id,
        investorId: holding.investorId,
        listingId: holding.listingId,
        property: property ?? null,
        financials: {
          purchasePrice: holding.purchasePrice,
          purchaseDate: holding.purchaseDate,
          currentValue: holding.currentValue,
          monthlyRent: holding.monthlyRent,
          occupancyRate: holding.occupancyRate,
          annualExpenses: holding.annualExpenses,
          appreciationPct: Math.round(appreciationPct * 10) / 10,
          netYieldPct: Math.round(yieldPct * 10) / 10,
          grossYieldPct: Math.round(grossYieldPct * 10) / 10,
          netAnnualRent: Math.round(netAnnualRent),
          totalReturn: Math.round(
            holding.currentValue - holding.purchasePrice + netAnnualRent
          ),
        },
        marketData,
      }
    })

    // Portfolio-level summary
    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0)
    const totalCost = holdings.reduce((s, h) => s + h.purchasePrice, 0)
    const totalMonthlyRent = holdings.reduce(
      (s, h) => s + h.monthlyRent * h.occupancyRate,
      0
    )
    const totalAnnualExpenses = holdings.reduce((s, h) => s + h.annualExpenses, 0)
    const netAnnualIncome = totalMonthlyRent * 12 - totalAnnualExpenses
    const avgOccupancy =
      holdings.length > 0
        ? holdings.reduce((s, h) => s + h.occupancyRate, 0) / holdings.length
        : 0

    const summary = {
      propertyCount: holdings.length,
      totalValue,
      totalCost,
      appreciationPct:
        totalCost > 0
          ? Math.round(((totalValue - totalCost) / totalCost) * 1000) / 10
          : 0,
      totalMonthlyIncome: Math.round(totalMonthlyRent - totalAnnualExpenses / 12),
      netAnnualIncome: Math.round(netAnnualIncome),
      avgYieldPct:
        totalValue > 0
          ? Math.round((netAnnualIncome / totalValue) * 1000) / 10
          : 0,
      avgOccupancy: Math.round(avgOccupancy * 1000) / 10,
      dataSource: "database",
    }

    return NextResponse.json({
      summary,
      holdings: enrichedHoldings,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[portfolio] Error:", err)
    return NextResponse.json(
      { error: "Failed to load portfolio data" },
      { status: 500 }
    )
  }
}
