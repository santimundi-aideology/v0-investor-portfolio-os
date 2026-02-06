"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  FileText,
  Loader2,
  MapPin,
  Minus,
  Printer,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  LayoutGrid,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts"

interface AreaOption {
  area: string
  txn_count: number
}

interface AreaBreakdown {
  area: string
  total_txns: number
  avg_price: number
  median_price: number
  avg_psm: number
  median_psm: number
  total_volume: number
  latest_transaction: string
  recent_avg_psm: number | null
  prev_avg_psm: number | null
  price_change_pct: number | null
  active_listings: number | null
  for_sale: number | null
  for_rent: number | null
  portal_avg_sale: number | null
  portal_avg_rent: number | null
  estimated_yield: number | null
}

interface ReportData {
  area: string
  generatedAt: string
  stats: Record<string, number>
  monthlyTrends: Array<Record<string, unknown>>
  propertyTypes: Array<Record<string, unknown>>
  recentTransactions: Array<Record<string, unknown>>
  supplyAnalysis: {
    totalActive: number
    forSale: number
    forRent: number
    avgAskingPrice: number
    avgRent: number
    avgDaysOnMarket: number
  }
  estimatedYield: number | null
  priceTrend: string
  signals: Array<{ id: string; type: string; severity: string; confidence: number; createdAt: string }>
}

