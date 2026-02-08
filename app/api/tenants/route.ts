import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

/**
 * GET /api/tenants
 * 
 * Lists tenants the current user has access to.
 * - super_admin: sees ALL tenants
 * - Other roles: sees tenants via user_tenant_access + their primary tenant
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const supabase = getSupabaseAdminClient()

    /** Enrich an array of tenant rows with user counts */
    async function withUserCounts(
      tenants: {
        id: string; name: string; plan: string; type: string | null;
        logo_url: string | null; domain: string | null; contact_email: string | null;
        is_active: boolean | null; created_at: string; created_by: string | null;
      }[]
    ) {
      if (tenants.length === 0) return tenants
      // Batch-count users per tenant
      const enriched = await Promise.all(
        tenants.map(async (t) => {
          const { count } = await supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", t.id)
          return { ...t, userCount: count ?? 0 }
        })
      )
      return enriched
    }

    const url = new URL(req.url)
    const activeOnly = url.searchParams.get("active_only") === "true"

    if (ctx.role === "super_admin") {
      // Super admins see all tenants
      let query = supabase
        .from("tenants")
        .select("id, name, plan, type, logo_url, domain, contact_email, is_active, created_at, created_by")
        .order("name")

      if (activeOnly) {
        query = query.eq("is_active", true)
      }

      const { data: tenants, error } = await query

      if (error) {
        console.error("Error fetching tenants:", error)
        return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 })
      }

      const enriched = await withUserCounts(tenants ?? [])
      return NextResponse.json({ tenants: enriched })
    }

    // Non-super_admin: get tenants through user_tenant_access + primary tenant
    const { data: accessRecords, error: accessError } = await supabase
      .from("user_tenant_access")
      .select("tenant_id, role, tenants(id, name, plan, type, logo_url, domain, contact_email, is_active, created_at, created_by)")
      .eq("user_id", ctx.userId)

    if (accessError) {
      console.error("Error fetching tenant access:", accessError)
      return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 })
    }

    type TenantRow = {
      id: string; name: string; plan: string; type: string | null;
      logo_url: string | null; domain: string | null; contact_email: string | null;
      is_active: boolean | null; created_at: string; created_by: string | null;
    }

    // Also include the user's primary tenant (from users table)
    const tenantIds = new Set((accessRecords ?? []).map(r => r.tenant_id))
    
    // Get user's primary tenant if not already included
    if (ctx.tenantId && !tenantIds.has(ctx.tenantId)) {
      const { data: primaryTenant } = await supabase
        .from("tenants")
        .select("id, name, plan, type, logo_url, domain, contact_email, is_active, created_at, created_by")
        .eq("id", ctx.tenantId)
        .single()

      if (primaryTenant) {
        const tenants = [
          primaryTenant,
          ...(accessRecords ?? [])
            .map(r => r.tenants)
            .filter((t): t is TenantRow => t !== null),
        ]
        const enriched = await withUserCounts(tenants)
        return NextResponse.json({ tenants: enriched })
      }
    }

    const tenants = (accessRecords ?? [])
      .map(r => r.tenants)
      .filter((t): t is TenantRow => t !== null)

    const enriched = await withUserCounts(tenants)
    return NextResponse.json({ tenants: enriched })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in GET /api/tenants:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/tenants
 * 
 * Creates a new tenant. Only super_admin can create tenants.
 * Body: { name: string, plan?: string, type?: string, logo_url?: string, domain?: string, contact_email?: string }
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can create tenants" }, { status: 403 })
    }

    const body = await req.json()
    const { name, plan = "starter", type = "brokerage", logo_url, domain, contact_email } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Tenant name is required" }, { status: 400 })
    }

    const validPlans = ["starter", "pro", "enterprise"]
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` }, { status: 400 })
    }

    const validTypes = ["brokerage", "developer", "family_office", "other"]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    const insertData: Record<string, unknown> = {
      name: name.trim(),
      plan,
      type,
      created_by: ctx.userId,
    }
    if (logo_url !== undefined) insertData.logo_url = logo_url
    if (domain !== undefined) insertData.domain = domain
    if (contact_email !== undefined) insertData.contact_email = contact_email

    const { data: tenant, error } = await supabase
      .from("tenants")
      .insert(insertData)
      .select("id, name, plan, type, logo_url, domain, contact_email, is_active, created_at, created_by")
      .single()

    if (error) {
      console.error("Error creating tenant:", error)
      return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 })
    }

    // Automatically give the creating super_admin access to the new tenant
    await supabase
      .from("user_tenant_access")
      .insert({
        user_id: ctx.userId,
        tenant_id: tenant.id,
        role: "owner",
        granted_by: ctx.userId,
      })

    return NextResponse.json({ tenant }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in POST /api/tenants:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
