"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HardHat,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
} from "lucide-react"

import { RoleRedirect } from "@/components/security/role-redirect"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatAED } from "@/lib/real-estate"
import { PropertyAIChat } from "@/components/ai/property-ai-chat"
import { ScoreRadarChart } from "@/components/charts/score-radar-chart"
import { PriceComparisonChart } from "@/components/charts/price-comparison-chart"
import { InvestorMatchingPanel } from "@/components/memos/investor-matching-panel"
import type { Investor, OffPlanProject, OffPlanUnit, OffPlanPaymentPlan, OffPlanEvaluationResult } from "@/lib/types"
import { MemoPdfExport } from "@/components/memos/memo-pdf-export"
import { useAPI } from "@/lib/hooks/use-api"
import type { IntakeReportPayload } from "@/lib/pdf/intake-report"

// CMA and Off-Plan components
import { CMAPanel } from "@/components/property-intake/cma-panel"
import { PdfUploadZone } from "@/components/property-intake/pdf-upload-zone"
import { OffPlanProjectOverview } from "@/components/property-intake/offplan-project-overview"
import { UnitSelectionTable } from "@/components/property-intake/unit-selection-table"
import { OffPlanUnitComparison } from "@/components/property-intake/offplan-unit-comparison"
import { OffPlanMemoDisplay } from "@/components/property-intake/offplan-memo-display"
import { AIScoreReveal } from "@/components/property-intake/ai-score-reveal"

// Persistent store — state survives navigation
import {
  useIntakeStore,
  setActiveTab,
  setUrl,
  setNotes,
  setScoreRevealComplete,
  setSelectedOffplanUnits,
  setPortalError,
  setOffplanError,
  setOffplanUrl,
  dismissOffplanDetected,
  switchToOffplanWithUrl,
  extractProperty,
  parseBuiltPdf,
  evaluateProperty,
  saveMemo,
  resetPortal,
  extractPropertyForOffplan,
  handlePdfExtracted,
  evaluateOffplan,
  saveOffplanMemo,
  resetOffplan,
} from "@/lib/property-intake-store"
import type { ExtractedProperty, EvaluationResult, EnhancedPdfData } from "@/lib/property-intake-store"

const currencyFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat("en-AE", {
  style: "percent",
  maximumFractionDigits: 1,
})

function formatCurrency(value?: number) {
  if (typeof value !== "number") return "—"
  return currencyFormatter.format(value)
}

function formatPerSqft(value?: number) {
  if (typeof value !== "number") return "—"
  return `${currencyFormatter.format(value)} / sq ft`
}

function formatPercent(value?: number) {
  if (typeof value !== "number") return "—"
  return percentFormatter.format(value)
}

function buildStaticMapUrl(
  coords?: { lat: number; lng: number } | null,
  locationLabel?: string,
) {
  const lat = coords?.lat
  const lng = coords?.lng
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
  const label = (locationLabel || "Property location").slice(0, 80)
  const coordText = hasCoords
    ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
    : "Coordinates unavailable"

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
  <rect width="800" height="420" fill="#f8fafc"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="0" y1="70" x2="800" y2="70"/>
    <line x1="0" y1="140" x2="800" y2="140"/>
    <line x1="0" y1="210" x2="800" y2="210"/>
    <line x1="0" y1="280" x2="800" y2="280"/>
    <line x1="0" y1="350" x2="800" y2="350"/>
    <line x1="130" y1="0" x2="130" y2="420"/>
    <line x1="260" y1="0" x2="260" y2="420"/>
    <line x1="390" y1="0" x2="390" y2="420"/>
    <line x1="520" y1="0" x2="520" y2="420"/>
    <line x1="650" y1="0" x2="650" y2="420"/>
  </g>
  <path d="M40 300 C170 240, 260 250, 390 200 S620 170, 760 130" stroke="#cbd5e1" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M80 110 C180 130, 270 120, 360 150 S560 230, 720 260" stroke="#dbeafe" stroke-width="10" fill="none" stroke-linecap="round"/>
  <g transform="translate(400,210)">
    <path d="M0 -26 C10 -26 18 -18 18 -8 C18 5 8 17 0 30 C-8 17 -18 5 -18 -8 C-18 -18 -10 -26 0 -26 Z" fill="#ef4444"/>
    <circle cx="0" cy="-8" r="6" fill="#ffffff"/>
  </g>
  <rect x="24" y="24" width="430" height="42" rx="8" fill="#ffffff" opacity="0.96"/>
  <text x="42" y="50" font-size="22" font-family="Helvetica" fill="#0f172a">${label}</text>
  <rect x="24" y="360" width="280" height="34" rx="7" fill="#ffffff" opacity="0.96"/>
  <text x="42" y="383" font-size="16" font-family="Helvetica" fill="#334155">${coordText}</text>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Timer that shows elapsed time and an estimated progress bar during IC memo generation.
 */
function EvaluationTimer({ estimatedSeconds = 30, area, isOffplan }: { estimatedSeconds?: number; area?: string; isOffplan?: boolean }) {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    const t0 = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Countdown: show remaining time
  const remaining = Math.max(0, estimatedSeconds - elapsed)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = remaining > 0
    ? minutes > 0 ? `~${minutes}:${seconds.toString().padStart(2, "0")} remaining` : `~${seconds}s remaining`
    : "Almost done..."

  // Progress: ramps quickly to 90% then slows down (never hits 100% until done)
  const rawProgress = elapsed / estimatedSeconds
  const progress = Math.min(95, rawProgress < 0.9 ? rawProgress * 100 : 90 + (rawProgress - 0.9) * 50)

  const areaName = area || "the area"

  // Descriptive phases explaining what the AI is doing
  const phases = isOffplan ? [
    { at: 0, title: "Reading property & developer data", detail: "Parsing unit specs, payment plan milestones, and developer track record" },
    { at: 4, title: "Scoring investment factors", detail: "Evaluating developer credibility, location premium, payment plan, and appreciation potential" },
    { at: 8, title: "Analyzing location", detail: `Checking ${areaName} market grade, rental yields, and neighborhood growth trends` },
    { at: 13, title: "Building financial projections", detail: "Calculating completion value, post-handover rental income, operating expenses, and ROI on equity" },
    { at: 18, title: "Running scenario analysis", detail: "Modeling upside, base, and downside cases with varying rent, occupancy, and exit prices" },
    { at: 22, title: "Querying DLD transaction database", detail: `Fetching comparable sales and rental data from Dubai Land Department for ${areaName}` },
    { at: 27, title: "Assessing risks", detail: "Evaluating construction delay risk, market exposure, developer stability, and liquidity" },
    { at: 31, title: "Writing investment thesis", detail: "Synthesizing all data into a comprehensive IC memo with strategy and recommendation" },
    { at: 38, title: "Finalizing report", detail: "Assembling cash flow tables, growth projections, and comparable analysis" },
  ] : [
    { at: 0, title: "Reading extracted property data", detail: "Parsing price, size, location, condition, and listing details" },
    { at: 4, title: "Analyzing neighborhood", detail: `Evaluating ${areaName} market dynamics — supply, demand, absorption, and tenant profile` },
    { at: 8, title: "Running growth projections", detail: `Calculating 1Y, 3Y, and 5Y value estimates using ${areaName} historical appreciation trends` },
    { at: 13, title: "Building financial model", detail: "Computing return bridge: DLD fees, mortgage, equity invested, NOI, cap rate, and IRR" },
    { at: 18, title: "Estimating operating expenses", detail: "Service charges, property management (5%), maintenance reserve (1%), and insurance" },
    { at: 22, title: "Querying DLD transaction database", detail: `Fetching real comparable sales from Dubai Land Department for ${areaName}` },
    { at: 27, title: "Running scenario analysis", detail: "Modeling upside, base, and downside cases — varying rent, occupancy, and exit price" },
    { at: 31, title: "Writing investment thesis", detail: "Synthesizing market data and financials into a recommendation with risks and strategy" },
    { at: 38, title: "Finalizing IC memo", detail: "Assembling all sections: cash flow table, comparables, scenarios, and final recommendation" },
  ]

  const currentPhase = phases.filter((p) => elapsed >= p.at).pop() ?? phases[0]

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{currentPhase.title}</span>
        <span className="tabular-nums text-gray-400">{timeStr}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{currentPhase.detail}</p>
    </div>
  )
}

export default function PropertyIntakePage() {
  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />
      <PropertyIntakeContent />
    </>
  )
}

