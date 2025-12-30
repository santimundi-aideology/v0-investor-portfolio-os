"use client"

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
        strategy: prev.mandate?.strategy ?? "",
        investmentHorizon: prev.mandate?.investmentHorizon ?? "",
        yieldTarget: prev.mandate?.yieldTarget ?? "",
        riskTolerance: prev.mandate?.riskTolerance ?? "medium",
        preferredAreas: prev.mandate?.preferredAreas ?? [],
        propertyTypes: prev.mandate?.propertyTypes ?? [],
        minInvestment: prev.mandate?.minInvestment ?? 0,
        maxInvestment: prev.mandate?.maxInvestment ?? 0,
        notes: prev.mandate?.notes,
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

          <div className="rounded-lg border p-4">
            <div className="mb-3 text-sm font-semibold">Mandate (snapshot)</div>
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


