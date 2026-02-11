"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"

interface RentalIncomeData {
  month: string
  grossRent: number
  expenses: number
  netRent: number
  occupancyPct: number
}

interface RentalIncomeChartProps {
  data: RentalIncomeData[]
  showExpenses?: boolean
}

export function RentalIncomeChart({ data, showExpenses = true }: RentalIncomeChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `AED ${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `AED ${(value / 1000).toFixed(0)}K`
    return `AED ${value.toLocaleString()}`
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={formatCurrency}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            width={40}
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
              if (name === "occupancyPct") return [`${value}%`, "Occupancy"]
              return [`AED ${value.toLocaleString()}`, name === "grossRent" ? "Gross Rent" : name === "expenses" ? "Expenses" : "Net Rent"]
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                grossRent: "Gross Rent",
                expenses: "Expenses",
                netRent: "Net Rent",
                occupancyPct: "Occupancy %",
              }
              return labels[value] || value
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="grossRent"
            fill="#86efac"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          {showExpenses && (
            <Bar
              yAxisId="left"
              dataKey="expenses"
              fill="#fca5a5"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          )}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="netRent"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ fill: "#16a34a", strokeWidth: 0, r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="occupancyPct"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
