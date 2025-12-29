"use client"

import * as React from "react"

import type { UserRole } from "@/lib/types"
import type { Org } from "@/lib/mock-session"
import { defaultOrgId, orgs as defaultOrgs } from "@/lib/mock-session"
import type { PersonaId } from "@/lib/personas"
import { defaultPersonaId, getPersonaById, personas } from "@/lib/personas"

export type BreadcrumbItem = { label: string; href?: string }

type AppContextValue = {
  user: ReturnType<typeof getPersonaById>["user"]
  role: UserRole
  personaId: PersonaId
  setPersonaId: (id: PersonaId) => void
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgId] = React.useState(defaultOrgId)
  const [personaId, setPersonaId] = React.useState<PersonaId>(defaultPersonaId)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [breadcrumbsOverride, setBreadcrumbsOverride] = React.useState<BreadcrumbItem[] | null>(null)

  const currentOrg = React.useMemo(() => defaultOrgs.find((o) => o.id === orgId) ?? defaultOrgs[0], [orgId])
  const persona = React.useMemo(() => getPersonaById(personaId), [personaId])

  const value = React.useMemo<AppContextValue>(
    () => ({
      user: persona.user,
      role: persona.role,
      personaId,
      setPersonaId,
      scopedInvestorId: persona.scopedInvestorId,
      orgs: defaultOrgs,
      currentOrg,
      setCurrentOrgId: setOrgId,
      commandOpen,
      setCommandOpen,
      breadcrumbsOverride,
      setBreadcrumbsOverride,
    }),
    [currentOrg, commandOpen, breadcrumbsOverride, persona, personaId],
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


