import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

/**
 * GET /api/admin/ai-usage
 *
 * Returns platform-wide AI usage statistics. Only super_admin can access.
 *
 * Query params:
 *   - days: number of days of daily trends to return (default 30)
 *   - orgId: optional org filter
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can view AI usage stats" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdminClient()
    const url = new URL(req.url)
    const days = Math.min(parseInt(url.searchParams.get("days") || "30", 10), 90)
    const orgId = url.searchParams.get("orgId") || null

    // Calculate date boundaries
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split("T")[0]

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split("T")[0]

    // ──────────────────────────────────────────────────────
    // 1. Current month totals from ai_usage_daily_summary
    // ──────────────────────────────────────────────────────
    let monthQuery = supabase
      .from("ai_usage_daily_summary")
      .select("total_tokens, total_cost_usd, total_requests, failed_requests, scoring_tokens, news_tokens, chat_tokens, tools_tokens, other_tokens, scoring_requests, news_requests, chat_requests, tools_requests")
      .gte("date", monthStartStr)

    if (orgId) {
      monthQuery = monthQuery.eq("org_id", orgId)
    }

    // ──────────────────────────────────────────────────────
    // 2. Daily trends from ai_usage_daily_summary
    // ──────────────────────────────────────────────────────
    let trendsQuery = supabase
      .from("ai_usage_daily_summary")
      .select("date, total_tokens, total_cost_usd, total_requests, failed_requests, scoring_tokens, news_tokens, chat_tokens, tools_tokens, other_tokens")
      .gte("date", startDateStr)
      .order("date", { ascending: true })

    if (orgId) {
      trendsQuery = trendsQuery.eq("org_id", orgId)
    }

    // ──────────────────────────────────────────────────────
    // 3. Top tenants by AI consumption (current month)
    // ──────────────────────────────────────────────────────
    const topTenantsQuery = supabase
      .from("ai_usage_daily_summary")
      .select("org_id, total_tokens, total_cost_usd, total_requests, failed_requests")
      .gte("date", monthStartStr)

    // ──────────────────────────────────────────────────────
    // 4. Previous month totals (for comparison)
    // ──────────────────────────────────────────────────────
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const prevMonthStartStr = prevMonthStart.toISOString().split("T")[0]
    const prevMonthEndStr = prevMonthEnd.toISOString().split("T")[0]

    let prevMonthQuery = supabase
      .from("ai_usage_daily_summary")
      .select("total_tokens, total_cost_usd, total_requests, failed_requests")
      .gte("date", prevMonthStartStr)
      .lte("date", prevMonthEndStr)

    if (orgId) {
      prevMonthQuery = prevMonthQuery.eq("org_id", orgId)
    }

    // ──────────────────────────────────────────────────────
    // 5. Tenant names for enrichment
    // ──────────────────────────────────────────────────────
    const tenantsQuery = supabase
      .from("tenants")
      .select("id, name")

    // Run all queries in parallel
    const [monthResult, trendsResult, topTenantsResult, prevMonthResult, tenantsResult] = await Promise.all([
      monthQuery,
      trendsQuery,
      topTenantsQuery,
      prevMonthQuery,
      tenantsQuery,
    ])

    // ──────────────────────────────────────────────────────
    // Process current month totals
    // ──────────────────────────────────────────────────────
    const monthRows = monthResult.data || []
    const currentMonth = {
      totalTokens: monthRows.reduce((sum, r) => sum + (r.total_tokens || 0), 0),
      totalCost: monthRows.reduce((sum, r) => sum + parseFloat(String(r.total_cost_usd || 0)), 0),
      totalRequests: monthRows.reduce((sum, r) => sum + (r.total_requests || 0), 0),
      failedRequests: monthRows.reduce((sum, r) => sum + (r.failed_requests || 0), 0),
      byType: {
        scoring: monthRows.reduce((sum, r) => sum + (r.scoring_tokens || 0), 0),
        news: monthRows.reduce((sum, r) => sum + (r.news_tokens || 0), 0),
        chat: monthRows.reduce((sum, r) => sum + (r.chat_tokens || 0), 0),
        tools: monthRows.reduce((sum, r) => sum + (r.tools_tokens || 0), 0),
        other: monthRows.reduce((sum, r) => sum + (r.other_tokens || 0), 0),
      },
      requestsByType: {
        scoring: monthRows.reduce((sum, r) => sum + (r.scoring_requests || 0), 0),
        news: monthRows.reduce((sum, r) => sum + (r.news_requests || 0), 0),
        chat: monthRows.reduce((sum, r) => sum + (r.chat_requests || 0), 0),
        tools: monthRows.reduce((sum, r) => sum + (r.tools_requests || 0), 0),
      },
    }

    // ──────────────────────────────────────────────────────
    // Process previous month totals
    // ──────────────────────────────────────────────────────
    const prevMonthRows = prevMonthResult.data || []
    const previousMonth = {
      totalTokens: prevMonthRows.reduce((sum, r) => sum + (r.total_tokens || 0), 0),
      totalCost: prevMonthRows.reduce((sum, r) => sum + parseFloat(String(r.total_cost_usd || 0)), 0),
      totalRequests: prevMonthRows.reduce((sum, r) => sum + (r.total_requests || 0), 0),
      failedRequests: prevMonthRows.reduce((sum, r) => sum + (r.failed_requests || 0), 0),
    }

    // ──────────────────────────────────────────────────────
    // Process daily trends (aggregate across orgs per day)
    // ──────────────────────────────────────────────────────
    const trendsRows = trendsResult.data || []
    const dailyMap = new Map<string, {
      date: string
      totalTokens: number
      totalCost: number
      totalRequests: number
      failedRequests: number
      scoring: number
      news: number
      chat: number
      tools: number
      other: number
    }>()

    for (const row of trendsRows) {
      const dateKey = row.date
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        totalTokens: 0,
        totalCost: 0,
        totalRequests: 0,
        failedRequests: 0,
        scoring: 0,
        news: 0,
        chat: 0,
        tools: 0,
        other: 0,
      }
      existing.totalTokens += row.total_tokens || 0
      existing.totalCost += parseFloat(String(row.total_cost_usd || 0))
      existing.totalRequests += row.total_requests || 0
      existing.failedRequests += row.failed_requests || 0
      existing.scoring += row.scoring_tokens || 0
      existing.news += row.news_tokens || 0
      existing.chat += row.chat_tokens || 0
      existing.tools += row.tools_tokens || 0
      existing.other += row.other_tokens || 0
      dailyMap.set(dateKey, existing)
    }

    const dailyTrends = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    // ──────────────────────────────────────────────────────
    // Process top tenants
    // ──────────────────────────────────────────────────────
    const tenantMap = new Map<string, {
      orgId: string
      totalTokens: number
      totalCost: number
      totalRequests: number
      failedRequests: number
    }>()

    const topTenantRows = topTenantsResult.data || []
    for (const row of topTenantRows) {
      if (!row.org_id) continue
      const existing = tenantMap.get(row.org_id) || {
        orgId: row.org_id,
        totalTokens: 0,
        totalCost: 0,
        totalRequests: 0,
        failedRequests: 0,
      }
      existing.totalTokens += row.total_tokens || 0
      existing.totalCost += parseFloat(String(row.total_cost_usd || 0))
      existing.totalRequests += row.total_requests || 0
      existing.failedRequests += row.failed_requests || 0
      tenantMap.set(row.org_id, existing)
    }

    // Enrich with tenant names and sort by cost
    const tenantNames = new Map<string, string>()
    for (const t of tenantsResult.data || []) {
      tenantNames.set(t.id, t.name)
    }

    const topTenants = Array.from(tenantMap.values())
      .map((t) => ({
        ...t,
        orgName: tenantNames.get(t.orgId) || "Unknown",
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)

    return NextResponse.json({
      currentMonth,
      previousMonth,
      dailyTrends,
      topTenants,
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in GET /api/admin/ai-usage:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
