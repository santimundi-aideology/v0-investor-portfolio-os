import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"
import { PLAN_CONFIGS, type PlanTier } from "@/lib/plans/config"

/**
 * GET /api/admin/platform-usage
 *
 * Returns comprehensive platform usage stats across all tenants.
 * Only super_admin can access.
 *
 * Response shape:
 * {
 *   kpis: { totalTenants, totalUsers, totalProperties, estimatedMRR, ... },
 *   planDistribution: [{ name, value, displayName }],
 *   topTenants: [{ id, name, plan, properties, investors, deals, memos, users }],
 *   trends: { newTenantsThisMonth, newUsersThisMonth, newPropertiesThisMonth, newDealsThisMonth },
 *   revenueByPlan: { starter: { count, mrr }, pro: { count, mrr }, enterprise: { count, mrr } }
 * }
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can view platform usage" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Get the start of the current month for trend calculations
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // ─── Run all queries in parallel ───────────────────────────
    const [
      // Core counts
      tenantsResult,
      activeTenantsResult,
      usersResult,
      activeUsersResult,
      listingsResult,
      investorsResult,
      dealsResult,
      memosResult,
      // Plan distribution
      starterResult,
      proResult,
      enterpriseResult,
      // Trends: new this month
      newTenantsResult,
      newUsersResult,
      newListingsResult,
      newDealsResult,
      // Top tenants with their activity - get all tenant data first
      tenantsDataResult,
    ] = await Promise.all([
      // Core counts
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("investors")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("deal_rooms")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("memos")
        .select("id", { count: "exact", head: true }),
      // Plan distribution
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("plan", "starter"),
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("plan", "pro"),
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("plan", "enterprise"),
      // Trends: new this month
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth),
      supabase
        .from("deal_rooms")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth),
      // All tenants for the activity table
      supabase
        .from("tenants")
        .select("id, name, plan, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ])

    // ─── Build per-tenant activity counts ──────────────────────
    const tenants = tenantsDataResult.data ?? []
    const tenantIds = tenants.map((t) => t.id)

    // Fetch per-tenant counts in parallel (skip if no tenants)
    const emptyResult = { data: [] as { tenant_id: string | null }[] }
    const [
      tenantListingsResult,
      tenantInvestorsResult,
      tenantDealsResult,
      tenantMemosResult,
      tenantUsersResult,
    ] = tenantIds.length === 0
      ? [emptyResult, emptyResult, emptyResult, emptyResult, emptyResult]
      : await Promise.all([
          supabase
            .from("listings")
            .select("tenant_id")
            .in("tenant_id", tenantIds),
          supabase
            .from("investors")
            .select("tenant_id")
            .in("tenant_id", tenantIds),
          supabase
            .from("deal_rooms")
            .select("tenant_id")
            .in("tenant_id", tenantIds),
          supabase
            .from("memos")
            .select("tenant_id")
            .in("tenant_id", tenantIds),
          supabase
            .from("users")
            .select("tenant_id")
            .in("tenant_id", tenantIds),
        ])

    // Count occurrences per tenant
    function countByTenant(rows: { tenant_id: string | null }[] | null): Record<string, number> {
      const counts: Record<string, number> = {}
      if (!rows) return counts
      for (const row of rows) {
        if (row.tenant_id) {
          counts[row.tenant_id] = (counts[row.tenant_id] || 0) + 1
        }
      }
      return counts
    }

    const listingsByTenant = countByTenant(tenantListingsResult.data)
    const investorsByTenant = countByTenant(tenantInvestorsResult.data)
    const dealsByTenant = countByTenant(tenantDealsResult.data)
    const memosByTenant = countByTenant(tenantMemosResult.data)
    const usersByTenant = countByTenant(tenantUsersResult.data)

    // Build the top tenants array sorted by total activity
    const topTenants = tenants
      .map((t) => ({
        id: t.id,
        name: t.name,
        plan: t.plan as PlanTier,
        properties: listingsByTenant[t.id] || 0,
        investors: investorsByTenant[t.id] || 0,
        deals: dealsByTenant[t.id] || 0,
        memos: memosByTenant[t.id] || 0,
        users: usersByTenant[t.id] || 0,
      }))
      .sort(
        (a, b) =>
          b.properties + b.deals + b.investors -
          (a.properties + a.deals + a.investors)
      )
      .slice(0, 5)

    // ─── Revenue metrics ───────────────────────────────────────
    const starterCount = starterResult.count ?? 0
    const proCount = proResult.count ?? 0
    const enterpriseCount = enterpriseResult.count ?? 0

    const starterMRR = starterCount * PLAN_CONFIGS.starter.price.monthly
    const proMRR = proCount * PLAN_CONFIGS.pro.price.monthly
    // Enterprise is custom pricing, estimate at $1,500/mo per seat
    const enterpriseMRR = enterpriseCount * 1500
    const estimatedMRR = starterMRR + proMRR + enterpriseMRR

    // ─── Build response ────────────────────────────────────────
    const response = {
      kpis: {
        totalTenants: tenantsResult.count ?? 0,
        activeTenants: activeTenantsResult.count ?? 0,
        totalUsers: usersResult.count ?? 0,
        activeUsers: activeUsersResult.count ?? 0,
        totalProperties: listingsResult.count ?? 0,
        totalInvestors: investorsResult.count ?? 0,
        totalDeals: dealsResult.count ?? 0,
        totalMemos: memosResult.count ?? 0,
        estimatedMRR,
      },
      planDistribution: [
        {
          name: "starter",
          displayName: PLAN_CONFIGS.starter.displayName,
          value: starterCount,
        },
        {
          name: "pro",
          displayName: PLAN_CONFIGS.pro.displayName,
          value: proCount,
        },
        {
          name: "enterprise",
          displayName: PLAN_CONFIGS.enterprise.displayName,
          value: enterpriseCount,
        },
      ],
      topTenants,
      trends: {
        newTenantsThisMonth: newTenantsResult.count ?? 0,
        newUsersThisMonth: newUsersResult.count ?? 0,
        newPropertiesThisMonth: newListingsResult.count ?? 0,
        newDealsThisMonth: newDealsResult.count ?? 0,
      },
      revenueByPlan: {
        starter: { count: starterCount, mrr: starterMRR },
        pro: { count: proCount, mrr: proMRR },
        enterprise: { count: enterpriseCount, mrr: enterpriseMRR },
      },
    }

    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in GET /api/admin/platform-usage:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
