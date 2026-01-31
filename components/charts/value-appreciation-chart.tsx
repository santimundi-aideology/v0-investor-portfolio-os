"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

interface ValueData {
  date: string
  currentValue: number
  purchaseCost: number
  marketIndex?: number
}

interface ValueAppreciationChartProps {
  data: ValueData[]
  showMarketIndex?: boolean
}

export function ValueAppreciationChart({ data, showMarketIndex = false }: ValueAppreciationChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toLocaleString()
  }

  // Calculate appreciation percentage for tooltip
  const latestAppreciation = data.length > 0
    ? ((data[data.length - 1].currentValue - data[data.length - 1].purchaseCost) / data[data.length - 1].purchaseCost * 100).toFixed(1)
    : "0"

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={formatCurrency}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              fontSize: "12px",
              backgroundColor: "white",
            }}
            formatter={(value: number, name: string) => {
              const label = name === "currentValue" ? "Portfolio Value" : name === "purchaseCost" ? "Purchase Cost" : "Market Index"
              return [`AED ${value.toLocaleString()}`, label]
            }}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                currentValue: `Current Value (+${latestAppreciation}%)`,
                purchaseCost: "Purchase Cost",
                marketIndex: "Market Index",
              }
              return labels[value] || value
            }}
          />
          <Area
            type="monotone"
            dataKey="purchaseCost"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="url(#purchaseGradient)"
          />
          <Area
            type="monotone"
            dataKey="currentValue"
            stroke="#16a34a"
            strokeWidth={2}
            fill="url(#valueGradient)"
          />
          {showMarketIndex && (
            <Area
              type="monotone"
              dataKey="marketIndex"
              stroke="#3b82f6"
              strokeWidth={1}
              fill="transparent"
              strokeDasharray="3 3"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
