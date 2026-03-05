"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  LayoutList,
  MapPin,
  Scale,
  Settings,
  TrendingDown,
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
import { HoldingsGrid } from "@/components/investor/holdings-grid"
import { InvestorImage } from "@/components/investor/investor-image"
import { PortfolioKPICards } from "@/components/investor/portfolio-kpi-cards"
import { InvestorAIPanel } from "@/components/investor/investor-ai-panel"
import { OpportunityFinderPanel } from "@/components/investor/opportunity-finder-panel"
import { PortfolioValueChart } from "@/components/charts/portfolio-value-chart"
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
  property: { title: string; area: string; type: string; imageUrl?: string; images?: string[] } | null
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

type RecommendationItem = {
  id: string
  listingId: string
  matchScore?: number | null
  property: {
    title: string | null
    area: string | null
    type: string | null
    price: number | null
    imageUrl: string | null
  } | null
}

function RecommendationsPhotoCarousel({
  recommendations,
  advisorName,
  maskFinancials = false,
}: {
  recommendations: RecommendationItem[]
  advisorName: string
  maskFinancials?: boolean
}) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const rec = recommendations[currentIndex]
  const goPrev = () => setCurrentIndex((i) => (i === 0 ? recommendations.length - 1 : i - 1))
  const goNext = () => setCurrentIndex((i) => (i === recommendations.length - 1 ? 0 : i + 1))

  const title = rec.property?.title ?? "Property"
  const area = rec.property?.area
  const type = rec.property?.type
  const price = rec.property?.price
  const matchScore = rec.matchScore != null ? Math.round(rec.matchScore) : null

  return (
    <div className="mt-4">
      <p className="mb-3 text-xs text-muted-foreground">Curated for you by {advisorName}</p>
      <div className="relative flex items-center justify-center gap-2">
        {recommendations.length > 1 && (
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full border-2 bg-white/95 dark:bg-card shadow-sm hover:bg-white dark:hover:bg-card" onClick={(e) => { e.preventDefault(); goPrev() }} aria-label="Previous property">
            <ChevronLeft className="size-5" />
          </Button>
        )}
        <Link
          href={`/investor/opportunities/${rec.id}`}
          className="group flex w-full max-w-[640px] overflow-hidden rounded-xl border-2 border-gray-200 dark:border-border bg-gray-50 dark:bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        >
          <div className="relative w-[45%] min-w-[160px] aspect-[4/3] shrink-0 overflow-hidden">
            <InvestorImage
              src={rec.property?.imageUrl}
              alt={title}
              priority={currentIndex === 0}
              lazy={currentIndex !== 0}
              aspectRatio="4/3"
              imageClassName="transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent sm:from-transparent" />
          </div>
          <div className="flex flex-1 flex-col justify-center p-4 sm:p-5 min-w-0">
            <h4 className="font-semibold text-foreground line-clamp-2 text-sm sm:text-base">{title}</h4>
            {area && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span>{area}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {type && (
                <Badge variant="secondary" className="capitalize text-[10px] sm:text-xs font-medium">
                  {type}
                </Badge>
              )}
              {matchScore != null && (
                <Badge variant="outline" className="text-[10px] sm:text-xs font-medium border-primary/30 text-primary bg-primary/5">
                  {matchScore}% match
                </Badge>
              )}
            </div>
            <p className="mt-2 sm:mt-3 text-lg font-bold tabular-nums text-foreground">
              {maskFinancials ? "—" : price != null ? formatAED(price) : "Price on request"}
            </p>
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary group-hover:underline">
              View details
              <ChevronRight className="size-3.5" />
            </span>
          </div>
        </Link>
        {recommendations.length > 1 && (
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full border-2 bg-white/95 dark:bg-card shadow-sm hover:bg-white dark:hover:bg-card" onClick={(e) => { e.preventDefault(); goNext() }} aria-label="Next property">
            <ChevronRight className="size-5" />
          </Button>
        )}
      </div>
      {recommendations.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {recommendations.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "aspect-[4/3] w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === currentIndex ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-60 hover:opacity-100"
              )}
              aria-label={`View property ${i + 1}`}
            >
              <InvestorImage src={r.property?.imageUrl} alt="" lazy aspectRatio="4/3" className="w-16 shrink-0" fallbackIconSize="sm" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
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

  // All holdings with performance metrics (list view shows all)
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
          images: h.property.images,
        } : null,
        y: h.financials.netYieldPct,
        a: h.financials.appreciationPct,
      }))
      .sort((x, y) => y.h.currentValue - x.h.currentValue)
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

  const HIDE_FINANCIAL_STORAGE_KEY = "investor_hide_financial_data"
  const [hideFinancialData, setHideFinancialData] = React.useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage?.getItem(HIDE_FINANCIAL_STORAGE_KEY) === "1"
  })
  const toggleHideFinancialData = React.useCallback(() => {
    setHideFinancialData((prev) => {
      const next = !prev
      window.localStorage?.setItem(HIDE_FINANCIAL_STORAGE_KEY, next ? "1" : "0")
      return next
    })
  }, [])
  const [goalChartView, setGoalChartView] = React.useState<"goal" | "historical">("goal")
  const [holdingsView, setHoldingsView] = React.useState<"grid" | "list">("grid")

  const advisorName = recommendationsData?.opportunities?.[0]?.sharedByName?.trim() ?? "Sarah"
  const recommendationsWithPhotos = React.useMemo(
    () => newRecommendations.filter((r) => r.property?.imageUrl && r.property.imageUrl.trim() !== "").slice(0, 5),
    [newRecommendations]
  )
  const advisoryFees = React.useMemo(() => ({
    ytd: Math.round((summary.totalValue * 0.01) / 12 * 3),
    allTime: Math.round(summary.totalValue * 0.015),
  }), [summary.totalValue])
  const historicalChartData = React.useMemo(() => {
    const historical = forecastData?.historicalPortfolioValue ?? []
    if (historical.length >= 2) {
      return historical.slice(-12).map((h) => ({
        month: new Date(h.date + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        value: h.totalValue,
      }))
    }
    return []
  }, [forecastData])

  // Fallback value series with concrete dates (last 6 months from today)
  const valueSeriesWithDates = React.useMemo(() => {
    const historical = forecastData?.historicalPortfolioValue
    if (historical && historical.length >= 3) {
      const recent = historical.slice(-6)
      return recent.map((h) => ({
        m: new Date(h.date + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        v: Math.round(h.totalValue),
      }))
    }
    const base = summary.totalCost || summary.totalValue
    const now = summary.totalValue
    const today = new Date()
    const months: { m: string; v: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      const isLast = i === 0
      months.push({ m: label, v: Math.round(isLast ? now : base * (0.98 + (5 - i) * 0.012)) })
    }
    return months.length ? months : [
      { m: "Jan", v: Math.round(base * 0.98) },
      { m: "Mar", v: Math.round(base * 0.99) },
      { m: "May", v: Math.round(base * 1.01) },
      { m: "Jul", v: Math.round(base * 1.03) },
      { m: "Sep", v: Math.round(base * 1.04) },
      { m: "Now", v: Math.round(now) },
    ]
  }, [summary.totalCost, summary.totalValue, forecastData])

  // Chart data for "Your portfolio" card: value over time (how much it's worth)
  const portfolioValueChartData = React.useMemo(() => {
    if (historicalChartData.length >= 2) return historicalChartData
    return valueSeriesWithDates.map((x) => ({ month: x.m, value: x.v }))
  }, [historicalChartData, valueSeriesWithDates])
  const goalChartData = React.useMemo(() => {
    const currentVal = summary.totalValue
    const scenarios = forecastData?.scenarios
    if (scenarios?.length) {
      const base = scenarios.find((s) => s.name === "base")?.value?.monthly
      if (base?.length) {
        return base.slice(-6).map((m) => ({
          month: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short" }),
          value: m.value ?? currentVal,
        })).concat([{ month: "Goal", value: Math.round(currentVal * 1.15) }])
      }
    }
    return [{ month: "Now", value: currentVal }, { month: "Goal", value: Math.round(currentVal * 1.15) }]
  }, [summary.totalValue, forecastData])
  const goalAccountChartData = goalChartView === "historical" && historicalChartData.length ? historicalChartData : goalChartData

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background" aria-busy="true" aria-label="Loading dashboard">
        <div className="relative -mx-4 -mt-4 h-[420px] overflow-hidden bg-muted/30 sm:-mx-6 lg:-mx-8 lg:-mt-6" />
        <div className="py-6">
          <div className="h-10 w-48 rounded-md bg-muted/50 animate-pulse" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[200px] rounded-xl border border-gray-200 bg-white dark:border-border dark:bg-card" />
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            <span className="text-sm text-muted-foreground">Loading dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Hero: Dubai background (smaller overview area) + frosted glass, smaller typography */}
      <div
        className="relative -mx-4 -mt-4 min-h-[520px] overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mt-6"
        style={{
          backgroundImage: "linear-gradient(180deg, rgba(15,41,34,0.90) 0%, rgba(15,41,34,0.86) 50%, rgba(15,41,34,0.93) 100%), url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80')",
          backgroundSize: "115%",
          backgroundPosition: "center 40%",
          backgroundColor: "#0f2922",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />
        <div className="relative px-4 py-6 sm:px-6 lg:px-8">
          {/* Account summary: total value + 4 metric boxes + actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-medium text-white/70 uppercase tracking-widest mb-1">Total Account Value</p>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                  {hideFinancialData ? "AED 0" : formatAED(summary.totalValue)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <div className="rounded-md border border-white/20 bg-emerald-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Net returns to date</p>
                  <p className={cn(
                    "text-sm sm:text-base font-bold tabular-nums mt-0.5",
                    !hideFinancialData && summary.appreciationPct >= 0 && "text-emerald-200",
                    !hideFinancialData && summary.appreciationPct < 0 && "text-red-300"
                  )}>
                    {hideFinancialData ? "—" : `${summary.appreciationPct >= 0 ? "+" : ""}${summary.appreciationPct.toFixed(1)}%`}
                  </p>
                </div>
                <div className="rounded-md border border-white/20 bg-emerald-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Investor since</p>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 mt-0.5">
                    {investor?.createdAt ? new Date(investor.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
                <div className="rounded-md border border-white/20 bg-emerald-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Account level</p>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-300 mt-0.5">Core</p>
                </div>
                <div className="rounded-md border border-white/20 bg-emerald-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Investment plan</p>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-300 mt-0.5 inline-flex items-center gap-1">
                    <Scale className="size-3 shrink-0" /> Balanced Investing
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="ghost" size="sm" onClick={toggleHideFinancialData} className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10 min-h-[36px] sm:min-h-0 text-xs">
                {hideFinancialData ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span className="hidden sm:inline">{hideFinancialData ? "Show" : "Hide"} financial data</span>
              </Button>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 sm:px-5 uppercase tracking-wide shadow-lg h-9">
                <Link href="/investor/payments">Add funds</Link>
              </Button>
            </div>
          </div>
          {/* Income & value summary + Goal cards (frosted glass), smaller text */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Income and value summary</h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-transparent">
                    <TableHead className="text-[10px] sm:text-xs text-emerald-200/80 font-medium py-2"></TableHead>
                    <TableHead className="text-right text-[10px] sm:text-xs text-emerald-200/80 font-medium py-2">YTD</TableHead>
                    <TableHead className="text-right text-[10px] sm:text-xs text-emerald-200/80 font-medium py-2">All time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs sm:text-sm">
                  <TableRow className="border-white/20 hover:bg-transparent">
                    <TableCell className="font-medium text-white/90 py-1.5">Rental income</TableCell>
                    <TableCell className="text-right text-white/90 py-1.5">{hideFinancialData ? "AED 0" : formatAED(summary.netAnnualIncome * 0.3)}</TableCell>
                    <TableCell className="text-right text-white/90 py-1.5">{hideFinancialData ? "AED 0" : formatAED(summary.netAnnualIncome)}</TableCell>
                  </TableRow>
                  <TableRow className="border-white/20 hover:bg-transparent">
                    <TableCell className="font-medium text-white/90 py-1.5">Capital gain</TableCell>
                    <TableCell className="text-right text-white/90 py-1.5">{hideFinancialData ? "+0.0%" : `${summary.appreciationPct >= 0 ? "+" : ""}${summary.appreciationPct.toFixed(1)}%`}</TableCell>
                    <TableCell className="text-right text-white/90 py-1.5">{hideFinancialData ? "AED 0" : formatAED(summary.totalValue - (summary.totalCost || summary.totalValue))}</TableCell>
                  </TableRow>
                  <TableRow className="border-white/20 hover:bg-transparent">
                    <TableCell className="font-medium text-white/90 py-1.5">Advisory fees</TableCell>
                    <TableCell className="text-right text-white/90 py-1.5">{hideFinancialData ? "AED 0" : formatAED(advisoryFees.ytd)}</TableCell>
                    <TableCell className="text-right text-white/90 py-1.5">{hideFinancialData ? "AED 0" : formatAED(advisoryFees.allTime)}</TableCell>
                  </TableRow>
                  <TableRow className="font-semibold border-white/20">
                    <TableCell className="text-white py-1.5">Total</TableCell>
                    <TableCell className="text-right text-white py-1.5">{hideFinancialData ? "AED 0" : formatAED(summary.totalValue)}</TableCell>
                    <TableCell className="text-right text-white py-1.5">{hideFinancialData ? "AED 0" : formatAED(summary.totalValue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Goal account value</h3>
                <div className="flex rounded-md bg-white/10 p-0.5 border border-white/20" role="tablist">
                  <button type="button" onClick={() => setGoalChartView("goal")} className={cn("rounded px-2 py-1 text-[10px] font-medium transition-colors", goalChartView === "goal" ? "bg-emerald-500 text-white" : "text-white/70 hover:text-white/90")}>Goal</button>
                  <button type="button" onClick={() => setGoalChartView("historical")} className={cn("rounded px-2 py-1 text-[10px] font-medium transition-colors", goalChartView === "historical" ? "bg-emerald-500 text-white" : "text-white/70 hover:text-white/90")}>Historical</button>
                </div>
              </div>
              <div className="h-[200px] w-full rounded-md bg-white/5 p-2">
                <PortfolioValueChart data={goalAccountChartData} showAxis className="h-full min-h-[160px]" />
              </div>
              <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-900/50 backdrop-blur-sm p-3">
                <p className="text-xs font-semibold text-emerald-100">Stay on track.</p>
                <p className="text-[11px] text-emerald-200/90 mt-0.5">To stay on track, consider adding funds when opportunities align with your mandate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full py-6">
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card className="rounded-xl border border-gray-200 shadow-sm dark:border-border overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10"><Bell className="size-5 text-primary" /></div>
                  <CardTitle className="text-2xl font-semibold">Notifications</CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-primary hover:bg-primary/10"><Link href="/investor/notifications">View all</Link></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestNotifications.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No new notifications</p> : latestNotifications.map((n) => (
                <Link key={n.id} href={n.href ?? "/investor/notifications"} className={cn("flex items-center gap-3 rounded-xl border p-3.5 transition-all hover:border-primary/40 hover:bg-primary/[0.06]", n.unread ? "border-primary/20 bg-primary/[0.04]" : "border-gray-100 dark:border-border")}>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Building2 className="size-5 text-primary" /></div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", n.unread && "text-foreground")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.createdAt}</p>
                  </div>
                  {n.unread && <div className="size-2.5 shrink-0 rounded-full bg-primary ring-2 ring-primary/20" />}
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-gray-200 shadow-sm dark:border-border bg-gradient-to-br from-white via-primary/[0.02] to-emerald-50/30 dark:from-card dark:via-primary/5 dark:to-emerald-950/20 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10"><LayoutGrid className="size-5 text-primary" /></div>
                  <CardTitle className="text-2xl font-semibold">Your portfolio</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-primary/10" asChild><Link href="/investor/portfolio" aria-label="Portfolio settings"><Settings className="size-4" /></Link></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-[200px] w-full min-h-[180px] rounded-lg bg-muted/30 p-2">
                  <PortfolioValueChart
                    data={portfolioValueChartData.length ? portfolioValueChartData : [{ month: "Now", value: summary.totalValue || 0 }]}
                    showAxis
                    variant="light"
                    className="h-full min-h-[160px]"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-gray-200/80 dark:border-border bg-white/60 dark:bg-card/60 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Current value</p>
                    <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{hideFinancialData ? "—" : formatAED(summary.totalValue)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200/80 dark:border-border bg-white/60 dark:bg-card/60 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cost basis</p>
                    <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{hideFinancialData ? "—" : formatAED(summary.totalCost || summary.totalValue)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200/80 dark:border-border bg-white/60 dark:bg-card/60 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Appreciation</p>
                    <p className={cn("text-xl font-bold tabular-nums mt-0.5", summary.appreciationPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                      {hideFinancialData ? "—" : `${summary.appreciationPct >= 0 ? "+" : ""}${summary.appreciationPct.toFixed(1)}%`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200/80 dark:border-border bg-white/60 dark:bg-card/60 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Properties</p>
                    <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{summary.propertyCount} active</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mb-8" aria-label="Portfolio summary">
          <PortfolioKPICards data={kpiData} maskFinancials={hideFinancialData} />
        </section>

        <section className="mb-8" aria-label="Your properties">
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-gradient-to-br from-white via-primary/[0.03] to-emerald-50/20 dark:from-card dark:via-primary/5 dark:to-emerald-950/10 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  <CardTitle className="text-2xl sm:text-3xl">Your properties</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg border border-gray-200 dark:border-border bg-muted/30 p-0.5" role="tablist">
                    <Button type="button" variant={holdingsView === "grid" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 px-3" onClick={() => setHoldingsView("grid")}><LayoutGrid className="size-4" />Grid</Button>
                    <Button type="button" variant={holdingsView === "list" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 px-3" onClick={() => setHoldingsView("list")}><LayoutList className="size-4" />List</Button>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 h-8 border-gray-200 dark:border-border font-medium" asChild><Link href="/investor/portfolio">Portfolio profile</Link></Button>
                  <Button variant="default" size="sm" className="shrink-0 h-8 gap-1.5" asChild><Link href="/investor/portfolio/all">View all my assets <ChevronRight className="size-3.5" /></Link></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {holdings.length === 0 ? <HoldingsGrid holdings={[]} mandateYieldTarget={investor?.mandate?.yieldTarget ? Number(investor.mandate.yieldTarget) : 8.5} /> : holdingsView === "grid" ? <HoldingsGrid holdings={holdings} mandateYieldTarget={investor?.mandate?.yieldTarget ? Number(investor.mandate.yieldTarget) : 8.5} /> : (
                <div className="-mx-0 overflow-x-auto">
                  <div className="min-w-[640px]">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Property</TableHead><TableHead>Value</TableHead><TableHead>Yield</TableHead><TableHead>Appreciation</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {topHoldings.map(({ h, p, y, a }) => (
                          <TableRow key={h.id}>
                            <TableCell>
                              <div className="flex items-center gap-3 min-w-[200px]">
                                <div className="relative w-20 flex-shrink-0 overflow-hidden rounded-lg">
                                  <InvestorImage src={p?.imageUrl ?? p?.images?.[0]} alt={p?.title ?? ""} lazy aspectRatio="4/3" className="w-20" sizes="80px" fallbackIconSize="sm" />
                                </div>
                                <div className="min-w-0">
                                  <Link href={`/investor/portfolio/${h.id}`} className="font-medium truncate hover:underline block">{p?.title ?? h.propertyId}</Link>
                                  <div className="text-xs text-gray-500">{p?.area ?? "—"} • <span className="capitalize">{p?.type ?? "—"}</span></div>
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide mt-1">In Portfolio</Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{hideFinancialData ? "—" : formatAED(h.currentValue)}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-primary/5">{hideFinancialData ? "—" : `${y.toFixed(2)}%`}</Badge></TableCell>
                            <TableCell>
                              <span className={cn(
                                "inline-flex items-center gap-1.5 text-base font-bold tabular-nums",
                                !hideFinancialData && a >= 0 && "text-emerald-600 dark:text-emerald-400",
                                !hideFinancialData && a < 0 && "text-red-600 dark:text-red-400"
                              )}>
                                {!hideFinancialData && (a >= 0 ? <TrendingUp className="size-4 shrink-0" /> : <TrendingDown className="size-4 shrink-0" />)}
                                {hideFinancialData ? "—" : `${a >= 0 ? "+" : ""}${a.toFixed(1)}%`}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <AskAIBankerWidget agentId="real_estate_advisor" title="AI Advisor" suggestedQuestions={[`What's the outlook for ${p?.title}?`, `Should I hold or sell ${p?.title}?`, `How does ${p?.area} market compare?`]} pagePath="/investor/dashboard" scopedInvestorId={scopedInvestorId} propertyId={h.propertyId} variant="inline" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {(newRecommendations.length > 0 || (recCounts && recCounts.recommended > 0)) && (
              <Card className={cn(
                "rounded-xl border border-gray-200 shadow-sm dark:border-border bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/30 dark:to-transparent",
                recommendationsWithPhotos.length > 0 ? "border-primary/20" : ""
              )}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-xl bg-primary/10", recommendationsWithPhotos.length > 0 ? "p-2.5" : "p-2")}>
                        <TrendingUp className={recommendationsWithPhotos.length > 0 ? "size-6 text-primary" : "size-5 text-primary"} />
                      </div>
                      <div>
                        <h3 className={recommendationsWithPhotos.length > 0 ? "text-2xl sm:text-3xl font-bold" : "font-semibold"}>
                          {recommendationsWithPhotos.length > 0 ? "Recommendation highlights" : `${newRecommendations.length} New Recommendation${newRecommendations.length !== 1 ? "s" : ""}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {recommendationsWithPhotos.length > 0 ? `Curated for you by ${advisorName}` : "Your advisor has shared properties matching your mandate"}
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
                  {recommendationsWithPhotos.length > 0 ? (
                    <RecommendationsPhotoCarousel recommendations={recommendationsWithPhotos} advisorName={advisorName} maskFinancials={hideFinancialData} />
                  ) : newRecommendations.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {newRecommendations.slice(0, 3).map((rec) => (
                        <Link key={rec.id} href={`/investor/opportunities/${rec.id}`} className="rounded-lg border bg-white dark:bg-card p-3 transition-all hover:shadow-sm hover:border-primary/30">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-14 rounded overflow-hidden shrink-0">
                              <InvestorImage src={rec.property?.imageUrl} alt="" lazy aspectRatio="4/3" className="h-10 w-14" sizes="56px" fallbackIconSize="sm" />
                            </div>
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
                  ) : null}
                </CardContent>
              </Card>
            )}

        <div className="w-full space-y-6">
          <OpportunityFinderPanel investorId={scopedInvestorId ?? ""} className="min-h-[450px]" />
          <InvestorAIPanel investorId={scopedInvestorId ?? ""} investorName={investorName} />
        </div>
      </div>
    </div>
  )
}
