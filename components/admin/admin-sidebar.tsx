"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutDashboard,
  Sparkles,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { VantageIcon } from "@/components/brand/logo"

interface AdminSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const adminNavItems = [
  {
    section: "Platform",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Organizations", href: "/admin/organizations", icon: Building2 },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "AI Usage", href: "/admin/ai-usage", icon: Sparkles },
      { label: "Domains", href: "/admin/domains", icon: Globe },
    ],
  },
]

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname()

  const renderNavItem = (item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(item.href)
    const Icon = item.icon

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-purple-50 text-purple-700"
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
        {/* Logo + Platform Admin label */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <VantageIcon size={32} />
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 text-sm leading-tight">Vantage</span>
                <span className="text-[10px] font-medium text-purple-600 leading-tight">Platform Admin</span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="mx-auto">
              <VantageIcon size={32} />
            </Link>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <ScrollAreaViewport className="p-2">
            <nav className="space-y-4">
              {adminNavItems.map((section) => (
                <div key={section.section} className="space-y-1">
                  {!collapsed ? (
                    <div className="px-3 py-1 text-xs font-semibold tracking-wider text-gray-500">
                      {section.section}
                    </div>
                  ) : null}
                  {section.items.map((item) => renderNavItem(item))}
                </div>
              ))}
            </nav>
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="border-t border-gray-200 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn("w-full text-gray-600 hover:bg-gray-50", collapsed && "justify-center")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
