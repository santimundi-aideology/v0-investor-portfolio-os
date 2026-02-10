"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Menu, Moon, Search, Sparkles, Sun, User2 } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { NotificationCenter } from "@/components/notifications/notification-center"
import type { Notification } from "@/lib/types"
import { useAuth } from "@/components/providers/auth-provider"

interface InvestorTopbarProps {
  onMenuClick: () => void
  investorName?: string
  companyName?: string
  investorAvatar?: string
  onAIAssistantClick?: () => void
  /** Super admin mode: show investor selector */
  isSuperAdmin?: boolean
  availableInvestors?: { id: string; name: string; company?: string; email?: string; status?: string }[]
  selectedInvestorId?: string
  onInvestorChange?: (investorId: string) => void
}

export function InvestorTopbar({
  onMenuClick,
  investorName = "Investor",
  companyName = "Investment Portfolio",
  investorAvatar,
  isSuperAdmin = false,
  availableInvestors = [],
  selectedInvestorId,
  onInvestorChange,
}: InvestorTopbarProps) {
  const { signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [notificationItems, setNotificationItems] = useState<Notification[]>([])
  const unreadCount = notificationItems.filter((n) => n.unread).length
  const [isHydrated, setIsHydrated] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setIsHydrated(true), 0)
    return () => clearTimeout(timeout)
  }, [])

  // Load notifications from API
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/api/notifications?limit=50")
        if (res.ok) {
          const data = await res.json()
          // Transform DB notifications to component format
          const notifications: Notification[] = (data.notifications || []).map((n: {
            id: string
            title: string
            body: string
            read_at: string | null
            created_at: string
            entity_type?: string
            entity_id?: string
            metadata?: Record<string, unknown>
          }) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            createdAt: n.created_at,
            unread: !n.read_at,
            href: n.metadata?.link as string | undefined,
          }))
          setNotificationItems(notifications)
        }
      } catch (err) {
        console.error("Failed to load notifications:", err)
      }
    }
    loadNotifications()
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const notificationsButton = (
    <Button
      id="notifications-trigger"
      variant="ghost"
      size="icon"
      className="relative hover:bg-gray-50"
      suppressHydrationWarning
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
      )}
      <span className="sr-only">Notifications ({unreadCount} unread)</span>
    </Button>
  )

  const safeInvestorName =
    typeof investorName === "string" && investorName.trim().length > 0
      ? investorName
      : "Investor"

  const initials = safeInvestorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Left side - Mobile menu & Investor info / selector */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>

        {isSuperAdmin && availableInvestors.length > 0 ? (
          <div className="hidden sm:flex items-center gap-3">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs shrink-0">
              Admin Preview
            </Badge>
            <Select
              value={selectedInvestorId ?? ""}
              onValueChange={(value) => onInvestorChange?.(value)}
            >
              <SelectTrigger className="w-[220px] h-9 text-sm">
                <SelectValue placeholder="Select investor..." />
              </SelectTrigger>
              <SelectContent>
                {availableInvestors
                  .filter((inv) => inv.status === "active")
                  .map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      <div className="flex flex-col">
                        <span>{inv.name}</span>
                        {inv.company && (
                          <span className="text-xs text-muted-foreground">{inv.company}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">
              {safeInvestorName}
            </span>
            <span className="text-xs text-gray-500">
              {companyName}
            </span>
          </div>
        )}
      </div>

      {/* Center - Search (desktop) */}
      <div className="hidden flex-1 max-w-md px-8 md:block">
        <Button
          variant="outline"
          className="text-gray-500 w-full justify-start gap-2 border-gray-200 hover:border-green-300 hover:bg-green-50"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search portfolio…</span>
          <span className="hidden text-xs tracking-widest lg:inline">
            <kbd className="bg-muted rounded px-1.5 py-0.5">⌘</kbd>
            <kbd className="bg-muted ml-1 rounded px-1.5 py-0.5">K</kbd>
          </span>
        </Button>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Mobile search */}
        <Button variant="ghost" size="icon" className="md:hidden hover:bg-gray-50">
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        {/* AI Assistant quick access */}
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-green-50 hover:text-green-600 relative group"
          onClick={() => setAiDialogOpen(true)}
        >
          <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">AI Assistant</span>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-50"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {isHydrated ? (
            theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        {isHydrated ? (
          <Popover>
            <PopoverTrigger asChild>{notificationsButton}</PopoverTrigger>
            <PopoverContent align="end" className="w-[28rem]">
              <NotificationCenter
                notifications={notificationItems}
                onChange={setNotificationItems}
                variant="popover"
              />
            </PopoverContent>
          </Popover>
        ) : (
          notificationsButton
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id="user-menu-trigger"
              variant="ghost"
              className="relative h-9 w-9 rounded-full ml-1"
            >
              <Avatar className="h-9 w-9 ring-2 ring-gray-200 hover:ring-green-300 transition-all">
                <AvatarImage src={investorAvatar || "/placeholder.svg"} alt={safeInvestorName} />
                <AvatarFallback className="bg-green-50 text-green-600 font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3">
                <div className="bg-green-50 flex size-10 items-center justify-center rounded-lg">
                  <User2 className="size-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{safeInvestorName}</p>
                  <p className="truncate text-xs text-gray-500">{companyName}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/investor/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/investor/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/investor/preferences">Investment Preferences</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/investor/documents">Documents</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/investor/support">Support</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut()} className="text-destructive focus:text-destructive">
              Sign out
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* AI Assistant Dialog — suggestion buttons are informational for now */}
      {aiDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setAiDialogOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">AI Investment Advisor</h3>
                <p className="text-sm text-gray-500">
                  Ask about your portfolio, opportunities, or market trends
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <span>How is my portfolio performing vs market?</span>
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <span>What opportunities match my investment criteria?</span>
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <span>Summarize my risk exposure</span>
              </Button>
            </div>
            <Button className="w-full mt-4" onClick={() => setAiDialogOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
