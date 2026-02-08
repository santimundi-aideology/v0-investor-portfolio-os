import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

/**
 * GET /api/admin/stats
 *
 * Returns platform-wide statistics. Only super_admin can access.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can view platform stats" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Run all count queries in parallel
    const [
      totalTenantsResult,
      activeTenantsResult,
      totalUsersResult,
      activeUsersResult,
      agentCountResult,
      managerCountResult,
      investorCountResult,
      superAdminCountResult,
      starterPlanResult,
      proPlanResult,
      enterprisePlanResult,
      brokerageTypeResult,
      developerTypeResult,
      familyOfficeTypeResult,
      otherTypeResult,
      domainsCountResult,
    ] = await Promise.all([
      // Total tenants
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true }),
      // Active tenants
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      // Total users
      supabase
        .from("users")
        .select("id", { count: "exact", head: true }),
      // Active users
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      // Users by role
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "agent"),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "manager"),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "investor"),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin"),
      // Tenants by plan
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
      // Tenants by type
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("type", "brokerage"),
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("type", "developer"),
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("type", "family_office"),
      supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("type", "other"),
      // Superadmin domains count
      supabase
        .from("superadmin_domains")
        .select("domain", { count: "exact", head: true }),
    ])

    const stats = {
      totalTenants: totalTenantsResult.count ?? 0,
      activeTenants: activeTenantsResult.count ?? 0,
      totalUsers: totalUsersResult.count ?? 0,
      activeUsers: activeUsersResult.count ?? 0,
      usersByRole: {
        agent: agentCountResult.count ?? 0,
        manager: managerCountResult.count ?? 0,
        investor: investorCountResult.count ?? 0,
        super_admin: superAdminCountResult.count ?? 0,
      },
      tenantsByPlan: {
        starter: starterPlanResult.count ?? 0,
        pro: proPlanResult.count ?? 0,
        enterprise: enterprisePlanResult.count ?? 0,
      },
      tenantsByType: {
        brokerage: brokerageTypeResult.count ?? 0,
        developer: developerTypeResult.count ?? 0,
        family_office: familyOfficeTypeResult.count ?? 0,
        other: otherTypeResult.count ?? 0,
      },
      superadminDomains: domainsCountResult.count ?? 0,
    }

    return NextResponse.json({ stats })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in GET /api/admin/stats:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
