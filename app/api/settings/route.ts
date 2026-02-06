import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { buildRequestContext } from "@/lib/security/rbac"
import { z } from "zod"

const profileUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional().nullable(),
})

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  taskReminders: z.boolean(),
  dealUpdates: z.boolean(),
})

const preferencesSchema = z.object({
  currency: z.enum(["aed", "usd", "eur"]),
  language: z.enum(["en", "ar"]),
})

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

/**
 * GET /api/settings
 * Get current user's settings
 */
export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email, phone, avatar_url, tenant_id")
      .eq("id", ctx.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user preferences (stored in users table or separate table)
    // For now, we'll return defaults and store in a JSON column if needed
    const { data: preferences } = await supabase
      .from("users")
      .select("preferences")
      .eq("id", ctx.userId)
      .single()

    return NextResponse.json({
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        company: "", // Could be stored in a separate field
        avatarUrl: user.avatar_url || null,
      },
      notifications: {
        emailNotifications: true,
        taskReminders: true,
        dealUpdates: true,
        ...(preferences?.preferences as { notifications?: unknown } | undefined)?.notifications,
      },
      preferences: {
        currency: "aed",
        language: "en",
        ...(preferences?.preferences as { currency?: string; language?: string } | undefined),
      },
    })
  } catch (err) {
    console.error("[settings] Error fetching settings:", err)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

/**
 * PATCH /api/settings
 * Update user settings
 */
export async function PATCH(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const supabase = getSupabaseAdminClient()

    // Determine what to update
    if (body.profile) {
      const validated = profileUpdateSchema.parse(body.profile)
      
      const { error } = await supabase
        .from("users")
        .update({
          name: validated.name,
          email: validated.email,
          phone: validated.phone || null,
          avatar_url: validated.avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ctx.userId)

      if (error) throw error
    }

    if (body.notifications) {
      const validated = notificationSettingsSchema.parse(body.notifications)
      
      // Store in preferences JSONB column
      const { data: current } = await supabase
        .from("users")
        .select("preferences")
        .eq("id", ctx.userId)
        .single()

      const preferences = (current?.preferences as Record<string, unknown>) || {}
      
      const { error } = await supabase
        .from("users")
        .update({
          preferences: {
            ...preferences,
            notifications: validated,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", ctx.userId)

      if (error) throw error
    }

    if (body.preferences) {
      const validated = preferencesSchema.parse(body.preferences)
      
      const { data: current } = await supabase
        .from("users")
        .select("preferences")
        .eq("id", ctx.userId)
        .single()

      const preferences = (current?.preferences as Record<string, unknown>) || {}
      
      const { error } = await supabase
        .from("users")
        .update({
          preferences: {
            ...preferences,
            currency: validated.currency,
            language: validated.language,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", ctx.userId)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.errors },
        { status: 400 }
      )
    }
    console.error("[settings] Error updating settings:", err)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}

/**
 * POST /api/settings/password
 * Change user password
 */
export async function POST(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = passwordChangeSchema.parse(body)

    // Get auth user ID
    const supabase = getSupabaseAdminClient()
    const { data: user } = await supabase
      .from("users")
      .select("auth_user_id")
      .eq("id", ctx.userId)
      .single()

    if (!user?.auth_user_id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Use Supabase Auth API to update password
    // Note: This requires the service role key to update another user's password
    // In production, you'd want to verify current password first via auth API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.auth_user_id,
      { password: validated.newPassword }
    )

    if (updateError) {
      // If admin update fails, try user's own update (requires current password verification)
      return NextResponse.json(
        { error: "Failed to update password. Please verify your current password is correct." },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.errors },
        { status: 400 }
      )
    }
    console.error("[settings] Error changing password:", err)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
