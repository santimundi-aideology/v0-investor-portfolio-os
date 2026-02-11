"use client"

/**
 * @deprecated
 * Legacy editor wired to `lib/investor-store.ts` in-memory updates.
 * Do not use in investor-facing flows. Use API-backed inline editing on
 * `app/(investor)/investor/profile/page.tsx` instead.
 */

import * as React from "react"
import { toast } from "sonner"
import { Edit3, Save } from "lucide-react"

import type { Investor } from "@/lib/types"
import { updateInvestor } from "@/lib/investor-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const MAX_TAGS = 12

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed.replace(/,/g, ""))
  return Number.isNaN(parsed) ? undefined : parsed
}

function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS)
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseNumberList(value: string): number[] {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((num) => !Number.isNaN(num))
}

export function EditInvestorProfileDialog({ investor }: { investor: Investor }) {
  const [isHydrated, setIsHydrated] = React.useState(false)
  React.useEffect(() => setIsHydrated(true), [])

  const [draft, setDraft] = React.useState<Investor>(investor)
  React.useEffect(() => setDraft(investor), [investor])

  const set = <K extends keyof Investor>(key: K, value: Investor[K]) =>
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }))

  const setMandate = (updates: Partial<NonNullable<Investor["mandate"]>>) =>
    setDraft((prev) => ({
      ...prev,
      mandate: {
        strategy: "",
        investmentHorizon: "",
        yieldTarget: "",
        riskTolerance: "medium",
        preferredAreas: [],
        propertyTypes: [],
        minInvestment: 0,
        maxInvestment: 0,
        ...prev.mandate,
        ...updates,
      },
    }))

  const save = () => {
    const tags = (draft.tags ?? []).map((tag) => tag.trim()).filter(Boolean).slice(0, MAX_TAGS)

    const updated = updateInvestor(investor.id, {
      name: draft.name.trim() || investor.name,
      company: draft.company.trim() || investor.company,
      email: draft.email.trim() || investor.email,
      phone: draft.phone.trim() || investor.phone,
      status: draft.status,
      lastContact: draft.lastContact,
      location: draft.location?.trim() || undefined,
      timezone: draft.timezone?.trim() || undefined,
      preferredContactMethod: draft.preferredContactMethod,
      segment: draft.segment,
      aumAed: draft.aumAed ? Number(draft.aumAed) : undefined,
      liquidityWindow: draft.liquidityWindow,
      leadSource: draft.leadSource?.trim() || undefined,
      tags,
      notes: draft.notes?.trim() || undefined,
      mandate: draft.mandate,
    })

    if (!updated) {
      toast.error("Could not save changes")
      return
    }

    toast.success("Investor profile updated", { description: updated.name })
  }

  if (!isHydrated) {
    return (
      <Button variant="outline" size="sm" disabled suppressHydrationWarning>
        <Edit3 className="mr-2 h-4 w-4" />
        Edit profile
      </Button>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit3 className="mr-2 h-4 w-4" />
          Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit investor profile</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Company</Label>
              <Input value={draft.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={draft.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => set("status", v as Investor["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Watching</SelectItem>
                  <SelectItem value="inactive">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Last contact (YYYY-MM-DD)</Label>
              <Input value={draft.lastContact} onChange={(e) => set("lastContact", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Segment</Label>
              <Select value={draft.segment ?? "other"} onValueChange={(v) => set("segment", v as Investor["segment"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family_office">Family office</SelectItem>
                  <SelectItem value="hnwi">HNWI</SelectItem>
                  <SelectItem value="institutional">Institutional</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Preferred contact</Label>
              <Select
                value={draft.preferredContactMethod ?? "whatsapp"}
                onValueChange={(v) => set("preferredContactMethod", v as Investor["preferredContactMethod"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Liquidity</Label>
              <Select
                value={draft.liquidityWindow ?? "30-90d"}
                onValueChange={(v) => set("liquidityWindow", v as Investor["liquidityWindow"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="30-90d">30–90d</SelectItem>
                  <SelectItem value="90-180d">90–180d</SelectItem>
                  <SelectItem value="180d+">180d+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Location</Label>
              <Input value={draft.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Dubai, UAE" />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Input value={draft.timezone ?? ""} onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Dubai" />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Lead source</Label>
              <Input value={draft.leadSource ?? ""} onChange={(e) => set("leadSource", e.target.value)} placeholder="Referral / Event / Inbound…" />
            </div>
            <div className="grid gap-2">
              <Label>AUM (AED)</Label>
              <Input
                inputMode="numeric"
                value={draft.aumAed?.toString() ?? ""}
                onChange={(e) => set("aumAed", parseOptionalNumber(e.target.value))}
                placeholder="250000000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Tags (comma separated)</Label>
            <Input value={(draft.tags ?? []).join(", ")} onChange={(e) => set("tags", parseTagsInput(e.target.value))} />
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Relationship notes, preferences, sensitivities…"
            />
          </div>

          <div className="rounded-lg border p-4 space-y-5">
            <div className="mb-1">
              <div className="text-sm font-semibold">Mandate (detailed)</div>
              <p className="text-xs text-muted-foreground mt-1">
                Capture strategic goals, constraints, and execution preferences so realtors can act faster.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Strategy</Label>
                <Input value={draft.mandate?.strategy ?? ""} onChange={(e) => setMandate({ strategy: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Yield target</Label>
                <Input value={draft.mandate?.yieldTarget ?? ""} onChange={(e) => setMandate({ yieldTarget: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Horizon</Label>
                <Input
                  value={draft.mandate?.investmentHorizon ?? ""}
                  onChange={(e) => setMandate({ investmentHorizon: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Decision timeline</Label>
                <Select
                  value={draft.mandate?.decisionTimeline ?? "flexible"}
                  onValueChange={(v) => setMandate({ decisionTimeline: v as NonNullable<Investor["mandate"]>["decisionTimeline"] })}
                >
                  <SelectTrigger>
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
              <div className="grid gap-2">
                <Label>Risk tolerance</Label>
                <Select
                  value={draft.mandate?.riskTolerance ?? "medium"}
                  onValueChange={(v) => setMandate({ riskTolerance: v as NonNullable<Investor["mandate"]>["riskTolerance"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Min ticket (AED)</Label>
                <Input
                  inputMode="numeric"
                  value={draft.mandate?.minInvestment?.toString() ?? ""}
                  onChange={(e) => setMandate({ minInvestment: Number(e.target.value || 0) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Max ticket (AED)</Label>
                <Input
                  inputMode="numeric"
                  value={draft.mandate?.maxInvestment?.toString() ?? ""}
                  onChange={(e) => setMandate({ maxInvestment: Number(e.target.value || 0) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Min size (sqft)</Label>
                <Input
                  inputMode="numeric"
                  value={draft.mandate?.minSize?.toString() ?? ""}
                  onChange={(e) => setMandate({ minSize: parseOptionalNumber(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Max size (sqft)</Label>
                <Input
                  inputMode="numeric"
                  value={draft.mandate?.maxSize?.toString() ?? ""}
                  onChange={(e) => setMandate({ maxSize: parseOptionalNumber(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Max service charge (AED/sqft)</Label>
                <Input
                  inputMode="numeric"
                  value={draft.mandate?.maxServiceCharge?.toString() ?? ""}
                  onChange={(e) => setMandate({ maxServiceCharge: parseOptionalNumber(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Leverage appetite</Label>
                <Select
                  value={draft.mandate?.leverageAppetite ?? "moderate"}
                  onValueChange={(v) => setMandate({ leverageAppetite: v as NonNullable<Investor["mandate"]>["leverageAppetite"] })}
                >
                  <SelectTrigger>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label>Primary objectives (comma separated)</Label>
                <Input
                  value={(draft.mandate?.primaryObjectives ?? []).join(", ")}
                  onChange={(e) => setMandate({ primaryObjectives: parseCommaList(e.target.value) })}
                  placeholder="Income generation, capital appreciation, diversification"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Preferred areas (comma separated)</Label>
                <Input
                  value={(draft.mandate?.preferredAreas ?? []).join(", ")}
                  onChange={(e) => setMandate({ preferredAreas: parseCommaList(e.target.value) })}
                  placeholder="Dubai Marina, Downtown, Business Bay"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Property types (comma separated)</Label>
                <Input
                  value={(draft.mandate?.propertyTypes ?? []).join(", ")}
                  onChange={(e) => setMandate({ propertyTypes: parseCommaList(e.target.value) })}
                  placeholder="Apartment, Villa, Townhouse"
                />
              </div>
              <div className="grid gap-2">
                <Label>Preferred bedrooms (comma separated)</Label>
                <Input
                  value={(draft.mandate?.preferredBedrooms ?? []).join(", ")}
                  onChange={(e) => setMandate({ preferredBedrooms: parseNumberList(e.target.value) })}
                  placeholder="1, 2, 3"
                />
              </div>
              <div className="grid gap-2">
                <Label>Preferred views (comma separated)</Label>
                <Input
                  value={(draft.mandate?.preferredViews ?? []).join(", ")}
                  onChange={(e) => setMandate({ preferredViews: parseCommaList(e.target.value) })}
                  placeholder="Sea, Golf, Marina"
                />
              </div>
              <div className="grid gap-2">
                <Label>Preferred developers (comma separated)</Label>
                <Input
                  value={(draft.mandate?.developerPreferences ?? []).join(", ")}
                  onChange={(e) => setMandate({ developerPreferences: parseCommaList(e.target.value) })}
                  placeholder="Emaar, Nakheel, DAMAC"
                />
              </div>
              <div className="grid gap-2">
                <Label>Deal breakers (comma separated)</Label>
                <Input
                  value={(draft.mandate?.dealBreakers ?? []).join(", ")}
                  onChange={(e) => setMandate({ dealBreakers: parseCommaList(e.target.value) })}
                  placeholder="No off-plan, no tenanted assets, no high service charge"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Furnished preference</Label>
                <Select
                  value={draft.mandate?.furnishedPreference ?? "any"}
                  onValueChange={(v) => setMandate({ furnishedPreference: v as NonNullable<Investor["mandate"]>["furnishedPreference"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="furnished">Furnished</SelectItem>
                    <SelectItem value="unfurnished">Unfurnished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Completion status</Label>
                <Select
                  value={draft.mandate?.completionStatus ?? "any"}
                  onValueChange={(v) => setMandate({ completionStatus: v as NonNullable<Investor["mandate"]>["completionStatus"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="off_plan">Off-plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tenant requirements</Label>
                <Select
                  value={draft.mandate?.tenantRequirements ?? "any"}
                  onValueChange={(v) => setMandate({ tenantRequirements: v as NonNullable<Investor["mandate"]>["tenantRequirements"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="tenanted">Tenanted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Payment plan</Label>
                <Select
                  value={
                    draft.mandate?.paymentPlanRequired === true
                      ? "required"
                      : draft.mandate?.paymentPlanRequired === false
                        ? "not_required"
                        : "any"
                  }
                  onValueChange={(v) =>
                    setMandate({
                      paymentPlanRequired: v === "any" ? undefined : v === "required",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="required">Required</SelectItem>
                    <SelectItem value="not_required">Not required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Due diligence depth</Label>
                <Select
                  value={draft.mandate?.dueDiligenceLevel ?? "standard"}
                  onValueChange={(v) => setMandate({ dueDiligenceLevel: v as NonNullable<Investor["mandate"]>["dueDiligenceLevel"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="extensive">Extensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Relationship model</Label>
                <Select
                  value={
                    draft.mandate?.exclusiveDeals
                      ? "exclusive"
                      : draft.mandate?.coInvestmentOpen
                        ? "co_investment"
                        : "standard"
                  }
                  onValueChange={(v) =>
                    setMandate({
                      exclusiveDeals: v === "exclusive",
                      coInvestmentOpen: v === "co_investment",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="co_investment">Open to co-investment</SelectItem>
                    <SelectItem value="exclusive">Exclusive / off-market only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Communication expectations</Label>
              <Textarea
                value={draft.mandate?.communicationExpectations ?? ""}
                onChange={(e) => setMandate({ communicationExpectations: e.target.value })}
                placeholder="Weekly WhatsApp updates, monthly PDF summary, immediate alerts on high-fit deals..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Mandate notes</Label>
              <Textarea
                value={draft.mandate?.notes ?? ""}
                onChange={(e) => setMandate({ notes: e.target.value })}
                placeholder="Additional context, approvals, sensitivities, and negotiation constraints..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={save}>
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


