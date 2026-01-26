"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

import { formatAED } from "@/lib/real-estate"
import { useIsMobile } from "@/lib/hooks/use-media-query"

interface ValueChartProps {
  type: "value"
  data: { month: string; value: number }[]
  purchasePrice: number
}

interface IncomeChartProps {
  type: "income"
  data: { month: string; net: number; gross: number }[]
  purchasePrice?: never
}

type HoldingPerformanceChartProps = ValueChartProps | IncomeChartProps

export function HoldingPerformanceChart(props: HoldingPerformanceChartProps) {
  if (props.type === "value") {
    return <ValueChart data={props.data} purchasePrice={props.purchasePrice} />
  }
  return <IncomeChart data={props.data} />
}

function ValueChart({
  data,
  purchasePrice,
}: {
  data: { month: string; value: number }[]
  purchasePrice: number
}) {
  const isMobile = useIsMobile()
  const minValue = Math.min(...data.map((d) => d.value), purchasePrice)
  const maxValue = Math.max(...data.map((d) => d.value))
  const domain = [Math.floor(minValue * 0.95), Math.ceil(maxValue * 1.05)]

  // On mobile, show fewer X-axis labels
  const tickInterval = isMobile ? 2 : 0

  return (
    <div className="h-[250px] sm:h-[300px] w-full touch-pan-y">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 20, bottom: 10 }}>
          <defs>
            <linearGradient id="colorValueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            fontSize={isMobile ? 10 : 11}
            interval={tickInterval}
            tickFormatter={(value) => {
              const date = new Date(value + "-01")
              return date.toLocaleDateString("en-US", { month: "short" })
            }}
          />
          <YAxis
            hide
            domain={domain}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid hsl(var(--border))",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              fontSize: isMobile ? "11px" : "12px",
              backgroundColor: "hsl(var(--background))",
              padding: isMobile ? "8px 12px" : "8px",
            }}
            formatter={(value: number) => [formatAED(value), "Value"]}
            labelFormatter={(label) => {
              const date = new Date(label + "-01")
              return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
            }}
            // Touch-friendly: larger active area
            cursor={{ strokeWidth: isMobile ? 2 : 1 }}
          />
          <ReferenceLine
            y={purchasePrice}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            label={isMobile ? undefined : {
              value: "Purchase Price",
              fill: "hsl(var(--muted-foreground))",
              fontSize: 10,
              position: "insideBottomLeft",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fillOpacity={1}
            fill="url(#colorValueGrad)"
            strokeWidth={2.5}
            dot={false}
            // Larger active dot on mobile for touch
            activeDot={{ r: isMobile ? 6 : 4, fill: "hsl(var(--primary))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function IncomeChart({
  data,
}: {
  data: { month: string; net: number; gross: number }[]
}) {
  const isMobile = useIsMobile()
  const tickInterval = isMobile ? 2 : 0

  return (
    <div className="h-[250px] sm:h-[300px] w-full touch-pan-y">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: isMobile ? -10 : 0, right: 0, top: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            fontSize={isMobile ? 10 : 11}
            interval={tickInterval}
            tickFormatter={(value) => {
              const date = new Date(value + "-01")
              return date.toLocaleDateString("en-US", { month: "short" })
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={isMobile ? 10 : 11}
            width={isMobile ? 40 : 50}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid hsl(var(--border))",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              fontSize: isMobile ? "11px" : "12px",
              backgroundColor: "hsl(var(--background))",
              padding: isMobile ? "8px 12px" : "8px",
            }}
            formatter={(value: number, name: string) => [
              formatAED(value),
              name === "gross" ? "Gross" : "Net",
            ]}
            labelFormatter={(label) => {
              const date = new Date(label + "-01")
              return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
            }}
            cursor={{ strokeWidth: isMobile ? 2 : 1 }}
          />
          <Line
            type="monotone"
            dataKey="gross"
            stroke="rgba(16, 185, 129, 0.45)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: isMobile ? 6 : 4 }}
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: isMobile ? 6 : 4, fill: "#10b981" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 sm:gap-6 mt-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <div className="w-3 sm:w-4 h-0.5 bg-[rgba(16,185,129,0.45)]" />
          <span className="text-muted-foreground">Gross</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <div className="w-3 sm:w-4 h-0.5 bg-[#10b981]" />
          <span className="text-muted-foreground">Net</span>
        </div>
      </div>
    </div>
  )
}
