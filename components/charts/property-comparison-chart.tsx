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
  /** Optional per-bar colors (same order as data). When provided, bars use these instead of metric-based colors. */
  barColors?: string[]
  /** Optional: highlight index on hover (e.g. for syncing with table) */
  activeIndex?: number
}

const metricConfig = {
  yield: { color: "#16a34a", label: "Yield %" },
  appreciation: { color: "#3b82f6", label: "Appreciation %" },
  occupancy: { color: "#8b5cf6", label: "Occupancy %" },
}

export function PropertyComparisonChart({ data, metric, average, barColors, activeIndex }: PropertyComparisonChartProps) {
  const config = metricConfig[metric]
  const usePropertyColors = Array.isArray(barColors) && barColors.length === data.length

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
              let fill: string
              if (usePropertyColors && barColors![index]) {
                fill = barColors![index]
              } else {
                const value = entry[metric]
                if (metric === "yield" || metric === "appreciation") {
                  fill = value >= (average || 0) ? "#16a34a" : "#f59e0b"
                } else if (metric === "occupancy") {
                  fill = value >= 90 ? "#16a34a" : value >= 75 ? "#f59e0b" : "#ef4444"
                } else {
                  fill = config.color
                }
              }
              const isActive = activeIndex !== undefined && activeIndex === index
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={fill}
                  opacity={isActive ? 1 : activeIndex !== undefined ? 0.5 : 1}
                  stroke={isActive ? "#0f2922" : undefined}
                  strokeWidth={isActive ? 2 : 0}
                />
              )
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
