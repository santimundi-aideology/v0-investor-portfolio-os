"use client"

import * as React from "react"
import {
  FileText,
  MapPin,
  Building2,
  DollarSign,
  BarChart3,
  ShieldAlert,
  HelpCircle,
  ListChecks,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MemoAnalysis } from "@/lib/types"
import dynamic from "next/dynamic"
const LocationMap = dynamic(
  () => import("@/components/memos/location-map").then((m) => m.LocationMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" /> },
)

// ─── Types ────────────────────────────────────────────────────

type ChapterKey =
  | "executive"
  | "location"
  | "property"
  | "financial"
  | "comparables"
  | "risk"
  | "gaps"
  | "execution"

interface ChapterDef {
  key: ChapterKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const CHAPTERS: ChapterDef[] = [
  { key: "executive", label: "Executive Summary", icon: FileText },
  { key: "location", label: "The Location", icon: MapPin },
  { key: "property", label: "Property & Developer", icon: Building2 },
  { key: "financial", label: "Financial Profile", icon: DollarSign },
  { key: "comparables", label: "Price Context", icon: BarChart3 },
  { key: "risk", label: "Risk Assessment", icon: ShieldAlert },
  { key: "gaps", label: "What We Don't Know", icon: HelpCircle },
  { key: "execution", label: "Execution Steps", icon: ListChecks },
]

interface ReturnBridge {
  purchasePrice: number
  dldRatePct: number
  dldFee: number
  brokerFeePct: number
  brokerFee: number
  renovation: number
  totalProjectCost: number
  mortgageLtvPct: number
  mortgageAmount: number
  equityInvested: number
  annualInterestRatePct: number
  annualInterest: number
  resalePrice: number
  netSaleProceedsAfterMortgage: number
  netProfitAfterInterest: number
  roiOnEquityPct: number
  assumptions?: string
}

export interface MemoChapterTabsProps {
  analysis: MemoAnalysis | null | undefined
  contentEvaluation: Record<string, unknown> | null | undefined
  structuredContent: Record<string, unknown> | null | undefined
  propertyImages: { url: string; description?: string; category?: string }[]
  mapImageUrl?: string | null
  mapCoords?: { lat: number; lng: number } | null
  floorPlanImageUrls?: string[]
  isOffplan: boolean
  offplanProject?: Record<string, unknown> | null
  offplanUnit?: Record<string, unknown> | null
  offplanAnalysis?: Record<string, unknown> | null
  offplanPaymentPlan?: Record<string, unknown> | null
  fallbackContent: string
}

// ─── Formatters ───────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
})
const pctFmt = new Intl.NumberFormat("en-AE", {
  style: "percent",
  maximumFractionDigits: 1,
})
function fmtCurrency(v?: number) {
  return typeof v === "number" ? currencyFmt.format(v) : "—"
}
function fmtPerSqft(v?: number) {
  return typeof v === "number" ? `${currencyFmt.format(v)} / sq ft` : "—"
}
function fmtPct(v?: number) {
  return typeof v === "number" ? pctFmt.format(v) : "—"
}

// ─── Shared sub-components ────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
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
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

function BulletList({ items, color = "green" }: { items: string[]; color?: string }) {
  const dotColors: Record<string, string> = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-2">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dotColors[color] ?? dotColors.green)} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function EmptyChapter({ message }: { message?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center justify-center py-12 text-sm text-gray-400">
        <Info className="mr-2 h-4 w-4" />
        {message ?? "Analysis not available for this section."}
      </CardContent>
    </Card>
  )
}

function ProvenanceBadge({ label }: { label: string }) {
  const variant =
    label.includes("DLD") || label.includes("Registry") || label.includes("Verified")
      ? "default"
      : label.includes("Listed") || label.includes("Developer")
        ? "secondary"
        : "outline"
  return (
    <Badge variant={variant} className="text-[10px] font-medium">
      {label}
    </Badge>
  )
}

function ScoreBandBadge({ band }: { band: string }) {
  const colorMap: Record<string, string> = {
    Low: "bg-green-100 text-green-700 border-green-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Critical: "bg-red-100 text-red-700 border-red-200",
  }
  return (
    <Badge variant="outline" className={colorMap[band] ?? ""}>
      {band}
    </Badge>
  )
}

function DataGapStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    verified: { bg: "bg-green-100 text-green-700 border-green-200", label: "Verified" },
    assumed: { bg: "bg-amber-100 text-amber-700 border-amber-200", label: "Assumed" },
    unverified: { bg: "bg-orange-100 text-orange-700 border-orange-200", label: "Unverified" },
    missing: { bg: "bg-red-100 text-red-700 border-red-200", label: "Missing" },
  }
  const entry = map[status] ?? { bg: "", label: status }
  return (
    <Badge variant="outline" className={entry.bg}>
      {entry.label}
    </Badge>
  )
}

// ─── Chapter Nav ──────────────────────────────────────────────

