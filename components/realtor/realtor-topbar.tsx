"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NotificationCenter } from "@/components/notifications/notification-center"
import type { Notification } from "@/lib/types"
import { useAuth } from "@/components/providers/auth-provider"
import { useApp } from "@/components/providers/app-provider"
import { VantageIcon } from "@/components/brand/logo"

interface RealtorTopbarProps {
  onMenuClick: () => void
}

export function RealtorTopbar({ onMenuClick }: RealtorTopbarProps) {
  const { signOut } = useAuth()
  const { user } = useApp()
  const { theme, setTheme } = useTheme()
  const [notificationItems, setNotificationItems] = useState<Notification[]>([])
  const unreadCount = notificationItems.filter((n) => n.unread).length
  const [isHydrated, setIsHydrated] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  const [commandOpen, setCommandOpen] = useState(false)
  const openSearch = useCallback(() => setCommandOpen(true), [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setIsHydrated(true), 0)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/api/notifications?limit=50")
        if (res.ok) {
          const data = await res.json()
          const notifications: Notification[] = (data.notifications || []).map((n: {
            id: string
            title: string
            body: string
            read_at: string | null
            created_at: string
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
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const safeUserName =
    typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name
      : "Realtor"

  const initials = safeUserName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const notificationsButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative hover:bg-gray-50"
      suppressHydrationWarning
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
        </span>
      )}
      <span className="sr-only">Notifications ({unreadCount} unread)</span>
    </Button>
  )

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-teal-50 px-4 lg:px-6">
      {/* Left — Logo, mobile menu & user info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <VantageIcon size={28} className="text-primary" />
          <span className="font-semibold text-foreground hidden sm:inline">Vantage</span>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>

        <div className="hidden sm:flex flex-col border-l border-gray-200 pl-4">
          <span className="text-sm font-semibold text-foreground leading-tight">
            {safeUserName}
          </span>
          <span className="text-xs text-gray-500">
            Real Estate Operations
          </span>
        </div>
      </div>

      {/* Center — Search (desktop) */}
      <div className="hidden flex-1 max-w-2xl px-6 md:block">
        <Button
          variant="outline"
          className="text-gray-500 w-full justify-start gap-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50 h-11 text-base"
          onClick={openSearch}
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search investors, properties, deals…</span>
          <span className="hidden text-xs tracking-widest lg:inline">
            <kbd className="bg-muted rounded px-1.5 py-0.5">⌘</kbd>
            <kbd className="bg-muted ml-1 rounded px-1.5 py-0.5">K</kbd>
          </span>
        </Button>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="md:hidden hover:bg-gray-50" onClick={openSearch}>
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-teal-50 hover:text-teal-600 relative group"
          onClick={() => setAiDialogOpen(true)}
        >
          <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">AI Assistant</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-50"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {isHydrated ? (
            theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1" aria-label="Open user menu">
              <Avatar className="h-9 w-9 ring-2 ring-gray-200 hover:ring-teal-300 transition-all">
                <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={safeUserName} />
                <AvatarFallback className="bg-teal-50 text-teal-600 font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3">
                <div className="bg-teal-50 flex size-10 items-center justify-center rounded-lg">
                  <User2 className="size-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{safeUserName}</p>
                  <p className="truncate text-xs text-gray-500">{user?.email || ""}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/realtor/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
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

      {/* AI Assistant Dialog */}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">AI Deal Copilot</h3>
                <p className="text-sm text-gray-500">
                  Ask about investors, pipeline, or property analysis
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <span>Which investor should I follow up with today?</span>
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <span>Summarize blockers in my live deals</span>
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <span>What properties match open mandates?</span>
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
