"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { filterNavByRole } from "@/lib/nav"
import { useApp } from "@/components/providers/app-provider"
import { VantageIcon } from "@/components/brand/logo"

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const { role } = useApp()
  const sections = filterNavByRole(role)

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
            <span>Vantage</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-72px)]">
          <ScrollAreaViewport className="p-4">
            <nav className="space-y-4">
              {sections.map((section) => (
                <div key={section.label} className="space-y-1">
                  <div className="px-3 py-1 text-xs font-semibold tracking-wider text-gray-500">
                    {section.label}
                  </div>
                  {section.items.map((item) => {
                    const isActive =
                      item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-green-50 text-green-600"
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

        <div className="border-t border-gray-200 p-4">
          <Button asChild variant="ghost" className="w-full justify-start text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            <Link href="/settings" onClick={onClose}>
              Settings
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
