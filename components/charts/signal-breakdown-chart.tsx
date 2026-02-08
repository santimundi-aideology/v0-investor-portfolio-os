"use client"

import * as React from "react"
import { DonutChart } from "@tremor/react"

interface SignalPieItem {
  name: string
  value: number
  color: string
}

interface SignalBreakdownChartProps {
  data: SignalPieItem[]
  height?: number
  /** Maximum number of items to show in the legend */
  legendLimit?: number
}

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  price_change: "#ef4444",
  pricing_opportunity: "#22c55e",
  supply_spike: "#f59e0b",
  yield_opportunity: "#3b82f6",
  rent_change: "#8b5cf6",
  risk_flag: "#dc2626",
}

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  price_change: "Price Change",
  pricing_opportunity: "Pricing Opportunity",
  supply_spike: "Supply Spike",
  yield_opportunity: "Yield Opportunity",
  rent_change: "Rent Change",
  risk_flag: "Risk Flag",
}

/**
 * Transforms raw signal breakdown data (type+severity counts) into
 * aggregated pie chart data grouped by signal type.
 */
export function aggregateSignalBreakdown(
  breakdown: Array<{ type: string; severity: string; count: number }>,
): SignalPieItem[] {
  const map = new Map<string, number>()
  for (const s of breakdown) {
    map.set(s.type, (map.get(s.type) ?? 0) + s.count)
  }
  return Array.from(map.entries()).map(([type, count]) => ({
    name: SIGNAL_TYPE_LABELS[type] || type,
    value: count,
    color: SIGNAL_TYPE_COLORS[type] || "#94a3b8",
  }))
}

const valueFormatter = (value: number) => `${value.toLocaleString()} signals`

export function SignalBreakdownChart({
  data,
  height = 200,
  legendLimit = 4,
}: SignalBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400" style={{ height: height + 100 }}>
        No signal data
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DonutChart
        className="h-48"
        data={data}
        category="value"
        index="name"
        valueFormatter={valueFormatter}
        colors={["red", "emerald", "amber", "blue", "violet", "rose"]}
        showLabel={false}
      />
      <div className="space-y-2">
        {data.slice(0, legendLimit).map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-gray-700">{item.name}</span>
            </div>
            <span className="font-semibold text-gray-900">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
