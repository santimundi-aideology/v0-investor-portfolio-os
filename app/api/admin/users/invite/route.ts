import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

/**
 * POST /api/admin/users/invite
 *
 * Invites a user by email. Creates the auth account and sends an
 * invitation email with a magic link so the user can set their password.
 *
 * Body: { email, name, role, tenantId, org_role? }
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin" && ctx.role !== "manager") {
      return NextResponse.json(
        { error: "Only super admins and managers can invite users" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { email, name, role, tenantId, org_role: rawOrgRole } = body

    // Validation
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const validRoles = ["agent", "manager", "investor", "super_admin"]
    const userRole = role && validRoles.includes(role) ? role : "agent"

    // Managers cannot invite super_admins or managers
    if (ctx.role === "manager" && (userRole === "super_admin" || userRole === "manager")) {
      return NextResponse.json(
        { error: "Managers can only invite agents and investors" },
        { status: 403 }
      )
    }

    // Validate org_role
    const validOrgRoles = ["owner", "admin", "member"]
    let orgRole = "member"
    if (rawOrgRole !== undefined) {
      if (!validOrgRoles.includes(rawOrgRole)) {
        return NextResponse.json(
          { error: `Invalid org_role. Must be one of: ${validOrgRoles.join(", ")}` },
          { status: 400 }
        )
      }
      orgRole = rawOrgRole
    }

    // Managers can only set org_role to "member"
    if (ctx.role === "manager" && orgRole !== "member") {
      return NextResponse.json(
        { error: "Managers can only assign the member org role" },
        { status: 403 }
      )
    }

    // Determine tenant
    let targetTenantId = tenantId
    if (ctx.role === "manager") {
      targetTenantId = ctx.tenantId
    }

    const supabase = getSupabaseAdminClient()

    // Check if email already exists
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

    // Create user via inviteUserByEmail which sends the invite email automatically
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        data: {
          name: name.trim(),
          role: userRole,
          tenant_id: targetTenantId || undefined,
        },
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      }
    )

    if (authError) {
      console.error("Error inviting user:", authError)
      return NextResponse.json(
        { error: authError.message || "Failed to send invitation" },
        { status: 500 }
      )
    }

    // The DB trigger (handle_new_auth_user) auto-creates the public.users record.
    // Fetch and update if needed.
    const { data: newUser } = await supabase
      .from("users")
      .select("id, tenant_id, name, email, role, is_active, created_at")
      .eq("auth_user_id", authData.user.id)
      .single()

    if (newUser) {
      // Update fields the trigger may not have set correctly
      const updates: Record<string, unknown> = {}
      if (targetTenantId && newUser.tenant_id !== targetTenantId) updates.tenant_id = targetTenantId
      if (newUser.role !== userRole) updates.role = userRole

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        await supabase.from("users").update(updates).eq("id", newUser.id)
      }

      // Grant tenant access
      if (targetTenantId) {
        await supabase.from("user_tenant_access").insert({
          user_id: newUser.id,
          tenant_id: targetTenantId,
          role: orgRole,
          granted_by: ctx.userId,
        })
      }
    }

    return NextResponse.json(
      {
        message: `Invitation sent to ${email}`,
        user: newUser || { email: email.toLowerCase().trim() },
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in POST /api/admin/users/invite:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
