"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  Filter,
  LineChart,
  MapPin,
  Percent,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RentalIncomeChart } from "@/components/charts/rental-income-chart"
import { PropertyComparisonChart } from "@/components/charts/property-comparison-chart"
import { ValueAppreciationChart } from "@/components/charts/value-appreciation-chart"
import { PortfolioForecastSection } from "@/components/investor/portfolio-forecast-section"
import { cn } from "@/lib/utils"
import {
  calcAppreciationPct,
  calcYieldPct,
  formatAED,
} from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import { Loader2 } from "lucide-react"
import {
  downloadAnalyticsExcelReport,
  type AnalyticsExportInput,
  type HoldingRow,
} from "@/lib/analytics-export-excel"

// Stable color palette for property comparison (same property = same color everywhere)
const PROPERTY_COLORS = [
  "#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899",
  "#06b6d4", "#84cc16", "#ef4444", "#6366f1", "#14b8a6",
]

function getPropertyColor(holdingId: string, allHoldings: { id: string }[]): string {
  const index = allHoldings.findIndex((h) => h.id === holdingId)
  return index >= 0 ? PROPERTY_COLORS[index % PROPERTY_COLORS.length] : "#9ca3af"
}

type TimeRange = "3m" | "6m" | "1y" | "all"

// Property name building components for diverse names
const BUILDING_PREFIXES = [
  "Marina", "Palm", "Downtown", "Creek", "Emirates", "Bay", "Beach", "Executive",
  "Hills", "Island", "City", "Royal", "Grand", "Elite", "Sunset", "Ocean", "Sky",
  "Golden", "Silver", "Azure", "Pearl", "Diamond", "Sapphire", "Crystal", "Emerald"
]

const BUILDING_TYPES = [
  "Tower", "Residences", "Heights", "Gardens", "Plaza", "Suites", "Penthouse", "Villa",
  "Apartments", "Estate", "Court", "Terrace", "Loft", "View", "Point", "Place"
]

const AREAS = [
  "Dubai Marina", "Palm Jumeirah", "Downtown Dubai", "Dubai Creek Harbour",
  "Emirates Hills", "Business Bay", "JBR", "DIFC",
  "Dubai Hills", "Bluewaters", "City Walk", "MBR City",
  "Al Barsha", "JVC", "Sports City", "Motor City",
  "Dubai Silicon Oasis", "Dubai South", "Al Quoz", "Expo City"
]

// Property images for display
const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
]

// Generate unique property name using seed
function generatePropertyName(seed: number, index: number): string {
  const prefix = BUILDING_PREFIXES[(seed + index * 7) % BUILDING_PREFIXES.length]
  const type = BUILDING_TYPES[(seed + index * 13) % BUILDING_TYPES.length]
  const unitNum = 100 + ((seed + index * 37) % 900)
  return `${prefix} ${type} #${unitNum}`
}

// Extended holding type
interface EnhancedHolding {
  id: string
  investorId: string
  propertyId: string
  purchasePrice: number
  purchaseDate: string
  currentValue: number
  monthlyRent: number
  occupancyRate: number
  annualExpenses: number
  propertyName: string
  area: string
  imageUrl: string
  propertyType: string
  bedrooms: number
  size: number
}

// Historical data projection — generates estimated values based on purchase price
// and current value. When real DLD transaction history is available, replace these
// functions with queries to the dld_transactions table for actual historical pricing.
function generateValueHistory(holdings: EnhancedHolding[], range: TimeRange) {
  const monthsMap: Record<TimeRange, number> = { "3m": 3, "6m": 6, "1y": 12, "all": 24 }
  const months = monthsMap[range]
  const data = []
  
  if (holdings.length === 0) return []
  
  const totalPurchase = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
  const totalCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const appreciationRate = totalPurchase > 0 ? (totalCurrent - totalPurchase) / totalPurchase / months : 0
  
  const now = new Date()
  for (let i = months; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    
    const progress = (months - i) / months
    const currentValue = Math.round(totalPurchase * (1 + appreciationRate * (months - i)))
    const marketValue = Math.round(totalPurchase * (1 + appreciationRate * 0.8 * (months - i)))
    
    data.push({
      date: monthLabel,
      currentValue,
      purchaseCost: Math.round(totalPurchase),
      marketIndex: marketValue,
    })
  }
  
  return data
}

