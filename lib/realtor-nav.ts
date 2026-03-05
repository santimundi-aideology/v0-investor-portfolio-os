import type { LucideIcon } from "lucide-react"
import {
  Building2,
  CheckSquare,
  LayoutDashboard,
  Map,
  Radar,
  Settings,
  Sparkles,
  Users,
} from "lucide-react"

export type RealtorNavItem = {
  label: string
  href: string
  icon: LucideIcon
  alsoMatch?: string[]
}

export type RealtorTopNavItem = {
  label: string
  href: string
  alsoMatch?: string[]
}

export const realtorNavItems: RealtorNavItem[] = [
  { label: "Dashboard", href: "/realtor/dashboard", icon: LayoutDashboard },
  { label: "Investors", href: "/realtor/investors", icon: Users },
  { label: "Properties", href: "/realtor/properties", icon: Building2 },
  { label: "Opportunities", href: "/realtor/opportunities", icon: Sparkles, alsoMatch: ["/realtor/memos", "/realtor/deal-room", "/realtor/property-intake"] },
  { label: "Tasks", href: "/realtor/tasks", icon: CheckSquare },
  { label: "Market Signals", href: "/realtor/market-signals", icon: Radar },
  { label: "Market Map", href: "/realtor/market-map", icon: Map },
  { label: "Settings", href: "/realtor/settings", icon: Settings },
]

export const realtorTopNavItems: RealtorTopNavItem[] = [
  { label: "Dashboard", href: "/realtor/dashboard" },
  { label: "Investors", href: "/realtor/investors" },
  { label: "Properties", href: "/realtor/properties" },
  { label: "Opportunities", href: "/realtor/opportunities", alsoMatch: ["/realtor/memos", "/realtor/deal-room", "/realtor/property-intake"] },
  { label: "Tasks", href: "/realtor/tasks" },
  { label: "Market Map", href: "/realtor/market-map" },
]
