"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderKanban,
  Radar,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PortfolioKPICards } from "@/components/investor/portfolio-kpi-cards"
import { InvestorAIPanel } from "@/components/investor/investor-ai-panel"
import { PendingApprovalsCard } from "@/components/investor/pending-approvals-card"
import { OpportunityFinderPanel } from "@/components/investor/opportunity-finder-panel"
// LiveMarketAlert is now provided by AIWidgetProvider in the layout
import { AllocationPieChart } from "@/components/charts/allocation-pie-chart"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { FeaturedPropertiesCarousel, PropertyGalleryStrip } from "@/components/properties/featured-properties-carousel"
import { cn } from "@/lib/utils"
import {
  calcAppreciationPct,
  calcYieldPct,
  forecastMonthlyNetIncome,
  formatAED,
  getHoldingProperty,
  getPortfolioSummary,
} from "@/lib/real-estate"
import {
  mockDealRooms,
  mockMemos,
  mockInvestors,
  mockProperties,
} from "@/lib/mock-data"
import { notifications } from "@/lib/mock-session"
import { formatMarketSignalType, mockMarketSignals } from "@/lib/mock-market-signals"
import type { DealRoom, Memo } from "@/lib/types"

// Mock investor ID - in production this would come from auth
const INVESTOR_ID = "inv-1"

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

// Next actions type
interface NextAction {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  dueDate?: string
  href: string
}

// Calendar event type
interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  type: "meeting" | "deadline" | "reminder"
}

