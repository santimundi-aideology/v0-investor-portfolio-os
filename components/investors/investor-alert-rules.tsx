"use client"

import * as React from "react"
import {
  AlertCircle,
  Bell,
  BellOff,
  ChevronDown,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Dubai areas for autocomplete
const DUBAI_AREAS = [
  "Palm Jumeirah", "Downtown Dubai", "Dubai Marina", "DIFC", "Business Bay",
  "Dubai Hills", "JBR", "JVC", "JLT", "Arabian Ranches", "Motor City",
  "Sports City", "Dubai Silicon Oasis", "International City", "Dubai South",
  "Al Barsha", "Mirdif", "Emirates Hills", "City Walk", "Sheikh Zayed Road",
  "Jumeirah Lake Towers", "Jumeirah Village Circle",
]

const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Penthouse", "Studio", "Land"]

interface AlertRule {
  id: string
  name: string
  description: string | null
  enabled: boolean
  areas: string[]
  property_types: string[]
  min_price: number | null
  max_price: number | null
  min_size: number | null
  max_size: number | null
  min_bedrooms: number | null
  max_bedrooms: number | null
  min_yield_pct: number | null
  min_discount_pct: number | null
  price_change_pct: number | null
  price_change_direction: string | null
  min_transaction_volume: number | null
  notify_whatsapp: boolean
  notify_email: boolean
  notify_in_app: boolean
  frequency: string
  last_triggered_at: string | null
  trigger_count: number
  created_at: string
}

interface InvestorAlertRulesProps {
  investorId: string
  investorName: string
}

function AlertRuleForm({
  rule,
  onSave,
  onCancel,
  saving,
}: {
  rule?: AlertRule
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = React.useState(rule?.name || "")
  const [description, setDescription] = React.useState(rule?.description || "")
  const [areas, setAreas] = React.useState<string[]>(rule?.areas || [])
  const [propertyTypes, setPropertyTypes] = React.useState<string[]>(rule?.property_types || [])
  const [minPrice, setMinPrice] = React.useState(rule?.min_price?.toString() || "")
  const [maxPrice, setMaxPrice] = React.useState(rule?.max_price?.toString() || "")
  const [minBedrooms, setMinBedrooms] = React.useState(rule?.min_bedrooms?.toString() || "")
  const [maxBedrooms, setMaxBedrooms] = React.useState(rule?.max_bedrooms?.toString() || "")
  const [minYield, setMinYield] = React.useState(rule?.min_yield_pct?.toString() || "")
  const [minDiscount, setMinDiscount] = React.useState(rule?.min_discount_pct?.toString() || "")
  const [priceChange, setPriceChange] = React.useState(rule?.price_change_pct?.toString() || "")
  const [priceChangeDir, setPriceChangeDir] = React.useState(rule?.price_change_direction || "both")
  const [notifyEmail, setNotifyEmail] = React.useState(rule?.notify_email !== false)
  const [notifyWhatsapp, setNotifyWhatsapp] = React.useState(rule?.notify_whatsapp || false)
  const [notifyInApp, setNotifyInApp] = React.useState(rule?.notify_in_app !== false)
  const [frequency, setFrequency] = React.useState(rule?.frequency || "daily")

  const handleSubmit = () => {
    if (!name.trim()) return
    onSave({
      ruleId: rule?.id,
      name: name.trim(),
      description: description.trim() || null,
      areas,
      propertyTypes,
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      minBedrooms: minBedrooms ? Number(minBedrooms) : null,
      maxBedrooms: maxBedrooms ? Number(maxBedrooms) : null,
      minYieldPct: minYield ? Number(minYield) : null,
      minDiscountPct: minDiscount ? Number(minDiscount) : null,
      priceChangePct: priceChange ? Number(priceChange) : null,
      priceChangeDirection: priceChange ? priceChangeDir : null,
      notifyEmail,
      notifyWhatsapp,
      notifyInApp,
      frequency,
    })
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">{rule ? "Edit Alert Rule" : "New Alert Rule"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Name & Description */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="alert-name">Rule Name</Label>
            <Input id="alert-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Dubai Marina Deals" />
          </div>
          <div>
            <Label htmlFor="alert-desc">Description (optional)</Label>
            <Textarea id="alert-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When to alert..." rows={2} />
          </div>
        </div>

        <Separator />

        {/* Location Filters */}
        <div>
          <Label className="text-sm font-medium">Areas</Label>
          <p className="text-xs text-muted-foreground mb-2">Select areas to monitor</p>
          <div className="flex flex-wrap gap-1.5">
            {DUBAI_AREAS.map((area) => (
              <Badge
                key={area}
                variant={areas.includes(area) ? "default" : "outline"}
                className={cn("cursor-pointer text-xs", areas.includes(area) && "bg-primary")}
                onClick={() => {
                  setAreas((prev) =>
                    prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
                  )
                }}
              >
                {area}
              </Badge>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <Label className="text-sm font-medium">Property Types</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PROPERTY_TYPES.map((type) => (
              <Badge
                key={type}
                variant={propertyTypes.includes(type) ? "default" : "outline"}
                className={cn("cursor-pointer text-xs", propertyTypes.includes(type) && "bg-primary")}
                onClick={() => {
                  setPropertyTypes((prev) =>
                    prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                  )
                }}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price & Size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="min-price">Min Price (AED)</Label>
            <Input id="min-price" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="500,000" />
          </div>
          <div>
            <Label htmlFor="max-price">Max Price (AED)</Label>
            <Input id="max-price" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="5,000,000" />
          </div>
          <div>
            <Label htmlFor="min-bed">Min Bedrooms</Label>
            <Input id="min-bed" type="number" value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)} placeholder="1" />
          </div>
          <div>
            <Label htmlFor="max-bed">Max Bedrooms</Label>
            <Input id="max-bed" type="number" value={maxBedrooms} onChange={(e) => setMaxBedrooms(e.target.value)} placeholder="3" />
          </div>
        </div>

        <Separator />

        {/* Signal Triggers */}
        <div>
          <Label className="text-sm font-medium">Signal Triggers</Label>
          <p className="text-xs text-muted-foreground mb-2">Alert when these conditions are met</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="min-yield" className="text-xs">Min Yield (%)</Label>
              <Input id="min-yield" type="number" step="0.1" value={minYield} onChange={(e) => setMinYield(e.target.value)} placeholder="6.5" />
            </div>
            <div>
              <Label htmlFor="min-discount" className="text-xs">Min Discount vs DLD (%)</Label>
              <Input id="min-discount" type="number" step="0.1" value={minDiscount} onChange={(e) => setMinDiscount(e.target.value)} placeholder="10" />
            </div>
            <div>
              <Label htmlFor="price-change" className="text-xs">Price Change Alert (%)</Label>
              <Input id="price-change" type="number" step="0.1" value={priceChange} onChange={(e) => setPriceChange(e.target.value)} placeholder="5" />
            </div>
            <div>
              <Label htmlFor="price-dir" className="text-xs">Direction</Label>
              <Select value={priceChangeDir} onValueChange={setPriceChangeDir}>
                <SelectTrigger id="price-dir">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="up">Up Only</SelectItem>
                  <SelectItem value="down">Down Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notification Preferences */}
        <div>
          <Label className="text-sm font-medium">Notifications</Label>
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-muted-foreground" />
                <span className="text-sm">In-App</span>
              </div>
              <Switch checked={notifyInApp} onCheckedChange={setNotifyInApp} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <span className="text-sm">Email</span>
              </div>
              <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                <span className="text-sm">WhatsApp</span>
              </div>
              <Switch checked={notifyWhatsapp} onCheckedChange={setNotifyWhatsapp} />
            </div>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <Label htmlFor="frequency">Alert Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-time</SelectItem>
              <SelectItem value="daily">Daily Digest</SelectItem>
              <SelectItem value="weekly">Weekly Summary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {rule ? "Update Rule" : "Create Rule"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function InvestorAlertRules({ investorId, investorName }: InvestorAlertRulesProps) {
  const [rules, setRules] = React.useState<AlertRule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [showForm, setShowForm] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<AlertRule | undefined>()

  React.useEffect(() => {
    fetchRules()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investorId])

  async function fetchRules() {
    try {
      setLoading(true)
      const res = await fetch(`/api/investors/${investorId}/alerts`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setRules(data.rules || [])
    } catch {
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(data: Record<string, unknown>) {
    setSaving(true)
    try {
      const isEdit = !!data.ruleId
      const res = await fetch(`/api/investors/${investorId}/alerts`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to save")
      setShowForm(false)
      setEditingRule(undefined)
      await fetchRules()
    } catch (err) {
      console.error("Failed to save rule:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(rule: AlertRule) {
    try {
      await fetch(`/api/investors/${investorId}/alerts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id, enabled: !rule.enabled }),
      })
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
      )
    } catch (err) {
      console.error("Failed to toggle rule:", err)
    }
  }

  async function handleDelete(ruleId: string) {
    try {
      await fetch(`/api/investors/${investorId}/alerts?ruleId=${ruleId}`, { method: "DELETE" })
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
    } catch (err) {
      console.error("Failed to delete rule:", err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Market Alert Rules</h3>
          <p className="text-xs text-muted-foreground">
            Custom alerts for {investorName}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setShowForm(true); setEditingRule(undefined) }}
          disabled={showForm}
        >
          <Plus className="mr-1 size-3.5" />
          Add Rule
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <AlertRuleForm
          rule={editingRule}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingRule(undefined) }}
          saving={saving}
        />
      )}

      {/* Rules List */}
      {rules.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BellOff className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No alert rules configured</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-1 size-3.5" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} className={cn(!rule.enabled && "opacity-60")}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium truncate">{rule.name}</h4>
                      <Badge variant="outline" className={cn("text-[10px]",
                        rule.enabled ? "border-emerald-200 text-emerald-600" : "border-gray-200 text-gray-400"
                      )}>
                        {rule.enabled ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rule.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(rule.areas as string[]).slice(0, 3).map((area) => (
                        <Badge key={area} variant="secondary" className="text-[10px]">{area}</Badge>
                      ))}
                      {(rule.areas as string[]).length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">+{(rule.areas as string[]).length - 3}</Badge>
                      )}
                      {rule.min_yield_pct && (
                        <Badge variant="outline" className="text-[10px]">Yield &gt;{rule.min_yield_pct}%</Badge>
                      )}
                      {rule.min_discount_pct && (
                        <Badge variant="outline" className="text-[10px]">Discount &gt;{rule.min_discount_pct}%</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>{rule.frequency}</span>
                      {rule.trigger_count > 0 && <span>Triggered {rule.trigger_count}x</span>}
                      <span className="flex items-center gap-0.5">
                        {rule.notify_in_app && <Bell className="size-2.5" />}
                        {rule.notify_email && <Mail className="size-2.5" />}
                        {rule.notify_whatsapp && <MessageSquare className="size-2.5" />}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => handleToggle(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => { setEditingRule(rule); setShowForm(true) }}
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
