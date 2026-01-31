"use client"

import * as React from "react"
import { AlertTriangle, Check, Filter, LayoutGrid, List, Radar, RotateCcw, Search, Loader2, TrendingUp, TrendingDown, MapPin, Building2, Calendar, ExternalLink, Tag, DollarSign, User } from "lucide-react"

import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { MarketSignalItem, MarketSignalSeverity, MarketSignalSourceType, MarketSignalStatus, MarketSignalType } from "@/lib/mock-market-signals"
import { mockMarketSignals } from "@/lib/mock-market-signals"
import { DataFreshnessIndicator } from "./data-freshness-indicator"
import { ContextualAICard } from "@/components/ai/contextual-ai-card"

interface PortalListing {
  id: string
  portal: string
  listing_id: string
  listing_url: string | null
  area_name: string | null
  building_name: string | null
  project_name: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  size_sqm: number | null
  asking_price: number
  price_per_sqm: number | null
  listing_type: string | null
  is_active: boolean
  listed_date: string | null
  days_on_market: number | null
  agent_name: string | null
  agency_name: string | null
  has_parking: boolean | null
  furnished: string | null
  amenities: string[] | null
  photos: string[] | null
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

interface SignalDetail {
  signal: MarketSignalItem & { 
    area_name_en?: string
    evidence?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
  portal_listing?: PortalListing | null
  area_statistics?: {
    total_transactions: number
    property_types: Record<string, number>
    room_distribution: Record<string, number>
    price_range: { min: number; max: number }
    avg_price: number
    avg_price_per_sqm: number
  }
  recent_transactions?: Array<{
    transaction_id: string
    instance_date: string
    property_type_en: string
    property_sub_type_en?: string
    building_name_en?: string
    project_name_en?: string
    rooms_en?: string
    actual_worth: number
    meter_sale_price?: number
  }>
}

type ViewMode = "cards" | "table"

type DataState = "loading" | "ready" | "error"

export function SignalsFeed({ tenantId, initialSignals }: { tenantId: string; initialSignals?: MarketSignalItem[] }) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards")
  const [query, setQuery] = React.useState("")
  const [sourceType, setSourceType] = React.useState<MarketSignalSourceType | "all">("all")
  const [status, setStatus] = React.useState<MarketSignalStatus | "all">("all")
  const [type, setType] = React.useState<MarketSignalType | "all">("all")
  const [severity, setSeverity] = React.useState<MarketSignalSeverity | "all">("all")
  const [timeframe, setTimeframe] = React.useState<"QoQ" | "WoW" | "all">("all")
  const [dataState, setDataState] = React.useState<DataState>("loading")

  const [rows, setRows] = React.useState<MarketSignalItem[]>(() => initialSignals ?? mockMarketSignals)
  
  // Signal detail sheet state
  const [selectedSignal, setSelectedSignal] = React.useState<MarketSignalItem | null>(null)
  const [signalDetail, setSignalDetail] = React.useState<SignalDetail | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)