function formatAED(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(value) >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${Math.round(value).toLocaleString()}`
}

function formatMonth(month: string): string {
  const [, m] = month.split("-")
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return months[parseInt(m)] || m
}

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

export default function MarketReportPage() {
  const [areas, setAreas] = React.useState<AreaOption[]>([])
  const [selectedArea, setSelectedArea] = React.useState<string | null>(null)
  const [report, setReport] = React.useState<ReportData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [areasLoading, setAreasLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const reportRef = React.useRef<HTMLDivElement>(null)
  
  // Area breakdown state
  const [viewMode, setViewMode] = React.useState<"selector" | "breakdown">("selector")
  const [allAreasData, setAllAreasData] = React.useState<AreaBreakdown[]>([])
  const [allAreasLoading, setAllAreasLoading] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof AreaBreakdown; direction: "asc" | "desc" }>({
    key: "total_txns",
    direction: "desc",
  })

  // Load areas
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/market-report/areas")
        const data = await res.json()
        setAreas(data.areas || [])
      } catch {
        console.error("Failed to load areas")
      } finally {
        setAreasLoading(false)
      }
    }
    load()
  }, [])

  const generateReport = async (area: string) => {
    setSelectedArea(area)
    setLoading(true)
    setReport(null)
    setViewMode("selector")
    try {
      const res = await fetch(`/api/market-report?area=${encodeURIComponent(area)}`)
      const data = await res.json()
      setReport(data)
    } catch (err) {
      console.error("Failed to generate report:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadAllAreasBreakdown = async () => {
    setViewMode("breakdown")
    setAllAreasLoading(true)
    try {
      const res = await fetch("/api/market-report/all-areas")
      const data = await res.json()
      setAllAreasData(data.areas || [])
    } catch (err) {
      console.error("Failed to load area breakdown:", err)
    } finally {
      setAllAreasLoading(false)
    }
  }

  const handleSort = (key: keyof AreaBreakdown) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handlePrint = () => {
    window.print()
  }

  const filteredAreas = areas.filter((a) =>
    a.area.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedAreasData = React.useMemo(() => {
    if (allAreasData.length === 0) return []
    const sorted = [...allAreasData].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      if (aVal === null) return 1
      if (bVal === null) return -1
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const numA = Number(aVal)
      const numB = Number(bVal)
      return sortConfig.direction === "asc" ? numA - numB : numB - numA
    })
    return sorted
  }, [allAreasData, sortConfig])

  const trendIcon = report?.priceTrend === "rising"
    ? <TrendingUp className="h-4 w-4 text-green-500" />
    : report?.priceTrend === "declining"
    ? <TrendingDown className="h-4 w-4 text-red-500" />
    : <Minus className="h-4 w-4 text-gray-400" />

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-white to-green-50 border border-gray-100 p-8 shadow-sm print:hidden">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg">
                <FileText className="size-6" />
              </span>
              <span className="text-3xl font-bold text-gray-900">Market Report Generator</span>
            </span>
          }
          subtitle="Select any Dubai area to instantly generate a comprehensive market intelligence report with DLD transaction data."
          badges={
            <>
              <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">One-Click</Badge>
              <Badge variant="outline" className="bg-white/80 backdrop-blur-sm gap-2 border-blue-200 text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                DLD Data
              </Badge>
            </>
          }
        />
        
        {/* View Mode Toggle */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={viewMode === "selector" && !report ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("selector")
              setReport(null)
            }}
          >
            <Search className="h-4 w-4 mr-2" />
            Area Selector
          </Button>
          <Button
            variant={viewMode === "breakdown" ? "default" : "outline"}
            size="sm"
            onClick={loadAllAreasBreakdown}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            All Areas Breakdown
          </Button>
        </div>
      </div>

      {/* Area Breakdown View */}
      {viewMode === "breakdown" && !report && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-blue-500" />
              Dubai Areas - Comprehensive Breakdown
            </CardTitle>
            <CardDescription>
              Compare key metrics across all Dubai areas. Click any area to generate a detailed report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allAreasLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left p-3 font-semibold text-gray-700">
                        <button
                          className="flex items-center gap-1 hover:text-blue-600"
                          onClick={() => handleSort("area")}
                        >
                          Area
                          {sortConfig.key === "area" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-3 font-semibold text-gray-700">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-blue-600"
                          onClick={() => handleSort("total_txns")}
                        >
                          Transactions
                          {sortConfig.key === "total_txns" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-3 font-semibold text-gray-700">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-blue-600"
                          onClick={() => handleSort("median_price")}
                        >
                          Median Price
                          {sortConfig.key === "median_price" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-3 font-semibold text-gray-700">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-blue-600"
                          onClick={() => handleSort("avg_psm")}
                        >
                          Avg PSM
                          {sortConfig.key === "avg_psm" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-3 font-semibold text-gray-700">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-blue-600"
                          onClick={() => handleSort("price_change_pct")}
                        >
                          3M Trend
                          {sortConfig.key === "price_change_pct" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-3 font-semibold text-gray-700">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-blue-600"
                          onClick={() => handleSort("estimated_yield")}
                        >
                          Est. Yield
                          {sortConfig.key === "estimated_yield" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-3 font-semibold text-gray-700">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-blue-600"
                          onClick={() => handleSort("active_listings")}
                        >
                          Active Listings
                          {sortConfig.key === "active_listings" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-3 font-semibold text-gray-700">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-blue-600"
                          onClick={() => handleSort("total_volume")}
                        >
                          Total Volume
                          {sortConfig.key === "total_volume" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-center p-3 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAreasData.map((area, i) => {
                      const trendColor = 
                        area.price_change_pct === null ? "text-gray-400" :
                        area.price_change_pct > 5 ? "text-green-600" :
                        area.price_change_pct < -5 ? "text-red-600" :
                        "text-gray-600"
                      
                      return (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{area.area}</td>
                          <td className="p-3 text-right text-gray-600">{area.total_txns.toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold">{formatAED(area.median_price)}</td>
                          <td className="p-3 text-right text-gray-600">
                            {area.avg_psm > 0 ? `AED ${area.avg_psm.toLocaleString()}` : "—"}
                          </td>
                          <td className={cn("p-3 text-right font-medium", trendColor)}>
                            <span className="flex items-center justify-end gap-1">
                              {area.price_change_pct === null ? "—" : 
                                <>
                                  {area.price_change_pct > 0 ? <ArrowUp className="h-3 w-3" /> : area.price_change_pct < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                                  {Math.abs(area.price_change_pct).toFixed(1)}%
                                </>
                              }
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium text-green-600">
                            {area.estimated_yield ? `${area.estimated_yield}%` : "—"}
                          </td>
                          <td className="p-3 text-right text-gray-600">
                            {area.active_listings || "—"}
                          </td>
                          <td className="p-3 text-right text-gray-600">{formatAED(area.total_volume)}</td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => generateReport(area.area)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Report
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                
                {sortedAreasData.length === 0 && !allAreasLoading && (
                  <div className="text-center py-12 text-gray-500">
                    No area data available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Area Selector */}
      {viewMode === "selector" && !report && (
        <Card className="border-gray-200 shadow-sm print:hidden">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              Select Area
            </CardTitle>
            <CardDescription>Choose an area to generate a market report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {areasLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {filteredAreas.map((area, i) => (
                  <motion.button
                    key={area.area}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => generateReport(area.area)}
                    disabled={loading}
                    className={cn(
                      "p-4 rounded-xl border border-gray-100 bg-white text-left",
                      "hover:border-blue-200 hover:shadow-md transition-all",
                      "flex items-center justify-between group"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{area.area}</p>
                      <p className="text-xs text-gray-500">{area.txn_count.toLocaleString()} transactions</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </motion.button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-4"
            >
              <Sparkles className="h-12 w-12 text-blue-500" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Generating Market Report</h3>
            <p className="text-gray-500">Analyzing DLD transactions for {selectedArea}...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Content */}
      {report && !loading && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 p-8 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white border-white/30 mb-3">Market Intelligence Report</Badge>
                    <h1 className="text-3xl font-bold mb-2">{report.area}</h1>
                    <p className="text-white/70 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Generated {new Date(report.generatedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 print:hidden">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handlePrint}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setReport(null)}>
                      Generate Another
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Key Metrics */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Transactions", value: report.stats.total_transactions?.toLocaleString() || "0", icon: BarChart3, color: "text-blue-500" },
                { label: "Total Volume", value: formatAED(Number(report.stats.total_volume || 0)), icon: DollarSign, color: "text-green-500" },
                { label: "Median Price", value: formatAED(Number(report.stats.median_price || 0)), icon: Building2, color: "text-purple-500" },
                { label: "Avg PSM", value: `AED ${Number(report.stats.avg_psm || 0).toLocaleString()}/m²`, icon: MapPin, color: "text-amber-500" },
              ].map((metric) => {
                const Icon = metric.icon
                return (
                  <Card key={metric.label} className="border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn("h-4 w-4", metric.color)} />
                        <span className="text-xs font-medium text-gray-500">{metric.label}</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{metric.value}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </motion.div>

          {/* Market Trend + Yield */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-gray-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Price Trend</p>
                      <div className="flex items-center gap-2">
                        {trendIcon}
                        <span className="text-lg font-bold text-gray-900 capitalize">{report.priceTrend}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      report.priceTrend === "rising" ? "border-green-200 text-green-700" :
                      report.priceTrend === "declining" ? "border-red-200 text-red-700" :
                      "border-gray-200 text-gray-700"
                    )}>
                      {report.priceTrend === "rising" ? "Bullish" : report.priceTrend === "declining" ? "Bearish" : "Neutral"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              {report.estimatedYield && (
                <Card className="border-gray-200">
                  <CardContent className="p-5">
                    <p className="text-sm text-gray-500 mb-1">Estimated Gross Yield</p>
                    <p className="text-2xl font-bold text-green-600">{report.estimatedYield}%</p>
                    <p className="text-xs text-gray-400 mt-1">Based on avg rent vs avg sale price</p>
                  </CardContent>
                </Card>
              )}
              
              <Card className="border-gray-200">
                <CardContent className="p-5">
                  <p className="text-sm text-gray-500 mb-1">Active Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{report.supplyAnalysis.totalActive}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {report.supplyAnalysis.forSale} for sale &bull; {report.supplyAnalysis.forRent} for rent
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price Trend Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Price Trend (PSM)</CardTitle>
                  <CardDescription>Average price per square meter over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={report.monthlyTrends as Array<Record<string, unknown>>}>
                      <defs>
                        <linearGradient id="psmGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null
                          const d = payload[0].payload as Record<string, unknown>
                          return (
                            <div className="bg-white rounded-lg shadow-lg border p-3">
                              <p className="text-sm font-semibold">{d.month as string}</p>
                              <p className="text-sm text-gray-600">PSM: AED {Number(d.avg_psm || 0).toLocaleString()}/m²</p>
                              <p className="text-sm text-gray-600">Avg Price: {formatAED(Number(d.avg_price || 0))}</p>
                              <p className="text-sm text-gray-600">Transactions: {Number(d.txn_count || 0)}</p>
                            </div>
                          )
                        }}
                      />
                      <Area type="monotone" dataKey="avg_psm" stroke="#3b82f6" strokeWidth={2} fill="url(#psmGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Property Type Breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Property Type Breakdown</CardTitle>
                  <CardDescription>Transaction distribution by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={280}>
                      <PieChart>
                        <Pie
                          data={(report.propertyTypes as Array<Record<string, unknown>>).map((pt) => ({
                            name: pt.property_type as string,
                            value: pt.count as number,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {(report.propertyTypes as Array<Record<string, unknown>>).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {(report.propertyTypes as Array<Record<string, unknown>>).slice(0, 6).map((pt, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-gray-700 truncate max-w-[120px]">{pt.property_type as string}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{(pt.count as number).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Transaction Volume Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Transaction Volume</CardTitle>
                <CardDescription>Number of transactions per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.monthlyTrends as Array<Record<string, unknown>>}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={11} stroke="#94a3b8" />
                    <YAxis fontSize={11} stroke="#94a3b8" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null
                        const d = payload[0].payload as Record<string, unknown>
                        return (
                          <div className="bg-white rounded-lg shadow-lg border p-3">
                            <p className="text-sm font-semibold">{d.month as string}</p>
                            <p className="text-sm text-gray-600">{Number(d.txn_count || 0)} transactions</p>
                            <p className="text-sm text-gray-600">Volume: {formatAED(Number(d.volume || 0))}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="txn_count" radius={[4, 4, 0, 0]} fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold text-gray-600">Date</th>
                        <th className="text-left p-3 font-semibold text-gray-600">Type</th>
                        <th className="text-left p-3 font-semibold text-gray-600">Building</th>
                        <th className="text-left p-3 font-semibold text-gray-600">Rooms</th>
                        <th className="text-right p-3 font-semibold text-gray-600">Price</th>
                        <th className="text-right p-3 font-semibold text-gray-600">PSM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.recentTransactions as Array<Record<string, unknown>>).slice(0, 10).map((tx, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="p-3 text-gray-600">{tx.instance_date as string}</td>
                          <td className="p-3">{tx.property_type_en as string}</td>
                          <td className="p-3 text-gray-600 truncate max-w-[200px]">
                            {(tx.building_name_en || tx.project_name_en || "—") as string}
                          </td>
                          <td className="p-3 text-gray-600">{(tx.rooms_en || "—") as string}</td>
                          <td className="p-3 text-right font-semibold">{formatAED(tx.actual_worth as number)}</td>
                          <td className="p-3 text-right text-gray-600">
                            {tx.meter_sale_price ? `AED ${Number(tx.meter_sale_price).toLocaleString()}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Signals */}
          {report.signals.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Active Market Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {report.signals.map((signal) => (
                      <div key={signal.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-8 rounded-full",
                            signal.severity === "urgent" ? "bg-red-500" :
                            signal.severity === "watch" || signal.severity === "high" ? "bg-amber-500" :
                            "bg-blue-500"
                          )} />
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {signal.type.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-gray-500">
                              Confidence: {Math.round((signal.confidence || 0) * 100)}%
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          signal.severity === "urgent" ? "border-red-200 text-red-700" :
                          signal.severity === "watch" || signal.severity === "high" ? "border-amber-200 text-amber-700" :
                          "border-blue-200 text-blue-700"
                        )}>
                          {signal.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Footer */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <div className="text-center py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Data sourced from Dubai Land Department (DLD) and Bayut portal listings. 
                Report generated by Vantage Market Intelligence Platform.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
