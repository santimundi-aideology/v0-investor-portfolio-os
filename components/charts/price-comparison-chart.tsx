"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts"

interface PriceComparisonChartProps {
  askingPrice: number
  marketAverage: number
  recommendedOffer: number
  stabilizedValue?: number
}

export function PriceComparisonChart({
  askingPrice,
  marketAverage,
  recommendedOffer,
  stabilizedValue,
}: PriceComparisonChartProps) {
  const data = [
    { name: "Recommended Offer", value: recommendedOffer, color: "#16a34a" },
    { name: "Asking Price", value: askingPrice, color: "#6b7280" },
    { name: "Market Avg", value: marketAverage, color: "#3b82f6" },
  ]

  if (stabilizedValue) {
    data.push({ name: "Stabilized Value", value: stabilizedValue, color: "#8b5cf6" })
  }

  const maxValue = Math.max(...data.map((d) => d.value)) * 1.1

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 10, right: 60, top: 10, bottom: 10 }}
        >
          <XAxis
            type="number"
            domain={[0, maxValue]}
            tickFormatter={formatValue}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#374151" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              fontSize: "12px",
              backgroundColor: "white",
            }}
            formatter={(value: number) => [
              `AED ${value.toLocaleString()}`,
              "Price",
            ]}
          />
          <ReferenceLine
            x={askingPrice}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={formatValue}
              style={{ fontSize: 11, fill: "#374151", fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
