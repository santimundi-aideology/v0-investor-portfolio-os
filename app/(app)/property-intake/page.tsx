"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
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
  extractProperty,
  evaluateProperty,
  saveMemo,
  resetPortal,
  handlePdfExtracted,
  evaluateOffplan,
  saveOffplanMemo,
  resetOffplan,
} from "@/lib/property-intake-store"
import type { ExtractedProperty, EvaluationResult } from "@/lib/property-intake-store"

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

export default function PropertyIntakePage() {
  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />
      <PropertyIntakeContent />
    </>
  )
}

function PropertyIntakeContent() {
  // Fetch investors for matching panel
  const { data: investorsData } = useAPI<Investor[]>("/api/investors")
  const investors = investorsData ?? []

  // All state comes from the persistent store
  const {
    activeTab,
    step,
    url,
    error,
    property,
    evaluation,
    marketContext,
    notes,
    savedMemoId,
    scoreRevealComplete,
    offplanStep,
    offplanError,
    offplanProject,
    offplanUnits,
    offplanPaymentPlan,
    offplanStats,
    selectedOffplanUnits,
    offplanEvaluation,
    offplanSavedMemoId,
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
    () => (property && evaluation ? buildPortalIntakeReportPayload(property, evaluation) : undefined),
    [property, evaluation],
  )
  const offplanReportPayload = React.useMemo(
    () =>
      offplanProject && selectedOffplanUnits[0] && offplanPaymentPlan && offplanEvaluation
        ? buildOffplanIntakeReportPayload(
            offplanProject,
            selectedOffplanUnits[0],
            offplanPaymentPlan,
            offplanEvaluation,
          )
        : undefined,
    [offplanProject, offplanPaymentPlan, offplanEvaluation, selectedOffplanUnits],
  )
  // Determine if we should show reset button
  const showPortalReset = step !== "input" && step !== "saved"
  const showOffplanReset = offplanStep !== "upload" && offplanStep !== "saved"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Intake"
        subtitle="Evaluate properties from portals or off-plan developer brochures"
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
            <ExternalLink className="h-4 w-4" />
            Portal URL
          </TabsTrigger>
          <TabsTrigger value="offplan" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Off-Plan Brochure
          </TabsTrigger>
        </TabsList>

        {/* Portal URL Tab */}
        <TabsContent value="portal" className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={step === "input" || step === "extracting" ? "font-semibold text-green-600" : ""}>1. Paste URL</span>
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

      {/* Step 1: URL Input */}
      {(step === "input" || step === "extracting") && (
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
            <Button onClick={() => extractProperty(url)} disabled={step === "extracting" || !url.trim()} className="w-full">
              {step === "extracting" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting with AI...</>
              ) : (
                <><Building2 className="mr-2 h-4 w-4" />Extract Property</>
              )}
            </Button>
            
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
                {property.images.length > 0 && (
                  <div className="relative h-48 overflow-hidden rounded-lg">
                    <Image
                      src={property.images[0]}
                      alt={property.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                      unoptimized
                      onError={(e) => { e.currentTarget.style.display = "none" }}
                    />
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
                  <Button onClick={evaluateProperty} disabled={step === "evaluating"} className="w-full" size="lg">
                    {step === "evaluating" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating IC Memo...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />Generate IC Memo</>
                    )}
                  </Button>
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
                onShare={(investorIds) => {
                  console.log("Sharing with investors:", investorIds)
                  // TODO: Implement actual sharing
                  alert(`IC Memo shared with ${investorIds.length} investor(s)`)
                }}
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

        {/* Off-Plan Brochure Tab */}
        <TabsContent value="offplan" className="space-y-6">
          {/* Off-Plan Step indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={offplanStep === "upload" ? "font-semibold text-green-600" : ""}>1. Upload Brochure</span>
            <ArrowRight className="h-4 w-4" />
            <span className={offplanStep === "extracted" || offplanStep === "selecting" ? "font-semibold text-green-600" : ""}>2. Review & Select Unit</span>
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

          {/* Off-Plan Step 1: Upload */}
          {offplanStep === "upload" && (
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
          )}

          {/* Off-Plan Step 2: Project Overview & Unit Selection */}
          {(offplanStep === "extracted" || offplanStep === "selecting" || offplanStep === "evaluating") && offplanProject && offplanPaymentPlan && (
            <div className="space-y-6">
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
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating IC Memo...
                    </>
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
            />
          )}
        </TabsContent>
      </Tabs>
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

function buildPortalIntakeReportPayload(property: ExtractedProperty, evaluation: EvaluationResult): IntakeReportPayload {
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
  evaluation: OffPlanEvaluationResult,
): IntakeReportPayload {
  const memo = evaluation.memoContent
  const baseGrowthRate = Math.max(2.5, Math.min(10, memo.financialProjections.expectedAppreciation / 5))
  const baselineValue = memo.financialProjections.estimatedCompletionValue
  const projected3Y = Math.round(baselineValue * Math.pow(1 + baseGrowthRate / 100, 3))
  const projected5Y = Math.round(baselineValue * Math.pow(1 + baseGrowthRate / 100, 5))
  const purchase = selectedUnit.totalPrice
  const dld = Math.round(purchase * 0.04)
  const broker = Math.round(purchase * 0.02)
  const renovation = 0
  const totalProjectCost = purchase + dld + broker + renovation
  const mortgage = Math.round(purchase * 0.7)
  const equityInvested = totalProjectCost - mortgage
  const annualInterest = Math.round(mortgage * 0.035)
  const netSaleProceeds = projected5Y - mortgage
  const netProfit = netSaleProceeds - equityInvested - annualInterest * 5
  const roiOnEquity = equityInvested > 0 ? (netProfit / equityInvested) * 100 : 0

  return {
    title: `Off-Plan IC Opportunity Report - ${project.projectName}`,
    subtitle: `${selectedUnit.unitNumber} | ${project.location.area}`,
    generatedAt: memo.generatedAt || new Date().toISOString(),
    score: `${evaluation.overallScore}/100`,
    recommendation: `${evaluation.recommendation} (${memo.recommendation.decision})`,
    summary: `${evaluation.headline}. ${memo.projectSummary}`,
    coverImageUrl: undefined,
    galleryImageUrls: [],
    mapImageUrl: undefined,
    sections: [
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
      {
        title: "Future Value Outlook",
        body: `${project.location.area} (${memo.locationAnalysis.grade} grade) shows favorable long-term tendencies. Under a base case of ${baseGrowthRate.toFixed(1)}% annual growth from completion value, 5-year estimated value is ${formatCurrency(projected5Y)}.`,
        keyValues: [
          { label: "Value at Completion", value: formatCurrency(baselineValue) },
          { label: "Projected Value (3Y)", value: formatCurrency(projected3Y) },
          { label: "Projected Value (5Y)", value: formatCurrency(projected5Y) },
          { label: "Base Growth Rate", value: `${baseGrowthRate.toFixed(1)}% / year` },
        ],
        bullets: [
          ...memo.locationAnalysis.highlights.slice(0, 3),
          ...memo.keyStrengths.slice(0, 2),
        ],
      },
      {
        title: "ROI on Equity Bridge",
        keyValues: [
          { label: "Purchase price", value: formatCurrency(purchase) },
          { label: "DLD fee", value: formatCurrency(dld) },
          { label: "DLD fee rate", value: `${paymentPlan.dldFeePercent.toFixed(1)}%` },
          { label: "Broker fee", value: formatCurrency(broker) },
          { label: "Broker fee rate", value: "2.0%" },
          { label: "Renovation", value: formatCurrency(renovation) },
          { label: "Total project cost", value: formatCurrency(totalProjectCost) },
          { label: "Mortgage amount", value: formatCurrency(mortgage) },
          { label: "Mortgage LTV", value: "70.0%" },
          { label: "Equity invested", value: formatCurrency(equityInvested) },
          { label: "Annual interest", value: formatCurrency(annualInterest) },
          { label: "Interest rate", value: "3.5%" },
          { label: "Resale price", value: formatCurrency(projected5Y) },
          { label: "Net sale proceeds after mortgage repayment", value: formatCurrency(netSaleProceeds) },
          { label: "Net profit (after interest)", value: formatCurrency(netProfit) },
          { label: "ROI on equity", value: `${roiOnEquity.toFixed(1)}%` },
        ],
        bullets: ["Assumes 70% LTV, 3.5% annual interest, and 5-year hold period."],
      },
      {
        title: "Market Comparables",
        bullets: memo.marketComparables.map(
          (comp) =>
            `${comp.project} (${comp.completionStatus}) - ${formatCurrency(comp.pricePerSqft)} / sq ft${comp.note ? ` - ${comp.note}` : ""}`,
        ),
      },
      {
        title: "Risk Assessment",
        body: `Overall risk level: ${memo.overallRiskLevel.toUpperCase()}`,
        bullets: memo.riskAssessment.map((risk) => `${risk.category} (${risk.level}): ${risk.description} | Mitigation: ${risk.mitigation}`),
      },
      {
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
      },
    ],
  }
}
