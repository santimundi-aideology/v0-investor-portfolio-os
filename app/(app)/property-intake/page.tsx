"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
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
import { formatAED } from "@/lib/real-estate"
import { PropertyAIChat } from "@/components/ai/property-ai-chat"
import { ScoreRadarChart } from "@/components/charts/score-radar-chart"
import { InvestorMatchingPanel } from "@/components/memos/investor-matching-panel"
import type { Investor, OffPlanProject, OffPlanUnit, OffPlanPaymentPlan, OffPlanEvaluationResult } from "@/lib/types"
import { MemoPdfExport } from "@/components/memos/memo-pdf-export"
import { MemoChapterTabs } from "@/components/memos/memo-chapter-tabs"
import { buildStaticMapUrl } from "@/lib/utils/build-static-map-url"
import { useAPI } from "@/lib/hooks/use-api"
import type { IntakeReportPayload } from "@/lib/pdf/intake-report"
import type { MemoAnalysis } from "@/lib/types"

import { CMAPanel } from "@/components/property-intake/cma-panel"
import { AIScoreReveal } from "@/components/property-intake/ai-score-reveal"

// Persistent store — state survives navigation
import {
  useIntakeStore,
  setUrl,
  setNotes,
  setScoreRevealComplete,
  setPortalError,
  extractProperty,
  parseBuiltPdf,
  evaluateProperty,
  saveMemo,
  resetPortal,
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
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/realtor/dashboard" />
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
  const showPortalReset = step !== "input" && step !== "saved"

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
        <PageHeader title="Property Intake" subtitle="Evaluate properties from URLs or PDF brochures" />
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
        subtitle="Evaluate properties from URLs or PDF brochures"
        primaryAction={
          showPortalReset ? (
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
          ) : undefined
        }
      />

      <div className="space-y-6">
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
              <MemoChapterTabs
                analysis={evaluation.analysis as MemoAnalysis}
                contentEvaluation={{
                  score: evaluation.overallScore,
                  factors: evaluation.factors,
                  headline: evaluation.headline,
                  reasoning: evaluation.reasoning,
                  keyStrengths: evaluation.keyStrengths,
                  considerations: evaluation.considerations,
                  recommendation: evaluation.recommendation,
                }}
                structuredContent={null}
                propertyImages={property.images.map((url) => ({ url }))}
                mapImageUrl={buildStaticMapUrl(
                  property.coordinates,
                  `${property.area}${property.subArea ? `, ${property.subArea}` : ""}`,
                )}
                mapCoords={property.coordinates ?? null}
                floorPlanImageUrls={property.floorPlanImages?.length ? property.floorPlanImages : undefined}
                isOffplan={false}
                fallbackContent=""
              />
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
      </div>

    </div>
  )
}

/* ─── Helper functions ─── */
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

    /* ---- New narrative-rich fields ---- */
    locationNarrative: analysis.locationNarrative as any,
    developerProfileEnhanced: analysis.enhancedDeveloperProfile as any,
    riskMatrix: analysis.riskMatrix as any,
    stressTests: analysis.stressTests as any,
    neighborhoodBenchmarks: analysis.neighborhoodBenchmarks as any,
    dataGaps: analysis.dataGaps as any,
    scoringMethodology: analysis.scoringMethodology as any,
    executionSteps: analysis.executionSteps,
    plainEnglishThesis: analysis.plainEnglishThesis,

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
  const evalAnalysis = (evaluation as any).analysis
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

    /* ---- New narrative-rich fields ---- */
    locationNarrative: evalAnalysis?.locationNarrative,
    developerProfileEnhanced: evalAnalysis?.enhancedDeveloperProfile,
    riskMatrix: evalAnalysis?.riskMatrix,
    stressTests: evalAnalysis?.stressTests,
    neighborhoodBenchmarks: evalAnalysis?.neighborhoodBenchmarks,
    dataGaps: evalAnalysis?.dataGaps,
    scoringMethodology: evalAnalysis?.scoringMethodology,
    executionSteps: evalAnalysis?.executionSteps,
    plainEnglishThesis: evalAnalysis?.plainEnglishThesis,
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
