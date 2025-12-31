"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CircleHelp, Menu, Search, Sparkles, User2 } from "lucide-react"

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

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, orgs, currentOrg, setCurrentOrgId, setCommandOpen, personaId, setPersonaId } = useApp()
  const personas = usePersonas()
  const [notificationItems, setNotificationItems] = useState(notifications)
  const unreadCount = notificationItems.filter((n) => n.unread).length
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Use setTimeout to defer state update to avoid cascading renders
    const timeout = setTimeout(() => setIsHydrated(true), 0)
    return () => clearTimeout(timeout)
  }, [])

  const notificationsButton = (
    <Button id="notifications-trigger" variant="ghost" size="icon" className="relative" suppressHydrationWarning>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" /> : null}
      <span className="sr-only">Notifications</span>
    </Button>
  )

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
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
        <Button variant="outline" onClick={() => setCommandOpen(true)} className="text-muted-foreground w-full justify-start gap-2">
          <Search className="size-4" />
          <span className="flex-1 text-left">Search…</span>
          <span className="hidden text-xs tracking-widest md:inline">
            <kbd className="bg-muted rounded px-1.5 py-0.5">⌘</kbd>
            <kbd className="bg-muted ml-1 rounded px-1.5 py-0.5">K</kbd>
            <span className="mx-1 text-muted-foreground/70">/</span>
            <kbd className="bg-muted rounded px-1.5 py-0.5">Ctrl</kbd>
            <kbd className="bg-muted ml-1 rounded px-1.5 py-0.5">K</kbd>
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
              <Link href="#">Docs</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="#">Contact support</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="#">Keyboard shortcuts</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
                <div className="bg-muted flex size-9 items-center justify-center rounded-md">
                  <User2 className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Persona</DropdownMenuLabel>
            {personas.map((p) => (
              <DropdownMenuItem key={p.id} onSelect={() => setPersonaId(p.id)} className="gap-2">
                <span className="capitalize">{p.role}</span>
                <span className="text-muted-foreground truncate text-xs">{p.label}</span>
                {p.id === personaId ? <span className="ml-auto text-xs">✓</span> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Log out
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
