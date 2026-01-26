"use client"

import * as React from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts"

import { formatAED } from "@/lib/real-estate"

export function PortfolioValueChart({
  data,
}: {
  data: { month: string; value: number }[]
}) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" hide />
          <YAxis hide domain={["dataMin - 1000000", "dataMax + 1000000"]} />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              fontSize: "12px",
            }}
            formatter={(v) => formatAED(Number(v))}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            fillOpacity={1}
            fill="url(#colorValue)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
