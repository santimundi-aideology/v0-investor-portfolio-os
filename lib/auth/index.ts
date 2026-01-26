/**
 * Auth module exports
 * 
 * This module provides authentication utilities for Vantage.
 * 
 * Usage:
 * 
 * Browser/Client Components:
 *   import { createSupabaseBrowserClient } from "@/lib/auth/client"
 *   const supabase = createSupabaseBrowserClient()
 * 
 * Server Components/API Routes:
 *   import { getSession, requireAuth, requireRole } from "@/lib/auth/server"
 *   const session = await getSession()
 *   const user = await requireAuth()
 *   const admin = await requireRole("super_admin", "manager")
 * 
 * Server Actions:
 *   import { signIn, signUp, signOutAction, resetPassword, updatePassword } from "@/lib/auth/actions"
 * 
 * Client Components (Auth State):
 *   import { useAuth, useRequireAuth, useRequireRole } from "@/components/providers/auth-provider"
 *   const { user, isAuthenticated, signOut } = useAuth()
 */

// Re-export types
export type { AuthUser } from "./server"

// Re-export server utilities (for use in Server Components/API routes)
// Note: These are server-only and will throw if imported in client components
export { getSession, requireAuth, requireRole, getRequestContext, signOut } from "./server"

// Re-export server actions
export { signIn, signUp, signOutAction, resetPassword, updatePassword, resendVerification } from "./actions"
