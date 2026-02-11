"use client"

import * as React from "react"
import Link from "next/link"
import {
  Building2,
  Calendar,
  ChevronRight,
  DollarSign,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  Target,
  TrendingUp,
  User,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import { Loader2 } from "lucide-react"
import type { Investor } from "@/lib/types"

type PortfolioSummary = {
  propertyCount: number
  totalValue: number
  totalCost: number
  appreciationPct: number
  totalMonthlyIncome: number
  netAnnualIncome: number
  avgYieldPct: number
  avgOccupancy: number
}

function InvestorDescription({
  value,
  onChange,
  onSave,
  isSaving,
  investorDescription,
}: {
  value: string
  onChange: (val: string) => void
  onSave: () => void
  isSaving: boolean
  investorDescription?: string
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const hasContent = !!investorDescription?.trim()
  const isDirty = value !== (investorDescription ?? "")

  if (!isEditing && !hasContent) {
    return (
      <div className="text-center py-6">
        <User className="size-10 mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-3">
          Tell us about yourself and your investment goals
        </p>
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          <Edit2 className="size-4 mr-2" />
          Add Description
        </Button>
      </div>
    )
  }

  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-gray-50/50 p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {investorDescription}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="size-3 mr-2" />
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Example: I'm a family office investor based in Dubai, focused on high-yield residential properties in prime locations. I prefer ready-to-move properties with stable rental demand, targeting 7%+ net yield. I'm interested in 2-3 bedroom apartments in areas like Dubai Marina, Downtown, and JBR. My investment horizon is 5-7 years, and I prioritize capital preservation with moderate growth..."
        className="min-h-[160px] text-sm resize-none"
        rows={7}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            onSave()
            setIsEditing(false)
          }}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-3 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-3 mr-2" />
              Save
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(investorDescription ?? "")
            setIsEditing(false)
          }}
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-gray-400">
        This description is used by the AI advisor to give you more relevant property recommendations and insights.
      </p>
    </div>
  )
}

