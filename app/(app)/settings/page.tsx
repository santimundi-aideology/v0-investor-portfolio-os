"use client"

import * as React from "react"
import { useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { RoleRedirect } from "@/components/security/role-redirect"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Bell, Shield, Palette, Camera, Eye, EyeOff, Building2, Plus, Pencil, Trash2, CreditCard } from "lucide-react"
import { useApp } from "@/components/providers/app-provider"
import { PlanComparison } from "@/components/plans/plan-comparison"
import { UsageIndicator } from "@/components/plans/usage-indicator"
import { PlanBadge } from "@/components/plans/plan-badge"
import type { PlanTier } from "@/lib/plans/config"

export default function SettingsPage() {
  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/real-estate" />
      <SettingsPageInner />
    </>
  )
}

function SettingsPageInner() {
  const { user, currentOrg, platformRole, refreshTenants } = useApp()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "companies" ? "companies" : "general"
  const isSuperAdmin = platformRole === "super_admin"
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: "",
    company: "",
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [taskReminders, setTaskReminders] = useState(true)
  const [dealUpdates, setDealUpdates] = useState(true)

  // Preferences
  const [currency, setCurrency] = useState("aed")
  const [language, setLanguage] = useState("en")

  // Load settings on mount
  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings")
        if (res.ok) {
          const data = await res.json()
          if (data.profile) {
            setFormData({
              name: data.profile.name || user.name,
              email: data.profile.email || user.email,
              phone: data.profile.phone || "",
              company: data.profile.company || "",
            })
            if (data.profile.avatarUrl) {
              setAvatarPreview(data.profile.avatarUrl)
            }
          }
          if (data.notifications) {
            setEmailNotifications(data.notifications.emailNotifications ?? true)
            setTaskReminders(data.notifications.taskReminders ?? true)
            setDealUpdates(data.notifications.dealUpdates ?? true)
          }
          if (data.preferences) {
            setCurrency(data.preferences.currency || "aed")
            setLanguage(data.preferences.language || "en")
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Password dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handlePhotoChange = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Please select an image under 5MB.",
        })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
        setHasChanges(true)
        toast.success("Photo selected", {
          description: "Click 'Save Changes' to apply your new photo.",
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
            company: formData.company || undefined,
            avatarUrl: avatarPreview || undefined,
          },
          notifications: {
            emailNotifications,
            taskReminders,
            dealUpdates,
          },
          preferences: {
            currency,
            language,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save settings")
      }
      setIsSaving(false)
      setHasChanges(false)
      toast.success("Settings saved", {
        description: "Your profile and preferences have been updated.",
      })
    } catch (err) {
      setIsSaving(false)
      toast.error("Failed to save settings", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields required", {
        description: "Please fill in all password fields.",
      })
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "New password and confirmation must match.",
      })
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password too short", {
        description: "Password must be at least 8 characters.",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to change password")
      }
      setIsChangingPassword(false)
      setPasswordDialogOpen(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password changed", {
        description: "Your password has been updated successfully.",
      })
    } catch (err) {
      setIsChangingPassword(false)
      toast.error("Failed to change password", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  const handleNotificationChange = (setting: string, value: boolean) => {
    switch (setting) {
      case "email":
        setEmailNotifications(value)
        break
      case "tasks":
        setTaskReminders(value)
        break
      case "deals":
        setDealUpdates(value)
        break
    }
    toast.success("Notification preference updated")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and application preferences"
        primaryAction={
          hasChanges && (
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )
        }
      />

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-1.5 h-4 w-4" />
            Billing & Plan
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="companies">
              <Building2 className="mr-1.5 h-4 w-4" />
              Companies
            </TabsTrigger>
          )}
        </TabsList>

        {/* ===================== GENERAL TAB ===================== */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profile Section */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <CardTitle>Profile</CardTitle>
                </div>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={avatarPreview || user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePhotoChange}>
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+971 50 XXX XXXX"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="Your company name"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Role</span>
                  <span className="font-medium capitalize">{user.role}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plan</span>
                  <PlanBadge plan={currentOrg.plan as PlanTier} />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-gray-500" />
                  <CardTitle>Notifications</CardTitle>
                </div>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive email updates about your account</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={(value) => handleNotificationChange("email", value)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task Reminders</Label>
                    <p className="text-sm text-gray-500">Get reminded about upcoming due dates</p>
                  </div>
                  <Switch
                    checked={taskReminders}
                    onCheckedChange={(value) => handleNotificationChange("tasks", value)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Deal Updates</Label>
                    <p className="text-sm text-gray-500">Notifications when deals progress</p>
                  </div>
                  <Switch
                    checked={dealUpdates}
                    onCheckedChange={(value) => handleNotificationChange("deals", value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-gray-500" />
                  <CardTitle>Preferences</CardTitle>
                </div>
                <CardDescription>Application settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(value) => { setCurrency(value); setHasChanges(true); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aed">AED (Dirham)</SelectItem>
                      <SelectItem value="usd">USD (Dollar)</SelectItem>
                      <SelectItem value="eur">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={(value) => { setLanguage(value); setHasChanges(true); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-gray-500" />
                  <CardTitle>Security</CardTitle>
                </div>
                <CardDescription>Manage your security settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label>Password</Label>
                    <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                  </div>
                  <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== BILLING TAB ===================== */}
        <TabsContent value="billing" className="space-y-6">
          <BillingSection currentPlan={currentOrg.plan as PlanTier} />
        </TabsContent>

        {/* ===================== COMPANIES TAB (super_admin only) ===================== */}
        {isSuperAdmin && (
          <TabsContent value="companies">
            <CompaniesSection onTenantsChanged={refreshTenants} />
          </TabsContent>
        )}
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password to update your credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)} disabled={isChangingPassword}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===========================================================================
// Billing Section - Plan & Usage
// ===========================================================================

interface UsageData {
  plan: PlanTier
  planConfig: {
    displayName: string
    description: string
    limits: {
      maxProperties: number
      maxInvestors: number
      maxUsers: number
      maxMemos: number
      maxAIEvaluations: number
    }
  }
  usage: {
    properties: number
    investors: number
    users: number
    memosThisMonth: number
    aiEvaluationsThisMonth: number
  }
  limits: {
    maxProperties: number
    maxInvestors: number
    maxUsers: number
    maxMemos: number
    maxAIEvaluations: number
  }
  warnings: string[]
  approaching: string[]
  needsAttention: boolean
}

function BillingSection({ currentPlan }: { currentPlan: PlanTier }) {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)

  React.useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetch("/api/plans/usage")
        if (res.ok) {
          const data = await res.json()
          setUsageData(data)
        }
      } catch (err) {
        console.error("Failed to load usage:", err)
      } finally {
        setIsLoadingUsage(false)
      }
    }
    loadUsage()
  }, [])

  const handleUpgrade = () => {
    setUpgradeDialogOpen(true)
  }

  const handleSelectPlan = async (plan: PlanTier) => {
    toast.success("Plan selection", {
      description: `You selected ${plan}. Contact sales@yourdomain.com to complete the upgrade.`,
    })
    setUpgradeDialogOpen(false)
  }

  const isUnlimited = (limit: number) => limit === -1

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <CardTitle>Current Plan</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Your subscription and usage overview
              </CardDescription>
            </div>
            {currentPlan !== "enterprise" && (
              <Button onClick={handleUpgrade}>
                Upgrade Plan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingUsage ? (
            <div className="text-sm text-muted-foreground">Loading usage data...</div>
          ) : usageData ? (
            <>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-2xl font-bold">{usageData.planConfig.displayName}</div>
                  <p className="text-sm text-muted-foreground">{usageData.planConfig.description}</p>
                </div>
                <PlanBadge plan={currentPlan} />
              </div>

              {/* Warnings */}
              {usageData.needsAttention && (
                <div className="space-y-2">
                  {usageData.warnings.map((warning, idx) => (
                    <Alert key={idx} variant="destructive">
                      <AlertDescription>{warning}</AlertDescription>
                    </Alert>
                  ))}
                  {usageData.approaching.map((approaching, idx) => (
                    <Alert key={idx}>
                      <AlertDescription>{approaching}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Usage Indicators */}
              <div className="space-y-4 pt-4">
                <h4 className="text-sm font-semibold">Usage This Month</h4>
                <UsageIndicator
                  label="Properties"
                  current={usageData.usage.properties}
                  limit={usageData.limits.maxProperties}
                  isUnlimited={isUnlimited(usageData.limits.maxProperties)}
                  showUpgrade={!isUnlimited(usageData.limits.maxProperties)}
                  onUpgrade={handleUpgrade}
                />
                <UsageIndicator
                  label="Investors"
                  current={usageData.usage.investors}
                  limit={usageData.limits.maxInvestors}
                  isUnlimited={isUnlimited(usageData.limits.maxInvestors)}
                  showUpgrade={!isUnlimited(usageData.limits.maxInvestors)}
                  onUpgrade={handleUpgrade}
                />
                <UsageIndicator
                  label="Team Members"
                  current={usageData.usage.users}
                  limit={usageData.limits.maxUsers}
                  isUnlimited={isUnlimited(usageData.limits.maxUsers)}
                  showUpgrade={!isUnlimited(usageData.limits.maxUsers)}
                  onUpgrade={handleUpgrade}
                />
                <UsageIndicator
                  label="IC Memos"
                  current={usageData.usage.memosThisMonth}
                  limit={usageData.limits.maxMemos}
                  isUnlimited={isUnlimited(usageData.limits.maxMemos)}
                  showUpgrade={!isUnlimited(usageData.limits.maxMemos)}
                  onUpgrade={handleUpgrade}
                />
                <UsageIndicator
                  label="AI Evaluations"
                  current={usageData.usage.aiEvaluationsThisMonth}
                  limit={usageData.limits.maxAIEvaluations}
                  isUnlimited={isUnlimited(usageData.limits.maxAIEvaluations)}
                  showUpgrade={!isUnlimited(usageData.limits.maxAIEvaluations)}
                  onUpgrade={handleUpgrade}
                />
              </div>
            </>
          ) : (
            <div className="text-sm text-red-600">Failed to load usage data</div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanComparison
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlan}
            showCurrentBadge
          />
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Select a plan that better fits your needs
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <PlanComparison
              currentPlan={currentPlan}
              onSelectPlan={handleSelectPlan}
              showCurrentBadge
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===========================================================================
// Companies / Tenant management section (super_admin only)
// ===========================================================================

type TenantRow = {
  id: string
  name: string
  plan: string
  created_at: string
  userCount?: number
}

function CompaniesSection({ onTenantsChanged }: { onTenantsChanged: () => void }) {
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [isLoadingTenants, setIsLoadingTenants] = useState(true)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createPlan, setCreatePlan] = useState("starter")
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null)
  const [editName, setEditName] = useState("")
  const [editPlan, setEditPlan] = useState("starter")
  const [isEditing, setIsEditing] = useState(false)

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTenant, setDeleteTenant] = useState<TenantRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTenants = React.useCallback(async () => {
    setIsLoadingTenants(true)
    try {
      const res = await fetch("/api/tenants")
      if (res.ok) {
        const data = await res.json()
        setTenants(data.tenants ?? [])
      }
    } catch (err) {
      console.error("Failed to load tenants:", err)
    } finally {
      setIsLoadingTenants(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  // ---- Create ----
  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error("Name is required")
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), plan: createPlan }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create company")
      }
      toast.success("Company created")
      setCreateOpen(false)
      setCreateName("")
      setCreatePlan("starter")
      fetchTenants()
      onTenantsChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create company")
    } finally {
      setIsCreating(false)
    }
  }

  // ---- Edit ----
  const openEdit = (t: TenantRow) => {
    setEditTenant(t)
    setEditName(t.name)
    setEditPlan(t.plan)
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editTenant || !editName.trim()) return
    setIsEditing(true)
    try {
      const res = await fetch(`/api/tenants/${editTenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), plan: editPlan }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update company")
      }
      toast.success("Company updated")
      setEditOpen(false)
      fetchTenants()
      onTenantsChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update company")
    } finally {
      setIsEditing(false)
    }
  }

  // ---- Delete ----
  const openDelete = (t: TenantRow) => {
    setDeleteTenant(t)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTenant) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/tenants/${deleteTenant.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete company")
      }
      toast.success("Company deleted")
      setDeleteOpen(false)
      setDeleteTenant(null)
      fetchTenants()
      onTenantsChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete company")
    } finally {
      setIsDeleting(false)
    }
  }

  const planBadgeColor = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "bg-purple-100 text-purple-800"
      case "pro":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-500" />
                <CardTitle>Companies</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Manage tenant organizations. Each company has its own investors, properties, and memos.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Company
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTenants ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">Loading companies...</div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No companies yet. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px]">
                            {t.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{t.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={planBadgeColor(t.plan)}>
                        {t.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-600">
                      {t.userCount ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit company">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(t)} title="Delete company" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ---- Create Company Dialog ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Company</DialogTitle>
            <DialogDescription>
              Add a new tenant organization. Data is isolated per company.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-tenant-name">Company Name</Label>
              <Input
                id="new-tenant-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Acme Real Estate Group"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={createPlan} onValueChange={setCreatePlan}>
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
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating || !createName.trim()}>
              {isCreating ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Edit Company Dialog ---- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update the company name or plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tenant-name">Company Name</Label>
              <Input
                id="edit-tenant-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
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
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isEditing}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isEditing || !editName.trim()}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Company Confirmation ---- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTenant?.name}</strong>? This will permanently remove
              all associated data including investors, properties, memos, and deal rooms.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
