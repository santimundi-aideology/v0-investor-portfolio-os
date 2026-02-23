"use client"

import * as React from "react"
import Link from "next/link"
import {
  Loader2,
  Building2,
  Coins,
  Percent,
  FileDown,
  Bell,
  BarChart3,
  HardHat,
  ChevronRight,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useApp } from "@/components/providers/app-provider"
import { useAPI } from "@/lib/hooks/use-api"
import type { Investor } from "@/lib/types"
import { formatAED } from "@/lib/real-estate"
import { HoldingsGrid } from "@/components/investor/holdings-grid"
import { AllocationPieChart } from "@/components/charts/allocation-pie-chart"
import { MiniAreaSparkline } from "@/components/charts/mini-area-sparkline"
import { ScoreRadarChart } from "@/components/charts/score-radar-chart"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts"
import { TrendingUp, DollarSign } from "lucide-react"

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
    purchasePrice: number
    currentValue: number
    monthlyRent: number
    occupancyRate: number
    annualExpenses: number
    appreciationPct: number
    netYieldPct: number
  }
}

type NotificationItem = {
  id: string
  title: string
  createdAt: string
  unread?: boolean
  href?: string
}

export default function PortfolioPage() {
  const { scopedInvestorId } = useApp()
  const { data: investor, isLoading } = useAPI<Investor>(
    scopedInvestorId ? `/api/investors/${scopedInvestorId}` : null
  )
  const { data: portfolioData } = useAPI<{
    summary: PortfolioSummary
    holdings: PortfolioHolding[]
  }>(scopedInvestorId ? `/api/portfolio/${scopedInvestorId}` : null)

  const { data: notificationsResponse } = useAPI<{
    notifications: Array<{
      id: string
      title: string
      read_at: string | null
      created_at: string
      metadata?: Record<string, unknown>
    }>
  }>("/api/notifications")

  const [downloadingPdf, setDownloadingPdf] = React.useState(false)

  const latestNotifications = React.useMemo<NotificationItem[]>(() => {
    const list = notificationsResponse?.notifications ?? []
    return list.slice(0, 5).map((n) => ({
      id: n.id,
      title: n.title,
      unread: n.read_at === null,
      href: (n.metadata?.link as string) || undefined,
      createdAt: new Date(n.created_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    }))
  }, [notificationsResponse])

  const summary = React.useMemo<PortfolioSummary>(
    () =>
      portfolioData?.summary ?? {
        propertyCount: 0,
        totalValue: 0,
        totalCost: 0,
        appreciationPct: 0,
        totalMonthlyIncome: 0,
        netAnnualIncome: 0,
        avgYieldPct: 0,
        avgOccupancy: 0,
      },
    [portfolioData]
  )

  const holdings = React.useMemo(() => portfolioData?.holdings ?? [], [portfolioData])
  const hasHoldings = summary.propertyCount > 0
  const targetYield = investor?.mandate?.yieldTarget ? Number(investor.mandate.yieldTarget) : 8.5

  const allocationByType = React.useMemo(() => {
    const byType = new Map<string, number>()
    holdings.forEach((h) => {
      const key = h.property?.type ?? "Other"
      byType.set(key, (byType.get(key) ?? 0) + h.financials.currentValue)
    })
    return Array.from(byType.entries()).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [holdings])

  const portfolioAreas = React.useMemo(() => {
    const set = new Set<string>()
    holdings.forEach((h) => h.property?.area && set.add(h.property.area))
    return Array.from(set)
  }, [holdings])

  const valueSparklineData = React.useMemo(() => {
    if (!hasHoldings || summary.totalCost <= 0) return []
    const cost = summary.totalCost
    const value = summary.totalValue
    return [
      { m: "Purchase", v: cost },
      { m: "Now", v: value },
    ]
  }, [hasHoldings, summary.totalCost, summary.totalValue])

  const yieldVsTargetChartData = React.useMemo(() => {
    if (!hasHoldings) return []
    const onTrack = summary.avgYieldPct >= targetYield - 0.5
    return [
      { label: "Your yield", value: summary.avgYieldPct, fill: onTrack ? "#10b981" : "#f59e0b" },
      { label: "Target", value: targetYield, fill: "#e5e7eb" },
    ]
  }, [hasHoldings, summary.avgYieldPct, targetYield])

  // Radar chart data: portfolio profile (Yield, Occupancy, Appreciation, Diversification, Income)
  const portfolioRadarData = React.useMemo(() => {
    if (!hasHoldings) return []
    const appreciationScore = Math.max(0, Math.min(100, (summary.appreciationPct + 10) / 0.3))
    const diversificationScore = Math.min(100, (allocationByType.length * 25) + (Math.min(portfolioAreas.length, 4) * 12.5))
    return [
      { factor: "Yield", score: summary.avgYieldPct, maxScore: 15 },
      { factor: "Occupancy", score: summary.avgOccupancy, maxScore: 100 },
      { factor: "Appreciation", score: Math.max(0, summary.appreciationPct + 10), maxScore: 30 },
      { factor: "Diversification", score: Math.min(4, allocationByType.length + Math.ceil(portfolioAreas.length / 2)), maxScore: 4 },
      { factor: "Income", score: summary.avgYieldPct, maxScore: 12 },
    ]
  }, [hasHoldings, summary, allocationByType.length, portfolioAreas.length])

  // Value by property (for bar chart in Portfolio analysis)
  const valueByPropertyChartData = React.useMemo(() => {
    return holdings
      .slice(0, 10)
      .map((h) => ({
        name: h.property?.title?.slice(0, 12) ?? h.listingId.slice(0, 8),
        value: h.financials.currentValue,
        fullName: h.property?.title ?? h.listingId,
      }))
  }, [holdings])

  // Monthly income by property (for bar chart)
  const incomeByPropertyChartData = React.useMemo(() => {
    return holdings
      .slice(0, 10)
      .map((h) => ({
        name: h.property?.title?.slice(0, 12) ?? h.listingId.slice(0, 8),
        value: h.financials.monthlyRent,
        fullName: h.property?.title ?? h.listingId,
      }))
  }, [holdings])

  // Occupancy by property (for bar chart)
  const occupancyByPropertyChartData = React.useMemo(() => {
    return holdings
      .slice(0, 10)
      .map((h) => ({
        name: h.property?.title?.slice(0, 12) ?? h.listingId.slice(0, 8),
        value: Math.round(h.financials.occupancyRate * 100),
        fullName: h.property?.title ?? h.listingId,
      }))
  }, [holdings])

  const handleDownloadPortfolioPdf = async () => {
    setDownloadingPdf(true)
    try {
      const res = await fetch("/api/investor/portfolio/export-pdf")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to generate PDF")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${(investor?.name || "Portfolio").replace(/[^a-zA-Z0-9]/g, "_")}_Possessions.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Portfolio PDF downloaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to download PDF")
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your portfolio...</p>
        </div>
      </div>
    )
  }

  const yieldVsTarget = hasHoldings ? summary.avgYieldPct - targetYield : 0
  const isRentable = yieldVsTarget >= -0.5

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section
        className={cn(
          "relative min-h-[200px] w-screen overflow-hidden px-5 py-8 sm:min-h-[240px] sm:px-8 sm:py-10 lg:px-10",
          "left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]",
          "rounded-b-2xl shadow-lg sm:rounded-b-3xl"
        )}
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(15,41,34,0.90) 0%, rgba(15,41,34,0.86) 50%, rgba(15,41,34,0.93) 100%), url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=80')",
          backgroundSize: "115%",
          backgroundPosition: "center 40%",
          backgroundColor: "#0f2922",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
                My properties
              </h1>
              <p className="mt-2 max-w-3xl text-base text-emerald-100/95 sm:text-lg">
                Your portfolio of real estate holdings. Select a property to view details, gains, risk data and performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Your investment intentions: aligned with profile */}
      {(investor?.mandate && (investor.mandate.investmentHorizon || investor.mandate.riskTolerance || investor.mandate.completionStatus || (investor.mandate.propertyTypes?.length ?? 0) > 0)) && (
        <section className="mt-6 px-4 sm:px-0">
          <Link
            href="/investor/profile"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30"
          >
            <User className="size-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Your investment intentions:</span>
            <span className="text-sm text-emerald-800 dark:text-emerald-200">
              {[
                investor.mandate.investmentHorizon?.trim() || investor.thesisHoldPeriod?.trim(),
                investor.mandate.riskTolerance ? `${investor.mandate.riskTolerance} risk` : null,
                investor.mandate.completionStatus === "ready" ? "Ready to move" : investor.mandate.completionStatus === "off_plan" ? "Off-plan" : null,
                (investor.mandate.propertyTypes?.length ?? 0) > 0 ? investor.mandate.propertyTypes?.slice(0, 3).join(", ") : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Complete your profile"}
            </span>
            <ChevronRight className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto" />
          </Link>
        </section>
      )}

      {/* My properties section: portfolio summary box inside + grid */}
      <section className="mt-8 px-4 sm:px-0">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">My houses</h2>

        {/* Portfolio summary — con gráficos y más datos */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Portfolio summary</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Total invested, assets, yield and allocation. Aligned with your profile: timeline, risk, readiness and asset focus.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPortfolioPdf}
              disabled={downloadingPdf}
              className="w-fit gap-2"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generando PDF…
                </>
              ) : (
                <>
                  <FileDown className="size-4" />
                  Descargar resumen PDF
                </>
              )}
            </Button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-border dark:bg-muted/40">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <Coins className="size-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total value</p>
                <p className="text-xl font-bold tracking-tight">
                  {hasHoldings ? formatAED(summary.totalValue) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-border dark:bg-muted/40">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <Building2 className="size-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Assets</p>
                <p className="text-xl font-bold tracking-tight">{summary.propertyCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-border dark:bg-muted/40">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <Percent className="size-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg. yield (net)</p>
                <p className="text-xl font-bold tracking-tight">
                  {hasHoldings ? `${summary.avgYieldPct.toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-border dark:bg-muted/40">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <DollarSign className="size-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Net annual income</p>
                <p className="text-xl font-bold tracking-tight">
                  {hasHoldings ? formatAED(summary.netAnnualIncome) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-border dark:bg-muted/40">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <TrendingUp className="size-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total cost</p>
                <p className="text-xl font-bold tracking-tight">
                  {hasHoldings ? formatAED(summary.totalCost) : "—"}
                </p>
              </div>
            </div>
          </div>
          {hasHoldings && (
            <div className="mt-6 grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 dark:border-border dark:bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Allocation by type</p>
                <div className="h-[200px] w-full">
                  <AllocationPieChart
                    data={allocationByType.length > 0 ? allocationByType : [{ name: "Portfolio", value: summary.totalValue || 1 }]}
                    showLegend
                  />
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 dark:border-border dark:bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Portfolio profile (spider)</p>
                <p className="text-[11px] text-muted-foreground mb-2">Yield, occupancy, appreciation, diversification, income</p>
                <div className="h-[250px] w-full">
                  {portfolioRadarData.length > 0 ? (
                    <ScoreRadarChart data={portfolioRadarData} color="var(--color-primary)" />
                  ) : (
                    <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Add data for radar</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 dark:border-border dark:bg-muted/20 lg:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Value trend (purchase → now)</p>
                <div className="h-[80px] w-full flex items-center">
                  {valueSparklineData.length >= 2 ? (
                    <MiniAreaSparkline data={valueSparklineData} dataKey="v" />
                  ) : (
                    <p className="text-sm text-muted-foreground">Add more data to see trend</p>
                  )}
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Purchase: {hasHoldings ? formatAED(summary.totalCost) : "—"}</span>
                  <span>Now: {hasHoldings ? formatAED(summary.totalValue) : "—"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <HoldingsGrid
          holdings={holdings}
          mandateYieldTarget={targetYield}
        />
      </section>

      {/* Below: analysis + phase + latest notifications — mismo estilo que Overview, blanco serio */}
      <section className="mt-10 grid gap-6 px-4 sm:grid-cols-1 lg:grid-cols-3 sm:px-0">
        {/* Portfolio analysis */}
        <Card className="rounded-xl border border-gray-200 shadow-sm dark:border-border overflow-hidden bg-gradient-to-br from-white via-primary/[0.02] to-emerald-50/20 dark:from-card dark:via-primary/5 dark:to-emerald-950/10 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <BarChart3 className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Portfolio analysis</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Overview to help you see if your portfolio is profitable and on track
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasHoldings ? (
              <p className="text-sm text-muted-foreground">
                Add properties to see analysis and profitability metrics.
              </p>
            ) : (
              <>
                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-border dark:bg-card/50">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Yield vs target ({targetYield}%)</p>
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yieldVsTargetChartData} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                        <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 11 }} />
                        <Bar dataKey="value" name="Yield %" radius={[0, 4, 4, 0]}>
                          {yieldVsTargetChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className={cn("mt-2 text-sm font-medium", isRentable ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
                    {summary.avgYieldPct.toFixed(1)}% {yieldVsTarget >= 0 ? "above" : "below"} target — {isRentable ? "On track" : "Review underperforming assets"}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-gray-100 bg-white p-4 dark:border-border dark:bg-card/50">
                    <p className="text-xs font-medium text-muted-foreground">Average occupancy</p>
                    <p className="mt-1 text-lg font-semibold">{summary.avgOccupancy.toFixed(0)}%</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {summary.avgOccupancy >= 95 ? "Strong occupancy." : "Vacancy may affect income."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-4 dark:border-border dark:bg-card/50">
                    <p className="text-xs font-medium text-muted-foreground">Total appreciation</p>
                    <p className={cn(
                      "mt-1 text-lg font-semibold",
                      summary.appreciationPct >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                    )}>
                      {summary.appreciationPct >= 0 ? "+" : ""}{summary.appreciationPct.toFixed(1)}%
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Capital gain (portfolio)</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-4 dark:border-border dark:bg-card/50">
                    <p className="text-xs font-medium text-muted-foreground">Net annual income</p>
                    <p className="mt-1 text-lg font-semibold">{formatAED(summary.netAnnualIncome)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">After expenses</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-4 dark:border-border dark:bg-card/50">
                    <p className="text-xs font-medium text-muted-foreground">Monthly income</p>
                    <p className="mt-1 text-lg font-semibold">{formatAED(summary.totalMonthlyIncome)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Rental (gross)</p>
                  </div>
                </div>

                {/* Value by property */}
                {valueByPropertyChartData.length > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-border dark:bg-card/50">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Value by property (top 10)</p>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={valueByPropertyChartData} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                          <XAxis type="number" tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => [formatAED(v), "Value"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""} />
                          <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} fillOpacity={0.85} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Income by property + Occupancy by property */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {incomeByPropertyChartData.length > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-border dark:bg-card/50">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Monthly rent by property (top 10)</p>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={incomeByPropertyChartData} margin={{ left: 0, right: 12, top: 4, bottom: 24 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={44} />
                            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={36} />
                            <Tooltip formatter={(v: number) => [formatAED(v), "Rent"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""} />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {occupancyByPropertyChartData.length > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-border dark:bg-card/50">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Occupancy by property (top 10)</p>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={occupancyByPropertyChartData} margin={{ left: 0, right: 12, top: 4, bottom: 24 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={44} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} tickFormatter={(v) => `${v}%`} />
                            <Tooltip formatter={(v: number) => [`${v}%`, "Occupancy"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""} />
                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Portfolio state — más información sobre el portfolio y su estado */}
          <Card className="rounded-xl border border-gray-200 shadow-sm dark:border-border overflow-hidden bg-gradient-to-br from-white via-primary/[0.02] to-emerald-50/20 dark:from-card dark:via-primary/5 dark:to-emerald-950/10">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <HardHat className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Portfolio state</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Status, diversification and health of your portfolio
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasHoldings ? (
                <p className="text-sm text-muted-foreground">No properties yet. Add assets to see state and health.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2.5 dark:border-border dark:bg-card/50">
                    <span className="text-sm font-medium">Phase</span>
                    <span className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                      Ready / In use
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-100 bg-white p-3 dark:border-border dark:bg-card/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Areas</p>
                      <p className="mt-0.5 text-base font-semibold">{portfolioAreas.length}</p>
                      <p className="text-xs text-muted-foreground truncate" title={portfolioAreas.join(", ")}>
                        {portfolioAreas.length ? portfolioAreas.slice(0, 2).join(", ") : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-white p-3 dark:border-border dark:bg-card/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Types</p>
                      <p className="mt-0.5 text-base font-semibold">{allocationByType.length}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {allocationByType.length ? allocationByType.map((a) => a.name).join(", ") : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2.5 dark:border-border dark:bg-card/50">
                    <span className="text-sm font-medium">Portfolio health</span>
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      isRentable && summary.avgOccupancy >= 90
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                    )}>
                      {isRentable && summary.avgOccupancy >= 90 ? "Healthy" : "Review"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {summary.propertyCount} {summary.propertyCount === 1 ? "property" : "properties"}
                    {portfolioAreas.length > 0 ? ` across ${portfolioAreas.length} area${portfolioAreas.length === 1 ? "" : "s"}` : ""}.
                    {allocationByType.length > 1 ? " Diversified across property types." : ""}
                    {" "}Check each asset for off-plan or handover status.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Latest notifications — mismo estilo que Overview Notifications */}
          <Card className="rounded-xl border border-gray-200 shadow-sm dark:border-border overflow-hidden bg-gradient-to-br from-white via-primary/[0.02] to-emerald-50/20 dark:from-card dark:via-primary/5 dark:to-emerald-950/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                    <Bell className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Latest notifications</CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-primary hover:bg-primary/10">
                  <Link href="/investor/notifications">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestNotifications.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No new notifications</p>
              ) : (
                latestNotifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href ?? "/investor/notifications"}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 transition-all hover:border-primary/40 hover:bg-primary/[0.06]",
                      n.unread ? "border-primary/20 bg-primary/[0.04]" : "border-gray-100 dark:border-border"
                    )}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Building2 className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", n.unread && "text-foreground")}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.createdAt}</p>
                    </div>
                    {n.unread && (
                      <div className="size-2.5 shrink-0 rounded-full bg-primary ring-2 ring-primary/20" />
                    )}
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
