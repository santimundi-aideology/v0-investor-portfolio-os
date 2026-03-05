"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { VantageIcon } from "@/components/brand/logo"
import { realtorNavItems } from "@/lib/realtor-nav"

interface RealtorMobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function RealtorMobileSidebar({ open, onClose }: RealtorMobileSidebarProps) {
  const pathname = usePathname()

  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <SheetContent side="left" className="bg-white p-0 w-72">
        <SheetHeader className="border-b border-gray-200 px-4 py-4">
          <SheetTitle className="flex items-center gap-3 text-gray-900">
            <VantageIcon size={36} />
            <div className="flex flex-col text-left">
              <span className="font-semibold leading-tight">Vantage</span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Realtor Portal
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <ScrollAreaViewport className="p-4">
            <nav className="space-y-1">
              <div className="mb-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Navigation
              </div>
              {realtorNavItems.map((item) => {
                const isActive =
                  item.href === "/realtor/dashboard"
                    ? pathname === "/realtor/dashboard" || pathname === "/realtor"
                    : pathname.startsWith(item.href) ||
                      (item.alsoMatch?.some((p) => pathname.startsWith(p)) ?? false)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-teal-50 text-teal-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        <div className="border-t border-gray-200 p-4">
          <p className="text-xs text-gray-400 text-center">Vantage Realtor Portal</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
