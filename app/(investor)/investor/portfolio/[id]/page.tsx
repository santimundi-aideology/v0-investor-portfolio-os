"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Home,
  MapPin,
  Percent,
  Radar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HoldingDetailCard } from "@/components/investor/holding-detail-card"
import { HoldingPerformanceChart } from "@/components/investor/holding-performance-chart"
import { HoldingForecastChart } from "@/components/investor/holding-forecast-chart"
import { cn } from "@/lib/utils"
import { formatMarketSignalType } from "@/lib/types"
import { Loader2 } from "lucide-react"
import {
  calcAppreciationPct,
  calcYieldPct,
  calcAnnualNetRent,
  calcIncomeToDate,
  forecastMonthlyNetIncome,
  formatAED,
  type PropertyHolding,
} from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import type { MarketSignalItem, Property } from "@/lib/types"

function getAIRecommendation(holding: PropertyHolding): {
  action: "hold" | "sell" | "improve"
  confidence: number
  summary: string
  reasons: string[]
  risks: string[]
  opportunities: string[]
} {
  const appreciation = calcAppreciationPct(holding)
  const yieldPct = calcYieldPct(holding)

  if (appreciation > 15 && yieldPct < 6) {
    return {
      action: "sell",
      confidence: 78,
      summary: "Consider taking profits given the strong appreciation and below-average yield.",
      reasons: [
        `Asset has appreciated ${appreciation.toFixed(1)}% since purchase`,
        `Current yield of ${yieldPct.toFixed(1)}% is below market average`,
        "Market cycle may be near peak for this asset class",
      ],
      risks: [
        "Potential capital gains tax implications",
        "Transaction costs may reduce net proceeds",
        "Reinvestment risk if market conditions change",
      ],
      opportunities: [
        "Lock in gains before potential market correction",
        "Redeploy capital into higher-yielding assets",
        "Opportunity to diversify into different markets",
      ],
    }
  }

  if (yieldPct > 9 && holding.occupancyRate > 0.95) {
    return {
      action: "hold",
      confidence: 85,
      summary: "Strong performance metrics suggest maintaining current position.",
      reasons: [
        `Excellent yield of ${yieldPct.toFixed(1)}% exceeds market benchmarks`,
        `High occupancy rate of ${(holding.occupancyRate * 100).toFixed(0)}% indicates tenant stability`,
        "Consistent income stream supports long-term hold strategy",
      ],
      risks: [
        "Lease renewal risk as current tenants may relocate",
        "Market rent may soften with new supply",
        "Property may require capex for tenant retention",
      ],
      opportunities: [
        "Potential for rent escalation at renewal",
        "Consider refinancing to extract equity",
        "Explore adjacent unit acquisition for scale",
      ],
    }
  }

  if (holding.occupancyRate < 0.85 || yieldPct < 6) {
    return {
      action: "improve",
      confidence: 72,
      summary: "Value-add opportunities exist to enhance returns through targeted improvements.",
      reasons: [
        holding.occupancyRate < 0.85
          ? `Occupancy at ${(holding.occupancyRate * 100).toFixed(0)}% below optimal levels`
          : `Yield at ${yieldPct.toFixed(1)}% underperforms market`,
        "Asset repositioning could attract premium tenants",
        "Strategic upgrades can justify higher rental rates",
      ],
      risks: [
        "Renovation costs may exceed budget",
        "Disruption during improvement period",
        "No guarantee improvements will attract tenants",
      ],
      opportunities: [
        "Smart home upgrades increasingly valued by tenants",
        "ESG improvements may qualify for green financing",
        "Enhanced amenities can reduce vacancy periods",
      ],
    }
  }

  return {
    action: "hold",
    confidence: 70,
    summary: "Asset is performing within expectations. Monitor for changing conditions.",
    reasons: [
      "Performance metrics align with investment thesis",
      "No immediate action required",
      "Continue monitoring market dynamics",
    ],
    risks: [
      "Market conditions may shift",
      "Tenant concentration risk",
      "Potential for increased competition",
    ],
    opportunities: [
      "Explore lease extension with rent escalation",
      "Consider property management optimization",
      "Monitor market for opportunistic sale window",
    ],
  }
}

