"use client"

import * as React from "react"
import { Line, LineChart, ResponsiveContainer } from "recharts"

export function MiniLineSparkline({
  data,
  dataKey,
}: {
  data: Record<string, unknown>[]
  dataKey: string
}) {
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Line type="monotone" dataKey={dataKey} stroke="var(--color-primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


