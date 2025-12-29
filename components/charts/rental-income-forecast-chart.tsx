"use client"

import * as React from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"

import { formatAED } from "@/lib/real-estate"

export function RentalIncomeForecastChart({
  data,
}: {
  data: { month: string; net: number; gross: number }[]
}) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(v) => formatAED(Number(v))} labelStyle={{ fontSize: 12 }} contentStyle={{ borderRadius: 8 }} />
          <Line type="monotone" dataKey="gross" stroke="rgba(16,185,129,0.45)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


