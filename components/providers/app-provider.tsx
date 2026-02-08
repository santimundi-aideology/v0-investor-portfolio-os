"use client"

import * as React from "react"

import type { UserRole, PlatformRole } from "@/lib/types"
import type { PersonaId } from "@/lib/personas"
import { isDemoMode } from "@/lib/demo-mode"
import { defaultPersonaId, getPersonaById, personas } from "@/lib/personas"
import { useAuth, type AuthUser } from "./auth-provider"

export type AppOrg = {
  id: string
  name: string
  avatarText: string
  plan: "starter" | "pro" | "enterprise"
}

/** Default orgs used only in demo mode (no real auth / no DB) */
const demoOrgs: AppOrg[] = [
  { id: "org-1", name: "Palm & Partners Realty", avatarText: "PP", plan: "pro" },
  { id: "org-2", name: "Marina Capital Advisors", avatarText: "MC", plan: "enterprise" },
]

const demoOrgId = demoOrgs[0]?.id ?? "org-1"

export type BreadcrumbItem = { label: string; href?: string }

/** Derive a 2-letter avatar text from a tenant name */
function deriveAvatarText(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/** localStorage key for persisted tenant selection */
const TENANT_STORAGE_KEY = "vantage_selected_tenant_id"

type AppContextValue = {
  // Current user - from real auth or persona fallback
  user: ReturnType<typeof getPersonaById>["user"]
  role: UserRole
  platformRole: PlatformRole
  
  // Auth state
  authUser: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Tenant context — the active tenant ID (real UUID from DB)
  tenantId: string | undefined
  
  // Persona switching (for development/demo)
  personaId: PersonaId
  setPersonaId: (id: PersonaId) => void
  useRealAuth: boolean
  setUseRealAuth: (value: boolean) => void
  
  scopedInvestorId?: string
  orgs: AppOrg[]
  currentOrg: AppOrg
  setCurrentOrgId: (orgId: string) => void
  /** True while tenants are being fetched from the API */
  tenantsLoading: boolean
  /** Force-refresh the tenant list from the API */
  refreshTenants: () => void
  /** True when a super_admin has no tenantId and needs to pick one */
  needsTenantSelection: boolean
  setNeedsTenantSelection: (value: boolean) => void

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

/** Map a DB tenant row to the AppOrg shape consumed by the UI */
function tenantToOrg(tenant: { id: string; name: string; plan?: string }): AppOrg {
  return {
    id: tenant.id,
    name: tenant.name,
    avatarText: deriveAvatarText(tenant.name),
    plan: (tenant.plan as AppOrg["plan"]) ?? "starter",
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  // Persisted tenant ID — initialise from localStorage (client-only)
  const [orgId, setOrgIdRaw] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TENANT_STORAGE_KEY) ?? ""
    }
    return ""
  })

  // Real tenants fetched from the API
  const [realTenants, setRealTenants] = React.useState<AppOrg[]>([])
  const [tenantsFetched, setTenantsFetched] = React.useState(false)

  const [personaId, setPersonaId] = React.useState<PersonaId>(defaultPersonaId)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [breadcrumbsOverride, setBreadcrumbsOverride] = React.useState<BreadcrumbItem[] | null>(null)
  // Use real auth when available, fallback to personas for demo
  const [useRealAuth, setUseRealAuth] = React.useState(true)
  const [needsTenantSelection, setNeedsTenantSelection] = React.useState(false)

  // Wrap setOrgId to also persist to localStorage
  const setOrgId = React.useCallback((id: string) => {
    setOrgIdRaw(id)
    setNeedsTenantSelection(false)
    if (typeof window !== "undefined") {
      localStorage.setItem(TENANT_STORAGE_KEY, id)
    }
  }, [])

  // ----- Fetch real tenants when authenticated -----
  const fetchTenants = React.useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user) return
    try {
      const res = await fetch("/api/tenants")
      if (res.ok) {
        const data = await res.json()
        const tenants: AppOrg[] = (data.tenants ?? []).map(tenantToOrg)
        setRealTenants(tenants)
        setTenantsFetched(true)

        // If no tenant is selected yet, default to the user's primary tenant
        if (!orgId && auth.user.tenantId) {
          setOrgId(auth.user.tenantId)
        } else if (!orgId && tenants.length > 0) {
          setOrgId(tenants[0].id)
        }

        // Super admins with no tenantId need to explicitly pick a tenant
        if (auth.user?.role === 'super_admin' && !auth.user?.tenantId && tenants.length > 0 && !orgId) {
          setNeedsTenantSelection(true)
        }
      }
    } catch (err) {
      console.error("Failed to fetch tenants:", err)
    }
  }, [auth.isAuthenticated, auth.user, orgId, setOrgId])

  React.useEffect(() => {
    if (auth.isAuthenticated && auth.user && !isDemoMode()) {
      fetchTenants()
    }
  }, [auth.isAuthenticated, auth.user, fetchTenants])

  // Determine which org list to use
  const shouldUseRealAuth = useRealAuth && auth.isAuthenticated && auth.user

  /** True while we are still loading tenants for an authenticated user */
  const tenantsLoading = shouldUseRealAuth && !isDemoMode() && !tenantsFetched

  const availableOrgs = React.useMemo(() => {
    if (isDemoMode() || !shouldUseRealAuth) {
      return demoOrgs
    }
    // While still loading, return an empty array (the topbar shows a skeleton)
    if (!tenantsFetched) return []
    // Authenticated but no tenants at all — return empty so UI can prompt to create one
    return realTenants
  }, [shouldUseRealAuth, tenantsFetched, realTenants])

  // Resolve current org
  const effectiveOrgId = orgId || (shouldUseRealAuth ? auth.user?.tenantId : undefined) || demoOrgId
  const currentOrg = React.useMemo(
    () => availableOrgs.find((o) => o.id === effectiveOrgId) ?? availableOrgs[0] ?? {
      id: effectiveOrgId,
      name: "Loading…",
      avatarText: "…",
      plan: "starter" as const,
    },
    [effectiveOrgId, availableOrgs],
  )

  // The active tenant ID (real UUID or undefined)
  const tenantId = React.useMemo(() => {
    if (shouldUseRealAuth && tenantsFetched) {
      return currentOrg?.id
    }
    if (shouldUseRealAuth && auth.user?.tenantId) {
      return auth.user.tenantId
    }
    return undefined
  }, [shouldUseRealAuth, tenantsFetched, currentOrg, auth.user])

  const persona = React.useMemo(() => getPersonaById(personaId), [personaId])

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

  // Resolve investor ID for real authenticated investor-role users
  const [resolvedInvestorId, setResolvedInvestorId] = React.useState<string | undefined>(undefined)
  const [investorIdFetched, setInvestorIdFetched] = React.useState(false)

  React.useEffect(() => {
    if (!shouldUseRealAuth || auth.user?.role !== "investor") {
      setResolvedInvestorId(undefined)
      setInvestorIdFetched(false)
      return
    }

    let cancelled = false
    async function fetchInvestorId() {
      try {
        const res = await fetch("/api/investor/me")
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.investorId) {
            setResolvedInvestorId(data.investorId)
          }
        }
      } catch (err) {
        console.error("Failed to resolve investor ID:", err)
      } finally {
        if (!cancelled) setInvestorIdFetched(true)
      }
    }
    fetchInvestorId()
    return () => { cancelled = true }
  }, [shouldUseRealAuth, auth.user?.role])

  const scopedInvestorId = React.useMemo(() => {
    if (shouldUseRealAuth && auth.user?.role === "investor") {
      return resolvedInvestorId
    }
    return persona.scopedInvestorId
  }, [shouldUseRealAuth, auth.user, persona.scopedInvestorId, resolvedInvestorId])

  const value = React.useMemo<AppContextValue>(
    () => ({
      user,
      role,
      platformRole,
      authUser: auth.user,
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      tenantId,
      personaId,
      setPersonaId,
      useRealAuth,
      setUseRealAuth,
      scopedInvestorId,
      orgs: availableOrgs,
      currentOrg,
      setCurrentOrgId: setOrgId,
      tenantsLoading,
      refreshTenants: fetchTenants,
      needsTenantSelection,
      setNeedsTenantSelection,
      commandOpen,
      setCommandOpen,
      breadcrumbsOverride,
      setBreadcrumbsOverride,
    }),
    [user, role, platformRole, auth.user, auth.isAuthenticated, auth.isLoading, tenantId, personaId, useRealAuth, scopedInvestorId, availableOrgs, currentOrg, setOrgId, tenantsLoading, fetchTenants, needsTenantSelection, commandOpen, breadcrumbsOverride],
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
