"use client"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Radar } from "lucide-react"

export default function MarketSignalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Market signals" subtitle="Placeholder intelligence feed (no backend yet)." />
      <EmptyState
        title="No signals configured"
        description="This will surface market alerts, pricing changes, and liquidity signals once data sources are connected."
        icon={<Radar className="size-5" />}
        action={<Button type="button">Connect sources (placeholder)</Button>}
      />
    </div>
  )
}


