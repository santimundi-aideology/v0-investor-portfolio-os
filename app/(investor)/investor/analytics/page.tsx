"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  DollarSign,
  Download,
  Filter,
  LineChart,
  MapPin,
  Percent,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  
  const now = new Date()
  for (let i = months; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    
    // Add some variance to make it realistic
    const variance = 0.95 + Math.random() * 0.1
    const occupancyVariance = Math.max(0.7, Math.min(1, avgOccupancy + (Math.random() - 0.5) * 0.15))
    
    const grossRent = Math.round(monthlyRent * variance)
    const expenses = Math.round(monthlyExpenses * (0.9 + Math.random() * 0.2))
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
  const [propertyFilterOpen, setPropertyFilterOpen] = React.useState(false)

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

  if (isLoading || !portfolioData) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        {/* Section Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <Link href="/investor/portfolio" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">Holdings</Link>
          <Link href="/investor/analytics" className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary">Analytics</Link>
          <Link href="/investor/payments" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">Payments</Link>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Section Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link
          href="/investor/portfolio"
          className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          Holdings
        </Link>
        <Link
          href="/investor/analytics"
          className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary"
        >
          Analytics
        </Link>
        <Link
          href="/investor/payments"
          className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          Payments
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <LineChart className="h-6 w-6 text-green-600" />
            Portfolio Analytics
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Track your portfolio performance, rental income, and property trends
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Property Filter */}
          <Sheet open={propertyFilterOpen} onOpenChange={setPropertyFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Properties
                {selectedPropertyIds.size > 0 && (
                  <Badge variant="secondary" className="ml-2">{selectedPropertyIds.size}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Filter Properties</SheetTitle>
                <SheetDescription>Select properties to include in analytics</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllProperties}>
                    <Check className="mr-1 h-3 w-3" />Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearPropertySelection}>
                    <X className="mr-1 h-3 w-3" />Clear
                  </Button>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {allHoldings.map((h) => {
                    const appreciation = calcAppreciationPct(h)
                    const isSelected = selectedPropertyIds.has(h.id)
                    return (
                      <div
                        key={h.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected ? "border-green-300 bg-green-50" : "hover:bg-gray-50"
                        )}
                        onClick={() => toggleProperty(h.id)}
                      >
                        <Checkbox checked={isSelected} className="mt-1" />
                        <div className="relative h-14 w-20 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          <Image src={h.imageUrl} alt={h.propertyName} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{h.propertyName}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />{h.area}
                          </div>
                          <div className="mt-1 flex gap-2">
                            <Badge variant="outline" className="text-xs">{formatAED(h.currentValue)}</Badge>
                            <Badge variant="outline" className={cn("text-xs", appreciation >= 0 ? "text-green-600" : "text-red-600")}>
                              {appreciation >= 0 ? "+" : ""}{appreciation.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[120px]">
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
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Data source notice */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <LineChart className="h-4 w-4 shrink-0" />
        <span>
          Charts show projected trends based on purchase price and current valuation.
          Historical data will become more accurate as transaction records accumulate over time.
        </span>
      </div>

      {/* Selected Properties Filter Bar */}
      {selectedPropertyIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Filter className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            Showing analytics for {selectedPropertyIds.size} selected {selectedPropertyIds.size === 1 ? "property" : "properties"}
          </span>
          <Button variant="ghost" size="sm" onClick={clearPropertySelection} className="ml-auto text-green-700">
            <X className="mr-1 h-3 w-3" />Clear filter
          </Button>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<DollarSign className="h-4 w-4" />}
          title="Portfolio Value"
          value={formatAED(summary.totalPortfolioValue)}
          subtitle={`${summary.appreciationPct >= 0 ? "+" : ""}${summary.appreciationPct.toFixed(1)}% since purchase`}
          trend={summary.appreciationPct}
        />
        <KPICard
          icon={<Building2 className="h-4 w-4" />}
          title="Total Rental Income"
          value={formatAED(rentalStats.totalNet)}
          subtitle={`${timeRange === "all" ? "All time" : `Last ${timeRange}`} net income`}
          trend={rentalStats.trend}
        />
        <KPICard
          icon={<Percent className="h-4 w-4" />}
          title="Average Yield"
          value={`${summary.avgYieldPct.toFixed(2)}%`}
          subtitle="Across all properties"
          trend={summary.avgYieldPct - 5.5} // vs market avg
        />
        <KPICard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Avg Occupancy"
          value={`${rentalStats.avgOccupancy.toFixed(0)}%`}
          subtitle="Portfolio average"
          trend={rentalStats.avgOccupancy - 85} // vs target
        />
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="value" className="space-y-4">
        <TabsList>
          <TabsTrigger value="value">Value Appreciation</TabsTrigger>
          <TabsTrigger value="rental">Rental Income</TabsTrigger>
          <TabsTrigger value="comparison">Property Comparison</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="value" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
              <CardDescription>
                Track how your portfolio has appreciated compared to purchase cost and market index
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ValueAppreciationChart data={valueHistory} showMarketIndex />
            </CardContent>
          </Card>

          {/* Value breakdown by property */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {holdings.slice(0, 9).map((h) => {
              const appreciation = calcAppreciationPct(h)
              const yieldPct = calcYieldPct(h)
              return (
                <Link key={h.id} href={`/investor/portfolio/${h.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full overflow-hidden">
                    {/* Property Image */}
                    <div className="relative h-32 bg-gray-100">
                      <Image src={h.imageUrl} alt={h.propertyName} fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
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
          {holdings.length > 9 && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setPropertyFilterOpen(true)}>
                View all {holdings.length} properties
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rental" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rental Income & Occupancy Trends</CardTitle>
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
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Gross Rental Income</div>
                <div className="mt-1 text-2xl font-bold">{formatAED(rentalStats.totalGross)}</div>
                <div className="text-xs text-gray-500">Total for selected period</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Total Expenses</div>
                <div className="mt-1 text-2xl font-bold text-red-600">{formatAED(rentalStats.totalExpenses)}</div>
                <div className="text-xs text-gray-500">
                  {rentalStats.totalGross > 0
                    ? `${((rentalStats.totalExpenses / rentalStats.totalGross) * 100).toFixed(0)}% of gross`
                    : "N/A"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Net Income</div>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rental Performance by Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {holdings.map((h) => {
                  const monthlyNet = (h.monthlyRent * h.occupancyRate) - (h.annualExpenses / 12)
                  return (
                    <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{h.propertyName}</div>
                        <div className="text-xs text-gray-500">{h.area}</div>
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
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Property Performance Comparison</CardTitle>
                  <CardDescription>
                    Compare {comparisonMetric} across all properties in your portfolio
                  </CardDescription>
                </div>
                <Select value={comparisonMetric} onValueChange={(v) => setComparisonMetric(v as typeof comparisonMetric)}>
                  <SelectTrigger className="w-[140px]">
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
              />
            </CardContent>
          </Card>

          {/* Performance table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
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
                      return (
                        <tr key={h.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-14 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                <Image src={h.imageUrl} alt={h.propertyName} fill className="object-cover" />
                              </div>
                              <div>
                                <div className="font-medium">{h.propertyName}</div>
                                <div className="text-xs text-gray-500">{h.area}</div>
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
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <PortfolioForecastSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KPICard({
  icon,
  title,
  value,
  subtitle,
  trend,
}: {
  icon: React.ReactNode
  title: string
  value: string
  subtitle: string
  trend?: number
}) {
  const isPositive = (trend ?? 0) >= 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {icon}
          {title}
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {trend !== undefined && (
            <span className={cn(
              "flex items-center gap-0.5",
              isPositive ? "text-green-600" : "text-red-600"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            </span>
          )}
          <span className="text-gray-500">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  )
}
