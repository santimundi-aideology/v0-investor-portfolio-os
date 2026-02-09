"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

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
  setScopedInvestorId: (id: string) => void
  /** List of investors available for the current tenant (for super_admin investor selector) */
  availableInvestors: { id: string; name: string; company?: string; email?: string; status?: string }[]
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

  // Map from persona role (UserRole) to PlatformRole
  const personaToPlatformRole = React.useCallback((r: UserRole): PlatformRole => {
    const mapping: Record<UserRole, PlatformRole> = {
      owner: "super_admin",
      admin: "manager",
      realtor: "agent",
      investor: "investor",
    }
    return mapping[r] || "agent"
  }, [])

  // Super admins can use the persona switcher to preview different role views
  // while keeping their real identity (name, email, avatar).
  // Note: we check auth.user directly (not shouldUseRealAuth) to avoid the race
  // where shouldUseRealAuth is false during initial async auth resolution.
  const isSuperAdminPreview = auth.user?.role === "super_admin"

  // Build user object from auth or persona.
  // CRITICAL: When a real user is authenticated, their identity (name, email,
  // avatar) must ALWAYS come from auth — never from persona. The persona only
  // controls the effective role and scoped IDs. During auth loading
  // (auth.isLoading=true), we show a neutral placeholder instead of persona data.
  const user = React.useMemo(() => {
    if (auth.user) {
      // Authenticated: always use real identity, persona only overrides role
      const effectiveRole = isSuperAdminPreview
        ? persona.role
        : mapPlatformRole(auth.user.role)
      return {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        role: effectiveRole,
        avatar: auth.user.avatarUrl,
      }
    }
    // Auth still loading — return placeholder to avoid flashing persona identity
    if (auth.isLoading) {
      return {
        id: "",
        name: "",
        email: "",
        role: persona.role,
        avatar: undefined as string | undefined,
      }
    }
    // Not authenticated (demo mode) — use persona
    return persona.user
  }, [auth.user, auth.isLoading, persona, isSuperAdminPreview])

  const role = React.useMemo(() => {
    if (auth.user) {
      return isSuperAdminPreview ? persona.role : mapPlatformRole(auth.user.role)
    }
    return persona.role
  }, [auth.user, persona.role, isSuperAdminPreview])

  const platformRole = React.useMemo(() => {
    if (auth.user) {
      return isSuperAdminPreview ? personaToPlatformRole(persona.role) : auth.user.role
    }
    return personaToPlatformRole(persona.role)
  }, [auth.user, persona.role, isSuperAdminPreview, personaToPlatformRole])

  // Detect if we're on an investor route
  const pathname = usePathname()
  const isOnInvestorRoute = pathname?.startsWith("/investor") ?? false

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

  // For super_admins on investor routes: auto-resolve an investor from the tenant
  const [superAdminInvestorId, setSuperAdminInvestorId] = React.useState<string | undefined>(undefined)
  const [availableInvestors, setAvailableInvestors] = React.useState<{ id: string; name: string; company?: string; email?: string; status?: string }[]>([])
  const [investorsFetched, setInvestorsFetched] = React.useState(false)

  React.useEffect(() => {
    if (!shouldUseRealAuth || auth.user?.role !== "super_admin" || !isOnInvestorRoute) {
      return
    }
    // Already fetched investors — skip
    if (investorsFetched) return

    let cancelled = false
    async function fetchInvestors() {
      try {
        const res = await fetch("/api/investors")
        if (res.ok) {
          const data = await res.json()
          const investors = Array.isArray(data) ? data : (data.investors ?? [])
          if (!cancelled && investors.length > 0) {
            setAvailableInvestors(investors.map((inv: Record<string, unknown>) => ({
              id: inv.id as string,
              name: inv.name as string,
              company: inv.company as string | undefined,
              email: inv.email as string | undefined,
              status: inv.status as string | undefined,
            })))
            // Auto-select first investor if none selected yet
            if (!superAdminInvestorId) {
              setSuperAdminInvestorId(investors[0].id as string)
            }
          }
          if (!cancelled) setInvestorsFetched(true)
        }
      } catch (err) {
        console.error("Failed to fetch investors for super_admin preview:", err)
        if (!cancelled) setInvestorsFetched(true)
      }
    }
    fetchInvestors()
    return () => { cancelled = true }
  }, [shouldUseRealAuth, auth.user?.role, isOnInvestorRoute, investorsFetched, superAdminInvestorId])

  // Exposed setter so the investor selector dropdown can change the previewed investor
  const setScopedInvestorIdManual = React.useCallback((id: string) => {
    setSuperAdminInvestorId(id)
  }, [])

  const scopedInvestorId = React.useMemo(() => {
    // Real investor users: use their resolved ID
    if (shouldUseRealAuth && auth.user?.role === "investor") {
      return resolvedInvestorId
    }
    // Super admins on investor routes: use auto-resolved or manually selected investor
    if (shouldUseRealAuth && auth.user?.role === "super_admin" && isOnInvestorRoute && superAdminInvestorId) {
      return superAdminInvestorId
    }
    // Super admins previewing investor persona get the persona's scoped investor ID
    if (isSuperAdminPreview && persona.scopedInvestorId) {
      return persona.scopedInvestorId
    }
    return persona.scopedInvestorId
  }, [shouldUseRealAuth, auth.user, persona.scopedInvestorId, resolvedInvestorId, isSuperAdminPreview, isOnInvestorRoute, superAdminInvestorId])

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
      setScopedInvestorId: setScopedInvestorIdManual,
      availableInvestors,
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
    [user, role, platformRole, auth.user, auth.isAuthenticated, auth.isLoading, tenantId, personaId, useRealAuth, scopedInvestorId, setScopedInvestorIdManual, availableInvestors, availableOrgs, currentOrg, setOrgId, tenantsLoading, fetchTenants, needsTenantSelection, commandOpen, breadcrumbsOverride],
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