function generateRentalHistory(holdings: EnhancedHolding[], range: TimeRange) {
  const monthsMap: Record<TimeRange, number> = { "3m": 3, "6m": 6, "1y": 12, "all": 24 }
  const months = monthsMap[range]
  const data = []
  
  if (holdings.length === 0) return []
  
  const monthlyRent = holdings.reduce((sum, h) => sum + h.monthlyRent, 0)
  const avgOccupancy = holdings.reduce((sum, h) => sum + h.occupancyRate, 0) / holdings.length
  const monthlyExpenses = holdings.reduce((sum, h) => sum + h.annualExpenses / 12, 0)
  
  // Deterministic pseudo-random variance seeded by month index — prevents chart
  // values from changing on every render while still looking realistic.
  function seededVariance(seed: number, min: number, range: number) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
    return min + (x - Math.floor(x)) * range
  }

  const now = new Date()
  for (let i = months; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })

    const variance = seededVariance(i, 0.95, 0.1)
    const occupancyVariance = Math.max(0.7, Math.min(1, avgOccupancy + seededVariance(i + 100, -0.075, 0.15)))

    const grossRent = Math.round(monthlyRent * variance)
    const expenses = Math.round(monthlyExpenses * seededVariance(i + 200, 0.9, 0.2))
    const netRent = Math.round((grossRent * occupancyVariance) - expenses)

    data.push({
      month: monthLabel,
      grossRent,
      expenses,
      netRent,
      occupancyPct: Math.round(occupancyVariance * 100),
    })
  }
  
  return data
}

function generatePropertyComparison(holdings: EnhancedHolding[]) {
  return holdings.map((h) => ({
    name: h.propertyName.length > 18 ? h.propertyName.substring(0, 18) + "..." : h.propertyName,
    yield: calcYieldPct(h),
    appreciation: calcAppreciationPct(h),
    occupancy: h.occupancyRate * 100,
  }))
}

