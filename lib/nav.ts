import type { ComponentType } from "react"
import type { UserRole } from "@/lib/types"
import {
  Building2,
  Calculator,
  CheckSquare,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  Map,
  Presentation,
  Radar,
  ScrollText,
  Search,
  Settings,
  Shield,
  Users,
  UsersRound,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  rolesAllowed: UserRole[]
}

export type NavSection = {
  label: string
  items: NavItem[]
}

const ALL_ROLES: UserRole[] = ["owner", "admin", "realtor", "investor"]
const ADMIN_ROLES: UserRole[] = ["owner", "admin"]
const INTERNAL_ROLES: UserRole[] = ["owner", "admin", "realtor"]
const INVESTOR_ROLES: UserRole[] = ["investor"]

export const navSections: NavSection[] = [
  {
    label: "Work",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, rolesAllowed: ALL_ROLES },
      { label: "Executive Summary", href: "/executive-summary", icon: Presentation, rolesAllowed: INTERNAL_ROLES },
      { label: "Real Estate", href: "/real-estate", icon: LineChart, rolesAllowed: ALL_ROLES },
      { label: "Realtor Ops", href: "/realtor", icon: ClipboardList, rolesAllowed: INTERNAL_ROLES },
      { label: "Investors", href: "/investors", icon: Users, rolesAllowed: INTERNAL_ROLES },
      { label: "Properties", href: "/properties", icon: Building2, rolesAllowed: INTERNAL_ROLES },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, rolesAllowed: INTERNAL_ROLES },
      { label: "Deal Pipeline", href: "/deal-room", icon: FolderKanban, rolesAllowed: [...INTERNAL_ROLES, ...INVESTOR_ROLES] },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Property Intake", href: "/property-intake", icon: Search, rolesAllowed: INTERNAL_ROLES },
      { label: "IC Memos", href: "/memos", icon: FileText, rolesAllowed: ALL_ROLES },
      { label: "Market Signals", href: "/market-signals", icon: Radar, rolesAllowed: [...INTERNAL_ROLES, ...INVESTOR_ROLES] },
      { label: "Market Map", href: "/market-map", icon: Map, rolesAllowed: ALL_ROLES },
      { label: "Price Compare", href: "/market-compare", icon: LineChart, rolesAllowed: ALL_ROLES },
      { label: "Market Report", href: "/market-report", icon: FileText, rolesAllowed: ALL_ROLES },
      { label: "ROI Calculator", href: "/roi-calculator", icon: Calculator, rolesAllowed: ALL_ROLES },
    ],
  },
  {
    label: "Preferences",
    items: [{ label: "Settings", href: "/settings", icon: Settings, rolesAllowed: INTERNAL_ROLES }],
  },
  {
    label: "Admin",
    items: [
      { label: "Admin Console", href: "/admin", icon: Shield, rolesAllowed: ["owner"] },
      { label: "Companies", href: "/settings?tab=companies", icon: Building2, rolesAllowed: ["owner"] },
      { label: "Users", href: "/team", icon: UsersRound, rolesAllowed: ADMIN_ROLES },
      { label: "Audit Log", href: "/audit-log", icon: ScrollText, rolesAllowed: ADMIN_ROLES },
    ],
  },
]

export function filterNavByRole(role: UserRole) {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.rolesAllowed.includes(role)),
    }))
    .filter((section) => section.items.length > 0)
}

export function findNavItemByHref(href: string) {
  for (const section of navSections) {
    for (const item of section.items) {
      if (item.href === href) return item
    }
  }
  return null
}
