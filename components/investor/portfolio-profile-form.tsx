"use client"

import * as React from "react"
import {
  Loader2,
  Save,
  User,
  Download,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import type { Investor, Mandate } from "@/lib/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop"

/** Normalize URL so any pasted link loads (add https if missing). */
function normalizePhotoUrl(input: string): string {
  const s = (input || "").trim()
  if (!s) return s
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

function defaultMandate(): Mandate {
  return {
    strategy: "",
    investmentHorizon: "",
    yieldTarget: "",
    riskTolerance: "medium",
    preferredAreas: [],
    propertyTypes: [],
    minInvestment: 0,
    maxInvestment: 0,
    notes: "",
  }
}

function cloneMandate(m?: Mandate): Mandate {
  if (!m) return defaultMandate()
  return {
    ...m,
    preferredAreas: [...(m.preferredAreas ?? [])],
    propertyTypes: [...(m.propertyTypes ?? [])],
  }
}

export function PortfolioProfileForm({
  investor,
  onSaved,
}: {
  investor: Investor | null
  onSaved?: () => void
}) {
  const [description, setDescription] = React.useState("")
  const [mandate, setMandate] = React.useState<Mandate>(defaultMandate())
  const [saving, setSaving] = React.useState(false)
  const [downloadingPdf, setDownloadingPdf] = React.useState(false)
  const [photoUrl, setPhotoUrl] = React.useState("")
  const [photoDisplayUrl, setPhotoDisplayUrl] = React.useState("")
  const [photoEditOpen, setPhotoEditOpen] = React.useState(false)
  const [photoLoadError, setPhotoLoadError] = React.useState(false)
  const [thesisReturnStyle, setThesisReturnStyle] = React.useState<"income" | "appreciation" | "balanced" | "">("")
  const [thesisHoldPeriod, setThesisHoldPeriod] = React.useState("")
  const [thesisNotes, setThesisNotes] = React.useState("")

  React.useEffect(() => {
    if (investor) {
      setDescription(investor.description ?? "")
      setMandate(cloneMandate(investor.mandate))
      const av = investor.avatar?.trim() || DEFAULT_AVATAR
      setPhotoUrl(av)
      setPhotoDisplayUrl(normalizePhotoUrl(av))
      setPhotoLoadError(false)
      setThesisReturnStyle((investor.thesisReturnStyle as "income" | "appreciation" | "balanced") ?? "")
      setThesisHoldPeriod(investor.thesisHoldPeriod ?? "")
      setThesisNotes(investor.thesisNotes ?? "")
    } else {
      setPhotoUrl(DEFAULT_AVATAR)
      setPhotoDisplayUrl(DEFAULT_AVATAR)
      setPhotoLoadError(false)
      setThesisReturnStyle("")
      setThesisHoldPeriod("")
      setThesisNotes("")
    }
  }, [investor])

  const applyPhotoUrl = React.useCallback(() => {
    const normalized = normalizePhotoUrl(photoUrl)
    setPhotoDisplayUrl(normalized || DEFAULT_AVATAR)
    setPhotoLoadError(false)
  }, [photoUrl])

  const parseList = (value: string) =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

  const parseNum = (value: string): number => {
    const n = Number(String(value).replace(/[^0-9.-]/g, ""))
    return Number.isFinite(n) ? n : 0
  }

  const handleSave = async () => {
    if (!investor?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/investors/${investor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || undefined,
          mandate: { ...mandate },
          avatar: (photoUrl?.trim() ? normalizePhotoUrl(photoUrl) : undefined) || undefined,
          thesisReturnStyle: thesisReturnStyle || undefined,
          thesisHoldPeriod: thesisHoldPeriod.trim() || undefined,
          thesisNotes: thesisNotes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error saving")
      }
      toast.success("Profile saved. Your advisor will use these preferences for recommendations.")
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving")
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const res = await fetch("/api/investor/profile/export-pdf")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to generate PDF")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${(investor?.name || "Investor").replace(/[^a-zA-Z0-9]/g, "_")}_Profile.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Profile downloaded as PDF")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download PDF")
    } finally {
      setDownloadingPdf(false)
    }
  }

  const dirty =
    description !== (investor?.description ?? "") ||
    JSON.stringify(mandate) !== JSON.stringify(cloneMandate(investor?.mandate)) ||
    (photoUrl !== (investor?.avatar?.trim() || DEFAULT_AVATAR)) ||
    thesisReturnStyle !== (investor?.thesisReturnStyle ?? "") ||
    thesisHoldPeriod !== (investor?.thesisHoldPeriod ?? "") ||
    thesisNotes !== (investor?.thesisNotes ?? "")

  return (
    <Card
      className={cn(
        "overflow-hidden border border-gray-200/80 shadow-sm dark:border-border",
        "bg-gradient-to-br from-white to-emerald-50/30 dark:from-card dark:to-emerald-950/20"
      )}
    >
      <CardContent className="p-0">
        {/* Presentation header: photo + name/company (your space) */}
        <div className="flex flex-col border-b border-gray-100 bg-white/60 dark:border-border dark:bg-card/60 sm:flex-row">
          <div className="relative flex-shrink-0 border-b border-gray-100 p-6 sm:border-b-0 sm:border-r sm:border-gray-100 dark:border-border">
            <div className="mx-auto sm:mx-0">
              <div className="relative aspect-[3/4] w-36 overflow-hidden rounded-xl border-2 border-emerald-100 bg-gray-100 dark:border-emerald-900/50 dark:bg-muted">
                {photoDisplayUrl ? (
                  <>
                    <img
                      src={photoDisplayUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      onLoad={() => setPhotoLoadError(false)}
                      onError={() => setPhotoLoadError(true)}
                    />
                    {photoLoadError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200/90 p-2 text-center dark:bg-muted/90">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Image could not load</span>
                        <span className="mt-1 text-[10px] text-muted-foreground">Check URL or try another</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User className="size-12" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPhotoEditOpen((o) => !o)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-border dark:bg-card dark:text-gray-400 dark:hover:bg-muted"
              >
                <Camera className="size-3.5" />
                Change photo
              </button>
              {photoEditOpen && (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => { setPhotoUrl(e.target.value); setPhotoLoadError(false) }}
                    onKeyDown={(e) => e.key === "Enter" && applyPhotoUrl()}
                    placeholder="Paste any image URL (e.g. https://... or domain.com/photo.jpg)"
                    className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs dark:border-border dark:bg-muted"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={applyPhotoUrl}>
                      Load photo
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setPhotoUrl(DEFAULT_AVATAR); setPhotoDisplayUrl(DEFAULT_AVATAR); setPhotoEditOpen(false); setPhotoLoadError(false) }}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Use default
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center px-6 py-5 sm:py-6">
            <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {investor?.name || "Your name"}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {investor?.company || "Company / role"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {investor?.email || "—"} · {investor?.phone || "—"}
            </p>
            <p className="mt-3 w-full max-w-full text-sm text-muted-foreground">
              This is your personal investment space. Fill in your preferences below and
              download your profile as a PDF anytime.
            </p>
          </div>
        </div>

        {/* Form fields: full width */}
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <Label htmlFor="portfolio-desc">About you and your investment objectives</Label>
            <Textarea
              id="portfolio-desc"
              placeholder="E.g.: I'm looking for rental yield in Dubai, established areas, budget 1–3M AED. I prefer 1–2 bedroom apartments, move-in ready."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full max-w-full resize-y"
            />
          </div>

          <div className="grid w-full max-w-full gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Strategy (summary)</Label>
              <Input
                placeholder="E.g.: Stable returns, hold 5+ years"
                value={mandate.strategy}
                onChange={(e) => setMandate((m) => ({ ...m, strategy: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Investment horizon</Label>
              <Input
                placeholder="E.g.: 5–10 years, long-term"
                value={mandate.investmentHorizon}
                onChange={(e) => setMandate((m) => ({ ...m, investmentHorizon: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid w-full max-w-full gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Target yield</Label>
              <Input
                placeholder="E.g.: 6–8% net"
                value={mandate.yieldTarget}
                onChange={(e) => setMandate((m) => ({ ...m, yieldTarget: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Return focus (thesis)</Label>
              <Select
                value={thesisReturnStyle || "none"}
                onValueChange={(v) => setThesisReturnStyle(v === "none" ? "" : (v as "income" | "appreciation" | "balanced"))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="income">Income / yield</SelectItem>
                  <SelectItem value="appreciation">Capital appreciation</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid w-full max-w-full gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Preferred areas (comma-separated)</Label>
              <Input
                placeholder="E.g.: Dubai Marina, JBR, Downtown"
                value={(mandate.preferredAreas ?? []).join(", ")}
                onChange={(e) =>
                  setMandate((m) => ({ ...m, preferredAreas: parseList(e.target.value) }))
                }
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Property types (comma-separated)</Label>
              <Input
                placeholder="E.g.: Apartment, Villa, Townhouse"
                value={(mandate.propertyTypes ?? []).join(", ")}
                onChange={(e) =>
                  setMandate((m) => ({ ...m, propertyTypes: parseList(e.target.value) }))
                }
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Primary objectives (comma-separated)</Label>
            <Input
              placeholder="E.g.: income, capital appreciation, portfolio diversification"
              value={(mandate.primaryObjectives ?? []).join(", ")}
              onChange={(e) =>
                setMandate((m) => ({ ...m, primaryObjectives: parseList(e.target.value) }))
              }
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Deal breakers (comma-separated)</Label>
            <Input
              placeholder="E.g.: off-plan only, no service charges above 30 AED/sqft"
              value={(mandate.dealBreakers ?? []).join(", ")}
              onChange={(e) =>
                setMandate((m) => ({ ...m, dealBreakers: parseList(e.target.value) }))
              }
              className="w-full"
            />
          </div>

          <div className="grid w-full max-w-full gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Thesis hold period</Label>
              <Input
                placeholder="E.g.: 5+ years, flexible"
                value={thesisHoldPeriod}
                onChange={(e) => setThesisHoldPeriod(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Mandate notes</Label>
              <Input
                placeholder="Any other criteria or preferences"
                value={mandate.notes ?? ""}
                onChange={(e) => setMandate((m) => ({ ...m, notes: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Thesis / investment philosophy (notes)</Label>
            <Textarea
              placeholder="E.g.: I focus on cash flow and stable yields; I prefer established areas and ready units."
              value={thesisNotes}
              onChange={(e) => setThesisNotes(e.target.value)}
              rows={3}
              className="w-full max-w-full resize-y"
            />
          </div>

          <div className="grid w-full max-w-full gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Minimum investment (AED)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="E.g.: 1000000"
                value={mandate.minInvestment ? String(mandate.minInvestment) : ""}
                onChange={(e) =>
                  setMandate((m) => ({ ...m, minInvestment: parseNum(e.target.value) }))
                }
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum investment (AED)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="E.g.: 3000000"
                value={mandate.maxInvestment ? String(mandate.maxInvestment) : ""}
                onChange={(e) =>
                  setMandate((m) => ({ ...m, maxInvestment: parseNum(e.target.value) }))
                }
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Risk tolerance</Label>
              <Select
                value={mandate.riskTolerance}
                onValueChange={(v: "low" | "medium" | "high") =>
                  setMandate((m) => ({ ...m, riskTolerance: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="mb-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Create your profile document
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Generate a PDF with your photo, preferences and investment criteria. Save your profile first so the document is up to date.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {downloadingPdf ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Create document (PDF)
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="gap-2"
            >
              {downloadingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download PDF
            </Button>
            <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save profile
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
