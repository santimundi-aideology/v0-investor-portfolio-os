import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import Image from "next/image"
import { headers } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, User, Building2, Send } from "lucide-react"
import Link from "next/link"
import { MemoActions } from "@/components/memos/memo-actions"
import { getListingById } from "@/lib/db/listings"
import { getInvestorById } from "@/lib/db/investors"
import { mapListingToProperty } from "@/lib/utils/map-listing"
import { ContextualAICard } from "@/components/ai/contextual-ai-card"
import type { Memo } from "@/lib/types"

interface MemoPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<Memo["status"], string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-amber-50 text-amber-600 border-amber-200",
  approved: "bg-green-50 text-green-600 border-green-200",
  sent: "bg-blue-50 text-blue-600 border-blue-200",
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

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

function renderMemoContent(content: unknown) {
  // Simple markdown-like rendering
  const safeContent =
    typeof content === "string" ? content : content == null ? "" : String(content)
  if (!safeContent.trim()) {
    return [
      <p key="empty-memo" className="text-sm text-gray-500">
        No memo narrative is available yet for this record.
      </p>,
    ]
  }
  const lines = safeContent.split("\n")
  return lines.map((line, index) => {
    // Images
    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)/)
    if (imageMatch) {
      const [, alt, src] = imageMatch
      return (
        <div key={index} className="my-4 overflow-hidden rounded-lg border bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt || "Memo image"} className="w-full object-cover" />
          {alt ? <p className="px-3 py-2 text-xs text-gray-500">{alt}</p> : null}
        </div>
      )
    }
    // Headers
    if (line.startsWith("# ")) {
      return (
        <h1 key={index} className="text-2xl font-bold mt-6 mb-4">
          {line.slice(2)}
        </h1>
      )
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={index} className="text-xl font-semibold mt-5 mb-3">
          {line.slice(3)}
        </h2>
      )
    }
    if (line.startsWith("### ")) {
      return (
        <h3 key={index} className="text-lg font-medium mt-4 mb-2">
          {line.slice(4)}
        </h3>
      )
    }
    // Bold text with **
    if (line.includes("**")) {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={index} className="mb-2">
          {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
        </p>
      )
    }
    // List items
    if (line.startsWith("- ")) {
      return (
        <li key={index} className="ml-4 mb-1 list-disc">
          {line.slice(2)}
        </li>
      )
    }
    if (line.match(/^\d+\. /)) {
      return (
        <li key={index} className="ml-4 mb-1 list-decimal">
          {line.replace(/^\d+\. /, "")}
        </li>
      )
    }
    // Empty lines
    if (line.trim() === "") {
      return <br key={index} />
    }
    // Regular paragraphs
    return (
      <p key={index} className="mb-2 text-gray-500">
        {line}
      </p>
    )
  })
}

function normalizeStatus(rawStatus: unknown, rawState: unknown): Memo["status"] {
  if (rawStatus === "draft" || rawStatus === "review" || rawStatus === "approved" || rawStatus === "sent") {
    return rawStatus
  }

  switch (rawState) {
    case "draft":
      return "draft"
    case "pending_review":
      return "review"
    case "ready":
      return "approved"
    case "sent":
    case "opened":
    case "decided":
      return "sent"
    default:
      return "draft"
  }
}

function readLatestContent(rawMemo: Record<string, unknown>): unknown {
  if (typeof rawMemo.content === "string") return rawMemo.content
  if (typeof rawMemo.content === "object" && rawMemo.content !== null) return rawMemo.content

  if (Array.isArray(rawMemo.versions) && rawMemo.versions.length > 0) {
    const latest = rawMemo.versions[rawMemo.versions.length - 1] as Record<string, unknown>
    return latest?.content
  }

  return ""
}

function toNarrative(content: unknown): string {
  if (typeof content === "string") return content
  if (!content || typeof content !== "object") return ""

  const obj = content as Record<string, unknown>
  const lines: string[] = []

  if (typeof obj.execSummary === "string") {
    lines.push("## Executive Summary", obj.execSummary, "")
  }
  if (typeof obj.mandateFit === "string") {
    lines.push("## Mandate Fit", obj.mandateFit, "")
  }
  if (Array.isArray(obj.assumptions) && obj.assumptions.length > 0) {
    lines.push("## Assumptions")
    for (const item of obj.assumptions) {
      if (typeof item === "string") lines.push(`- ${item}`)
    }
    lines.push("")
  }
  if (Array.isArray(obj.risks) && obj.risks.length > 0) {
    lines.push("## Risks")
    for (const item of obj.risks) {
      if (typeof item === "string") lines.push(`- ${item}`)
    }
    lines.push("")
  }
  if (typeof obj.recommendation === "string") {
    lines.push("## Recommendation", obj.recommendation, "")
  }

  if (lines.length === 0) {
    return JSON.stringify(obj, null, 2)
  }

  return lines.join("\n").trim()
}

