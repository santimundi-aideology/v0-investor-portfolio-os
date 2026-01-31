"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts"

interface PropertyData {
  name: string
  yield: number
  appreciation: number
  occupancy: number
}

interface PropertyComparisonChartProps {
  data: PropertyData[]
  metric: "yield" | "appreciation" | "occupancy"
  average?: number
}

const metricConfig = {
  yield: { color: "#16a34a", label: "Yield %" },
  appreciation: { color: "#3b82f6", label: "Appreciation %" },
  occupancy: { color: "#8b5cf6", label: "Occupancy %" },
}

export function PropertyComparisonChart({ data, metric, average }: PropertyComparisonChartProps) {
  const config = metricConfig[metric]
  
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#374151" }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              fontSize: "12px",
              backgroundColor: "white",
            }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, config.label]}
          />
          {average !== undefined && (
            <ReferenceLine
              x={average}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              label={{ value: `Avg: ${average.toFixed(1)}%`, fontSize: 10, fill: "#6b7280" }}
            />
          )}
          <Bar dataKey={metric} radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => {
              const value = entry[metric]
              let fill = config.color
              if (metric === "yield" || metric === "appreciation") {
                fill = value >= (average || 0) ? "#16a34a" : "#f59e0b"
              }
              if (metric === "occupancy") {
                fill = value >= 90 ? "#16a34a" : value >= 75 ? "#f59e0b" : "#ef4444"
              }
              return <Cell key={`cell-${index}`} fill={fill} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
