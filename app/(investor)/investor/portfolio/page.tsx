"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Building2,
  Filter,
  MapPin,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PortfolioKPICards, type KPIData } from "@/components/investor/portfolio-kpi-cards"
import { cn } from "@/lib/utils"
import {
  calcAppreciationPct,
  calcYieldPct,
  formatAED,
  getHoldingsForInvestor,
  getHoldingProperty,
  getPortfolioSummary,
  type PropertyHolding,
} from "@/lib/real-estate"

type SortOption = "value-desc" | "value-asc" | "yield-desc" | "yield-asc" | "appreciation-desc" | "appreciation-asc"

function getAIRecommendation(holding: PropertyHolding): { action: "hold" | "sell" | "improve"; reason: string } {
  const appreciation = calcAppreciationPct(holding)
  const yieldPct = calcYieldPct(holding)

  if (appreciation > 15 && yieldPct < 6) {
    return { action: "sell", reason: "High appreciation, consider taking profits" }
  }
  if (yieldPct > 9 && holding.occupancyRate > 0.95) {
    return { action: "hold", reason: "Strong yield with stable occupancy" }
  }
  if (holding.occupancyRate < 0.85 || yieldPct < 6) {
    return { action: "improve", reason: "Potential for value-add improvements" }
  }
  return { action: "hold", reason: "Performing within expectations" }
}

const actionColors = {
  hold: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  sell: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  improve: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
}