function PropertyIntakeContent() {
  // Defer client-only rendering so Radix Tabs IDs match between SSR and client
  // (useIntakeStore hydrates from sessionStorage, causing id mismatch otherwise)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // Fetch investors for matching panel
  const { data: investorsData } = useAPI<Investor[]>("/api/investors")
  const investors = investorsData ?? []
  const [isSharingMemo, setIsSharingMemo] = React.useState(false)

  // All state comes from the persistent store
  const {
    activeTab,
    step,
    url,
    error,
    property,
    evaluation,
    marketContext,
    enhancedPdfData,
    notes,
    savedMemoId,
    scoreRevealComplete,
    offplanDetected,
    offplanStep,
    offplanUrl,
    offplanError,
    offplanProject,
    offplanUnits,
    offplanPaymentPlan,
    offplanStats,
    selectedOffplanUnits,
    offplanEvaluation,
    offplanSavedMemoId,
    offplanBrochureImages,
  } = useIntakeStore()

  // Handle paste event for extracting page content
  const handlePasteContent = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && text.length > 500) {
        extractProperty(url, text)
      } else {
        setPortalError("Please copy the page content first (Ctrl+A, Ctrl+C on the Bayut page)")
      }
    } catch {
      setPortalError("Could not read clipboard. Please allow clipboard access or paste content manually.")
    }
  }

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case "strong_buy": return <Badge className="bg-green-600">Strong Buy</Badge>
      case "buy": return <Badge className="bg-green-500">Buy</Badge>
      case "hold": return <Badge variant="secondary">Hold</Badge>
      case "pass": return <Badge variant="destructive">Pass</Badge>
      default: return <Badge variant="outline">{rec}</Badge>
    }
  }

  const analysis = evaluation?.analysis
  const growth = analysis?.growth
  const portalReportPayload = React.useMemo(
    () => (property && evaluation ? buildPortalIntakeReportPayload(property, evaluation, enhancedPdfData) : undefined),
    [property, evaluation, enhancedPdfData],
  )
  // Resolve images: prefer portal-extracted images, fall back to rendered brochure pages
  const resolvedOffplanImages = React.useMemo(
    () => (property?.images && property.images.length > 0 ? property.images : offplanBrochureImages),
    [property?.images, offplanBrochureImages],
  )
  const offplanReportPayload = React.useMemo(
    () =>
      offplanProject && selectedOffplanUnits[0] && offplanPaymentPlan && offplanEvaluation
        ? buildOffplanIntakeReportPayload(
            offplanProject,
            selectedOffplanUnits[0],
            offplanPaymentPlan,
            offplanEvaluation,
            property ?? undefined,
            resolvedOffplanImages,
          )
        : undefined,
    [offplanProject, offplanPaymentPlan, offplanEvaluation, selectedOffplanUnits, property, resolvedOffplanImages],
  )
  // Determine if we should show reset button
  const showPortalReset = step !== "input" && step !== "saved"
  const showOffplanReset = offplanStep !== "input" && offplanStep !== "upload" && offplanStep !== "saved"

  const handleShareMemoToInvestors = React.useCallback(
    async (investorIds: string[]) => {
      if (!savedMemoId) {
        toast.error("Save the memo first", {
          description: "Create the IC memo before sharing it with investors.",
        })
        return
      }

      if (investorIds.length === 0) return

      setIsSharingMemo(true)
      try {
        // Load the saved memo so we can duplicate its latest content
        // into investor-linked memo records.
        const memoRes = await fetch(`/api/memos/${savedMemoId}`, { cache: "no-store" })
        const memoPayload = await memoRes.json().catch(() => ({}))
        if (!memoRes.ok) {
          throw new Error(
            (memoPayload as { error?: string }).error || "Failed to load saved memo before sharing",
          )
        }

        const raw = memoPayload as Record<string, unknown>
        const versions = Array.isArray(raw.versions)
          ? (raw.versions as Array<Record<string, unknown>>)
          : []
        const latestVersion = [...versions].sort(
          (a, b) => Number(b.version ?? 0) - Number(a.version ?? 0),
        )[0]
        const latestContent = latestVersion?.content

        if (!latestContent || typeof latestContent !== "object") {
          throw new Error("Saved memo content is missing")
        }

        const listingIdCandidate =
          (typeof raw.listingId === "string" && raw.listingId) ||
          (typeof raw.listing_id === "string" && raw.listing_id) ||
          undefined
        const uuidLike =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

        let resolvedListingId =
          listingIdCandidate && uuidLike.test(listingIdCandidate)
            ? listingIdCandidate
            : undefined

        // Property-intake often starts from portal links with non-UUID external IDs.
        // Investor opportunities require a real listings.id, so create one when absent.
        if (!resolvedListingId) {
          const structured = latestContent as Record<string, unknown>
          const contentProperty = structured.property as
            | Record<string, unknown>
            | undefined
          const contentSource = structured.source as
            | Record<string, unknown>
            | undefined
          const rawType = String(contentProperty?.type ?? "").toLowerCase()
          const mappedType = rawType.includes("office") ||
            rawType.includes("retail") ||
            rawType.includes("warehouse")
            ? "commercial"
            : rawType.includes("land")
              ? "land"
              : rawType.includes("mixed")
                ? "mixed-use"
                : "residential"

          const listingRes = await fetch("/api/listings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: String(contentProperty?.title ?? "Property"),
              area: contentProperty?.area ? String(contentProperty.area) : undefined,
              address:
                contentProperty?.subArea && contentProperty?.area
                  ? `${String(contentProperty.subArea)}, ${String(contentProperty.area)}`
                  : contentProperty?.area
                    ? String(contentProperty.area)
                    : undefined,
              type: mappedType,
              status: "available",
              price:
                typeof contentProperty?.price === "number"
                  ? contentProperty.price
                  : typeof (structured as Record<string, unknown>).numbers ===
                        "object" &&
                      (structured as Record<string, unknown>).numbers !== null
                    ? Number(
                        ((structured as Record<string, unknown>).numbers as Record<string, unknown>)
                          .askingPrice ?? 0,
                      ) || undefined
                    : undefined,
              size:
                typeof contentProperty?.size === "number"
                  ? contentProperty.size
                  : undefined,
              bedrooms:
                typeof contentProperty?.bedrooms === "number"
                  ? contentProperty.bedrooms
                  : undefined,
              bathrooms:
                typeof contentProperty?.bathrooms === "number"
                  ? contentProperty.bathrooms
                  : undefined,
              developer: contentSource?.developer
                ? String(contentSource.developer)
                : undefined,
              expectedRent:
                typeof (structured as Record<string, unknown>).numbers ===
                    "object" &&
                  (structured as Record<string, unknown>).numbers !== null
                  ? Number(
                      ((structured as Record<string, unknown>).numbers as Record<string, unknown>)
                        .estimatedMonthlyRent ?? 0,
                    ) * 12 || undefined
                  : undefined,
              currency: "AED",
              handoverDate: contentSource?.handoverDate
                ? String(contentSource.handoverDate)
                : undefined,
            }),
          })

          const listingPayload = await listingRes.json().catch(() => ({}))
          if (!listingRes.ok) {
            throw new Error(
              (listingPayload as { error?: string }).error ||
                "Failed to create listing for investor opportunity",
            )
          }
          resolvedListingId = (listingPayload as { id?: string }).id
        }

        if (!resolvedListingId) {
          throw new Error("Could not resolve a listing to create investor opportunities")
        }

        const results = await Promise.allSettled(
          investorIds.map(async (investorId) => {
            const memoCreateRes = await fetch("/api/memos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                investorId,
                listingId: resolvedListingId,
                content: latestContent,
                state: "sent",
              }),
            })
            const memoCreatePayload = await memoCreateRes.json().catch(() => ({}))
            if (!memoCreateRes.ok) {
              throw new Error(
                (memoCreatePayload as { error?: string }).error ||
                  `Failed to share memo with investor ${investorId}`,
              )
            }

            const createdMemoId =
              (memoCreatePayload as { id?: string; memo?: { id?: string } }).id ||
              (memoCreatePayload as { id?: string; memo?: { id?: string } }).memo?.id

            const oppRes = await fetch(`/api/investors/${investorId}/opportunities`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                listingId: resolvedListingId,
                sharedMessage: notes || "Shared from Property Intake",
                memoId: createdMemoId,
                status: "recommended",
              }),
            })
            const oppPayload = await oppRes.json().catch(() => ({}))
            if (!oppRes.ok) {
              throw new Error(
                (oppPayload as { error?: string }).error ||
                  `Failed to create opportunity for investor ${investorId}`,
              )
            }

            return investorId
          }),
        )

        const succeeded = results.filter((r) => r.status === "fulfilled").length
        const failed = results.length - succeeded

        if (succeeded > 0 && failed === 0) {
          toast.success("IC memo shared", {
            description: `Saved for ${succeeded} investor${succeeded === 1 ? "" : "s"}.`,
          })
        } else if (succeeded > 0) {
          toast.warning("IC memo partially shared", {
            description: `${succeeded} succeeded, ${failed} failed.`,
          })
        } else {
          toast.error("Failed to share IC memo", {
            description: "No investor records were updated.",
          })
        }
      } catch (err) {
        toast.error("Failed to share IC memo", {
          description: err instanceof Error ? err.message : "Unexpected error",
        })
      } finally {
        setIsSharingMemo(false)
      }
    },
    [savedMemoId, notes],
  )

  if (!mounted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Property Intake" subtitle="Evaluate built or off-plan properties from URLs or developer brochures" />
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Intake"
        subtitle="Evaluate built or off-plan properties from URLs or developer brochures"
        primaryAction={
          (activeTab === "portal" && showPortalReset) ? (
            <div className="flex items-center gap-2">
              {(step === "evaluated" || step === "saving") && property && (
                <MemoPdfExport
                  title={property.title}
                  memoId={savedMemoId || undefined}
                  intakeReportPayload={portalReportPayload}
                />
              )}
              <Button variant="outline" onClick={resetPortal}>Start Over</Button>
            </div>
          ) : (activeTab === "offplan" && showOffplanReset) ? (
            <div className="flex items-center gap-2">
              {(offplanStep === "evaluated" || offplanStep === "saving") && offplanProject && selectedOffplanUnits[0] && (
                <MemoPdfExport
                  title={`${offplanProject.projectName} - ${selectedOffplanUnits[0].unitNumber}`}
                  memoId={offplanSavedMemoId || undefined}
                  intakeReportPayload={offplanReportPayload}
                />
              )}
              <Button variant="outline" onClick={resetOffplan}>Start Over</Button>
            </div>
          ) : undefined
        }
      />

      {/* Main Tabs */}
      <Tabs id="property-intake-tabs" value={activeTab} onValueChange={(v) => setActiveTab(v as "portal" | "offplan")} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="portal" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Built Properties
          </TabsTrigger>
          <TabsTrigger value="offplan" className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            Off-Plan
          </TabsTrigger>
        </TabsList>

        {/* Built Properties Tab */}
        <TabsContent value="portal" className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={step === "input" || step === "extracting" ? "font-semibold text-green-600" : ""}>1. Enter Property</span>
            <ArrowRight className="h-4 w-4" />
            <span className={step === "extracted" || step === "evaluating" ? "font-semibold text-green-600" : ""}>2. Extract Data</span>
            <ArrowRight className="h-4 w-4" />
            <span className={step === "evaluated" || step === "saving" ? "font-semibold text-green-600" : ""}>3. AI Evaluation</span>
            <ArrowRight className="h-4 w-4" />
            <span className={step === "saved" ? "font-semibold text-green-600" : ""}>4. Save Memo</span>
          </div>

          {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Step 1: URL or PDF Input */}
      {(step === "input" || step === "extracting") && (
        <div className="space-y-4">
          {/* URL Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-green-600" />
                Enter Property URL
              </CardTitle>
              <CardDescription>
                Paste a link from Bayut, PropertyFinder, or Dubizzle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Property URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.bayut.com/property/details-123456.html"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={step === "extracting"}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => extractProperty(url)} disabled={step === "extracting" || !url.trim()} className="flex-1">
                  {step === "extracting" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting with AI...</>
                  ) : (
                    <><Building2 className="mr-2 h-4 w-4" />Extract Property</>
                  )}
                </Button>
                {step === "extracting" && (
                  <Button variant="outline" onClick={resetPortal}>
                    Cancel
                  </Button>
                )}
              </div>
              
              {/* Alternative extraction method */}
              {error && error.includes("blocking") && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-800 mb-2">Alternative: Copy Page Content</h4>
                  <ol className="text-sm text-amber-700 space-y-1 mb-3">
                    <li>1. Open the Bayut listing in a new tab</li>
                    <li>2. Press <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-xs">Ctrl+A</kbd> to select all</li>
                    <li>3. Press <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-xs">Ctrl+C</kbd> to copy</li>
                    <li>4. Click the button below</li>
                  </ol>
                  <Button 
                    variant="outline" 
                    onClick={handlePasteContent}
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Extract from Clipboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or upload a PDF</span>
            </div>
          </div>

          {/* PDF Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-600" />
                Upload Property Brochure
              </CardTitle>
              <CardDescription>
                Upload a single-property PDF brochure or sales document. AI will extract the property details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BuiltPropertyPdfUpload
                onFileSelected={parseBuiltPdf}
                isProcessing={step === "extracting"}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Off-plan detection banner */}
      {offplanDetected && step === "extracted" && property && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <HardHat className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Off-plan property detected</p>
                <p className="text-sm text-amber-700">
                  This property appears to be off-plan / under construction. For a more accurate analysis with payment plan projections and handover timeline, use the Off-Plan tab.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={dismissOffplanDetected} className="border-amber-300 text-amber-700 hover:bg-amber-100">
                Continue here
              </Button>
              <Button size="sm" onClick={switchToOffplanWithUrl} className="bg-amber-600 hover:bg-amber-700 text-white">
                Switch to Off-Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Extracted Property Review */}
      {(step === "extracted" || step === "evaluating") && property && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{property.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {property.area}{property.subArea && `, ${property.subArea}`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">{property.source}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.images.length > 0 ? (
                  <div className="relative h-48 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={property.images[0]}
                      alt={property.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                      unoptimized
                      onError={(e) => {
                        // Replace broken image with a placeholder icon
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          e.currentTarget.style.display = "none"
                          parent.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>'
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative h-48 overflow-hidden rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Price</span><div className="font-semibold">{formatAED(property.price)}</div></div>
                  <div><span className="text-gray-500">Price/sqft</span><div className="font-semibold">{property.pricePerSqft ? `AED ${property.pricePerSqft.toLocaleString()}` : "N/A"}</div></div>
                  <div><span className="text-gray-500">Size</span><div className="font-semibold">{property.size ? `${property.size.toLocaleString()} sqft` : "N/A"}</div></div>
                  <div><span className="text-gray-500">Type</span><div className="font-semibold">{property.propertyType}</div></div>
                  <div><span className="text-gray-500">Bedrooms</span><div className="font-semibold">{property.bedrooms}</div></div>
                  <div><span className="text-gray-500">Bathrooms</span><div className="font-semibold">{property.bathrooms}</div></div>
                  {property.furnished && (
                    <div><span className="text-gray-500">Furnished</span><div className="font-semibold">Yes</div></div>
                  )}
                  {property.parking != null && property.parking > 0 && (
                    <div><span className="text-gray-500">Parking</span><div className="font-semibold">{property.parking} {property.parking === 1 ? "space" : "spaces"}</div></div>
                  )}
                  {property.totalParkingSpaces != null && property.totalParkingSpaces > 0 && (
                    <div><span className="text-gray-500">Building Parking</span><div className="font-semibold">{property.totalParkingSpaces} total</div></div>
                  )}
                  {property.completionStatus && property.completionStatus !== "unknown" && (
                    <div><span className="text-gray-500">Status</span><div className="font-semibold capitalize">{property.completionStatus.replace(/_/g, " ")}</div></div>
                  )}
                  {property.developer && (
                    <div><span className="text-gray-500">Developer</span><div className="font-semibold">{property.developer}</div></div>
                  )}
                  {property.handoverDate && (
                    <div><span className="text-gray-500">Handover</span><div className="font-semibold">{property.handoverDate}</div></div>
                  )}
                  {property.buildingName && (
                    <div><span className="text-gray-500">Building</span><div className="font-semibold">{property.buildingName}</div></div>
                  )}
                  {property.buildingFloors && (
                    <div><span className="text-gray-500">Building Floors</span><div className="font-semibold">{property.buildingFloors}</div></div>
                  )}
                  {property.plotSize && (
                    <div><span className="text-gray-500">Plot Size</span><div className="font-semibold">{property.plotSize.toLocaleString()} sqft</div></div>
                  )}
                  {property.serviceCharge != null && property.serviceCharge > 0 && (
                    <div><span className="text-gray-500">Service Charge</span><div className="font-semibold">AED {property.serviceCharge}/sqft</div></div>
                  )}
                  {property.referenceNumber && (
                    <div><span className="text-gray-500">Reference</span><div className="font-semibold">{property.referenceNumber}</div></div>
                  )}
                  {property.permitNumber && (
                    <div><span className="text-gray-500">Permit No.</span><div className="font-semibold text-xs">{property.permitNumber}</div></div>
                  )}
                  {property.verified && (
                    <div><span className="text-gray-500">Verified</span><div className="font-semibold text-green-600">Yes{property.verifiedDate ? ` (${property.verifiedDate})` : ""}</div></div>
                  )}
                </div>
                {property.amenities.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">Amenities</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {property.amenities.slice(0, 12).map((a, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                      ))}
                      {property.amenities.length > 12 && (
                        <Badge variant="secondary" className="text-xs">+{property.amenities.length - 12} more</Badge>
                      )}
                    </div>
                  </div>
                )}
                {property.paymentPlan && (
                  <div className="text-sm">
                    <span className="text-gray-500">Payment Plan</span>
                    <div className="flex gap-3 mt-1 text-xs">
                      {property.paymentPlan.downPaymentPercent != null && <span className="font-medium">{property.paymentPlan.downPaymentPercent}% Down</span>}
                      {property.paymentPlan.preHandoverPercent != null && <span className="font-medium">{property.paymentPlan.preHandoverPercent}% Pre-Handover</span>}
                      {property.paymentPlan.handoverPercent != null && <span className="font-medium">{property.paymentPlan.handoverPercent}% Handover</span>}
                      {property.paymentPlan.postHandoverPercent != null && <span className="font-medium">{property.paymentPlan.postHandoverPercent}% Post-Handover</span>}
                    </div>
                  </div>
                )}
                {property.listingUrl && (
                  <a href={property.listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline">
                    View on {property.source}<ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>

            {/* CMA Panel - Auto-loads DLD data */}
            <div className="space-y-4">
              <CMAPanel
                area={property.area}
                propertyType={property.propertyType}
                bedrooms={property.bedrooms}
                sizeSqft={property.size}
                askingPrice={property.price}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    AI Evaluation
                  </CardTitle>
                  <CardDescription>Comprehensive investment analysis powered by AI</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-gray-50 p-4">
                    <h4 className="font-semibold">What will be generated:</h4>
                    <ul className="mt-2 space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Executive Summary & Investment Thesis</span></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Neighborhood & Market Analysis</span></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Pricing, Comparables & Financial Analysis</span></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Strategy, Risks & Recommendation</span></li>
                    </ul>
                  </div>
                  {step === "evaluating" ? (
                    <div className="w-full space-y-3">
                      <Button disabled className="w-full" size="lg">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating IC Memo...
                      </Button>
                      <EvaluationTimer estimatedSeconds={35} area={property?.area} />
                    </div>
                  ) : (
                    <Button onClick={evaluateProperty} className="w-full" size="lg">
                      <Sparkles className="mr-2 h-4 w-4" />Generate IC Memo
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Full IC Memo Display */}
      {(step === "evaluated" || step === "saving" || step === "saved") && property && evaluation && analysis && (
        <div className="space-y-6">
          {/* Header with Score */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold truncate">{property.title}</h2>
                {getRecommendationBadge(evaluation.recommendation)}
                <Badge variant="outline">Score: {evaluation.overallScore}/100</Badge>
              </div>
              <p className="text-gray-600">{evaluation.headline}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3 space-y-6">
              {/* Property Photos */}
              {property.images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Property Photos</CardTitle>
                    <CardDescription>Extracted from listing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {property.images.slice(0, 6).map((img, idx) => (
                        <div key={idx} className="relative h-40 overflow-hidden rounded-lg border bg-gray-50">
                          <Image
                            src={img}
                            alt={`${property.title} photo ${idx + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            unoptimized
                            onError={(e) => { e.currentTarget.style.display = "none" }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Executive Summary */}
              <AnalysisSection title="Executive Summary" description="How this property meets investment criteria">
                <p className="text-gray-600">{analysis.summary}</p>
                {analysis.keyPoints?.length > 0 && (
                  <ul className="space-y-2 text-sm leading-6 text-gray-900">
                    {analysis.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AnalysisSection>

              {/* Neighborhood Analysis */}
              <AnalysisSection title="Neighborhood Analysis" description={analysis.neighborhood.name}>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="uppercase">Grade {analysis.neighborhood.grade}</Badge>
                </div>
                <p className="text-gray-600">{analysis.neighborhood.profile}</p>
                {analysis.neighborhood.metrics?.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {analysis.neighborhood.metrics.map((metric, idx) => (
                      <StatTile key={idx} label={metric.label} value={metric.value} hint={metric.trend} />
                    ))}
                  </div>
                )}
                {analysis.neighborhood.highlights?.length > 0 && (
                  <ul className="space-y-2 text-sm text-gray-900">
                    {analysis.neighborhood.highlights.map((h, idx) => (
                      <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground" /><span>{h}</span></li>
                    ))}
                  </ul>
                )}
              </AnalysisSection>

              {/* Property Description */}
              <AnalysisSection title="Property Description" description={analysis.property.condition}>
                <p className="text-gray-600">{analysis.property.description}</p>
                {analysis.property.specs?.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {analysis.property.specs.map((spec, idx) => (
                      <div key={idx} className="rounded-lg border bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500">{spec.label}</p>
                        <p className="text-base font-semibold">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {analysis.property.highlights?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Highlights</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {analysis.property.highlights.map((h, idx) => (
                        <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" /><span>{h}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </AnalysisSection>

              {/* Market Analysis */}
              <AnalysisSection title="Market Analysis" description="Demand & supply signals">
                <p className="text-gray-600">{analysis.market.overview}</p>
                {analysis.market.drivers?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Key drivers</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {analysis.market.drivers.map((d, idx) => (
                        <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground" /><span>{d}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <StatTile label="Supply" value={analysis.market.supply} hint="Pipeline view" />
                  <StatTile label="Demand" value={analysis.market.demand} hint="Tenant profile" />
                  <StatTile label="Absorption" value={analysis.market.absorption} hint="Last 12 months" />
                </div>
              </AnalysisSection>

              {/* Future Value Outlook */}
              <AnalysisSection title="Future Value Outlook" description="Neighborhood-led value growth scenarios">
                <p className="text-gray-600">
                  {growth?.narrative ||
                    "Future value outlook is anchored on neighborhood trend, liquidity and demand resilience. Final projections are refined as additional comp and transaction data is ingested."}
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <StatTile
                    label="Projected 1Y Value"
                    value={formatCurrency(growth?.projectedValue1Y ?? Math.round(analysis.pricing.stabilizedValue * 1.04))}
                  />
                  <StatTile
                    label="Projected 3Y Value"
                    value={formatCurrency(growth?.projectedValue3Y ?? Math.round(analysis.pricing.stabilizedValue * 1.13))}
                  />
                  <StatTile
                    label="Projected 5Y Value"
                    value={formatCurrency(growth?.projectedValue5Y ?? Math.round(analysis.pricing.stabilizedValue * 1.22))}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <StatTile
                    label="Base Growth"
                    value={`${(growth?.annualGrowthBase ?? 4.0).toFixed(1)}% / year`}
                    hint="Underwriting base case"
                  />
                  <StatTile
                    label="Conservative"
                    value={`${(growth?.annualGrowthConservative ?? 2.0).toFixed(1)}% / year`}
                    hint="Downside case"
                  />
                  <StatTile
                    label="Upside"
                    value={`${(growth?.annualGrowthUpside ?? 6.0).toFixed(1)}% / year`}
                    hint="Upside case"
                  />
                </div>
                {growth?.drivers?.length ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Growth drivers</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {growth.drivers.map((driver, idx) => (
                        <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" /><span>{driver}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {growth?.sensitivities?.length ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Key sensitivities</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {growth.sensitivities.map((risk, idx) => (
                        <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground" /><span>{risk}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </AnalysisSection>

              {/* Pricing & Upside */}
              <AnalysisSection title="Pricing & Upside" description="Actual vs potential value">
                {/* Price Comparison Chart */}
                <div className="rounded-lg border bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Price Comparison</h4>
                  <PriceComparisonChart
                    askingPrice={analysis.pricing.askingPrice}
                    recommendedOffer={analysis.pricing.recommendedOffer}
                    stabilizedValue={analysis.pricing.stabilizedValue}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <StatTile label="Asking Price" value={formatCurrency(analysis.pricing.askingPrice)} />
                  <StatTile label="Recommended Offer" value={formatCurrency(analysis.pricing.recommendedOffer)} />
                  <StatTile label="Stabilized Value" value={formatCurrency(analysis.pricing.stabilizedValue)} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <StatTile label="Price / sq ft" value={formatPerSqft(analysis.pricing.pricePerSqft ?? undefined)} hint="Subject" />
                  <StatTile label="Value-add budget" value={formatCurrency(analysis.pricing.valueAddBudget)} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">In-place rent</p>
                    <p className="text-xl font-semibold">{formatCurrency(analysis.pricing.rentCurrent)}</p>
                    <p className="text-sm text-gray-500">Stabilized: {formatCurrency(analysis.pricing.rentPotential)}</p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Projected returns</p>
                    <p className="text-xl font-semibold">{formatPercent(analysis.pricing.irr)}</p>
                    <p className="text-sm text-gray-500">Equity multiple: {analysis.pricing.equityMultiple?.toFixed(2) ?? "—"}x</p>
                  </div>
                </div>
              </AnalysisSection>

              {/* Comparable Sales */}
              {analysis.comparables?.length > 0 && (
                <AnalysisSection title="Comparable Sales" description="Recent reference trades">
                  <div className="space-y-3">
                    {analysis.comparables.map((comp, idx) => (
                      <div key={idx} className="rounded-lg border bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                          <span>{comp.name}</span>
                          <span className="text-gray-500">{comp.distance}</span>
                        </div>
                        <p className="text-xs uppercase text-gray-500">{comp.closingDate}</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div><p className="text-xs uppercase text-gray-500">Price</p><p className="text-base font-semibold">{formatCurrency(comp.price)}</p></div>
                          <div><p className="text-xs uppercase text-gray-500">Size</p><p className="text-base font-semibold">{comp.size}</p></div>
                          <div><p className="text-xs uppercase text-gray-500">Price / sq ft</p><p className="text-base font-semibold">{formatPerSqft(comp.pricePerSqft)}</p></div>
                        </div>
                        {comp.note && <p className="mt-2 text-sm text-gray-500">{comp.note}</p>}
                      </div>
                    ))}
                  </div>
                </AnalysisSection>
              )}

              {/* Strategy & Execution */}
              <AnalysisSection title="Strategy & Execution" description={`${analysis.strategy.holdPeriod} • ${analysis.strategy.exit}`}>
                <p className="text-gray-600">{analysis.strategy.plan}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {analysis.strategy.focusPoints.map((point, idx) => (
                    <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" /><span>{point}</span></li>
                  ))}
                </ul>
              </AnalysisSection>

              {/* Investment Thesis & Financial Analysis */}
              <div className="grid gap-6 md:grid-cols-2">
                <AnalysisSection title="Investment Thesis">
                  <p className="text-gray-600">{analysis.investmentThesis}</p>
                </AnalysisSection>
                <AnalysisSection title="Financial Analysis">
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-gray-500">Current NOI:</span><span className="font-semibold">{formatCurrency(analysis.financialAnalysis.noi)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Cap Rate:</span><span className="font-semibold">{analysis.financialAnalysis.capRate}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Target IRR:</span><span className="font-semibold">{analysis.financialAnalysis.targetIrr}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Hold Period:</span><span className="font-semibold">{analysis.financialAnalysis.holdPeriod}</span></div>
                  </div>
                </AnalysisSection>
              </div>

              {/* ROI on Equity Bridge */}
              <AnalysisSection title="ROI on Equity Bridge" description="Levered return stack (same assumptions used in PDF)">
                {analysis.financialAnalysis.returnBridge ? (
                  <div className="space-y-2">
                    {[
                      { label: "Purchase price", value: formatCurrency(analysis.financialAnalysis.returnBridge.purchasePrice) },
                      { label: "DLD fee", value: formatCurrency(analysis.financialAnalysis.returnBridge.dldFee) },
                      { label: "DLD fee rate", value: `${analysis.financialAnalysis.returnBridge.dldRatePct.toFixed(1)}%` },
                      { label: "Broker fee", value: formatCurrency(analysis.financialAnalysis.returnBridge.brokerFee) },
                      { label: "Broker fee rate", value: `${analysis.financialAnalysis.returnBridge.brokerFeePct.toFixed(1)}%` },
                      { label: "Renovation", value: formatCurrency(analysis.financialAnalysis.returnBridge.renovation) },
                      { label: "Total project cost", value: formatCurrency(analysis.financialAnalysis.returnBridge.totalProjectCost) },
                      { label: "Mortgage amount", value: formatCurrency(analysis.financialAnalysis.returnBridge.mortgageAmount) },
                      { label: "Mortgage LTV", value: `${analysis.financialAnalysis.returnBridge.mortgageLtvPct.toFixed(1)}%` },
                      { label: "Equity invested", value: formatCurrency(analysis.financialAnalysis.returnBridge.equityInvested) },
                      { label: "Annual interest", value: formatCurrency(analysis.financialAnalysis.returnBridge.annualInterest) },
                      { label: "Interest rate", value: `${analysis.financialAnalysis.returnBridge.annualInterestRatePct.toFixed(1)}%` },
                      { label: "Resale price", value: formatCurrency(analysis.financialAnalysis.returnBridge.resalePrice) },
                      { label: "Net sale proceeds after mortgage repayment", value: formatCurrency(analysis.financialAnalysis.returnBridge.netSaleProceedsAfterMortgage) },
                      { label: "Net profit (after interest)", value: formatCurrency(analysis.financialAnalysis.returnBridge.netProfitAfterInterest) },
                      { label: "ROI on equity", value: `${analysis.financialAnalysis.returnBridge.roiOnEquityPct.toFixed(1)}%` },
                    ].map((row) => (
                      <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border bg-gray-50 px-3 py-2">
                        <p className="text-sm text-gray-600">{row.label}</p>
                        <p className="text-sm font-semibold text-gray-900">{row.value}</p>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">{analysis.financialAnalysis.returnBridge.assumptions}</p>
                  </div>
                ) : (
                  <p className="text-gray-600">Return bridge will be available once financing assumptions are confirmed.</p>
                )}
              </AnalysisSection>

              {/* Risks & Mitigations */}
              <AnalysisSection title="Risks & Mitigations">
                <div className="space-y-3">
                  {analysis.risks.map((r, idx) => (
                    <div key={idx} className="flex gap-2 text-sm">
                      <span className="font-semibold text-gray-900">{idx + 1}.</span>
                      <span><span className="text-gray-700">{r.risk}</span> - <span className="text-gray-500">{r.mitigation}</span></span>
                    </div>
                  ))}
                </div>
              </AnalysisSection>

              {/* Recommendation */}
              <Card className={analysis.finalRecommendation.decision === "PROCEED" ? "border-green-200 bg-green-50" : analysis.finalRecommendation.decision === "CONDITIONAL" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}>
                <CardHeader>
                  <CardTitle className="text-lg">Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{analysis.finalRecommendation.decision}</p>
                  <p className="text-gray-600">{analysis.finalRecommendation.condition}</p>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Investor Matching — top of sidebar */}
              <InvestorMatchingPanel
                property={{
                  title: property.title,
                  price: property.price,
                  area: property.area,
                  propertyType: property.propertyType,
                  bedrooms: property.bedrooms,
                  yieldPotential: marketContext?.areaAverageYield,
                }}
                investors={investors}
                isSharing={isSharingMemo}
                onShare={handleShareMemoToInvestors}
              />

              {step !== "saved" && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-5 w-5 text-green-600" />
                      Save as IC Memo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea id="notes" placeholder="Add notes..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={step === "saving"} />
                    </div>
                    <Button onClick={saveMemo} disabled={step === "saving"} className="w-full">
                      {step === "saving" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Save to IC Memos</>}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* AI Chat Widget */}
              <PropertyAIChat
                property={{
                  title: property.title,
                  area: property.area,
                  price: property.price,
                  pricePerSqft: property.pricePerSqft,
                  size: property.size,
                  bedrooms: property.bedrooms,
                  propertyType: property.propertyType,
                  description: property.description,
                }}
                evaluation={{
                  overallScore: evaluation.overallScore,
                  recommendation: evaluation.recommendation,
                  headline: evaluation.headline,
                  reasoning: evaluation.reasoning,
                  keyStrengths: evaluation.keyStrengths,
                  considerations: evaluation.considerations,
                }}
              />

              <AIScoreReveal
                overallScore={evaluation.overallScore}
                factors={evaluation.factors}
                recommendation={evaluation.recommendation}
                headline={evaluation.headline}
                onComplete={() => setScoreRevealComplete(true)}
              />

              {scoreRevealComplete && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detailed Score Breakdown</CardTitle>
                    <CardDescription>Radar chart view</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScoreRadarChart
                      data={[
                        { factor: "Mandate Fit", score: evaluation.factors.mandateFit, maxScore: 25 },
                        { factor: "Market Timing", score: evaluation.factors.marketTiming, maxScore: 25 },
                        { factor: "Portfolio Fit", score: evaluation.factors.portfolioFit, maxScore: 25 },
                        { factor: "Risk Alignment", score: evaluation.factors.riskAlignment, maxScore: 25 },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}

              {step === "saved" && savedMemoId && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="py-6 text-center space-y-4">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">IC Memo Saved!</h3>
                      <p className="text-sm text-green-700">Ready for review.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button asChild><Link href={`/memos/${savedMemoId}`}>View Memo</Link></Button>
                      <Button variant="outline" onClick={resetPortal}>Evaluate Another</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Source</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Portal</span><span className="font-medium capitalize">{property.source}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Listing ID</span><span className="font-medium">{property.listingId || "—"}</span></div>
                  {property.referenceNumber && (
                    <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-medium">{property.referenceNumber}</span></div>
                  )}
                  {property.permitNumber && (
                    <div className="flex justify-between"><span className="text-gray-500">Permit No.</span><span className="font-medium text-xs">{property.permitNumber}</span></div>
                  )}
                  {property.verified && (
                    <div className="flex justify-between"><span className="text-gray-500">Verified</span><span className="font-medium text-green-600">Yes</span></div>
                  )}
                  {property.developer && (
                    <>
                      <Separator />
                      <div className="flex justify-between"><span className="text-gray-500">Developer</span><span className="font-medium">{property.developer}</span></div>
                    </>
                  )}
                  {property.completionStatus && property.completionStatus !== "unknown" && (
                    <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium capitalize">{property.completionStatus.replace(/_/g, " ")}</span></div>
                  )}
                  {property.handoverDate && (
                    <div className="flex justify-between"><span className="text-gray-500">Handover</span><span className="font-medium">{property.handoverDate}</span></div>
                  )}
                  <Separator />
                  <a href={property.listingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:underline">
                    View Original<ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
        </TabsContent>

        {/* Off-Plan Tab */}
        <TabsContent value="offplan" className="space-y-6">
          {/* Off-Plan Step indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={offplanStep === "upload" || offplanStep === "input" ? "font-semibold text-green-600" : ""}>1. Enter Property</span>
            <ArrowRight className="h-4 w-4" />
            <span className={offplanStep === "extracted" || offplanStep === "selecting" ? "font-semibold text-green-600" : ""}>2. Review Property</span>
            <ArrowRight className="h-4 w-4" />
            <span className={offplanStep === "evaluating" || offplanStep === "evaluated" || offplanStep === "saving" ? "font-semibold text-green-600" : ""}>3. AI Evaluation</span>
            <ArrowRight className="h-4 w-4" />
            <span className={offplanStep === "saved" ? "font-semibold text-green-600" : ""}>4. Save Memo</span>
          </div>

          {/* Off-Plan Error */}
          {offplanError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700">{offplanError}</span>
              </CardContent>
            </Card>
          )}

          {/* Off-Plan Step 1: URL or PDF Upload */}
          {(offplanStep === "input" || offplanStep === "upload") && (
            <div className="space-y-4">
              {/* URL Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-green-600" />
                    Enter Off-Plan Property URL
                  </CardTitle>
                  <CardDescription>
                    Paste a link from Bayut, PropertyFinder, or Dubizzle for an off-plan / under-construction property
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="offplan-url">Property URL</Label>
                    <Input
                      id="offplan-url"
                      type="url"
                      placeholder="https://www.bayut.com/property/details-123456.html"
                      value={offplanUrl}
                      onChange={(e) => setOffplanUrl(e.target.value)}
                      disabled={offplanStep === "upload"}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => extractPropertyForOffplan(offplanUrl)}
                      disabled={offplanStep === "upload" || !offplanUrl.trim()}
                      className="flex-1"
                    >
                      {offplanStep === "upload" ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting with AI...</>
                      ) : (
                        <><HardHat className="mr-2 h-4 w-4" />Extract Off-Plan Property</>
                      )}
                    </Button>
                    {offplanStep === "upload" && (
                      <Button variant="outline" onClick={resetOffplan}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or upload a PDF</span>
                </div>
              </div>

              {/* PDF Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-green-600" />
                    Upload Developer Brochure
                  </CardTitle>
                  <CardDescription>
                    Upload PDF brochures from developers including availability sheets and sales offers.
                    Claude Opus 4.5 will analyze them directly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PdfUploadZone
                    onFilesExtracted={handlePdfExtracted}
                    onError={setOffplanError}
                    maxSizeMB={20}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Off-Plan Step 2: Project Overview & Unit Selection */}
          {(offplanStep === "extracted" || offplanStep === "selecting" || offplanStep === "evaluating") && offplanProject && offplanPaymentPlan && (
            <div className="space-y-6">

              {/* ── Single-unit layout (URL extraction) ── */}
              {offplanUnits.length <= 1 && selectedOffplanUnits.length === 1 ? (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left: Property Card */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{offplanProject.projectName}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <Building2 className="h-4 w-4" />
                              by {offplanProject.developer}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="capitalize">{offplanProject.propertyType}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Property image (from original extracted property) */}
                        {property && property.images.length > 0 ? (
                          <div className="relative h-48 overflow-hidden rounded-lg bg-muted">
                            <Image
                              src={property.images[0]}
                              alt={offplanProject.projectName}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 600px"
                              unoptimized
                              onError={(e) => {
                                const parent = e.currentTarget.parentElement
                                if (parent) {
                                  e.currentTarget.style.display = "none"
                                  parent.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>'
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="relative h-48 overflow-hidden rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          </div>
                        )}

                        {/* Key details grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-gray-500">Price</span><div className="font-semibold">AED {selectedOffplanUnits[0].totalPrice.toLocaleString()}</div></div>
                          <div><span className="text-gray-500">Price/sqft</span><div className="font-semibold">AED {selectedOffplanUnits[0].pricePerSqft.toLocaleString()}</div></div>
                          <div><span className="text-gray-500">Size</span><div className="font-semibold">{selectedOffplanUnits[0].sizeSqft.toLocaleString()} sqft</div></div>
                          <div><span className="text-gray-500">Type</span><div className="font-semibold">{selectedOffplanUnits[0].type}</div></div>
                          <div>
                            <span className="text-gray-500">Location</span>
                            <div className="font-semibold">
                              {offplanProject.location.area}
                              {offplanProject.location.subArea && `, ${offplanProject.location.subArea}`}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Completion</span>
                            <div className="font-semibold flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-blue-600" />
                              {offplanProject.completionDate || "TBC"}
                            </div>
                          </div>
                          {offplanProject.developer && (
                            <div><span className="text-gray-500">Developer</span><div className="font-semibold">{offplanProject.developer}</div></div>
                          )}
                          {offplanProject.totalLevels > 0 && (
                            <div><span className="text-gray-500">Building Floors</span><div className="font-semibold">{offplanProject.totalLevels}</div></div>
                          )}
                          {selectedOffplanUnits[0].parking != null && selectedOffplanUnits[0].parking > 0 && (
                            <div><span className="text-gray-500">Parking</span><div className="font-semibold">{selectedOffplanUnits[0].parking} {selectedOffplanUnits[0].parking === 1 ? "space" : "spaces"}</div></div>
                          )}
                          {selectedOffplanUnits[0].views && (
                            <div><span className="text-gray-500">Views</span><div className="font-semibold">{selectedOffplanUnits[0].views}</div></div>
                          )}
                        </div>

                        {/* Amenities */}
                        {offplanProject.amenities.length > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-500">Amenities</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {offplanProject.amenities.slice(0, 12).map((a, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                              ))}
                              {offplanProject.amenities.length > 12 && (
                                <Badge variant="secondary" className="text-xs">+{offplanProject.amenities.length - 12} more</Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Payment Plan summary */}
                        <div className="text-sm">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> Payment Plan
                          </span>
                          <div className="mt-2 space-y-1.5">
                            {offplanPaymentPlan.milestones.map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{m.description}</span>
                                <Badge variant="secondary" className="text-xs">{m.percentage}%</Badge>
                              </div>
                            ))}
                            {offplanPaymentPlan.dldFeePercent > 0 && (
                              <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t">
                                <span>DLD Registration Fee</span>
                                <span>{offplanPaymentPlan.dldFeePercent}% (on SPA signing)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Original listing link */}
                        {property?.listingUrl && (
                          <a href={property.listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline">
                            View original listing<ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </CardContent>
                    </Card>

                    {/* Right: AI evaluation panel */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-green-600" />
                            AI Evaluation
                          </CardTitle>
                          <CardDescription>Off-plan investment analysis powered by AI</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-lg border bg-gray-50 p-4">
                            <h4 className="font-semibold">What will be generated:</h4>
                            <ul className="mt-2 space-y-2 text-sm text-gray-600">
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Executive Summary & Investment Thesis</span></li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Cash Flow Projection & Payment Schedule</span></li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Future Value Outlook & Risk Assessment</span></li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Strategy & Recommendation</span></li>
                            </ul>
                          </div>
                          {offplanStep === "evaluating" ? (
                            <div className="w-full space-y-3">
                              <Button disabled className="w-full" size="lg">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating IC Memo...
                              </Button>
                              <EvaluationTimer estimatedSeconds={35} area={offplanProject?.location.area} isOffplan />
                            </div>
                          ) : (
                            <Button onClick={evaluateOffplan} className="w-full" size="lg">
                              <Sparkles className="mr-2 h-4 w-4" />Generate Off-Plan IC Memo
                            </Button>
                          )}
                          <Button variant="outline" onClick={resetOffplan} disabled={offplanStep === "evaluating"} className="w-full">
                            Start Over
                          </Button>
                        </CardContent>
                      </Card>

                      {/* CMA Panel - DLD comparable data */}
                      {property && (
                        <CMAPanel
                          area={property.area}
                          propertyType={property.propertyType}
                          bedrooms={property.bedrooms}
                          sizeSqft={property.size}
                          askingPrice={property.price}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Multi-unit layout (PDF brochure) ── */
                <>
                  {/* Brochure page images rendered from uploaded PDFs */}
                  {offplanBrochureImages.length > 0 && (
                    <div className="grid gap-2" style={{ gridTemplateColumns: offplanBrochureImages.length === 1 ? "1fr" : offplanBrochureImages.length === 2 ? "1fr 1fr" : "2fr 1fr 1fr" }}>
                      {offplanBrochureImages.slice(0, 5).map((img, idx) => (
                        <div key={idx} className={`relative overflow-hidden rounded-lg bg-muted ${idx === 0 && offplanBrochureImages.length >= 3 ? "row-span-2" : ""}`} style={{ height: idx === 0 ? (offplanBrochureImages.length >= 3 ? "320px" : "200px") : "156px" }}>
                          <Image
                            src={img}
                            alt={`${offplanProject.projectName} brochure - page ${idx + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 600px"
                            unoptimized
                            onError={(e) => {
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                e.currentTarget.style.display = "none"
                                parent.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>'
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <OffPlanProjectOverview
                    project={offplanProject}
                    paymentPlan={offplanPaymentPlan}
                    stats={offplanStats || undefined}
                  />

                  <UnitSelectionTable
                    units={offplanUnits}
                    selectedUnits={selectedOffplanUnits}
                    onSelectionChange={setSelectedOffplanUnits}
                    maxSelection={5}
                  />

                  {/* Multi-Unit Comparison */}
                  {selectedOffplanUnits.length >= 2 && offplanProject && offplanPaymentPlan && (
                    <OffPlanUnitComparison
                      project={offplanProject}
                      units={selectedOffplanUnits}
                      paymentPlan={offplanPaymentPlan}
                      onSelectBest={(unit) => setSelectedOffplanUnits([unit])}
                    />
                  )}

                  {/* Evaluate Button */}
                  <div className="space-y-3">
                    <div className="flex justify-end gap-4">
                      <Button variant="outline" onClick={resetOffplan} disabled={offplanStep === "evaluating"}>
                        Start Over
                      </Button>
                      <Button
                        onClick={evaluateOffplan}
                        disabled={selectedOffplanUnits.length === 0 || offplanStep === "evaluating"}
                        size="lg"
                      >
                        {offplanStep === "evaluating" ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating IC Memo...</>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            {selectedOffplanUnits.length > 1
                              ? `Compare & Evaluate ${selectedOffplanUnits.length} Units`
                              : "Generate Off-Plan IC Memo"}
                          </>
                        )}
                      </Button>
                    </div>
                    {offplanStep === "evaluating" && <EvaluationTimer estimatedSeconds={35} area={offplanProject?.location.area} isOffplan />}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Off-Plan Step 3: Evaluation Display */}
          {(offplanStep === "evaluated" || offplanStep === "saving" || offplanStep === "saved") && 
            offplanProject && offplanPaymentPlan && offplanEvaluation && selectedOffplanUnits[0] && (
            <OffPlanMemoDisplay
              project={offplanProject}
              selectedUnit={selectedOffplanUnits[0]}
              paymentPlan={offplanPaymentPlan}
              evaluation={offplanEvaluation}
              onSave={saveOffplanMemo}
              onReset={resetOffplan}
              isSaving={offplanStep === "saving"}
              savedMemoId={offplanSavedMemoId}
              propertyImages={resolvedOffplanImages}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Simple single-file PDF upload for built-property brochures */
function BuiltPropertyPdfUpload({ onFileSelected, isProcessing }: { onFileSelected: (file: File) => void; isProcessing: boolean }) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return
    }
    setFileName(file.name)
    onFileSelected(file)
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        isProcessing ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-green-400 hover:bg-green-50/50 cursor-pointer"
      }`}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={isProcessing}
      />
      {isProcessing ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-sm font-medium text-green-700">Analyzing {fileName || "PDF"}...</p>
          <p className="text-xs text-muted-foreground">Extracting property details with AI</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
          <p className="text-xs text-muted-foreground">Single property brochure or sales document (max 20 MB)</p>
        </div>
      )}
    </div>
  )
}

function AnalysisSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">{children}</CardContent>
    </Card>
  )
}

function StatTile({ label, value, hint }: { label: string; value?: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-gray-50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-semibold">{value ?? "—"}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function buildPortalIntakeReportPayload(property: ExtractedProperty, evaluation: EvaluationResult, enhanced?: EnhancedPdfData | null): IntakeReportPayload {
  const analysis = evaluation.analysis
  const score = `${evaluation.overallScore}/100`
  const recommendation = `${evaluation.recommendation} (${analysis.finalRecommendation.decision})`
  const growth = analysis.growth
  const rb = analysis.financialAnalysis.returnBridge

  return {
    title: `IC Opportunity Report - ${property.title}`,
    subtitle: `${property.area}${property.subArea ? `, ${property.subArea}` : ""}`,
    generatedAt: new Date().toISOString(),
    score,
    recommendation,
    summary: `${evaluation.headline}. ${evaluation.reasoning}`,
    coverImageUrl: property.images[0],
    galleryImageUrls: property.images.slice(1, 4),
    floorPlanImageUrls: property.floorPlanImages?.length ? property.floorPlanImages : undefined,
    factors: evaluation.factors ? {
      mandateFit: evaluation.factors.mandateFit,
      marketTiming: evaluation.factors.marketTiming,
      portfolioFit: evaluation.factors.portfolioFit,
      riskAlignment: evaluation.factors.riskAlignment,
    } : undefined,
    mapImageUrl: buildStaticMapUrl(
      property.coordinates,
      `${property.area}${property.subArea ? `, ${property.subArea}` : ""}`,
    ),
    cashFlowTable: enhanced?.cashFlowTable,
    operatingExpenses: enhanced?.operatingExpenses,
    scenarios: enhanced?.scenarios,
    comparables: enhanced?.comparables,
    sections: [
      {
        title: "Property Snapshot",
        keyValues: [
          { label: "Property", value: property.title },
          { label: "Type", value: property.propertyType },
          { label: "Location", value: `${property.area}${property.subArea ? `, ${property.subArea}` : ""}` },
          ...(property.agentName ? [{ label: "Realtor", value: property.agentName }] : []),
          ...(property.agencyName ? [{ label: "Agency", value: property.agencyName }] : []),
          ...(property.buildingName ? [{ label: "Building", value: property.buildingName }] : []),
          { label: "Asking Price", value: formatCurrency(property.price) },
          { label: "Price / sq ft", value: property.pricePerSqft ? formatCurrency(property.pricePerSqft) : "N/A" },
          { label: "Size", value: property.size ? `${property.size.toLocaleString()} sq ft` : "N/A" },
          ...(property.plotSize ? [{ label: "Plot Size", value: `${property.plotSize.toLocaleString()} sq ft` }] : []),
          { label: "Bedrooms / Bathrooms", value: `${property.bedrooms} / ${property.bathrooms}` },
          { label: "Furnished", value: property.furnished ? "Yes" : "No" },
          ...(property.parking ? [{ label: "Parking", value: `${property.totalParkingSpaces ?? property.parking} space(s)` }] : []),
          ...(property.completionStatus && property.completionStatus !== "unknown" ? [{ label: "Status", value: property.completionStatus.replace(/_/g, " ") }] : []),
          ...(property.developer ? [{ label: "Developer", value: property.developer }] : []),
          ...(property.handoverDate ? [{ label: "Handover", value: property.handoverDate }] : []),
          ...(property.serviceCharge ? [{ label: "Service Charge", value: `AED ${property.serviceCharge}/sq ft` }] : []),
          ...(property.verified ? [{ label: "Verified", value: "Yes" }] : []),
        ],
      },
      {
        title: "Executive Summary",
        body: analysis.summary,
        bullets: analysis.keyPoints,
      },
      {
        title: "Recommended Candidate Status",
        body: "This property is being evaluated as a recommended candidate and is not marked as an acquired holding.",
        keyValues: [
          { label: "Recommendation Lane", value: "Recommended Candidate" },
          { label: "Portfolio Overlap", value: "No - candidate only" },
        ],
      },
      {
        title: "Portfolio Holdings Snapshot",
        keyValues: [
          { label: "Total Holdings", value: "N/A in intake context" },
          { label: "Current Portfolio Value", value: "N/A in intake context" },
        ],
      },
      {
        title: "Neighborhood Analysis",
        body: analysis.neighborhood.profile,
        keyValues: [
          { label: "Area", value: analysis.neighborhood.name },
          { label: "Grade", value: analysis.neighborhood.grade },
        ],
        bullets: analysis.neighborhood.highlights,
      },
      {
        title: "Market Analysis",
        body: analysis.market.overview,
        keyValues: [
          { label: "Supply", value: analysis.market.supply },
          { label: "Demand", value: analysis.market.demand },
          { label: "Absorption", value: analysis.market.absorption },
        ],
        bullets: analysis.market.drivers,
      },
      {
        title: "Pricing and Return Profile",
        keyValues: [
          { label: "Asking Price", value: formatCurrency(analysis.pricing.askingPrice) },
          { label: "Recommended Offer", value: formatCurrency(analysis.pricing.recommendedOffer) },
          { label: "Stabilized Value", value: formatCurrency(analysis.pricing.stabilizedValue) },
          { label: "Current Rent", value: formatCurrency(analysis.pricing.rentCurrent) },
          { label: "Potential Rent", value: formatCurrency(analysis.pricing.rentPotential) },
          { label: "IRR", value: formatPercent(analysis.pricing.irr) },
          {
            label: "Equity Multiple",
            value: typeof analysis.pricing.equityMultiple === "number" ? `${analysis.pricing.equityMultiple.toFixed(2)}x` : "N/A",
          },
        ],
      },
      {
        title: "ROI on Equity Bridge",
        keyValues: [
          { label: "Purchase price", value: formatCurrency(rb?.purchasePrice ?? analysis.pricing.askingPrice) },
          { label: "DLD fee", value: formatCurrency(rb?.dldFee ?? Math.round(analysis.pricing.askingPrice * 0.04)) },
          { label: "DLD fee rate", value: `${(rb?.dldRatePct ?? 4).toFixed(1)}%` },
          { label: "Broker fee", value: formatCurrency(rb?.brokerFee ?? Math.round(analysis.pricing.askingPrice * 0.02)) },
          { label: "Broker fee rate", value: `${(rb?.brokerFeePct ?? 2).toFixed(1)}%` },
          { label: "Renovation", value: formatCurrency(rb?.renovation ?? analysis.pricing.valueAddBudget) },
          {
            label: "Total project cost",
            value: formatCurrency(
              rb?.totalProjectCost ??
              (analysis.pricing.askingPrice +
                Math.round(analysis.pricing.askingPrice * 0.04) +
                Math.round(analysis.pricing.askingPrice * 0.02) +
                analysis.pricing.valueAddBudget),
            ),
          },
          { label: "Mortgage amount", value: formatCurrency(rb?.mortgageAmount ?? Math.round(analysis.pricing.askingPrice * 0.7)) },
          { label: "Mortgage LTV", value: `${(rb?.mortgageLtvPct ?? 70).toFixed(1)}%` },
          {
            label: "Equity invested",
            value: formatCurrency(
              rb?.equityInvested ??
              ((analysis.pricing.askingPrice +
                Math.round(analysis.pricing.askingPrice * 0.04) +
                Math.round(analysis.pricing.askingPrice * 0.02) +
                analysis.pricing.valueAddBudget) -
                Math.round(analysis.pricing.askingPrice * 0.7)),
            ),
          },
          { label: "Annual interest", value: formatCurrency(rb?.annualInterest ?? Math.round(analysis.pricing.askingPrice * 0.7 * 0.035)) },
          { label: "Interest rate", value: `${(rb?.annualInterestRatePct ?? 3.5).toFixed(1)}%` },
          { label: "Resale price", value: formatCurrency(rb?.resalePrice ?? (growth?.projectedValue5Y ?? analysis.pricing.stabilizedValue)) },
          {
            label: "Net sale proceeds after mortgage repayment",
            value: formatCurrency(
              rb?.netSaleProceedsAfterMortgage ??
              ((growth?.projectedValue5Y ?? analysis.pricing.stabilizedValue) - Math.round(analysis.pricing.askingPrice * 0.7)),
            ),
          },
          { label: "Net profit (after interest)", value: formatCurrency(rb?.netProfitAfterInterest ?? 0) },
          { label: "ROI on equity", value: `${(rb?.roiOnEquityPct ?? 0).toFixed(1)}%` },
        ],
        bullets: rb?.assumptions ? [rb.assumptions] : undefined,
      },
      {
        title: "Future Value Outlook",
        body:
          growth?.narrative ||
          `${property.area} future value is underwritten from neighborhood trajectory and demand/supply balance, with a base growth path near ${(growth?.annualGrowthBase ?? 4).toFixed(1)}% per year.`,
        keyValues: [
          { label: "1Y Projected Value", value: formatCurrency(growth?.projectedValue1Y ?? Math.round(analysis.pricing.stabilizedValue * 1.04)) },
          { label: "3Y Projected Value", value: formatCurrency(growth?.projectedValue3Y ?? Math.round(analysis.pricing.stabilizedValue * 1.13)) },
          { label: "5Y Projected Value", value: formatCurrency(growth?.projectedValue5Y ?? Math.round(analysis.pricing.stabilizedValue * 1.22)) },
          { label: "Base Growth", value: `${(growth?.annualGrowthBase ?? 4).toFixed(1)}% / year` },
          { label: "Conservative Case", value: `${(growth?.annualGrowthConservative ?? 2).toFixed(1)}% / year` },
          { label: "Upside Case", value: `${(growth?.annualGrowthUpside ?? 6).toFixed(1)}% / year` },
        ],
        bullets: [
          ...(growth?.drivers || []),
          ...((growth?.sensitivities || []).map((s) => `Sensitivity: ${s}`)),
        ],
      },
      {
        title: "Comparable Transactions",
        bullets: analysis.comparables.map(
          (comp) =>
            `${comp.name} (${comp.distance}) - ${formatCurrency(comp.price)} | ${formatPerSqft(comp.pricePerSqft)} | ${comp.closingDate}${comp.note ? ` - ${comp.note}` : ""}`,
        ),
      },
      {
        title: "Strategy and Execution",
        body: analysis.strategy.plan,
        keyValues: [
          { label: "Hold Period", value: analysis.strategy.holdPeriod },
          { label: "Exit Strategy", value: analysis.strategy.exit },
        ],
        bullets: analysis.strategy.focusPoints,
      },
      {
        title: "Investment Thesis",
        body: analysis.investmentThesis,
      },
      {
        title: "Risk Assessment",
        bullets: analysis.risks.map((risk, index) => `${index + 1}. ${risk.risk} - Mitigation: ${risk.mitigation}`),
      },
      {
        title: "Final Recommendation",
        body: `${analysis.finalRecommendation.decision}: ${analysis.finalRecommendation.condition || "Proceed with standard due diligence."}`,
        bullets: [
          `AI recommendation: ${evaluation.recommendation}`,
          ...evaluation.keyStrengths.map((strength) => `Strength: ${strength}`),
          ...evaluation.considerations.map((consideration) => `Consideration: ${consideration}`),
        ],
      },
    ],
  }
}

function buildOffplanIntakeReportPayload(
  project: OffPlanProject,
  selectedUnit: OffPlanUnit,
  paymentPlan: OffPlanPaymentPlan,
  evaluation: OffPlanEvaluationResult & { enhancedPdfData?: any },
  extractedProperty?: ExtractedProperty,
  brochureImages?: string[],
): IntakeReportPayload {
  const memo = evaluation.memoContent
  const enhanced = evaluation.enhancedPdfData
  const rb = enhanced?.returnBridge
  const gr = enhanced?.growth

  // Use enhanced data when available, fall back to computed values
  const baseGrowthRate = gr?.annualGrowthBase ?? Math.max(2.5, Math.min(10, memo.financialProjections.expectedAppreciation / 5))
  const baselineValue = memo.financialProjections.estimatedCompletionValue
  const projected3Y = gr?.projectedValue3Y ?? Math.round(baselineValue * Math.pow(1 + baseGrowthRate / 100, 3))
  const projected5Y = gr?.projectedValue5Y ?? Math.round(baselineValue * Math.pow(1 + baseGrowthRate / 100, 5))
  const purchase = selectedUnit.totalPrice
  const dld = rb?.dldFee ?? Math.round(purchase * 0.04)
  const broker = rb?.brokerFee ?? Math.round(purchase * 0.02)
  const totalProjectCost = rb?.totalProjectCost ?? (purchase + dld + broker)
  const equityInvested = rb?.equityInvested ?? totalProjectCost
  const resalePrice = rb?.resalePrice ?? projected5Y
  const netProfit = rb?.netProfitAfterInterest ?? Math.round(resalePrice - equityInvested)
  const roiOnEquity = rb?.roiOnEquityPct ?? (equityInvested > 0 ? (netProfit / equityInvested) * 100 : 0)

  const sections: IntakeReportPayload["sections"] = [
    {
      title: "Project Snapshot",
      keyValues: [
        { label: "Project", value: project.projectName },
        { label: "Developer", value: project.developer },
        { label: "Location", value: `${project.location.area}${project.location.subArea ? `, ${project.location.subArea}` : ""}` },
        { label: "Completion", value: project.completionDate },
        { label: "Selected Unit", value: `${selectedUnit.unitNumber} (${selectedUnit.type})` },
        { label: "Unit Size", value: `${selectedUnit.sizeSqft.toLocaleString()} sq ft` },
        { label: "Price / sq ft", value: formatCurrency(selectedUnit.pricePerSqft) },
        { label: "Unit Price", value: formatCurrency(selectedUnit.totalPrice) },
      ],
    },
    {
      title: "Project Highlights",
      bullets: memo.projectHighlights,
    },
    {
      title: "Recommended Candidate Status",
      body: "This off-plan unit is tracked as a recommended candidate pending acquisition.",
      keyValues: [
        { label: "Recommendation Lane", value: "Recommended Candidate" },
        { label: "Portfolio Overlap", value: "No - candidate only" },
      ],
    },
    {
      title: "Portfolio Holdings Snapshot",
      keyValues: [
        { label: "Total Holdings", value: "N/A in intake context" },
        { label: "Current Portfolio Value", value: "N/A in intake context" },
      ],
    },
    {
      title: "Developer Assessment",
      body: memo.developerAssessment.trackRecordSummary,
      keyValues: [
        { label: "Developer Score", value: `${memo.developerAssessment.score}/100` },
        { label: "Developer Grade", value: memo.developerAssessment.grade },
        { label: "Financial Stability", value: memo.developerAssessment.financialStability || "N/A" },
      ],
      bullets: [
        ...memo.developerAssessment.strengths.map((s) => `Strength: ${s}`),
        ...memo.developerAssessment.concerns.map((c) => `Concern: ${c}`),
      ],
    },
    {
      title: "Location Analysis",
      body: memo.locationAnalysis.areaProfile,
      keyValues: [{ label: "Location Grade", value: memo.locationAnalysis.grade }],
      bullets: [
        ...memo.locationAnalysis.highlights,
        ...Object.entries(memo.locationAnalysis.proximity).map(([k, v]) => `${k}: ${v}`),
      ],
    },
    {
      title: "Payment Plan Analysis",
      body: memo.paymentPlanAnalysis.summary,
      keyValues: [
        { label: "During Construction", value: `${paymentPlan.constructionPercent}%` },
        { label: "On Completion", value: `${paymentPlan.postHandoverPercent}%` },
        { label: "DLD Fee", value: `${paymentPlan.dldFeePercent}%` },
        { label: "Attractiveness Score", value: `${memo.paymentPlanAnalysis.attractivenessScore}/100` },
      ],
      bullets: memo.paymentPlanAnalysis.insights,
    },
    {
      title: "Financial Projections",
      keyValues: [
        { label: "Purchase Price", value: formatCurrency(memo.financialProjections.purchasePrice) },
        { label: "Completion Value", value: formatCurrency(memo.financialProjections.estimatedCompletionValue) },
        { label: "Expected Appreciation", value: `${memo.financialProjections.expectedAppreciation.toFixed(1)}%` },
        { label: "Expected Gain", value: formatCurrency(memo.financialProjections.expectedAppreciationAed) },
        { label: "Estimated Annual Rent", value: formatCurrency(memo.financialProjections.estimatedAnnualRent) },
        { label: "Gross Yield", value: `${memo.financialProjections.projectedRentalYieldGross}%` },
        { label: "Net Yield", value: `${memo.financialProjections.projectedRentalYieldNet}%` },
      ],
    },
  ]

  // Operating Expenses section (from enhanced data)
  if (enhanced?.operatingExpenses) {
    const opex = enhanced.operatingExpenses
    sections.push({
      title: "Annual Operating Expenses (Post-Completion)",
      keyValues: [
        { label: "Service Charge", value: formatCurrency(opex.serviceCharge) },
        { label: "Property Management (5%)", value: formatCurrency(opex.managementFee) },
        { label: "Maintenance Reserve (1%)", value: formatCurrency(opex.maintenanceReserve) },
        { label: "Insurance (0.1%)", value: formatCurrency(opex.insurance) },
        { label: "Total Annual Expenses", value: formatCurrency(opex.totalAnnual) },
        { label: "Gross Rent", value: formatCurrency(opex.grossRent) },
        { label: "Net Rent", value: formatCurrency(opex.netRent) },
      ],
      bullets: opex.notes ? [opex.notes] : [],
    })
  }

  // Future Value Outlook section
  sections.push({
    title: "Future Value Outlook",
    body: gr?.narrative ?? `${project.location.area} (${memo.locationAnalysis.grade} grade) shows favorable long-term tendencies. Under a base case of ${baseGrowthRate.toFixed(1)}% annual growth from completion value, 5-year estimated value is ${formatCurrency(projected5Y)}.`,
    keyValues: [
      { label: "Value at Completion", value: formatCurrency(baselineValue) },
      { label: "Projected Value (1Y)", value: formatCurrency(gr?.projectedValue1Y ?? Math.round(baselineValue * (1 + baseGrowthRate / 100))) },
      { label: "Projected Value (3Y)", value: formatCurrency(projected3Y) },
      { label: "Projected Value (5Y)", value: formatCurrency(projected5Y) },
      { label: "Conservative Growth", value: `${(gr?.annualGrowthConservative ?? Math.max(0.5, baseGrowthRate - 2)).toFixed(1)}% / year` },
      { label: "Base Growth Rate", value: `${baseGrowthRate.toFixed(1)}% / year` },
      { label: "Upside Growth", value: `${(gr?.annualGrowthUpside ?? baseGrowthRate + 2.5).toFixed(1)}% / year` },
    ],
    bullets: [
      ...(gr?.drivers ?? memo.locationAnalysis.highlights.slice(0, 3)),
      ...(gr?.sensitivities ?? memo.keyStrengths.slice(0, 2)),
    ],
  })

  // ROI on Equity Bridge section
  sections.push({
    title: "ROI on Equity Bridge",
    keyValues: [
      { label: "Purchase price", value: formatCurrency(purchase) },
      { label: "DLD fee", value: formatCurrency(dld) },
      { label: "DLD fee rate", value: `${(rb?.dldRatePct ?? paymentPlan.dldFeePercent).toFixed(1)}%` },
      { label: "Broker fee", value: formatCurrency(broker) },
      { label: "Broker fee rate", value: `${(rb?.brokerFeePct ?? 2).toFixed(1)}%` },
      { label: "Total project cost", value: formatCurrency(totalProjectCost) },
      { label: "Equity invested", value: formatCurrency(equityInvested) },
      { label: "Resale price (5Y post-completion)", value: formatCurrency(resalePrice) },
      { label: "Net profit", value: formatCurrency(netProfit) },
      { label: "ROI on equity", value: `${roiOnEquity.toFixed(1)}%` },
    ],
    bullets: [rb?.assumptions ?? "Off-plan: full equity investment. 5-year post-completion hold."],
  })

  // Scenario Analysis (from enhanced data)
  if (enhanced?.scenarios && enhanced.scenarios.length > 0) {
    sections.push({
      title: "Scenario Analysis",
      bullets: enhanced.scenarios.map(
        (s: any) => `${s.label}: Annual rent ${formatCurrency(s.annualRent)} @ ${s.occupancy}% occupancy → Exit ${formatCurrency(s.exitPrice)} → IRR ${s.fiveYearIrr}% → Net Profit ${formatCurrency(s.netProfit)}`,
      ),
    })
  }

  // Strategy section (from enhanced data)
  if (enhanced?.strategy) {
    sections.push({
      title: "Investment Strategy",
      body: enhanced.strategy.plan,
      keyValues: [
        { label: "Hold Period", value: `${enhanced.strategy.holdPeriod} years (incl. construction)` },
        { label: "Exit Strategy", value: enhanced.strategy.exit },
      ],
      bullets: enhanced.strategy.focusPoints,
    })
  }

  // Market Comparables (use enhanced DLD data when available)
  if (enhanced?.comparables && enhanced.comparables.length > 0) {
    sections.push({
      title: "Market Comparables",
      bullets: enhanced.comparables.map(
        (comp: any) =>
          `${comp.name} — ${formatCurrency(comp.price)} (${comp.pricePerSqft > 0 ? `AED ${comp.pricePerSqft.toLocaleString()}/sqft` : "N/A"}) — ${comp.date} [${comp.source || "AI"}]${comp.note ? ` — ${comp.note}` : ""}`,
      ),
    })
  } else {
    sections.push({
      title: "Market Comparables",
      bullets: memo.marketComparables.map(
        (comp) =>
          `${comp.project} (${comp.completionStatus}) - ${formatCurrency(comp.pricePerSqft)} / sq ft${comp.note ? ` - ${comp.note}` : ""}`,
      ),
    })
  }

  // Risk Assessment
  sections.push({
    title: "Risk Assessment",
    body: `Overall risk level: ${memo.overallRiskLevel.toUpperCase()}`,
    bullets: memo.riskAssessment.map((risk) => `${risk.category} (${risk.level}): ${risk.description} | Mitigation: ${risk.mitigation}`),
  })

  // Investment Thesis and Recommendation
  sections.push({
    title: "Investment Thesis and Recommendation",
    body: memo.investmentThesis,
    bullets: [
      ...memo.keyStrengths.map((strength) => `Strength: ${strength}`),
      ...memo.keyConsiderations.map((consideration) => `Consideration: ${consideration}`),
      `Recommendation: ${memo.recommendation.decision}`,
      memo.recommendation.reasoning,
      ...(memo.recommendation.conditions || []),
      ...(memo.recommendation.suggestedNegotiationPoints || []),
    ],
  })

  // Build the payload with enhanced cash flow and comparable data
  const payload: IntakeReportPayload = {
    title: `Off-Plan IC Opportunity Report - ${project.projectName}`,
    subtitle: `${selectedUnit.unitNumber} | ${project.location.area}`,
    generatedAt: memo.generatedAt || new Date().toISOString(),
    score: `${evaluation.overallScore}/100`,
    recommendation: `${evaluation.recommendation} (${memo.recommendation.decision})`,
    summary: `${evaluation.headline}. ${memo.projectSummary}`,
    coverImageUrl: extractedProperty?.coverImageUrl ?? extractedProperty?.images?.[0] ?? brochureImages?.[0] ?? undefined,
    galleryImageUrls: (extractedProperty?.images && extractedProperty.images.length > 0) ? extractedProperty.images : (brochureImages ?? []),
    mapImageUrl: undefined,
    sections,
  }

  // Attach enhanced PDF data for PDF rendering
  if (enhanced) {
    payload.cashFlowTable = enhanced.cashFlowTable
    payload.operatingExpenses = enhanced.operatingExpenses
    payload.scenarios = enhanced.scenarios
    payload.comparables = enhanced.comparables
  }

  return payload
}