  React.useEffect(() => {
    // DB-backed feed can be server-provided via `initialSignals`.
    // We keep a small loading delay to preserve UX parity with real fetches.
    let cancelled = false
    setDataState("loading")
    const t = setTimeout(() => {
      if (cancelled) return
      setRows(initialSignals ?? mockMarketSignals)
      setDataState("ready")
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [initialSignals])

  const types = React.useMemo(() => {
    const set = new Set<MarketSignalType>()
    for (const s of rows) set.add(s.type)
    return Array.from(set)
  }, [rows])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((s) => (sourceType === "all" ? true : s.sourceType === sourceType))
      .filter((s) => (status === "all" ? true : s.status === status))
      .filter((s) => (type === "all" ? true : s.type === type))
      .filter((s) => (severity === "all" ? true : s.severity === severity))
      .filter((s) => (timeframe === "all" ? true : s.timeframe === timeframe))
      .filter((s) => {
        if (!q) return true
        return (
          s.geoName.toLowerCase().includes(q) ||
          s.segment.toLowerCase().includes(q) ||
          s.source.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q) ||
          s.metricLabel.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [rows, query, sourceType, status, type, severity, timeframe])

  const summary = React.useMemo(() => {
    const total = rows.length
    const newCount = rows.filter((r) => r.status === "new").length
    const official = rows.filter((r) => r.sourceType === "official").length
    const portal = rows.filter((r) => r.sourceType === "portal").length
    return { total, newCount, official, portal }
  }, [rows])

  function resetFilters() {
    setQuery("")
    setSourceType("all")
    setStatus("all")
    setType("all")
    setSeverity("all")
    setTimeframe("all")
  }

  function retry() {
    setDataState("loading")
    setTimeout(() => setDataState("ready"), 350)
  }

  async function markAcknowledged(id: string) {
    // Server-side status update (best-effort). UI remains usable even if API fails.
    try {
      await fetch(`/api/signals/${id}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })
    } catch {
      // ignore
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "acknowledged" } : r)))
  }

  async function dismissSignal(id: string) {
    try {
      await fetch(`/api/signals/${id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })
    } catch {
      // ignore
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r)))
  }

  async function viewSignalDetails(signal: MarketSignalItem) {
    setSelectedSignal(signal)
    setDetailLoading(true)
    setSignalDetail(null)
    
    try {
      // Try to fetch from DLD API if it's a DLD-derived signal
      const res = await fetch(`/api/dld/signals/${signal.id}`)
      if (res.ok) {
        const detail = await res.json()
        setSignalDetail(detail)
      } else {
        // Fallback: use the signal data directly for mock signals
        setSignalDetail({
          signal: signal,
          area_statistics: undefined,
          recent_transactions: [],
        })
      }
    } catch (err) {
      console.error("Failed to fetch signal details:", err)
      // Fallback: show signal data we already have
      setSignalDetail({
        signal: signal,
        area_statistics: undefined,
        recent_transactions: [],
      })
    } finally {
      setDetailLoading(false)
    }
  }

  function closeSignalSheet() {
    setSelectedSignal(null)
    setSignalDetail(null)
  }

  return (
    <div className="space-y-4">
      {/* Data Freshness Status */}
      <DataFreshnessIndicator />

      {/* AI Market Forecaster */}
      <ContextualAICard
        agentId="market_forecaster"
        title="Market Forecaster"
        description="Get price predictions and emerging market trends"
        suggestions={[
          "Where are prices heading?",
          "Find emerging hotspots",
          "What signals should I watch?"
        ]}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{summary.total} signals</Badge>
          {summary.newCount ? <Badge variant="outline">{summary.newCount} new</Badge> : null}
          <Badge variant="outline">Official {summary.official}</Badge>
          <Badge variant="outline">Portal {summary.portal}</Badge>
          <DataFreshnessIndicator compact />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="cards" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Cards
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <List className="h-4 w-4" />
                Table
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search geo, segment, source, type…" className="pl-9" />
              </div>
            </div>

            <div className="md:col-span-2">
              <Select
                value={sourceType}
                onValueChange={(v) => setSourceType(v === "all" ? "all" : (v as MarketSignalSourceType))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="official">Official</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v === "all" ? "all" : (v as "QoQ" | "WoW"))}>
                <SelectTrigger>
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All timeframes</SelectItem>
                  <SelectItem value="WoW">WoW</SelectItem>
                  <SelectItem value="QoQ">QoQ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={type} onValueChange={(v) => setType(v === "all" ? "all" : (v as MarketSignalType))}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <Select value={severity} onValueChange={(v) => setSeverity(v === "all" ? "all" : (v as MarketSignalSeverity))}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "all" : (v as MarketSignalStatus))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-6 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetFilters} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {dataState === "error" ? (
        <EmptyState
          title="Couldn’t load signals"
          description="This is a simulated error state. In production, this would show a backend/network error and allow retry."
          icon={<AlertTriangle className="size-5" />}
          action={
            <Button type="button" onClick={retry}>
              Retry
            </Button>
          }
        />
      ) : dataState === "loading" ? (
        viewMode === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No signals match your filters"
          description="Try broadening your filters, or reset to view the full feed."
          icon={<Radar className="size-5" />}
          action={
            <Button type="button" variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          }
        />
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SignalCard key={s.id} signal={s} onAcknowledge={() => markAcknowledged(s.id)} onDismiss={() => dismissSignal(s.id)} onView={() => viewSignalDetails(s)} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signal</TableHead>
                  <TableHead>Geo</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Metric</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="min-w-0">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate font-medium">{formatType(s.type)}</div>
                          <Badge variant="outline" className={badgeToneForSourceType(s.sourceType)}>
                            {s.sourceType}
                          </Badge>
                          <Badge variant="secondary">{s.timeframe}</Badge>
                          <Badge variant="outline" className={badgeToneForSeverity(s.severity)}>
                            {s.severity}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatTimeAgo(s.createdAt)} · Confidence {(s.confidenceScore * 100).toFixed(0)}%
                          {typeof s.investorMatches === "number" ? ` · ${s.investorMatches} investor matches` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.geoName}</div>
                      <div className="text-xs text-muted-foreground">{s.segment}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">{s.source}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">{s.metricLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.currentValueLabel}
                        {s.prevValueLabel ? ` · prev ${s.prevValueLabel}` : ""}
                        {typeof s.deltaPct === "number" ? ` · ${formatDeltaPct(s.deltaPct)}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badgeToneForStatus(s.status)}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="gap-2"
                          onClick={() => viewSignalDetails(s)}
                        >
                          <Radar className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => markAcknowledged(s.id)}
                          disabled={s.status !== "new"}
                        >
                          <Check className="h-4 w-4" />
                          Acknowledge
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => dismissSignal(s.id)} disabled={s.status === "dismissed"}>
                          Dismiss
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Signal Detail Sheet */}
      <Sheet open={!!selectedSignal} onOpenChange={(open) => !open && closeSignalSheet()}>
        <SheetContent side="right" className="w-[48rem] max-w-full p-0 sm:max-w-[48rem] !overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>
              {selectedSignal ? `${formatType(selectedSignal.type)} signal details` : "Signal details"}
            </SheetTitle>
          </SheetHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center h-full bg-white">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : selectedSignal ? (
            <div className="flex flex-col h-full bg-gray-50">
              {/* Header */}
              <div className="flex-shrink-0 border-b bg-white px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-900 truncate">{selectedSignal.geoName}</h2>
                      {selectedSignal.type === "pricing_opportunity" && signalDetail?.signal?.evidence && (
                        <Badge className={cn(
                          "font-semibold",
                          getRatingBadgeStyle((signalDetail.signal.evidence as Record<string, unknown>).rating as string)
                        )}>
                          {formatRating((signalDetail.signal.evidence as Record<string, unknown>).rating as string)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {selectedSignal.segment}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{selectedSignal.source}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(selectedSignal.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={badgeToneForSeverity(selectedSignal.severity)}>
                      {selectedSignal.severity}
                    </Badge>
                    <Badge variant="outline" className={badgeToneForStatus(selectedSignal.status)}>
                      {selectedSignal.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-6 space-y-6">
                  
                  {/* Pricing Opportunity - Full Analysis */}
                  {selectedSignal.type === "pricing_opportunity" && signalDetail?.signal ? (
                    <ComprehensiveDealAnalysis signal={signalDetail.signal} listing={signalDetail.portal_listing} />
                  ) : (
                    <>
                      {/* Generic Signal - Key Metric Card */}
                      <Card className="border-gray-200">
                        <CardContent className="p-5">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                            {selectedSignal.metricLabel}
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-bold text-gray-900">{selectedSignal.currentValueLabel}</span>
                            {typeof selectedSignal.deltaPct === "number" && (
                              <span className={cn(
                                "flex items-center gap-1 text-lg font-semibold",
                                selectedSignal.deltaPct >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {selectedSignal.deltaPct >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                {formatDeltaPct(selectedSignal.deltaPct)}
                              </span>
                            )}
                          </div>
                          {selectedSignal.prevValueLabel && (
                            <div className="text-sm text-gray-500 mt-2">
                              Previous: {selectedSignal.prevValueLabel}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Quick Stats for non-pricing signals */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Confidence</div>
                            <div className="text-2xl font-bold text-gray-900">{(selectedSignal.confidenceScore * 100).toFixed(0)}%</div>
                          </CardContent>
                        </Card>
                        <Card className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Timeframe</div>
                            <div className="text-2xl font-bold text-gray-900">{selectedSignal.timeframe}</div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Investor Matches */}
                  {typeof selectedSignal.investorMatches === "number" && selectedSignal.investorMatches > 0 && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600">{selectedSignal.investorMatches}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-blue-900">Investor Matches</div>
                            <div className="text-xs text-blue-700">This signal matches {selectedSignal.investorMatches} investor mandates</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Area Statistics - Only show for non-pricing signals */}
                  {signalDetail?.area_statistics && selectedSignal.type !== "pricing_opportunity" && signalDetail.area_statistics.total_transactions > 0 && (
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          Area Market Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="rounded-lg bg-gray-50 p-3 text-center">
                            <div className="text-2xl font-bold text-gray-900">{signalDetail.area_statistics.total_transactions.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Transactions</div>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3 text-center">
                            <div className="text-2xl font-bold text-gray-900">{formatPriceCompact(signalDetail.area_statistics.avg_price)}</div>
                            <div className="text-xs text-gray-500">Avg Price</div>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3 text-center">
                            <div className="text-2xl font-bold text-gray-900">{Math.round(signalDetail.area_statistics.avg_price_per_sqm).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">AED/sqm</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Transactions */}
                  {signalDetail?.recent_transactions && signalDetail.recent_transactions.length > 0 && selectedSignal.type !== "pricing_opportunity" && (
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          Recent Transactions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {signalDetail.recent_transactions.slice(0, 5).map((tx) => (
                          <div key={tx.transaction_id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {tx.property_type_en} {tx.rooms_en && `· ${tx.rooms_en}`}
                              </div>
                              <div className="text-xs text-gray-500">{tx.instance_date}</div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <div className="font-semibold text-green-600">{formatPriceCompact(tx.actual_worth)}</div>
                              {tx.meter_sale_price && (
                                <div className="text-xs text-gray-500">{Math.round(tx.meter_sale_price).toLocaleString()}/sqm</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex-shrink-0 border-t bg-white px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Confidence: <span className="font-semibold text-gray-900">{(selectedSignal.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        markAcknowledged(selectedSignal.id)
                        closeSignalSheet()
                      }}
                      disabled={selectedSignal.status !== "new"}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Acknowledge
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        dismissSignal(selectedSignal.id)
                        closeSignalSheet()
                      }}
                      disabled={selectedSignal.status === "dismissed"}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
                
                {/* Outcome Tracking */}
                <div className="border-t pt-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Record Outcome (for accuracy tracking)</div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={async () => {
                        await fetch(`/api/dld/signals/${selectedSignal.id}/outcome`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ outcome: "invested" })
                        })
                        closeSignalSheet()
                      }}
                    >
                      <TrendingUp className="mr-1 h-3 w-3" />
                      Invested
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={async () => {
                        await fetch(`/api/dld/signals/${selectedSignal.id}/outcome`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ outcome: "converted" })
                        })
                        closeSignalSheet()
                      }}
                    >
                      <Building2 className="mr-1 h-3 w-3" />
                      Started Deal
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-gray-600 border-gray-200 hover:bg-gray-50"
                      onClick={async () => {
                        await fetch(`/api/dld/signals/${selectedSignal.id}/outcome`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ outcome: "passed" })
                        })
                        closeSignalSheet()
                      }}
                    >
                      <TrendingDown className="mr-1 h-3 w-3" />
                      Passed
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No signal selected</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Separator />

      <div className="text-xs text-muted-foreground">
        DB-backed feed. Detectors read only snapshot tables (`market_metric_snapshot`, `portal_listing_snapshot`) and upsert signals deterministically via `signal_key`.
      </div>
    </div>
  )
}

function SignalCard({
  signal,
  onAcknowledge,
  onDismiss,
  onView,
}: {
  signal: MarketSignalItem
  onAcknowledge: () => void
  onDismiss: () => void
  onView: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{formatType(signal.type)}</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              {signal.geoName} · {signal.segment} · {signal.timeframe}
            </div>
          </div>
          <Badge variant="outline" className={badgeToneForStatus(signal.status)}>
            {signal.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={badgeToneForSourceType(signal.sourceType)}>
            {signal.sourceType}
          </Badge>
          <Badge variant="secondary">{signal.source}</Badge>
          <Badge variant="outline" className={badgeToneForSeverity(signal.severity)}>
            {signal.severity}
          </Badge>
        </div>

        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-sm font-medium">{signal.metricLabel}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{signal.currentValueLabel}</span>
            {signal.prevValueLabel ? <span className="text-muted-foreground">prev {signal.prevValueLabel}</span> : null}
            {typeof signal.deltaPct === "number" ? (
              <span className={cn("font-medium", signal.deltaPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {formatDeltaPct(signal.deltaPct)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {formatTimeAgo(signal.createdAt)} · Confidence {(signal.confidenceScore * 100).toFixed(0)}%
          </div>
          {typeof signal.investorMatches === "number" ? <div>{signal.investorMatches} matches</div> : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAcknowledge} disabled={signal.status !== "new"}>
            <Check className="h-4 w-4" />
            Acknowledge
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss} disabled={signal.status === "dismissed"}>
            Dismiss
          </Button>
          <Button type="button" variant="default" size="sm" className="gap-2" onClick={onView}>
            <Radar className="h-4 w-4" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatType(t: MarketSignalType | string) {
  switch (t) {
    case "price_change":
      return "Price change"
    case "rent_change":
      return "Rent change"
    case "yield_opportunity":
      return "Yield opportunity"
    case "supply_spike":
      return "Supply spike"
    case "discounting_spike":
      return "Discounting spike"
    case "staleness_rise":
      return "Staleness rise"
    case "risk_flag":
      return "Risk flag"
    case "pricing_opportunity":
      return "Pricing opportunity"
    default:
      return t
  }
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

function formatDeltaPct(delta: number) {
  const pct = delta * 100
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(1)}%`
}

function badgeToneForSourceType(sourceType: MarketSignalSourceType) {
  return sourceType === "official" ? "border-emerald-500/30 text-emerald-700 bg-emerald-500/10" : "border-blue-500/30 text-blue-700 bg-blue-500/10"
}

function badgeToneForSeverity(severity: MarketSignalSeverity) {
  switch (severity) {
    case "urgent":
      return "border-rose-500/30 text-rose-700 bg-rose-500/10"
    case "watch":
      return "border-amber-500/30 text-amber-700 bg-amber-500/10"
    case "info":
    default:
      return "border-muted-foreground/20 text-muted-foreground bg-muted/40"
  }
}

function badgeToneForStatus(status: MarketSignalStatus) {
  switch (status) {
    case "new":
      return "border-emerald-500/30 text-emerald-700 bg-emerald-500/10"
    case "acknowledged":
      return "border-muted-foreground/20 text-muted-foreground bg-muted/40"
    case "dismissed":
      return "border-rose-500/30 text-rose-700 bg-rose-500/10"
    default:
      return ""
  }
}

function formatPriceCompact(price: number): string {
  if (price >= 1000000) {
    return `AED ${(price / 1000000).toFixed(1)}M`
  }
  if (price >= 1000) {
    return `AED ${(price / 1000).toFixed(0)}K`
  }
  return `AED ${price.toFixed(0)}`
}

/**
 * Helper functions for rating display
 */
function getRatingBadgeStyle(rating: string): string {
  switch (rating) {
    case "exceptional_opportunity": return "bg-green-600 text-white"
    case "strong_buy": return "bg-green-500 text-white"
    case "fair_deal": return "bg-amber-500 text-white"
    case "market_price": return "bg-gray-500 text-white"
    case "overpriced": return "bg-red-500 text-white"
    default: return "bg-gray-500 text-white"
  }
}

function formatRating(rating: string): string {
  switch (rating) {
    case "exceptional_opportunity": return "Exceptional"
    case "strong_buy": return "Strong Buy"
    case "fair_deal": return "Fair Deal"
    case "market_price": return "Market Price"
    case "overpriced": return "Overpriced"
    default: return rating?.replace(/_/g, " ") || "Unknown"
  }
}

/**
 * Analysis Section component matching property-intake style
 */
function AnalysisSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <div className="text-sm text-gray-500">{description}</div>}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">{children}</CardContent>
    </Card>
  )
}

