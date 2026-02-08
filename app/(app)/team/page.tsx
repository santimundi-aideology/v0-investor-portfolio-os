"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { RoleRedirect } from "@/components/security/role-redirect"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Search,
  UsersRound,
  Shield,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  MoreHorizontal,
  Mail,
  Send,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useApp } from "@/components/providers/app-provider"

export default function TeamPage() {
  return (
    <>
      <RoleRedirect allow={["owner", "admin"]} redirectTo="/dashboard" />
      <TeamPageInner />
    </>
  )
}

// ───────────────────── Types ──────────────────────

type UserRow = {
  id: string
  tenant_id: string | null
  name: string
  email: string
  role: string
  phone: string | null
  whatsapp: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
  auth_user_id: string | null
  last_sign_in_at: string | null
  email_verified: boolean
  tenantName: string
}

type TenantOption = {
  id: string
  name: string
}

// ───────────────────── Main Component ──────────────────────

function TeamPageInner() {
  const { platformRole, user } = useApp()
  const isSuperAdmin = platformRole === "super_admin"

  // User list state
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [tenantFilter, setTenantFilter] = useState("all")

  // Tenant list (for super_admin filtering/assignment)
  const [tenants, setTenants] = useState<TenantOption[]>([])

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent",
    tenantId: "",
    phone: "",
    whatsapp: "",
  })
  const [isCreating, setIsCreating] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    tenantId: "",
    phone: "",
    whatsapp: "",
    isActive: true,
  })
  const [isEditing, setIsEditing] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserRow | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "agent",
    tenantId: "",
  })
  const [isInviting, setIsInviting] = useState(false)

  // ───── Fetch users ─────
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter !== "all") params.set("role", roleFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (tenantFilter !== "all") params.set("tenantId", tenantFilter)
      if (searchQuery) params.set("search", searchQuery)

      const qs = params.toString()
      const res = await fetch(`/api/admin/users${qs ? `?${qs}` : ""}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users ?? [])
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to fetch users")
      }
    } catch (err) {
      console.error("Failed to fetch users:", err)
      toast.error("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }, [roleFilter, statusFilter, tenantFilter, searchQuery])

  // ───── Fetch tenants ─────
  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch("/api/tenants")
      if (res.ok) {
        const data = await res.json()
        setTenants(
          (data.tenants ?? []).map((t: { id: string; name: string }) => ({
            id: t.id,
            name: t.name,
          }))
        )
      }
    } catch (err) {
      console.error("Failed to fetch tenants:", err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  // ───── Create user ─────
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error("Name is required")
      return
    }
    if (!createForm.email.trim()) {
      toast.error("Email is required")
      return
    }
    if (!createForm.password || createForm.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (!createForm.tenantId && createForm.role !== "super_admin") {
      toast.error("Please select a company")
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role,
          tenantId: createForm.tenantId || undefined,
          phone: createForm.phone || undefined,
          whatsapp: createForm.whatsapp || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create user")
      }
      toast.success("User created successfully")
      setCreateOpen(false)
      setCreateForm({ name: "", email: "", password: "", role: "agent", tenantId: "", phone: "", whatsapp: "" })
      setShowCreatePassword(false)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setIsCreating(false)
    }
  }

  // ───── Edit user ─────
  const openEdit = (u: UserRow) => {
    setEditUser(u)
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      tenantId: u.tenant_id ?? "",
      phone: u.phone ?? "",
      whatsapp: u.whatsapp ?? "",
      isActive: u.is_active,
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editUser) return
    setIsEditing(true)
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          role: editForm.role,
          tenantId: editForm.tenantId || undefined,
          phone: editForm.phone || undefined,
          whatsapp: editForm.whatsapp || undefined,
          isActive: editForm.isActive,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update user")
      }
      toast.success("User updated successfully")
      setEditOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user")
    } finally {
      setIsEditing(false)
    }
  }

  // ───── Delete user ─────
  const openDelete = (u: UserRow) => {
    setDeleteUser(u)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete user")
      }
      toast.success("User deleted successfully")
      setDeleteOpen(false)
      setDeleteUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setIsDeleting(false)
    }
  }

  // ───── Toggle active/inactive ─────
  const toggleActive = async (u: UserRow) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.is_active }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update user status")
      }
      toast.success(u.is_active ? "User deactivated" : "User activated")
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle user status")
    }
  }

  // ───── Reset password ─────
  const openResetPassword = (u: UserRow) => {
    setResetUser(u)
    setNewPassword("")
    setShowNewPassword(false)
    setResetOpen(true)
  }

  const handleResetPassword = async () => {
    if (!resetUser) return
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    setIsResetting(true)
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to reset password")
      }
      toast.success(`Password reset for ${resetUser.name}`)
      setResetOpen(false)
      setResetUser(null)
      setNewPassword("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setIsResetting(false)
    }
  }

  // ───── Send password reset email ─────
  const sendResetEmail = async (u: UserRow) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}/send-reset`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to send reset email")
      }
      toast.success("Password reset email sent", {
        description: `Sent to ${u.email}`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email")
    }
  }

  // ───── Invite user by email ─────
  const handleInvite = async () => {
    if (!inviteForm.name.trim()) {
      toast.error("Name is required")
      return
    }
    if (!inviteForm.email.trim()) {
      toast.error("Email is required")
      return
    }
    if (!inviteForm.tenantId && inviteForm.role !== "super_admin") {
      toast.error("Please select a company")
      return
    }

    setIsInviting(true)
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteForm.name.trim(),
          email: inviteForm.email.trim(),
          role: inviteForm.role,
          tenantId: inviteForm.tenantId || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to send invitation")
      }
      toast.success("Invitation sent!", {
        description: `An email has been sent to ${inviteForm.email}`,
      })
      setInviteOpen(false)
      setInviteForm({ name: "", email: "", role: "agent", tenantId: "" })
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  // ───── Role badge styling ─────
  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-800",
      manager: "bg-blue-100 text-blue-800",
      agent: "bg-green-100 text-green-800",
      investor: "bg-amber-100 text-amber-800",
    }
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      manager: "Manager",
      agent: "Agent",
      investor: "Investor",
    }
    return (
      <Badge variant="secondary" className={styles[role] ?? "bg-gray-100 text-gray-800"}>
        {labels[role] ?? role}
      </Badge>
    )
  }

  // ───── Stats ─────
  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.is_active).length
  const adminUsers = users.filter((u) => u.role === "super_admin" || u.role === "manager").length
  const recentUsers = users.filter((u) => {
    const d = new Date(u.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return d >= thirtyDaysAgo
  }).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Create, manage, and configure user accounts across your organization"
        primaryAction={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <Mail className="mr-1.5 h-4 w-4" />
              Invite by Email
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add User
            </Button>
          </div>
        }
      />

      {/* ───── Stats Cards ───── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <UsersRound className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2.5">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2.5">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{adminUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2.5">
                <Plus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New (30d)</p>
                <p className="text-2xl font-bold">{recentUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───── Filters ───── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {isSuperAdmin
                  ? "All users across all companies"
                  : "Users in your organization"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {isSuperAdmin && (
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ───── User Table ───── */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersRound className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No users found matching your filters.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    {isSuperAdmin && <TableHead>Company</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.avatar_url ?? undefined} alt={u.name} />
                            <AvatarFallback className="text-xs">
                              {u.name
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-sm text-muted-foreground">
                          {u.tenantName}
                        </TableCell>
                      )}
                      <TableCell>
                        {u.is_active ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetPassword(u)}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendResetEmail(u)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Reset Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(u)}>
                              {u.is_active ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            {isSuperAdmin && u.id !== user.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDelete(u)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════ CREATE USER DIALOG ════════════════════ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new user to the platform. They will be able to sign in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-name">Full Name *</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="john@company.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password *</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    {isSuperAdmin && <SelectItem value="manager">Manager</SelectItem>}
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Company {createForm.role !== "super_admin" ? "*" : ""}</Label>
                <Select
                  value={createForm.tenantId}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, tenantId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+971 50 XXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-whatsapp">WhatsApp</Label>
                <Input
                  id="create-whatsapp"
                  type="tel"
                  value={createForm.whatsapp}
                  onChange={(e) => setCreateForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+971 50 XXX XXXX"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !createForm.name.trim() || !createForm.email.trim()}
            >
              {isCreating ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════ EDIT USER DIALOG ════════════════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update the user&apos;s profile and permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    {isSuperAdmin && <SelectItem value="manager">Manager</SelectItem>}
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Select
                    value={editForm.tenantId}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, tenantId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+971 50 XXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                <Input
                  id="edit-whatsapp"
                  type="tel"
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+971 50 XXX XXXX"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label>Account Status</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editForm.isActive ? "User can sign in" : "User is blocked from signing in"}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={`cursor-pointer select-none ${
                  editForm.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
                onClick={() => setEditForm((f) => ({ ...f, isActive: !f.isActive }))}
              >
                {editForm.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isEditing}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing || !editForm.name.trim()}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════ RESET PASSWORD DIALOG ════════════════════ */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetUser?.name}</strong> ({resetUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pwd">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pwd"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The user will need to use this password to sign in.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting || newPassword.length < 8}>
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════ DELETE CONFIRMATION ════════════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteUser?.name}</strong> (
              {deleteUser?.email})? This will remove their authentication account and all associated
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════════════════ INVITE BY EMAIL DIALOG ════════════════════ */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Invite User by Email
            </DialogTitle>
            <DialogDescription>
              Send an invitation email. The user will receive a link to set their password and activate their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full Name *</Label>
                <Input
                  id="invite-name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="john@company.com"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    {isSuperAdmin && <SelectItem value="manager">Manager</SelectItem>}
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Company {inviteForm.role !== "super_admin" ? "*" : ""}</Label>
                <Select
                  value={inviteForm.tenantId}
                  onValueChange={(v) => setInviteForm((f) => ({ ...f, tenantId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                <Mail className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                The user will receive an email with an invitation link to set their password and access the platform.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={isInviting}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={isInviting || !inviteForm.name.trim() || !inviteForm.email.trim()}
            >
              {isInviting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
