"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, UserPlus } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RoleRedirect } from "@/components/security/role-redirect"

type InvestorForm = {
  name: string
  company: string
  email: string
  phone: string
  status: "active" | "pending" | "inactive"
  location?: string
  segment?: "family_office" | "hnwi" | "institutional" | "developer" | "other"
  preferredContactMethod?: "whatsapp" | "email" | "phone"
  notes?: string
  // Basic mandate fields
  strategy?: string
  investmentHorizon?: string
  yieldTarget?: string
  riskTolerance?: "low" | "medium" | "high"
  preferredAreas?: string
  propertyTypes?: string
  minInvestment?: string
  maxInvestment?: string
  primaryObjectives?: string
  preferredViews?: string
  preferredBedrooms?: string
  developerPreferences?: string
  dealBreakers?: string
  decisionTimeline?: "immediate" | "1-2_weeks" | "1_month" | "flexible"
  furnishedPreference?: "furnished" | "unfurnished" | "any"
  completionStatus?: "ready" | "off_plan" | "any"
  tenantRequirements?: "vacant" | "tenanted" | "any"
  leverageAppetite?: "none" | "low" | "moderate" | "high"
  dueDiligenceLevel?: "light" | "standard" | "extensive"
  minSize?: string
  maxSize?: string
  maxServiceCharge?: string
  communicationExpectations?: string
}

