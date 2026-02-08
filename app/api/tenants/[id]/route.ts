import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/tenants/:id
 * 
 * Returns tenant details. User must have access to the tenant.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)
    const supabase = getSupabaseAdminClient()

    // Verify access
    if (ctx.role !== "super_admin") {
      const { data: access } = await supabase
        .from("user_tenant_access")
        .select("id")
        .eq("user_id", ctx.userId)
        .eq("tenant_id", id)
        .maybeSingle()

      const isPrimaryTenant = ctx.tenantId === id

      if (!access && !isPrimaryTenant) {
        return NextResponse.json({ error: "Tenant not found or access denied" }, { status: 404 })
      }
    }

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("id, name, plan, type, logo_url, domain, contact_email, is_active, created_at, created_by")
      .eq("id", id)
      .single()

    if (error || !tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    // Get user count for this tenant
    const { count: userCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", id)

    return NextResponse.json({
      tenant: {
        ...tenant,
        userCount: userCount ?? 0,
      },
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in GET /api/tenants/:id:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/tenants/:id
 * 
 * Updates a tenant. Only super_admin can update tenants.
 * Body: { name?: string, plan?: string, type?: string, logo_url?: string, domain?: string, contact_email?: string, is_active?: boolean }
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can update tenants" }, { status: 403 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json({ error: "Tenant name cannot be empty" }, { status: 400 })
      }
      updates.name = body.name.trim()
    }

    if (body.plan !== undefined) {
      const validPlans = ["starter", "pro", "enterprise"]
      if (!validPlans.includes(body.plan)) {
        return NextResponse.json({ error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` }, { status: 400 })
      }
      updates.plan = body.plan
    }

    if (body.type !== undefined) {
      const validTypes = ["brokerage", "developer", "family_office", "other"]
      if (!validTypes.includes(body.type)) {
        return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 })
      }
      updates.type = body.type
    }

    if (body.logo_url !== undefined) {
      updates.logo_url = body.logo_url
    }

    if (body.domain !== undefined) {
      updates.domain = body.domain
    }

    if (body.contact_email !== undefined) {
      updates.contact_email = body.contact_email
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 })
      }
      updates.is_active = body.is_active
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: tenant, error } = await supabase
      .from("tenants")
      .update(updates)
      .eq("id", id)
      .select("id, name, plan, type, logo_url, domain, contact_email, is_active, created_at, created_by")
      .single()

    if (error) {
      console.error("Error updating tenant:", error)
      return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 })
    }

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    return NextResponse.json({ tenant })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in PUT /api/tenants/:id:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PATCH /api/tenants/:id
 * 
 * Toggles the is_active status of a tenant. Only super_admin.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can toggle tenant status" }, { status: 403 })
    }

    const supabase = getSupabaseAdminClient()

    // Fetch current state
    const { data: existing, error: fetchError } = await supabase
      .from("tenants")
      .select("id, is_active")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    // Toggle is_active
    const { data: tenant, error } = await supabase
      .from("tenants")
      .update({ is_active: !existing.is_active })
      .eq("id", id)
      .select("id, name, plan, type, logo_url, domain, contact_email, is_active, created_at, created_by")
      .single()

    if (error) {
      console.error("Error toggling tenant status:", error)
      return NextResponse.json({ error: "Failed to toggle tenant status" }, { status: 500 })
    }

    return NextResponse.json({ tenant })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in PATCH /api/tenants/:id:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/tenants/:id
 * 
 * Deletes a tenant and all associated data. Only super_admin.
 * This is destructive and irreversible.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can delete tenants" }, { status: 403 })
    }

    // Prevent deleting your own primary tenant
    if (ctx.tenantId === id) {
      return NextResponse.json(
        { error: "Cannot delete your own primary tenant. Switch to another tenant first." },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Check the tenant exists
    const { data: existing } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    // Get count of users in this tenant for the warning
    const { count: userCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", id)

    // Delete user_tenant_access records first
    await supabase
      .from("user_tenant_access")
      .delete()
      .eq("tenant_id", id)

    // Delete the tenant (cascade should handle related data via FK constraints)
    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting tenant:", error)
      return NextResponse.json({ error: "Failed to delete tenant. It may have dependent data." }, { status: 500 })
    }

    return NextResponse.json({
      message: `Tenant "${existing.name}" deleted successfully`,
      deletedTenantId: id,
      affectedUsers: userCount ?? 0,
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in DELETE /api/tenants/:id:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