export default function InvestorProfilePage() {
  const { scopedInvestorId } = useApp()
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Fetch investor data from API
  const { data: investor, isLoading: investorLoading, mutate: mutateInvestor } = useAPI<Investor>(
    scopedInvestorId ? `/api/investors/${scopedInvestorId}` : null
  )

  // Fetch portfolio summary from API
  const { data: portfolioData, isLoading: portfolioLoading } = useAPI<{ summary: PortfolioSummary }>(
    scopedInvestorId ? `/api/portfolio/${scopedInvestorId}` : null
  )
  const summary = React.useMemo(() => portfolioData?.summary ?? {
    propertyCount: 0,
    totalValue: 0,
    totalCost: 0,
    appreciationPct: 0,
    totalMonthlyIncome: 0,
    netAnnualIncome: 0,
    avgYieldPct: 0,
    avgOccupancy: 0,
  }, [portfolioData])

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    description: "",
    preferredContactMethod: "email" as "email" | "phone" | "whatsapp",
  })

  // Update form data when investor loads
  React.useEffect(() => {
    if (investor) {
      setFormData({
        name: investor.name ?? "",
        email: investor.email ?? "",
        phone: investor.phone ?? "",
        company: investor.company ?? "",
        description: investor.description ?? "",
        preferredContactMethod: investor.preferredContactMethod ?? "email",
      })
    }
  }, [investor])

  const handleSave = async () => {
    if (!scopedInvestorId) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/investors/${scopedInvestorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          description: formData.description,
          preferredContactMethod: formData.preferredContactMethod,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save profile")
      }
      // Refresh investor data from API
      mutateInvestor()
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to save profile:", err)
      // TODO: Show error toast
    } finally {
      setIsSaving(false)
    }
  }

  if (investorLoading || portfolioLoading || !scopedInvestorId || !investor) {
    // Still resolving auth / investor context, or loading data
    if (!investor && scopedInvestorId && !investorLoading) {
      // We have an ID, finished loading, but nothing came back → truly not found
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">Investor not found</p>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  const mandate = investor.mandate

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* ── Profile Hero Card ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        {/* Decorative gradient banner */}
        <div className="h-24 bg-gradient-to-r from-primary/80 via-primary/60 to-emerald-500/50" />

        <div className="relative px-6 pb-6">
          {/* Avatar overlapping the banner */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white text-primary text-2xl font-bold ring-4 ring-white shadow-sm">
              {investor.name.charAt(0)}
            </div>
            <div className="flex-1 pt-2 sm:pt-0 sm:pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{investor.name}</h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    investor.status === "active"
                      ? "border-green-500/30 bg-green-500/10 text-green-700"
                      : ""
                  )}
                >
                  {investor.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{investor.company}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AskAIBankerWidget
                agentId="portfolio_advisor"
                title="Profile Advisor"
                description="Get help with your profile and mandate"
                suggestedQuestions={[
                  "Is my mandate well-defined?",
                  "What areas should I consider?",
                  "How does my portfolio align with my goals?",
                ]}
                pagePath="/investor/profile"
                scopedInvestorId={scopedInvestorId}
                variant="inline"
              />
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="size-3.5 mr-1.5" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit2 className="size-3.5 mr-1.5" />
                    Edit Profile
                  </>
                )}
              </Button>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    if (investor) {
                      setFormData({
                        name: investor.name ?? "",
                        email: investor.email ?? "",
                        phone: investor.phone ?? "",
                        company: investor.company ?? "",
                        description: investor.description ?? "",
                        preferredContactMethod: investor.preferredContactMethod ?? "email",
                      })
                    }
                  }}
                >
                  <X className="size-3.5 mr-1.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Contact details / edit form */}
          <div className="mt-6">
            {isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-xs">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact" className="text-xs">Preferred Contact</Label>
                  <Select
                    value={formData.preferredContactMethod}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        preferredContactMethod: v as "email" | "phone" | "whatsapp",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Mail className="size-3.5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{investor.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Phone className="size-3.5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium truncate">{investor.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Building2 className="size-3.5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Company</p>
                    <p className="text-sm font-medium truncate">{investor.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Calendar className="size-3.5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Member Since</p>
                    <p className="text-sm font-medium">
                      {new Date(investor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Portfolio Summary (compact KPI strip) ─────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.propertyCount}</p>
            <p className="text-[11px] text-muted-foreground">Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatAED(summary.totalValue)}</p>
            <p className="text-[11px] text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.avgYieldPct.toFixed(1)}%</p>
            <p className="text-[11px] text-muted-foreground">Avg Yield</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">+{summary.appreciationPct.toFixed(1)}%</p>
            <p className="text-[11px] text-muted-foreground">Appreciation</p>
          </CardContent>
        </Card>
      </div>

      {/* ── About Me & Investment Goals ───────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4 text-primary" />
              About Me & Investment Goals
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Describe yourself and what you&apos;re looking for. This helps your AI advisor give you better, more personalized recommendations.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <InvestorDescription
            value={formData.description}
            onChange={(val) => setFormData({ ...formData, description: val })}
            onSave={handleSave}
            isSaving={isSaving}
            investorDescription={investor?.description}
          />
        </CardContent>
      </Card>

      {/* ── Investment Mandate ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" />
              Investment Mandate
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/investor/preferences">Edit Preferences</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mandate ? (
            <div className="space-y-5">
              {/* Strategy & Horizon */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Strategy
                  </p>
                  <p className="mt-1 font-semibold">{mandate.strategy}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Investment Horizon
                  </p>
                  <p className="mt-1 font-semibold">{mandate.investmentHorizon}</p>
                </div>
              </div>

              {/* Budget */}
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="size-4 text-green-600" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Investment Budget
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {formatAED(mandate.minInvestment)}
                  </span>
                  <span className="text-muted-foreground">to</span>
                  <span className="text-2xl font-bold">
                    {formatAED(mandate.maxInvestment)}
                  </span>
                </div>
              </div>

              {/* Targets */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="size-4 text-primary" />
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Yield Target
                    </p>
                  </div>
                  <p className="text-xl font-bold">{mandate.yieldTarget}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Risk Tolerance
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      mandate.riskTolerance === "low"
                        ? "border-green-500/30 bg-green-500/10 text-green-700"
                        : mandate.riskTolerance === "medium"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-700"
                    )}
                  >
                    {mandate.riskTolerance.charAt(0).toUpperCase() +
                      mandate.riskTolerance.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Preferred Areas & Property Types side by side */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="size-3.5 text-primary" />
                    <p className="text-xs font-medium">Preferred Areas</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mandate.preferredAreas.map((area) => (
                      <Badge key={area} variant="outline" className="text-[11px]">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="size-3.5 text-primary" />
                    <p className="text-xs font-medium">Property Types</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mandate.propertyTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="text-[11px]">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {mandate.notes && (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Additional Notes
                  </p>
                  <p className="text-sm text-gray-700">{mandate.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="size-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No mandate defined yet</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/investor/preferences">Set Up Mandate</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quick Links ───────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="group hover:shadow-sm transition-shadow">
          <CardContent className="p-0">
            <Link
              href="/investor/portfolio"
              className="flex items-center gap-3 p-4 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">View Full Portfolio</p>
                <p className="text-xs text-muted-foreground">
                  Holdings, analytics & performance
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-sm transition-shadow">
          <CardContent className="p-0">
            <Link
              href="/investor/settings"
              className="flex items-center gap-3 p-4 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Settings className="size-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Settings</p>
                <p className="text-xs text-muted-foreground">
                  Notifications, display & security
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
