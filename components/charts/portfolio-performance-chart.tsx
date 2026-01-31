"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import { formatAED } from "@/lib/real-estate"

interface PortfolioPerformanceChartProps {
  data: {
    month: string
    value: number
    purchaseCost: number
  }[]
}

export function PortfolioPerformanceChart({ data }: PortfolioPerformanceChartProps) {
  // Calculate min/max for domain
  const values = data.flatMap((d) => [d.value, d.purchaseCost])
  const minVal = Math.min(...values) * 0.95
  const maxVal = Math.max(...values) * 1.05

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPortfolioValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => {
              if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
              if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
              return v.toString()
            }}
            domain={[minVal, maxVal]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              fontSize: "12px",
              backgroundColor: "white",
            }}
            formatter={(value: number, name: string) => [
              formatAED(value),
              name === "value" ? "Current Value" : "Purchase Cost",
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600">
                {value === "value" ? "Current Value" : "Purchase Cost"}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#16a34a"
            strokeWidth={2.5}
            fill="url(#colorPortfolioValue)"
          />
          <Line
            type="monotone"
            dataKey="purchaseCost"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
