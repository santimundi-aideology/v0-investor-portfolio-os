"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { use } from "react"
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Calendar,
  Check,
  DollarSign,
  Download,
  Filter,
  Loader2,
  MapPin,
  Percent,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
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
import { cn } from "@/lib/utils"
import {
  calcAppreciationPct,
  calcYieldPct,
  formatAED,
} from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"
import type { Investor } from "@/lib/types"

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
  "Dubai Silicon Oasis", "Dubai South", "Al Quoz", "Expo City",
  "Arabian Ranches", "The Springs", "Jumeirah Islands", "The Meadows"
]

// Generate unique property name using seed
function generatePropertyName(seed: number, index: number): string {
  const prefix = BUILDING_PREFIXES[(seed + index * 7) % BUILDING_PREFIXES.length]
  const type = BUILDING_TYPES[(seed + index * 13) % BUILDING_TYPES.length]
  const unitNum = 100 + ((seed + index * 37) % 900) // Unit 100-999
  return `${prefix} ${type} #${unitNum}`
}

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

// Extended holding type with property details
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
  // Enhanced fields
  propertyName: string
  area: string
  imageUrl: string
  propertyType: string
  bedrooms: number
  size: number
}

// Generate mock historical data for charts
function generateValueHistory(holdings: EnhancedHolding[], range: TimeRange) {
  const monthsMap: Record<TimeRange, number> = { "3m": 3, "6m": 6, "1y": 12, "all": 24 }
  const months = monthsMap[range]
  const data = []
  
  const totalPurchase = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
  const totalCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const appreciationRate = totalPurchase > 0 ? (totalCurrent - totalPurchase) / totalPurchase / months : 0
  
  const now = new Date()
  for (let i = months; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    
    const currentValue = Math.round(totalPurchase * (1 + appreciationRate * (months - i)))
    const marketValue = Math.round(totalPurchase * (1 + appreciationRate * 0.8 * (months - i)))
    
    data.push({
      date: monthLabel,
      currentValue: totalPurchase > 0 ? currentValue : 0,
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
  
  const monthlyRent = holdings.reduce((sum, h) => sum + h.monthlyRent, 0)
  const avgOccupancy = holdings.length > 0 ? holdings.reduce((sum, h) => sum + h.occupancyRate, 0) / holdings.length : 0.9
  const monthlyExpenses = holdings.reduce((sum, h) => sum + h.annualExpenses / 12, 0)
  
  const now = new Date()
  for (let i = months; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    
    const variance = 0.95 + Math.random() * 0.1
    const occupancyVariance = Math.max(0.7, Math.min(1, avgOccupancy + (Math.random() - 0.5) * 0.15))
    
    const grossRent = Math.round(monthlyRent * variance)
    const expenses = Math.round(monthlyExpenses * (0.9 + Math.random() * 0.2))
    const netRent = Math.round((grossRent * occupancyVariance) - expenses)
    
    data.push({
      month: monthLabel,
      grossRent,
      expenses,
      netRent: Math.max(0, netRent),
      occupancyPct: Math.round(occupancyVariance * 100),
    })
  }
  
  return data
}

function generatePropertyComparison(holdings: EnhancedHolding[]) {
  return holdings.map((h) => {
    return {
      name: h.propertyName.length > 18 ? h.propertyName.substring(0, 18) + "..." : h.propertyName,
      yield: calcYieldPct(h),
      appreciation: calcAppreciationPct(h),
      occupancy: h.occupancyRate * 100,
    }
  })
}

export default function InvestorAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: investorId } = use(params)
  const [timeRange, setTimeRange] = React.useState<TimeRange>("1y")
  const [comparisonMetric, setComparisonMetric] = React.useState<"yield" | "appreciation" | "occupancy">("yield")

  // Fetch investor from API
  const { data: investor, isLoading: investorLoading } = useAPI<Investor>(`/api/investors/${investorId}`)

  // Fetch portfolio holdings from API
  const { data: portfolioData, isLoading: portfolioLoading } = useAPI<{
    summary: { propertyCount: number; totalValue: number; totalCost: number; appreciationPct: number; totalMonthlyIncome: number; netAnnualIncome: number; avgYieldPct: number; avgOccupancy: number }
    holdings: Array<{
      id: string; investorId: string; listingId: string;
      property: { title: string; area: string; type: string; imageUrl?: string; size?: number; bedrooms?: number } | null;
      financials: { purchasePrice: number; purchaseDate: string; currentValue: number; monthlyRent: number; occupancyRate: number; annualExpenses: number; appreciationPct: number; netYieldPct: number }
    }>
  }>(`/api/portfolio/${investorId}`)

  const isLoading = investorLoading || portfolioLoading

  // Map portfolio holdings to EnhancedHolding format
  const allHoldings: EnhancedHolding[] = React.useMemo(() => {
    if (!portfolioData?.holdings) return []
    const seed = investorId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)

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

  // Property selection state
  const [selectedPropertyIds, setSelectedPropertyIds] = React.useState<Set<string>>(new Set())
  const [propertyFilterOpen, setPropertyFilterOpen] = React.useState(false)
  
  // Filter holdings based on selection (show all if none selected)
  const holdings = React.useMemo(() => {
    if (selectedPropertyIds.size === 0) return allHoldings
    return allHoldings.filter(h => selectedPropertyIds.has(h.id))
  }, [allHoldings, selectedPropertyIds])

  const toggleProperty = (id: string) => {
    setSelectedPropertyIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAllProperties = () => {
    setSelectedPropertyIds(new Set(allHoldings.map(h => h.id)))
  }

  const clearPropertySelection = () => {
    setSelectedPropertyIds(new Set())
  }

  // Calculate summary from holdings (works for both mock and synthetic)
  const summary = React.useMemo(() => {
    if (holdings.length === 0) {
      return {
        totalPortfolioValue: 0,
        totalPurchaseCost: 0,
        totalMonthlyRental: 0,
        avgYieldPct: 0,
        occupancyPct: 0,
        appreciationPct: 0,
        propertyCount: 0,
      }
    }
    
    const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
    const totalPurchaseCost = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
    const totalMonthlyRental = holdings.reduce((sum, h) => sum + (h.monthlyRent * h.occupancyRate), 0)
    const totalAnnualExpenses = holdings.reduce((sum, h) => sum + h.annualExpenses, 0)
    const avgOccupancy = holdings.reduce((sum, h) => sum + h.occupancyRate, 0) / holdings.length
    
    const netAnnualRent = (totalMonthlyRental * 12) - totalAnnualExpenses
    const avgYieldPct = totalPortfolioValue > 0 ? (netAnnualRent / totalPortfolioValue) * 100 : 0
    const appreciationPct = totalPurchaseCost > 0 
      ? ((totalPortfolioValue - totalPurchaseCost) / totalPurchaseCost) * 100 
      : 0
    
    return {
      totalPortfolioValue,
      totalPurchaseCost,
      totalMonthlyRental,
      avgYieldPct,
      occupancyPct: avgOccupancy * 100,
      appreciationPct,
      propertyCount: holdings.length,
    }
  }, [holdings])

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
    const totalGross = rentalHistory.reduce((sum, r) => sum + r.grossRent, 0)
    const totalNet = rentalHistory.reduce((sum, r) => sum + r.netRent, 0)
    const totalExpenses = rentalHistory.reduce((sum, r) => sum + r.expenses, 0)
    const avgOccupancy = rentalHistory.length > 0 
      ? rentalHistory.reduce((sum, r) => sum + r.occupancyPct, 0) / rentalHistory.length 
      : 0
    
    const recent = rentalHistory.slice(-3)
    const previous = rentalHistory.slice(-6, -3)
    const recentAvg = recent.length > 0 ? recent.reduce((sum, r) => sum + r.netRent, 0) / recent.length : 0
    const previousAvg = previous.length > 0 
      ? previous.reduce((sum, r) => sum + r.netRent, 0) / previous.length 
      : recentAvg
    const trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
    
    return { totalGross, totalNet, totalExpenses, avgOccupancy, trend }
  }, [rentalHistory])

  const avgMetrics = React.useMemo(() => ({
    yield: propertyComparison.length > 0 
      ? propertyComparison.reduce((sum, p) => sum + p.yield, 0) / propertyComparison.length 
      : 0,
    appreciation: propertyComparison.length > 0 
      ? propertyComparison.reduce((sum, p) => sum + p.appreciation, 0) / propertyComparison.length 
      : 0,
    occupancy: propertyComparison.length > 0 
      ? propertyComparison.reduce((sum, p) => sum + p.occupancy, 0) / propertyComparison.length 
      : 0,
  }), [propertyComparison])

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 text-green-600 animate-spin" />
          <p className="mt-4 text-gray-500">Loading investor data...</p>
        </div>
      </div>
    )
  }

  if (!investor) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Building2 className="mx-auto size-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">Investor not found</h3>
          <p className="mt-2 text-gray-500">The investor you are looking for does not exist.</p>
          <Button asChild className="mt-4">
            <Link href="/investors">Back to Investors</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <span>Portfolio Analytics</span>
          </div>
        }
        subtitle={`${investor.name} • ${investor.company}`}
        badges={
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            {summary.propertyCount} Properties
          </Badge>
        }
        primaryAction={
          <Button variant="outline" asChild>
            <Link href={`/investors/${investorId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Investor
            </Link>
          </Button>
        }
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Property Filter */}
            <Sheet open={propertyFilterOpen} onOpenChange={setPropertyFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Properties
                  {selectedPropertyIds.size > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedPropertyIds.size}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Filter Properties</SheetTitle>
                  <SheetDescription>
                    Select properties to include in analytics. Clear selection to show all.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllProperties}>
                      <Check className="mr-1 h-3 w-3" />
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearPropertySelection}>
                      <X className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                    {allHoldings.map((h) => {
                      const appreciation = calcAppreciationPct(h)
                      const yieldPct = calcYieldPct(h)
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
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProperty(h.id)}
                            className="mt-1"
                          />
                          <div className="relative h-16 w-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                            <Image
                              src={h.imageUrl}
                              alt={h.propertyName}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{h.propertyName}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              {h.area}
                            </div>
                            <div className="mt-1 flex gap-2 text-xs">
                              <Badge variant="outline" className="text-xs">
                                {formatAED(h.currentValue)}
                              </Badge>
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                appreciation >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {appreciation >= 0 ? "+" : ""}{appreciation.toFixed(1)}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {yieldPct.toFixed(1)}% yield
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
        }
      />

      {/* Selected Properties Filter Bar */}
      {selectedPropertyIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Filter className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            Showing analytics for {selectedPropertyIds.size} selected {selectedPropertyIds.size === 1 ? "property" : "properties"}
          </span>
          <Button variant="ghost" size="sm" onClick={clearPropertySelection} className="ml-auto text-green-700 hover:text-green-800">
            <X className="mr-1 h-3 w-3" />
            Clear filter
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
          trend={summary.avgYieldPct - 5.5}
        />
        <KPICard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Avg Occupancy"
          value={`${rentalStats.avgOccupancy.toFixed(0)}%`}
          subtitle="Portfolio average"
          trend={rentalStats.avgOccupancy - 85}
        />
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="value" className="space-y-4">
        <TabsList>
          <TabsTrigger value="value">Value Appreciation</TabsTrigger>
          <TabsTrigger value="rental">Rental Income</TabsTrigger>
          <TabsTrigger value="comparison">Property Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="value" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
              <CardDescription>
                Track how the portfolio has appreciated compared to purchase cost
              </CardDescription>
            </CardHeader>
            <CardContent>
              {holdings.length > 0 ? (
                <ValueAppreciationChart data={valueHistory} showMarketIndex />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No holdings data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Value breakdown by property */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {holdings.slice(0, 9).map((h) => {
              const appreciation = calcAppreciationPct(h)
              const yieldPct = calcYieldPct(h)
              return (
                <Card key={h.id} className="hover:shadow-md transition-shadow overflow-hidden">
                  {/* Property Image */}
                  <div className="relative h-32 bg-gray-100">
                    <Image
                      src={h.imageUrl}
                      alt={h.propertyName}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Badge 
                      className={cn(
                        "absolute top-2 right-2",
                        appreciation >= 0 ? "bg-green-500" : "bg-red-500"
                      )}
                    >
                      {appreciation >= 0 ? "+" : ""}{appreciation.toFixed(1)}%
                    </Badge>
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="font-medium text-white truncate text-sm">{h.propertyName}</div>
                      <div className="flex items-center gap-1 text-xs text-white/80">
                        <MapPin className="h-3 w-3" />
                        {h.area}
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
                        <div className="text-xs text-gray-500">Purchase</div>
                        <div className="font-semibold">{formatAED(h.purchasePrice)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Yield</div>
                        <div className="font-semibold text-green-600">{yieldPct.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Occupancy</div>
                        <div className={cn(
                          "font-semibold",
                          h.occupancyRate >= 0.9 ? "text-green-600" : h.occupancyRate >= 0.75 ? "text-amber-600" : "text-red-600"
                        )}>
                          {(h.occupancyRate * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">{h.propertyType}</Badge>
                      {h.bedrooms > 0 && <Badge variant="outline" className="text-xs">{h.bedrooms} BR</Badge>}
                      <Badge variant="outline" className="text-xs">{h.size.toLocaleString()} sqft</Badge>
                    </div>
                  </CardContent>
                </Card>
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
              {holdings.length > 0 ? (
                <RentalIncomeChart data={rentalHistory} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No rental data available
                </div>
              )}
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
                  {rentalStats.totalGross > 0 ? ((rentalStats.totalExpenses / rentalStats.totalGross) * 100).toFixed(0) : 0}% of gross
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
                    {rentalStats.trend >= 0 ? "+" : ""}{rentalStats.trend.toFixed(1)}% vs previous
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Property Performance Comparison</CardTitle>
                  <CardDescription>
                    Compare {comparisonMetric} across all properties
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
              {propertyComparison.length > 0 ? (
                <PropertyComparisonChart
                  data={propertyComparison}
                  metric={comparisonMetric}
                  average={avgMetrics[comparisonMetric]}
                />
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  No properties to compare
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance table */}
          {holdings.length > 0 && (
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
                                  <Image
                                    src={h.imageUrl}
                                    alt={h.propertyName}
                                    fill
                                    className="object-cover"
                                  />
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
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
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
