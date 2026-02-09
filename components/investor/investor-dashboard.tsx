"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, Bell, Building2, CalendarClock, FileText, FolderKanban, Radar } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ContextPanel } from "@/components/layout/context-panel"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { ContextualAICard } from "@/components/ai/contextual-ai-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MiniAreaSparkline } from "@/components/charts/mini-area-sparkline"
import { MiniLineSparkline } from "@/components/charts/mini-line-sparkline"
import { AllocationPieChart } from "@/components/charts/allocation-pie-chart"
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart"
import { YieldTrendsChart } from "@/components/charts/yield-trends-chart"
import { cn } from "@/lib/utils"
import { useAPI } from "@/lib/hooks/use-api"
import type { DealRoom } from "@/lib/types"

function formatMarketSignalType(t: string) {
  switch (t) {
    case "price_change": return "Price change"
    case "rent_change": return "Rent change"
    case "yield_opportunity": return "Yield opportunity"
    case "supply_spike": return "Supply spike"
    case "discounting_spike": return "Discounting spike"
    case "staleness_rise": return "Staleness rise"
    case "risk_flag": return "Risk flag"
    case "pricing_opportunity": return "Pricing opportunity"
    default: return t
  }
}
import {
  formatAED,
} from "@/lib/real-estate"

const dealStatusClasses: Record<DealRoom["status"], string> = {
  preparation: "bg-gray-100 text-gray-600",
  "due-diligence": "bg-amber-50 text-amber-600 border-amber-200",
  negotiation: "bg-blue-50 text-blue-600 border-blue-200",
  closing: "bg-purple-50 text-purple-600 border-purple-200",
  completed: "bg-green-50 text-green-600 border-green-200",
}

