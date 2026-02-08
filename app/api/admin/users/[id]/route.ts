import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/users/:id
 *
 * Returns a single user's details.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin" && ctx.role !== "manager") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdminClient()

    const { data: user, error } = await supabase
      .from("users")
      .select("id, tenant_id, name, email, role, phone, whatsapp, avatar_url, is_active, created_at, updated_at, auth_user_id, last_sign_in_at, email_verified")
      .eq("id", id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Managers can only see users in their tenant
    if (ctx.role === "manager" && user.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get tenant name
    let tenantName = "No Company"
    if (user.tenant_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", user.tenant_id)
        .single()
      tenantName = tenant?.name ?? "Unknown"
    }

    return NextResponse.json({
      user: { ...user, tenantName },
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in GET /api/admin/users/:id:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/admin/users/:id
 *
 * Updates a user's profile.
 * Body: { name?, email?, role?, tenantId?, phone?, whatsapp?, isActive? }
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin" && ctx.role !== "manager") {
      return NextResponse.json(
        { error: "Only super admins and managers can update users" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Get current user
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("id, tenant_id, role, auth_user_id")
      .eq("id", id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Managers can only update users in their tenant
    if (ctx.role === "manager" && existingUser.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Prevent self-demotion for super_admins
    if (existingUser.id === ctx.userId) {
      // Allow most updates but not role changes
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
      }
      updates.name = body.name.trim()
    }

    if (body.email !== undefined) {
      if (typeof body.email !== "string" || !body.email.includes("@")) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 })
      }
      updates.email = body.email.toLowerCase().trim()

      // Also update email in Supabase Auth
      if (existingUser.auth_user_id) {
        const { error: authEmailError } = await supabase.auth.admin.updateUserById(
          existingUser.auth_user_id,
          { email: updates.email as string }
        )
        if (authEmailError) {
          console.error("Error updating auth email:", authEmailError)
          return NextResponse.json(
            { error: "Failed to update email in authentication system" },
            { status: 500 }
          )
        }
      }
    }

    if (body.role !== undefined) {
      const validRoles = ["agent", "manager", "investor", "super_admin"]
      if (!validRoles.includes(body.role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
          { status: 400 }
        )
      }
      // Managers cannot promote to super_admin or manager
      if (ctx.role === "manager" && (body.role === "super_admin" || body.role === "manager")) {
        return NextResponse.json(
          { error: "Managers can only assign agent and investor roles" },
          { status: 403 }
        )
      }
      updates.role = body.role
    }

    if (body.tenantId !== undefined) {
      if (ctx.role !== "super_admin") {
        return NextResponse.json(
          { error: "Only super admins can change a user's company" },
          { status: 403 }
        )
      }
      updates.tenant_id = body.tenantId || null
    }

    if (body.phone !== undefined) {
      updates.phone = body.phone || null
    }

    if (body.whatsapp !== undefined) {
      updates.whatsapp = body.whatsapp || null
    }

    if (body.isActive !== undefined) {
      updates.is_active = Boolean(body.isActive)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, tenant_id, name, email, role, phone, whatsapp, avatar_url, is_active, created_at, updated_at, auth_user_id")
      .single()

    if (updateError) {
      console.error("Error updating user:", updateError)
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }

    return NextResponse.json({ user: updatedUser })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in PUT /api/admin/users/:id:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/:id
 *
 * Deletes a user. Removes from both public.users and Supabase Auth.
 * Only super_admin can fully delete users.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can delete users" },
        { status: 403 }
      )
    }

    // Prevent self-deletion
    if (id === ctx.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Get user details
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, name, auth_user_id")
      .eq("id", id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete tenant access records
    await supabase
      .from("user_tenant_access")
      .delete()
      .eq("user_id", id)

    // Delete from public.users
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }

    // Delete from Supabase Auth
    if (user.auth_user_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        user.auth_user_id
      )
      if (authDeleteError) {
        console.error("Error deleting auth user (profile already deleted):", authDeleteError)
        // Don't fail the request — profile is already gone
      }
    }

    return NextResponse.json({
      message: `User "${user.name}" deleted successfully`,
      deletedUserId: id,
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in DELETE /api/admin/users/:id:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
