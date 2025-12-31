import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SignalsFeed } from "@/components/market-signals/signals-feed"
import { Radar } from "lucide-react"

export default function MarketSignalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Market signals"
        subtitle="Signals feed (mock-driven for now). Filter, triage, and route insights to the right investor or team."
        badges={
          <>
            <Badge variant="secondary">Mock</Badge>
            <Badge variant="outline" className="gap-2">
              <Radar className="h-3.5 w-3.5" />
              Feed
            </Badge>
          </>
        }
        primaryAction={
          <Button type="button" variant="outline">
            Export (soon)
          </Button>
        }
      />
      <SignalsFeed />
    </div>
  )
}