import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

/**
 * GET /api/admin/users
 *
 * Lists users with optional filters.
 * - super_admin: can see ALL users across tenants
 * - manager: can see users within their tenant
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin" && ctx.role !== "manager") {
      return NextResponse.json(
        { error: "Only super admins and managers can list users" },
        { status: 403 }
      )
    }

    const url = new URL(req.url)
    const tenantFilter = url.searchParams.get("tenantId")
    const roleFilter = url.searchParams.get("role")
    const statusFilter = url.searchParams.get("status") // "active" | "inactive"
    const search = url.searchParams.get("search")

    const supabase = getSupabaseAdminClient()

    let query = supabase
      .from("users")
      .select("id, tenant_id, name, email, role, phone, whatsapp, avatar_url, is_active, created_at, updated_at, auth_user_id, last_sign_in_at, email_verified")
      .order("created_at", { ascending: false })

    // Scope by tenant
    if (ctx.role !== "super_admin") {
      // Managers can only see users in their own tenant
      query = query.eq("tenant_id", ctx.tenantId!)
    } else if (tenantFilter) {
      query = query.eq("tenant_id", tenantFilter)
    }

    // Role filter
    if (roleFilter) {
      query = query.eq("role", roleFilter)
    }

    // Status filter
    if (statusFilter === "active") {
      query = query.eq("is_active", true)
    } else if (statusFilter === "inactive") {
      query = query.eq("is_active", false)
    }

    // Search by name or email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Enrich with tenant name
    const tenantIds = [...new Set((users ?? []).map((u) => u.tenant_id).filter(Boolean))]
    let tenantMap: Record<string, string> = {}
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name")
        .in("id", tenantIds)
      if (tenants) {
        tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.name]))
      }
    }

    const enrichedUsers = (users ?? []).map((u) => ({
      ...u,
      tenantName: u.tenant_id ? tenantMap[u.tenant_id] ?? "Unknown" : "No Company",
    }))

    return NextResponse.json({ users: enrichedUsers })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in GET /api/admin/users:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/admin/users
 *
 * Creates a new user in Supabase Auth + public.users.
 * Only super_admin and manager can create users.
 * Managers can only create users within their own tenant.
 *
 * Body: { name, email, password, role, tenantId, phone?, whatsapp? }
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin" && ctx.role !== "manager") {
      return NextResponse.json(
        { error: "Only super admins and managers can create users" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { name, email, password, role, tenantId, phone, whatsapp } = body

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password is required and must be at least 8 characters" },
        { status: 400 }
      )
    }

    const validRoles = ["agent", "manager", "investor", "super_admin"]
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      )
    }

    // Managers cannot create super_admins or managers
    if (ctx.role === "manager" && (role === "super_admin" || role === "manager")) {
      return NextResponse.json(
        { error: "Managers can only create agents and investors" },
        { status: 403 }
      )
    }

    // Determine the tenant
    let targetTenantId = tenantId
    if (ctx.role === "manager") {
      // Managers can only create in their own tenant
      targetTenantId = ctx.tenantId
    }

    if (!targetTenantId && role !== "super_admin") {
      return NextResponse.json(
        { error: "Tenant (company) is required for non-admin users" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Check if email already exists in public.users
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }

    // 1. Create user in Supabase Auth
    //    Pass all metadata so the DB trigger (handle_new_auth_user) creates
    //    the public.users record with the correct tenant, role, etc.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role,
        tenant_id: targetTenantId || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      return NextResponse.json(
        { error: authError.message || "Failed to create authentication account" },
        { status: 500 }
      )
    }

    // 2. The DB trigger (handle_new_auth_user) auto-creates the public.users record.
    //    Fetch it and update any fields the trigger may not have set correctly.
    const { data: newUser, error: fetchError } = await supabase
      .from("users")
      .select("id, tenant_id, name, email, role, phone, whatsapp, is_active, created_at, auth_user_id")
      .eq("auth_user_id", authData.user.id)
      .single()

    if (fetchError || !newUser) {
      console.error("Error fetching trigger-created user:", fetchError)
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      )
    }

    // 3. Update the trigger-created record with any fields that need correcting
    const updates: Record<string, unknown> = {}
    if (newUser.tenant_id !== targetTenantId) updates.tenant_id = targetTenantId || null
    if (newUser.role !== role) updates.role = role
    if (newUser.name !== name.trim()) updates.name = name.trim()
    if (phone && newUser.phone !== phone) updates.phone = phone
    if (whatsapp && newUser.whatsapp !== whatsapp) updates.whatsapp = whatsapp

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      const { error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", newUser.id)

      if (updateError) {
        console.error("Error updating user fields:", updateError)
      }
      // Refetch the updated user
      Object.assign(newUser, updates)
    }

    // 4. Grant tenant access if applicable
    if (targetTenantId) {
      await supabase.from("user_tenant_access").insert({
        user_id: newUser.id,
        tenant_id: targetTenantId,
        role: role === "super_admin" ? "owner" : "member",
        granted_by: ctx.userId,
      })
    }

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in POST /api/admin/users:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
