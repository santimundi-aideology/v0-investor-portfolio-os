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
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react"

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
import type { Investor } from "@/lib/types"
import { MemoPdfExport } from "@/components/memos/memo-pdf-export"
import { useAPI } from "@/lib/hooks/use-api"

// CMA and Off-Plan components
import { CMAPanel } from "@/components/property-intake/cma-panel"
import { PdfUploadZone } from "@/components/property-intake/pdf-upload-zone"
import { OffPlanProjectOverview } from "@/components/property-intake/offplan-project-overview"
import { UnitSelectionTable } from "@/components/property-intake/unit-selection-table"
import { OffPlanUnitComparison } from "@/components/property-intake/offplan-unit-comparison"
import { OffPlanMemoDisplay } from "@/components/property-intake/offplan-memo-display"
import { AIScoreReveal } from "@/components/property-intake/ai-score-reveal"
import type {
  OffPlanProject,
  OffPlanUnit,
  OffPlanPaymentPlan,
  OffPlanEvaluationResult,
  OffPlanExtractionResult,
} from "@/lib/types"

interface ExtractedProperty {
  source: string
  listingId: string | null
  title: string
  price: number
  pricePerSqft: number | null
  size: number | null
  bedrooms: number
  bathrooms: number
  propertyType: string
  area: string
  subArea: string | null
  address: string | null
  furnished: boolean
  parking: number | null
  amenities: string[]
  description: string | null
  images: string[]
  agentName: string | null
  agencyName: string | null
  listingUrl: string
  listedDate: string | null
  coordinates: { lat: number; lng: number } | null
}

interface EvaluationAnalysis {
  summary: string
  keyPoints: string[]
  neighborhood: {
    name: string
    grade: string
    profile: string
    highlights: string[]
    metrics: { label: string; value: string; trend?: string }[]
  }
  property: {
    description: string
    condition: string
    specs: { label: string; value: string }[]
    highlights: string[]
  }
  market: {
    overview: string
    drivers: string[]
    supply: string
    demand: string
    absorption: string
  }
  pricing: {
    askingPrice: number
    pricePerSqft: number | null
    marketAvgPricePerSqft: number
    recommendedOffer: number
    stabilizedValue: number
    valueAddBudget: number
    rentCurrent: number
    rentPotential: number
    irr: number
    equityMultiple: number
  }
  comparables: {
    name: string
    distance: string
    size: string
    closingDate: string
    price: number
    pricePerSqft: number
    note?: string
  }[]
  strategy: {
    plan: string
    holdPeriod: string
    exit: string
    focusPoints: string[]
  }
  investmentThesis: string
  financialAnalysis: {
    noi: number
    capRate: number
    targetIrr: number
    holdPeriod: string
  }
  risks: { risk: string; mitigation: string }[]
  finalRecommendation: {
    decision: "PROCEED" | "CONDITIONAL" | "PASS"
    condition?: string
  }
}

interface EvaluationResult {
  overallScore: number
  factors: {
    mandateFit: number
    marketTiming: number
    portfolioFit: number
    riskAlignment: number
  }
  headline: string
  reasoning: string
  keyStrengths: string[]
  considerations: string[]
  recommendation: "strong_buy" | "buy" | "hold" | "pass"
  analysis: EvaluationAnalysis
}

interface MarketContext {
  areaMedianPrice: number
  areaMedianPricePerSqft: number
  areaAverageYield: number
  priceVsMarket: number
  marketTrend: "rising" | "stable" | "declining"
}

type Step = "input" | "extracting" | "extracted" | "evaluating" | "evaluated" | "saving" | "saved"

// Off-Plan flow steps
type OffPlanStep = "upload" | "extracted" | "selecting" | "evaluating" | "evaluated" | "saving" | "saved"

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