function ChapterNav({
  active,
  onChange,
  available,
}: {
  active: ChapterKey
  onChange: (key: ChapterKey) => void
  available: Set<ChapterKey>
}) {
  return (
    <Card className="p-1.5 sm:p-2">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {CHAPTERS.map((ch, idx) => {
          const isActive = ch.key === active
          const hasData = available.has(ch.key)
          const Icon = ch.icon
          return (
            <React.Fragment key={ch.key}>
              {idx > 0 && (
                <ChevronRight className="mx-0.5 size-4 shrink-0 text-gray-300" />
              )}
              <button
                type="button"
                onClick={() => onChange(ch.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200/60"
                    : hasData
                      ? "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      : "text-gray-300 hover:bg-gray-50 hover:text-gray-400"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{ch.label}</span>
              </button>
            </React.Fragment>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Chapter Renderers (standard analysis) ────────────────────

function ExecutiveSummaryChapter({ analysis, evaluation }: { analysis: MemoAnalysis; evaluation?: Record<string, unknown> | null }) {
  const thesis = analysis.plainEnglishThesis
  const methodology = analysis.scoringMethodology
  const strengths = (evaluation?.keyStrengths as string[]) ?? analysis.keyPoints ?? []
  const risks = (evaluation?.considerations as string[]) ?? []

  return (
    <div className="space-y-6">
      {evaluation ? (
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <CardContent className="py-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-gray-400">Overall Score</p>
                <p className="text-4xl font-bold">
                  {String(evaluation.score ?? "—")}
                  <span className="text-lg text-gray-400">/100</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-gray-400">Recommendation</p>
                <p className="text-xl font-semibold text-green-400 capitalize">
                  {String(evaluation.recommendation ?? "—").replace(/_/g, " ")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-gray-400">Headline</p>
                <p className="text-sm text-gray-300">{String(evaluation.headline ?? "")}</p>
              </div>
            </div>
            {evaluation.factors && typeof evaluation.factors === "object" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-4 border-t border-gray-700 pt-4">
                {Object.entries(evaluation.factors as Record<string, number>).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <p className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                    <p className="text-lg font-semibold">{val}/25</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Section title="Investment Summary">
        <p className="text-gray-500 leading-relaxed">{analysis.summary}</p>
      </Section>

      {thesis ? (
        <Section title="Plain-English Thesis" description="For readers unfamiliar with the market">
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">{thesis}</p>
        </Section>
      ) : null}

      {strengths.length > 0 ? (
        <Section title="Key Strengths">
          <BulletList items={strengths} color="green" />
        </Section>
      ) : null}

      {risks.length > 0 ? (
        <Section title="Key Risks">
          <BulletList items={risks} color="amber" />
        </Section>
      ) : null}

      {methodology ? (
        <Section title="Scoring Methodology" description="How the score was calculated">
          {methodology.dimensions?.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {methodology.dimensions.map((d) => (
                <div key={d.name} className="rounded-lg border bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{d.name}</p>
                    <Badge variant="secondary" className="text-xs">{d.weight}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{d.description}</p>
                </div>
              ))}
            </div>
          )}
          {methodology.bands?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Score Bands</p>
              <div className="space-y-1">
                {methodology.bands.map((b) => (
                  <div key={b.range} className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-xs text-gray-500 w-16">{b.range}</span>
                    <span className="font-medium">{b.label}</span>
                    <span className="text-gray-400">— {b.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {methodology.keyFactorsUp?.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Factors Pulling Score Up</p>
                <BulletList items={methodology.keyFactorsUp} color="green" />
              </div>
            )}
            {methodology.keyFactorsDown?.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Factors Pulling Score Down</p>
                <BulletList items={methodology.keyFactorsDown} color="red" />
              </div>
            )}
          </div>
        </Section>
      ) : null}

      {analysis.finalRecommendation ? (
        <Card
          className={
            analysis.finalRecommendation.decision === "PROCEED"
              ? "border-green-200 bg-green-50"
              : analysis.finalRecommendation.decision === "CONDITIONAL"
                ? "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
          }
        >
          <CardHeader>
            <CardTitle className="text-lg">Final Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{analysis.finalRecommendation.decision}</p>
            {analysis.finalRecommendation.condition && (
              <p className="text-gray-600 mt-1">{analysis.finalRecommendation.condition}</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function LocationChapter({ analysis, mapImageUrl, mapCoords }: { analysis: MemoAnalysis; mapImageUrl?: string | null; mapCoords?: { lat: number; lng: number } | null }) {
  const loc = analysis.locationNarrative
  const neighborhood = analysis.neighborhood

  if (!loc && !neighborhood) return <EmptyChapter />

  const locationLabel = analysis.neighborhood?.name || "Property location"

  return (
    <div className="space-y-6">
      {mapCoords ? (
        <Card className="overflow-hidden border-gray-100">
          <div className="relative h-64 w-full bg-gray-100">
            <LocationMap lat={mapCoords.lat} lng={mapCoords.lng} label={locationLabel} className="h-full w-full" />
          </div>
          <CardContent className="py-3">
            <p className="text-xs text-gray-500">
              {locationLabel} — {mapCoords.lat.toFixed(4)}, {mapCoords.lng.toFixed(4)}
            </p>
          </CardContent>
        </Card>
      ) : mapImageUrl ? (
        <Card className="overflow-hidden border-gray-100">
          <div className="relative h-64 w-full bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mapImageUrl} alt="Property location map" className="h-full w-full object-cover" />
          </div>
          <CardContent className="py-3">
            <p className="text-xs text-gray-500">
              {analysis.neighborhood?.name
                ? `${analysis.neighborhood.name} — satellite view`
                : "Property location — satellite view"}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {loc?.areaOverview ? (
        <Section title="The Area" description="What is this place?">
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">{loc.areaOverview}</p>
        </Section>
      ) : neighborhood ? (
        <Section title="Neighborhood" description={neighborhood.name}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="uppercase">Grade {neighborhood.grade}</Badge>
          </div>
          <p className="text-gray-500">{neighborhood.profile}</p>
          {neighborhood.metrics?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {neighborhood.metrics.map((m) => (
                <StatTile key={m.label} label={m.label} value={m.value} hint={m.trend} />
              ))}
            </div>
          ) : null}
          {neighborhood.highlights?.length ? (
            <BulletList items={neighborhood.highlights} color="gray" />
          ) : null}
        </Section>
      ) : null}

      {loc?.growthCatalyst ? (
        <Section title="Growth Catalyst" description="Primary driver of future value">
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">{loc.growthCatalyst}</p>
        </Section>
      ) : null}

      {loc?.amenities && loc.amenities.length > 0 ? (
        <Section title="Community Amenities">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loc.amenities.map((cat) => (
              <div key={cat.category} className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{cat.category}</p>
                <ul className="space-y-1">
                  {cat.items.map((item) => (
                    <li key={item.name} className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          item.status === "operational"
                            ? "border-green-200 text-green-700"
                            : item.status === "under_construction"
                              ? "border-amber-200 text-amber-700"
                              : "border-blue-200 text-blue-700"
                        )}
                      >
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {loc?.missingAmenities && loc.missingAmenities.length > 0 ? (
        <Section title="What's Missing" description="Amenities not yet available in the area">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <ul className="space-y-1 text-sm text-amber-800">
                {loc.missingAmenities.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      ) : null}

      {loc?.connectivity && loc.connectivity.length > 0 ? (
        <Section title="Connectivity" description="Distances and drive times">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-gray-500">Destination</th>
                  <th className="pb-2 font-medium text-gray-500">Distance</th>
                  <th className="pb-2 font-medium text-gray-500">Drive Time</th>
                </tr>
              </thead>
              <tbody>
                {loc.connectivity.map((row) => (
                  <tr key={row.destination} className="border-b last:border-0">
                    <td className="py-2 font-medium">{row.destination}</td>
                    <td className="py-2 text-gray-500">{row.distance}</td>
                    <td className="py-2 text-gray-500">{row.driveTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
    </div>
  )
}

function PropertyDeveloperChapter({ analysis, floorPlanImageUrls }: { analysis: MemoAnalysis; floorPlanImageUrls?: string[] }) {
  const prop = analysis.property
  const dev = analysis.enhancedDeveloperProfile
  const floorPlans = floorPlanImageUrls?.filter(Boolean) ?? []

  if (!prop && !dev) return <EmptyChapter />

  return (
    <div className="space-y-6">
      {prop ? (
        <Section title="Property Details" description={prop.condition}>
          <p className="text-gray-500 leading-relaxed">{prop.description}</p>
          {prop.specs?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {prop.specs.map((s) => (
                <StatTile key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          ) : null}
          {prop.highlights?.length ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Highlights</p>
              <BulletList items={prop.highlights} color="green" />
            </div>
          ) : null}
          {floorPlans.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Floor Plans</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {floorPlans.map((url, idx) => (
                  <div key={`fp-${idx}`} className="relative overflow-hidden rounded-lg border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Floor plan ${idx + 1}`} className="w-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      {dev ? (
        <Section title="Developer Profile" description={`${dev.name} — ${dev.tierLabel}`}>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold",
                dev.tier === "tier_1"
                  ? "bg-green-100 text-green-700"
                  : dev.tier === "tier_2"
                    ? "bg-blue-100 text-blue-700"
                    : dev.tier === "tier_3"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
              )}
            >
              {dev.tier === "tier_1" ? "T1" : dev.tier === "tier_2" ? "T2" : dev.tier === "tier_3" ? "T3" : "?"}
            </div>
            <div className="flex-1">
              <p className="font-medium">{dev.legalName || dev.name}</p>
              <p className="text-xs text-gray-500">
                {dev.listingStatus !== "unknown" && (
                  <>{dev.listingStatus === "public" ? `Public (${dev.exchange ?? "exchange"})` : "Private"} · </>
                )}
                {dev.founded && <>Founded {dev.founded} · </>}
                {dev.unitsDelivered && <>{dev.unitsDelivered} units delivered</>}
              </p>
            </div>
          </div>

          {dev.marketCap && (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="Market Cap" value={dev.marketCap} />
              <StatTile label="Delivery Record" value={dev.deliveryTrackRecord.replace(/_/g, " ")} />
              <StatTile label="Build Quality" value={dev.buildQuality} />
            </div>
          )}

          {dev.notableProjects?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Notable Projects</p>
              <div className="flex flex-wrap gap-2">
                {dev.notableProjects.map((p) => (
                  <Badge key={p} variant="outline">{p}</Badge>
                ))}
              </div>
            </div>
          )}

          {dev.overview && (
            <p className="text-gray-500 leading-relaxed whitespace-pre-line">{dev.overview}</p>
          )}

          {dev.riskAssessment && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-700 mb-1">Developer Risk Assessment</p>
              <p className="text-sm text-amber-800">{dev.riskAssessment}</p>
            </div>
          )}

          {dev.concerns?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Concerns</p>
              <BulletList items={dev.concerns} color="amber" />
            </div>
          )}
        </Section>
      ) : null}
    </div>
  )
}

function FinancialChapter({ analysis }: { analysis: MemoAnalysis }) {
  const pricing = analysis.pricing
  const fin = analysis.financialAnalysis
  const rb = fin?.returnBridge as ReturnBridge | undefined
  const growth = analysis.growth

  if (!pricing && !fin) return <EmptyChapter />

  return (
    <div className="space-y-6">
      {pricing ? (
        <Section title="Pricing & Upside" description="Actual vs potential value">
          <div className="grid gap-3 md:grid-cols-3">
            <StatTile label="Asking Price" value={fmtCurrency(pricing.askingPrice)} />
            <StatTile label="Recommended Offer" value={fmtCurrency(pricing.recommendedOffer)} />
            <StatTile label="Stabilized Value" value={fmtCurrency(pricing.stabilizedValue)} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <StatTile label="Price / sq ft" value={fmtPerSqft(pricing.pricePerSqft)} hint="Subject" />
            {pricing.marketAvgPricePerSqft ? (
              <StatTile label="Market Avg / sq ft" value={fmtPerSqft(pricing.marketAvgPricePerSqft)} hint="Area average" />
            ) : null}
            <StatTile label="Value-add Budget" value={fmtCurrency(pricing.valueAddBudget)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">In-place Rent</p>
              <p className="text-xl font-semibold">{fmtCurrency(pricing.rentCurrent)}</p>
              <p className="text-sm text-gray-500">Stabilized: {fmtCurrency(pricing.rentPotential)}</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Projected Returns</p>
              <p className="text-xl font-semibold">{fmtPct(pricing.irr)}</p>
              <p className="text-sm text-gray-500">Equity multiple: {pricing.equityMultiple?.toFixed(2) ?? "—"}x</p>
            </div>
          </div>
        </Section>
      ) : null}

      {fin ? (
        <Section title="Financial Analysis">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fin.noi != null && <StatTile label="Current NOI" value={fmtCurrency(fin.noi)} />}
            {fin.capRate != null && <StatTile label="Cap Rate" value={fmtPct(fin.capRate / 100)} />}
            {fin.targetIrr != null && <StatTile label="Target IRR" value={fmtPct(fin.targetIrr / 100)} />}
            {fin.holdPeriod && <StatTile label="Hold Period" value={fin.holdPeriod} />}
          </div>
        </Section>
      ) : null}

      {rb ? (
        <Section title="ROI on Equity Bridge" description="Levered return stack">
          <div className="space-y-2">
            {[
              { label: "Purchase Price", value: fmtCurrency(rb.purchasePrice) },
              { label: "DLD Fee", value: `${fmtCurrency(rb.dldFee)} (${rb.dldRatePct?.toFixed(1) ?? 4}%)` },
              { label: "Broker Fee", value: `${fmtCurrency(rb.brokerFee)} (${rb.brokerFeePct?.toFixed(1) ?? 2}%)` },
              { label: "Renovation", value: fmtCurrency(rb.renovation) },
              { label: "Total Project Cost", value: fmtCurrency(rb.totalProjectCost) },
              { label: "Mortgage Amount", value: `${fmtCurrency(rb.mortgageAmount)} (${rb.mortgageLtvPct?.toFixed(1) ?? 70}% LTV)` },
              { label: "Equity Invested", value: fmtCurrency(rb.equityInvested) },
              { label: "Annual Interest", value: `${fmtCurrency(rb.annualInterest)} (${rb.annualInterestRatePct?.toFixed(1) ?? 3.5}%)` },
              { label: "Resale Price", value: fmtCurrency(rb.resalePrice) },
              { label: "Net Proceeds after Mortgage", value: fmtCurrency(rb.netSaleProceedsAfterMortgage) },
              { label: "Net Profit (after interest)", value: fmtCurrency(rb.netProfitAfterInterest) },
              { label: "ROI on Equity", value: `${rb.roiOnEquityPct.toFixed(1)}%` },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border bg-gray-50 px-3 py-2">
                <p className="text-sm text-gray-600">{row.label}</p>
                <p className="text-sm font-semibold text-gray-900">{row.value}</p>
              </div>
            ))}
            {rb.assumptions && <p className="text-xs text-gray-500">{rb.assumptions}</p>}
          </div>
        </Section>
      ) : null}

      {growth ? (
        <Section title="Future Value Outlook" description="Growth scenarios">
          {growth.narrative && <p className="text-gray-500 leading-relaxed">{growth.narrative}</p>}
          <div className="grid gap-3 md:grid-cols-3">
            {growth.projectedValue1Y != null && <StatTile label="1Y Value" value={fmtCurrency(growth.projectedValue1Y)} />}
            {growth.projectedValue3Y != null && <StatTile label="3Y Value" value={fmtCurrency(growth.projectedValue3Y)} />}
            {growth.projectedValue5Y != null && <StatTile label="5Y Value" value={fmtCurrency(growth.projectedValue5Y)} />}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {growth.annualGrowthBase != null && <StatTile label="Base Growth" value={`${growth.annualGrowthBase}% / year`} hint="Base case" />}
            {growth.annualGrowthConservative != null && <StatTile label="Conservative" value={`${growth.annualGrowthConservative}% / year`} hint="Downside" />}
            {growth.annualGrowthUpside != null && <StatTile label="Upside" value={`${growth.annualGrowthUpside}% / year`} hint="Upside" />}
          </div>
          {growth.drivers?.length ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Growth Drivers</p>
              <BulletList items={growth.drivers} color="green" />
            </div>
          ) : null}
        </Section>
      ) : null}

      {analysis.strategy ? (
        <Section title="Strategy & Execution" description={`${analysis.strategy.holdPeriod} · ${analysis.strategy.exit}`}>
          <p className="text-gray-500">{analysis.strategy.plan}</p>
          {analysis.strategy.focusPoints?.length ? (
            <BulletList items={analysis.strategy.focusPoints} color="green" />
          ) : null}
        </Section>
      ) : null}

      {analysis.investmentThesis ? (
        <Section title="Investment Thesis">
          <p className="text-gray-500 leading-relaxed">{analysis.investmentThesis}</p>
        </Section>
      ) : null}
    </div>
  )
}

function ComparablesChapter({ analysis }: { analysis: MemoAnalysis }) {
  const benchmarks = analysis.neighborhoodBenchmarks
  const comps = analysis.comparables
  const hasVerified = comps?.some(
    (c) => c.provenanceLabel?.includes("DLD") || c.provenanceLabel?.includes("Registry") || c.provenanceLabel?.includes("Verified")
  )

  if (!benchmarks?.length && !comps?.length) return <EmptyChapter />

  return (
    <div className="space-y-6">
      {benchmarks && benchmarks.length > 0 ? (
        <Section title="Neighborhood Benchmarking" description="Price/sqft calibration against comparable areas">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-gray-500">Community</th>
                  <th className="pb-2 font-medium text-gray-500">Price Range</th>
                  <th className="pb-2 font-medium text-gray-500">Maturity</th>
                  <th className="pb-2 font-medium text-gray-500">Metro</th>
                  <th className="pb-2 font-medium text-gray-500">Character</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b) => (
                  <tr
                    key={b.community}
                    className={cn("border-b last:border-0", b.isSubject && "bg-teal-50 font-medium")}
                  >
                    <td className="py-2">
                      {b.community}
                      {b.isSubject && <Badge variant="default" className="ml-2 text-[10px] bg-teal-600">Subject</Badge>}
                    </td>
                    <td className="py-2 text-gray-500">{b.priceRange}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-[10px]">{b.maturity}</Badge>
                    </td>
                    <td className="py-2 text-gray-500">{b.hasMetro ? "Yes" : "No"}</td>
                    <td className="py-2 text-gray-500">{b.character}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {comps && comps.length > 0 ? (
        <Section title="Comparable Transactions" description="Recent reference trades">
          {!hasVerified && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                No verified transactions found. All comparables are estimates and should be treated as indicative only.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {comps.map((comp, idx) => (
              <div key={`${comp.name}-${idx}`} className="rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                  <span>{comp.name}</span>
                  <div className="flex items-center gap-2">
                    {comp.provenanceLabel && <ProvenanceBadge label={comp.provenanceLabel} />}
                    <span className="text-gray-500">{comp.distance}</span>
                  </div>
                </div>
                <p className="text-xs uppercase text-gray-500">{comp.closingDate}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Price</p>
                    <p className="text-base font-semibold">{fmtCurrency(comp.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Size</p>
                    <p className="text-base font-semibold">{comp.size}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Price / sq ft</p>
                    <p className="text-base font-semibold">{fmtPerSqft(comp.pricePerSqft)}</p>
                  </div>
                </div>
                {comp.note && <p className="mt-2 text-sm text-gray-500">{comp.note}</p>}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  )
}

function RiskChapter({ analysis }: { analysis: MemoAnalysis }) {
  const matrix = analysis.riskMatrix
  const stress = analysis.stressTests
  const risks = analysis.risks

  if (!matrix?.length && !stress?.length && !risks?.length) return <EmptyChapter />

  return (
    <div className="space-y-6">
      {matrix && matrix.length > 0 ? (
        <Section title="Risk Matrix" description="Likelihood x Impact scoring">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-gray-500">Risk</th>
                  <th className="pb-2 font-medium text-gray-500">Category</th>
                  <th className="pb-2 font-medium text-gray-500 text-center">L</th>
                  <th className="pb-2 font-medium text-gray-500 text-center">I</th>
                  <th className="pb-2 font-medium text-gray-500 text-center">Score</th>
                  <th className="pb-2 font-medium text-gray-500">Band</th>
                  <th className="pb-2 font-medium text-gray-500">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((r, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2 text-gray-500">{r.category}</td>
                    <td className="py-2 text-center">{r.likelihood}</td>
                    <td className="py-2 text-center">{r.impact}</td>
                    <td className="py-2 text-center font-semibold">{r.score}</td>
                    <td className="py-2"><ScoreBandBadge band={r.scoreBand} /></td>
                    <td className="py-2 text-gray-500 text-xs max-w-xs">{r.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : risks && risks.length > 0 ? (
        <Section title="Risks & Mitigations">
          <div className="space-y-3">
            {risks.map((r, idx) => (
              <div key={idx} className="flex gap-2 text-sm">
                <span className="font-semibold text-gray-900">{idx + 1}.</span>
                <span>
                  <span className="text-gray-700">{r.risk}</span>
                  {r.mitigation && <> — <span className="text-gray-500">{r.mitigation}</span></>}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {stress && stress.length > 0 ? (
        <Section title="Stress Tests" description="Adverse scenario analysis">
          <div className="space-y-3">
            {stress.map((s, idx) => (
              <div key={idx} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{s.label}</p>
                    <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  </div>
                  <Badge variant="destructive" className="shrink-0 text-xs">{s.impact}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-red-700">{s.quantifiedEffect}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  )
}

function DataGapsChapter({ analysis }: { analysis: MemoAnalysis }) {
  const gaps = analysis.dataGaps
  if (!gaps?.length) return <EmptyChapter message="No data gaps have been identified." />

  return (
    <Section title="What We Don't Know" description="Assumptions, missing data, and unverified claims">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium text-gray-500">Item</th>
              <th className="pb-2 font-medium text-gray-500">Status</th>
              <th className="pb-2 font-medium text-gray-500">Detail</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((g, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 font-medium">{g.field}</td>
                <td className="py-2"><DataGapStatusBadge status={g.status} /></td>
                <td className="py-2 text-gray-500">{g.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function ExecutionStepsChapter({ analysis }: { analysis: MemoAnalysis }) {
  const steps = analysis.executionSteps
  if (!steps?.length) return <EmptyChapter message="No execution steps have been generated." />

  return (
    <Section title="Execution Steps & Next Actions" description="Specific, actionable next steps">
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
              {idx + 1}
            </div>
            <p className="text-sm text-gray-700 pt-1">{step}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Off-plan → MemoAnalysis transformer ──────────────────────

function transformOffplanToMemoAnalysis(
  oa: Record<string, unknown>,
  op?: Record<string, unknown> | null,
  ou?: Record<string, unknown> | null,
  pp?: Record<string, unknown> | null,
  ev?: Record<string, unknown> | null,
  sc?: Record<string, unknown> | null,
): MemoAnalysis {
  const dev = oa.developerAssessment as Record<string, unknown> | undefined
  const loc = oa.locationAnalysis as Record<string, unknown> | undefined
  const fp = oa.financialProjections as Record<string, unknown> | undefined
  const ppa = oa.paymentPlanAnalysis as Record<string, unknown> | undefined
  const risks = oa.riskAssessment as Record<string, unknown>[] | undefined
  const comps = oa.marketComparables as Record<string, unknown>[] | undefined
  const rec = oa.recommendation as Record<string, unknown> | undefined
  const enhanced = (sc?.enhancedPdfData ?? null) as Record<string, unknown> | null
  const rb = (enhanced?.returnBridge ?? null) as Record<string, unknown> | null
  const growth = (enhanced?.growth ?? null) as Record<string, unknown> | null
  const strategy = (enhanced?.strategy ?? null) as Record<string, unknown> | null
  const scenarios = (enhanced?.scenarios ?? null) as Record<string, unknown>[] | null

  const projectSummary = String(oa.projectSummary ?? "")
  const investmentThesis = String(oa.investmentThesis ?? "")

  const headline = ev?.headline
    ? String(ev.headline)
    : `Off-plan opportunity: ${op?.name ?? op?.developer ?? "Property"}`

  const summary = [headline, projectSummary].filter(Boolean).join("\n\n") || investmentThesis

  const keyStrengths = Array.isArray(oa.keyStrengths) ? (oa.keyStrengths as string[]) : []
  const keyConsiderations = Array.isArray(oa.keyConsiderations) ? (oa.keyConsiderations as string[]) : []
  const keyPoints = [...keyStrengths.map(s => `Strength: ${s}`), ...keyConsiderations.map(s => `Consideration: ${s}`)]

  const purchasePrice = Number(fp?.purchasePrice ?? ou?.totalPrice ?? 0)
  const psf = Number(fp?.purchasePrice && ou?.sizeSqft ? Number(fp.purchasePrice) / Number(ou.sizeSqft) : ou?.pricePerSqft ?? 0)
  const annualRent = Number(fp?.estimatedAnnualRent ?? 0)

  const result: MemoAnalysis = {
    summary,
    keyPoints: keyPoints.length > 0 ? keyPoints : undefined,

    neighborhood: loc ? {
      name: String(loc.areaProfile ?? op?.location ? (op?.location as Record<string, unknown>)?.area : ""),
      grade: String(loc.grade ?? ""),
      profile: String(loc.areaProfile ?? ""),
      highlights: Array.isArray(loc.highlights) ? (loc.highlights as string[]) : [],
      metrics: [
        ...(loc.proximity && typeof loc.proximity === "object"
          ? Object.entries(loc.proximity as Record<string, string>).map(([label, value]) => ({ label, value: String(value) }))
          : []),
      ],
    } : undefined,

    locationNarrative: loc ? {
      areaOverview: String(loc.areaProfile ?? ""),
      growthCatalyst: Array.isArray(loc.highlights) ? (loc.highlights as string[]).join(". ") : "",
      amenities: op?.amenities && Array.isArray(op.amenities) && (op.amenities as string[]).length > 0
        ? [{ category: "Project Amenities", items: (op.amenities as string[]).map(name => ({ name, status: "confirmed" })) }]
        : [],
      missingAmenities: [],
      connectivity: loc.proximity && typeof loc.proximity === "object"
        ? Object.entries(loc.proximity as Record<string, string>).map(([destination, value]) => ({
            destination,
            distance: String(value),
            driveTime: "",
          }))
        : [],
    } : undefined,

    property: ou ? {
      description: `${ou.type} unit on level ${ou.level}${ou.views ? ` with ${ou.views} views` : ""}. ${String(ppa?.summary ?? "")}`,
      condition: "Off-plan — under construction",
      specs: [
        { label: "Unit Number", value: String(ou.unitNumber ?? "") },
        { label: "Type", value: String(ou.type ?? "") },
        { label: "Level", value: String(ou.level ?? "") },
        { label: "Size", value: `${Number(ou.sizeSqft ?? 0).toLocaleString()} sqft` },
        { label: "Price / sqft", value: `AED ${Number(ou.pricePerSqft ?? 0).toLocaleString()}` },
        { label: "Total Price", value: `AED ${Number(ou.totalPrice ?? 0).toLocaleString()}` },
        ...(ou.views ? [{ label: "Views", value: String(ou.views) }] : []),
        ...(ou.parking ? [{ label: "Parking", value: String(ou.parking) }] : []),
        ...(op?.completionDate ? [{ label: "Handover", value: String(op.completionDate) }] : []),
        ...(pp ? [
          { label: "During Construction", value: `${pp.constructionPercent ?? 0}%` },
          { label: "Post-Handover", value: `${pp.postHandoverPercent ?? 0}%` },
          { label: "DLD Fee", value: `${pp.dldFeePercent ?? 4}%` },
        ] : []),
      ],
      highlights: Array.isArray(oa.projectHighlights) ? (oa.projectHighlights as string[]) : [],
    } : undefined,

    enhancedDeveloperProfile: dev ? {
      name: String(op?.developer ?? "Developer"),
      legalName: String(op?.developer ?? ""),
      tier: Number(dev.score ?? 0) >= 80 ? "tier_1" : Number(dev.score ?? 0) >= 60 ? "tier_2" : Number(dev.score ?? 0) >= 40 ? "tier_3" : "unverified",
      tierLabel: String(dev.grade ?? "C"),
      founded: undefined,
      listingStatus: "unknown" as const,
      unitsDelivered: undefined,
      notableProjects: (op?.developerTrackRecord as Record<string, unknown>)?.completedProjects
        ? ((op!.developerTrackRecord as Record<string, unknown>).completedProjects as { name: string }[]).map(p => p.name)
        : [],
      deliveryTrackRecord: "unknown" as const,
      buildQuality: "unknown" as const,
      overview: String(dev.trackRecordSummary ?? ""),
      riskAssessment: `Developer score: ${dev.score}/100 (${dev.grade}). Financial stability: ${dev.financialStability ?? "unknown"}.`,
      concerns: Array.isArray(dev.concerns) ? (dev.concerns as string[]) : [],
      escrowStatus: "Not confirmed",
    } : undefined,

    pricing: {
      askingPrice: purchasePrice,
      pricePerSqft: psf,
      recommendedOffer: purchasePrice,
      rentCurrent: 0,
      rentPotential: annualRent,
      irr: rb?.roiOnEquityPct ? Number(rb.roiOnEquityPct) : undefined,
    },

    financialAnalysis: {
      noi: annualRent > 0 ? Math.round(annualRent * 0.8) : undefined,
      capRate: annualRent > 0 && purchasePrice > 0 ? Math.round((annualRent * 0.8 / purchasePrice) * 1000) / 10 : undefined,
      holdPeriod: strategy ? `${strategy.holdPeriod} years` : "5 years post-completion",
      returnBridge: rb ? {
        purchasePrice: Number(rb.purchasePrice ?? 0),
        dldRatePct: Number(rb.dldRatePct ?? 4),
        dldFee: Number(rb.dldFee ?? 0),
        brokerFeePct: Number(rb.brokerFeePct ?? 2),
        brokerFee: Number(rb.brokerFee ?? 0),
        renovation: 0,
        totalProjectCost: Number(rb.totalProjectCost ?? 0),
        mortgageLtvPct: Number(rb.mortgageLtvPct ?? 0),
        mortgageAmount: Number(rb.mortgageAmount ?? 0),
        equityInvested: Number(rb.equityInvested ?? 0),
        annualInterestRatePct: Number(rb.annualInterestRatePct ?? 0),
        annualInterest: Number(rb.annualInterest ?? 0),
        resalePrice: Number(rb.resalePrice ?? 0),
        netSaleProceedsAfterMortgage: Number(rb.netSaleProceedsAfterMortgage ?? 0),
        netProfitAfterInterest: Number(rb.netProfitAfterInterest ?? 0),
        roiOnEquityPct: Number(rb.roiOnEquityPct ?? 0),
        assumptions: rb.assumptions ? String(rb.assumptions) : undefined,
      } : undefined,
    },

    growth: growth ? {
      narrative: String(growth.narrative ?? ""),
      neighborhoodTrend: String(growth.neighborhoodTrend ?? ""),
      annualGrowthBase: Number(growth.annualGrowthBase ?? 0),
      annualGrowthConservative: Number(growth.annualGrowthConservative ?? 0),
      annualGrowthUpside: Number(growth.annualGrowthUpside ?? 0),
      projectedValue1Y: Number(growth.projectedValue1Y ?? 0),
      projectedValue3Y: Number(growth.projectedValue3Y ?? 0),
      projectedValue5Y: Number(growth.projectedValue5Y ?? 0),
      drivers: Array.isArray(growth.drivers) ? (growth.drivers as string[]) : [],
      sensitivities: Array.isArray(growth.sensitivities) ? (growth.sensitivities as string[]) : [],
    } : undefined,

    strategy: strategy ? {
      plan: String(strategy.plan ?? ""),
      holdPeriod: `${strategy.holdPeriod ?? 5} years`,
      exit: String(strategy.exit ?? ""),
      focusPoints: Array.isArray(strategy.focusPoints) ? (strategy.focusPoints as string[]) : [],
    } : undefined,

    investmentThesis: investmentThesis || undefined,

    comparables: comps?.map(c => ({
      name: String(c.project ?? c.name ?? ""),
      distance: String(c.distance ?? "Same area"),
      size: c.sizeSqft ? `${Number(c.sizeSqft).toLocaleString()} sqft` : "",
      closingDate: String(c.completionDate ?? c.date ?? ""),
      price: Number(c.price ?? 0) || (Number(c.pricePerSqft ?? 0) * Number(ou?.sizeSqft ?? 0)),
      pricePerSqft: Number(c.pricePerSqft ?? 0),
      note: c.note ? String(c.note) : c.completionStatus ? `${String(c.completionStatus).replace(/_/g, " ")}${c.appreciation ? ` · +${c.appreciation}%` : ""}` : undefined,
      provenanceLabel: c.source ? String(c.source) : "AI Estimate",
    })),

    riskMatrix: risks?.map((r, i) => {
      const level = String(r.level ?? "medium")
      const likelihood = level === "high" ? 4 : level === "medium" ? 3 : 2
      const impact = level === "high" ? 4 : level === "medium" ? 3 : 2
      const score = likelihood * impact
      return {
        name: String(r.category ?? `Risk ${i + 1}`),
        category: String(r.category ?? "General"),
        likelihood,
        impact,
        score,
        scoreBand: score >= 12 ? "High" : score >= 6 ? "Medium" : "Low",
        mitigation: String(r.mitigation ?? ""),
      }
    }),

    stressTests: scenarios?.map(s => ({
      label: String(s.label ?? ""),
      description: `Annual rent: AED ${Number(s.annualRent ?? 0).toLocaleString()} · Occupancy: ${s.occupancy ?? 0}%`,
      impact: Number(s.netProfit ?? 0) < 0 ? "Loss" : "Reduced return",
      quantifiedEffect: `Exit at AED ${Number(s.exitPrice ?? 0).toLocaleString()} · IRR ${s.fiveYearIrr ?? 0}% · Net profit AED ${Number(s.netProfit ?? 0).toLocaleString()}`,
    })),

    dataGaps: [
      { field: "Construction Progress", status: "missing" as const, detail: "No site visit or official progress report — verify via Oqood certificate" },
      { field: "DLD Verified Comps", status: "unverified" as const, detail: "Comparables are AI-estimated; confirm with DLD transaction data" },
      { field: "Service Charges", status: "assumed" as const, detail: "Estimated at AED 20/sqft for new developments — confirm with developer" },
      { field: "Rental Projections", status: "assumed" as const, detail: "Based on area yield averages; no signed lease evidence" },
      { field: "View Permanence", status: "unverified" as const, detail: "Stated views may be subject to future construction" },
    ],

    executionSteps: [
      `Verify ${op?.developer ?? "developer"} credentials against RERA/DLD registry and confirm escrow status`,
      "Engage independent legal counsel to review Sales and Purchase Agreement (SPA) before any payment",
      `Request unit-specific floor plan and verify Unit ${ou?.unitNumber ?? ""}, Level ${ou?.level ?? ""}, and view direction`,
      "Conduct physical site visit to assess construction progress and surrounding development",
      "Pull DLD-verified transactions for comparable units within 0.5km radius",
      "Obtain written service charge estimate from developer and review historical escalation patterns",
      `Confirm payment schedule: ${pp?.constructionPercent ?? 0}% during construction, ${pp?.postHandoverPercent ?? 0}% post-handover`,
      "Verify parking allocation in official building documentation",
      "If financing post-handover: secure pre-approval from minimum two UAE banks",
      "Establish property management contact for immediate rental marketing upon handover",
    ],

    finalRecommendation: rec ? {
      decision: String(rec.decision ?? "CONDITIONAL") as "PROCEED" | "CONDITIONAL" | "PASS",
      condition: Array.isArray(rec.conditions)
        ? (rec.conditions as string[]).join("; ")
        : String(rec.reasoning ?? ""),
    } : undefined,

    plainEnglishThesis: (() => {
      const projName = op?.name ? String(op.name) : "this off-plan project"
      const devName = op?.developer ? String(op.developer) : "the developer"
      const area = op?.area ? String(op.area) : ""
      const beds = ou?.bedrooms ?? ""
      const unitType = ou?.type ?? "unit"
      const handover = op?.completionDate ? String(op.completionDate) : "a future date"
      return `This report analyzes a ${beds ? `${beds}-bedroom ` : ""}${String(unitType).toLowerCase()} in ${projName}${area ? `, ${area}` : ""}, priced at AED ${purchasePrice.toLocaleString()}${psf ? ` (AED ${psf.toLocaleString()} per square foot)` : ""}. This is an off-plan purchase — you are buying the property before it is built, paying in installments over the construction period, with final handover expected around ${handover}. Off-plan investments typically offer lower entry prices than completed units but carry construction and delivery risk.\n\nThe opportunity thesis rests on ${devName}'s track record, the payment plan structure, and expected capital appreciation during and after the construction period. Key risks include construction delivery uncertainty, market price volatility, and developer execution. The analysis below provides a full probability-impact risk assessment.`
    })(),

    scoringMethodology: {
      dimensions: [
        { name: "Developer Credibility", weight: "0–25 pts", description: "Developer track record, RERA standing, delivery history, financial stability, and escrow compliance" },
        { name: "Location Premium", weight: "0–25 pts", description: "Area grade, infrastructure quality, connectivity, demand drivers, and future development catalysts" },
        { name: "Payment Plan", weight: "0–25 pts", description: "Payment structure attractiveness, post-handover %, DLD fee handling, and cash-flow flexibility during construction" },
        { name: "Appreciation Potential", weight: "0–25 pts", description: "Expected capital growth, rental yield potential post-handover, comparables trajectory, and market cycle positioning" },
      ],
      bands: [
        { range: "80–100", label: "Strong Buy", action: "Priority capital deployment — act within 1–2 weeks" },
        { range: "65–79", label: "Buy", action: "Proceed with standard diligence — 2–4 week timeline" },
        { range: "50–64", label: "Conditional", action: "Address specific conditions before deploying capital" },
        { range: "35–49", label: "Hold / Monitor", action: "Significant concerns — monitor only, do not commit" },
        { range: "0–34", label: "Pass", action: "Does not meet investment criteria at current terms" },
      ],
      keyFactorsUp: Array.isArray(oa.strengths) ? (oa.strengths as string[]).slice(0, 3) : [],
      keyFactorsDown: Array.isArray(oa.concerns) ? (oa.concerns as string[]).slice(0, 3) : [],
    },

    investmentDecision: (() => {
      const verdict = rec ? String(rec.decision ?? "CONDITIONAL") as "PROCEED" | "CONDITIONAL" | "PASS" : "CONDITIONAL" as const
      return {
        verdict,
        confidenceLevel: (dev && Number(dev.score ?? 0) >= 70 ? "high" : "medium") as "high" | "medium" | "low",
        rationale: String(oa.projectSummary ?? rec?.reasoning ?? ""),
        keyDrivers: Array.isArray(oa.strengths) ? (oa.strengths as string[]).slice(0, 4) : [],
        conditionsToMeet: Array.isArray(rec?.conditions) ? (rec!.conditions as string[]) : [],
        dealBreakers: [
          "Developer cannot be verified via RERA/DLD registry",
          "Escrow account not properly constituted or underfunded",
          "Construction has stalled or is significantly behind schedule",
          "SPA terms are not investor-friendly after legal review",
        ],
        suggestedNextSteps: [
          `Verify ${op?.developer ?? "developer"} RERA registration and escrow status`,
          "Engage independent legal counsel for SPA review",
          "Conduct physical site visit to assess construction progress",
          "Pull DLD-verified comparables for the area",
        ],
        exitStrategy: strategy ? `${String(strategy.exit ?? "Exit via resale")} after ${strategy.holdPeriod ?? 5}-year hold.` : "Exit via market resale or rental post-handover.",
        timelineGuidance: verdict === "PROCEED"
          ? "Act within 2–4 weeks to lock preferred unit and payment terms."
          : verdict === "CONDITIONAL"
            ? "Address conditions within 4–6 weeks. Do not deploy capital until all conditions are met."
            : "No urgency. Monitor for improved terms or alternative projects.",
      }
    })(),

    developerProfile: dev ? {
      name: String(op?.developer ?? "Developer"),
      tier: Number(dev.score ?? 0) >= 80 ? "tier_1" as const : Number(dev.score ?? 0) >= 60 ? "tier_2" as const : "unknown" as const,
      tierLabel: String(dev.grade ?? ""),
      overview: String(dev.trackRecordSummary ?? ""),
      trackRecord: String(dev.trackRecordSummary ?? ""),
      notableProjects: [],
      strengths: Array.isArray(dev.strengths) ? (dev.strengths as string[]) : [],
      concerns: Array.isArray(dev.concerns) ? (dev.concerns as string[]) : [],
      escrowStatus: "Verify via RERA portal",
      riskAssessment: String(dev.riskAssessment ?? `Score ${dev.score}/100`),
    } : undefined,

    neighborhoodBenchmarks: oa.locationAnalysis ? (() => {
      const loc = oa.locationAnalysis as Record<string, unknown>
      const areaName = op?.location ? String((op.location as Record<string, unknown>).area ?? "") : ""
      return [{
        community: areaName || "Subject Area",
        priceRange: purchasePrice > 0 ? `AED ${(purchasePrice * 0.85).toLocaleString()} – ${(purchasePrice * 1.15).toLocaleString()}` : "N/A",
        maturity: String(loc.grade ?? "Developing"),
        hasMetro: Boolean(loc.proximity && typeof loc.proximity === "object" && (loc.proximity as Record<string, unknown>).metro),
        character: String(loc.areaProfile ?? "Mixed-use development area"),
        isSubject: true,
      }]
    })() : undefined,
  }

  return result
}

// Legacy off-plan chapter renderers removed — unified via transformOffplanToMemoAnalysis

// ─── Simple / fallback renderers ──────────────────────────────

function SimpleContentChapters({ sc }: { sc: Record<string, unknown> }) {
  return (
    <div className="space-y-6">
      {typeof sc.execSummary === "string" && (
        <Section title="Executive Summary">
          <p className="text-gray-600 leading-relaxed">{sc.execSummary}</p>
        </Section>
      )}
      {typeof sc.mandateFit === "string" && (
        <Section title="Mandate Fit">
          <p className="text-gray-600 leading-relaxed">{sc.mandateFit}</p>
        </Section>
      )}
      {typeof sc.recommendation === "string" && (
        <Section title="Recommendation">
          <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">{sc.recommendation}</p>
          </div>
        </Section>
      )}
    </div>
  )
}

function FallbackContent({ content }: { content: string }) {
  if (!content.trim()) {
    return <EmptyChapter message="No memo content available." />
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Memo Content</CardTitle>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none prose-gray whitespace-pre-line">
        {content}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────

export function MemoChapterTabs({
  analysis,
  contentEvaluation,
  structuredContent,
  propertyImages,
  mapImageUrl,
  mapCoords,
  floorPlanImageUrls,
  isOffplan,
  offplanProject,
  offplanUnit,
  offplanAnalysis,
  offplanPaymentPlan,
  fallbackContent,
}: MemoChapterTabsProps) {
  const [active, setActive] = React.useState<ChapterKey>("executive")

  // Transform off-plan data into the same MemoAnalysis format as built properties
  const effectiveAnalysis = React.useMemo<MemoAnalysis | null | undefined>(() => {
    if (isOffplan && offplanAnalysis) {
      return transformOffplanToMemoAnalysis(
        offplanAnalysis,
        offplanProject,
        offplanUnit,
        offplanPaymentPlan,
        contentEvaluation,
        structuredContent,
      )
    }
    if (analysis) return analysis
    return null
  }, [analysis, isOffplan, offplanAnalysis, offplanProject, offplanUnit, offplanPaymentPlan, contentEvaluation, structuredContent])

  const isSimpleContent =
    !effectiveAnalysis && structuredContent && typeof structuredContent.execSummary === "string"
  const isFallback = !effectiveAnalysis && !isSimpleContent

  const available = React.useMemo<Set<ChapterKey>>(() => {
    const s = new Set<ChapterKey>()

    if (isFallback || isSimpleContent) {
      s.add("executive")
      return s
    }

    if (effectiveAnalysis) {
      s.add("executive")
      if (effectiveAnalysis.locationNarrative || effectiveAnalysis.neighborhood) s.add("location")
      if (effectiveAnalysis.property || effectiveAnalysis.enhancedDeveloperProfile) s.add("property")
      if (effectiveAnalysis.pricing || effectiveAnalysis.financialAnalysis || effectiveAnalysis.growth || effectiveAnalysis.strategy) s.add("financial")
      if (effectiveAnalysis.neighborhoodBenchmarks?.length || effectiveAnalysis.comparables?.length) s.add("comparables")
      if (effectiveAnalysis.riskMatrix?.length || effectiveAnalysis.stressTests?.length || effectiveAnalysis.risks?.length) s.add("risk")
      if (effectiveAnalysis.dataGaps?.length) s.add("gaps")
      if (effectiveAnalysis.executionSteps?.length) s.add("execution")
    }

    return s
  }, [effectiveAnalysis, isFallback, isSimpleContent])

  function renderChapter(): React.ReactNode {
    if (isFallback) return <FallbackContent content={fallbackContent} />
    if (isSimpleContent && structuredContent) return <SimpleContentChapters sc={structuredContent} />

    if (effectiveAnalysis) {
      switch (active) {
        case "executive":
          return <ExecutiveSummaryChapter analysis={effectiveAnalysis} evaluation={contentEvaluation} />
        case "location":
          return <LocationChapter analysis={effectiveAnalysis} mapImageUrl={mapImageUrl} mapCoords={mapCoords} />
        case "property":
          return <PropertyDeveloperChapter analysis={effectiveAnalysis} floorPlanImageUrls={floorPlanImageUrls} />
        case "financial":
          return <FinancialChapter analysis={effectiveAnalysis} />
        case "comparables":
          return <ComparablesChapter analysis={effectiveAnalysis} />
        case "risk":
          return <RiskChapter analysis={effectiveAnalysis} />
        case "gaps":
          return <DataGapsChapter analysis={effectiveAnalysis} />
        case "execution":
          return <ExecutionStepsChapter analysis={effectiveAnalysis} />
        default:
          return <EmptyChapter />
      }
    }

    return <EmptyChapter />
  }

  return (
    <div className="space-y-6">
      {propertyImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {propertyImages.slice(0, 6).map((img, idx) => (
                <div key={`${img.url}-${idx}`} className="relative h-40 overflow-hidden rounded-lg border bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.description ?? "Property"} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isFallback && !isSimpleContent && (
        <ChapterNav active={active} onChange={setActive} available={available} />
      )}

      {renderChapter()}
    </div>
  )
}
