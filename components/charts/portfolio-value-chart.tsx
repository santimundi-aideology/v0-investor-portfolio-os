"use client"

import * as React from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts"

import { formatAED } from "@/lib/real-estate"

function formatShortAED(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

export function PortfolioValueChart({
  data,
  showAxis = false,
  className,
  /** Use "light" for light backgrounds (e.g. cards), "dark" for dark hero */
  variant = "dark",
}: {
  data: { month: string; value: number }[]
  showAxis?: boolean
  className?: string
  variant?: "dark" | "light"
}) {
  const id = React.useId().replace(/:/g, "")
  const domain = React.useMemo(() => {
    if (!data.length) return [0, 0]
    const values = data.map((d) => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.1 || max * 0.05
    return [Math.max(0, min - padding), max + padding]
  }, [data])

  const heightClass = className ?? (showAxis ? "h-[240px]" : "h-[220px]")
  const isLight = variant === "light"
  const tickFill = isLight ? "hsl(var(--foreground) / 0.7)" : "rgba(255,255,255,0.7)"
  const axisStroke = isLight ? "hsl(var(--border))" : "rgba(255,255,255,0.2)"

  return (
    <div className={`${heightClass} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={
            showAxis
              ? { left: 8, right: 8, top: 10, bottom: 24 }
              : { left: 0, right: 0, top: 10, bottom: 0 }
          }
        >
          <defs>
            <linearGradient id={`colorValue-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {showAxis ? (
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={{ stroke: axisStroke }}
              tickLine={false}
            />
          ) : (
            <XAxis dataKey="month" hide />
          )}
          {showAxis ? (
            <YAxis
              domain={domain}
              tickFormatter={(v) => formatShortAED(v)}
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={{ stroke: axisStroke }}
              width={44}
            />
          ) : (
            <YAxis hide domain={["dataMin - 1000000", "dataMax + 1000000"]} />
          )}
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              fontSize: "12px",
            }}
            formatter={(v) => formatAED(Number(v))}
            labelFormatter={(label) => (label ? `Period: ${label}` : "")}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            fillOpacity={1}
            fill={`url(#colorValue-${id})`}
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