/**
 * Stat Tile component matching property-intake style
 */
function StatTile({ label, value, hint }: { label: string; value?: string | number; hint?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-semibold text-gray-900">{value ?? "—"}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

/**
 * Comprehensive Deal Analysis component for pricing opportunity signals
 * Matches the property-intake AI evaluation style
 */
function ComprehensiveDealAnalysis({ 
  signal, 
  listing 
}: { 
  signal: MarketSignalItem & { evidence?: Record<string, unknown>; metadata?: Record<string, unknown> }
  listing?: PortalListing | null
}) {
  const data = (signal.evidence || signal.metadata || {}) as Record<string, unknown>
  
  const compositeScore = (data.composite_score as number) || 0
  const rating = (data.rating as string) || "unknown"
  const scoreBreakdown = (data.score_breakdown as Record<string, number>) || {}
  
  // Price metrics - prefer listing data, fallback to evidence
  const askingPrice = listing?.asking_price || (data.asking_price as number) || signal.currentValue || 0
  const pricePerSqm = listing?.price_per_sqm || (data.price_per_sqm as number) || 0
  const dldMedianPsm = (data.dld_median_psm as number) || 0
  const dldTimeWeightedPsm = (data.dld_time_weighted_psm as number) || 0
  const psmDiscountPct = (data.psm_discount_pct as number) || 0
  const dldMedianPrice = (data.dld_median_price as number) || 0
  const savingsAed = (data.savings_aed as number) || 0
  const comparableCount = (data.comparable_count as number) || 0
  const matchTier = (data.match_tier as number) || 0
  const matchDescription = (data.match_description as string) || ""
  const recencyScore = (data.recency_score as number) || 0
  const latestTransactionDate = (data.latest_transaction_date as string) || ""
  
  // Property details - prefer listing data
  const propertyType = listing?.property_type || (data.property_type as string) || ""
  const bedrooms = listing?.bedrooms ?? (data.bedrooms as number | null)
  const bathrooms = listing?.bathrooms
  const sizeSqm = listing?.size_sqm || (data.size_sqm as number) || 0
  const listingUrl = listing?.listing_url || (data.listing_url as string) || ""
  const buildingName = listing?.building_name
  const projectName = listing?.project_name
  const areaName = listing?.area_name
  const agentName = listing?.agent_name
  const agencyName = listing?.agency_name
  const photos = listing?.photos || []
  const amenities = listing?.amenities || []
  const furnished = listing?.furnished
  const hasParking = listing?.has_parking
  const daysOnMarket = listing?.days_on_market
  const listedDate = listing?.listed_date
  
  // Calculate price vs market
  const priceVsMarket = dldTimeWeightedPsm > 0 
    ? ((pricePerSqm - dldTimeWeightedPsm) / dldTimeWeightedPsm * 100)
    : 0
  
  // Generate property title
  const propertyTitle = buildingName 
    ? `${buildingName}${projectName && projectName !== buildingName ? ` - ${projectName}` : ""}`
    : projectName || `${propertyType || "Property"} in ${areaName || signal.geoName}`
  
  return (
    <div className="space-y-6">
      {/* Property Photos */}
      {photos.length > 0 && (
        <div className="space-y-3">
          {/* Main photo */}
          <div className="relative h-48 overflow-hidden rounded-lg">
            <img 
              src={photos[0]} 
              alt={propertyTitle} 
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {photos.length} photos
            </div>
          </div>
          {/* Photo grid - show up to 4 more */}
          {photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.slice(1, 5).map((photo, idx) => (
                <div key={idx} className="h-16 overflow-hidden rounded-lg">
                  <img src={photo} alt={`${propertyTitle} ${idx + 2}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Property Header */}
      <Card className="border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">{propertyTitle}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{areaName || signal.geoName}</span>
              </div>
              {(agentName || agencyName) && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span>{agentName}{agencyName && ` • ${agencyName}`}</span>
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-gray-900">AED {askingPrice.toLocaleString()}</div>
              {pricePerSqm > 0 && (
                <div className="text-sm text-gray-500">AED {Math.round(pricePerSqm).toLocaleString()}/sqm</div>
              )}
            </div>
          </div>
          
          {/* Quick property specs */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Building2 className="h-4 w-4" />
              <span className="capitalize">{propertyType || "Property"}</span>
            </div>
            {bedrooms !== null && bedrooms !== undefined && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="font-medium">{bedrooms === 0 ? "Studio" : `${bedrooms} BR`}</span>
              </div>
            )}
            {bathrooms !== null && bathrooms !== undefined && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <span>{bathrooms} Bath</span>
              </div>
            )}
            {sizeSqm > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <span>{Math.round(sizeSqm)} sqm</span>
              </div>
            )}
            {furnished && (
              <Badge variant="outline" className="capitalize">{furnished.replace(/_/g, " ")}</Badge>
            )}
            {hasParking && (
              <Badge variant="outline">Parking</Badge>
            )}
          </div>
          
          {/* Days on market */}
          {daysOnMarket !== null && daysOnMarket !== undefined && (
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Listed {daysOnMarket} days ago{listedDate && ` (${listedDate})`}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deal Score Overview */}
      <Card className={cn(
        "border-2",
        rating === "exceptional_opportunity" || rating === "strong_buy" 
          ? "border-green-200 bg-green-50" 
          : rating === "fair_deal" 
            ? "border-amber-200 bg-amber-50"
            : "border-gray-200 bg-gray-50"
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Deal Score</div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-gray-900">{compositeScore}</span>
                <span className="text-lg text-gray-500">/ 100</span>
              </div>
              <div className="mt-2">
                <Badge className={getRatingBadgeStyle(rating)}>{formatRating(rating)}</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="rounded-lg border bg-white p-3">
                <div className="text-center">
                  <div className={cn(
                    "text-xl font-bold",
                    priceVsMarket < 0 ? "text-green-600" : priceVsMarket > 0 ? "text-red-600" : "text-gray-600"
                  )}>
                    {priceVsMarket > 0 ? "+" : ""}{priceVsMarket.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">vs Market</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <AnalysisSection title="Investment Summary" description="AI-generated opportunity assessment">
        <p className="text-gray-600">
          {psmDiscountPct > 20 
            ? `This property is listed significantly below market value at AED ${pricePerSqm.toLocaleString()}/sqm, representing a ${psmDiscountPct.toFixed(1)}% discount compared to the area average of AED ${(dldTimeWeightedPsm || dldMedianPsm).toLocaleString()}/sqm based on ${comparableCount} recent DLD transactions.`
            : psmDiscountPct > 10
              ? `This property offers good value at AED ${pricePerSqm.toLocaleString()}/sqm, ${psmDiscountPct.toFixed(1)}% below the market average of AED ${(dldTimeWeightedPsm || dldMedianPsm).toLocaleString()}/sqm.`
              : psmDiscountPct > 0
                ? `This property is priced slightly below market at AED ${pricePerSqm.toLocaleString()}/sqm, ${psmDiscountPct.toFixed(1)}% under the area average.`
                : `This property is priced at or above market levels at AED ${pricePerSqm.toLocaleString()}/sqm.`
          }
        </p>
        <ul className="space-y-2 text-gray-900">
          {savingsAed > 0 && (
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              <span>Potential savings of <strong>AED {savingsAed.toLocaleString()}</strong> compared to median sale price</span>
            </li>
          )}
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span>Based on {comparableCount} comparable transactions in {areaName || signal.geoName}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span>Data freshness: {(recencyScore * 100).toFixed(0)}% (latest: {latestTransactionDate || "N/A"})</span>
          </li>
        </ul>
      </AnalysisSection>

      {/* Pricing Analysis */}
      <AnalysisSection title="Pricing & Comparables" description="Price per square meter analysis">
        <div className="grid gap-3 md:grid-cols-3">
          <StatTile label="Asking Price" value={`AED ${askingPrice.toLocaleString()}`} />
          <StatTile label="Price / sqm" value={`AED ${Math.round(pricePerSqm).toLocaleString()}`} hint="This listing" />
          <StatTile label="Market avg / sqm" value={`AED ${Math.round(dldTimeWeightedPsm || dldMedianPsm).toLocaleString()}`} hint="DLD transactions" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-green-50 border-green-200 p-4">
            <p className="text-xs uppercase tracking-wide text-green-700">Discount vs Market</p>
            <p className="text-xl font-semibold text-green-700">{psmDiscountPct > 0 ? `${psmDiscountPct.toFixed(1)}%` : "—"}</p>
            <p className="text-sm text-green-600">Below area average</p>
          </div>
          <div className="rounded-lg border bg-gray-50 border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">DLD Median Price</p>
            <p className="text-xl font-semibold text-gray-900">AED {dldMedianPrice.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Based on {comparableCount} transactions</p>
          </div>
        </div>
      </AnalysisSection>

      {/* Score Breakdown */}
      <AnalysisSection title="Score Breakdown" description="Factors contributing to the deal score">
        <div className="space-y-4">
          {[
            { key: "price", label: "Price Score", weight: "50%", color: "bg-green-500", description: "How much below market the property is priced" },
            { key: "match_quality", label: "Match Quality", weight: "30%", color: "bg-blue-500", description: "How well comparables match this property" },
            { key: "recency", label: "Data Freshness", weight: "20%", color: "bg-purple-500", description: "How recent the transaction data is" },
          ].map(({ key, label, weight, color, description }) => {
            const value = scoreBreakdown[key] ?? 0
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{label}</span>
                  <span className="font-semibold">{(value * 100).toFixed(0)}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={cn("h-2 rounded-full", color)} style={{ width: `${value * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{description}</span>
                  <span>Weight: {weight}</span>
                </div>
              </div>
            )
          })}
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">Overall Score</span>
            <span className="text-2xl font-bold text-green-600">{compositeScore}/100</span>
          </div>
        </div>
      </AnalysisSection>

      {/* Comparable Quality */}
      <AnalysisSection title="Comparable Analysis" description={matchDescription || `Tier ${matchTier} matching`}>
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex-shrink-0 w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-xl font-bold text-white">T{matchTier}</span>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-blue-900">{matchDescription || `Tier ${matchTier} Match`}</div>
            <div className="text-sm text-blue-700">
              {comparableCount} comparable transactions found
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{(recencyScore * 100).toFixed(0)}%</div>
            <div className="text-xs text-blue-600">Data freshness</div>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p className="mb-2">Match tier explanation:</p>
          <ul className="space-y-1 text-xs text-gray-500">
            <li className={matchTier === 1 ? "font-semibold text-blue-600" : ""}>• Tier 1: Same building + bedrooms + similar size (highest confidence)</li>
            <li className={matchTier === 2 ? "font-semibold text-blue-600" : ""}>• Tier 2: Same area + property type + bedrooms + similar size</li>
            <li className={matchTier === 3 ? "font-semibold text-blue-600" : ""}>• Tier 3: Same area + property type</li>
            <li className={matchTier === 4 ? "font-semibold text-blue-600" : ""}>• Tier 4: Same area only (fallback)</li>
          </ul>
        </div>
      </AnalysisSection>

      {/* Amenities (if available) */}
      {amenities.length > 0 && (
        <AnalysisSection title="Amenities" description="Property features">
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity, idx) => (
              <Badge key={idx} variant="outline" className="capitalize">
                {amenity.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </AnalysisSection>
      )}

      {/* View Listing CTA */}
      {listingUrl && (
        <a
          href={listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-4 rounded-lg transition-colors"
        >
          <ExternalLink className="h-5 w-5" />
          View Full Listing on Bayut
        </a>
      )}
    </div>
  )
}