export default async function MemoPage({ params }: MemoPageProps) {
  const { id } = await params

  // Fetch memo from API, forwarding request headers for auth context
  const hdrs = await headers()
  const host = hdrs.get("host") ?? "localhost:3000"
  const protocol = hdrs.get("x-forwarded-proto") ?? "http"
  const cookie = hdrs.get("cookie") ?? ""
  const memoRes = await fetch(`${protocol}://${host}/api/memos/${id}`, {
    headers: { cookie },
    cache: "no-store",
  })

  if (!memoRes.ok) {
    notFound()
  }

  const rawMemo = (await memoRes.json()) as Record<string, unknown>

  const investorId =
    (typeof rawMemo.investorId === "string" && rawMemo.investorId) ||
    (typeof rawMemo.investor_id === "string" && rawMemo.investor_id) ||
    ""

  const propertyId =
    (typeof rawMemo.propertyId === "string" && rawMemo.propertyId) ||
    (typeof rawMemo.listingId === "string" && rawMemo.listingId) ||
    (typeof rawMemo.listing_id === "string" && rawMemo.listing_id) ||
    ""

  // Fetch property from DB via listing
  const [listing, investor] = await Promise.all([
    propertyId ? getListingById(propertyId) : Promise.resolve(null),
    investorId ? getInvestorById(investorId) : Promise.resolve(null),
  ])
  const property = listing ? mapListingToProperty(listing as Record<string, unknown>) : undefined
  const normalizedContent = toNarrative(readLatestContent(rawMemo))

  const memo: Memo = {
    id: (rawMemo.id as string) ?? id,
    title:
      (typeof rawMemo.title === "string" && rawMemo.title.trim()) ||
      (property?.title ? `IC Memo: ${property.title}` : "Investment Committee Memo"),
    investorId,
    investorName:
      (typeof rawMemo.investorName === "string" && rawMemo.investorName) ||
      investor?.name ||
      "Investor",
    propertyId,
    propertyTitle:
      (typeof rawMemo.propertyTitle === "string" && rawMemo.propertyTitle) ||
      property?.title ||
      "Property",
    status: normalizeStatus(rawMemo.status, rawMemo.state),
    content: normalizedContent,
    analysis: (rawMemo.analysis as Memo["analysis"]) ?? undefined,
    createdAt: (rawMemo.createdAt as string) || (rawMemo.created_at as string) || new Date().toISOString(),
    updatedAt: (rawMemo.updatedAt as string) || (rawMemo.updated_at as string) || new Date().toISOString(),
  }

  // Extract structured content for direct rendering (if available)
  const rawContent = readLatestContent(rawMemo)
  const structuredContent =
    rawContent && typeof rawContent === "object" && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : null

  const analysis = memo.analysis
  const returnBridge = (analysis as any)?.financialAnalysis?.returnBridge as
    | {
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
    | undefined
  const memoState =
    (typeof rawMemo.state === "string" && rawMemo.state) ||
    (memo.status === "review"
      ? "pending_review"
      : memo.status === "approved"
        ? "ready"
        : memo.status)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/investors/${memo.investorId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Investor
        </Link>
      </Button>

      {/* Memo Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{memo.title}</h1>
            <Badge variant="outline" className={statusColors[memo.status]}>
              {memo.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <Link href={`/investors/${memo.investorId}`} className="hover:text-gray-900">
                {memo.investorName}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <Link href={`/properties/${memo.propertyId}`} className="hover:text-gray-900">
                {memo.propertyTitle}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Updated {formatDate(memo.updatedAt)}</span>
            </div>
          </div>
        </div>
        <MemoActions memo={memo} property={property} />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          {property?.images?.length || property?.imageUrl ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property photos</CardTitle>
                <CardDescription>Auto-pulled from the property record.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(property.images && property.images.length
                    ? property.images
                    : [{ url: property.imageUrl, description: undefined, category: undefined }])
                    ?.filter((img) => Boolean((img as { url?: unknown } | null | undefined)?.url))
                    .map((img, idx) => {
                      const obj = img as { url?: unknown; description?: unknown; category?: unknown }
                      const url = typeof obj.url === "string" ? obj.url : null
                      if (!url) return null
                      const description = typeof obj.description === "string" ? obj.description : undefined
                      const category = typeof obj.category === "string" ? obj.category : undefined
                      return (
                        <div key={`${url}-${idx}`} className="relative h-40 overflow-hidden rounded-lg border bg-gray-50">
                          <Image
                            src={url}
                            alt={description || property.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            unoptimized
                          />
                          <div className="px-3 py-2 text-xs text-gray-500 line-clamp-2">
                            {description || category || property.title}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {analysis ? (
            <>
              <AnalysisSection title="Executive Summary" description="How this property meets the mandate">
                <p className="text-gray-500">{analysis.summary}</p>
                {analysis.keyPoints?.length ? (
                  <ul className="space-y-2 text-sm leading-6 text-gray-900">
                    {analysis.keyPoints.map((point, idx) => (
                      <li key={`key-point-${idx}`} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </AnalysisSection>

              {analysis.neighborhood ? (
                <AnalysisSection title="Neighborhood Analysis" description={analysis.neighborhood.name}>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <Badge variant="secondary" className="uppercase">
                      Grade {analysis.neighborhood.grade}
                    </Badge>
                  </div>
                  <p className="text-gray-500">{analysis.neighborhood.profile}</p>
                  {analysis.neighborhood.metrics?.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {analysis.neighborhood.metrics.map((metric) => (
                        <StatTile key={`${metric.label}-${metric.value}`} label={metric.label} value={metric.value} hint={metric.trend} />
                      ))}
                    </div>
                  ) : null}
                  {analysis.neighborhood.highlights?.length ? (
                    <ul className="space-y-2 text-sm text-gray-900">
                      {analysis.neighborhood.highlights.map((highlight, idx) => (
                        <li key={`neighborhood-highlight-${idx}`} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </AnalysisSection>
              ) : null}

              {analysis.property ? (
                <AnalysisSection title="Property Description" description={analysis.property.condition}>
                  <p className="text-gray-500">{analysis.property.description}</p>
                  {analysis.property.specs?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {analysis.property.specs.map((spec) => (
                        <div key={spec.label} className="rounded-lg border bg-gray-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">{spec.label}</p>
                          <p className="text-base font-semibold">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {analysis.property.highlights?.length ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Highlights</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {analysis.property.highlights.map((highlight, idx) => (
                          <li key={`property-highlight-${idx}`} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </AnalysisSection>
              ) : null}

              {analysis.market ? (
                <AnalysisSection title="Market Analysis" description="Demand & supply signals">
                  <p className="text-gray-500">{analysis.market.overview}</p>
                  {analysis.market.drivers?.length ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Key drivers</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {analysis.market.drivers.map((driver, idx) => (
                          <li key={`market-driver-${idx}`} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                            <span>{driver}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-3">
                    {analysis.market.supply ? (
                      <StatTile label="Supply" value={analysis.market.supply} hint="Pipeline view" />
                    ) : null}
                    {analysis.market.demand ? (
                      <StatTile label="Demand" value={analysis.market.demand} hint="Tenant profile" />
                    ) : null}
                    {analysis.market.absorption ? (
                      <StatTile label="Absorption" value={analysis.market.absorption} hint="Last 12 months" />
                    ) : null}
                  </div>
                </AnalysisSection>
              ) : null}

              {analysis.pricing ? (
                <AnalysisSection title="Pricing & Upside" description="Actual vs potential value">
                  <div className="grid gap-3 md:grid-cols-3">
                    <StatTile label="Asking price" value={formatCurrency(analysis.pricing.askingPrice)} />
                    <StatTile label="Recommended offer" value={formatCurrency(analysis.pricing.recommendedOffer)} />
                    <StatTile label="Stabilized value" value={formatCurrency(analysis.pricing.stabilizedValue)} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <StatTile label="Price / sq ft" value={formatPerSqft(analysis.pricing.pricePerSqft)} hint="Subject" />
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
              ) : null}

              {returnBridge ? (
                <AnalysisSection title="ROI on Equity Bridge" description="Levered return stack">
                  <div className="space-y-2">
                    {[
                      { label: "Purchase price", value: formatCurrency(returnBridge.purchasePrice) },
                      { label: "DLD fee", value: formatCurrency(returnBridge.dldFee) },
                      { label: "DLD fee rate", value: `${(returnBridge.dldRatePct ?? 4).toFixed(1)}%` },
                      { label: "Broker fee", value: formatCurrency(returnBridge.brokerFee) },
                      { label: "Broker fee rate", value: `${(returnBridge.brokerFeePct ?? 2).toFixed(1)}%` },
                      { label: "Renovation", value: formatCurrency(returnBridge.renovation) },
                      { label: "Total project cost", value: formatCurrency(returnBridge.totalProjectCost) },
                      { label: "Mortgage amount", value: formatCurrency(returnBridge.mortgageAmount) },
                      { label: "Mortgage LTV", value: `${(returnBridge.mortgageLtvPct ?? 70).toFixed(1)}%` },
                      { label: "Equity invested", value: formatCurrency(returnBridge.equityInvested) },
                      { label: "Annual interest", value: formatCurrency(returnBridge.annualInterest) },
                      { label: "Interest rate", value: `${(returnBridge.annualInterestRatePct ?? 3.5).toFixed(1)}%` },
                      { label: "Resale price", value: formatCurrency(returnBridge.resalePrice) },
                      { label: "Net sale proceeds after mortgage repayment", value: formatCurrency(returnBridge.netSaleProceedsAfterMortgage) },
                      { label: "Net profit (after interest)", value: formatCurrency(returnBridge.netProfitAfterInterest) },
                      { label: "ROI on equity", value: `${returnBridge.roiOnEquityPct.toFixed(1)}%` },
                    ].map((row) => (
                      <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border bg-gray-50 px-3 py-2">
                        <p className="text-sm text-gray-600">{row.label}</p>
                        <p className="text-sm font-semibold text-gray-900">{row.value}</p>
                      </div>
                    ))}
                    {returnBridge.assumptions ? <p className="text-xs text-gray-500">{returnBridge.assumptions}</p> : null}
                  </div>
                </AnalysisSection>
              ) : null}

              {analysis.comparables?.length ? (
                <AnalysisSection title="Comparable Sales" description="Recent reference trades">
                  <div className="space-y-3">
                    {analysis.comparables.map((comp) => (
                      <div key={`${comp.name}-${comp.closingDate}`} className="rounded-lg border bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                          <span>{comp.name}</span>
                          <span className="text-gray-500">{comp.distance}</span>
                        </div>
                        <p className="text-xs uppercase text-gray-500">{comp.closingDate}</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase text-gray-500">Price</p>
                            <p className="text-base font-semibold">{formatCurrency(comp.price)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500">Size</p>
                            <p className="text-base font-semibold">{comp.size}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500">Price / sq ft</p>
                            <p className="text-base font-semibold">{formatPerSqft(comp.pricePerSqft)}</p>
                          </div>
                        </div>
                        {comp.note ? <p className="mt-2 text-sm text-gray-500">{comp.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </AnalysisSection>
              ) : null}

              {analysis.strategy ? (
                <AnalysisSection title="Strategy & Execution" description={`${analysis.strategy.holdPeriod} • ${analysis.strategy.exit}`}>
                  <p className="text-gray-500">{analysis.strategy.plan}</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {analysis.strategy.focusPoints.map((point, idx) => (
                      <li key={`strategy-point-${idx}`} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </AnalysisSection>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Full Memo Narrative</CardTitle>
                  <CardDescription>Original markdown memo</CardDescription>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none prose-gray">{renderMemoContent(memo.content)}</CardContent>
              </Card>
            </>
          ) : structuredContent && typeof structuredContent.execSummary === "string" ? (
            <>
              <AnalysisSection title="Executive Summary" description="Investment thesis overview">
                <p className="text-gray-600 leading-relaxed">{structuredContent.execSummary as string}</p>
              </AnalysisSection>

              {typeof structuredContent.mandateFit === "string" ? (
                <AnalysisSection title="Mandate Fit" description="How this property meets the investor's mandate">
                  <p className="text-gray-600 leading-relaxed">{structuredContent.mandateFit as string}</p>
                </AnalysisSection>
              ) : null}

              {structuredContent.financials &&
               typeof structuredContent.financials === "object" &&
               !Array.isArray(structuredContent.financials) ? (
                <AnalysisSection title="Financial Overview" description="Key financial metrics">
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {Object.entries(structuredContent.financials as Record<string, unknown>).map(
                      ([key, val]) => {
                        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        const display =
                          typeof val === "number"
                            ? key.toLowerCase().includes("rate")
                              ? `${val}%`
                              : formatCurrency(val)
                            : String(val ?? "—")
                        return <StatTile key={key} label={label} value={display} />
                      }
                    )}
                  </div>
                </AnalysisSection>
              ) : null}

              {Array.isArray(structuredContent.assumptions) && structuredContent.assumptions.length > 0 ? (
                <AnalysisSection title="Key Assumptions" description="Underwriting parameters">
                  <ul className="space-y-2 text-sm leading-6 text-gray-900">
                    {(structuredContent.assumptions as string[]).map((item, idx) => (
                      <li key={`assumption-${idx}`} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </AnalysisSection>
              ) : null}

              {Array.isArray(structuredContent.risks) && structuredContent.risks.length > 0 ? (
                <AnalysisSection title="Risk Factors" description="Key risks and mitigants">
                  <ul className="space-y-2 text-sm leading-6 text-gray-900">
                    {(structuredContent.risks as string[]).map((item, idx) => (
                      <li key={`risk-${idx}`} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </AnalysisSection>
              ) : null}

              {Array.isArray(structuredContent.risk_factors) && structuredContent.risk_factors.length > 0 ? (
                <AnalysisSection title="Risk Factors" description="Key risks and mitigants">
                  <ul className="space-y-2 text-sm leading-6 text-gray-900">
                    {(structuredContent.risk_factors as string[]).map((item, idx) => (
                      <li key={`risk-factor-${idx}`} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </AnalysisSection>
              ) : null}

              {typeof structuredContent.recommendation === "string" ? (
                <AnalysisSection title="Recommendation" description="IC recommendation">
                  <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-900 leading-relaxed">
                      {structuredContent.recommendation as string}
                    </p>
                  </div>
                </AnalysisSection>
              ) : null}

              {typeof structuredContent.agent_notes === "string" ? (
                <AnalysisSection title="Agent Notes" description="Internal notes">
                  <p className="text-sm text-gray-500 italic">{structuredContent.agent_notes as string}</p>
                </AnalysisSection>
              ) : null}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Memo Content</CardTitle>
                <CardDescription>Full memo text</CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none prose-gray">{renderMemoContent(memo.content)}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* AI Risk Assessment Assistant */}
          <ContextualAICard
            agentId="risk_assessment"
            title="Risk Assessment"
            description="Analyze risks and get recommendations"
            suggestions={[
              "What are the risks in this deal?",
              "Does this fit the investor's mandate?",
              "Stress test this investment"
            ]}
            propertyId={memo.propertyId}
            investorId={memo.investorId}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Status</span>
                <Badge variant="outline" className={statusColors[memo.status]}>
                  {memo.status}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{formatDate(memo.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Updated</span>
                  <span>{formatDate(memo.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow</CardTitle>
              <CardDescription>Move memo through approval process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {memoState === "draft" && (
                <Button className="w-full bg-transparent" variant="outline">
                  Submit for Review
                </Button>
              )}
              {memoState === "pending_review" && (
                <>
                  <Button className="w-full">Approve</Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    Request Changes
                  </Button>
                </>
              )}
              {memoState === "ready" && (
                <Button className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send to Investor
                </Button>
              )}
              {(memoState === "sent" || memoState === "opened") && (
                <p className="py-2 text-center text-sm text-gray-500">Memo has been sent to investor</p>
              )}
              {memoState === "decided" && (
                <p className="py-2 text-center text-sm text-gray-500">Investor decision has been recorded for this memo</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/investors/${memo.investorId}`}>
                  <User className="mr-2 h-4 w-4" />
                  View Investor
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/properties/${memo.propertyId}`}>
                  <Building2 className="mr-2 h-4 w-4" />
                  View Property
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface AnalysisSectionProps {
  title: string
  description?: string
  children: ReactNode
}

function AnalysisSection({ title, description, children }: AnalysisSectionProps) {
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

interface StatTileProps {
  label: string
  value?: string | number
  hint?: string
}

function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-lg border bg-gray-50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-semibold">{value ?? "—"}</p>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}
