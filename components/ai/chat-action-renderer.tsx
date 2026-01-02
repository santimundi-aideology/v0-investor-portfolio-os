"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

import type { ChatActionBlock, ChatChart } from "@/components/ai/chat-action-types"
import { Button } from "@/components/ui/button"

function Chart({ chart }: { chart: ChatChart }) {
  if (chart.type !== "bar") return null

  return (
    <div className="mt-3 rounded-lg border bg-background p-3">
      {chart.title ? <div className="mb-2 text-sm font-medium">{chart.title}</div> : null}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {chart.bars.map((b) => (
              <Bar key={b.key} dataKey={b.key} name={b.label ?? b.key} fill="#10b981" radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function ChatActionRenderer({ block }: { block: ChatActionBlock }) {
  const router = useRouter()
  const actions = block.actions ?? []
  const charts = block.charts ?? []

  return (
    <>
      {actions.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a, idx) => {
            if (a.type === "navigate") {
              return (
                <Button
                  key={`${a.type}-${idx}`}
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(a.href)}
                >
                  {a.label ?? `Open ${a.href}`}
                </Button>
              )
            }
            if (a.type === "toast") {
              return (
                <Button
                  key={`${a.type}-${idx}`}
                  variant="outline"
                  size="sm"
                  onClick={() => toast(a.message)}
                >
                  {a.label ?? "Show message"}
                </Button>
              )
            }
            return null
          })}
        </div>
      ) : null}

      {charts.map((c, idx) => (
        <Chart key={`${c.type}-${idx}`} chart={c} />
      ))}
    </>
  )
}


