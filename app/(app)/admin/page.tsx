"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { useApp } from "@/components/providers/app-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Building2,
  Users,
  Shield,
  BarChart3,
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  ToggleLeft,
  Eye,
  UserPlus,
  Trash2,
  Globe,
  RefreshCw,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────

type Stats = {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  activeUsers: number
  usersByRole: { agent: number; manager: number; investor: number; super_admin: number }
  tenantsByPlan: { starter: number; pro: number; enterprise: number }
  tenantsByType: { brokerage: number; developer: number; family_office: number; other: number }
  superadminDomains: number
}

type Tenant = {
  id: string
  name: string
  plan: string
  type: string | null
  logo_url: string | null
  domain: string | null
  contact_email: string | null
  is_active: boolean | null
  created_at: string
  created_by: string | null
  userCount?: number
}

type UserRow = {
  id: string
  tenant_id: string | null
  name: string
  email: string
  role: string
  is_active: boolean | null
  created_at: string
  tenantName?: string
}

type DomainRow = {
  domain: string
  created_at: string
  created_by: string | null
}

// ─── Helpers ──────────────────────────────────────────────────

function roleBadgeVariant(role: string) {
  switch (role) {
    case "super_admin":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "manager":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "agent":
      return "bg-green-100 text-green-800 border-green-200"
    case "investor":
      return "bg-amber-100 text-amber-800 border-amber-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

function statusBadgeVariant(active: boolean | null) {
  return active
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-red-100 text-red-700 border-red-200"
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString()
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const TENANT_TYPES = ["brokerage", "developer", "family_office", "other"] as const
const TENANT_PLANS = ["starter", "pro", "enterprise"] as const
const USER_ROLES = ["super_admin", "manager", "agent", "investor"] as const
const ORG_ROLES = ["owner", "admin", "member"] as const

function typeLabel(type: string | null) {
  if (!type) return "-"
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Main Export ──────────────────────────────────────────────

export default function AdminConsolePage() {
  const { platformRole } = useApp()

  if (platformRole !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need super admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return <AdminConsoleInner />
}

// ─── Inner Component (all hooks live here) ────────────────────

function AdminConsoleInner() {
  const { refreshTenants } = useApp()

  // ── State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview")

  // Overview
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Organizations
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [orgSearch, setOrgSearch] = useState("")
  const [orgTypeFilter, setOrgTypeFilter] = useState("all")
  const [orgStatusFilter, setOrgStatusFilter] = useState("all")
  const [orgDialogOpen, setOrgDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Tenant | null>(null)
  const [orgForm, setOrgForm] = useState({ name: "", type: "brokerage", plan: "starter", domain: "", contact_email: "" })
  const [orgSaving, setOrgSaving] = useState(false)

  // Users
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState("all")
  const [userStatusFilter, setUserStatusFilter] = useState("all")
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "agent", tenantId: "", org_role: "member" })
  const [inviteSaving, setInviteSaving] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [userEditForm, setUserEditForm] = useState({ name: "", email: "", role: "agent", tenantId: "", phone: "", whatsapp: "", isActive: true })
  const [userEditSaving, setUserEditSaving] = useState(false)

  // Domains
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [domainsLoading, setDomainsLoading] = useState(true)
  const [domainDialogOpen, setDomainDialogOpen] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [domainSaving, setDomainSaving] = useState(false)
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null)

  // ── Fetchers ───────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error("Failed to fetch stats")
      const data = await res.json()
      setStats(data.stats)
    } catch {
      toast.error("Failed to load platform statistics")
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchTenants = useCallback(async () => {
    setTenantsLoading(true)
    try {
      const res = await fetch("/api/tenants")
      if (!res.ok) throw new Error("Failed to fetch tenants")
      const data = await res.json()
      setTenants(data.tenants ?? [])
    } catch {
      toast.error("Failed to load organizations")
    } finally {
      setTenantsLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch {
      toast.error("Failed to load users")
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const fetchDomains = useCallback(async () => {
    setDomainsLoading(true)
    try {
      const res = await fetch("/api/admin/domains")
      if (!res.ok) throw new Error("Failed to fetch domains")
      const data = await res.json()
      setDomains(data.domains ?? [])
    } catch {
      toast.error("Failed to load domains")
    } finally {
      setDomainsLoading(false)
    }
  }, [])

  // ── Initial fetch ──────────────────────────────────────────

  useEffect(() => {
    fetchStats()
    fetchTenants()
    fetchUsers()
    fetchDomains()
  }, [fetchStats, fetchTenants, fetchUsers, fetchDomains])

  // ── Org Mutations ──────────────────────────────────────────

  const openCreateOrg = useCallback(() => {
    setEditingOrg(null)
    setOrgForm({ name: "", type: "brokerage", plan: "starter", domain: "", contact_email: "" })
    setOrgDialogOpen(true)
  }, [])

  const openEditOrg = useCallback((tenant: Tenant) => {
    setEditingOrg(tenant)
    setOrgForm({
      name: tenant.name,
      type: tenant.type ?? "brokerage",
      plan: tenant.plan,
      domain: tenant.domain ?? "",
      contact_email: tenant.contact_email ?? "",
    })
    setOrgDialogOpen(true)
  }, [])

  const saveOrg = useCallback(async () => {
    if (!orgForm.name.trim()) {
      toast.error("Organization name is required")
      return
    }
    setOrgSaving(true)
    try {
      if (editingOrg) {
        const res = await fetch(`/api/tenants/${editingOrg.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: orgForm.name.trim(),
            type: orgForm.type,
            plan: orgForm.plan,
            domain: orgForm.domain || undefined,
            contact_email: orgForm.contact_email || undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to update organization")
        }
        toast.success("Organization updated")
      } else {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: orgForm.name.trim(),
            type: orgForm.type,
            plan: orgForm.plan,
            domain: orgForm.domain || undefined,
            contact_email: orgForm.contact_email || undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to create organization")
        }
        toast.success("Organization created")
      }
      setOrgDialogOpen(false)
      fetchTenants()
      fetchStats()
      refreshTenants()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setOrgSaving(false)
    }
  }, [orgForm, editingOrg, fetchTenants, fetchStats, refreshTenants])

  const toggleOrgActive = useCallback(
    async (tenant: Tenant) => {
      try {
        const res = await fetch(`/api/tenants/${tenant.id}`, { method: "PATCH" })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to toggle status")
        }
        toast.success(`Organization ${tenant.is_active ? "deactivated" : "activated"}`)
        fetchTenants()
        fetchStats()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Toggle failed")
      }
    },
    [fetchTenants, fetchStats],
  )

  // ── User Mutations ─────────────────────────────────────────

  const openInviteUser = useCallback(() => {
    setInviteForm({ email: "", name: "", role: "agent", tenantId: "", org_role: "member" })
    setInviteDialogOpen(true)
  }, [])

  const sendInvite = useCallback(async () => {
    if (!inviteForm.email.trim() || !inviteForm.name.trim()) {
      toast.error("Email and name are required")
      return
    }
    setInviteSaving(true)
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteForm.email.trim(),
          name: inviteForm.name.trim(),
          role: inviteForm.role,
          tenantId: inviteForm.tenantId || undefined,
          org_role: inviteForm.org_role,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to send invitation")
      }
      toast.success(`Invitation sent to ${inviteForm.email}`)
      setInviteDialogOpen(false)
      fetchUsers()
      fetchStats()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invitation failed")
    } finally {
      setInviteSaving(false)
    }
  }, [inviteForm, fetchUsers, fetchStats])

  const openEditUser = useCallback((user: UserRow) => {
    setEditingUser(user)
    setUserEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id ?? "",
      phone: "",
      whatsapp: "",
      isActive: user.is_active ?? true,
    })
    setEditUserDialogOpen(true)
  }, [])

  const saveUserEdit = useCallback(async () => {
    if (!editingUser) return
    if (!userEditForm.name.trim()) {
      toast.error("Name is required")
      return
    }
    setUserEditSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userEditForm.name.trim(),
          email: userEditForm.email.trim(),
          role: userEditForm.role,
          tenantId: userEditForm.tenantId || undefined,
          phone: userEditForm.phone || undefined,
          whatsapp: userEditForm.whatsapp || undefined,
          isActive: userEditForm.isActive,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update user")
      }
      toast.success("User updated successfully")
      setEditUserDialogOpen(false)
      fetchUsers()
      fetchStats()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setUserEditSaving(false)
    }
  }, [editingUser, userEditForm, fetchUsers, fetchStats])

  const toggleUserActive = useCallback(
    async (user: UserRow) => {
      try {
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !user.is_active }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to toggle status")
        }
        toast.success(`User ${user.is_active ? "deactivated" : "activated"}`)
        fetchUsers()
        fetchStats()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Toggle failed")
      }
    },
    [fetchUsers, fetchStats],
  )

  // ── Domain Mutations ───────────────────────────────────────

  const addDomain = useCallback(async () => {
    if (!newDomain.trim()) {
      toast.error("Domain is required")
      return
    }
    setDomainSaving(true)
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to add domain")
      }
      toast.success(`Domain "${newDomain.trim()}" added`)
      setNewDomain("")
      setDomainDialogOpen(false)
      fetchDomains()
      fetchStats()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add domain")
    } finally {
      setDomainSaving(false)
    }
  }, [newDomain, fetchDomains, fetchStats])

  const deleteDomain = useCallback(
    async (domain: string) => {
      setDeletingDomain(domain)
      try {
        const res = await fetch("/api/admin/domains", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to remove domain")
        }
        toast.success(`Domain "${domain}" removed`)
        fetchDomains()
        fetchStats()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to remove domain")
      } finally {
        setDeletingDomain(null)
      }
    },
    [fetchDomains, fetchStats],
  )

  // ── Filtered Data ──────────────────────────────────────────

  const filteredTenants = tenants.filter((t) => {
    if (orgSearch && !t.name.toLowerCase().includes(orgSearch.toLowerCase())) return false
    if (orgTypeFilter !== "all" && t.type !== orgTypeFilter) return false
    if (orgStatusFilter === "active" && !t.is_active) return false
    if (orgStatusFilter === "inactive" && t.is_active !== false) return false
    return true
  })

  const filteredUsers = users.filter((u) => {
    if (userSearch) {
      const q = userSearch.toLowerCase()
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false
    if (userStatusFilter === "active" && !u.is_active) return false
    if (userStatusFilter === "inactive" && u.is_active !== false) return false
    return true
  })

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Console"
        subtitle="Manage organizations, users, and platform settings"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ──────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </CardContent>
                </Card>
              ))
            ) : stats ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Organizations
                    </CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalTenants}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.activeTenants} active
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeUsers}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.totalUsers} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Super Admin Domains
                    </CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.superadminDomains}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.usersByRole.super_admin} super admins
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Tenants by Plan
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-gray-50">
                        Starter: {stats.tenantsByPlan.starter}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Pro: {stats.tenantsByPlan.pro}
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Enterprise: {stats.tenantsByPlan.enterprise}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {/* Role distribution */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Users by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(
                    [
                      { label: "Super Admins", count: stats.usersByRole.super_admin, role: "super_admin" },
                      { label: "Managers", count: stats.usersByRole.manager, role: "manager" },
                      { label: "Agents", count: stats.usersByRole.agent, role: "agent" },
                      { label: "Investors", count: stats.usersByRole.investor, role: "investor" },
                    ] as const
                  ).map((item) => (
                    <div key={item.role} className="text-center p-3 rounded-lg border">
                      <div className="text-2xl font-bold">{item.count}</div>
                      <Badge variant="outline" className={`mt-1 ${roleBadgeVariant(item.role)}`}>
                        {item.label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Organizations Tab ─────────────────────────────── */}
        <TabsContent value="organizations" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={orgTypeFilter} onValueChange={setOrgTypeFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TENANT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={orgStatusFilter} onValueChange={setOrgStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreateOrg}>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {tenantsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-center">Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No organizations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTenants.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-gray-100">
                                  {initials(t.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{t.name}</div>
                                {t.domain && (
                                  <div className="text-xs text-muted-foreground">{t.domain}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{typeLabel(t.type)}</TableCell>
                          <TableCell>
                            <PlanBadge plan={t.plan as PlanTier} />
                          </TableCell>
                          <TableCell className="text-center">{t.userCount ?? 0}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusBadgeVariant(t.is_active)}
                            >
                              {t.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(t.created_at)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditOrg(t)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleOrgActive(t)}>
                                  <ToggleLeft className="h-4 w-4 mr-2" />
                                  {t.is_active ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActiveTab("users")
                                    setUserSearch(t.name)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Users
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Org Dialog */}
          <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
            <DialogContent className="!gap-0 !p-0 overflow-hidden" style={{ width: "min(90vw, 650px)", maxWidth: "650px" }}>
              <div className="border-b bg-[radial-gradient(900px_circle_at_15%_0%,rgba(34,197,94,0.12),transparent_55%),radial-gradient(700px_circle_at_85%_30%,rgba(16,185,129,0.10),transparent_55%)] px-6 py-5">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="flex items-center gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <span>{editingOrg ? "Edit organization" : "Add organization"}</span>
                  </DialogTitle>
                  <DialogDescription>
                    {editingOrg
                      ? "Update the organization details."
                      : "Create a new organization on the platform."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Company name</Label>
                  <Input
                    id="org-name"
                    className="h-11"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Palm & Partners Realty"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the display name used across the app.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={orgForm.type} onValueChange={(v) => setOrgForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TENANT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {typeLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select value={orgForm.plan} onValueChange={(v) => setOrgForm((f) => ({ ...f, plan: v }))}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TENANT_PLANS.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-domain">Domain</Label>
                    <Input
                      id="org-domain"
                      className="h-11"
                      value={orgForm.domain}
                      onChange={(e) => setOrgForm((f) => ({ ...f, domain: e.target.value }))}
                      placeholder="example.com"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Used for email-domain based access rules.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="org-email">Contact email</Label>
                    <Input
                      id="org-email"
                      className="h-11"
                      type="email"
                      value={orgForm.contact_email}
                      onChange={(e) => setOrgForm((f) => ({ ...f, contact_email: e.target.value }))}
                      placeholder="admin@example.com"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. For onboarding and billing notifications.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Tip: You can leave Domain/Contact email blank and add them later.
                </div>
              </div>

              <DialogFooter className="border-t bg-muted/20 px-6 py-4">
                <Button variant="outline" onClick={() => setOrgDialogOpen(false)} disabled={orgSaving}>
                  Cancel
                </Button>
                <Button onClick={saveOrg} disabled={orgSaving || !orgForm.name.trim()}>
                  {orgSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingOrg ? (
                    "Save changes"
                  ) : (
                    "Create organization"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── Users Tab ─────────────────────────────────────── */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="investor">Investor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openInviteUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-gray-100">
                                  {initials(u.name || u.email)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{u.name || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={roleBadgeVariant(u.role)}
                            >
                              {u.role.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.tenantName || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusBadgeVariant(u.is_active)}
                            >
                              {u.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(u.created_at)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditUser(u)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleUserActive(u)}>
                                  <ToggleLeft className="h-4 w-4 mr-2" />
                                  {u.is_active ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
            <DialogContent className="!gap-0 !p-0 overflow-hidden" style={{ width: "min(90vw, 650px)", maxWidth: "650px" }}>
              <div className="border-b bg-[radial-gradient(900px_circle_at_15%_0%,rgba(59,130,246,0.10),transparent_55%),radial-gradient(700px_circle_at_85%_30%,rgba(16,185,129,0.10),transparent_55%)] px-6 py-5">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="flex items-center gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Pencil className="h-5 w-5" />
                    </span>
                    <span>Edit user</span>
                  </DialogTitle>
                  <DialogDescription>
                    Update user details and permissions.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-name">Full name</Label>
                    <Input
                      id="edit-user-name"
                      className="h-11"
                      value={userEditForm.name}
                      onChange={(e) => setUserEditForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="John Smith"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-user-email">Email</Label>
                    <Input
                      id="edit-user-email"
                      className="h-11"
                      type="email"
                      value={userEditForm.email}
                      onChange={(e) => setUserEditForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="user@example.com"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Platform role</Label>
                    <Select value={userEditForm.role} onValueChange={(v) => setUserEditForm((f) => ({ ...f, role: v }))}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {typeLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Controls app-wide permissions.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Select value={userEditForm.tenantId} onValueChange={(v) => setUserEditForm((f) => ({ ...f, tenantId: v }))}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants
                          .filter((t) => t.is_active)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      User's primary organization.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-phone">Phone</Label>
                    <Input
                      id="edit-user-phone"
                      className="h-11"
                      value={userEditForm.phone}
                      onChange={(e) => setUserEditForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+971 50 123 4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-user-whatsapp">WhatsApp</Label>
                    <Input
                      id="edit-user-whatsapp"
                      className="h-11"
                      value={userEditForm.whatsapp}
                      onChange={(e) => setUserEditForm((f) => ({ ...f, whatsapp: e.target.value }))}
                      placeholder="+971 50 123 4567"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Account status</Label>
                    <p className="text-sm text-muted-foreground">
                      {userEditForm.isActive ? "User can sign in" : "User is blocked from signing in"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={userEditForm.isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => setUserEditForm((f) => ({ ...f, isActive: !f.isActive }))}
                  >
                    {userEditForm.isActive ? "Active" : "Inactive"}
                  </Button>
                </div>
              </div>

              <DialogFooter className="border-t bg-muted/20 px-6 py-4">
                <Button variant="outline" onClick={() => setEditUserDialogOpen(false)} disabled={userEditSaving}>
                  Cancel
                </Button>
                <Button onClick={saveUserEdit} disabled={userEditSaving || !userEditForm.name.trim()}>
                  {userEditSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Invite Dialog */}
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent className="!gap-0 !p-0 overflow-hidden" style={{ width: "min(90vw, 700px)", maxWidth: "700px" }}>
              <div className="border-b bg-[radial-gradient(900px_circle_at_15%_0%,rgba(59,130,246,0.10),transparent_55%),radial-gradient(700px_circle_at_85%_30%,rgba(16,185,129,0.10),transparent_55%)] px-6 py-5">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="flex items-center gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <UserPlus className="h-5 w-5" />
                    </span>
                    <span>Invite user</span>
                  </DialogTitle>
                  <DialogDescription>
                    Send an invitation email and assign role + organization access.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      className="h-11"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="user@example.com"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      This is where the invitation will be sent.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Full name</Label>
                    <Input
                      id="invite-name"
                      className="h-11"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Alex Johnson"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Helps personalize the invite and UI.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Platform role</Label>
                    <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {typeLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Controls app-wide permissions.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Org role</Label>
                    <Select value={inviteForm.org_role} onValueChange={(v) => setInviteForm((f) => ({ ...f, org_role: v }))}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Membership inside the organization.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Select value={inviteForm.tenantId} onValueChange={(v) => setInviteForm((f) => ({ ...f, tenantId: v }))}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants
                          .filter((t) => t.is_active)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Required. Determines the tenant scope.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Tip: Start with <span className="font-medium text-foreground">Agent</span> for internal team members and
                  <span className="font-medium text-foreground"> Investor</span> for client accounts.
                </div>
              </div>

              <DialogFooter className="border-t bg-muted/20 px-6 py-4">
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={inviteSaving}>
                  Cancel
                </Button>
                <Button onClick={sendInvite} disabled={inviteSaving || !inviteForm.email.trim() || !inviteForm.tenantId}>
                  {inviteSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send invitation"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── Domains Tab ───────────────────────────────────── */}
        <TabsContent value="domains" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Super Admin Domains</h3>
              <p className="text-sm text-muted-foreground">
                Email domains that automatically grant super admin access.
              </p>
            </div>
            <Button onClick={() => { setNewDomain(""); setDomainDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {domainsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domains.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          No domains configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      domains.map((d) => (
                        <TableRow key={d.domain}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{d.domain}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(d.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deletingDomain === d.domain}
                              onClick={() => {
                                if (confirm(`Remove domain "${d.domain}"? This cannot be undone.`)) {
                                  deleteDomain(d.domain)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Add Domain Dialog */}
          <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Domain</DialogTitle>
                <DialogDescription>
                  Users with this email domain will automatically receive super admin access.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="new-domain">Domain</Label>
                <Input
                  id="new-domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDomain()
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDomainDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addDomain} disabled={domainSaving}>
                  {domainSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Domain"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
