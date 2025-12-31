"use client"

import * as React from "react"
import { AlertTriangle, Check, Filter, LayoutGrid, List, Radar, RotateCcw, Search } from "lucide-react"

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
import { cn } from "@/lib/utils"
import type { MarketSignalItem, MarketSignalSeverity, MarketSignalSourceType, MarketSignalStatus, MarketSignalType } from "@/lib/mock-market-signals"
import { mockMarketSignals } from "@/lib/mock-market-signals"

type ViewMode = "cards" | "table"

type DataState = "loading" | "ready" | "error"

export function SignalsFeed({ initialSignals }: { initialSignals?: MarketSignalItem[] }) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards")
  const [query, setQuery] = React.useState("")
  const [sourceType, setSourceType] = React.useState<MarketSignalSourceType | "all">("all")
  const [status, setStatus] = React.useState<MarketSignalStatus | "all">("all")
  const [type, setType] = React.useState<MarketSignalType | "all">("all")
  const [severity, setSeverity] = React.useState<MarketSignalSeverity | "all">("all")
  const [timeframe, setTimeframe] = React.useState<"QoQ" | "WoW" | "all">("all")
  const [dataState, setDataState] = React.useState<DataState>("loading")

  const [rows, setRows] = React.useState<MarketSignalItem[]>(() => initialSignals ?? mockMarketSignals)

  React.useEffect(() => {
    // Mock fetch (keeps UI contract for backend later)
    let cancelled = false
    setDataState("loading")
    const t = setTimeout(() => {
      if (cancelled) return
      setRows(initialSignals ?? mockMarketSignals)
      setDataState("ready")
    }, 350)
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

  function markAcknowledged(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "acknowledged" } : r)))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{summary.total} signals</Badge>
          {summary.newCount ? <Badge variant="outline">{summary.newCount} new</Badge> : null}
          <Badge variant="outline">Official {summary.official}</Badge>
          <Badge variant="outline">Portal {summary.portal}</Badge>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setDataState((s) => (s === "error" ? "ready" : "error"))}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            {dataState === "error" ? "Clear error" : "Simulate error"}
          </Button>
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
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
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
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
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
              <Select value={type} onValueChange={(v) => setType(v as any)}>
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
              <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
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
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
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
            <SignalCard key={s.id} signal={s} onAcknowledge={() => markAcknowledged(s.id)} />
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="text-xs text-muted-foreground">
        Mock-driven feed (like Topbar notifications). Backend can later replace `mockMarketSignals` with an API call returning the same shape.
      </div>
    </div>
  )
}

function SignalCard({ signal, onAcknowledge }: { signal: MarketSignalItem; onAcknowledge: () => void }) {
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
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => {}}>
            <Radar className="h-4 w-4" />
            View (soon)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatType(t: MarketSignalType) {
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


