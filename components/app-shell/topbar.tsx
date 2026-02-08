"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, BookOpen, Building2, Check, CircleHelp, Keyboard, LifeBuoy, Loader2, LogOut, Menu, Plus, Search, Shield, User2 } from "lucide-react"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp, usePersonas } from "@/components/providers/app-provider"
import { NotificationCenter } from "@/components/notifications/notification-center"
import type { Notification } from "@/lib/types"
import { KeyboardShortcutsModal } from "@/components/layout/keyboard-shortcuts-modal"

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const { user, orgs, currentOrg, setCurrentOrgId, setCommandOpen, personaId, setPersonaId, platformRole, tenantsLoading, refreshTenants } = useApp()
  const personas = usePersonas()
  const [notificationItems, setNotificationItems] = useState<Notification[]>([])
  const unreadCount = notificationItems.filter((n) => n.unread).length
  const [isHydrated, setIsHydrated] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Inline "Add Company" dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyPlan, setNewCompanyPlan] = useState("starter")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateCompany = useCallback(async () => {
    if (!newCompanyName.trim()) {
      toast.error("Company name is required")
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName.trim(), plan: newCompanyPlan }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create company")
      }
      const data = await res.json()
      toast.success("Company created", {
        description: `${newCompanyName.trim()} is now available.`,
      })
      setCreateDialogOpen(false)
      setNewCompanyName("")
      setNewCompanyPlan("starter")
      refreshTenants()
      // Auto-switch to the new tenant
      if (data.tenant?.id) {
        setCurrentOrgId(data.tenant.id)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create company")
    } finally {
      setIsCreating(false)
    }
  }, [newCompanyName, newCompanyPlan, refreshTenants, setCurrentOrgId])

  const handleTenantSwitch = useCallback((orgId: string) => {
    if (orgId === currentOrg?.id) return
    setCurrentOrgId(orgId)
    const orgName = orgs.find((o) => o.id === orgId)?.name ?? "company"
    toast.success(`Switched to ${orgName}`, {
      description: "Data will refresh for the selected company.",
    })
    // Force a page reload to refresh all data for the new tenant context
    // This ensures SWR caches are cleared and all components re-fetch
    window.location.reload()
  }, [currentOrg?.id, setCurrentOrgId, orgs])

  useEffect(() => {
    // Use setTimeout to defer state update to avoid cascading renders
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
              {tenantsLoading ? (
                <Skeleton className="h-6 w-6 rounded-full" />
              ) : (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{currentOrg.avatarText}</AvatarFallback>
                </Avatar>
              )}
              {tenantsLoading ? (
                <Skeleton className="hidden sm:block h-4 w-24" />
              ) : (
                <span className="max-w-[160px] truncate text-sm font-medium">{currentOrg.name}</span>
              )}
              {!tenantsLoading && platformRole === "super_admin" && (
                <Badge variant="outline" className="hidden sm:inline-flex gap-1 border-purple-300 bg-purple-50 text-purple-700">
                  <Shield className="h-3 w-3" />
                  Super Admin
                </Badge>
              )}
              {!tenantsLoading && platformRole !== "super_admin" && (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {currentOrg.plan}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Organization</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {tenantsLoading ? (
                <div className="flex items-center gap-2 px-2 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading companies…</span>
                </div>
              ) : orgs.length === 0 ? (
                <div className="px-2 py-3 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-gray-300 mb-1" />
                  <p className="text-sm text-muted-foreground">No companies yet</p>
                </div>
              ) : (
                orgs.map((org) => (
                  <DropdownMenuItem key={org.id} onSelect={() => handleTenantSwitch(org.id)}>
                    <div className="flex w-full items-center gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px]">{org.avatarText}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{org.name}</div>
                        <div className="text-muted-foreground text-xs capitalize">{org.plan}</div>
                      </div>
                      {org.id === currentOrg.id && (
                        <Check className="h-4 w-4 shrink-0 text-green-600" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
            {(platformRole === "super_admin" || platformRole === "manager") && (
              <>
                <DropdownMenuSeparator />
                {platformRole === "super_admin" && (
                  <DropdownMenuItem onSelect={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Company
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=companies" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Manage Companies
                  </Link>
                </DropdownMenuItem>
              </>
            )}
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

      {/* Inline Create Company Dialog (super_admin) */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Company</DialogTitle>
            <DialogDescription>
              Create a new tenant organization. Each company has isolated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topbar-company-name">Company Name</Label>
              <Input
                id="topbar-company-name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="e.g. Acme Real Estate Group"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating && newCompanyName.trim()) {
                    handleCreateCompany()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={newCompanyPlan} onValueChange={setNewCompanyPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateCompany} disabled={isCreating || !newCompanyName.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Company"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
