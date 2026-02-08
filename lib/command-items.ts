import type { UserRole } from "@/lib/types"
import { filterNavByRole, filterNavByFeatureFlags } from "@/lib/nav"

export type CommandItem =
  | {
      kind: "nav"
      label: string
      href: string
      keywords?: string[]
    }
  | {
      kind: "investor"
      label: string
      href: string
      meta?: string
      keywords?: string[]
    }
  | {
      kind: "property"
      label: string
      href: string
      meta?: string
      keywords?: string[]
    }
  | {
      kind: "action"
      label: string
      href: string
      meta?: string
      shortcut?: string
      keywords?: string[]
    }

export type CommandNavItem = Extract<CommandItem, { kind: "nav" }>
export type CommandInvestorItem = Extract<CommandItem, { kind: "investor" }>
export type CommandPropertyItem = Extract<CommandItem, { kind: "property" }>
export type CommandActionItem = Extract<CommandItem, { kind: "action" }>

export function getCommandItems(role: UserRole) {
  const navItems: CommandNavItem[] = filterNavByFeatureFlags(filterNavByRole(role)).flatMap((section) =>
    section.items.map((item) => ({
      kind: "nav" as const,
      label: item.label,
      href: item.href,
      keywords: [section.label],
    })),
  )

  // Investors and properties are fetched via /api/search in the command palette.
  // These are empty by default since this is a sync function.
  const recentInvestors: CommandInvestorItem[] = []
  const recentProperties: CommandPropertyItem[] = []

  const actions: CommandActionItem[] = [
    { kind: "action", label: "Create investor", href: "/investors", meta: "Opens investors page", shortcut: "I" },
    { kind: "action", label: "Create property", href: "/properties", meta: "Opens properties page", shortcut: "P" },
    { kind: "action", label: "Generate IC memo", href: "/memos", meta: "Opens memos", shortcut: "M" },
    { kind: "action", label: "Open portfolio", href: "/real-estate", meta: "Portfolio analytics", shortcut: "R" },
  ]

  return { actions, navItems, recentInvestors, recentProperties }
}
