import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/executive-summary
 * Aggregated data for the executive portfolio summary page.
 *
 * Requires authentication. Tenant-specific data (investors) is scoped
 * to the authenticated tenant. Market-wide data (DLD transactions,
 * portal listings, signals) remains un-scoped as shared market intelligence.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (!ctx.tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdminClient()
    const warnings: string[] = []

    // ── Simple count queries (parallel) ──────────────────────────────
    const [
      investorsRes,
      signalsRes,
      listingsRes,
      transactionsRes,
      topOpportunitiesRes,
    ] = await Promise.all([
      // Active investors — tenant-scoped
      supabase
        .from("investors")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenantId)
        .eq("status", "active"),

      // New signals — market-wide intelligence
      supabase
        .from("market_signal")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),

      // Active portal listings — market-wide scraped data
      supabase
        .from("portal_listings")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),

      // Total DLD transactions — market-wide
      supabase
        .from("dld_transactions")
        .select("id", { count: "exact", head: true }),

      // Top pricing opportunities — market-wide signals
      supabase
        .from("market_signal")
        .select("id, geo_name, segment, severity, confidence_score, evidence, created_at")
        .eq("type", "pricing_opportunity")
        .eq("status", "new")
        .order("confidence_score", { ascending: false })
        .limit(5),
    ])

    // ── Aggregate queries via RPC (parallel, fault-tolerant) ─────────
    // These require GROUP BY / SUM which isn't available in the
    // Supabase JS client. We use exec_sql_readonly RPC and handle
    // failures gracefully with warnings.

    const [volumeResult, monthlyResult, topAreasResult, signalBdResult] =
      await Promise.allSettled([
        supabase
          .rpc("exec_sql_readonly", {
            sql_query: `SELECT COALESCE(SUM(actual_worth), 0)::bigint as total FROM dld_transactions WHERE trans_group_en = 'Sales'`,
          })
          .maybeSingle(),

        supabase.rpc("exec_sql_readonly", {
          sql_query: `
            SELECT
              TO_CHAR(DATE_TRUNC('month', instance_date::date), 'YYYY-MM') as month,
              COUNT(*)::int as txn_count,
              ROUND(AVG(actual_worth))::bigint as avg_price,
              ROUND(SUM(actual_worth))::bigint as total_volume
            FROM dld_transactions
            WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND instance_date IS NOT NULL
            GROUP BY DATE_TRUNC('month', instance_date::date)
            ORDER BY month DESC
            LIMIT 12
          `,
        }),

        supabase.rpc("exec_sql_readonly", {
          sql_query: `
            SELECT area_name_en as area,
                   COUNT(*)::int as txn_count,
                   ROUND(AVG(actual_worth))::bigint as avg_price,
                   ROUND(AVG(meter_sale_price))::bigint as avg_psm,
                   ROUND(SUM(actual_worth))::bigint as total_volume
            FROM dld_transactions
            WHERE trans_group_en = 'Sales' AND actual_worth > 0
            GROUP BY area_name_en
            ORDER BY txn_count DESC
            LIMIT 8
          `,
        }),

        supabase.rpc("exec_sql_readonly", {
          sql_query: `
            SELECT type, severity, COUNT(*)::int as count
            FROM market_signal
            GROUP BY type, severity
            ORDER BY count DESC
          `,
        }),
      ])

    // ── Parse aggregate results with fallbacks ───────────────────────

    // Total volume
    let totalVolume = 0
    if (volumeResult.status === "fulfilled") {
      const res = volumeResult.value
      if (res.data && !res.error) {
        const vol = Array.isArray(res.data) ? res.data[0] : res.data
        if (vol?.total) totalVolume = Number(vol.total)
      } else if (res.error) {
        warnings.push("Total volume calculation unavailable: " + res.error.message)
      }
    } else {
      warnings.push("Total volume query failed")
    }

    // Monthly trends
    let monthlyTrends: Array<{ month: string; txn_count: number; avg_price: number; total_volume: number }> = []
    if (monthlyResult.status === "fulfilled") {
      const res = monthlyResult.value
      if (res.data && !res.error) {
        const raw = Array.isArray(res.data) ? res.data : []
        monthlyTrends = raw.reverse() // chronological order
      } else if (res.error) {
        warnings.push("Monthly trends unavailable: " + res.error.message)
      }
    } else {
      warnings.push("Monthly trends query failed")
    }

    // Top areas
    let topAreas: Array<{ area: string; txn_count: number; avg_price: number; avg_psm: number; total_volume: number }> = []
    if (topAreasResult.status === "fulfilled") {
      const res = topAreasResult.value
      if (res.data && !res.error) {
        topAreas = Array.isArray(res.data) ? res.data : []
      } else if (res.error) {
        warnings.push("Top areas unavailable: " + res.error.message)
      }
    } else {
      warnings.push("Top areas query failed")
    }

    // Signal breakdown
    let signalBreakdown: Array<{ type: string; severity: string; count: number }> = []
    if (signalBdResult.status === "fulfilled") {
      const res = signalBdResult.value
      if (res.data && !res.error) {
        signalBreakdown = Array.isArray(res.data) ? res.data : []
      } else if (res.error) {
        warnings.push("Signal breakdown unavailable: " + res.error.message)
      }
    } else {
      warnings.push("Signal breakdown query failed")
    }

    // ── Top opportunities ────────────────────────────────────────────
    const opportunities = (topOpportunitiesRes.data ?? []).map((s) => {
      const evidence = (s.evidence || {}) as Record<string, unknown>
      return {
        id: s.id,
        area: s.geo_name,
        segment: s.segment,
        severity: s.severity,
        confidence: s.confidence_score,
        askingPrice: evidence.asking_price as number,
        savings: evidence.savings_aed as number,
        discountPct: evidence.psm_discount_pct as number,
        compositeScore: evidence.composite_score as number,
        rating: evidence.rating as string,
        bedrooms: evidence.bedrooms as number,
        createdAt: s.created_at,
      }
    })

    // ── Build response ───────────────────────────────────────────────
    return NextResponse.json({
      kpis: {
        activeInvestors: investorsRes.count ?? 0,
        newSignals: signalsRes.count ?? 0,
        activeListings: listingsRes.count ?? 0,
        totalTransactions: transactionsRes.count ?? 0,
        totalVolume,
      },
      monthlyTrends,
      topAreas,
      signalBreakdown,
      opportunities,
      ...(warnings.length > 0 ? { _warnings: warnings } : {}),
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[executive-summary] Error:", err)
    return NextResponse.json(
      { error: "Failed to load executive summary data" },
      { status: 500 },
    )
  }
}
