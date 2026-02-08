"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Building2,
  TrendingUp,
  Users,
  Radar,
  Activity,
  DollarSign,
  BarChart3,
  MapPin,
  Sparkles,
  ChevronRight,
  Clock,
  Target,
  Zap,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AnimatedCounter } from "./animated-counter"
import { TransactionVolumeChart } from "@/components/charts/transaction-volume-chart"
import {
  SignalBreakdownChart,
  aggregateSignalBreakdown,
} from "@/components/charts/signal-breakdown-chart"
import { useAPI } from "@/lib/hooks/use-api"

// ── Types ────────────────────────────────────────────────────────────

interface KPIs {
  activeInvestors: number
  newSignals: number
  activeListings: number
  totalTransactions: number
  totalVolume: number
}

interface MonthlyTrend {
  month: string
  txn_count: number
  avg_price: number
  total_volume: number
}

interface TopArea {
  area: string
  txn_count: number
  avg_price: number
  avg_psm: number
  total_volume: number
}

interface SignalBreakdown {
  type: string
  severity: string
  count: number
}

interface Opportunity {
  id: string
  area: string
  segment: string
  severity: string
  confidence: number
  askingPrice: number
  savings: number
  discountPct: number
  compositeScore: number
  rating: string
  bedrooms: number
  createdAt: string
}

interface ExecutiveData {
  kpis: KPIs
  monthlyTrends: MonthlyTrend[]
  topAreas: TopArea[]
  signalBreakdown: SignalBreakdown[]
  opportunities: Opportunity[]
  _warnings?: string[]
  error?: string
}

// ── Animation variants ───────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const cardHover = {
  scale: 1.02,
  transition: { duration: 0.2 },
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

function getRatingColor(rating: string): string {
  switch (rating) {
    case "strong_buy": return "bg-green-500"
    case "buy": return "bg-green-400"
    case "fair_deal": return "bg-blue-400"
    case "hold": return "bg-yellow-400"
    default: return "bg-gray-400"
  }
}

function getRatingLabel(rating: string): string {
  switch (rating) {
    case "strong_buy": return "Strong Buy"
    case "buy": return "Buy"
    case "fair_deal": return "Fair Deal"
    case "hold": return "Hold"
    default: return rating
  }
}

// ── KPI Card Component ───────────────────────────────────────────────

