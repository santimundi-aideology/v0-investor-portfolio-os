"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts"

interface ScoreRadarChartProps {
  data: {
    factor: string
    score: number
    maxScore: number
  }[]
  color?: string
}

export function ScoreRadarChart({ data, color = "#16a34a" }: ScoreRadarChartProps) {
  // Normalize scores to percentage
  const chartData = data.map((d) => ({
    factor: d.factor,
    score: Math.round((d.score / d.maxScore) * 100),
    fullMark: 100,
  }))

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="factor"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              fontSize: "12px",
              backgroundColor: "white",
            }}
            formatter={(value: number) => [`${value}%`, "Score"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
