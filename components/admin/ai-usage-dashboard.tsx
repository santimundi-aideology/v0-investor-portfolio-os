"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Brain,
  DollarSign,
  Zap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────

type DailyTrend = {
  date: string
  totalTokens: number
  totalCost: number
  totalRequests: number
  failedRequests: number
  scoring: number
  news: number
  chat: number
  tools: number
  other: number
}

type TopTenant = {
  orgId: string
  orgName: string
  totalTokens: number
  totalCost: number
  totalRequests: number
  failedRequests: number
}

type MonthSummary = {
  totalTokens: number
  totalCost: number
  totalRequests: number
  failedRequests: number
  byType?: {
    scoring: number
    news: number
    chat: number
    tools: number
    other: number
  }
  requestsByType?: {
    scoring: number
    news: number
    chat: number
    tools: number
  }
}

type AIUsageData = {
  currentMonth: MonthSummary
  previousMonth: MonthSummary
  dailyTrends: DailyTrend[]
  topTenants: TopTenant[]
}

// ─── Helpers ──────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}

// ─── Colors ───────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  scoring: "#8b5cf6",
  news: "#06b6d4",
  chat: "#10b981",
  tools: "#f59e0b",
  other: "#6b7280",
}

const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#6b7280"]

// ─── Component ────────────────────────────────────────────────