export default function PropertyIntakePage() {
  // Fetch investors for matching panel
  const { data: investorsData } = useAPI<Investor[]>("/api/investors")
  const investors = investorsData ?? []

  // Tab state
  const [activeTab, setActiveTab] = React.useState<"portal" | "offplan">("portal")

  // Portal URL flow state
  const [step, setStep] = React.useState<Step>("input")
  const [url, setUrl] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [property, setProperty] = React.useState<ExtractedProperty | null>(null)
  const [evaluation, setEvaluation] = React.useState<EvaluationResult | null>(null)
  const [marketContext, setMarketContext] = React.useState<MarketContext | null>(null)
  const [notes, setNotes] = React.useState("")
  const [savedMemoId, setSavedMemoId] = React.useState<string | null>(null)
  const [scoreRevealComplete, setScoreRevealComplete] = React.useState(false)

  // Off-Plan flow state
  const [offplanStep, setOffplanStep] = React.useState<OffPlanStep>("upload")
  const [offplanError, setOffplanError] = React.useState<string | null>(null)
  const [offplanProject, setOffplanProject] = React.useState<OffPlanProject | null>(null)
  const [offplanUnits, setOffplanUnits] = React.useState<OffPlanUnit[]>([])
  const [offplanPaymentPlan, setOffplanPaymentPlan] = React.useState<OffPlanPaymentPlan | null>(null)
  const [offplanStats, setOffplanStats] = React.useState<OffPlanExtractionResult["stats"] | null>(null)
  const [selectedOffplanUnits, setSelectedOffplanUnits] = React.useState<OffPlanUnit[]>([])
  const [offplanEvaluation, setOffplanEvaluation] = React.useState<OffPlanEvaluationResult | null>(null)
  const [offplanSavedMemoId, setOffplanSavedMemoId] = React.useState<string | null>(null)

  // Off-Plan handlers
  const handlePdfExtracted = (result: {
    project: unknown
    units: unknown[]
    paymentPlan: unknown
    stats: unknown
    confidence: string
    model: string
  }) => {
    setOffplanError(null)
    
    // Data already extracted by Claude Opus directly from the PDF
    setOffplanProject(result.project as OffPlanProject)
    setOffplanUnits(result.units as OffPlanUnit[])
    setOffplanPaymentPlan(result.paymentPlan as OffPlanPaymentPlan)
    setOffplanStats(result.stats as OffPlanExtractionResult["stats"])
    setOffplanStep("extracted")
    
    console.log(`Data extracted using ${result.model} with ${result.confidence} confidence`)
  }

  const handleOffplanEvaluate = async () => {
    if (!offplanProject || !offplanPaymentPlan || selectedOffplanUnits.length === 0) {
      setOffplanError("Please select a unit to evaluate")
      return
    }

    setOffplanError(null)
    setOffplanStep("evaluating")

    try {
      const res = await fetch("/api/property-intake/evaluate-offplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: offplanProject,
          selectedUnit: selectedOffplanUnits[0],
          paymentPlan: offplanPaymentPlan,
          allUnits: offplanUnits,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to evaluate off-plan property")

      setOffplanEvaluation(data)
      setOffplanStep("evaluated")
    } catch (err) {
      setOffplanError(err instanceof Error ? err.message : "Failed to evaluate off-plan property")
      setOffplanStep("selecting")
    }
  }

  const handleOffplanSave = async (notes: string) => {
    if (!offplanProject || !offplanPaymentPlan || !offplanEvaluation || selectedOffplanUnits.length === 0) {
      return
    }

    setOffplanStep("saving")
    setOffplanError(null)

    try {
      const res = await fetch("/api/property-intake/save-offplan-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: offplanProject,
          selectedUnit: selectedOffplanUnits[0],
          paymentPlan: offplanPaymentPlan,
          evaluation: offplanEvaluation,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save off-plan memo")

      setOffplanSavedMemoId(data.memo.id)
      setOffplanStep("saved")
    } catch (err) {
      setOffplanError(err instanceof Error ? err.message : "Failed to save off-plan memo")
      setOffplanStep("evaluated")
    }
  }

  const handleOffplanReset = () => {
    setOffplanStep("upload")
    setOffplanError(null)
    setOffplanProject(null)
    setOffplanUnits([])
    setOffplanPaymentPlan(null)
    setOffplanStats(null)
    setSelectedOffplanUnits([])
    setOffplanEvaluation(null)
    setOffplanSavedMemoId(null)
  }

  const handleExtract = async (pageContent?: string) => {
    if (!url.trim()) {
      setError("Please enter a property URL")
      return
    }
    setError(null)
    setStep("extracting")

    try {
      const res = await fetch("/api/property-intake/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, pageContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to extract property")
      setProperty(data.property)
      setStep("extracted")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract property")
      setStep("input")
    }
  }

  // Handle paste event for extracting page content
  const handlePasteContent = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && text.length > 500) {
        handleExtract(text)
      } else {
        setError("Please copy the page content first (Ctrl+A, Ctrl+C on the Bayut page)")
      }
    } catch {
      setError("Could not read clipboard. Please allow clipboard access or paste content manually.")
    }
  }

  const handleEvaluate = async () => {
    if (!property) return
    setStep("evaluating")
    setError(null)
    setScoreRevealComplete(false)

    try {
      const res = await fetch("/api/property-intake/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to evaluate property")
      setEvaluation(data.evaluation)
      setMarketContext(data.marketContext)
      setStep("evaluated")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate property")
      setStep("extracted")
    }
  }

  const handleSaveMemo = async () => {
    if (!property || !evaluation) return
    setStep("saving")
    setError(null)

    try {
      const res = await fetch("/api/property-intake/save-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, evaluation, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save memo")
      setSavedMemoId(data.memo.id)
      setStep("saved")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save memo")
      setStep("evaluated")
    }
  }

  const handleReset = () => {
    setStep("input")
    setUrl("")
    setError(null)
    setProperty(null)
    setEvaluation(null)
    setMarketContext(null)
    setNotes("")
    setSavedMemoId(null)
    setScoreRevealComplete(false)
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
                <MemoPdfExport title={property.title} />
              )}
              <Button variant="outline" onClick={handleReset}>Start Over</Button>
            </div>
          ) : (activeTab === "offplan" && showOffplanReset) ? (
            <div className="flex items-center gap-2">
              {(offplanStep === "evaluated" || offplanStep === "saving") && offplanProject && selectedOffplanUnits[0] && (
                <MemoPdfExport title={`${offplanProject.projectName} - ${selectedOffplanUnits[0].unitNumber}`} />
              )}
              <Button variant="outline" onClick={handleOffplanReset}>Start Over</Button>
            </div>
          ) : undefined
        }
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "portal" | "offplan")} className="space-y-6">
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
            <Button onClick={() => handleExtract()} disabled={step === "extracting" || !url.trim()} className="w-full">
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
                </div>
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
                  <Button onClick={handleEvaluate} disabled={step === "evaluating"} className="w-full" size="lg">
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
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{property.title}</h2>
                {getRecommendationBadge(evaluation.recommendation)}
                <Badge variant="outline">Score: {evaluation.overallScore}/100</Badge>
              </div>
              <p className="text-gray-600">{evaluation.headline}</p>
            </div>
            {marketContext && (
              <div className="flex items-center gap-4 rounded-lg border bg-gray-50 p-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{marketContext.priceVsMarket > 0 ? "+" : ""}{marketContext.priceVsMarket.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">vs Market</div>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <div className="flex items-center gap-1 font-semibold">
                    {marketContext.marketTrend === "rising" && <TrendingUp className="h-4 w-4 text-green-600" />}
                    {marketContext.marketTrend === "declining" && <TrendingDown className="h-4 w-4 text-red-600" />}
                    <span className="capitalize">{marketContext.marketTrend}</span>
                  </div>
                  <div className="text-xs text-gray-500">Trend</div>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <div className="font-semibold">{marketContext.areaAverageYield}%</div>
                  <div className="text-xs text-gray-500">Yield</div>
                </div>
              </div>
            )}
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

              {/* Pricing & Upside */}
              <AnalysisSection title="Pricing & Upside" description="Actual vs potential value">
                {/* Price Comparison Chart */}
                <div className="rounded-lg border bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Price Comparison</h4>
                  <PriceComparisonChart
                    askingPrice={analysis.pricing.askingPrice}
                    marketAverage={analysis.pricing.marketAvgPricePerSqft * (property.size || 1000)}
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
                  <StatTile label="Market avg / sq ft" value={formatPerSqft(analysis.pricing.marketAvgPricePerSqft)} hint="Recent trades" />
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
                    <Button onClick={handleSaveMemo} disabled={step === "saving"} className="w-full">
                      {step === "saving" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Save to IC Memos</>}
                    </Button>
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
                      <Button variant="outline" onClick={handleReset}>Evaluate Another</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Investor Matching */}
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

              <Card>
                <CardHeader><CardTitle className="text-base">Source</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Portal</span><span className="font-medium capitalize">{property.source}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Listing ID</span><span className="font-medium">{property.listingId || "—"}</span></div>
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
                <Button variant="outline" onClick={handleOffplanReset} disabled={offplanStep === "evaluating"}>
                  Start Over
                </Button>
                <Button
                  onClick={handleOffplanEvaluate}
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
              onSave={handleOffplanSave}
              onReset={handleOffplanReset}
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
