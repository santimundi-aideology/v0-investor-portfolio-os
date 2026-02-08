"use client"

import * as React from "react"
import { AreaChart } from "@tremor/react"

interface MonthlyTrend {
  month: string
  txn_count: number
  avg_price: number
  total_volume: number
}

interface TransactionVolumeChartProps {
  data: MonthlyTrend[]
  height?: number
}

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString()
}

function formatMonth(month: string): string {
  const [, m] = month.split("-")
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return months[parseInt(m)] || m
}

export function TransactionVolumeChart({ data, height = 300 }: TransactionVolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400" style={{ height }}>
        No monthly data available
      </div>
    )
  }

  // Transform data for Tremor (add formatted month)
  const chartData = data.map(d => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }))

  const valueFormatter = (value: number) => `AED ${formatAED(value)}`

  return (
    <AreaChart
      className="h-72"
      data={chartData}
      index="monthLabel"
      categories={["total_volume"]}
      colors={["emerald"]}
      valueFormatter={valueFormatter}
      showLegend={false}
      showGridLines={true}
      curveType="monotone"
    />
  )
}