export function AIUsageDashboard() {
  const [data, setData] = useState<AIUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState("30")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ai-usage?days=${days}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error("Failed to fetch AI usage:", err)
      toast.error("Failed to load AI usage data")
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">Failed to load AI usage data</p>
        <Button variant="outline" className="mt-4" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const { currentMonth, previousMonth, dailyTrends, topTenants } = data

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total AI Cost"
          subtitle="Current month"
          value={formatCost(currentMonth.totalCost)}
          previous={previousMonth.totalCost}
          current={currentMonth.totalCost}
          icon={<DollarSign className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Total Tokens"
          subtitle="Current month"
          value={formatTokens(currentMonth.totalTokens)}
          previous={previousMonth.totalTokens}
          current={currentMonth.totalTokens}
          icon={<Brain className="h-4 w-4" />}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <KPICard
          title="Total Requests"
          subtitle="Current month"
          value={currentMonth.totalRequests.toLocaleString()}
          previous={previousMonth.totalRequests}
          current={currentMonth.totalRequests}
          icon={<Zap className="h-4 w-4" />}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <KPICard
          title="Failed Requests"
          subtitle="Current month"
          value={currentMonth.failedRequests.toLocaleString()}
          previous={previousMonth.failedRequests}
          current={currentMonth.failedRequests}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          invertTrend
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Token Consumption Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Token Consumption</CardTitle>
            <CardDescription>Daily usage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <TokenConsumptionChart data={dailyTrends} />
          </CardContent>
        </Card>

        {/* Usage by Type Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Type</CardTitle>
            <CardDescription>Token distribution this month</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageTypePieChart byType={currentMonth.byType} />
          </CardContent>
        </Card>
      </div>

      {/* Cost & Requests Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Cost & Requests</CardTitle>
          <CardDescription>Cost (USD) and request volume by day</CardDescription>
        </CardHeader>
        <CardContent>
          <CostRequestsChart data={dailyTrends} />
        </CardContent>
      </Card>

      {/* Usage Breakdown Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token Breakdown by Type</CardTitle>
          <CardDescription>Stacked daily breakdown across all usage types</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageBreakdownChart data={dailyTrends} />
        </CardContent>
      </Card>

      {/* Top Consumers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top AI Consumers</CardTitle>
          <CardDescription>Organizations ranked by AI cost this month</CardDescription>
        </CardHeader>
        <CardContent>
          <TopConsumersTable tenants={topTenants} />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────

function KPICard({
  title,
  subtitle,
  value,
  previous,
  current,
  icon,
  iconColor,
  iconBg,
  invertTrend = false,
}: {
  title: string
  subtitle: string
  value: string
  previous: number
  current: number
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  invertTrend?: boolean
}) {
  const change = percentChange(current, previous)
  const isPositive = change !== null && change > 0
  const isNegative = change !== null && change < 0

  // For "failed requests" an increase is bad, so invert colors
  const trendIsGood = invertTrend ? isNegative : isPositive
  const trendIsBad = invertTrend ? isPositive : isNegative

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <div className="flex items-center gap-1.5">
              {change !== null ? (
                <>
                  {isPositive && !invertTrend && (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {isPositive && invertTrend && (
                    <TrendingUp className="h-3.5 w-3.5 text-red-600" />
                  )}
                  {isNegative && !invertTrend && (
                    <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                  )}
                  {isNegative && invertTrend && (
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      trendIsGood
                        ? "text-emerald-600"
                        : trendIsBad
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </>
              ) : (
                <>
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{subtitle}</span>
                </>
              )}
            </div>
          </div>
          <div className={`rounded-lg p-2.5 ${iconBg}`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Token Consumption Area Chart ─────────────────────────────

function TokenConsumptionChart({ data }: { data: DailyTrend[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        No data available for this period
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatTokens(v)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              fontSize: "12px",
              backgroundColor: "white",
            }}
            labelFormatter={(label) => formatDate(label as string)}
            formatter={(value: number) => [formatTokens(value), "Tokens"]}
          />
          <Area
            type="monotone"
            dataKey="totalTokens"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            fill="url(#colorTokens)"
            name="Total Tokens"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Usage Type Pie Chart ─────────────────────────────────────

function UsageTypePieChart({
  byType,
}: {
  byType?: { scoring: number; news: number; chat: number; tools: number; other: number }
}) {
  if (!byType) {
    return (
      <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
        No data available
      </div>
    )
  }

  const pieData = [
    { name: "Scoring", value: byType.scoring },
    { name: "News", value: byType.news },
    { name: "Chat", value: byType.chat },
    { name: "Tools", value: byType.tools },
    { name: "Other", value: byType.other },
  ].filter((d) => d.value > 0)

  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
        No usage recorded this month
      </div>
    )
  }

  const total = pieData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="space-y-4">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                fontSize: "12px",
                backgroundColor: "white",
              }}
              formatter={(value: number) => [formatTokens(value), "Tokens"]}
            />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="space-y-1.5">
        {pieData.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatTokens(item.value)}</span>
              <span className="text-muted-foreground">
                ({((item.value / total) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Cost & Requests Bar Chart ────────────────────────────────

function CostRequestsChart({ data }: { data: DailyTrend[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        No data available for this period
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="cost"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v.toFixed(2)}`}
          />
          <YAxis
            yAxisId="requests"
            orientation="right"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              fontSize: "12px",
              backgroundColor: "white",
            }}
            labelFormatter={(label) => formatDate(label as string)}
            formatter={(value: number, name: string) => {
              if (name === "totalCost") return [formatCost(value), "Cost"]
              return [value.toLocaleString(), "Requests"]
            }}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600">
                {value === "totalCost" ? "Cost (USD)" : "Requests"}
              </span>
            )}
          />
          <Bar
            yAxisId="cost"
            dataKey="totalCost"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            barSize={16}
            name="totalCost"
          />
          <Bar
            yAxisId="requests"
            dataKey="totalRequests"
            fill="#60a5fa"
            radius={[4, 4, 0, 0]}
            barSize={16}
            name="totalRequests"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Usage Breakdown Stacked Bar Chart ────────────────────────

function UsageBreakdownChart({ data }: { data: DailyTrend[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        No data available for this period
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatTokens(v)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              fontSize: "12px",
              backgroundColor: "white",
            }}
            labelFormatter={(label) => formatDate(label as string)}
            formatter={(value: number, name: string) => [
              formatTokens(value),
              name.charAt(0).toUpperCase() + name.slice(1),
            ]}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600 capitalize">{value}</span>
            )}
          />
          <Bar dataKey="scoring" stackId="tokens" fill={TYPE_COLORS.scoring} name="scoring" />
          <Bar dataKey="news" stackId="tokens" fill={TYPE_COLORS.news} name="news" />
          <Bar dataKey="chat" stackId="tokens" fill={TYPE_COLORS.chat} name="chat" />
          <Bar dataKey="tools" stackId="tokens" fill={TYPE_COLORS.tools} name="tools" />
          <Bar
            dataKey="other"
            stackId="tokens"
            fill={TYPE_COLORS.other}
            name="other"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Top Consumers Table ──────────────────────────────────────

function TopConsumersTable({ tenants }: { tenants: TopTenant[] }) {
  if (tenants.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        No AI usage recorded this month
      </div>
    )
  }

  const maxCost = Math.max(...tenants.map((t) => t.totalCost))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">#</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead className="text-right">Tokens</TableHead>
          <TableHead className="text-right">Requests</TableHead>
          <TableHead className="text-right">Failed</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="w-[120px]">Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant, i) => {
          const costShare = maxCost > 0 ? (tenant.totalCost / maxCost) * 100 : 0
          const errorRate =
            tenant.totalRequests > 0
              ? ((tenant.failedRequests / tenant.totalRequests) * 100).toFixed(1)
              : "0"
          return (
            <TableRow key={tenant.orgId}>
              <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium">{tenant.orgName}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatTokens(tenant.totalTokens)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {tenant.totalRequests.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {tenant.failedRequests > 0 ? (
                  <Badge variant="destructive" className="font-mono text-xs">
                    {tenant.failedRequests} ({errorRate}%)
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-medium">
                {formatCost(tenant.totalCost)}
              </TableCell>
              <TableCell>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${costShare}%` }}
                  />
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Controls skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-[140px]" />
        <Skeleton className="h-9 w-[100px]" />
      </div>
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
      </div>
      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
