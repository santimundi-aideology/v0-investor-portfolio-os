import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, User, Building2, Send } from "lucide-react"
import Link from "next/link"
import { MemoActions } from "@/components/memos/memo-actions"
import { getMemoById, getPropertyById } from "@/lib/mock-data"
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

function renderMemoContent(content: string) {
  // Simple markdown-like rendering
  const lines = content.split("\n")
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

export default async function MemoPage({ params }: MemoPageProps) {
  const { id } = await params
  const memo = getMemoById(id)
  const property = memo ? getPropertyById(memo.propertyId) : undefined

  if (!memo) {
    notFound()
  }

  const analysis = memo.analysis

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
                        <div key={`${url}-${idx}`} className="overflow-hidden rounded-lg border bg-gray-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={description || property.title} className="h-40 w-full object-cover" />
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
              {memo.status === "draft" && (
                <Button className="w-full bg-transparent" variant="outline">
                  Submit for Review
                </Button>
              )}
              {memo.status === "review" && (
                <>
                  <Button className="w-full">Approve</Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    Request Changes
                  </Button>
                </>
              )}
              {memo.status === "approved" && (
                <Button className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send to Investor
                </Button>
              )}
              {memo.status === "sent" && (
                <p className="py-2 text-center text-sm text-gray-500">Memo has been sent to investor</p>
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
