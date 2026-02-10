import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

type RouteParams = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/users/:id/resend-invite
 *
 * Resends an invitation email to a user whose invite is still pending
 * (invited but hasn't confirmed their email / set password).
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin" && ctx.role !== "manager") {
      return NextResponse.json(
        { error: "Only super admins and managers can resend invitations" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Get user from public.users
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, name, email, role, tenant_id, auth_user_id")
      .eq("id", id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Managers can only resend invites for users in their tenant
    if (ctx.role === "manager" && user.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check that this user actually has a pending invite
    if (user.auth_user_id) {
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.auth_user_id)
      if (authUser?.email_confirmed_at) {
        return NextResponse.json(
          { error: "This user has already accepted their invitation" },
          { status: 400 }
        )
      }
    }

    // Resend the invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      user.email,
      {
        data: {
          name: user.name,
          role: user.role,
          tenant_id: user.tenant_id || undefined,
        },
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      }
    )

    if (inviteError) {
      console.error("Error resending invitation:", inviteError)
      return NextResponse.json(
        { error: inviteError.message || "Failed to resend invitation" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Invitation resent to ${user.email}`,
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in POST /api/admin/users/:id/resend-invite:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
