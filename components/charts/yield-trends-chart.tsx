"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"

interface YieldTrendsChartProps {
  data: {
    month: string
    portfolioYield: number
    marketYield: number
  }[]
}

export function YieldTrendsChart({ data }: YieldTrendsChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={["dataMin - 0.5", "dataMax + 0.5"]}
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
              `${value.toFixed(2)}%`,
              name === "portfolioYield" ? "Your Portfolio" : "Market Average",
            ]}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600">
                {value === "portfolioYield" ? "Your Portfolio" : "Market Average"}
              </span>
            )}
          />
          <Line
            type="monotone"
            dataKey="portfolioYield"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={{ fill: "#16a34a", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: "#16a34a" }}
          />
          <Line
            type="monotone"
            dataKey="marketYield"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: "#9ca3af", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#9ca3af" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
