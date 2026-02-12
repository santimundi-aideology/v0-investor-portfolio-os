import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import Image from "next/image"
import { headers } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, User, Building2, Send, ExternalLink, Sparkles } from "lucide-react"
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

  // Extract structured content for direct rendering (if available)
  const rawContent = readLatestContent(rawMemo)
  const structuredContent =
    rawContent && typeof rawContent === "object" && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : null

  // Property-intake memos store property info inside the version content.
  // Use that as a fallback when there's no listing_id in the DB row.
  const contentProperty = structuredContent?.property as Record<string, unknown> | undefined
  const contentEvaluation = structuredContent?.evaluation as Record<string, unknown> | undefined
  const contentSource = structuredContent?.source as Record<string, unknown> | undefined
  const contentImages = contentProperty?.images as string[] | undefined

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
  const dbProperty = listing ? mapListingToProperty(listing as Record<string, unknown>) : undefined

  // Build a synthesized property object from content when no DB listing exists
  const property = dbProperty ?? (contentProperty
    ? {
        id: propertyId || "",
        title: String(contentProperty.title ?? "Property"),
        area: String(contentProperty.area ?? ""),
        subArea: contentProperty.subArea ? String(contentProperty.subArea) : undefined,
        propertyType: String(contentProperty.type ?? ""),
        price: 0,
        bedrooms: Number(contentProperty.bedrooms ?? 0),
        bathrooms: Number(contentProperty.bathrooms ?? 0),
        size: contentProperty.size ? Number(contentProperty.size) : undefined,
        images: contentImages?.map((url: string) => ({ url, description: undefined, category: undefined })),
        imageUrl: contentImages?.[0] ?? undefined,
      } as unknown as import("@/lib/types").Property
    : undefined)

  const normalizedContent = toNarrative(rawContent)

  // Detect off-plan memos
  const isOffplan = structuredContent?.type === "offplan"
  const offplanProject = isOffplan ? (structuredContent?.project as Record<string, unknown> | undefined) : undefined
  const offplanUnit = isOffplan ? (structuredContent?.unit as Record<string, unknown> | undefined) : undefined
  const offplanAnalysis = isOffplan ? (structuredContent?.analysis as Record<string, unknown> | undefined) : undefined
  const offplanPaymentPlan = isOffplan ? (structuredContent?.paymentPlan as Record<string, unknown> | undefined) : undefined

  // Derive the best title
  const derivedTitle =
    (typeof rawMemo.title === "string" && rawMemo.title.trim()) ||
    (isOffplan && offplanProject?.name ? `IC Memo: ${offplanProject.name}` : null) ||
    (property?.title ? `IC Memo: ${property.title}` : null) ||
    (contentProperty?.title ? `IC Memo: ${contentProperty.title}` : null) ||
    (typeof contentEvaluation?.headline === "string" ? String(contentEvaluation.headline) : null) ||
    "Investment Committee Memo"

  const memo: Memo = {
    id: (rawMemo.id as string) ?? id,
    title: derivedTitle,
    investorId,
    investorName:
      (typeof rawMemo.investorName === "string" && rawMemo.investorName) ||
      investor?.name ||
      (investorId ? "Investor" : "Unassigned"),
    propertyId,
    propertyTitle:
      (typeof rawMemo.propertyTitle === "string" && rawMemo.propertyTitle) ||
      property?.title ||
      (contentProperty?.title ? String(contentProperty.title) : "Property"),
    status: normalizeStatus(rawMemo.status, rawMemo.state),
    content: normalizedContent,
    // Prefer top-level analysis; fall back to content.analysis from property-intake memos
    analysis: (rawMemo.analysis as Memo["analysis"]) ??
      (structuredContent?.analysis as Memo["analysis"]) ??
      undefined,
    createdAt: (rawMemo.createdAt as string) || (rawMemo.created_at as string) || new Date().toISOString(),
    updatedAt: (rawMemo.updatedAt as string) || (rawMemo.updated_at as string) || new Date().toISOString(),
  }

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
        <Link href={memo.investorId ? `/investors/${memo.investorId}` : "/memos"}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {memo.investorId ? "Back to Investor" : "Back to Memos"}
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

          {/* ── Off-Plan Memo Rendering ── */}
          {isOffplan && offplanAnalysis ? (
            <>
              {/* Project Summary */}
              <AnalysisSection title="Project Summary" description={offplanProject?.developer ? `by ${String(offplanProject.developer)}` : undefined}>
                <p className="text-gray-500">{String(offplanAnalysis.projectSummary ?? "")}</p>
                {Array.isArray(offplanAnalysis.projectHighlights) && offplanAnalysis.projectHighlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(offplanAnalysis.projectHighlights as string[]).map((h, idx) => (
                      <Badge key={idx} variant="outline">{h}</Badge>
                    ))}
                  </div>
                )}
              </AnalysisSection>

              {/* Unit Details */}
              {offplanUnit && (
                <AnalysisSection title="Unit Analysis" description={`Unit ${offplanUnit.unitNumber} • Level ${offplanUnit.level}`}>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile label="Type" value={String(offplanUnit.type ?? "")} />
                    <StatTile label="Size" value={`${Number(offplanUnit.sizeSqft ?? 0).toLocaleString()} sqft`} />
                    <StatTile label="Price / sqft" value={formatCurrency(Number(offplanUnit.pricePerSqft ?? 0))} />
                    <StatTile label="Total Price" value={formatCurrency(Number(offplanUnit.totalPrice ?? 0))} />
                  </div>
                  {offplanUnit.views && <p className="text-sm text-gray-500">Views: {String(offplanUnit.views)}</p>}
                  {typeof (offplanAnalysis.unitAnalysis as Record<string, unknown>)?.valueAssessment === "string" && (
                    <p className="text-sm text-gray-500">{String((offplanAnalysis.unitAnalysis as Record<string, unknown>).valueAssessment)}</p>
                  )}
                </AnalysisSection>
              )}

              {/* Developer Assessment */}
              {offplanAnalysis.developerAssessment && (() => {
                const dev = offplanAnalysis.developerAssessment as Record<string, unknown>
                return (
                  <AnalysisSection title="Developer Assessment" description={offplanProject?.developer ? String(offplanProject.developer) : undefined}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                        <span className="text-xl font-bold text-amber-700">{String(dev.grade ?? "")}</span>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{String(dev.score ?? "")}/100</p>
                        <p className="text-sm text-gray-500">{String(dev.trackRecordSummary ?? "")}</p>
                      </div>
                    </div>
                    {Array.isArray(dev.strengths) && dev.strengths.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Strengths</p>
                        <ul className="space-y-1">
                          {(dev.strengths as string[]).map((s, idx) => (
                            <li key={idx} className="flex gap-2 text-sm"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" /><span>{s}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(dev.concerns) && dev.concerns.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Concerns</p>
                        <ul className="space-y-1">
                          {(dev.concerns as string[]).map((c, idx) => (
                            <li key={idx} className="flex gap-2 text-sm"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" /><span>{c}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AnalysisSection>
                )
              })()}

              {/* Location Analysis */}
              {offplanAnalysis.locationAnalysis && (() => {
                const loc = offplanAnalysis.locationAnalysis as Record<string, unknown>
                return (
                  <AnalysisSection title="Location Analysis" description={`Grade ${loc.grade ?? ""} • ${String(loc.areaProfile ?? "")}`}>
                    {Array.isArray(loc.highlights) && loc.highlights.length > 0 && (
                      <ul className="space-y-2 text-sm">
                        {(loc.highlights as string[]).map((h, idx) => (
                          <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" /><span>{h}</span></li>
                        ))}
                      </ul>
                    )}
                    {loc.proximity && typeof loc.proximity === "object" && (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(loc.proximity as Record<string, string>).map(([key, value]) => (
                          <StatTile key={key} label={key} value={String(value)} />
                        ))}
                      </div>
                    )}
                  </AnalysisSection>
                )
              })()}

              {/* Payment Plan */}
              {offplanPaymentPlan && offplanAnalysis.paymentPlanAnalysis && (() => {
                const ppa = offplanAnalysis.paymentPlanAnalysis as Record<string, unknown>
                return (
                  <AnalysisSection title="Payment Plan Analysis" description={String(ppa.summary ?? "")}>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <StatTile label="During Construction" value={`${offplanPaymentPlan.constructionPercent ?? 0}%`} />
                      <StatTile label="On Completion" value={`${offplanPaymentPlan.postHandoverPercent ?? 0}%`} />
                      <StatTile label="DLD Fee" value={`${offplanPaymentPlan.dldFeePercent ?? 4}%`} />
                    </div>
                    {Array.isArray(ppa.insights) && ppa.insights.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {(ppa.insights as string[]).map((insight, idx) => (
                          <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" /><span>{insight}</span></li>
                        ))}
                      </ul>
                    )}
                  </AnalysisSection>
                )
              })()}

              {/* Financial Projections */}
              {offplanAnalysis.financialProjections && (() => {
                const fp = offplanAnalysis.financialProjections as Record<string, unknown>
                return (
                  <AnalysisSection title="Financial Projections">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <StatTile label="Purchase Price" value={formatCurrency(Number(fp.purchasePrice ?? 0))} />
                      <StatTile label="Completion Value" value={formatCurrency(Number(fp.estimatedCompletionValue ?? 0))} />
                      <StatTile label="Expected Appreciation" value={`${Number(fp.expectedAppreciation ?? 0).toFixed(1)}%`} />
                      <StatTile label="Est. Annual Rent" value={formatCurrency(Number(fp.estimatedAnnualRent ?? 0))} />
                      <StatTile label="Gross Yield" value={`${fp.projectedRentalYieldGross ?? 0}%`} />
                      <StatTile label="Net Yield" value={`${fp.projectedRentalYieldNet ?? 0}%`} />
                    </div>
                  </AnalysisSection>
                )
              })()}

              {/* Risk Assessment */}
              {Array.isArray(offplanAnalysis.riskAssessment) && (offplanAnalysis.riskAssessment as unknown[]).length > 0 && (
                <AnalysisSection title="Risk Assessment" description={`Overall: ${String(offplanAnalysis.overallRiskLevel ?? "").toUpperCase()}`}>
                  <div className="space-y-3">
                    {(offplanAnalysis.riskAssessment as Record<string, unknown>[]).map((risk, idx) => (
                      <div key={idx} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{String(risk.category ?? "")}</span>
                          <Badge variant={risk.level === "low" ? "default" : risk.level === "high" ? "destructive" : "secondary"}>{String(risk.level ?? "")}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{String(risk.description ?? "")}</p>
                        {risk.mitigation && <p className="text-sm text-green-700 mt-1">Mitigation: {String(risk.mitigation)}</p>}
                      </div>
                    ))}
                  </div>
                </AnalysisSection>
              )}

              {/* Market Comparables */}
              {Array.isArray(offplanAnalysis.marketComparables) && (offplanAnalysis.marketComparables as unknown[]).length > 0 && (
                <AnalysisSection title="Market Comparables">
                  <div className="space-y-3">
                    {(offplanAnalysis.marketComparables as Record<string, unknown>[]).map((comp, idx) => (
                      <div key={idx} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{String(comp.project ?? comp.name ?? "")}</span>
                          {comp.completionStatus && <Badge variant="secondary">{String(comp.completionStatus).replace("_", " ")}</Badge>}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div><p className="text-xs text-gray-500">Price/sqft</p><p className="font-medium">{comp.pricePerSqft ? `AED ${Number(comp.pricePerSqft).toLocaleString()}` : "N/A"}</p></div>
                          {comp.completionDate && <div><p className="text-xs text-gray-500">Completion</p><p className="font-medium">{String(comp.completionDate)}</p></div>}
                          {comp.appreciation && <div><p className="text-xs text-gray-500">Appreciation</p><p className="font-medium text-green-600">+{comp.appreciation}%</p></div>}
                        </div>
                        {comp.note && <p className="text-xs text-gray-500 mt-2">{String(comp.note)}</p>}
                      </div>
                    ))}
                  </div>
                </AnalysisSection>
              )}

              {/* Investment Thesis */}
              {offplanAnalysis.investmentThesis && (
                <AnalysisSection title="Investment Thesis">
                  <p className="text-gray-500">{String(offplanAnalysis.investmentThesis)}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.isArray(offplanAnalysis.keyStrengths) && (offplanAnalysis.keyStrengths as string[]).length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Key Strengths</p>
                        <ul className="space-y-1">
                          {(offplanAnalysis.keyStrengths as string[]).map((s, idx) => (
                            <li key={idx} className="flex gap-2 text-sm"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" /><span>{s}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(offplanAnalysis.keyConsiderations) && (offplanAnalysis.keyConsiderations as string[]).length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Key Considerations</p>
                        <ul className="space-y-1">
                          {(offplanAnalysis.keyConsiderations as string[]).map((c, idx) => (
                            <li key={idx} className="flex gap-2 text-sm"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" /><span>{c}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AnalysisSection>
              )}

              {/* Final Recommendation */}
              {offplanAnalysis.recommendation && (() => {
                const rec = offplanAnalysis.recommendation as Record<string, unknown>
                const decision = String(rec.decision ?? "")
                return (
                  <Card className={decision === "PROCEED" ? "border-green-200 bg-green-50" : decision === "CONDITIONAL" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}>
                    <CardHeader>
                      <CardTitle className="text-lg">Final Recommendation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-2xl font-bold">{decision}</p>
                      {rec.reasoning && <p className="text-gray-600">{String(rec.reasoning)}</p>}
                      {Array.isArray(rec.conditions) && (rec.conditions as string[]).length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Conditions:</p>
                          <ul className="space-y-1">
                            {(rec.conditions as string[]).map((c, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex gap-2"><span>•</span><span>{c}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(rec.suggestedNegotiationPoints) && (rec.suggestedNegotiationPoints as string[]).length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Negotiation Points:</p>
                          <ul className="space-y-1">
                            {(rec.suggestedNegotiationPoints as string[]).map((p, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex gap-2"><span>•</span><span>{p}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Realtor Notes */}
              {typeof structuredContent?.realtorNotes === "string" && structuredContent.realtorNotes.trim() ? (
                <AnalysisSection title="Realtor Notes" description="Internal notes added at intake">
                  <p className="text-sm text-gray-500 italic">{structuredContent.realtorNotes as string}</p>
                </AnalysisSection>
              ) : null}
            </>
          ) : analysis ? (
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

              {/* Investment Thesis + Financial Analysis side by side */}
              {(analysis.investmentThesis || analysis.financialAnalysis) ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {analysis.investmentThesis ? (
                    <AnalysisSection title="Investment Thesis">
                      <p className="text-gray-500">{analysis.investmentThesis}</p>
                    </AnalysisSection>
                  ) : null}
                  {analysis.financialAnalysis ? (
                    <AnalysisSection title="Financial Analysis">
                      <div className="space-y-2">
                        {analysis.financialAnalysis.noi != null ? (
                          <div className="flex justify-between text-sm"><span className="text-gray-500">Current NOI:</span><span className="font-semibold">{formatCurrency(analysis.financialAnalysis.noi)}</span></div>
                        ) : null}
                        {analysis.financialAnalysis.capRate != null ? (
                          <div className="flex justify-between text-sm"><span className="text-gray-500">Cap Rate:</span><span className="font-semibold">{formatPercent(analysis.financialAnalysis.capRate / 100)}</span></div>
                        ) : null}
                        {analysis.financialAnalysis.targetIrr != null ? (
                          <div className="flex justify-between text-sm"><span className="text-gray-500">Target IRR:</span><span className="font-semibold">{formatPercent(analysis.financialAnalysis.targetIrr / 100)}</span></div>
                        ) : null}
                        {analysis.financialAnalysis.holdPeriod ? (
                          <div className="flex justify-between text-sm"><span className="text-gray-500">Hold Period:</span><span className="font-semibold">{analysis.financialAnalysis.holdPeriod}</span></div>
                        ) : null}
                      </div>
                    </AnalysisSection>
                  ) : null}
                </div>
              ) : null}

              {/* Future Value Outlook */}
              {(analysis as Record<string, unknown>).growth ? (() => {
                const growth = (analysis as Record<string, unknown>).growth as {
                  narrative?: string
                  neighborhoodTrend?: string
                  annualGrowthBase?: number
                  annualGrowthConservative?: number
                  annualGrowthUpside?: number
                  projectedValue1Y?: number
                  projectedValue3Y?: number
                  projectedValue5Y?: number
                  drivers?: string[]
                  sensitivities?: string[]
                }
                return (
                  <AnalysisSection title="Future Value Outlook" description="Neighborhood-led value growth scenarios">
                    {growth.narrative ? <p className="text-gray-500">{growth.narrative}</p> : null}
                    <div className="grid gap-3 md:grid-cols-3">
                      {growth.projectedValue1Y != null ? <StatTile label="Projected 1Y Value" value={formatCurrency(growth.projectedValue1Y)} /> : null}
                      {growth.projectedValue3Y != null ? <StatTile label="Projected 3Y Value" value={formatCurrency(growth.projectedValue3Y)} /> : null}
                      {growth.projectedValue5Y != null ? <StatTile label="Projected 5Y Value" value={formatCurrency(growth.projectedValue5Y)} /> : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {growth.annualGrowthBase != null ? <StatTile label="Base Growth" value={`${growth.annualGrowthBase}% / year`} hint="Underwriting base case" /> : null}
                      {growth.annualGrowthConservative != null ? <StatTile label="Conservative" value={`${growth.annualGrowthConservative}% / year`} hint="Downside case" /> : null}
                      {growth.annualGrowthUpside != null ? <StatTile label="Upside" value={`${growth.annualGrowthUpside}% / year`} hint="Upside case" /> : null}
                    </div>
                    {growth.drivers?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Growth Drivers</p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {growth.drivers.map((d, idx) => (
                            <li key={`growth-driver-${idx}`} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </AnalysisSection>
                )
              })() : null}

              {/* Risks & Mitigations — structured version */}
              {analysis.risks?.length ? (
                <AnalysisSection title="Risks & Mitigations" description="Key risks and mitigating factors">
                  <div className="space-y-3">
                    {analysis.risks.map((r, idx) => (
                      <div key={`risk-${idx}`} className="flex gap-2 text-sm">
                        <span className="font-semibold text-gray-900">{idx + 1}.</span>
                        <span><span className="text-gray-700">{r.risk}</span>{r.mitigation ? <> — <span className="text-gray-500">{r.mitigation}</span></> : null}</span>
                      </div>
                    ))}
                  </div>
                </AnalysisSection>
              ) : null}

              {/* Final Recommendation */}
              {analysis.finalRecommendation ? (
                <Card className={analysis.finalRecommendation.decision === "PROCEED" ? "border-green-200 bg-green-50" : analysis.finalRecommendation.decision === "CONDITIONAL" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}>
                  <CardHeader>
                    <CardTitle className="text-lg">Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold">{analysis.finalRecommendation.decision}</p>
                    {analysis.finalRecommendation.condition ? <p className="text-gray-600">{analysis.finalRecommendation.condition}</p> : null}
                  </CardContent>
                </Card>
              ) : null}

              {/* Realtor Notes */}
              {typeof structuredContent?.realtorNotes === "string" && structuredContent.realtorNotes.trim() ? (
                <AnalysisSection title="Realtor Notes" description="Internal notes added at intake">
                  <p className="text-sm text-gray-500 italic">{structuredContent.realtorNotes as string}</p>
                </AnalysisSection>
              ) : null}
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

          {/* Score overview from evaluation */}
          {contentEvaluation ? (
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  AI Investment Analysis
                </CardTitle>
                <CardDescription className="text-gray-300">Analysis complete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {contentEvaluation.factors && typeof contentEvaluation.factors === "object" ? (() => {
                  const factors = contentEvaluation.factors as Record<string, number>
                  // Off-plan factors use different keys
                  const isOffplanFactors = factors.developerCredibility != null || factors.locationPremium != null
                  return (
                    <div className="space-y-2 text-sm">
                      {isOffplanFactors ? (
                        <>
                          {factors.developerCredibility != null ? <div className="flex justify-between"><span className="text-gray-300">Developer Credibility</span><span className="font-semibold">{factors.developerCredibility}/25</span></div> : null}
                          {factors.locationPremium != null ? <div className="flex justify-between"><span className="text-gray-300">Location Premium</span><span className="font-semibold">{factors.locationPremium}/25</span></div> : null}
                          {factors.paymentPlanAttractiveness != null ? <div className="flex justify-between"><span className="text-gray-300">Payment Plan</span><span className="font-semibold">{factors.paymentPlanAttractiveness}/25</span></div> : null}
                          {factors.appreciationPotential != null ? <div className="flex justify-between"><span className="text-gray-300">Appreciation Potential</span><span className="font-semibold">{factors.appreciationPotential}/25</span></div> : null}
                        </>
                      ) : (
                        <>
                          {factors.mandateFit != null ? <div className="flex justify-between"><span className="text-gray-300">Mandate Fit</span><span className="font-semibold">{factors.mandateFit}/25</span></div> : null}
                          {factors.marketTiming != null ? <div className="flex justify-between"><span className="text-gray-300">Market Timing</span><span className="font-semibold">{factors.marketTiming}/25</span></div> : null}
                          {factors.portfolioFit != null ? <div className="flex justify-between"><span className="text-gray-300">Portfolio Fit</span><span className="font-semibold">{factors.portfolioFit}/25</span></div> : null}
                          {factors.riskAlignment != null ? <div className="flex justify-between"><span className="text-gray-300">Risk Alignment</span><span className="font-semibold">{factors.riskAlignment}/25</span></div> : null}
                        </>
                      )}
                    </div>
                  )
                })() : null}
                {contentEvaluation.score != null ? (
                  <div className="pt-2 border-t border-gray-700 text-center">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Overall Score</p>
                    <p className="text-3xl font-bold text-white">{String(contentEvaluation.score)}<span className="text-lg text-gray-400">/100</span></p>
                  </div>
                ) : null}
                {contentEvaluation.recommendation ? (
                  <div className="rounded-lg bg-green-900/40 p-2 text-center">
                    <p className="text-xs uppercase text-gray-400">AI Recommendation</p>
                    <p className="font-semibold text-green-400 capitalize">{String(contentEvaluation.recommendation).replace(/_/g, " ")}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Source info from property-intake */}
          {contentSource ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {contentSource.portal ? <div className="flex justify-between"><span className="text-gray-500">Portal</span><span className="font-medium capitalize">{String(contentSource.portal)}</span></div> : null}
                {contentSource.listingId ? <div className="flex justify-between"><span className="text-gray-500">Listing ID</span><span className="font-medium">{String(contentSource.listingId)}</span></div> : null}
                {contentSource.referenceNumber ? <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-medium">{String(contentSource.referenceNumber)}</span></div> : null}
                {contentSource.permitNumber ? <div className="flex justify-between"><span className="text-gray-500">Permit No.</span><span className="font-medium text-xs">{String(contentSource.permitNumber)}</span></div> : null}
                {contentSource.verified ? <div className="flex justify-between"><span className="text-gray-500">Verified</span><span className="font-medium text-green-600">Yes</span></div> : null}
                {contentSource.developer ? <><Separator /><div className="flex justify-between"><span className="text-gray-500">Developer</span><span className="font-medium">{String(contentSource.developer)}</span></div></> : null}
                {contentSource.completionStatus && contentSource.completionStatus !== "unknown" ? (
                  <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium capitalize">{String(contentSource.completionStatus).replace(/_/g, " ")}</span></div>
                ) : null}
                {contentSource.handoverDate ? <div className="flex justify-between"><span className="text-gray-500">Handover</span><span className="font-medium">{String(contentSource.handoverDate)}</span></div> : null}
                {contentSource.listingUrl ? (
                  <>
                    <Separator />
                    <a href={String(contentSource.listingUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:underline">
                      View Original<ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {memo.investorId ? (
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href={`/investors/${memo.investorId}`}>
                    <User className="mr-2 h-4 w-4" />
                    View Investor
                  </Link>
                </Button>
              ) : null}
              {memo.propertyId ? (
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href={`/properties/${memo.propertyId}`}>
                    <Building2 className="mr-2 h-4 w-4" />
                    View Property
                  </Link>
                </Button>
              ) : null}
              {!memo.investorId && !memo.propertyId ? (
                <p className="text-sm text-gray-500 py-2 text-center">No linked records</p>
              ) : null}
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
