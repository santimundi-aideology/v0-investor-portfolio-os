"use client"

import * as React from "react"
import {
  Building2,
  Coins,
  Percent,
  Users,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import {
  PortfolioValuePanel,
  MonthlyIncomePanel,
  AverageYieldPanel,
  OccupancyRatePanel,
  type PortfolioHoldingForPanels,
} from "./portfolio-kpi-expandable-panels"

export interface KPIData {
  totalPortfolioValue: number
  totalCost?: number
  appreciationPct: number
  monthlyRentalIncome: number
  monthlyRentalTrend: number
  avgYieldPct: number
  occupancyPct: number
  valueSeries: { m: string; v: number }[]
  incomeSeries: { m: string; n: number }[]
  holdings?: PortfolioHoldingForPanels[]
  historicalPortfolioValue?: { date: string; totalValue: number }[]
}

const MASKED_LABEL = "—"

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
          ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:border-emerald-800"
          : "border-red-200 bg-red-500/10 text-red-700 dark:text-red-300 dark:border-red-800"
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
  className,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtext?: string
  trend?: number
  trendSuffix?: string
  className?: string
  onClick?: () => void
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-50/70 shadow-sm shadow-emerald-200/30 transition-all duration-200 hover:shadow-md hover:shadow-emerald-200/40 hover:border-emerald-300/80 dark:border-emerald-800/80 dark:bg-emerald-950/30 dark:shadow-none dark:hover:border-emerald-700/80",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <Icon className="size-4.5" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-200/80">
                {label}
              </span>
              {onClick && <ChevronRight className="size-4 text-emerald-600/70 dark:text-emerald-400/70 ml-auto" />}
            </div>
            <div className="mt-3.5 text-2xl font-bold tracking-tight text-emerald-900 tabular-nums dark:text-emerald-100">{value}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {trend !== undefined && (
                <TrendBadge value={trend} suffix={trendSuffix} />
              )}
              {subtext && (
                <span className="text-xs text-emerald-700/80 dark:text-emerald-300/80">{subtext}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PortfolioKPICards({
  data,
  maskFinancials = false,
}: {
  data: KPIData
  maskFinancials?: boolean
}) {
  const [openPanel, setOpenPanel] = React.useState<"value" | "income" | "yield" | "occupancy" | null>(null)
  const holdings = data.holdings ?? []

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        <KPICard
          icon={Building2}
          label="Portfolio Value"
          value={maskFinancials ? MASKED_LABEL : formatAED(data.totalPortfolioValue)}
          trend={maskFinancials ? undefined : data.appreciationPct}
          trendSuffix="% YTD"
          onClick={() => setOpenPanel("value")}
        />
        <KPICard
          icon={Coins}
          label="Monthly Income"
          value={maskFinancials ? MASKED_LABEL : formatAED(data.monthlyRentalIncome)}
          trend={maskFinancials ? undefined : data.monthlyRentalTrend}
          trendSuffix="% vs LM"
          onClick={() => setOpenPanel("income")}
        />
        <KPICard
          icon={Percent}
          label="Average Yield"
          value={maskFinancials ? MASKED_LABEL : `${data.avgYieldPct.toFixed(2)}%`}
          subtext="Net annual yield"
          trend={maskFinancials ? undefined : (data.avgYieldPct > 7 ? 0.5 : -0.3)}
          trendSuffix="% QoQ"
          onClick={() => setOpenPanel("yield")}
        />
        <KPICard
          icon={Users}
          label="Occupancy Rate"
          value={maskFinancials ? MASKED_LABEL : `${data.occupancyPct.toFixed(1)}%`}
          subtext="Across all properties"
          trend={maskFinancials ? undefined : (data.occupancyPct > 90 ? 1.2 : -0.8)}
          trendSuffix="%"
          onClick={() => setOpenPanel("occupancy")}
        />
      </div>

      <PortfolioValuePanel
        open={openPanel === "value"}
        onOpenChange={(open) => !open && setOpenPanel(null)}
        totalValue={data.totalPortfolioValue}
        totalCost={data.totalCost ?? data.totalPortfolioValue / (1 + data.appreciationPct / 100)}
        appreciationPct={data.appreciationPct}
        valueSeries={data.valueSeries}
        historicalPortfolioValue={data.historicalPortfolioValue}
      />
      <MonthlyIncomePanel
        open={openPanel === "income"}
        onOpenChange={(open) => !open && setOpenPanel(null)}
        totalMonthlyIncome={data.monthlyRentalIncome}
        holdings={holdings}
      />
      <AverageYieldPanel
        open={openPanel === "yield"}
        onOpenChange={(open) => !open && setOpenPanel(null)}
        avgYieldPct={data.avgYieldPct}
        holdings={holdings}
        incomeSeries={data.incomeSeries}
      />
      <OccupancyRatePanel
        open={openPanel === "occupancy"}
        onOpenChange={(open) => !open && setOpenPanel(null)}
        avgOccupancy={data.occupancyPct}
        holdings={holdings}
      />
    </>
  )
}
