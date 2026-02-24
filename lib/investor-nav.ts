import type { LucideIcon } from "lucide-react"
import {
  Briefcase,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Newspaper,
  Sparkles,
  User,
} from "lucide-react"

export type InvestorNavItem = {
  label: string
  href: string
  icon: LucideIcon
  alsoMatch?: string[]
}

export const investorNavItems: InvestorNavItem[] = [
  { label: "Overview", href: "/investor/dashboard", icon: LayoutDashboard },
  { label: "Portfolio", href: "/investor/portfolio", icon: Briefcase, alsoMatch: ["/investor/portfolio"] },
  { label: "Payments", href: "/investor/payments", icon: CreditCard },
  { label: "Analytics", href: "/investor/analytics", icon: LineChart },
  { label: "Context & Activity", href: "/investor/context-activity", icon: Newspaper },
  { label: "Opportunities", href: "/investor/opportunities", icon: Sparkles },
  { label: "Profile", href: "/investor/profile", icon: User },
]