function KPICard({
  icon: Icon,
  label,
  value,
  prefix,
  suffix,
  formatter,
  delay,
  gradient,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  prefix?: string
  suffix?: string
  formatter?: (v: number) => string
  delay: number
  gradient: string
  iconColor: string
}) {
  return (
    <motion.div variants={itemVariants} whileHover={cardHover}>
      <Card className={`relative overflow-hidden border-0 shadow-lg ${gradient}`}>
        <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-white/10 blur-2xl" />
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/80">{label}</p>
              <div className="text-3xl font-bold text-white tracking-tight">
                <AnimatedCounter
                  value={value}
                  delay={delay}
                  prefix={prefix}
                  suffix={suffix}
                  formatter={formatter}
                  duration={2.5}
                />
              </div>
            </div>
            <div className={`p-3 rounded-xl ${iconColor}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Main Component ───────────────────────────────────────────────────

export function ExecutivePortfolioSummary() {
  const { data, error, isLoading } = useAPI<ExecutiveData>("/api/executive-summary", {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Activity className="h-10 w-10 text-green-500" />
        </motion.div>
      </div>
    )
  }

  // Error state — authentication failures, network errors, etc.
  if (error || !data || data.error) {
    const errorMessage = data?.error || "Failed to load executive summary"
    const errStatus = (error as Error & { status?: number })?.status
    const isAuthError = errStatus === 401 || errStatus === 403
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="p-4 rounded-full bg-red-50">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {isAuthError ? "Authentication Required" : "Unable to Load Data"}
        </h2>
        <p className="text-gray-500 max-w-md">
          {isAuthError
            ? "Please sign in to access the executive summary dashboard."
            : errorMessage}
        </p>
      </div>
    )
  }

  // Aggregate signal types for the pie chart using the reusable helper
  const pieData = aggregateSignalBreakdown(data.signalBreakdown)

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* API Warnings Banner */}
      {data._warnings && data._warnings.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Some data may be incomplete</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  {data._warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hero Header */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 p-8 md:p-12 text-white"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="p-2.5 rounded-xl bg-green-500/20 backdrop-blur-sm border border-green-500/30">
              <Sparkles className="h-6 w-6 text-green-400" />
            </div>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 backdrop-blur-sm">
              Live Dashboard
            </Badge>
            <Badge className="bg-white/10 text-white/70 border-white/20 backdrop-blur-sm">
              <Clock className="h-3 w-3 mr-1" />
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight"
          >
            Executive Portfolio Overview
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-base md:text-lg text-white/90 max-w-3xl leading-relaxed"
          >
            Dubai real estate market intelligence powered by <span className="font-semibold text-white">50,000+ DLD transactions</span>, 
            <span className="font-semibold text-white"> AI-driven signals</span>, and <span className="font-semibold text-white">live portal data</span>.
          </motion.p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          icon={DollarSign}
          label="Total Market Volume"
          value={data.kpis.totalVolume}
          formatter={(v) => {
            if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
            return v.toLocaleString()
          }}
          prefix="AED "
          delay={0.2}
          gradient="bg-gradient-to-br from-green-600 to-green-700"
          iconColor="bg-green-500/30"
        />
        <KPICard
          icon={Building2}
          label="DLD Transactions"
          value={data.kpis.totalTransactions}
          formatter={(v) => {
            if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
            return Math.round(v).toLocaleString()
          }}
          delay={0.4}
          gradient="bg-gradient-to-br from-blue-600 to-blue-700"
          iconColor="bg-blue-500/30"
        />
        <KPICard
          icon={Radar}
          label="Active Signals"
          value={data.kpis.newSignals}
          formatter={(v) => Math.round(v).toLocaleString()}
          delay={0.6}
          gradient="bg-gradient-to-br from-purple-600 to-purple-700"
          iconColor="bg-purple-500/30"
        />
        <KPICard
          icon={BarChart3}
          label="Live Listings"
          value={data.kpis.activeListings}
          formatter={(v) => Math.round(v).toLocaleString()}
          delay={0.8}
          gradient="bg-gradient-to-br from-amber-600 to-amber-700"
          iconColor="bg-amber-500/30"
        />
        <KPICard
          icon={Users}
          label="Active Investors"
          value={data.kpis.activeInvestors}
          formatter={(v) => Math.round(v).toString()}
          delay={1.0}
          gradient="bg-gradient-to-br from-rose-600 to-rose-700"
          iconColor="bg-rose-500/30"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Volume Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-gray-200 shadow-sm h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Monthly Transaction Volume
                </CardTitle>
                <Badge variant="outline" className="text-xs">Last 12 months</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionVolumeChart data={data.monthlyTrends} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Signal Intelligence Breakdown */}
        <motion.div variants={itemVariants}>
          <Card className="border-gray-200 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                Signal Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignalBreakdownChart data={pieData} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Areas */}
      <motion.div variants={itemVariants}>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                Top Performing Areas
              </CardTitle>
              <Badge variant="outline" className="text-xs">By transaction volume</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.topAreas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.topAreas.map((area, i) => {
                  const maxVol = data.topAreas[0].total_volume
                  const pct = Math.round((area.total_volume / maxVol) * 100)
                  return (
                    <motion.div
                      key={area.area}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 + i * 0.1 }}
                      className="group"
                    >
                      <div className="p-4 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-all hover:border-green-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm leading-tight">{area.area}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{area.txn_count.toLocaleString()} transactions</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={i === 0 ? "bg-green-50 text-green-700 border-green-200" : "text-gray-500"}
                          >
                            #{i + 1}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Avg Price</span>
                            <span className="font-semibold text-gray-800">{formatAED(area.avg_price)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Avg PSM</span>
                            <span className="font-semibold text-gray-800">AED {area.avg_psm?.toLocaleString()}/m²</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Volume</span>
                            <span className="font-semibold text-green-600">{formatAED(area.total_volume)}</span>
                          </div>
                          <Progress value={pct} className="h-1.5 mt-1" />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">
                No area data available
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Hot Opportunities */}
      {data.opportunities.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Top Investment Opportunities
                </CardTitle>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  AI-Detected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {data.opportunities.map((opp, i) => (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.5 + i * 0.15 }}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
                    <div className={`w-2 h-12 rounded-full ${getRatingColor(opp.rating)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 truncate">
                          {opp.area} &mdash; {opp.segment}
                        </p>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {opp.bedrooms ? `${opp.bedrooms}BR` : opp.segment}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Score: <strong className="text-gray-800">{opp.compositeScore}</strong>/100</span>
                        <span>Discount: <strong className="text-green-600">{opp.discountPct?.toFixed(1)}%</strong></span>
                        {opp.savings > 0 && (
                          <span>Save: <strong className="text-green-600">{formatAED(opp.savings)}</strong></span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatAED(opp.askingPrice)}</p>
                      <Badge className={`text-xs ${getRatingColor(opp.rating)} text-white border-0`}>
                        {getRatingLabel(opp.rating)}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-green-500 transition-colors shrink-0" />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div variants={itemVariants} className="text-center py-4">
        <p className="text-xs text-gray-400">
          Data sourced from Dubai Land Department (DLD) &bull; Portal listings from Bayut &bull; 
          AI signals powered by proprietary algorithms
        </p>
      </motion.div>
    </motion.div>
  )
}
