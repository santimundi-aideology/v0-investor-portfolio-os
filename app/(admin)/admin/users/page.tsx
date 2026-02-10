"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Search,
  MoreHorizontal,
  Pencil,
  ToggleLeft,
  UserPlus,
  RefreshCw,
  Mail,
  Clock,
  Trash2,
} from "lucide-react"
import {
  type Tenant,
  type UserRow,
  USER_ROLES,
  roleBadgeVariant,
  inviteStatusBadgeVariant,
  inviteStatusLabel,
  formatDate,
  initials,
  typeLabel,
} from "@/lib/admin/types"

export default function AdminUsersPage() {
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

  return <UsersInner />
}

function UsersInner() {
  const searchParams = useSearchParams()

  // Users state
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState(searchParams.get("search") ?? "")
  const [userRoleFilter, setUserRoleFilter] = useState("all")
  const [userStatusFilter, setUserStatusFilter] = useState("all")
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "agent", tenantId: "" })
  const [inviteSaving, setInviteSaving] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [userEditForm, setUserEditForm] = useState({ name: "", email: "", role: "agent", tenantId: "", phone: "", whatsapp: "", isActive: true })
  const [userEditSaving, setUserEditSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Tenants (for org assignment dropdowns)
  const [tenants, setTenants] = useState<Tenant[]>([])

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

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch("/api/tenants")
      if (!res.ok) throw new Error("Failed to fetch tenants")
      const data = await res.json()
      setTenants(data.tenants ?? [])
    } catch {
      // Silent fail for tenants
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchTenants()
  }, [fetchUsers, fetchTenants])

  // Sync search param from URL (e.g. navigating from organizations "View Users" action)
  useEffect(() => {
    const searchFromUrl = searchParams.get("search")
    if (searchFromUrl) {
      setUserSearch(searchFromUrl)
    }
  }, [searchParams])

  const openInviteUser = useCallback(() => {
    setInviteForm({ email: "", name: "", role: "agent", tenantId: "" })
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
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to send invitation")
      }
      toast.success(`Invitation sent to ${inviteForm.email}`)
      setInviteDialogOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invitation failed")
    } finally {
      setInviteSaving(false)
    }
  }, [inviteForm, fetchUsers])

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setUserEditSaving(false)
    }
  }, [editingUser, userEditForm, fetchUsers])

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
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Toggle failed")
      }
    },
    [fetchUsers],
  )

  const resendInvite = useCallback(
    async (user: UserRow) => {
      try {
        const res = await fetch(`/api/admin/users/${user.id}/resend-invite`, {
          method: "POST",
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to resend invitation")
        }
        toast.success(`Invitation resent to ${user.email}`)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Resend failed")
      }
    },
    [],
  )

  const confirmDeleteUser = useCallback((user: UserRow) => {
    setDeletingUser(user)
    setDeleteDialogOpen(true)
  }, [])

  const deleteUser = useCallback(async () => {
    if (!deletingUser) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete user")
      }
      toast.success(`User "${deletingUser.name}" deleted`)
      setDeleteDialogOpen(false)
      setDeletingUser(null)
      fetchUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleteLoading(false)
    }
  }, [deletingUser, fetchUsers])

  const filteredUsers = users.filter((u) => {
    if (userSearch) {
      const q = userSearch.toLowerCase()
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false
    if (userStatusFilter === "active" && u.invite_status !== "active") return false
    if (userStatusFilter === "inactive" && u.invite_status !== "inactive") return false
    if (userStatusFilter === "pending_invite" && u.invite_status !== "pending_invite") return false
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage platform users and invitations"
      />

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
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending_invite">Pending Invite</SelectItem>
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{u.name || "-"}</span>
                            {u.is_demo && (
                              <Badge variant="outline" className="bg-violet-50 text-violet-600 border-violet-200 text-[10px] px-1.5 py-0">
                                Demo
                              </Badge>
                            )}
                          </div>
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
                          className={inviteStatusBadgeVariant(u.invite_status)}
                        >
                          {u.invite_status === "pending_invite" && (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {inviteStatusLabel(u.invite_status)}
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
                            {u.invite_status === "pending_invite" && (
                              <DropdownMenuItem onClick={() => resendInvite(u)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => toggleUserActive(u)}>
                              <ToggleLeft className="h-4 w-4 mr-2" />
                              {u.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => confirmDeleteUser(u)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
                  User&apos;s primary organization.
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{deletingUser?.name}</span> ({deletingUser?.email}) and remove their authentication account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete user"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

            <div className="grid gap-4 sm:grid-cols-2">
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
              {" "}<span className="font-medium text-foreground">Investor</span> for client accounts.
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
    </div>
  )
}