export default function InvestorAnalyticsPage() {
  const { scopedInvestorId: investorId } = useApp()
  const [timeRange, setTimeRange] = React.useState<TimeRange>("1y")
  const [comparisonMetric, setComparisonMetric] = React.useState<"yield" | "appreciation" | "occupancy">("yield")
  const [selectedPropertyIds, setSelectedPropertyIds] = React.useState<Set<string>>(new Set())
  const [propertySelectorOpen, setPropertySelectorOpen] = React.useState(false)
  const [propertySearch, setPropertySearch] = React.useState("")
  const [highlightedPropertyId, setHighlightedPropertyId] = React.useState<string | null>(null)
  const [assetsOpen, setAssetsOpen] = React.useState(false)

  // Fetch portfolio from API
  const { data: portfolioData, isLoading } = useAPI<{
    summary: { propertyCount: number; totalValue: number; totalCost: number; appreciationPct: number; totalMonthlyIncome: number; netAnnualIncome: number; avgYieldPct: number; avgOccupancy: number }
    holdings: Array<{
      id: string; investorId: string; listingId: string;
      property: { title: string; area: string; type: string; imageUrl?: string; size?: number; bedrooms?: number } | null;
      financials: { purchasePrice: number; purchaseDate: string; currentValue: number; monthlyRent: number; occupancyRate: number; annualExpenses: number; appreciationPct: number; netYieldPct: number }
    }>
  }>(investorId ? `/api/portfolio/${investorId}` : null)

  const summary = React.useMemo(() => {
    const s = portfolioData?.summary
    return {
      totalPortfolioValue: s?.totalValue ?? 0,
      totalPurchaseCost: s?.totalCost ?? 0,
      totalMonthlyRental: s?.totalMonthlyIncome ?? 0,
      avgYieldPct: s?.avgYieldPct ?? 0,
      occupancyPct: s?.avgOccupancy ?? 0,
      appreciationPct: s?.appreciationPct ?? 0,
      propertyCount: s?.propertyCount ?? 0,
    }
  }, [portfolioData])

  // Map API holdings to EnhancedHolding
  const allHoldings: EnhancedHolding[] = React.useMemo(() => {
    if (!portfolioData?.holdings) return []
    const seed = (investorId ?? "").split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return portfolioData.holdings.map((h, i) => ({
      id: h.id,
      investorId: h.investorId,
      propertyId: h.listingId,
      purchasePrice: h.financials.purchasePrice,
      purchaseDate: h.financials.purchaseDate,
      currentValue: h.financials.currentValue,
      monthlyRent: h.financials.monthlyRent,
      occupancyRate: h.financials.occupancyRate,
      annualExpenses: h.financials.annualExpenses,
      propertyName: h.property?.title || generatePropertyName(seed, i),
      area: h.property?.area || AREAS[(seed + i * 11) % AREAS.length],
      imageUrl: h.property?.imageUrl || PROPERTY_IMAGES[(seed + i * 3) % PROPERTY_IMAGES.length],
      propertyType: h.property?.type || ["residential", "commercial", "mixed-use"][(seed + i) % 3],
      bedrooms: h.property?.bedrooms || 1 + ((seed + i * 5) % 4),
      size: h.property?.size || 800 + ((seed + i * 17) % 3000),
    }))
  }, [portfolioData, investorId])

  // Filter holdings based on selection
  const holdings = React.useMemo(() => {
    if (selectedPropertyIds.size === 0) return allHoldings
    return allHoldings.filter(h => selectedPropertyIds.has(h.id))
  }, [allHoldings, selectedPropertyIds])

  const toggleProperty = (id: string) => {
    setSelectedPropertyIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllProperties = () => setSelectedPropertyIds(new Set(allHoldings.map(h => h.id)))
  const clearPropertySelection = () => setSelectedPropertyIds(new Set())

  const valueHistory = React.useMemo(
    () => generateValueHistory(holdings, timeRange),
    [holdings, timeRange]
  )

  const rentalHistory = React.useMemo(
    () => generateRentalHistory(holdings, timeRange),
    [holdings, timeRange]
  )

  const propertyComparison = React.useMemo(
    () => generatePropertyComparison(holdings),
    [holdings]
  )

  // Calculate summary stats for rental income
  const rentalStats = React.useMemo(() => {
    if (rentalHistory.length === 0) {
      return { totalGross: 0, totalNet: 0, totalExpenses: 0, avgOccupancy: 0, trend: 0 }
    }
    const totalGross = rentalHistory.reduce((sum, r) => sum + r.grossRent, 0)
    const totalNet = rentalHistory.reduce((sum, r) => sum + r.netRent, 0)
    const totalExpenses = rentalHistory.reduce((sum, r) => sum + r.expenses, 0)
    const avgOccupancy = rentalHistory.reduce((sum, r) => sum + r.occupancyPct, 0) / rentalHistory.length
    
    // Calculate trend (last 3 months vs previous 3)
    const recent = rentalHistory.slice(-3)
    const previous = rentalHistory.slice(-6, -3)
    const recentAvg = recent.length > 0
      ? recent.reduce((sum, r) => sum + r.netRent, 0) / recent.length
      : 0
    const previousAvg = previous.length > 0 
      ? previous.reduce((sum, r) => sum + r.netRent, 0) / previous.length 
      : recentAvg
    const trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
    
    return { totalGross, totalNet, totalExpenses, avgOccupancy: Number.isFinite(avgOccupancy) ? avgOccupancy : 0, trend: Number.isFinite(trend) ? trend : 0 }
  }, [rentalHistory])

  // Calculate average metrics for comparison
  const avgMetrics = React.useMemo(() => {
    const len = propertyComparison.length || 1 // avoid division by zero
    return {
      yield: propertyComparison.reduce((sum, p) => sum + p.yield, 0) / len,
      appreciation: propertyComparison.reduce((sum, p) => sum + p.appreciation, 0) / len,
      occupancy: propertyComparison.reduce((sum, p) => sum + p.occupancy, 0) / len,
    }
  }, [propertyComparison])

  // Summary for displayed set only (when user selects a subset, KPIs reflect only those)
  const displayedSummary = React.useMemo(() => {
    if (holdings.length === 0) {
      return {
        totalPortfolioValue: 0,
        totalPurchaseCost: 0,
        appreciationPct: 0,
        totalMonthlyRental: 0,
        avgYieldPct: 0,
        occupancyPct: 0,
        propertyCount: 0,
      }
    }
    const totalPortfolioValue = holdings.reduce((s, h) => s + h.currentValue, 0)
    const totalPurchaseCost = holdings.reduce((s, h) => s + h.purchasePrice, 0)
    const appreciationPct = totalPurchaseCost > 0
      ? ((totalPortfolioValue - totalPurchaseCost) / totalPurchaseCost) * 100
      : 0
    const totalMonthlyRental = holdings.reduce((s, h) => s + h.monthlyRent, 0)
    const avgYieldPct = holdings.reduce((s, h) => s + calcYieldPct(h), 0) / holdings.length
    const occupancyPct = holdings.reduce((s, h) => s + h.occupancyRate * 100, 0) / holdings.length
    return {
      totalPortfolioValue,
      totalPurchaseCost,
      appreciationPct,
      totalMonthlyRental,
      avgYieldPct,
      occupancyPct,
      propertyCount: holdings.length,
    }
  }, [holdings])

  // Property colors for comparison chart (same order as propertyComparison / holdings)
  const propertyComparisonBarColors = React.useMemo(
    () => holdings.map((h) => getPropertyColor(h.id, allHoldings)),
    [holdings, allHoldings]
  )

  // Filter property list for selector search
  const filteredHoldingsForSelector = React.useMemo(() => {
    if (!propertySearch.trim()) return allHoldings
    const q = propertySearch.toLowerCase().trim()
    return allHoldings.filter(
      (h) =>
        h.propertyName.toLowerCase().includes(q) ||
        h.area.toLowerCase().includes(q)
    )
  }, [allHoldings, propertySearch])

  const [exportingExcel, setExportingExcel] = React.useState(false)

  const handleExportExcel = React.useCallback(async () => {
    setExportingExcel(true)
    try {
      const holdingRows: HoldingRow[] = holdings.map((h) => {
        const yieldPct = calcYieldPct(h)
        const appreciationPct = calcAppreciationPct(h)
        const monthlyNetRent = h.monthlyRent * h.occupancyRate - h.annualExpenses / 12
        return {
          id: h.id,
          propertyName: h.propertyName,
          area: h.area,
          currentValue: h.currentValue,
          purchasePrice: h.purchasePrice,
          purchaseDate: h.purchaseDate,
          monthlyRent: h.monthlyRent,
          occupancyRate: h.occupancyRate,
          annualExpenses: h.annualExpenses,
          yieldPct,
          appreciationPct,
          monthlyNetRent: Math.round(monthlyNetRent),
        }
      })
      const input: AnalyticsExportInput = {
        summary: {
          totalPortfolioValue: displayedSummary.totalPortfolioValue,
          totalPurchaseCost: displayedSummary.totalPurchaseCost,
          totalMonthlyRental: displayedSummary.totalMonthlyRental,
          avgYieldPct: displayedSummary.avgYieldPct,
          occupancyPct: displayedSummary.occupancyPct,
          appreciationPct: displayedSummary.appreciationPct,
          propertyCount: displayedSummary.propertyCount,
        },
        valueHistory,
        rentalHistory,
        propertyComparison,
        holdings: holdingRows,
        rentalStats: {
          totalGross: rentalStats.totalGross,
          totalNet: rentalStats.totalNet,
          totalExpenses: rentalStats.totalExpenses,
          avgOccupancy: rentalStats.avgOccupancy,
          trend: rentalStats.trend,
        },
        timeRange,
        formatAED,
      }
      await downloadAnalyticsExcelReport(input)
    } finally {
      setExportingExcel(false)
    }
  }, [
    holdings,
    displayedSummary,
    valueHistory,
    rentalHistory,
    propertyComparison,
    rentalStats,
    timeRange,
  ])

  if (isLoading || !portfolioData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background">
        <div className="relative py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Hero: green gradient (match Overview) */}
      <div
        className="relative -mx-4 -mt-4 min-h-[200px] overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mt-6"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(15,41,34,0.92) 0%, rgba(15,41,34,0.88) 50%, rgba(15,41,34,0.94) 100%), url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80')",
          backgroundSize: "115%",
          backgroundPosition: "center 40%",
          backgroundColor: "#0f2922",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />
        <div className="relative px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                <LineChart className="h-6 w-6 text-emerald-300" />
                Portfolio Analytics
              </h1>
              <p className="mt-1 text-sm text-white/80 sm:text-base">
                Track performance, rental income, and property trends
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary Properties selector (top, high visibility) */}
              <Popover open={propertySelectorOpen} onOpenChange={setPropertySelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className={cn(
                      "min-h-[44px] border-2 font-medium rounded-xl",
                      "bg-white/95 dark:bg-card border-emerald-200 dark:border-emerald-800",
                      "hover:bg-emerald-50 hover:border-emerald-300 dark:hover:border-emerald-700",
                      "shadow-sm text-foreground"
                    )}
                  >
                    <Filter className="mr-2 h-4 w-4 text-emerald-600" />
                    {selectedPropertyIds.size > 0 ? (
                      <>Selected ({selectedPropertyIds.size})</>
                    ) : (
                      <>Properties ({allHoldings.length})</>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] rounded-2xl border border-gray-200 shadow-xl p-0" align="end">
                  <div className="p-3 border-b border-gray-100 dark:border-border">
                    <p className="text-sm font-semibold text-foreground">Filter by property</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Select properties to include in all charts and tables</p>
                  </div>
                  <div className="p-2 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search properties..."
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                        className="pl-9 h-9 rounded-lg"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={selectAllProperties} className="shrink-0 rounded-lg">
                      <Check className="mr-1 h-3 w-3" /> All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearPropertySelection} className="shrink-0 rounded-lg">
                      <X className="mr-1 h-3 w-3" /> Clear
                    </Button>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
                    {filteredHoldingsForSelector.map((h) => {
                      const isSelected = selectedPropertyIds.has(h.id)
                      const color = getPropertyColor(h.id, allHoldings)
                      return (
                        <div
                          key={h.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleProperty(h.id)}
                          onKeyDown={(e) => e.key === "Enter" && toggleProperty(h.id)}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors",
                            isSelected ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40" : "hover:bg-muted/60 border-transparent"
                          )}
                        >
                          <Checkbox checked={isSelected} className="shrink-0" />
                          <div className="size-4 shrink-0 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{h.propertyName}</div>
                            <div className="text-xs text-muted-foreground truncate">{h.area}</div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">{formatAED(h.currentValue)}</Badge>
                        </div>
                      )
                    })}
                    {filteredHoldingsForSelector.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">No properties match your search</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger className="w-[120px] min-h-[44px] rounded-xl border-2 border-white/20 bg-white/90">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="default"
                onClick={handleExportExcel}
                disabled={exportingExcel}
                className="min-h-[44px] rounded-xl border-white/20 bg-white/90"
              >
                {exportingExcel ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar a Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full py-6">
        <div>
        </div>

        {/* Selected: X properties + Clear selection */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {selectedPropertyIds.size > 0 ? (
              <>Selected: {selectedPropertyIds.size} {selectedPropertyIds.size === 1 ? "property" : "properties"}</>
            ) : (
              <>All properties ({allHoldings.length})</>
            )}
          </span>
          {selectedPropertyIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearPropertySelection} className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50">
              <X className="mr-1 h-4 w-4" /> Clear selection
            </Button>
          )}
          {/* Property color legend (selected or all) */}
          {holdings.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {holdings.slice(0, 8).map((h) => {
                const color = getPropertyColor(h.id, allHoldings)
                const isHighlighted = highlightedPropertyId === h.id
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                      isHighlighted ? "ring-2 ring-offset-1 ring-foreground" : "border-gray-200 dark:border-border hover:bg-muted/50"
                    )}
                    onClick={() => setHighlightedPropertyId(highlightedPropertyId === h.id ? null : h.id)}
                    title={h.propertyName}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="max-w-[100px] truncate">{h.propertyName.length > 12 ? h.propertyName.slice(0, 12) + "…" : h.propertyName}</span>
                  </button>
                )
              })}
              {holdings.length > 8 && <span className="text-xs text-muted-foreground">+{holdings.length - 8} more</span>}
            </div>
          )}
        </div>

        {/* Data source notice */}
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-blue-200/80 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200">
          <LineChart className="h-4 w-4 shrink-0" />
          <span>
            Charts show projected trends based on purchase price and current valuation.
            Historical data will become more accurate as transaction records accumulate.
          </span>
        </div>

        {/* Summary KPIs — use displayed set only */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KPICard
            icon={<DollarSign className="h-4 w-4" />}
            title="Portfolio Value"
            value={formatAED(displayedSummary.totalPortfolioValue)}
            subtitle={`${displayedSummary.appreciationPct >= 0 ? "+" : ""}${displayedSummary.appreciationPct.toFixed(1)}% since purchase`}
            trend={displayedSummary.appreciationPct}
            premium
          />
          <KPICard
            icon={<Building2 className="h-4 w-4" />}
            title="Total Rental Income"
            value={formatAED(rentalStats.totalNet)}
            subtitle={`${timeRange === "all" ? "All time" : `Last ${timeRange}`} net income`}
            trend={rentalStats.trend}
            premium
          />
          <KPICard
            icon={<Percent className="h-4 w-4" />}
            title="Average Yield"
            value={`${displayedSummary.avgYieldPct.toFixed(2)}%`}
            subtitle={`Across ${displayedSummary.propertyCount} ${displayedSummary.propertyCount === 1 ? "property" : "properties"}`}
            trend={displayedSummary.avgYieldPct - 5.5}
            premium
          />
          <KPICard
            icon={<TrendingUp className="h-4 w-4" />}
            title="Avg Occupancy"
            value={`${rentalStats.avgOccupancy.toFixed(0)}%`}
            subtitle="Portfolio average"
            trend={rentalStats.avgOccupancy - 85}
            premium
          />
        </div>

        {/* All charts on one page */}
        <div className="space-y-6">
          {/* Portfolio Value Over Time */}
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Portfolio Value Over Time</CardTitle>
              <CardDescription>
                Track how your portfolio has appreciated compared to purchase cost and market index
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ValueAppreciationChart data={valueHistory} showMarketIndex />
            </CardContent>
          </Card>

          {/* View my assets - collapsible */}
          <Collapsible open={assetsOpen} onOpenChange={setAssetsOpen}>
            <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-6 py-5 hover:bg-muted/50 rounded-t-xl rounded-b-none border-0"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  View my assets
                </span>
                <span className="text-muted-foreground">
                  {holdings.length} {holdings.length === 1 ? "property" : "properties"}
                </span>
                {assetsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {holdings.map((h) => {
                    const appreciation = calcAppreciationPct(h)
                    const yieldPct = calcYieldPct(h)
                    const color = getPropertyColor(h.id, allHoldings)
                    return (
                      <Link key={h.id} href={`/investor/portfolio/${h.id}`}>
                        <Card
                          className={cn(
                            "hover:shadow-md transition-all cursor-pointer h-full overflow-hidden rounded-xl border-2",
                            highlightedPropertyId === h.id ? "ring-2 ring-offset-2 ring-emerald-500 border-emerald-200" : "border-gray-200/80"
                          )}
                          onMouseEnter={() => setHighlightedPropertyId(h.id)}
                          onMouseLeave={() => setHighlightedPropertyId(null)}
                        >
                          <div className="relative h-32 bg-gray-100">
                            <Image src={h.imageUrl} alt={h.propertyName} fill className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute top-2 left-2 size-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }} />
                            <Badge className={cn("absolute top-2 right-2", appreciation >= 0 ? "bg-green-500" : "bg-red-500")}>
                              {appreciation >= 0 ? "+" : ""}{appreciation.toFixed(1)}%
                            </Badge>
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="font-medium text-white truncate text-sm">{h.propertyName}</div>
                              <div className="flex items-center gap-1 text-xs text-white/80">
                                <MapPin className="h-3 w-3" />{h.area}
                              </div>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-gray-500">Current Value</div>
                                <div className="font-semibold">{formatAED(h.currentValue)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Yield</div>
                                <div className="font-semibold text-green-600">{yieldPct.toFixed(2)}%</div>
                              </div>
                            </div>
                            <div className="mt-2 flex gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize">{h.propertyType}</Badge>
                              {h.bedrooms > 0 && <Badge variant="outline" className="text-xs">{h.bedrooms} BR</Badge>}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

          {/* Rental Income */}
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Rental Income & Occupancy Trends</CardTitle>
              <CardDescription>
                Monthly gross rent, expenses, net income, and occupancy rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RentalIncomeChart data={rentalHistory} />
            </CardContent>
          </Card>

          {/* Rental summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Gross Rental Income</div>
                <div className="mt-1 text-2xl font-bold">{formatAED(rentalStats.totalGross)}</div>
                <div className="text-xs text-muted-foreground">Total for selected period</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Expenses</div>
                <div className="mt-1 text-2xl font-bold text-red-600">{formatAED(rentalStats.totalExpenses)}</div>
                <div className="text-xs text-gray-500">
                  {rentalStats.totalGross > 0
                    ? `${((rentalStats.totalExpenses / rentalStats.totalGross) * 100).toFixed(0)}% of gross`
                    : "N/A"}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Net Income</div>
                <div className="mt-1 text-2xl font-bold text-green-600">{formatAED(rentalStats.totalNet)}</div>
                <div className="flex items-center gap-1 text-xs">
                  {rentalStats.trend >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={rentalStats.trend >= 0 ? "text-green-600" : "text-red-600"}>
                    {rentalStats.trend >= 0 ? "+" : ""}{rentalStats.trend.toFixed(1)}% vs previous period
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-property rental breakdown */}
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Rental Performance by Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {holdings.map((h) => {
                  const monthlyNet = (h.monthlyRent * h.occupancyRate) - (h.annualExpenses / 12)
                  const color = getPropertyColor(h.id, allHoldings)
                  return (
                    <div
                      key={h.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-colors",
                        highlightedPropertyId === h.id ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-gray-100 dark:border-border hover:bg-muted/30"
                      )}
                      onMouseEnter={() => setHighlightedPropertyId(h.id)}
                      onMouseLeave={() => setHighlightedPropertyId(null)}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="size-3 shrink-0 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
                        <div>
                          <div className="font-medium truncate">{h.propertyName}</div>
                          <div className="text-xs text-muted-foreground">{h.area}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatAED(monthlyNet)}/mo</div>
                        <div className="text-xs text-gray-500">
                          Occupancy: {(h.occupancyRate * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Property Comparison */}
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Property Performance Comparison</CardTitle>
                  <CardDescription>
                    Compare {comparisonMetric} across {holdings.length} {holdings.length === 1 ? "property" : "properties"}
                  </CardDescription>
                </div>
                <Select value={comparisonMetric} onValueChange={(v) => setComparisonMetric(v as typeof comparisonMetric)}>
                  <SelectTrigger className="w-[140px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yield">Yield %</SelectItem>
                    <SelectItem value="appreciation">Appreciation %</SelectItem>
                    <SelectItem value="occupancy">Occupancy %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <PropertyComparisonChart
                data={propertyComparison}
                metric={comparisonMetric}
                average={avgMetrics[comparisonMetric]}
                barColors={propertyComparisonBarColors}
                activeIndex={highlightedPropertyId != null ? holdings.findIndex((h) => h.id === highlightedPropertyId) : undefined}
              />
            </CardContent>
          </Card>

          {/* Performance table */}
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Detailed Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-border">
                      <th className="text-left py-2 px-3 font-medium">Property</th>
                      <th className="text-right py-2 px-3 font-medium">Value</th>
                      <th className="text-right py-2 px-3 font-medium">Monthly Rent</th>
                      <th className="text-right py-2 px-3 font-medium">Yield</th>
                      <th className="text-right py-2 px-3 font-medium">Appreciation</th>
                      <th className="text-right py-2 px-3 font-medium">Occupancy</th>
                      <th className="text-right py-2 px-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => {
                      const yieldPct = calcYieldPct(h)
                      const appreciation = calcAppreciationPct(h)
                      const color = getPropertyColor(h.id, allHoldings)
                      return (
                        <tr
                          key={h.id}
                          className={cn(
                            "border-b border-gray-100 dark:border-border transition-colors",
                            highlightedPropertyId === h.id ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "hover:bg-muted/30"
                          )}
                          onMouseEnter={() => setHighlightedPropertyId(h.id)}
                          onMouseLeave={() => setHighlightedPropertyId(null)}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <span className="size-3 shrink-0 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
                              <div className="relative h-10 w-14 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                <Image src={h.imageUrl} alt={h.propertyName} fill className="object-cover" />
                              </div>
                              <div>
                                <div className="font-medium">{h.propertyName}</div>
                                <div className="text-xs text-muted-foreground">{h.area}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-3 px-3 font-medium">
                            {formatAED(h.currentValue)}
                          </td>
                          <td className="text-right py-3 px-3">
                            {formatAED(h.monthlyRent)}
                          </td>
                          <td className="text-right py-3 px-3">
                            <Badge variant="outline" className={cn(
                              yieldPct >= avgMetrics.yield ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {yieldPct.toFixed(2)}%
                            </Badge>
                          </td>
                          <td className="text-right py-3 px-3">
                            <span className={cn(
                              "flex items-center justify-end gap-1",
                              appreciation >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {appreciation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {appreciation >= 0 ? "+" : ""}{appreciation.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-right py-3 px-3">
                            <span className={cn(
                              h.occupancyRate >= 0.9 ? "text-green-600" : h.occupancyRate >= 0.75 ? "text-amber-600" : "text-red-600"
                            )}>
                              {(h.occupancyRate * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="text-right py-3 px-3">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/investor/portfolio/${h.id}`}>
                                <ArrowUpRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        {/* Forecast */}
        <PortfolioForecastSection />
        </div>
      </div>
    </div>
  )
}

function KPICard({
  icon,
  title,
  value,
  subtitle,
  trend,
  premium,
}: {
  icon: React.ReactNode
  title: string
  value: string
  subtitle: string
  trend?: number
  premium?: boolean
}) {
  const isPositive = (trend ?? 0) >= 0

  return (
    <Card className={cn(premium && "rounded-2xl border border-gray-200/80 shadow-sm dark:border-border bg-white dark:bg-card")}>
      <CardContent className={cn("p-4", premium && "p-5")}>
        <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", premium && "text-xs font-medium uppercase tracking-wider")}>
          {icon}
          {title}
        </div>
        <div className={cn("mt-2 font-bold tabular-nums", premium ? "text-2xl sm:text-3xl" : "text-2xl")}>
          {value}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {trend !== undefined && (
            <span className={cn(
              "flex items-center gap-0.5 shrink-0",
              isPositive ? "text-emerald-600" : "text-red-600"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            </span>
          )}
          <span className="text-muted-foreground truncate">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  )
}
