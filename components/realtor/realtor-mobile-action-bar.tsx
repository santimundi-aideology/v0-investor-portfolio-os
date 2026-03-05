"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Home,
  FolderKanban,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface RealtorMobileActionBarProps {
  notificationCount?: number
  onAIClick?: () => void
  isAIPanelOpen?: boolean
  className?: string
}

const navItems = [
  { label: "Dashboard", href: "/realtor/dashboard", icon: Home },
  { label: "Opportunities", href: "/realtor/opportunities", icon: FolderKanban },
]

export function RealtorMobileActionBar({
  notificationCount = 0,
  onAIClick,
  isAIPanelOpen = false,
  className,
}: RealtorMobileActionBarProps) {
  const pathname = usePathname()

  if (isAIPanelOpen) {
    return null
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "lg:hidden",
        "bg-background/95 backdrop-blur-lg border-t border-border",
        "pb-[env(safe-area-inset-bottom)]",
        "animate-in slide-in-from-bottom duration-300",
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        <Link
          href={navItems[0].href}
          className={cn(
            "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
            "touch-target",
            pathname === navItems[0].href
              ? "text-teal-600"
              : "text-gray-500 hover:text-foreground"
          )}
        >
          <Home className="size-5" />
          <span className="text-[10px] font-medium mt-1">{navItems[0].label}</span>
        </Link>

        <Link
          href={navItems[1].href}
          className={cn(
            "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
            "touch-target",
            pathname.startsWith(navItems[1].href)
              ? "text-teal-600"
              : "text-gray-500 hover:text-foreground"
          )}
        >
          <FolderKanban className="size-5" />
          <span className="text-[10px] font-medium mt-1">{navItems[1].label}</span>
        </Link>

        <Button
          onClick={onAIClick}
          className={cn(
            "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] px-4 py-2 rounded-xl",
            "bg-teal-500 hover:bg-teal-600",
            "text-white shadow-lg",
            "transition-colors",
            "touch-target"
          )}
          aria-label="Open AI Assistant"
        >
          <Sparkles className="size-5" />
          <span className="text-[10px] font-medium mt-1">AI</span>
        </Button>

        <Link
          href="/realtor/dashboard"
          className={cn(
            "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors relative",
            "touch-target",
            "text-gray-500 hover:text-foreground"
          )}
        >
          <div className="relative">
            <Bell className="size-5" />
            {notificationCount > 0 && (
              <Badge
                className={cn(
                  "absolute -top-1 -right-1.5 size-4 p-0 flex items-center justify-center",
                  "text-[9px] font-bold bg-destructive text-destructive-foreground",
                  "rounded-full animate-in zoom-in-50 duration-200"
                )}
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </div>
          <span className="text-[10px] font-medium mt-1">Alerts</span>
        </Link>
      </div>
    </nav>
  )
}
