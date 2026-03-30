"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  Info,
  Landmark,
  MapPin,
  Newspaper,
  PieChart,
  Radar,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { DubaiNeighborhoodsMap } from "@/components/map/dubai-neighborhoods-map"
import { cn } from "@/lib/utils"
import { formatMarketSignalType } from "@/lib/types"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import type { MarketSignalType } from "@/lib/types"

type SignalItem = {
  id: string
  type: string
  title: string
  description: string
  area: string
  propertyType: string | null
  severity: string
  detectedAt: string
}

function getSignalIcon(type: string): React.ReactNode {
  const t = (type || "").toLowerCase()
  if (t.includes("policy") || t.includes("visa") || t.includes("regulation")) {
    return <Landmark className="size-5 text-amber-600" />
  }
  if (
    t.includes("price") ||
    t.includes("rent") ||
    t.includes("yield") ||
    t.includes("transaction") ||
    t.includes("pricing") ||
    t.includes("discount")
  ) {
    return <BarChart3 className="size-5 text-emerald-600" />
  }
  return <MapPin className="size-5 text-sky-600" />
}

function getSignalDetailImage(type: string, area: string): string | null {
  const t = (type || "").toLowerCase()
  const a = (area || "").toLowerCase()
  if (t.includes("policy") || t.includes("visa")) {
    return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80"
  }
  if (t.includes("price") || t.includes("rent") || t.includes("yield")) {
    return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80"
  }
  if (a.includes("marina")) return "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80"
  if (a.includes("palm")) return "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&q=80"
  if (a.includes("downtown")) return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"
  return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"
}

// Noticias: cada una con imagen única (no repetir ninguna)
const MOCK_NEWS: Array<{
  id: string
  title: string
  excerpt: string
  source: string
  publishedAt: string
  category: string
  url?: string
  imageUrl?: string
}> = [
  {
    id: "1",
    title: "Dubai property transactions hit record high in Q1 2025",
    excerpt: "Off-plan and secondary market activity continues to drive growth across prime communities.",
    source: "Gulf News",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    category: "Market",
    url: "https://gulfnews.com/business/property",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
  },
  {
    id: "2",
    title: "Rental yields in Dubai Marina and JBR remain above 7%",
    excerpt: "Investor demand for furnished units keeps occupancy and yields stable despite new supply.",
    source: "Property Weekly",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    category: "Yields",
    url: "https://example.com/property-weekly",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
  },
  {
    id: "3",
    title: "New visa and ownership rules boost expat investor interest",
    excerpt: "Golden Visa and extended ownership options are attracting more international buyers.",
    source: "Arabian Business",
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    category: "Policy",
    url: "https://www.arabianbusiness.com",
    imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
  },
  {
    id: "4",
    title: "Off-plan payment plans: what developers are offering in 2025",
    excerpt: "Comparison of post-handover and during-construction payment plans across key projects.",
    source: "Dubai Land Department",
    publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    category: "Off-plan",
    url: "https://dubailand.gov.ae",
    imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
  },
]

