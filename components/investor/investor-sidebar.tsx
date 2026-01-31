"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  Radar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { VantageIcon } from "@/components/brand/logo"

interface InvestorSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// Investor-specific navigation items
const investorNavItems = [
  { label: "Dashboard", href: "/investor", icon: LayoutDashboard },
  { label: "Portfolio", href: "/investor/portfolio", icon: LineChart },
  { label: "Analytics", href: "/investor/analytics", icon: BarChart3 },
  { label: "Memos", href: "/investor/memos", icon: FileText },
  { label: "Deal Rooms", href: "/investor/deal-rooms", icon: FolderKanban },
  { label: "Market Signals", href: "/investor/market-signals", icon: Radar },
]

export function InvestorSidebar({ collapsed, onToggle }: InvestorSidebarProps) {
  const pathname = usePathname()

  const renderNavItem = (item: (typeof investorNavItems)[0]) => {
    // For dashboard, exact match; for others, startsWith
    const isActive =
      item.href === "/investor"
        ? pathname === "/investor"
        : pathname.startsWith(item.href)
    const Icon = item.icon

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-green-50 text-green-600"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          collapsed && "justify-center px-2",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    )

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      )
    }

    return <div key={item.href}>{linkContent}</div>
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo / Branding */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!collapsed && (
            <Link href="/investor" className="flex items-center gap-3">
              <VantageIcon size={36} />
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 leading-tight">
                  Vantage
                </span>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Investor Portal
                </span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/investor" className="mx-auto">
              <VantageIcon size={36} />
            </Link>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <ScrollAreaViewport className="p-3">
            <nav className="space-y-1">
              {!collapsed && (
                <div className="mb-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Navigation
                </div>
              )}
              {investorNavItems.map((item) => renderNavItem(item))}
            </nav>
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="border-t border-gray-200 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors",
              collapsed && "justify-center",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
