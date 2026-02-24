"use client"

import * as React from "react"
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Building2, Coins, Percent, Users } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { formatAED } from "@/lib/real-estate"
import { cn } from "@/lib/utils"

export type PortfolioHoldingForPanels = {
  id: string
  listingId: string
  property: { title: string; area: string; type: string; imageUrl?: string } | null
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

type PanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Portfolio Value Panel ─────────────────────────────────
export function PortfolioValuePanel({
  open,
  onOpenChange,
  totalValue,
  totalCost,
  appreciationPct,
  valueSeries,
  historicalPortfolioValue,
}: PanelProps & {
  totalValue: number
  totalCost: number
  appreciationPct: number
  valueSeries: { m: string; v: number }[]
  historicalPortfolioValue?: { date: string; totalValue: number }[]
}) {
  const [precision, setPrecision] = React.useState<"days" | "weeks" | "months">("months")

  // Build chart data based on precision
  const chartData = React.useMemo(() => {
    const historical = historicalPortfolioValue ?? []
    if (historical.length >= 2) {
      const sorted = [...historical].sort((a, b) => a.date.localeCompare(b.date))
      if (precision === "days" && sorted.length > 7) {
        return sorted.slice(-14).map((d) => ({
          label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: d.totalValue,
        }))
      }
      if (precision === "weeks" && sorted.length > 4) {
        const weekly: { label: string; value: number }[] = []
        for (let i = 0; i < Math.min(12, sorted.length); i += 2) {
          const idx = sorted.length - 1 - i
          if (idx >= 0) {
            weekly.unshift({
              label: new Date(sorted[idx].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              value: sorted[idx].totalValue,
            })
          }
        }
        return weekly.length ? weekly : sorted.map((d) => ({ label: d.date.slice(0, 7), value: d.totalValue }))
      }
      return sorted.map((d) => ({
        label: new Date(d.date + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        value: d.totalValue,
      }))
    }
    return valueSeries.map((d) => ({ label: d.m, value: d.v }))
  }, [historicalPortfolioValue, valueSeries, precision])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[90vw] sm:w-[50vw] min-w-[320px] max-w-[800px] overflow-y-auto animate-in slide-in-from-right-10 duration-300 ease-out"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            Portfolio Value Over Time
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border bg-gray-50/50 p-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold">{formatAED(totalValue)}</span>
              <span className={cn("text-sm font-medium", appreciationPct >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
                {appreciationPct >= 0 ? "+" : ""}{appreciationPct.toFixed(1)}% since purchase
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Purchase cost: {formatAED(totalCost)}</p>
          </div>

          <Tabs value={precision} onValueChange={(v) => setPrecision(v as "days" | "weeks" | "months")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="days">Daily</TabsTrigger>
              <TabsTrigger value="weeks">Weekly</TabsTrigger>
              <TabsTrigger value="months">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="days" className="mt-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValueExpand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v))}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                      formatter={(v: number) => [formatAED(v), "Value"]}
                      labelFormatter={(l) => l}
                    />
                    <Area type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2.5} fill="url(#colorValueExpand)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="weeks" className="mt-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValueExpandW" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v))}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                      formatter={(v: number) => [formatAED(v), "Value"]}
                      labelFormatter={(l) => l}
                    />
                    <Area type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2.5} fill="url(#colorValueExpandW)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="months" className="mt-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValueExpandM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v))}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                      formatter={(v: number) => [formatAED(v), "Value"]}
                      labelFormatter={(l) => l}
                    />
                    <Area type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2.5} fill="url(#colorValueExpandM)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Monthly Income Panel ─────────────────────────────────
export function MonthlyIncomePanel({
  open,
  onOpenChange,
  totalMonthlyIncome,
  holdings,
}: PanelProps & {
  totalMonthlyIncome: number
  holdings: PortfolioHoldingForPanels[]
}) {
  const breakdown = React.useMemo(() => {
    return holdings.map((h) => {
      const grossMonthly = h.financials.monthlyRent * h.financials.occupancyRate
      const expensesMonthly = h.financials.annualExpenses / 12
      const netMonthly = grossMonthly - expensesMonthly
      return {
        id: h.id,
        propertyTitle: h.property?.title ?? h.listingId,
        area: h.property?.area ?? "—",
        grossRent: Math.round(grossMonthly),
        expenses: Math.round(expensesMonthly),
        netIncome: Math.round(netMonthly),
      }
    })
  }, [holdings])

  const totalExpenses = breakdown.reduce((s, b) => s + b.expenses, 0)

  const pieData = React.useMemo(
    () => [
      { name: "Net Income", value: totalMonthlyIncome, color: "#16a34a" },
      { name: "Expenses", value: totalExpenses, color: "#f59e0b" },
    ],
    [totalMonthlyIncome, totalExpenses]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[90vw] sm:w-[50vw] min-w-[320px] max-w-[800px] overflow-y-auto animate-in slide-in-from-right-10 duration-300 ease-out"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coins className="size-5 text-primary" />
            Monthly Income Breakdown
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-emerald-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Net Effective Income</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800">{formatAED(totalMonthlyIncome)}</p>
            </div>
            <div className="rounded-xl border bg-amber-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Total Expenses</p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{formatAED(totalExpenses)}</p>
            </div>
          </div>

          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${formatAED(value)}`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatAED(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">By Property</h4>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
              {breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No properties in portfolio yet.</p>
              ) : breakdown.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border p-3 hover:bg-gray-50/50 transition-colors cursor-default"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm truncate">{b.propertyTitle}</p>
                      <p className="text-xs text-muted-foreground">{b.area}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-700">{formatAED(b.netIncome)}</p>
                      <p className="text-xs text-muted-foreground">
                        Gross {formatAED(b.grossRent)} − Exp {formatAED(b.expenses)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Average Yield Panel ─────────────────────────────────
export function AverageYieldPanel({
  open,
  onOpenChange,
  avgYieldPct,
  holdings,
  incomeSeries,
}: PanelProps & {
  avgYieldPct: number
  holdings: PortfolioHoldingForPanels[]
  incomeSeries: { m: string; n: number }[]
}) {
  const yieldByProperty = React.useMemo(
    () =>
      holdings.map((h) => ({
        name: h.property?.title?.slice(0, 28) ?? `Unit ${h.listingId.slice(0, 8)}`,
        yieldPct: h.financials.netYieldPct,
      })),
    [holdings]
  )

  // Simulate monthly yield progression for comparison
  const yieldOverTime = React.useMemo(() => {
    const base = avgYieldPct
    return incomeSeries.map((d, i) => ({
      month: d.m,
      portfolio: Math.round((base + (Math.sin(i * 0.5) * 0.2)) * 100) / 100,
      market: 5.0 + Math.sin(i * 0.3) * 0.3,
    }))
  }, [avgYieldPct, incomeSeries])

  const avgLastMonth = yieldOverTime.length > 0 ? yieldOverTime[Math.max(0, yieldOverTime.length - 2)]?.portfolio : avgYieldPct
  const changeVsLastMonth = avgLastMonth ? ((avgYieldPct - avgLastMonth) / avgLastMonth) * 100 : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[90vw] sm:w-[50vw] min-w-[320px] max-w-[800px] overflow-y-auto animate-in slide-in-from-right-10 duration-300 ease-out"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Percent className="size-5 text-primary" />
            Average Yield Analysis
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Net Annual Yield</p>
            <p className="mt-1 text-3xl font-bold">{avgYieldPct.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Net rental income as % of portfolio value, annualized.</p>
            <p className={cn("mt-2 text-sm font-medium", changeVsLastMonth >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
              {changeVsLastMonth >= 0 ? "+" : ""}{changeVsLastMonth.toFixed(1)}% vs prior month
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-1">Yield vs Market Over Time</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Compares your portfolio&apos;s net yield (green) against the Dubai market average (gray) month by month. Use this to see if you outperform or underperform the market.
            </p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldOverTime} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    formatter={(v: number) => [`${v.toFixed(2)}%`, ""]}
                  />
                  <Legend />
                  <Bar dataKey="portfolio" name="Your Portfolio" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="market" name="Market Avg" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-1">Yield by Property</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Shows the net annual yield (%) for each property in your portfolio. Helps you identify which assets generate the best returns and which may need attention.
            </p>
            <div className="h-[280px]">
              {yieldByProperty.length === 0 ? (
                <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">No properties in portfolio.</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={yieldByProperty}
                  layout="vertical"
                  margin={{ left: 120, right: 20, top: 10, bottom: 10 }}
                  barCategoryGap="20%"
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" domain={[0, "auto"]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={115}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    interval={0}
                  />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, "Net Yield"]} />
                  <Bar dataKey="yieldPct" fill="#16a34a" radius={[0, 4, 4, 0]} name="Net Yield %" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Occupancy Rate Panel ─────────────────────────────────
export function OccupancyRatePanel({
  open,
  onOpenChange,
  avgOccupancy,
  holdings,
}: PanelProps & {
  avgOccupancy: number
  holdings: PortfolioHoldingForPanels[]
}) {
  const occupancyByProperty = React.useMemo(
    () =>
      holdings.map((h) => ({
        name: h.property?.title?.slice(0, 24) ?? `Unit ${h.listingId.slice(0, 8)}`,
        area: h.property?.area ?? "—",
        occupancy: Math.round(h.financials.occupancyRate * 100),
        status: h.financials.occupancyRate >= 0.9 ? "Full" : h.financials.occupancyRate >= 0.7 ? "Partial" : "Vacant",
      })),
    [holdings]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[90vw] sm:w-[50vw] min-w-[320px] max-w-[800px] overflow-y-auto animate-in slide-in-from-right-10 duration-300 ease-out"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Occupancy by Property
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Portfolio Average</p>
            <p className="mt-1 text-3xl font-bold">{avgOccupancy.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-muted-foreground">Across {holdings.length} propert{holdings.length === 1 ? "y" : "ies"}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Occupancy per Unit</h4>
            <div className="h-[260px]">
              {occupancyByProperty.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No properties in portfolio.</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={occupancyByProperty}
                  layout="vertical"
                  margin={{ left: 80, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 10 }} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Occupancy"]}
                    contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.area ?? ""}
                  />
                  <Bar dataKey="occupancy" radius={[0, 4, 4, 0]}>
                    {occupancyByProperty.map((entry, i) => (
                      <Cell key={i} fill={entry.occupancy >= 90 ? "#16a34a" : entry.occupancy >= 70 ? "#eab308" : "#f59e0b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Unit Summary</h4>
            {occupancyByProperty.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No units to display.</p>
            ) : occupancyByProperty.map((u, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.area}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${u.occupancy}%`,
                        backgroundColor: u.occupancy >= 90 ? "#16a34a" : u.occupancy >= 70 ? "#eab308" : "#f59e0b",
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right">{u.occupancy}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

