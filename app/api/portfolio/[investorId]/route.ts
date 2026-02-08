import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getHoldingsByInvestor, getPortfolioSummary } from "@/lib/db/holdings"

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

    // Enrich each holding with DLD market data
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        // Try to get listing details from DB for area/type info
        let property: { title?: string; area?: string; type?: string; imageUrl?: string; size?: number; bedrooms?: number; bathrooms?: number } | null = null
        try {
          const { data: listingData } = await supabase
            .from("listings")
            .select("title, area, type, size, bedrooms, bathrooms")
            .eq("id", holding.listingId)
            .maybeSingle()
          if (listingData) {
            property = listingData
          }
        } catch {
          // Listing may not exist
        }

        // Get area for DLD comparison
        const area = property?.area || null
        const propertyType = property?.type || null
        const sizeSqm = property?.size ? Number(property.size) : null

        let marketData: {
          dldMedianPrice: number | null
          dldMedianPsm: number | null
          priceVsMarketPct: number | null
          comparableCount: number
          areaTransactionCount: number
          monthlyTrends: { month: string; avgPrice: number; volume: number }[]
          marketYield: number | null
        } = {
          dldMedianPrice: null,
          dldMedianPsm: null,
          priceVsMarketPct: null,
          comparableCount: 0,
          areaTransactionCount: 0,
          monthlyTrends: [],
          marketYield: null,
        }

        if (area) {
          try {
            // Get DLD comparables for this holding
            const { data: compData } = await supabase.rpc("compare_listing_to_dld", {
              p_area_name: area,
              p_property_type: propertyType,
              p_size_sqm: sizeSqm,
              p_asking_price: holding.currentValue,
            })

            if (compData && compData.length > 0) {
              const comp = compData[0]
              marketData.dldMedianPrice = comp.dld_median_price
              marketData.dldMedianPsm = comp.dld_median_psm
              marketData.priceVsMarketPct = comp.price_discount_pct ? -comp.price_discount_pct : null
              marketData.comparableCount = comp.comparable_count
            }

            // Get area transaction volume
            const { data: areaStats } = await supabase
              .from("dld_area_stats")
              .select("transaction_count")
              .eq("area_name_en", area)
              .maybeSingle()

            if (areaStats) {
              marketData.areaTransactionCount = areaStats.transaction_count
            }

            // Get monthly trends for the area
            const { data: trends } = await supabase
              .from("dld_monthly_trends")
              .select("month, avg_price, total_volume")
              .eq("area_name_en", area)
              .order("month", { ascending: false })
              .limit(12)

            if (trends && trends.length > 0) {
              marketData.monthlyTrends = trends.reverse().map((t: Record<string, unknown>) => ({
                month: t.month as string,
                avgPrice: Number(t.avg_price),
                volume: Number(t.total_volume),
              }))
            }
          } catch (err) {
            // DLD data may not be available for all areas
            console.warn(`[portfolio] DLD data not available for area: ${area}`, err)
          }
        }

        // Calculate metrics
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
    )

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