export default function InvestorPortfolioPage() {
  // In production, this would come from auth context
  const investorId = "inv-1"

  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [areaFilter, setAreaFilter] = React.useState<string>("all")
  const [sortOption, setSortOption] = React.useState<SortOption>("value-desc")

  const summary = React.useMemo(() => getPortfolioSummary(investorId), [investorId])
  const holdings = React.useMemo(() => getHoldingsForInvestor(investorId), [investorId])

  // Generate KPI data for the cards
  const kpiData: KPIData = React.useMemo(() => {
    // Generate value series (mock trend)
    const valueSeries = [
      { m: "Jan", v: Math.round(summary.totalPortfolioValue * 0.96) },
      { m: "Feb", v: Math.round(summary.totalPortfolioValue * 0.97) },
      { m: "Mar", v: Math.round(summary.totalPortfolioValue * 0.98) },
      { m: "Apr", v: Math.round(summary.totalPortfolioValue * 0.99) },
      { m: "May", v: Math.round(summary.totalPortfolioValue * 0.995) },
      { m: "Now", v: Math.round(summary.totalPortfolioValue) },
    ]

    // Generate income series
    const incomeSeries = [
      { m: "Jan", n: Math.round(summary.totalMonthlyRental * 0.92) },
      { m: "Feb", n: Math.round(summary.totalMonthlyRental * 0.95) },
      { m: "Mar", n: Math.round(summary.totalMonthlyRental * 0.97) },
      { m: "Apr", n: Math.round(summary.totalMonthlyRental * 0.98) },
      { m: "May", n: Math.round(summary.totalMonthlyRental * 0.99) },
      { m: "Now", n: Math.round(summary.totalMonthlyRental) },
    ]

    return {
      totalPortfolioValue: summary.totalPortfolioValue,
      appreciationPct: summary.appreciationPct,
      monthlyRentalIncome: summary.totalMonthlyRental,
      monthlyRentalTrend: 2.3, // Mock trend
      avgYieldPct: summary.avgYieldPct,
      occupancyPct: summary.occupancyPct,
      valueSeries,
      incomeSeries,
    }
  }, [summary])

  // Get unique areas and types from holdings
  const areas = React.useMemo(() => {
    const areaSet = new Set<string>()
    holdings.forEach((h) => {
      const p = getHoldingProperty(h)
      if (p?.area) areaSet.add(p.area)
    })
    return Array.from(areaSet).sort()
  }, [holdings])

  const types = React.useMemo(() => {
    const typeSet = new Set<string>()
    holdings.forEach((h) => {
      const p = getHoldingProperty(h)
      if (p?.type) typeSet.add(p.type)
    })
    return Array.from(typeSet).sort()
  }, [holdings])

  // Filter and sort holdings
  const filteredHoldings = React.useMemo(() => {
    let result = holdings.map((h) => ({
      holding: h,
      property: getHoldingProperty(h),
      yieldPct: calcYieldPct(h),
      appreciationPct: calcAppreciationPct(h),
      recommendation: getAIRecommendation(h),
    }))

    // Apply filters
    if (typeFilter !== "all") {
      result = result.filter((item) => item.property?.type === typeFilter)
    }
    if (areaFilter !== "all") {
      result = result.filter((item) => item.property?.area === areaFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case "value-desc":
          return b.holding.currentValue - a.holding.currentValue
        case "value-asc":
          return a.holding.currentValue - b.holding.currentValue
        case "yield-desc":
          return b.yieldPct - a.yieldPct
        case "yield-asc":
          return a.yieldPct - b.yieldPct
        case "appreciation-desc":
          return b.appreciationPct - a.appreciationPct
        case "appreciation-asc":
          return a.appreciationPct - b.appreciationPct
        default:
          return 0
      }
    })

    return result
  }, [holdings, typeFilter, areaFilter, sortOption])

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Portfolio Holdings</h1>
        <p className="text-sm sm:text-base text-gray-500">
          {summary.propertyCount} properties with AI insights
        </p>
      </div>

      {/* KPI Cards */}
      <PortfolioKPICards data={kpiData} />

      <Separator />

      {/* Filters and Sort - Mobile collapsible */}
      <div className="space-y-3">
        {/* Mobile: Stacked filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <Filter className="size-4 text-gray-500" />
            <span className="text-sm font-medium">Filter:</span>
          </div>

          {/* Filter row - stacks on mobile */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="flex-1 sm:w-[140px] min-h-[44px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize min-h-[44px]">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="flex-1 sm:w-[160px] min-h-[44px]">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area} value={area} className="min-h-[44px]">
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-sm text-gray-500 hidden sm:inline">Sort:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none min-h-[44px]">
                  <Filter className="size-4 sm:hidden" />
                  {sortOption.includes("desc") ? (
                    <ArrowDownAZ className="size-4 hidden sm:block" />
                  ) : (
                    <ArrowUpAZ className="size-4 hidden sm:block" />
                  )}
                  {sortOption.includes("value")
                    ? "Value"
                    : sortOption.includes("yield")
                      ? "Yield"
                      : "Gain"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                  <DropdownMenuRadioItem value="value-desc" className="min-h-[44px]">Value (High to Low)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="value-asc" className="min-h-[44px]">Value (Low to High)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="yield-desc" className="min-h-[44px]">Yield (High to Low)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="yield-asc" className="min-h-[44px]">Yield (Low to High)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="appreciation-desc" className="min-h-[44px]">Appreciation (High to Low)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="appreciation-asc" className="min-h-[44px]">Appreciation (Low to High)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Holdings Grid - Single column on mobile */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredHoldings.map(({ holding, property, yieldPct, appreciationPct, recommendation }) => (
          <Link key={holding.id} href={`/investor/portfolio/${holding.id}`}>
            <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/50 active:bg-muted/30 cursor-pointer h-full">
              {/* Property Image */}
              <div className="relative h-36 sm:h-40 overflow-hidden bg-muted">
                {property?.imageUrl ? (
                  <Image
                    src={property.imageUrl}
                    alt={property.title || "Property"}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Building2 className="size-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-semibold text-white truncate">
                    {property?.title || "Property"}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-white/80">
                    <MapPin className="size-3" />
                    {property?.area || "Unknown Area"}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn("absolute top-3 right-3", actionColors[recommendation.action])}
                >
                  <Sparkles className="mr-1 size-3" />
                  {recommendation.action.charAt(0).toUpperCase() + recommendation.action.slice(1)}
                </Badge>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs text-gray-500">Value</div>
                    <div className="text-sm font-semibold">{formatAED(holding.currentValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Yield</div>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      {yieldPct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Appreciation</div>
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-semibold",
                      appreciationPct >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {appreciationPct >= 0 ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {appreciationPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <Separator />

                {/* AI Insight */}
                <div className="flex items-start gap-2">
                  <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500">{recommendation.reason}</p>
                </div>

                {/* Additional Info */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{property?.type || "—"}</span>
                  <span>Occupancy: {(holding.occupancyRate * 100).toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredHoldings.length === 0 && (
        <Card className="p-8 sm:p-12 text-center">
          <Building2 className="mx-auto size-10 sm:size-12 text-gray-400" />
          <h3 className="mt-4 text-base sm:text-lg font-semibold">No holdings found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {typeFilter !== "all" || areaFilter !== "all"
              ? "Try adjusting your filters."
              : "New acquisitions will appear here."}
          </p>
        </Card>
      )}
    </div>
  )
}
