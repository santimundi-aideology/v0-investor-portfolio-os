import type { ComponentType } from "react"
import type { UserRole } from "@/lib/types"
import { type FeatureFlag, isFeatureEnabled } from "@/lib/feature-flags"
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
  featureFlag?: FeatureFlag
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
      { label: "Executive Summary", href: "/executive-summary", icon: Presentation, rolesAllowed: INTERNAL_ROLES, featureFlag: "executiveSummary" },
      { label: "Real Estate", href: "/real-estate", icon: LineChart, rolesAllowed: ALL_ROLES, featureFlag: "realEstate" },
      { label: "Realtor Ops", href: "/realtor", icon: ClipboardList, rolesAllowed: INTERNAL_ROLES, featureFlag: "realtorOps" },
      { label: "Investors", href: "/investors", icon: Users, rolesAllowed: INTERNAL_ROLES },
      { label: "Properties", href: "/properties", icon: Building2, rolesAllowed: INTERNAL_ROLES },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, rolesAllowed: INTERNAL_ROLES },
      { label: "Deal Pipeline", href: "/deal-room", icon: FolderKanban, rolesAllowed: [...INTERNAL_ROLES, ...INVESTOR_ROLES], featureFlag: "dealRoom" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Property Intake", href: "/property-intake", icon: Search, rolesAllowed: INTERNAL_ROLES },
      { label: "IC Memos", href: "/memos", icon: FileText, rolesAllowed: ALL_ROLES },
      { label: "Market Signals", href: "/market-signals", icon: Radar, rolesAllowed: [...INTERNAL_ROLES, ...INVESTOR_ROLES], featureFlag: "marketSignals" },
      { label: "Market Map", href: "/market-map", icon: Map, rolesAllowed: ALL_ROLES, featureFlag: "marketMap" },
      { label: "Price Compare", href: "/market-compare", icon: LineChart, rolesAllowed: ALL_ROLES, featureFlag: "marketCompare" },
      { label: "Market Report", href: "/market-report", icon: FileText, rolesAllowed: ALL_ROLES, featureFlag: "marketReport" },
      { label: "ROI Calculator", href: "/roi-calculator", icon: Calculator, rolesAllowed: ALL_ROLES, featureFlag: "roiCalculator" },
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
      { label: "Companies", href: "/settings?tab=companies", icon: Building2, rolesAllowed: ["owner"], featureFlag: "adminPanel" },
      { label: "Users", href: "/team", icon: UsersRound, rolesAllowed: ADMIN_ROLES, featureFlag: "adminPanel" },
      { label: "Audit Log", href: "/audit-log", icon: ScrollText, rolesAllowed: ADMIN_ROLES, featureFlag: "adminPanel" },
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

export function filterNavByFeatureFlags(sections: NavSection[]): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.featureFlag || isFeatureEnabled(item.featureFlag),
      ),
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
