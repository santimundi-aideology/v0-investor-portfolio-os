import "server-only"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseAdminClient } from "@/lib/db/client"
import type { PlatformRole, RequestContext } from "@/lib/security/rbac"
import type { Database } from "@/lib/database.types"

export type AuthUser = {
  id: string
  email: string
  name: string
  role: PlatformRole
  tenantId: string
  phone?: string
  whatsapp?: string
  avatarUrl?: string
  isActive: boolean
}

/**
 * Creates a Supabase client for server-side operations (SSR).
 * Handles cookie management for session persistence.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  })
}

/**
 * Gets the current authenticated session and user data.
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<{ user: AuthUser; session: { accessToken: string } } | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return null
    }

    // Get user profile from public.users
    const adminClient = getSupabaseAdminClient()
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("id, tenant_id, name, email, role, phone, whatsapp, avatar_url, is_active")
      .eq("auth_user_id", session.user.id)
      .single()

    if (userError || !userData) {
      // User exists in auth but not in public.users - shouldn't happen with triggers
      console.error("User not found in public.users:", userError)
      return null
    }

    if (!userData.is_active) {
      return null // User is deactivated
    }

    const authUser: AuthUser = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role as PlatformRole,
      tenantId: userData.tenant_id,
      phone: userData.phone,
      whatsapp: userData.whatsapp,
      avatarUrl: userData.avatar_url,
      isActive: userData.is_active,
    }

    return {
      user: authUser,
      session: { accessToken: session.access_token },
    }
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

/**
 * Builds request context from the authenticated session.
 * Replaces the header-based context for authenticated routes.
 */
export async function getRequestContext(): Promise<RequestContext | null> {
  const sessionData = await getSession()
  if (!sessionData) return null

  const { user } = sessionData
  return {
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role,
    // investorId can be set if accessing investor portal
  }
}

/**
 * Require authentication - throws if not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const sessionData = await getSession()
  if (!sessionData) {
    throw new Error("Authentication required")
  }
  return sessionData.user
}

/**
 * Check if user has one of the required roles.
 */
export async function requireRole(...roles: PlatformRole[]): Promise<AuthUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new Error(`Access denied. Required roles: ${roles.join(", ")}`)
  }
  return user
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
}
