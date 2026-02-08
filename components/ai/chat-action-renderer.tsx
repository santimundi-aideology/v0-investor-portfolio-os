"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BarChart } from "@tremor/react"

import type { ChatActionBlock, ChatChart } from "@/components/ai/chat-action-types"
import { Button } from "@/components/ui/button"

function Chart({ chart }: { chart: ChatChart }) {
  if (chart.type !== "bar") return null

  // Extract categories (bar keys) for Tremor
  const categories = chart.bars.map(b => b.key)

  return (
    <div className="mt-3 rounded-lg border bg-background p-3">
      {chart.title ? <div className="mb-2 text-sm font-medium">{chart.title}</div> : null}
      <div className="h-56 w-full">
        <BarChart
          className="h-full"
          data={chart.data}
          index={chart.xKey}
          categories={categories}
          colors={["emerald"]}
          showLegend={categories.length > 1}
        />
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


