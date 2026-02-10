"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Bell, CircleHelp, LogOut, Menu, Shield, User2, BookOpen, Keyboard, LifeBuoy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/components/providers/app-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { NotificationCenter } from "@/components/notifications/notification-center"
import type { Notification } from "@/lib/types"
import { KeyboardShortcutsModal } from "@/components/layout/keyboard-shortcuts-modal"

interface AdminTopbarProps {
  onMenuClick: () => void
}

function getAvatarInitials(name: unknown): string {
  if (typeof name !== "string" || name.trim().length === 0) return "U"
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const { signOut } = useAuth()
  const { user } = useApp()
  const [notificationItems, setNotificationItems] = useState<Notification[]>([])
  const unreadCount = notificationItems.filter((n) => n.unread).length
  const [isHydrated, setIsHydrated] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

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
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Global keyboard shortcut for ? to open shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement
        const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
        if (!isInputField) {
          e.preventDefault()
          setShortcutsOpen(true)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleLogout = () => {
    signOut()
  }

  const handleContactSupport = useCallback(() => {
    toast.info("Contact Support", {
      description: "Email us at support@vantage.ae or call +971 4 XXX XXXX",
      duration: 5000,
    })
  }, [])

  const notificationsButton = (
    <Button id="notifications-trigger" variant="ghost" size="icon" className="relative" suppressHydrationWarning>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" /> : null}
      <span className="sr-only">Notifications</span>
    </Button>
  )

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-purple-300 bg-purple-50 text-purple-700">
            <Shield className="h-3 w-3" />
            Platform Admin
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isHydrated ? (
          <Popover>
            <PopoverTrigger asChild>{notificationsButton}</PopoverTrigger>
            <PopoverContent align="end" className="w-[28rem]">
              <NotificationCenter notifications={notificationItems} onChange={setNotificationItems} variant="popover" />
            </PopoverContent>
          </Popover>
        ) : (
          notificationsButton
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="help-trigger" variant="ghost" size="icon">
              <CircleHelp className="h-5 w-5" />
              <span className="sr-only">Help</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Help</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="https://docs.vantage.ae" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Documentation
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleContactSupport} className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" />
              Contact support
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShortcutsOpen(true)} className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard shortcuts
              <DropdownMenuShortcut>?</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="user-menu-trigger" variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name || "User"} />
                <AvatarFallback>
                  {getAvatarInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 flex size-9 items-center justify-center rounded-lg">
                  <User2 className="size-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{user.name || "Loading..."}</p>
                  <p className="truncate text-xs text-gray-500">{user.email || ""}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Log out
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
