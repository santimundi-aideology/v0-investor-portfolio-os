import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

type RouteParams = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/users/:id/send-reset
 *
 * Sends a password reset email to the user.
 * This uses Supabase's built-in password reset flow.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin" && ctx.role !== "manager") {
      return NextResponse.json(
        { error: "Only super admins and managers can send password reset emails" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Get user
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, name, email, tenant_id")
      .eq("id", id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Managers can only send resets for users in their tenant
    if (ctx.role === "manager" && user.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Send password reset email via Supabase Auth
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: user.email,
      options: {
        redirectTo: `${appUrl}/auth/reset-password`,
      },
    })

    if (resetError) {
      console.error("Error sending reset email:", resetError)
      return NextResponse.json(
        { error: "Failed to send password reset email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Password reset email sent to ${user.email}`,
    })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in POST /api/admin/users/:id/send-reset:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
