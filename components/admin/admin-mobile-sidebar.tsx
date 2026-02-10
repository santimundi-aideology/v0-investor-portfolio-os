"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  Globe,
  LayoutDashboard,
  Sparkles,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { VantageIcon } from "@/components/brand/logo"

interface AdminMobileSidebarProps {
  open: boolean
  onClose: () => void
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

export function AdminMobileSidebar({ open, onClose }: AdminMobileSidebarProps) {
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <SheetContent side="left" className="bg-white p-0">
        <SheetHeader className="border-b border-gray-200 px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-gray-900">
            <VantageIcon size={32} />
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight">Vantage</span>
              <span className="text-[10px] font-medium text-purple-600 leading-tight">Platform Admin</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-72px)]">
          <ScrollAreaViewport className="p-4">
            <nav className="space-y-4">
              {adminNavItems.map((section) => (
                <div key={section.section} className="space-y-1">
                  <div className="px-3 py-1 text-xs font-semibold tracking-wider text-gray-500">
                    {section.section}
                  </div>
                  {section.items.map((item) => {
                    const isActive =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-purple-50 text-purple-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