function dealStatusLabel(status: DealRoom["status"]) {
  switch (status) {
    case "due-diligence":
      return "Due diligence"
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

type PortfolioSummary = {
  propertyCount: number
  totalValue: number
  totalCost: number
  appreciationPct: number
  totalMonthlyIncome: number
  netAnnualIncome: number
  avgYieldPct: number
  avgOccupancy: number
}

type PortfolioHolding = {
  id: string
  investorId: string
  listingId: string
  property: { title: string; area: string; type: string; imageUrl?: string } | null
  financials: {
    purchasePrice: number; currentValue: number; monthlyRent: number;
    occupancyRate: number; annualExpenses: number; appreciationPct: number; netYieldPct: number
  }
}

export function InvestorDashboard({
  investorId,
  investorName,
}: {
  investorId: string
  investorName: string
}) {
  // Fetch portfolio from real database API
  const { data: portfolioData } = useAPI<{ summary: PortfolioSummary; holdings: PortfolioHolding[] }>(
    `/api/portfolio/${investorId}`
  )

  const summary = React.useMemo<PortfolioSummary>(() => portfolioData?.summary ?? {
    propertyCount: 0, totalValue: 0, totalCost: 0, appreciationPct: 0,
    totalMonthlyIncome: 0, netAnnualIncome: 0, avgYieldPct: 0, avgOccupancy: 0,
  }, [portfolioData])

  const holdings = React.useMemo(() => portfolioData?.holdings ?? [], [portfolioData])

  // Fetch deal rooms from API
  const { data: dealRoomsData } = useAPI<DealRoom[] | { dealRooms: DealRoom[] }>(`/api/deal-rooms?investorId=${investorId}`)
  const dealRooms: DealRoom[] = React.useMemo(() => {
    if (!dealRoomsData) return []
    if (Array.isArray(dealRoomsData)) return dealRoomsData
    if (Array.isArray((dealRoomsData as { dealRooms?: DealRoom[] }).dealRooms)) {
      return (dealRoomsData as { dealRooms: DealRoom[] }).dealRooms
    }
    return []
  }, [dealRoomsData])

  // Fetch shortlist (pipeline opportunities) from API
  const { data: shortlistData } = useAPI<{ items: Array<{ id: string; listingId: string; matchScore: number; agentNotes: string; tradeoffs: string[]; property: { title: string; area: string; type: string; price: number } | null }> }>(
    `/api/investors/${investorId}/shortlist`
  )
  const opportunities = React.useMemo(() => {
    const items = shortlistData?.items ?? []
    return items.map((item) => ({
      propertyId: item.listingId,
      score: item.matchScore ?? 50,
      reasons: item.tradeoffs?.length ? item.tradeoffs : [item.agentNotes || "Matches your mandate"],
      title: item.property?.title,
      area: item.property?.area,
    }))
  }, [shortlistData])

  const valueSeries = React.useMemo(() => {
    const base = summary.totalCost || summary.totalValue
    const now = summary.totalValue
    return [
      { m: "Jan", v: Math.round(base * 0.98) },
      { m: "Mar", v: Math.round(base * 0.99) },
      { m: "May", v: Math.round(base * 1.01) },
      { m: "Jul", v: Math.round(base * 1.03) },
      { m: "Sep", v: Math.round(base * 1.04) },
      { m: "Now", v: Math.round(now) },
    ]
  }, [summary.totalCost, summary.totalValue])

  const incomeSeries = React.useMemo(() => {
    const monthly = summary.totalMonthlyIncome
    const months = ["01", "02", "03", "04", "05", "06"]
    return months.map((m) => ({
      m,
      n: Math.round(monthly * (0.95 + Math.random() * 0.1)),
    }))
  }, [summary.totalMonthlyIncome])

  const allocation = React.useMemo(() => {
    const byType = new Map<string, number>()
    for (const h of holdings) {
      const key = h.property?.type ?? "unknown"
      byType.set(key, (byType.get(key) ?? 0) + h.financials.currentValue)
    }
    return Array.from(byType.entries()).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [holdings])

  // Portfolio performance over time (for the detailed chart)
  const portfolioPerformanceSeries = React.useMemo(() => {
    const base = summary.totalCost || summary.totalValue
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentMonth = new Date().getMonth()
    
    return months.slice(0, currentMonth + 1).map((month, i) => {
      const progress = currentMonth > 0 ? i / currentMonth : 0
      const growthFactor = 1 + (summary.appreciationPct / 100) * progress
      return {
        month,
        value: Math.round(base * growthFactor),
        purchaseCost: Math.round(base),
      }
    })
  }, [summary.totalCost, summary.totalValue, summary.appreciationPct])

  // Yield trends data
  const yieldTrendsSeries = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentMonth = new Date().getMonth()
    const baseYield = summary.avgYieldPct || 5.5
    const marketYield = 5.0 // Dubai market average
    
    return months.slice(0, currentMonth + 1).map((month, i) => {
      const variance = (Math.sin(i * 0.5) * 0.3) + (Math.random() - 0.5) * 0.2
      return {
        month,
        portfolioYield: Math.round((baseYield + variance) * 100) / 100,
        marketYield: Math.round((marketYield + Math.sin(i * 0.3) * 0.2) * 100) / 100,
      }
    })
  }, [summary.avgYieldPct])

  const topHoldings = React.useMemo(() => {
    return [...holdings]
      .map((h) => ({
        h: { id: h.id, propertyId: h.listingId, currentValue: h.financials.currentValue },
        p: h.property ? { title: h.property.title, area: h.property.area, type: h.property.type, imageUrl: h.property.imageUrl } : null,
        y: h.financials.netYieldPct,
        a: h.financials.appreciationPct,
      }))
      .sort((x, y) => y.h.currentValue - x.h.currentValue)
      .slice(0, 5)
  }, [holdings])

  // Fetch memos, notifications, and market signals from the DB
  const { data: memosData } = useAPI<Array<{ id: string; title: string; status: string; investorId?: string }>>("/api/investor/memos")
  const investorMemos = React.useMemo(
    () => (memosData ?? []).filter((m) => m.investorId === investorId).slice(0, 3),
    [memosData, investorId],
  )

  const { data: notificationsResponse } = useAPI<{ notifications: Array<{ id: string; title: string; body: string; read_at: string | null; created_at: string; metadata?: Record<string, unknown> }> }>("/api/notifications")
  const latestNotifications = React.useMemo(() => {
    const notifications = notificationsResponse?.notifications ?? []
    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      unread: n.read_at === null,
      href: (n.metadata?.link as string) || "/investor/notifications",
    })).slice(0, 3)
  }, [notificationsResponse])

  const { data: signalsResponse } = useAPI<{ signals: Array<{ id: string; type: string; area: string; propertyType: string | null; severity: string; title: string; description: string }> }>("/api/market-signals")
  const latestSignals = React.useMemo(() => (signalsResponse?.signals ?? []).slice(0, 3), [signalsResponse])

  const aiQuestions = [
    "How is my portfolio performing vs market?",
    "Where can I improve yield without increasing risk?",
    "Should I sell any asset in the next 6 months?",
    "Suggest the top 2 opportunities that match my mandate",
    "Summarize my risks and mitigations",
  ]

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(6,182,212,0.12),transparent_55%)]" />

        <div className="relative">
          <PageHeader
            title={
              <span className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <Building2 className="size-5" />
                </span>
                <span>Welcome back, {investorName}</span>
              </span>
            }
            subtitle="Your portfolio snapshot, income outlook, and the next best opportunities—at a glance."
            primaryAction={
              <AskAIBankerWidget
                agentId="real_estate_advisor"
                title="AI Real Estate Advisor"
                description="Insights & recommendations tailored to your real estate portfolio."
                suggestedQuestions={aiQuestions}
                pagePath="/real-estate"
                scopedInvestorId={investorId}
                variant="inline"
              />
            }
            secondaryActions={
              <>
                <Button variant="outline" asChild>
                  <Link href="/real-estate">
                    Open portfolio <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/deal-room">Deal rooms</Link>
                </Button>
              </>
            }
          />

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Portfolio value"
              value={formatAED(summary.totalValue || 0)}
              meta={`Appreciation ${summary.appreciationPct.toFixed(1)}% since purchase`}
              right={<MiniAreaSparkline data={valueSeries} dataKey="v" />}
              badge={<Badge variant="secondary">Stable</Badge>}
            />
            <MetricCard
              label="Monthly income (effective)"
              value={formatAED(summary.totalMonthlyIncome)}
              meta={`Occupancy ${(summary.avgOccupancy ?? 0).toFixed(1)}% • Avg net yield ${summary.avgYieldPct.toFixed(2)}%`}
              right={<MiniLineSparkline data={incomeSeries} dataKey="n" />}
              badge={
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" variant="outline">
                  On track
                </Badge>
              }
            />
            <MetricCard
              label="Allocation"
              value={`${summary.propertyCount} assets`}
              meta="Diversification by property type"
              right={<AllocationPieChart data={allocation} />}
              badge={<Badge variant="outline">Balanced</Badge>}
              compactRight
            />
          </div>
        </div>
      </div>

      {/* Portfolio Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
            <p className="text-sm text-gray-500">
              Current value vs purchase cost • {summary.appreciationPct >= 0 ? "+" : ""}{summary.appreciationPct.toFixed(1)}% total appreciation
            </p>
          </CardHeader>
          <CardContent>
            <PortfolioPerformanceChart data={portfolioPerformanceSeries} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Yield Trends</CardTitle>
            <p className="text-sm text-gray-500">
              Your portfolio yield vs Dubai market average
            </p>
          </CardHeader>
          <CardContent>
            <YieldTrendsChart data={yieldTrendsSeries} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Holdings */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Holdings</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/real-estate">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Yield</TableHead>
                      <TableHead>Appreciation</TableHead>
                      <TableHead className="text-right">Insight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topHoldings.map(({ h, p, y, a }) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[240px]">
                            {p?.imageUrl && (
                              <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                                <Image
                                  src={p.imageUrl}
                                  alt={p.title ?? "Property"}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                  onError={(e) => { e.currentTarget.style.display = "none" }}
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate">{p?.title ?? h.propertyId}</div>
                              <div className="text-xs text-gray-500">
                                {p?.area ?? "—"} • <span className="capitalize">{p?.type ?? "—"}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatAED(h.currentValue)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/5">
                            {y.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              a >= 0
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {a.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AskAIBankerWidget
                            agentId="real_estate_advisor"
                            title="AI Real Estate Advisor"
                            suggestedQuestions={[
                              `What's the ROI on ${p?.title ?? "this property"}?`,
                              `How does ${p?.area ?? "this location"} compare to market averages?`,
                              `Should I hold or sell ${p?.title ?? "this property"}?`,
                            ]}
                            pagePath="/properties"
                            scopedInvestorId={investorId}
                            propertyId={h.propertyId}
                            variant="inline"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* AI Rental Optimizer */}
          <ContextualAICard
            agentId="rental_optimizer"
            title="Rental Optimizer"
            description="Maximize rental income and reduce vacancy"
            suggestions={[
              "How can I increase rental income?",
              "Should I furnish any units?",
              "What's the tenant churn risk?"
            ]}
            investorId={investorId}
          />

          {/* Opportunities */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Opportunities</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/properties">Browse</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {opportunities.slice(0, 4).map((o) => (
                  <OpportunityRow key={o.propertyId} propertyId={o.propertyId} score={o.score} reasons={o.reasons} title={o.title} area={o.area} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <ContextPanel title="Investor brief">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="size-4 text-green-600" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <AlertRow title="Rent renewal window" body="One lease is within 45 days of renewal. Consider a re-price strategy." />
              <AlertRow title="Document request" body="A due diligence document is pending in your Deal Room." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="size-4 text-green-600" />
                  Latest notifications
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/notifications">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestNotifications.length ? (
                latestNotifications.map((n) => (
                  <Button key={n.id} asChild variant="outline" className="w-full justify-between">
                    <Link href={n.href ?? "/notifications"}>
                      <span className="truncate">{n.title}</span>
                      {n.unread ? (
                        <Badge variant="secondary" className="ml-3 shrink-0">
                          New
                        </Badge>
                      ) : null}
                    </Link>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-gray-500">No notifications yet.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Radar className="size-4 text-green-600" />
                  Latest market signals
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/market-signals">Open feed</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestSignals.length ? (
                latestSignals.map((s) => (
                  <Button key={s.id} asChild variant="outline" className="w-full justify-between">
                    <Link href="/investor/market-signals">
                      <span className="truncate">
                        {s.title || formatMarketSignalType(s.type)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-3 shrink-0 capitalize",
                          s.severity === "high"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            : s.severity === "medium"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "border-border",
                        )}
                      >
                        {s.severity}
                      </Badge>
                    </Link>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-gray-500">No signals yet.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="size-4 text-green-600" />
                Next steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-lg border p-3">
                <div className="font-medium">Review new opportunities</div>
                <div className="mt-1 text-xs text-gray-500">2 assets match your mandate in preferred areas.</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-medium">Approve memo (if ready)</div>
                <div className="mt-1 text-xs text-gray-500">Quickly review memo highlights & approve/reject.</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                  <FolderKanban className="size-4 text-green-600" />
                  Deal rooms
              </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/deal-room">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {dealRooms.length ? (
                dealRooms.slice(0, 3).map((d) => (
                  <Button key={d.id} asChild variant="outline" className="w-full justify-between">
                    <Link href={`/deal-room/${d.id}`}>
                      <span className="truncate">{d.title}</span>
                      <Badge variant="outline" className={`ml-3 shrink-0 ${dealStatusClasses[d.status]}`}>
                        {dealStatusLabel(d.status)}
                      </Badge>
                    </Link>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-gray-500">No ongoing deal rooms.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-green-600" />
                Recent IC memos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {investorMemos.length ? (
                investorMemos.map((m) => (
                  <Button key={m.id} asChild variant="outline" className="w-full justify-between">
                    <Link href={`/memos/${m.id}`}>
                      <span className="truncate">{m.title}</span>
                      <Badge variant="secondary" className="ml-3 capitalize">
                        {m.status}
                      </Badge>
                    </Link>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-gray-500">No memos yet.</div>
              )}
              <Separator />
              <Button asChild className="w-full">
                <Link href="/memos/new">Generate a memo</Link>
              </Button>
            </CardContent>
          </Card>
        </ContextPanel>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  meta,
  right,
  badge,
  compactRight,
}: {
  label: string
  value: string
  meta: string
  right: React.ReactNode
  badge?: React.ReactNode
  compactRight?: boolean
}) {
  return (
    <Card className="border-gray-100 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-600">{label}</div>
              {badge}
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-foreground/90">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{meta}</div>
          </div>
          <div className={cn("w-[140px] shrink-0", compactRight ? "w-[160px]" : "")}>{right}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs text-gray-500">{body}</div>
    </div>
  )
}

function OpportunityRow({
  propertyId,
  score,
  reasons,
  title,
  area,
}: {
  propertyId: string
  score: number
  reasons: string[]
  title?: string
  area?: string
}) {
  return (
    <Link href={`/properties/${propertyId}`} className="group block">
      <Card className="border-gray-100 hover:shadow-md transition-all overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="bg-white/90 text-gray-900">
              Score {score}
            </Badge>
            {area && <span className="text-xs text-gray-500">{area}</span>}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate group-hover:text-green-600 transition-colors">
              {title || `Property ${propertyId.slice(0, 8)}`}
            </div>
            <div className="mt-1 text-xs text-gray-500 line-clamp-1">{reasons.join(" • ")}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}


