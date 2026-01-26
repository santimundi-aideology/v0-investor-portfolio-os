"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, BookOpen, CircleHelp, Keyboard, LifeBuoy, LogOut, Menu, Search, User2 } from "lucide-react"
import { toast } from "sonner"

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
import { Badge } from "@/components/ui/badge"
import { useApp, usePersonas } from "@/components/providers/app-provider"
import { notifications } from "@/lib/mock-session"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { KeyboardShortcutsModal } from "@/components/layout/keyboard-shortcuts-modal"

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const { user, orgs, currentOrg, setCurrentOrgId, setCommandOpen, personaId, setPersonaId } = useApp()
  const personas = usePersonas()
  const [notificationItems, setNotificationItems] = useState(notifications)
  const unreadCount = notificationItems.filter((n) => n.unread).length
  const [isHydrated, setIsHydrated] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    // Use setTimeout to defer state update to avoid cascading renders
    const timeout = setTimeout(() => setIsHydrated(true), 0)
    return () => clearTimeout(timeout)
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
    toast.success("Logged out successfully", {
      description: "You have been signed out. Redirecting to login...",
    })
    // In a real app, this would clear auth tokens and redirect
    setTimeout(() => router.push("/login"), 1000)
  }

  const handleContactSupport = () => {
    toast.info("Contact Support", {
      description: "Email us at support@vantage.ae or call +971 4 XXX XXXX",
      duration: 5000,
    })
  }

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="org-switcher-trigger" variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{currentOrg.avatarText}</AvatarFallback>
              </Avatar>
              <span className="max-w-[160px] truncate text-sm font-medium">{currentOrg.name}</span>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {currentOrg.plan}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Organization</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {orgs.map((org) => (
                <DropdownMenuItem key={org.id} onSelect={() => setCurrentOrgId(org.id)}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{org.avatarText}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{org.name}</div>
                      <div className="text-muted-foreground text-xs capitalize">{org.plan}</div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="hidden flex-1 px-4 md:block">
        <Button variant="outline" onClick={() => setCommandOpen(true)} className="text-gray-500 w-full justify-start gap-2">
          <Search className="size-4" />
          <span className="flex-1 text-left">Search…</span>
          <span className="hidden text-xs tracking-widest md:inline">
            <kbd className="bg-gray-100 rounded px-1.5 py-0.5">⌘</kbd>
            <kbd className="bg-gray-100 ml-1 rounded px-1.5 py-0.5">K</kbd>
            <span className="mx-1 text-gray-400">/</span>
            <kbd className="bg-gray-100 rounded px-1.5 py-0.5">Ctrl</kbd>
            <kbd className="bg-gray-100 ml-1 rounded px-1.5 py-0.5">K</kbd>
          </span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCommandOpen(true)}>
          <Search className="h-5 w-5" />
          <span className="sr-only">Open search</span>
        </Button>

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
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
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
                  <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User2 className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-gray-500">Persona</DropdownMenuLabel>
            {personas.map((p) => (
              <DropdownMenuItem key={p.id} onSelect={() => setPersonaId(p.id)} className="gap-2">
                <span className="capitalize">{p.role}</span>
                <span className="text-gray-500 truncate text-xs">{p.label}</span>
                {p.id === personaId ? <span className="ml-auto text-xs text-green-600">✓</span> : null}
              </DropdownMenuItem>
            ))}
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