export default function NewInvestorPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [form, setForm] = React.useState<InvestorForm>({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "active",
    riskTolerance: "medium",
    preferredContactMethod: "whatsapp",
    segment: "other",
  })

  const updateForm = <K extends keyof InvestorForm>(key: K, value: InvestorForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const splitCsv = (value?: string) =>
    value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation
    if (!form.name.trim() || !form.company.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      // Build mandate object if any fields are filled
      const mandate =
        form.strategy ||
        form.investmentHorizon ||
        form.yieldTarget ||
        form.preferredAreas ||
        form.propertyTypes ||
        form.minInvestment ||
        form.maxInvestment ||
        form.primaryObjectives ||
        form.preferredViews ||
        form.preferredBedrooms ||
        form.developerPreferences ||
        form.dealBreakers ||
        form.communicationExpectations ||
        form.minSize ||
        form.maxSize ||
        form.maxServiceCharge
          ? {
              strategy: form.strategy?.trim() || "",
              investmentHorizon: form.investmentHorizon?.trim() || "",
              yieldTarget: form.yieldTarget?.trim() || "",
              riskTolerance: form.riskTolerance || "medium",
              preferredAreas: splitCsv(form.preferredAreas),
              propertyTypes: splitCsv(form.propertyTypes),
              minInvestment: form.minInvestment ? Number(form.minInvestment.replace(/,/g, "")) : 0,
              maxInvestment: form.maxInvestment ? Number(form.maxInvestment.replace(/,/g, "")) : 0,
              primaryObjectives: splitCsv(form.primaryObjectives),
              preferredViews: splitCsv(form.preferredViews),
              preferredBedrooms: splitCsv(form.preferredBedrooms).map((n) => Number(n)).filter((n) => !Number.isNaN(n)),
              developerPreferences: splitCsv(form.developerPreferences),
              dealBreakers: splitCsv(form.dealBreakers),
              decisionTimeline: form.decisionTimeline || "flexible",
              furnishedPreference: form.furnishedPreference || "any",
              completionStatus: form.completionStatus || "any",
              tenantRequirements: form.tenantRequirements || "any",
              leverageAppetite: form.leverageAppetite || "moderate",
              dueDiligenceLevel: form.dueDiligenceLevel || "standard",
              minSize: form.minSize ? Number(form.minSize.replace(/,/g, "")) : undefined,
              maxSize: form.maxSize ? Number(form.maxSize.replace(/,/g, "")) : undefined,
              maxServiceCharge: form.maxServiceCharge ? Number(form.maxServiceCharge.replace(/,/g, "")) : undefined,
              communicationExpectations: form.communicationExpectations?.trim() || undefined,
              notes: form.notes?.trim() || undefined,
            }
          : undefined

      const res = await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          status: form.status,
          lastContact: new Date().toISOString().split("T")[0],
          mandate,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create investor")
      }

      const newInvestor = await res.json()
      toast.success("Investor created successfully", { description: newInvestor.name })
      router.push(`/investors/${newInvestor.id}`)
    } catch (error) {
      console.error("Failed to create investor:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create investor")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/investors">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add New Investor</h1>
            <p className="text-sm text-muted-foreground">Create a new investor profile</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential contact details and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">
                    Company <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => updateForm("company", e.target.value)}
                    placeholder="Acme Capital"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="john@acmecapital.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    placeholder="+971 50 123 4567"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => updateForm("status", v as any)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Watching</SelectItem>
                      <SelectItem value="inactive">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="segment">Segment</Label>
                  <Select value={form.segment} onValueChange={(v) => updateForm("segment", v as any)}>
                    <SelectTrigger id="segment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family_office">Family Office</SelectItem>
                      <SelectItem value="hnwi">HNWI</SelectItem>
                      <SelectItem value="institutional">Institutional</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location || ""}
                    onChange={(e) => updateForm("location", e.target.value)}
                    placeholder="Dubai, UAE"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                  <Select
                    value={form.preferredContactMethod}
                    onValueChange={(v) => updateForm("preferredContactMethod", v as any)}
                  >
                    <SelectTrigger id="preferredContactMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Mandate (Optional) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Investment Mandate (Optional)</CardTitle>
              <CardDescription>Define investment preferences and criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Input
                    id="strategy"
                    value={form.strategy || ""}
                    onChange={(e) => updateForm("strategy", e.target.value)}
                    placeholder="Buy & Hold, Fix & Flip, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investmentHorizon">Investment Horizon</Label>
                  <Input
                    id="investmentHorizon"
                    value={form.investmentHorizon || ""}
                    onChange={(e) => updateForm("investmentHorizon", e.target.value)}
                    placeholder="3-5 years"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yieldTarget">Yield Target</Label>
                  <Input
                    id="yieldTarget"
                    value={form.yieldTarget || ""}
                    onChange={(e) => updateForm("yieldTarget", e.target.value)}
                    placeholder="7-10%"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                  <Select value={form.riskTolerance} onValueChange={(v) => updateForm("riskTolerance", v as any)}>
                    <SelectTrigger id="riskTolerance">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="preferredAreas">Preferred Areas</Label>
                  <Input
                    id="preferredAreas"
                    value={form.preferredAreas || ""}
                    onChange={(e) => updateForm("preferredAreas", e.target.value)}
                    placeholder="Dubai Marina, Downtown Dubai (comma-separated)"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="propertyTypes">Property Types</Label>
                  <Input
                    id="propertyTypes"
                    value={form.propertyTypes || ""}
                    onChange={(e) => updateForm("propertyTypes", e.target.value)}
                    placeholder="Apartment, Villa, Townhouse (comma-separated)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minInvestment">Min Investment (AED)</Label>
                  <Input
                    id="minInvestment"
                    inputMode="numeric"
                    value={form.minInvestment || ""}
                    onChange={(e) => updateForm("minInvestment", e.target.value)}
                    placeholder="1000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxInvestment">Max Investment (AED)</Label>
                  <Input
                    id="maxInvestment"
                    inputMode="numeric"
                    value={form.maxInvestment || ""}
                    onChange={(e) => updateForm("maxInvestment", e.target.value)}
                    placeholder="5000000"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="primaryObjectives">Primary Objectives</Label>
                  <Input
                    id="primaryObjectives"
                    value={form.primaryObjectives || ""}
                    onChange={(e) => updateForm("primaryObjectives", e.target.value)}
                    placeholder="Income generation, capital appreciation, diversification (comma-separated)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredBedrooms">Preferred Bedrooms</Label>
                  <Input
                    id="preferredBedrooms"
                    value={form.preferredBedrooms || ""}
                    onChange={(e) => updateForm("preferredBedrooms", e.target.value)}
                    placeholder="1, 2, 3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredViews">Preferred Views</Label>
                  <Input
                    id="preferredViews"
                    value={form.preferredViews || ""}
                    onChange={(e) => updateForm("preferredViews", e.target.value)}
                    placeholder="Sea, Golf, Marina"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="developerPreferences">Preferred Developers</Label>
                  <Input
                    id="developerPreferences"
                    value={form.developerPreferences || ""}
                    onChange={(e) => updateForm("developerPreferences", e.target.value)}
                    placeholder="Emaar, Nakheel, DAMAC (comma-separated)"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dealBreakers">Deal Breakers</Label>
                  <Input
                    id="dealBreakers"
                    value={form.dealBreakers || ""}
                    onChange={(e) => updateForm("dealBreakers", e.target.value)}
                    placeholder="No off-plan, no tenanted units, no high service charge"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decisionTimeline">Decision Timeline</Label>
                  <Select value={form.decisionTimeline || "flexible"} onValueChange={(v) => updateForm("decisionTimeline", v as any)}>
                    <SelectTrigger id="decisionTimeline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="1-2_weeks">1-2 weeks</SelectItem>
                      <SelectItem value="1_month">1 month</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="furnishedPreference">Furnished Preference</Label>
                  <Select value={form.furnishedPreference || "any"} onValueChange={(v) => updateForm("furnishedPreference", v as any)}>
                    <SelectTrigger id="furnishedPreference">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="furnished">Furnished</SelectItem>
                      <SelectItem value="unfurnished">Unfurnished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="completionStatus">Completion Status</Label>
                  <Select value={form.completionStatus || "any"} onValueChange={(v) => updateForm("completionStatus", v as any)}>
                    <SelectTrigger id="completionStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="off_plan">Off-plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantRequirements">Tenant Requirements</Label>
                  <Select value={form.tenantRequirements || "any"} onValueChange={(v) => updateForm("tenantRequirements", v as any)}>
                    <SelectTrigger id="tenantRequirements">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="tenanted">Tenanted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leverageAppetite">Leverage Appetite</Label>
                  <Select value={form.leverageAppetite || "moderate"} onValueChange={(v) => updateForm("leverageAppetite", v as any)}>
                    <SelectTrigger id="leverageAppetite">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No leverage</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDiligenceLevel">Due Diligence Depth</Label>
                  <Select value={form.dueDiligenceLevel || "standard"} onValueChange={(v) => updateForm("dueDiligenceLevel", v as any)}>
                    <SelectTrigger id="dueDiligenceLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="extensive">Extensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minSize">Min Size (sqft)</Label>
                  <Input
                    id="minSize"
                    inputMode="numeric"
                    value={form.minSize || ""}
                    onChange={(e) => updateForm("minSize", e.target.value)}
                    placeholder="900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSize">Max Size (sqft)</Label>
                  <Input
                    id="maxSize"
                    inputMode="numeric"
                    value={form.maxSize || ""}
                    onChange={(e) => updateForm("maxSize", e.target.value)}
                    placeholder="2500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxServiceCharge">Max Service Charge (AED/sqft)</Label>
                  <Input
                    id="maxServiceCharge"
                    inputMode="numeric"
                    value={form.maxServiceCharge || ""}
                    onChange={(e) => updateForm("maxServiceCharge", e.target.value)}
                    placeholder="18"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="communicationExpectations">Communication Expectations</Label>
                <Textarea
                  id="communicationExpectations"
                  value={form.communicationExpectations || ""}
                  onChange={(e) => updateForm("communicationExpectations", e.target.value)}
                  placeholder="Weekly WhatsApp updates, monthly memo, immediate alert for high-fit deals..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes || ""}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Additional notes about the investor's preferences..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild disabled={submitting}>
              <Link href="/investors">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Create Investor
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
