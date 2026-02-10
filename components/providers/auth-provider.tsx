"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/auth/client"
import type { PlatformRole } from "@/lib/security/rbac"

export type AuthUser = {
  id: string
  email: string
  name: string
  role: PlatformRole
  tenantId: string
  phone?: string
  whatsapp?: string
  avatarUrl?: string
}

type AuthState = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

// Public routes that don't require auth
const publicRoutes = ["/login", "/signup", "/forgot-password", "/auth"]

export function AuthProvider({ 
  children, 
  initialUser 
}: { 
  children: React.ReactNode
  initialUser?: AuthUser | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = React.useState<AuthState>({
    user: initialUser ?? null,
    isLoading: !initialUser,
    isAuthenticated: !!initialUser,
  })

  const supabase = React.useMemo(() => {
    try {
      return createSupabaseBrowserClient()
    } catch {
      return null
    }
  }, [])

  // Fetch user profile from database
  const fetchUserProfile = React.useCallback(async (authUserId: string): Promise<AuthUser | null> => {
    if (!supabase) return null

    try {
      // Use RPC to get user by auth_user_id
      const { data, error } = await supabase
        .rpc('get_user_by_auth_id', { p_auth_user_id: authUserId })
        .single()

      if (error) {
        // Only log actual errors, not empty results
        if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.warn("Error fetching user profile:", error.message || error)
        }
        return null
      }

      if (!data) {
        // No user profile found - this is expected if the user hasn't been set up
        return null
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role as PlatformRole,
        tenantId: data.tenant_id,
        phone: data.phone,
        whatsapp: data.whatsapp,
        avatarUrl: data.avatar_url,
      }
    } catch (err) {
      console.error("Error fetching user profile:", err)
      return null
    }
  }, [supabase])

  // Initialize and listen for auth changes
  React.useEffect(() => {
    if (!supabase) return

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        setState({
          user: profile,
          isLoading: false,
          isAuthenticated: !!profile,
        })
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setState({
            user: profile,
            isLoading: false,
            isAuthenticated: !!profile,
          })
        } else if (event === "SIGNED_OUT") {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          })
          // Note: redirect is handled by the signOut() function itself.
          // Only redirect here if signOut was triggered externally (e.g. another tab).
          // Use a short delay to avoid race with the signOut() redirect.
          setTimeout(() => {
            if (!publicRoutes.some(route => window.location.pathname.startsWith(route))) {
              window.location.href = "/login"
            }
          }, 100)
        } else if (event === "TOKEN_REFRESHED") {
          // Refresh user data on token refresh
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id)
            if (profile) {
              setState(prev => ({
                ...prev,
                user: profile,
              }))
            }
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserProfile, pathname, router])

  const signOut = React.useCallback(async () => {
    // Navigate to server-side signout route which properly clears auth cookies
    window.location.href = "/auth/signout"
  }, [])

  const refreshUser = React.useCallback(async () => {
    if (!supabase) return

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id)
      setState(prev => ({
        ...prev,
        user: profile,
        isAuthenticated: !!profile,
      }))
    }
  }, [supabase, fetchUserProfile])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      signOut,
      refreshUser,
    }),
    [state, signOut, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}

export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push("/login")
    }
  }, [auth.isLoading, auth.isAuthenticated, router])

  return auth
}

export function useRequireRole(...roles: PlatformRole[]) {
  const auth = useRequireAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!auth.isLoading && auth.user && !roles.includes(auth.user.role)) {
      router.push("/dashboard")
    }
  }, [auth.isLoading, auth.user, roles, router])

  return auth
}
