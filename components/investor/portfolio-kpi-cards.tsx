"use client"

import * as React from "react"
import {
  Building2,
  Coins,
  Percent,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MiniAreaSparkline } from "@/components/charts/mini-area-sparkline"
import { MiniLineSparkline } from "@/components/charts/mini-line-sparkline"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"

export interface KPIData {
  totalPortfolioValue: number
  appreciationPct: number
  monthlyRentalIncome: number
  monthlyRentalTrend: number
  avgYieldPct: number
  occupancyPct: number
  valueSeries: { m: string; v: number }[]
  incomeSeries: { m: string; n: number }[]
}

function TrendBadge({
  value,
  suffix = "%",
}: {
  value: number
  suffix?: string
}) {
  const isPositive = value >= 0
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        isPositive
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      )}
    >
      {isPositive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {isPositive ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </Badge>
  )
}

function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  trendSuffix,
  sparkline,
  className,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtext?: string
  trend?: number
  trendSuffix?: string
  sparkline?: React.ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-gray-100 bg-white shadow-sm transition-all hover:shadow-md",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-green-50">
                <Icon className="size-4 text-green-600" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {label}
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{value}</div>
            <div className="mt-1 flex items-center gap-2">
              {trend !== undefined && (
                <TrendBadge value={trend} suffix={trendSuffix} />
              )}
              {subtext && (
                <span className="text-xs text-gray-500">{subtext}</span>
              )}
            </div>
          </div>
          {sparkline && (
            <div className="w-[120px] shrink-0">{sparkline}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function PortfolioKPICards({ data }: { data: KPIData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        icon={Building2}
        label="Portfolio Value"
        value={formatAED(data.totalPortfolioValue)}
        trend={data.appreciationPct}
        trendSuffix="% YTD"
        sparkline={
          <MiniAreaSparkline data={data.valueSeries} dataKey="v" />
        }
      />
      <KPICard
        icon={Coins}
        label="Monthly Income"
        value={formatAED(data.monthlyRentalIncome)}
        trend={data.monthlyRentalTrend}
        trendSuffix="% vs LM"
        sparkline={
          <MiniLineSparkline data={data.incomeSeries} dataKey="n" />
        }
      />
      <KPICard
        icon={Percent}
        label="Average Yield"
        value={`${data.avgYieldPct.toFixed(2)}%`}
        subtext="Net annual yield"
        trend={data.avgYieldPct > 7 ? 0.5 : -0.3}
        trendSuffix="% QoQ"
      />
      <KPICard
        icon={Users}
        label="Occupancy Rate"
        value={`${data.occupancyPct.toFixed(1)}%`}
        subtext="Across all properties"
        trend={data.occupancyPct > 90 ? 1.2 : -0.8}
        trendSuffix="%"
      />
    </div>
  )
}
