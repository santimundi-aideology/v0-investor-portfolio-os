"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { useApp } from "@/components/providers/app-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  ToggleLeft,
  Eye,
  RefreshCw,
} from "lucide-react"
import { PlanBadge } from "@/components/plans/plan-badge"
import type { PlanTier } from "@/lib/plans/config"
import {
  type Tenant,
  TENANT_TYPES,
  TENANT_PLANS,
  statusBadgeVariant,
  formatDate,
  initials,
  typeLabel,
} from "@/lib/admin/types"

export default function AdminOrganizationsPage() {
  const { platformRole, refreshTenants } = useApp()

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

  return <OrganizationsInner refreshTenants={refreshTenants} />
}

function OrganizationsInner({ refreshTenants }: { refreshTenants: () => void }) {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [orgSearch, setOrgSearch] = useState("")
  const [orgTypeFilter, setOrgTypeFilter] = useState("all")
  const [orgStatusFilter, setOrgStatusFilter] = useState("all")
  const [orgDialogOpen, setOrgDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Tenant | null>(null)
  const [orgForm, setOrgForm] = useState({ name: "", type: "brokerage", plan: "starter", domain: "", contact_email: "" })
  const [orgSaving, setOrgSaving] = useState(false)

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

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

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
      refreshTenants()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setOrgSaving(false)
    }
  }, [orgForm, editingOrg, fetchTenants, refreshTenants])

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
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Toggle failed")
      }
    },
    [fetchTenants],
  )

  const filteredTenants = tenants.filter((t) => {
    if (orgSearch && !t.name.toLowerCase().includes(orgSearch.toLowerCase())) return false
    if (orgTypeFilter !== "all" && t.type !== orgTypeFilter) return false
    if (orgStatusFilter === "active" && !t.is_active) return false
    if (orgStatusFilter === "inactive" && t.is_active !== false) return false
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="Manage tenant organizations on the platform"
      />

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
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t.name}</span>
                              {t.is_demo && (
                                <Badge variant="outline" className="bg-violet-50 text-violet-600 border-violet-200 text-[10px] px-1.5 py-0">
                                  Demo
                                </Badge>
                              )}
                            </div>
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
                                router.push(`/admin/users?search=${encodeURIComponent(t.name)}`)
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
    </div>
  )
}