// Comparables and market signals are now loaded from API within the component

const actionColors = {
  hold: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  sell: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  improve: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
}

const severityColors = {
  info: "bg-muted text-muted-foreground",
  watch: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  urgent: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

export default function HoldingDetailPage() {
  const params = useParams()
  const holdingId = params.id as string

  // Fetch portfolio to find this holding
  const { scopedInvestorId: investorId } = useApp()
  const { data: portfolioData, isLoading: portfolioLoading } = useAPI<{
    holdings: Array<{
      id: string; investorId: string; listingId: string;
      property: { id: string; title: string; area: string; type: string; address?: string; imageUrl?: string; size?: number; bedrooms?: number; bathrooms?: number; status?: string; price?: number; roi?: number } | null;
      financials: { purchasePrice: number; purchaseDate: string; currentValue: number; monthlyRent: number; occupancyRate: number; annualExpenses: number; appreciationPct: number; netYieldPct: number }
    }>
  }>(investorId ? `/api/portfolio/${investorId}` : null)

  // Fetch market signals
  const { data: signalsResponse } = useAPI<{ signals: Array<{ id: string; type: string; title: string; description: string; area: string; propertyType: string | null; severity: string; sourceType: string; status: string; detectedAt: string }> }>("/api/market-signals")

  // Find the specific holding
  const holding: PropertyHolding | null = React.useMemo(() => {
    if (!portfolioData?.holdings) return null
    const h = portfolioData.holdings.find((h) => h.id === holdingId)
    if (!h) return null
    return {
      id: h.id,
      investorId: h.investorId,
      propertyId: h.listingId,
      purchasePrice: h.financials.purchasePrice,
      purchaseDate: h.financials.purchaseDate,
      currentValue: h.financials.currentValue,
      monthlyRent: h.financials.monthlyRent,
      occupancyRate: h.financials.occupancyRate,
      annualExpenses: h.financials.annualExpenses,
    }
  }, [portfolioData, holdingId])

  const property = React.useMemo(() => {
    if (!portfolioData?.holdings) return null
    const h = portfolioData.holdings.find((h) => h.id === holdingId)
    if (!h?.property) return null
    const p = h.property as Record<string, unknown>
    return {
      ...h.property,
      address: h.property.address ?? h.property.area,
      type: (h.property.type ?? "residential") as Property["type"],
      status: (h.property.status ?? "available") as Property["status"],
      readinessStatus: (p.readinessStatus ?? "READY_FOR_MEMO") as Property["readinessStatus"],
      price: h.property.price ?? 0,
      size: h.property.size ?? 0,
      createdAt: (p.createdAt as string) ?? new Date().toISOString(),
    } as Property
  }, [portfolioData, holdingId])

  const recommendation = React.useMemo(
    () => (holding ? getAIRecommendation(holding) : null),
    [holding]
  )

  const comparables: { id: string; title: string; area: string; price: number; size: number; roi?: number; pricePerSqft: number }[] = []

  const marketSignals = React.useMemo(() => {
    const signals = signalsResponse?.signals ?? []
    if (!property) return []
    // Transform and filter signals
    return signals
      .filter((s) => s.area === property.area || s.propertyType === property.type)
      .map((s) => ({
        id: s.id,
        type: s.type as MarketSignalItem["type"],
        sourceType: "official" as const,
        source: "DLD",
        timeframe: "QoQ" as const,
        severity: (s.severity === "high" ? "urgent" : s.severity === "medium" ? "watch" : "info") as MarketSignalItem["severity"],
        status: "new" as const,
        geoType: "community" as const,
        geoId: s.area,
        geoName: s.area,
        segment: s.propertyType || "all",
        metric: "median_price_psf" as const,
        metricLabel: s.title,
        currentValue: 0,
        currentValueLabel: s.title,
        prevValue: null,
        prevValueLabel: null,
        deltaPct: null,
        confidenceScore: 0.8,
        createdAt: s.detectedAt,
        investorMatches: 0,
        propertyTitle: null,
        metadata: {},
      }))
      .slice(0, 4)
  }, [signalsResponse, property])

  const incomeData = React.useMemo(
    () => (holding ? calcIncomeToDate(holding) : { net: 0, months: 0 }),
    [holding]
  )

  const forecastData = React.useMemo(
    () => (holding ? forecastMonthlyNetIncome(holding, 12) : []),
    [holding]
  )

  // Fetch real historical snapshots from portfolio_snapshots table
  const { data: snapshotsData } = useAPI<{ date: string; value: number; rent: number | null }[]>(
    holding ? `/api/investor/forecast/${holdingId}` : null
  )

  const valueHistory = React.useMemo(() => {
    // Try to use real snapshot data from the forecast API response
    const snapshots = (snapshotsData as unknown as { historicalSnapshots?: { date: string; value: number }[] })?.historicalSnapshots
    if (snapshots && snapshots.length > 0) {
      return snapshots.map(s => ({
        month: s.date,
        value: Math.round(s.value),
      }))
    }

    // Fallback: interpolate from purchase to current value
    if (!holding) return []
    const months = 12
    const startValue = holding.purchasePrice
    const endValue = holding.currentValue
    const increment = (endValue - startValue) / months

    return Array.from({ length: months }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (months - i - 1))
      return {
        month: date.toISOString().slice(0, 7),
        value: Math.round(startValue + increment * (i + 1)),
      }
    })
  }, [holding, snapshotsData])

  if (portfolioLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading holding details...</p>
        </div>
      </div>
    )
  }

  if (!holding || !property) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Building2 className="mx-auto size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Holding not found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The holding you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button asChild className="mt-4">
            <Link href="/investor/portfolio">
              <ArrowLeft className="mr-2 size-4" />
              Back to Portfolio
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  const yieldPct = calcYieldPct(holding)
  const appreciationPct = calcAppreciationPct(holding)
  const annualNetRent = calcAnnualNetRent(holding)

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild className="min-h-[44px] -ml-2">
        <Link href="/investor/portfolio">
          <ArrowLeft className="mr-2 size-4" />
          Back to Portfolio
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{property.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{property.address}</span>
          </div>
        </div>
        {recommendation && (
          <Badge variant="outline" className={cn("text-sm px-3 py-1.5 w-fit", actionColors[recommendation.action])}>
            <Sparkles className="mr-2 size-4" />
            AI: {recommendation.action.charAt(0).toUpperCase() + recommendation.action.slice(1)}
          </Badge>
        )}
      </div>

      {/* Main grid - sidebar moves below on mobile */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Property Detail Card with Image Gallery */}
          <HoldingDetailCard
            holding={holding}
            property={property}
            yieldPct={yieldPct}
            appreciationPct={appreciationPct}
            annualNetRent={annualNetRent}
            incomeToDate={incomeData.net}
            monthsHeld={incomeData.months}
          />

          {/* Performance Charts - Full width on mobile */}
          <Tabs defaultValue="value" className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
              <TabsTrigger value="value" className="min-h-[44px] sm:min-h-0">Value</TabsTrigger>
              <TabsTrigger value="income" className="min-h-[44px] sm:min-h-0">Income</TabsTrigger>
              <TabsTrigger value="forecast" className="min-h-[44px] sm:min-h-0">Forecast</TabsTrigger>
            </TabsList>
            <TabsContent value="value">
              <Card>
                <CardHeader>
                  <CardTitle>Property Value Trend</CardTitle>
                  <CardDescription>
                    Historical value from purchase to current valuation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HoldingPerformanceChart
                    type="value"
                    data={valueHistory}
                    purchasePrice={holding.purchasePrice}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="income">
              <Card>
                <CardHeader>
                  <CardTitle>Rental Income Forecast</CardTitle>
                  <CardDescription>
                    12-month projection of net rental income
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HoldingPerformanceChart
                    type="income"
                    data={forecastData}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="forecast">
              <HoldingForecastChart holdingId={holdingId} />
            </TabsContent>
          </Tabs>

          {/* Comparable Properties */}
          {comparables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Building2 className="size-5" />
                  Comparables
                </CardTitle>
                <CardDescription className="text-sm">
                  Similar in {property.area}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Single column on mobile, 3 columns on desktop */}
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {comparables.map((comp) => (
                    <Card key={comp.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <h4 className="font-medium truncate">{comp.title}</h4>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price</span>
                            <span className="font-medium">{formatAED(comp.price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Size</span>
                            <span>{comp.size.toLocaleString()} sq ft</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price/sq ft</span>
                            <span>{formatAED(comp.pricePerSqft)}</span>
                          </div>
                          {comp.roi && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ROI</span>
                              <span className="text-emerald-600">{comp.roi}%</span>
                            </div>
                          )}
                        </div>
                        <Button asChild variant="outline" size="sm" className="mt-3 w-full min-h-[44px]">
                          <Link href={`/properties/${comp.id}`}>View Details</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Moves below main content on mobile */}
        <div className="space-y-4 sm:space-y-6 order-last lg:order-none">
          {/* AI Recommendation Card */}
          {recommendation && (
            <Card className={cn("border-2", actionColors[recommendation.action])}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5" />
                  AI Recommendation
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {recommendation.confidence}% Confidence
                  </Badge>
                  <Badge variant="outline" className={actionColors[recommendation.action]}>
                    {recommendation.action.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{recommendation.summary}</p>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Key Factors</h4>
                  <ul className="space-y-1">
                    {recommendation.reasons.map((reason, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold mb-2 text-amber-600">Risks</h4>
                  <ul className="space-y-1">
                    {recommendation.risks.map((risk, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <TrendingDown className="size-3 text-amber-600 shrink-0 mt-0.5" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2 text-emerald-600">Opportunities</h4>
                  <ul className="space-y-1">
                    {recommendation.opportunities.map((opp, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <TrendingUp className="size-3 text-emerald-600 shrink-0 mt-0.5" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Market Signals */}
          {marketSignals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radar className="size-5" />
                  Related Market Signals
                </CardTitle>
                <CardDescription>
                  Signals relevant to this property&apos;s area and type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {marketSignals.map((signal) => (
                  <div key={signal.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">
                          {formatMarketSignalType(signal.type)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {signal.geoName} • {signal.segment}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 capitalize", severityColors[signal.severity])}
                      >
                        {signal.severity}
                      </Badge>
                    </div>
                    {signal.deltaPct != null && (
                      <div className="mt-2 text-sm">
                        <span className={cn(
                          "font-medium",
                          signal.deltaPct >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {signal.deltaPct >= 0 ? "+" : ""}{signal.deltaPct.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground ml-1">{signal.timeframe}</span>
                      </div>
                    )}
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full min-h-[44px]">
                  <Link href="/market-signals">View All Signals</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  Purchase Date
                </div>
                <span className="font-medium">
                  {new Date(holding.purchaseDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="size-4" />
                  Purchase Price
                </div>
                <span className="font-medium">{formatAED(holding.purchasePrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="size-4" />
                  Property Type
                </div>
                <span className="font-medium capitalize">{property.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  Occupancy
                </div>
                <span className="font-medium">{(holding.occupancyRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Percent className="size-4" />
                  Monthly Rent
                </div>
                <span className="font-medium">{formatAED(holding.monthlyRent)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
