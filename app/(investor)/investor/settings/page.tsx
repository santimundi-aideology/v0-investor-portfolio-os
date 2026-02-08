"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Bell,
  Eye,
  Globe,
  Lock,
  Moon,
  Palette,
  Save,
  Shield,
  Smartphone,
  Sun,
  Loader2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAPI } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"

type SettingsResponse = {
  profile: { name: string; email: string; phone: string; company: string; avatarUrl: string | null }
  notifications: { emailNotifications: boolean; taskReminders: boolean; dealUpdates: boolean }
  preferences: { currency: string; language: string }
}

export default function InvestorSettingsPage() {
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Fetch existing settings from API
  const { data: serverSettings, isLoading: settingsLoading } = useAPI<SettingsResponse>("/api/settings")

  // Settings state
  const [settings, setSettings] = React.useState({
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    memoAlerts: true,
    marketSignalAlerts: true,
    dealRoomUpdates: true,
    weeklyDigest: true,
    // Display
    theme: "system",
    language: "en",
    timezone: "Asia/Dubai",
    currency: "AED",
    // Privacy
    showPortfolioValue: true,
    allowDataSharing: false,
    twoFactorEnabled: false,
  })

  // Populate settings from server data when loaded
  React.useEffect(() => {
    if (serverSettings) {
      setSettings((prev) => ({
        ...prev,
        emailNotifications: serverSettings.notifications?.emailNotifications ?? prev.emailNotifications,
        dealRoomUpdates: serverSettings.notifications?.dealUpdates ?? prev.dealRoomUpdates,
        language: serverSettings.preferences?.language ?? prev.language,
        currency: serverSettings.preferences?.currency?.toUpperCase() ?? prev.currency,
      }))
    }
  }, [serverSettings])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: {
            emailNotifications: settings.emailNotifications,
            taskReminders: settings.memoAlerts,
            dealUpdates: settings.dealRoomUpdates,
          },
          preferences: {
            currency: settings.currency.toLowerCase(),
            language: settings.language,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save settings")
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <p className="text-sm text-gray-500">
                Manage your preferences and account settings
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saveError && (
                <span className="text-sm text-destructive">{saveError}</span>
              )}
              <Button onClick={handleSave} disabled={isSaving || settingsLoading}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <span className="text-green-500 mr-2">&#10003;</span>
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose how you want to receive updates and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Channels */}
              <div>
                <h4 className="text-sm font-medium mb-4">Notification Channels</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-gray-500">
                        Receive updates via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(v) => updateSetting("emailNotifications", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-xs text-gray-500">
                        Browser push notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(v) => updateSetting("pushNotifications", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-xs text-gray-500">
                        Important alerts via SMS
                      </p>
                    </div>
                    <Switch
                      checked={settings.smsNotifications}
                      onCheckedChange={(v) => updateSetting("smsNotifications", v)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Alert Types */}
              <div>
                <h4 className="text-sm font-medium mb-4">Alert Types</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Investment Memo Alerts</Label>
                      <p className="text-xs text-gray-500">
                        New memos requiring your review
                      </p>
                    </div>
                    <Switch
                      checked={settings.memoAlerts}
                      onCheckedChange={(v) => updateSetting("memoAlerts", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Market Signal Alerts</Label>
                      <p className="text-xs text-gray-500">
                        Signals matching your mandate
                      </p>
                    </div>
                    <Switch
                      checked={settings.marketSignalAlerts}
                      onCheckedChange={(v) => updateSetting("marketSignalAlerts", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Deal Room Updates</Label>
                      <p className="text-xs text-gray-500">
                        Activity in your deal rooms
                      </p>
                    </div>
                    <Switch
                      checked={settings.dealRoomUpdates}
                      onCheckedChange={(v) => updateSetting("dealRoomUpdates", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Digest</Label>
                      <p className="text-xs text-gray-500">
                        Weekly summary of portfolio and market
                      </p>
                    </div>
                    <Switch
                      checked={settings.weeklyDigest}
                      onCheckedChange={(v) => updateSetting("weeklyDigest", v)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-5 text-primary" />
                Display
              </CardTitle>
              <CardDescription>
                Customize how the application looks and behaves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(v) => updateSetting("theme", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="size-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="size-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Smartphone className="size-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(v) => updateSetting("language", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) => updateSetting("timezone", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Dubai">Dubai (GMT+4)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                      <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore (GMT+8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(v) => updateSetting("currency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED (د.إ)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Control your privacy and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label>Show Portfolio Value</Label>
                      <Eye className="size-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Display portfolio values in reports
                    </p>
                  </div>
                  <Switch
                    checked={settings.showPortfolioValue}
                    onCheckedChange={(v) => updateSetting("showPortfolioValue", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label>Allow Data Sharing</Label>
                      <Globe className="size-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Share anonymized data for market insights
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowDataSharing}
                    onCheckedChange={(v) => updateSetting("allowDataSharing", v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label>Two-Factor Authentication</Label>
                      <Lock className="size-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Add an extra layer of security
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {settings.twoFactorEnabled ? (
                      <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-700">
                        Enabled
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm">
                        Enable
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="size-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">Security Tip</p>
                      <p className="text-sm text-amber-800 mt-1">
                        Enable two-factor authentication for enhanced account security.
                        Your investment data is sensitive.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-rose-200">
            <CardHeader>
              <CardTitle className="text-rose-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-gray-500">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