export default function InvestorDashboardPage() {
  const investor = React.useMemo(
    () => mockInvestors.find((i) => i.id === INVESTOR_ID),
    []
  )
  const investorName = investor?.name ?? "Investor"
  const summary = React.useMemo(() => getPortfolioSummary(INVESTOR_ID), [])

  // Value sparkline data
  const valueSeries = React.useMemo(() => {
    const base = summary.totalPurchaseCost || summary.totalPortfolioValue
    const now = summary.totalPortfolioValue
    return [
      { m: "Jan", v: Math.round(base * 0.98) },
      { m: "Mar", v: Math.round(base * 0.99) },
      { m: "May", v: Math.round(base * 1.01) },
      { m: "Jul", v: Math.round(base * 1.03) },
      { m: "Sep", v: Math.round(base * 1.04) },
      { m: "Nov", v: Math.round(now) },
    ]
  }, [summary.totalPurchaseCost, summary.totalPortfolioValue])

  // Income sparkline data
  const incomeSeries = React.useMemo(() => {
    const combined: { m: string; n: number }[] = []
    const all = summary.holdings.flatMap((h) => forecastMonthlyNetIncome(h, 12))
    const byMonth = new Map<string, number>()
    for (const p of all) byMonth.set(p.month, (byMonth.get(p.month) ?? 0) + p.net)
    const months = Array.from(byMonth.keys()).sort().slice(0, 6)
    for (const month of months)
      combined.push({ m: month.slice(5), n: Math.round(byMonth.get(month) ?? 0) })
    return combined
  }, [summary.holdings])

  // Allocation data for pie chart
  const allocation = React.useMemo(() => {
    const byType = new Map<string, number>()
    for (const h of summary.holdings) {
      const p = getHoldingProperty(h)
      const key = p?.type ?? "unknown"
      byType.set(key, (byType.get(key) ?? 0) + h.currentValue)
    }
    return Array.from(byType.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }))
  }, [summary.holdings])

  // Top holdings with performance metrics
  const topHoldings = React.useMemo(() => {
    return [...summary.holdings]
      .map((h) => ({
        h,
        p: getHoldingProperty(h),
        y: calcYieldPct(h),
        a: calcAppreciationPct(h),
      }))
      .sort((x, y) => y.h.currentValue - x.h.currentValue)
      .slice(0, 5)
  }, [summary.holdings])

  // Active deal rooms
  const dealRooms = React.useMemo(
    () =>
      mockDealRooms.filter(
        (d) => d.investorId === INVESTOR_ID && d.status !== "completed"
      ),
    []
  )

  // Pending memos for review
  const pendingMemos = React.useMemo(() => {
    const memos = mockMemos.filter((m) => m.investorId === INVESTOR_ID)
    return memos.map((m) => {
      const property = mockProperties.find((p) => p.id === m.propertyId)
      return {
        id: m.id,
        title: m.title,
        propertyTitle: m.propertyTitle,
        createdAt: m.createdAt,
        status: m.status,
        propertyPrice: property?.price,
        propertyArea: property?.area,
        expiresIn: m.status === "review" ? "48 hours" : undefined,
      }
    })
  }, [])

  // Market signals relevant to portfolio
  const relevantSignals = React.useMemo(() => {
    const areas = new Set(summary.holdings.map((h) => getHoldingProperty(h)?.area))
    return mockMarketSignals
      .filter((s) => areas.has(s.geoName) || s.investorMatches)
      .slice(0, 4)
  }, [summary.holdings])

  // Latest notifications
  const latestNotifications = React.useMemo(() => notifications.slice(0, 4), [])

  // Next actions
  const nextActions: NextAction[] = React.useMemo(
    () => [
      {
        id: "1",
        title: "Review investment memo",
        description: "Marina Tower Office Suite awaits your approval",
        priority: "high",
        dueDate: "Today",
        href: "/investor/memos/memo-1",
      },
      {
        id: "2",
        title: "Complete questionnaire",
        description: "Update your investment preferences",
        priority: "medium",
        href: "/investor/profile",
      },
      {
        id: "3",
        title: "Schedule portfolio review",
        description: "Quarterly review with your advisor",
        priority: "low",
        dueDate: "Next week",
        href: "/investor/meetings",
      },
    ],
    []
  )

  // Calendar events
  const calendarEvents: CalendarEvent[] = React.useMemo(
    () => [
      {
        id: "1",
        title: "Portfolio Review Call",
        date: "Jan 28, 2026",
        time: "10:00 AM",
        type: "meeting",
      },
      {
        id: "2",
        title: "Memo Approval Deadline",
        date: "Jan 30, 2026",
        type: "deadline",
      },
      {
        id: "3",
        title: "Property Viewing",
        date: "Feb 2, 2026",
        time: "2:00 PM",
        type: "meeting",
      },
    ],
    []
  )

  // KPI data for the cards
  const kpiData = React.useMemo(
    () => ({
      totalPortfolioValue: summary.totalPortfolioValue,
      appreciationPct: summary.appreciationPct,
      monthlyRentalIncome: summary.totalMonthlyRental,
      monthlyRentalTrend: 2.5, // Mock trend
      avgYieldPct: summary.avgYieldPct,
      occupancyPct: summary.occupancyPct,
      valueSeries,
      incomeSeries,
    }),
    [summary, valueSeries, incomeSeries]
  )

  const handleMemoApprove = React.useCallback((memoId: string) => {
    console.log("Approving memo:", memoId)
    // In production, this would call an API
  }, [])

  const handleMemoReject = React.useCallback((memoId: string) => {
    console.log("Rejecting memo:", memoId)
    // In production, this would call an API
  }, [])

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(6,182,212,0.12),transparent_55%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Welcome Message */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex size-10 sm:size-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 text-primary">
                <Building2 className="size-5 sm:size-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                  Welcome back, {investorName.split(" ")[0]}
                </h1>
                <p className="text-sm sm:text-base text-gray-500 truncate sm:whitespace-normal">
                  {summary.propertyCount} properties • {formatAED(summary.totalPortfolioValue)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <AskAIBankerWidget
                agentId="real_estate_advisor"
                title="AI Portfolio Advisor"
                description="Get personalized insights about your investments"
                suggestedQuestions={[
                  "How is my portfolio performing?",
                  "What opportunities match my mandate?",
                  "Should I consider any changes?",
                ]}
                pagePath="/investor/dashboard"
                scopedInvestorId={INVESTOR_ID}
                variant="inline"
              />
              <Button variant="outline" asChild className="flex-1 sm:flex-none min-h-[44px]">
                <Link href="/investor/portfolio">
                  <span className="hidden sm:inline">View Portfolio</span>
                  <span className="sm:hidden">Portfolio</span>
                  <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Portfolio Value Highlight */}
          <div className="mt-4 sm:mt-6 flex flex-wrap items-baseline gap-2 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">
                Portfolio Value
              </p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                {formatAED(summary.totalPortfolioValue)}
              </p>
            </div>
            <Badge
              variant="outline"
              className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              <TrendingUp className="size-3" />+{summary.appreciationPct.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
        {/* KPI Cards */}
        <div className="mb-4 sm:mb-6">
          <PortfolioKPICards data={kpiData} />
        </div>

        {/* Main Grid - stacks on mobile */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left Column - Main Content */}
          <div className="space-y-6">
            {/* Featured Properties Carousel */}
            <FeaturedPropertiesCarousel
              properties={mockProperties.filter(p => p.status === "available").slice(0, 5)}
              title="Featured Opportunities"
            />

            {/* Opportunity Finder - Featured prominently */}
            <OpportunityFinderPanel
              investorId={INVESTOR_ID}
              className="min-h-[450px]"
            />

            {/* AI Integration Panel */}
            <InvestorAIPanel
              investorId={INVESTOR_ID}
              investorName={investorName}
            />

            {/* Holdings Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <CardTitle className="text-base sm:text-lg">Your Holdings</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" asChild className="min-h-[44px] sm:min-h-0">
                    <Link href="/investor/portfolio">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {/* Horizontal scroll container for mobile */}
                <div className="-mx-0 overflow-x-auto">
                  <div className="min-w-[640px] px-4 sm:px-0">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Yield</TableHead>
                        <TableHead>Appreciation</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topHoldings.map(({ h, p, y, a }) => (
                        <TableRow key={h.id}>
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-[200px]">
                              {p?.imageUrl && (
                                <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                                  <img
                                    src={p.imageUrl}
                                    alt={p.title}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {p?.title ?? h.propertyId}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {p?.area ?? "—"} •{" "}
                                  <span className="capitalize">{p?.type ?? "—"}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatAED(h.currentValue)}
                          </TableCell>
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
                                  : "bg-destructive/10 text-destructive"
                              )}
                            >
                              {a >= 0 ? "+" : ""}
                              {a.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <AskAIBankerWidget
                              agentId="real_estate_advisor"
                              title="AI Advisor"
                              suggestedQuestions={[
                                `What's the outlook for ${p?.title}?`,
                                `Should I hold or sell ${p?.title}?`,
                                `How does ${p?.area} market compare?`,
                              ]}
                              pagePath="/investor/dashboard"
                              scopedInvestorId={INVESTOR_ID}
                              propertyId={h.propertyId}
                              variant="inline"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two Column Grid - Deals & Memos */}
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {/* Active Deals */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="size-4 text-primary" />
                      <CardTitle className="text-base">Active Deals</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" asChild className="min-h-[44px] sm:min-h-0">
                      <Link href="/investor/deal-rooms">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dealRooms.length > 0 ? (
                    dealRooms.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.title}</p>
                          <p className="text-xs text-gray-500">
                            {d.propertyTitle}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={dealStatusClasses[d.status]}
                        >
                          {dealStatusLabel(d.status)}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-500">
                      No active deals
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Approvals */}
              <PendingApprovalsCard
                memos={pendingMemos}
                onApprove={handleMemoApprove}
                onReject={handleMemoReject}
              />
            </div>

            {/* Market Signals */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radar className="size-4 text-primary" />
                    <CardTitle className="text-base">
                      Market Signals
                    </CardTitle>
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
                    <Link href="/investor/market-signals">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {relevantSignals.length > 0 ? (
                    relevantSignals.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">
                              {formatMarketSignalType(s.type)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {s.geoName} • {s.segment}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 capitalize",
                              s.severity === "urgent"
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
                                : s.severity === "watch"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                  : "border-border"
                            )}
                          >
                            {s.severity}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="font-medium">{s.currentValueLabel}</span>
                          {s.deltaPct && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                s.deltaPct > 0
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              )}
                            >
                              {s.deltaPct > 0 ? "+" : ""}
                              {(s.deltaPct * 100).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-6 text-center text-sm text-gray-500">
                      No relevant market signals
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Next Actions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <CardTitle className="text-base">Next Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextActions.map((action) => (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="block rounded-lg border p-3 transition-all hover:border-primary hover:shadow-sm active:bg-gray-100/50 min-h-[44px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{action.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {action.description}
                        </p>
                      </div>
                      {action.priority === "high" && (
                        <Badge className="shrink-0 bg-rose-500">Urgent</Badge>
                      )}
                    </div>
                    {action.dueDate && (
                      <p className="mt-2 text-xs text-gray-500">
                        Due: {action.dueDate}
                      </p>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-primary" />
                    <CardTitle className="text-base">Notifications</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/investor/notifications">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {latestNotifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href ?? "/investor/notifications"}
                    className="flex items-center justify-between rounded-lg border p-3 transition-all hover:border-primary active:bg-gray-100/50 min-h-[44px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-500">{n.createdAt}</p>
                    </div>
                    {n.unread && (
                      <div className="size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  <CardTitle className="text-base">Upcoming</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {calendarEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div
                      className={cn(
                        "mt-0.5 size-2 shrink-0 rounded-full",
                        event.type === "meeting"
                          ? "bg-blue-500"
                          : event.type === "deadline"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {event.date}
                        {event.time && ` • ${event.time}`}
                      </p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full min-h-[44px]">
                  View Calendar
                </Button>
              </CardContent>
            </Card>

            {/* Portfolio Allocation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Portfolio Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mx-auto w-full max-w-[220px]">
                  <AllocationPieChart data={allocation} />
                </div>
                <div className="mt-4 space-y-2">
                  {allocation.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize text-gray-500">
                        {item.name}
                      </span>
                      <span className="font-medium">{formatAED(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
