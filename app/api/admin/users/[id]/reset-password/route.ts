import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

type RouteParams = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/users/:id/reset-password
 *
 * Resets a user's password. Only super_admin can reset passwords.
 * Body: { newPassword: string }
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin" && ctx.role !== "manager") {
      return NextResponse.json(
        { error: "Only super admins and managers can reset passwords" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { newPassword } = body

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password is required and must be at least 8 characters" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Get user
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, name, tenant_id, auth_user_id")
      .eq("id", id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Managers can only reset passwords for users in their tenant
    if (ctx.role === "manager" && user.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (!user.auth_user_id) {
      return NextResponse.json(
        { error: "User does not have an authentication account. They may be a demo user." },
        { status: 400 }
      )
    }

    // Reset password in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user.auth_user_id,
      { password: newPassword }
    )

    if (authError) {
      console.error("Error resetting password:", authError)
      return NextResponse.json(
        { error: "Failed to reset password" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Password reset successfully for "${user.name}"`,
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in POST /api/admin/users/:id/reset-password:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
