"use client"

import * as React from "react"

import type { UserRole, PlatformRole, platformRoleToLegacy } from "@/lib/types"
import type { Org } from "@/lib/mock-session"
import { defaultOrgId, orgs as defaultOrgs } from "@/lib/mock-session"
import type { PersonaId } from "@/lib/personas"
import { defaultPersonaId, getPersonaById, personas } from "@/lib/personas"
import { useAuth, type AuthUser } from "./auth-provider"

export type BreadcrumbItem = { label: string; href?: string }

type AppContextValue = {
  // Current user - from real auth or persona fallback
  user: ReturnType<typeof getPersonaById>["user"]
  role: UserRole
  platformRole: PlatformRole
  
  // Auth state
  authUser: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Persona switching (for development/demo)
  personaId: PersonaId
  setPersonaId: (id: PersonaId) => void
  useRealAuth: boolean
  setUseRealAuth: (value: boolean) => void
  
  scopedInvestorId?: string
  orgs: Org[]
  currentOrg: Org
  setCurrentOrgId: (orgId: string) => void

  commandOpen: boolean
  setCommandOpen: (open: boolean) => void

  breadcrumbsOverride: BreadcrumbItem[] | null
  setBreadcrumbsOverride: (items: BreadcrumbItem[] | null) => void
}

const AppContext = React.createContext<AppContextValue | null>(null)

// Map platform role to legacy role for UI compatibility
function mapPlatformRole(role: PlatformRole): UserRole {
  const mapping: Record<PlatformRole, UserRole> = {
    super_admin: "owner",
    manager: "admin",
    agent: "realtor",
    investor: "investor",
  }
  return mapping[role] || "realtor"
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const [orgId, setOrgId] = React.useState(defaultOrgId)
  const [personaId, setPersonaId] = React.useState<PersonaId>(defaultPersonaId)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [breadcrumbsOverride, setBreadcrumbsOverride] = React.useState<BreadcrumbItem[] | null>(null)
  // Use real auth when available, fallback to personas for demo
  const [useRealAuth, setUseRealAuth] = React.useState(true)

  const currentOrg = React.useMemo(() => defaultOrgs.find((o) => o.id === orgId) ?? defaultOrgs[0], [orgId])
  const persona = React.useMemo(() => getPersonaById(personaId), [personaId])

  // Determine if we should use real auth or persona
  const shouldUseRealAuth = useRealAuth && auth.isAuthenticated && auth.user

  // Build user object from auth or persona
  const user = React.useMemo(() => {
    if (shouldUseRealAuth && auth.user) {
      return {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        role: mapPlatformRole(auth.user.role),
        avatar: auth.user.avatarUrl,
      }
    }
    return persona.user
  }, [shouldUseRealAuth, auth.user, persona.user])

  const role = React.useMemo(() => {
    if (shouldUseRealAuth && auth.user) {
      return mapPlatformRole(auth.user.role)
    }
    return persona.role
  }, [shouldUseRealAuth, auth.user, persona.role])

  const platformRole = React.useMemo(() => {
    if (shouldUseRealAuth && auth.user) {
      return auth.user.role
    }
    // Map persona role to platform role
    const mapping: Record<UserRole, PlatformRole> = {
      owner: "super_admin",
      admin: "manager",
      realtor: "agent",
      investor: "investor",
    }
    return mapping[persona.role] || "agent"
  }, [shouldUseRealAuth, auth.user, persona.role])

  const scopedInvestorId = React.useMemo(() => {
    if (shouldUseRealAuth && auth.user?.role === "investor") {
      // For real investors, would fetch their investor ID from database
      return undefined
    }
    return persona.scopedInvestorId
  }, [shouldUseRealAuth, auth.user, persona.scopedInvestorId])

  const value = React.useMemo<AppContextValue>(
    () => ({
      user,
      role,
      platformRole,
      authUser: auth.user,
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      personaId,
      setPersonaId,
      useRealAuth,
      setUseRealAuth,
      scopedInvestorId,
      orgs: defaultOrgs,
      currentOrg,
      setCurrentOrgId: setOrgId,
      commandOpen,
      setCommandOpen,
      breadcrumbsOverride,
      setBreadcrumbsOverride,
    }),
    [user, role, platformRole, auth.user, auth.isAuthenticated, auth.isLoading, personaId, useRealAuth, scopedInvestorId, currentOrg, commandOpen, breadcrumbsOverride],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = React.useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

export function useBreadcrumbs(items: BreadcrumbItem[] | null) {
  const { setBreadcrumbsOverride } = useApp()
  React.useEffect(() => {
    setBreadcrumbsOverride(items)
    return () => setBreadcrumbsOverride(null)
  }, [items, setBreadcrumbsOverride])
}

export function usePersonas() {
  return personas
}