function formatTimeAgo(iso: string) {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  const diff = Date.now() - t
  const minutes = Math.round(diff / (1000 * 60))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

type NeighborhoodDetail = {
  name: string
  slug: string
  desc: string
  avgYieldPct: number
  avgPricePsf: number
  occupancyPct: number
  popularTypes: string[]
  topics: string[]
}

const DUBAI_NEIGHBORHOODS: NeighborhoodDetail[] = [
  {
    name: "Dubai Marina",
    slug: "dubai-marina",
    desc: "Waterfront towers, high yields",
    avgYieldPct: 7.2,
    avgPricePsf: 1850,
    occupancyPct: 94,
    popularTypes: ["1BR", "2BR", "Studio"],
    topics: ["Marina walk", "Beach access", "Metro link", "High rental demand", "Off-plan completions"],
  },
  {
    name: "Downtown Dubai",
    slug: "downtown",
    desc: "Burj Khalifa, DXB Gate",
    avgYieldPct: 5.8,
    avgPricePsf: 2200,
    occupancyPct: 92,
    popularTypes: ["1BR", "2BR", "3BR"],
    topics: ["Burj Khalifa", "Dubai Mall", "Luxury segment", "Capital appreciation", "Tourism hub"],
  },
  {
    name: "Palm Jumeirah",
    slug: "palm-jumeirah",
    desc: "Luxury villas & apartments",
    avgYieldPct: 6.5,
    avgPricePsf: 2400,
    occupancyPct: 88,
    popularTypes: ["Villa", "3BR", "4BR"],
    topics: ["Beachfront", "Premium villas", "Hotel brands", "Quiet living", "Views"],
  },
  {
    name: "JBR",
    slug: "jbr",
    desc: "Beach, walk, family demand",
    avgYieldPct: 6.8,
    avgPricePsf: 1650,
    occupancyPct: 91,
    popularTypes: ["1BR", "2BR", "Studio"],
    topics: ["The Walk", "Beach", "Family-friendly", "Short-term rentals", "F&B scene"],
  },
  {
    name: "Business Bay",
    slug: "business-bay",
    desc: "Central business district",
    avgYieldPct: 6.2,
    avgPricePsf: 1550,
    occupancyPct: 90,
    popularTypes: ["1BR", "2BR", "Office"],
    topics: ["Canal views", "Metro", "Corporate tenants", "Affordable prime", "New stock"],
  },
  {
    name: "Dubai Hills",
    slug: "dubai-hills",
    desc: "Green, family, mid-high end",
    avgYieldPct: 5.5,
    avgPricePsf: 1450,
    occupancyPct: 93,
    popularTypes: ["2BR", "3BR", "Villa"],
    topics: ["Park", "Golf", "Schools", "Family demand", "Emaar masterplan"],
  },
  {
    name: "Arabian Ranches",
    slug: "arabian-ranches",
    desc: "Villas, golf, community",
    avgYieldPct: 5.2,
    avgPricePsf: 1200,
    occupancyPct: 95,
    popularTypes: ["Villa", "3BR", "4BR"],
    topics: ["Golf course", "Villa community", "Schools", "Long-term tenants", "Suburban"],
  },
]

const DUBAI_DEVELOPERS = [
  { name: "Emaar", url: "https://www.emaar.com", logo: "https://logo.clearbit.com/emaar.com" },
  { name: "Nakheel", url: "https://www.nakheel.com", logo: "https://logo.clearbit.com/nakheel.com" },
  { name: "Damac", url: "https://www.damacproperties.com", logo: "https://logo.clearbit.com/damacproperties.com" },
  { name: "Meraas", url: "https://www.meraas.com", logo: "https://logo.clearbit.com/meraas.com" },
  { name: "Sobha", url: "https://www.sobha.com", logo: "https://logo.clearbit.com/sobha.com" },
]

const KEY_DATES: Array<{ date: string; title: string; desc?: string }> = [
  { date: "Mar 2025", title: "RERA rental index update", desc: "New index may affect renewal benchmarks" },
  { date: "Q2 2025", title: "DLD transaction deadlines", desc: "Off-plan registration windows" },
  { date: "Apr 2025", title: "Visa rule review", desc: "Golden Visa / ownership eligibility" },
  { date: "May–Jun 2025", title: "Handover waves", desc: "Key project completions (Marina, Creek)" },
  { date: "Jun 2025", title: "Mid-year market report", desc: "Official DLD statistics" },
]

type MemoItem = {
  id: string
  title: string
  summary: string | null
  status: string
  state: string
  propertyTitle?: string | null
  propertyArea?: string | null
  propertyPrice?: number | null
  updatedAt: string
  createdAt: string
}

function SignalDetailDialog({
  signal,
  open,
  onOpenChange,
}: {
  signal: SignalItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!signal) return null
  const detailImage = getSignalDetailImage(signal.type, signal.area)
  const mockTrend = [72, 78, 75, 82, 88, 85, 90]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[40vw] min-w-[320px] max-w-[560px] overflow-y-auto p-0 gap-0"
      >
        <SheetHeader className="px-5 pt-5 pb-2">
          <SheetTitle className="pr-8 text-lg">{signal.title}</SheetTitle>
          <SheetDescription>
            {signal.area}
            {signal.propertyType ? ` · ${signal.propertyType}` : ""} ·{" "}
            {formatMarketSignalType(signal.type as MarketSignalType)}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-5 pb-5">
          {detailImage && (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <img
                src={detailImage}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-2 left-2">
                <Badge
                  className={cn(
                    "text-[10px]",
                    signal.severity === "high"
                      ? "bg-rose-500/90 text-white"
                      : signal.severity === "medium"
                        ? "bg-amber-500/90 text-white"
                        : "bg-emerald-600/90 text-white"
                  )}
                >
                  {signal.severity === "high" ? "Urgent" : signal.severity === "medium" ? "Watch" : "Info"}
                </Badge>
              </div>
            </div>
          )}
          {signal.description && (
            <p className="text-sm text-muted-foreground">{signal.description}</p>
          )}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-border dark:bg-muted/30">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Trend (example)
            </p>
            <div className="flex items-end gap-1 h-16">
              {mockTrend.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 rounded-t bg-primary/70 dark:bg-primary"
                  style={{ height: `${Math.max(10, (val / 100) * 70)}%` }}
                  title={`${val}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Detected {formatTimeAgo(signal.detectedAt)}</span>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link href="/investor/market-signals" onClick={() => onOpenChange(false)}>
                View all signals
                <ArrowUpRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function NeighborhoodDetailDialog({
  neighborhood,
  open,
  onOpenChange,
  allNeighborhoods,
}: {
  neighborhood: NeighborhoodDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  allNeighborhoods: NeighborhoodDetail[]
}) {
  const [compareSlug, setCompareSlug] = React.useState<string | null>(null)
  const compareTarget = compareSlug
    ? allNeighborhoods.find((n) => n.slug === compareSlug) ?? null
    : null

  React.useEffect(() => {
    if (!open) setCompareSlug(null)
  }, [open])

  if (!neighborhood) return null
  const n = neighborhood
  const showCompare = Boolean(compareTarget && compareTarget.slug !== n.slug)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[40vw] min-w-[320px] max-w-[560px] overflow-y-auto p-0 gap-0"
      >
        <SheetHeader className="px-5 pt-5 pb-2">
          <SheetTitle className="flex items-center gap-2 pr-8">
            <MapPin className="size-5 text-primary" />
            {showCompare ? `${n.name} vs ${compareTarget?.name}` : n.name}
          </SheetTitle>
          <SheetDescription>
            {showCompare ? "Side-by-side comparison" : n.desc}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 pt-2 px-5 pb-5">
          {!showCompare ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Compare with</span>
                <Select
                  value={compareSlug ?? ""}
                  onValueChange={(v) => setCompareSlug(v || null)}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Select neighborhood…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allNeighborhoods
                      .filter((other) => other.slug !== n.slug)
                      .map((other) => (
                        <SelectItem key={other.slug} value={other.slug} className="text-sm">
                          {other.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 text-center dark:border-border dark:bg-muted/30">
                  <p className="text-lg font-semibold text-foreground">{n.avgYieldPct}%</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Avg yield</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 text-center dark:border-border dark:bg-muted/30">
                  <p className="text-lg font-semibold text-foreground">AED {n.avgPricePsf.toLocaleString()}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">/ psf</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 text-center dark:border-border dark:bg-muted/30">
                  <p className="text-lg font-semibold text-foreground">{n.occupancyPct}%</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Occupancy</p>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Popular types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {n.popularTypes.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Topics & highlights
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {n.topics.map((topic) => (
                    <li key={topic} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setCompareSlug(null)}
              >
                ← Back to {n.name}
              </Button>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-border dark:bg-muted/30">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">KPI</th>
                      <th className="px-3 py-2 text-right font-medium text-foreground">{n.name}</th>
                      <th className="px-3 py-2 text-right font-medium text-foreground">{compareTarget!.name}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border">
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Avg yield</td>
                      <td className="px-3 py-2 text-right font-medium">{n.avgYieldPct}%</td>
                      <td className="px-3 py-2 text-right font-medium">{compareTarget!.avgYieldPct}%</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">AED / psf</td>
                      <td className="px-3 py-2 text-right font-medium">{n.avgPricePsf.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">{compareTarget!.avgPricePsf.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Occupancy</td>
                      <td className="px-3 py-2 text-right font-medium">{n.occupancyPct}%</td>
                      <td className="px-3 py-2 text-right font-medium">{compareTarget!.occupancyPct}%</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Popular types</td>
                      <td className="px-3 py-2 text-right">{n.popularTypes.join(", ")}</td>
                      <td className="px-3 py-2 text-right">{compareTarget!.popularTypes.join(", ")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{n.name} — topics</p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {n.topics.map((t) => (
                      <li key={t}>• {t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{compareTarget!.name} — topics</p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {compareTarget!.topics.map((t) => (
                      <li key={t}>• {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function ContextActivityPage() {
  const { scopedInvestorId } = useApp()
  const [selectedSignal, setSelectedSignal] = React.useState<SignalItem | null>(null)
  const [signalDialogOpen, setSignalDialogOpen] = React.useState(false)
  const [selectedNeighborhood, setSelectedNeighborhood] = React.useState<NeighborhoodDetail | null>(null)
  const [neighborhoodDialogOpen, setNeighborhoodDialogOpen] = React.useState(false)

  const { data: signalsResponse, isLoading: signalsLoading } = useAPI<{
    signals: SignalItem[]
  }>("/api/market-signals")

  const { data: memos = [], isLoading: memosLoading } = useAPI<MemoItem[]>("/api/investor/memos")

  const { data: portfolioData } = useAPI<{
    summary: { totalValue: number }
    holdings: Array<{ property: { area?: string } | null; financials: { currentValue: number } }>
  }>(scopedInvestorId ? `/api/portfolio/${scopedInvestorId}` : null)

  const latestMemos = React.useMemo(() => memos.slice(0, 8), [memos])

  const exposureByArea = React.useMemo(() => {
    const holdings = portfolioData?.holdings ?? []
    if (holdings.length === 0) return []
    const total = holdings.reduce((s, h) => s + (h.financials?.currentValue ?? 0), 0)
    if (total === 0) return []
    const byArea = new Map<string, number>()
    for (const h of holdings) {
      const area = h.property?.area?.trim() || "Other"
      byArea.set(area, (byArea.get(area) ?? 0) + (h.financials?.currentValue ?? 0))
    }
    return Array.from(byArea.entries())
      .map(([area, value]) => ({ area, value, pct: Math.round((value / total) * 1000) / 10 }))
      .sort((a, b) => b.value - a.value)
  }, [portfolioData])

  const displaySignals = React.useMemo(() => {
    const signals = signalsResponse?.signals ?? []
    const sorted = [...signals].sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    )
    return sorted.slice(0, 3)
  }, [signalsResponse])

  const onSignalClick = React.useCallback((s: SignalItem) => {
    setSelectedSignal(s)
    setSignalDialogOpen(true)
  }, [])

  const onNeighborhoodClick = React.useCallback((n: NeighborhoodDetail) => {
    setSelectedNeighborhood(n)
    setNeighborhoodDialogOpen(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Hero: premium green gradient (match Overview) */}
      <section
        className={cn(
          "relative min-h-[180px] w-screen overflow-hidden sm:min-h-[200px]",
          "left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]",
          "rounded-b-2xl shadow-lg sm:rounded-b-3xl"
        )}
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(15,41,34,0.92) 0%, rgba(15,41,34,0.88) 50%, rgba(15,41,34,0.94) 100%), url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1920&q=80')",
          backgroundSize: "115%",
          backgroundPosition: "center 40%",
          backgroundColor: "#0f2922",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-white/90 hover:bg-white/10 hover:text-white"
              >
                <Link href="/investor/dashboard">
                  <ArrowLeft className="size-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Context & Activity
                </h1>
                <p className="mt-1 text-sm text-white/85 sm:text-base">
                  Market updates, data and real estate news that matter to your investments
                </p>
              </div>
            </div>
            <AskAIBankerWidget
              agentId="market_intelligence"
              title="Market & News AI"
              description="Ask about market trends and news"
              suggestedQuestions={[
                "What's the outlook for my portfolio areas?",
                "Summarize today's real estate news",
                "Any risks I should be aware of?",
              ]}
              pagePath="/investor/context-activity"
              scopedInvestorId={scopedInvestorId}
              variant="inline"
            />
          </div>
        </div>
      </section>

      <SignalDetailDialog
        signal={selectedSignal}
        open={signalDialogOpen}
        onOpenChange={setSignalDialogOpen}
      />
      <NeighborhoodDetailDialog
        neighborhood={selectedNeighborhood}
        open={neighborhoodDialogOpen}
        onOpenChange={setNeighborhoodDialogOpen}
        allNeighborhoods={DUBAI_NEIGHBORHOODS}
      />

      <div className="w-full py-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {/* 1) Market signals: compactos, tipo notificaciones destacadas, solo iconos (demo) */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Market signals
                </h2>
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link href="/investor/market-signals">
                    View all
                    <ArrowUpRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Example alerts. Tap one for details and charts.
              </p>
              {signalsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : displaySignals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-muted/30 py-8 text-center dark:border-border">
                  <Radar className="mx-auto size-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    No market signals yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Alerts will appear here when detected. For demo, connect your signals API.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {displaySignals.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSignalClick(s)}
                        className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left transition-all hover:border-primary/30 hover:bg-primary/5 dark:border-border dark:bg-card"
                      >
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg",
                            s.severity === "high"
                              ? "bg-rose-500/10"
                              : s.severity === "medium"
                                ? "bg-amber-500/10"
                                : "bg-emerald-500/10"
                          )}
                        >
                          {getSignalIcon(s.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.area || "Market"}
                            {s.propertyType ? ` · ${s.propertyType}` : ""} ·{" "}
                            {formatTimeAgo(s.detectedAt)}
                          </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 2) News */}
            <section className="border-t border-gray-100 pt-6 dark:border-border">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                News
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Curated real estate headlines. Click to open the article.
              </p>
              <div className="rounded-xl border border-dashed border-gray-200 bg-muted/30 py-8 text-center dark:border-border">
                <Newspaper className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  No activity data yet
                </p>
                <p className="text-xs text-muted-foreground">
                  News and market updates will appear here once available.
                </p>
              </div>
            </section>

            {/* 3) Dubai: información para el cliente, barrios, constructoras, mapa, búsqueda */}
            <section className="border-t border-gray-100 pt-6 dark:border-border">
              <div className="mb-4 flex items-center gap-2">
                <Info className="size-5 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Dubai — Information
                </h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Key areas, developers and an interactive map to explore the market.
              </p>

              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <Card className="overflow-hidden rounded-2xl border border-gray-200/80 shadow-sm dark:border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="size-4 text-primary" />
                      Key dates
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Market calendar — dates that matter</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {KEY_DATES.map((item, i) => (
                      <div
                        key={i}
                        className="flex gap-3 rounded-lg border border-gray-100 py-2 px-2.5 dark:border-border"
                      >
                        <span className="shrink-0 text-xs font-medium text-muted-foreground w-16">
                          {item.date}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          {item.desc && (
                            <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-2xl border border-gray-200/80 shadow-sm dark:border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PieChart className="size-4 text-primary" />
                      Your exposure by area
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Portfolio value per area</p>
                  </CardHeader>
                  <CardContent>
                    {exposureByArea.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-muted-foreground dark:border-border">
                        No exposure yet. Add properties to see your exposure by area.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {exposureByArea.map(({ area, pct }) => (
                          <div key={area} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-foreground">{area}</span>
                              <span className="text-muted-foreground">{pct}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="overflow-hidden rounded-2xl border border-gray-200/80 shadow-sm dark:border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="size-4 text-primary" />
                      Neighborhoods
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Click one for data and topics</p>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {DUBAI_NEIGHBORHOODS.map((n) => (
                      <button
                        key={n.slug}
                        type="button"
                        onClick={() => onNeighborhoodClick(n)}
                        className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/20 hover:bg-primary/5"
                      >
                        <div>
                          <p className="font-medium text-foreground">{n.name}</p>
                          <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-2xl border border-gray-200/80 shadow-sm dark:border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="size-4 text-primary" />
                      Developers
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Leading Dubai developers</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {DUBAI_DEVELOPERS.map((d) => (
                      <a
                        key={d.name}
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 transition-colors hover:border-primary/20 hover:bg-primary/5 dark:border-border"
                      >
                        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 dark:ring-border">
                          <img
                            src={d.logo}
                            alt=""
                            className="size-8 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.visibility = "hidden"
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 className="size-5 text-muted-foreground" />
                          </div>
                        </div>
                        <span className="flex-1 font-medium text-foreground">{d.name}</span>
                        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4 overflow-hidden rounded-2xl border border-gray-200/80 shadow-sm dark:border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="size-4 text-primary" />
                    Interactive map
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Top-down view with neighborhood labels. Open in Google Maps for zoom and directions.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <DubaiNeighborhoodsMap height="320px" />
                  <div className="flex items-center justify-between border-t border-gray-100 p-3 dark:border-border">
                    <span className="text-xs text-muted-foreground">Dubai, UAE</span>
                    <a
                      href="https://www.google.com/maps/search/real+estate+Dubai+UAE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4">
                <Button variant="outline" className="w-full rounded-xl" asChild>
                  <Link href="/investor/opportunities/finder" className="flex items-center justify-center gap-2">
                    <Search className="size-4" />
                    Search properties · Opportunity finder
                  </Link>
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:space-y-5">
            <Card className="overflow-hidden rounded-2xl border border-gray-200/80 shadow-sm dark:border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10">
                      <FileText className="size-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">My memos</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                    <Link href="/investor/investments">
                      View all
                      <ArrowUpRight className="ml-0.5 size-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {memosLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                  </div>
                ) : latestMemos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-muted/30 py-6 text-center dark:border-border">
                    <FileText className="mx-auto size-8 text-muted-foreground" />
                    <p className="mt-2 text-xs font-medium text-muted-foreground">No memos yet</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {latestMemos.map((m) => (
                      <li key={m.id}>
                        <Link
                          href={`/investor/memos/${m.id}`}
                          className="flex items-center gap-2 rounded-xl border border-gray-100 p-2.5 transition-all hover:border-primary/20 hover:bg-primary/5 dark:border-border dark:bg-card/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {m.propertyTitle ?? m.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {m.propertyArea ?? "Memo"}
                              {m.propertyPrice != null
                                ? ` · AED ${m.propertyPrice.toLocaleString()}`
                                : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                            {m.state.replace("_", " ")}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
