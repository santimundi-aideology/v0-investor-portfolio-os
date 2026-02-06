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
  BarChart3,
  Loader2,
  AlertCircle,
  DollarSign,
  Percent,
  Home,
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
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type SortOption = "value-desc" | "value-asc" | "yield-desc" | "yield-asc" | "appreciation-desc" | "appreciation-asc"

type EnrichedHolding = {
  id: string
  investorId: string
  listingId: string
  property: {
    title: string
    area: string
    type: string
    imageUrl?: string
    size?: number
    bedrooms?: number
    bathrooms?: number
  } | null
  financials: {
    purchasePrice: number
    purchaseDate: string
    currentValue: number
    monthlyRent: number
    occupancyRate: number
    annualExpenses: number
    appreciationPct: number
    netYieldPct: number
    grossYieldPct: number
    netAnnualRent: number
    totalReturn: number
  }
  marketData: {
    dldMedianPrice: number | null
    dldMedianPsm: number | null
    priceVsMarketPct: number | null
    comparableCount: number
    areaTransactionCount: number
    monthlyTrends: { month: string; avgPrice: number; volume: number }[]
    marketYield: number | null
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
  dataSource: string
}

function formatAED(amount: number): string {
  if (amount >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `AED ${(amount / 1_000).toFixed(0)}K`
  return `AED ${amount.toLocaleString()}`
}

function getAIRecommendation(holding: EnrichedHolding): { action: "hold" | "sell" | "improve"; reason: string } {
  const { appreciationPct, netYieldPct, occupancyRate } = holding.financials
  const { priceVsMarketPct } = holding.marketData

  // If we have market data, use it for smarter recommendations
  if (priceVsMarketPct !== null) {
    if (priceVsMarketPct > 15 && appreciationPct > 20) {
      return { action: "sell", reason: `${Math.abs(priceVsMarketPct).toFixed(0)}% above market median — consider locking in gains` }
    }
    if (priceVsMarketPct < -10 && netYieldPct > 7) {
      return { action: "hold", reason: `Below market price with strong ${netYieldPct.toFixed(1)}% yield` }
    }
  }

  if (appreciationPct > 15 && netYieldPct < 6) {
    return { action: "sell", reason: "High appreciation, consider taking profits" }
  }
  if (netYieldPct > 9 && occupancyRate > 0.95) {
    return { action: "hold", reason: "Strong yield with stable occupancy" }
  }
  if (occupancyRate < 0.85 || netYieldPct < 6) {
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
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [summary, setSummary] = React.useState<PortfolioSummary | null>(null)
  const [holdings, setHoldings] = React.useState<EnrichedHolding[]>([])

  React.useEffect(() => {
    async function fetchPortfolio() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/portfolio/${investorId}`)
        if (!res.ok) throw new Error("Failed to load portfolio")
        const data = await res.json()
        setSummary(data.summary)
        setHoldings(data.holdings)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load portfolio")
      } finally {
        setLoading(false)
      }
    }
    fetchPortfolio()
  }, [investorId])

  // Get unique areas and types from holdings
  const areas = React.useMemo(() => {
    const areaSet = new Set<string>()
    holdings.forEach((h) => {
      if (h.property?.area) areaSet.add(h.property.area)
    })
    return Array.from(areaSet).sort()
  }, [holdings])

  const types = React.useMemo(() => {
    const typeSet = new Set<string>()
    holdings.forEach((h) => {
      if (h.property?.type) typeSet.add(h.property.type)
    })
    return Array.from(typeSet).sort()
  }, [holdings])

  // Filter and sort holdings
  const filteredHoldings = React.useMemo(() => {
    let result = holdings.map((h) => ({
      holding: h,
      recommendation: getAIRecommendation(h),
    }))

    if (typeFilter !== "all") {
      result = result.filter((item) => item.holding.property?.type === typeFilter)
    }
    if (areaFilter !== "all") {
      result = result.filter((item) => item.holding.property?.area === areaFilter)
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case "value-desc":
          return b.holding.financials.currentValue - a.holding.financials.currentValue
        case "value-asc":
          return a.holding.financials.currentValue - b.holding.financials.currentValue
        case "yield-desc":
          return b.holding.financials.netYieldPct - a.holding.financials.netYieldPct
        case "yield-asc":
          return a.holding.financials.netYieldPct - b.holding.financials.netYieldPct
        case "appreciation-desc":
          return b.holding.financials.appreciationPct - a.holding.financials.appreciationPct
        case "appreciation-asc":
          return a.holding.financials.appreciationPct - b.holding.financials.appreciationPct
        default:
          return 0
      }
    })

    return result
  }, [holdings, typeFilter, areaFilter, sortOption])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading portfolio with market data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Portfolio Holdings</h1>
          <p className="text-sm sm:text-base text-gray-500">
            {summary.propertyCount} properties with live market data
            {summary.dataSource === "mock" && (
              <Badge variant="outline" className="ml-2 text-xs">Demo Data</Badge>
            )}
          </p>
        </div>
      </div>

      {/* KPI Cards - Enhanced with real data */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Portfolio Value</p>
                <p className="text-2xl font-bold mt-1">{formatAED(summary.totalValue)}</p>
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  summary.appreciationPct >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {summary.appreciationPct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {summary.appreciationPct >= 0 ? "+" : ""}{summary.appreciationPct}% from cost
                </div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <DollarSign className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Income</p>
                <p className="text-2xl font-bold mt-1">{formatAED(summary.totalMonthlyIncome)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatAED(summary.netAnnualIncome)}/year net
                </p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <BarChart3 className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Net Yield</p>
                <p className="text-2xl font-bold mt-1">{summary.avgYieldPct}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After expenses
                </p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Percent className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Occupancy</p>
                <p className="text-2xl font-bold mt-1">{summary.avgOccupancy}%</p>
                <Progress value={summary.avgOccupancy} className="mt-2 h-1.5" />
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3">
                <Home className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Filters and Sort */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <Filter className="size-4 text-gray-500" />
            <span className="text-sm font-medium">Filter:</span>
          </div>

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

      {/* Holdings Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredHoldings.map(({ holding, recommendation }) => (
          <Link key={holding.id} href={`/investor/portfolio/${holding.id}`}>
            <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/50 active:bg-muted/30 cursor-pointer h-full">
              {/* Property Image */}
              <div className="relative h-36 sm:h-40 overflow-hidden bg-muted">
                {holding.property?.imageUrl ? (
                  <Image
                    src={holding.property.imageUrl}
                    alt={holding.property.title || "Property"}
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
                    {holding.property?.title || "Property"}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-white/80">
                    <MapPin className="size-3" />
                    {holding.property?.area || "Unknown Area"}
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
                    <div className="text-sm font-semibold">{formatAED(holding.financials.currentValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Net Yield</div>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      {holding.financials.netYieldPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Appreciation</div>
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-semibold",
                      holding.financials.appreciationPct >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {holding.financials.appreciationPct >= 0 ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {holding.financials.appreciationPct}%
                    </div>
                  </div>
                </div>

                {/* DLD Market Comparison */}
                {holding.marketData.dldMedianPrice && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-3.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">vs DLD Market</span>
                          <span className={cn(
                            "font-medium",
                            holding.marketData.priceVsMarketPct && holding.marketData.priceVsMarketPct > 0
                              ? "text-amber-600"
                              : "text-emerald-600"
                          )}>
                            {holding.marketData.priceVsMarketPct
                              ? `${holding.marketData.priceVsMarketPct > 0 ? "+" : ""}${holding.marketData.priceVsMarketPct.toFixed(1)}%`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {holding.marketData.comparableCount} comparables
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* AI Insight */}
                <div className="flex items-start gap-2">
                  <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500 line-clamp-2">{recommendation.reason}</p>
                </div>

                {/* Additional Info */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{holding.property?.type || "—"}</span>
                  <span>Occupancy: {(holding.financials.occupancyRate * 100).toFixed(0)}%</span>
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
