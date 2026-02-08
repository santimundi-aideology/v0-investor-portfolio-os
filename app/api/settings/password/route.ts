import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext, createSupabaseServerClient } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"
import { z } from "zod"

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

/**
 * POST /api/settings/password
 * Change the current user's password.
 * Verifies the current password before applying the change.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = passwordChangeSchema.parse(body)

    const supabase = getSupabaseAdminClient()

    // Get auth user ID
    const { data: user } = await supabase
      .from("users")
      .select("auth_user_id, email")
      .eq("id", ctx.userId)
      .single()

    if (!user?.auth_user_id) {
      return NextResponse.json({ error: "User not found or no auth account" }, { status: 404 })
    }

    // Verify current password by attempting a sign-in
    const serverClient = await createSupabaseServerClient()
    const { error: verifyError } = await serverClient.auth.signInWithPassword({
      email: user.email,
      password: validated.currentPassword,
    })

    if (verifyError) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    // Update the password via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.auth_user_id,
      { password: validated.newPassword }
    )

    if (updateError) {
      console.error("Error updating password:", updateError)
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message || "Validation failed" },
        { status: 400 }
      )
    }
    console.error("[settings/password] Error:", err)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
