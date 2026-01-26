"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Radar,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/layout/empty-state"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { cn } from "@/lib/utils"
import { mockMarketSignals, formatMarketSignalType } from "@/lib/mock-market-signals"
import { mockInvestors } from "@/lib/mock-data"
import { getPortfolioSummary, getHoldingProperty } from "@/lib/real-estate"
import type {
  MarketSignalItem,
  MarketSignalSeverity,
  MarketSignalType,
} from "@/lib/mock-market-signals"

// Mock investor ID - in production this would come from auth
const INVESTOR_ID = "inv-1"

type ViewMode = "cards" | "list"

export default function InvestorMarketSignalsPage() {
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards")
  const [query, setQuery] = React.useState("")
  const [signalType, setSignalType] = React.useState<MarketSignalType | "all">("all")
  const [severity, setSeverity] = React.useState<MarketSignalSeverity | "all">("all")
  const [relevance, setRelevance] = React.useState<"all" | "portfolio" | "mandate">("all")
  const [isLoading, setIsLoading] = React.useState(true)

  // Get investor data
  const investor = React.useMemo(
    () => mockInvestors.find((i) => i.id === INVESTOR_ID),
    []
  )
  const summary = React.useMemo(() => getPortfolioSummary(INVESTOR_ID), [])

  // Get areas from portfolio and mandate
  const portfolioAreas = React.useMemo(() => {
    const areas = new Set<string>()
    for (const h of summary.holdings) {
      const p = getHoldingProperty(h)
      if (p?.area) areas.add(p.area)
    }
    return areas
  }, [summary.holdings])

  const mandateAreas = React.useMemo(() => {
    const areas = new Set<string>()
    const mandate = investor?.mandate
    if (mandate?.preferredAreas) {
      for (const a of mandate.preferredAreas) areas.add(a)
    }
    return areas
  }, [investor?.mandate])

  // Signal types for filter
  const signalTypes = React.useMemo(() => {
    const set = new Set<MarketSignalType>()
    for (const s of mockMarketSignals) set.add(s.type)
    return Array.from(set)
  }, [])

  // Filter and score signals
  const signals = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    
    return mockMarketSignals
      .map((s) => {
        // Calculate relevance score
        let relevanceScore = 0
        let relevanceType: "portfolio" | "mandate" | "general" = "general"
        
        if (portfolioAreas.has(s.geoName)) {
          relevanceScore = 100
          relevanceType = "portfolio"
        } else if (mandateAreas.has(s.geoName)) {
          relevanceScore = 80
          relevanceType = "mandate"
        } else if (s.investorMatches && s.investorMatches > 0) {
          relevanceScore = 60
        }
        
        return { ...s, relevanceScore, relevanceType }
      })
      .filter((s) => {
        // Apply filters
        if (signalType !== "all" && s.type !== signalType) return false
        if (severity !== "all" && s.severity !== severity) return false
        if (relevance === "portfolio" && s.relevanceType !== "portfolio") return false
        if (relevance === "mandate" && s.relevanceType !== "mandate") return false
        if (q) {
          return (
            s.geoName.toLowerCase().includes(q) ||
            s.segment.toLowerCase().includes(q) ||
            s.type.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        // Sort by relevance, then by severity, then by date
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore
        }
        const severityOrder = { urgent: 3, watch: 2, info: 1 }
        const aSeverity = severityOrder[a.severity] ?? 0
        const bSeverity = severityOrder[b.severity] ?? 0
        if (bSeverity !== aSeverity) return bSeverity - aSeverity
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [query, signalType, severity, relevance, portfolioAreas, mandateAreas])

  // Stats
  const stats = React.useMemo(() => {
    const total = signals.length
    const portfolioCount = signals.filter((s) => s.relevanceType === "portfolio").length
    const mandateCount = signals.filter((s) => s.relevanceType === "mandate").length
    const urgentCount = signals.filter((s) => s.severity === "urgent").length
    return { total, portfolioCount, mandateCount, urgentCount }
  }, [signals])

  // Simulate loading
  React.useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(t)
  }, [])

  function resetFilters() {
    setQuery("")
    setSignalType("all")
    setSeverity("all")
    setRelevance("all")
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">Market Signals</h1>
              <p className="text-sm text-gray-500">
                Real-time market intelligence for your portfolio and mandate
              </p>
            </div>
            <AskAIBankerWidget
              agentId="market_intelligence"
              title="Market Intelligence AI"
              description="Ask about market trends and signals"
              suggestedQuestions={[
                "What signals are most relevant to my portfolio?",
                "Are there any yield opportunities in my areas?",
                "What's the market outlook for Dubai Marina?",
              ]}
              pagePath="/investor/market-signals"
              scopedInvestorId={INVESTOR_ID}
              variant="inline"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Radar className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Signals</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <Building2 className="size-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.portfolioCount}</p>
                <p className="text-sm text-gray-500">Portfolio Areas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500/10">
                <MapPin className="size-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.mandateCount}</p>
                <p className="text-sm text-gray-500">Mandate Areas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-rose-500/10">
                <TrendingDown className="size-6 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.urgentCount}</p>
                <p className="text-sm text-gray-500">Urgent Signals</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="size-4 text-gray-500" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search area, segment, type..."
                  className="pl-9"
                />
              </div>
              <Select
                value={relevance}
                onValueChange={(v) => setRelevance(v as typeof relevance)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Relevance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Signals</SelectItem>
                  <SelectItem value="portfolio">Portfolio Areas</SelectItem>
                  <SelectItem value="mandate">Mandate Areas</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={signalType}
                onValueChange={(v) => setSignalType(v as typeof signalType)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {signalTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatMarketSignalType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as typeof severity)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="cards">
                    <LayoutGrid className="size-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="size-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="ghost" onClick={resetFilters} className="gap-2">
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Signals */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : signals.length === 0 ? (
          <EmptyState
            title="No signals match your filters"
            description="Try broadening your filters or reset to view all signals."
            icon={<Radar className="size-5" />}
            action={
              <Button variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
            }
          />
        ) : viewMode === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {signals.map((signal) => (
                  <SignalListItem key={signal.id} signal={signal} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface SignalWithRelevance extends MarketSignalItem {
  relevanceScore: number
  relevanceType: "portfolio" | "mandate" | "general"
}

function SignalCard({ signal }: { signal: SignalWithRelevance }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold">{formatMarketSignalType(signal.type)}</h3>
            <p className="text-sm text-gray-500">
              {signal.geoName} • {signal.segment}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {signal.relevanceType !== "general" && (
              <Badge
                variant="outline"
                className={cn(
                  signal.relevanceType === "portfolio"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                    : "border-blue-500/30 bg-blue-500/10 text-blue-700"
                )}
              >
                {signal.relevanceType === "portfolio" ? "Portfolio" : "Mandate"}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                signal.severity === "urgent"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
                  : signal.severity === "watch"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                    : ""
              )}
            >
              {signal.severity}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-gray-50/50 p-3 mb-3">
          <div className="flex items-center gap-2">
            {signal.deltaPct && signal.deltaPct > 0 ? (
              <TrendingUp className="size-4 text-emerald-600" />
            ) : (
              <TrendingDown className="size-4 text-rose-600" />
            )}
            <span className="font-medium">{signal.metricLabel}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="font-semibold">{signal.currentValueLabel}</span>
            {signal.deltaPct && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  signal.deltaPct > 0 ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {signal.deltaPct > 0 ? "+" : ""}
                {(signal.deltaPct * 100).toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{signal.timeframe} • {formatTimeAgo(signal.createdAt)}</span>
          <span>
            Confidence: {(signal.confidenceScore * 100).toFixed(0)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function SignalListItem({ signal }: { signal: SignalWithRelevance }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          signal.severity === "urgent"
            ? "bg-rose-500/10"
            : signal.severity === "watch"
              ? "bg-amber-500/10"
              : "bg-gray-100"
        )}
      >
        {signal.deltaPct && signal.deltaPct > 0 ? (
          <TrendingUp
            className={cn(
              "size-5",
              signal.severity === "urgent"
                ? "text-rose-600"
                : signal.severity === "watch"
                  ? "text-amber-600"
                  : "text-gray-600"
            )}
          />
        ) : (
          <TrendingDown
            className={cn(
              "size-5",
              signal.severity === "urgent"
                ? "text-rose-600"
                : signal.severity === "watch"
                  ? "text-amber-600"
                  : "text-gray-600"
            )}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatMarketSignalType(signal.type)}</span>
          {signal.relevanceType !== "general" && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                signal.relevanceType === "portfolio"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-700"
              )}
            >
              {signal.relevanceType === "portfolio" ? "Portfolio" : "Mandate"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">
          {signal.geoName} • {signal.segment} • {signal.currentValueLabel}
          {signal.deltaPct && (
            <span
              className={cn(
                "ml-2",
                signal.deltaPct > 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              ({signal.deltaPct > 0 ? "+" : ""}
              {(signal.deltaPct * 100).toFixed(1)}%)
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn(
          signal.severity === "urgent"
            ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
            : signal.severity === "watch"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
              : ""
        )}>
          {signal.severity}
        </Badge>
        <span className="text-xs text-gray-500">{formatTimeAgo(signal.createdAt)}</span>
      </div>
    </div>
  )
}

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
