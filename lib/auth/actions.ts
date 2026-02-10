"use server"

import { createSupabaseServerClient } from "./server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export type AuthResult = {
  success: boolean
  error?: string
  message?: string
}

/**
 * Sign in with email and password
 */
export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { success: false, error: "Email and password are required" }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

/**
 * Sign up with email, password, and user details
 */
export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const phone = formData.get("phone") as string | null
  const whatsapp = formData.get("whatsapp") as string | null
  const requestedRole = (formData.get("role") as string) || "realtor"
  const platformRole = requestedRole === "investor" ? "investor" : "agent"

  if (!email || !password) {
    return { success: false, error: "Email and password are required" }
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split("@")[0],
        phone,
        whatsapp,
        role: platformRole,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { 
    success: true, 
    message: "Check your email to confirm your account" 
  }
}

/**
 * Sign out the current user
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

/**
 * Send password reset email
 */
export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string

  if (!email) {
    return { success: false, error: "Email is required" }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { 
    success: true, 
    message: "Check your email for the password reset link" 
  }
}

/**
 * Update password (after reset)
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!password || !confirmPassword) {
    return { success: false, error: "Password is required" }
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match" }
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true, message: "Password updated successfully" }
}

/**
 * Resolves the correct redirect path after password setup/reset based on user role.
 * - super_admin (no tenant) → /admin
 * - investor → /investor/dashboard
 * - everyone else → /dashboard
 */
export async function resolveUserRedirect(): Promise<string> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      const adminClient = getSupabaseAdminClient()
      const { data: userData } = await adminClient
        .from("users")
        .select("role, tenant_id")
        .eq("auth_user_id", authUser.id)
        .maybeSingle()

      if (userData?.role === "super_admin" && !userData?.tenant_id) {
        return "/admin"
      }
      if (userData?.role === "investor") {
        return "/investor/dashboard"
      }
    }
  } catch (err) {
    console.warn("[resolveUserRedirect] Error:", err)
  }

  return "/dashboard"
}

/**
 * Resend email verification
 */
export async function resendVerification(email: string): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, message: "Verification email sent" }
}
