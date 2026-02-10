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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Building2,
  Users,
  Home,
  DollarSign,
  TrendingUp,
  UserPlus,
  Plus,
  RefreshCw,
  Briefcase,
  FileText,
  ArrowUpRight,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import type { PlanTier } from "@/lib/plans/config"

// ─── Types ────────────────────────────────────────────────────

type PlatformUsageData = {
  kpis: {
    totalTenants: number
    activeTenants: number
    totalUsers: number
    activeUsers: number
    totalProperties: number
    totalInvestors: number
    totalDeals: number
    totalMemos: number
    estimatedMRR: number
  }
  planDistribution: {
    name: string
    displayName: string
    value: number
  }[]
  topTenants: {
    id: string
    name: string
    plan: PlanTier
    properties: number
    investors: number
    deals: number
    memos: number
    users: number
  }[]
  trends: {
    newTenantsThisMonth: number
    newUsersThisMonth: number
    newPropertiesThisMonth: number
    newDealsThisMonth: number
  }
  revenueByPlan: Record<
    string,
    { count: number; mrr: number }
  >
}

// ─── Constants ────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  starter: "#60a5fa",  // blue-400
  pro: "#a78bfa",      // violet-400
  enterprise: "#f59e0b", // amber-500
}

const PLAN_BADGE_CLASSES: Record<string, string> = {
  starter: "bg-blue-100 text-blue-800 border-blue-200",
  pro: "bg-violet-100 text-violet-800 border-violet-200",
  enterprise: "bg-amber-100 text-amber-800 border-amber-200",
}

// ─── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`
  }
  return `$${amount.toLocaleString()}`
}

function planLabel(plan: string): string {
  switch (plan) {
    case "starter":
      return "Essential"
    case "pro":
      return "Professional"
    case "enterprise":
      return "Enterprise"
    default:
      return plan
  }
}

// ─── KPI Card ─────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; label: string }
  loading?: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-md bg-gray-100 p-2">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend && trend.value > 0 && (
              <span className="inline-flex items-center text-xs font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +{trend.value}
              </span>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Plan Distribution Chart ──────────────────────────────────

