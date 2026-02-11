"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Bell,
  Building2,
  ChevronRight,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
import { OpportunityFinderPanel } from "@/components/investor/opportunity-finder-panel"
import { AllocationPieChart } from "@/components/charts/allocation-pie-chart"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { cn } from "@/lib/utils"
import {
  formatAED,
} from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import { Loader2 } from "lucide-react"
import type { Investor } from "@/lib/types"

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

type NotificationItem = {
  id: string
  title: string
  createdAt: string
  unread?: boolean
  href?: string
}

export default function InvestorDashboardPage() {
  const { scopedInvestorId } = useApp()

  // Fetch investor data
  const { data: investor, isLoading: investorLoading } = useAPI<Investor>(
    scopedInvestorId ? `/api/investors/${scopedInvestorId}` : null
  )
  const investorName = investor?.name ?? "Investor"
  const investorFirstName =
    typeof investorName === "string" && investorName.trim().length > 0
      ? investorName.trim().split(/\s+/)[0]
      : "Investor"

  // Fetch portfolio
  const { data: portfolioData, isLoading: portfolioLoading } = useAPI<{
    summary: PortfolioSummary
    holdings: PortfolioHolding[]
  }>(scopedInvestorId ? `/api/portfolio/${scopedInvestorId}` : null)

  const summary = React.useMemo<PortfolioSummary>(() => portfolioData?.summary ?? {
    propertyCount: 0, totalValue: 0, totalCost: 0, appreciationPct: 0,
    totalMonthlyIncome: 0, netAnnualIncome: 0, avgYieldPct: 0, avgOccupancy: 0,
  }, [portfolioData])

  const holdings = React.useMemo(() => portfolioData?.holdings ?? [], [portfolioData])

  // Fetch notifications
  const { data: notificationsResponse } = useAPI<{ notifications: Array<{ id: string; title: string; read_at: string | null; created_at: string; metadata?: Record<string, unknown> }> }>("/api/notifications")
  const apiNotifications = React.useMemo(() => {
    const notifications = notificationsResponse?.notifications ?? []
    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      unread: n.read_at === null,
      href: (n.metadata?.link as string) || undefined,
      createdAt: new Date(n.created_at).toLocaleDateString(),
    }))
  }, [notificationsResponse])

  // Fetch portfolio forecast for real chart data
  const { data: forecastData } = useAPI<{
    historicalPortfolioValue: { date: string; totalValue: number; totalRent: number }[]
    scenarios: { name: string; value: { monthly: { month: string; value: number }[] }; income: { monthly: { month: string; netIncome: number }[] } }[]
    currentMetrics: { totalMonthlyIncome: number }
  }>(scopedInvestorId ? "/api/investor/forecast/portfolio" : null)

  // Fetch recommendations
  const { data: recommendationsData } = useAPI<{
    opportunities: Array<{
      id: string
      listingId: string
      status: string
      decision: string
      sharedByName: string | null
      sharedAt: string
      matchScore: number | null
      memoId: string | null
      property: {
        title: string | null
        area: string | null
        type: string | null
        price: number | null
        imageUrl: string | null
      } | null
    }>
    counts: { recommended: number; interested: number; veryInterested: number; pipeline: number }
  }>("/api/investor/opportunities")

  const newRecommendations = React.useMemo(
    () =>
      (recommendationsData?.opportunities ?? []).filter(
        (o) => o.decision === "pending" && o.status === "recommended"
      ),
    [recommendationsData]
  )
  const recCounts = recommendationsData?.counts

  const isLoading = investorLoading || portfolioLoading

  // Value sparkline data - use real historical snapshots when available
  const valueSeries = React.useMemo(() => {
    const historical = forecastData?.historicalPortfolioValue
    if (historical && historical.length >= 3) {
      // Use last 6 data points from real history
      const recent = historical.slice(-6)
      return recent.map((h) => ({
        m: new Date(h.date + "-01").toLocaleDateString("en-US", { month: "short" }),
        v: Math.round(h.totalValue),
      }))
    }
    // Fallback: simple interpolation
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
  }, [summary.totalCost, summary.totalValue, forecastData])

  // Income sparkline data - use base scenario forecast when available
  const incomeSeries = React.useMemo(() => {
    const baseScenario = forecastData?.scenarios?.find((s) => s.name === "base")
    if (baseScenario?.income?.monthly?.length) {
      return baseScenario.income.monthly.slice(0, 6).map((m) => ({
        m: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short" }),
        n: Math.round(m.netIncome),
      }))
    }
    // Fallback
    const monthly = summary.totalMonthlyIncome
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    return months.map((m) => ({
      m,
      n: Math.round(monthly),
    }))
  }, [summary.totalMonthlyIncome, forecastData])

  // Allocation data for pie chart
  const allocation = React.useMemo(() => {
    const byType = new Map<string, number>()
    for (const h of holdings) {
      const key = h.property?.type ?? "unknown"
      byType.set(key, (byType.get(key) ?? 0) + h.financials.currentValue)
    }
    return Array.from(byType.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }))
  }, [holdings])

  // Top holdings with performance metrics
  const topHoldings = React.useMemo(() => {
    return [...holdings]
      .map((h) => ({
        h: {
          id: h.id,
          propertyId: h.listingId,
          currentValue: h.financials.currentValue,
        },
        p: h.property ? {
          title: h.property.title,
          area: h.property.area,
          type: h.property.type,
          imageUrl: h.property.imageUrl,
        } : null,
        y: h.financials.netYieldPct,
        a: h.financials.appreciationPct,
      }))
      .sort((x, y) => y.h.currentValue - x.h.currentValue)
      .slice(0, 5)
  }, [holdings])

  // Latest notifications
  const latestNotifications = React.useMemo(() => (apiNotifications ?? []).slice(0, 4), [apiNotifications])

  // KPI data for the cards
  const kpiData = React.useMemo(
    () => ({
      totalPortfolioValue: summary.totalValue,
      appreciationPct: summary.appreciationPct,
      monthlyRentalIncome: summary.totalMonthlyIncome,
      monthlyRentalTrend: 2.5,
      avgYieldPct: summary.avgYieldPct,
      occupancyPct: summary.avgOccupancy,
      valueSeries,
      incomeSeries,
    }),
    [summary, valueSeries, incomeSeries]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

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
                  Welcome back, {investorFirstName}
                </h1>
                <p className="text-sm sm:text-base text-gray-500 truncate sm:whitespace-normal">
                  {summary.propertyCount} properties • {formatAED(summary.totalValue)}
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
                scopedInvestorId={scopedInvestorId}
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
                {formatAED(summary.totalValue)}
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
            {/* Recommendations Summary */}
            {(newRecommendations.length > 0 || (recCounts && recCounts.recommended > 0)) && (
              <Card className="border-primary/20 bg-gradient-to-r from-emerald-50/50 to-amber-50/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TrendingUp className="size-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {newRecommendations.length} New Recommendation{newRecommendations.length !== 1 ? "s" : ""}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Your advisor has shared properties matching your mandate
                        </p>
                      </div>
                    </div>
                    <Button asChild>
                      <Link href="/investor/opportunities">
                        Review All
                        <ChevronRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  </div>
                  {newRecommendations.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {newRecommendations.slice(0, 3).map((rec) => (
                        <Link
                          key={rec.id}
                          href={`/investor/opportunities/${rec.id}`}
                          className="rounded-lg border bg-white p-3 transition-all hover:shadow-sm hover:border-primary/30"
                        >
                          <div className="flex items-center gap-3">
                            {rec.property?.imageUrl ? (
                              <div className="h-10 w-14 rounded overflow-hidden shrink-0">
                                <img src={rec.property.imageUrl} alt="" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-10 w-14 rounded bg-muted flex items-center justify-center shrink-0">
                                <Building2 className="size-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{rec.property?.title ?? "Property"}</p>
                              <p className="text-xs text-muted-foreground">
                                {rec.property?.area ?? "—"}
                                {rec.property?.price ? ` · AED ${(rec.property.price / 1_000_000).toFixed(1)}M` : ""}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Opportunity Finder - Featured prominently */}
            <OpportunityFinderPanel
              investorId={scopedInvestorId ?? ""}
              className="min-h-[450px]"
            />

            {/* AI Integration Panel */}
            <InvestorAIPanel
              investorId={scopedInvestorId ?? ""}
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
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                    In Portfolio
                                  </Badge>
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
                              scopedInvestorId={scopedInvestorId}
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

          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 sm:space-y-6">
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