function PlanDistributionChart({
  data,
  loading,
}: {
  data: PlatformUsageData["planDistribution"]
  loading: boolean
}) {
  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-md" />
        </CardContent>
      </Card>
    )
  }

  const hasData = data.some((d) => d.value > 0)

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{
      name: string
      value: number
      payload: { name: string; displayName: string; value: number }
    }>
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0]
      return (
        <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-xs">
          <p className="font-medium">{item.payload.displayName}</p>
          <p className="text-muted-foreground">
            {item.value} {item.value === 1 ? "tenant" : "tenants"}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-base">Plan Distribution</CardTitle>
        <CardDescription>Tenants by subscription tier</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="displayName"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PLAN_COLORS[entry.name] || "#94a3b8"}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  formatter={(value) => (
                    <span className="text-muted-foreground text-xs">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            No tenant data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Revenue Breakdown Card ───────────────────────────────────

function RevenueBreakdownCard({
  data,
  loading,
}: {
  data: PlatformUsageData["revenueByPlan"] | null
  loading: boolean
}) {
  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const plans = [
    { key: "starter", label: "Essential", color: "bg-blue-500" },
    { key: "pro", label: "Professional", color: "bg-violet-500" },
    { key: "enterprise", label: "Enterprise", color: "bg-amber-500" },
  ]

  const totalMRR = Object.values(data).reduce((sum, d) => sum + d.mrr, 0)

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-base">Revenue Breakdown</CardTitle>
        <CardDescription>Monthly recurring revenue by plan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {plans.map((plan) => {
            const planData = data[plan.key]
            if (!planData) return null
            const pct = totalMRR > 0 ? (planData.mrr / totalMRR) * 100 : 0

            return (
              <div key={plan.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${plan.color}`} />
                    <span className="text-sm font-medium">{plan.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({planData.count} {planData.count === 1 ? "tenant" : "tenants"})
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(planData.mrr)}/mo
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full ${plan.color} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            )
          })}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Total MRR
              </span>
              <span className="text-lg font-bold">
                {formatCurrency(totalMRR)}/mo
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Tenant Activity Table ────────────────────────────────────

function TenantActivityTable({
  tenants,
  loading,
}: {
  tenants: PlatformUsageData["topTenants"]
  loading: boolean
}) {
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-base">Top Tenants by Activity</CardTitle>
        <CardDescription>
          Most active organizations ranked by combined activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No tenant activity data available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-center">Properties</TableHead>
                <TableHead className="text-center">Investors</TableHead>
                <TableHead className="text-center">Deals</TableHead>
                <TableHead className="text-center">Memos</TableHead>
                <TableHead className="text-center">Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={PLAN_BADGE_CLASSES[tenant.plan] ?? ""}
                    >
                      {planLabel(tenant.plan)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {tenant.properties}
                  </TableCell>
                  <TableCell className="text-center">
                    {tenant.investors}
                  </TableCell>
                  <TableCell className="text-center">
                    {tenant.deals}
                  </TableCell>
                  <TableCell className="text-center">
                    {tenant.memos}
                  </TableCell>
                  <TableCell className="text-center">
                    {tenant.users}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Quick Actions Card ───────────────────────────────────────

function QuickActionsCard({
  onAddCompany,
  onInviteUser,
}: {
  onAddCompany?: () => void
  onInviteUser?: () => void
}) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
        <CardDescription>Common admin operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddCompany}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onInviteUser}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2"
          >
            <a href="/admin/organizations">
              <Building2 className="h-4 w-4" />
              Manage Organizations
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2"
          >
            <a href="/admin/users">
              <Users className="h-4 w-4" />
              Manage Users
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Dashboard Component ─────────────────────────────────

export function AdminDashboard({
  onAddCompany,
  onInviteUser,
}: {
  onAddCompany?: () => void
  onInviteUser?: () => void
}) {
  const [data, setData] = useState<PlatformUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/platform-usage")
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load platform usage"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Platform Overview</h2>
          <p className="text-sm text-muted-foreground">
            Real-time metrics across all organizations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Tenants"
          value={data?.kpis.totalTenants ?? 0}
          subtitle={`${data?.kpis.activeTenants ?? 0} active`}
          icon={Building2}
          trend={
            data?.trends.newTenantsThisMonth
              ? { value: data.trends.newTenantsThisMonth, label: "this month" }
              : undefined
          }
          loading={loading}
        />
        <KpiCard
          title="Total Users"
          value={data?.kpis.totalUsers ?? 0}
          subtitle={`${data?.kpis.activeUsers ?? 0} active`}
          icon={Users}
          trend={
            data?.trends.newUsersThisMonth
              ? { value: data.trends.newUsersThisMonth, label: "this month" }
              : undefined
          }
          loading={loading}
        />
        <KpiCard
          title="Total Properties"
          value={data?.kpis.totalProperties ?? 0}
          icon={Home}
          trend={
            data?.trends.newPropertiesThisMonth
              ? {
                  value: data.trends.newPropertiesThisMonth,
                  label: "this month",
                }
              : undefined
          }
          loading={loading}
        />
        <KpiCard
          title="Estimated MRR"
          value={data ? formatCurrency(data.kpis.estimatedMRR) : "$0"}
          subtitle="Monthly recurring revenue"
          icon={DollarSign}
          loading={loading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Total Investors"
          value={data?.kpis.totalInvestors ?? 0}
          icon={Users}
          loading={loading}
        />
        <KpiCard
          title="Active Deals"
          value={data?.kpis.totalDeals ?? 0}
          icon={Briefcase}
          trend={
            data?.trends.newDealsThisMonth
              ? { value: data.trends.newDealsThisMonth, label: "this month" }
              : undefined
          }
          loading={loading}
        />
        <KpiCard
          title="Investment Memos"
          value={data?.kpis.totalMemos ?? 0}
          icon={FileText}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlanDistributionChart
          data={data?.planDistribution ?? []}
          loading={loading}
        />
        <RevenueBreakdownCard
          data={data?.revenueByPlan ?? null}
          loading={loading}
        />
      </div>

      {/* Top Tenants Table */}
      <TenantActivityTable
        tenants={data?.topTenants ?? []}
        loading={loading}
      />

      {/* Quick Actions */}
      <QuickActionsCard
        onAddCompany={onAddCompany}
        onInviteUser={onInviteUser}
      />
    </div>
  )
}
