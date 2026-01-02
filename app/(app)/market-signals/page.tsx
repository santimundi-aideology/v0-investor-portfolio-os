import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SignalsFeed } from "@/components/market-signals/signals-feed"
import { Radar } from "lucide-react"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { listMarketSignalsFeed } from "@/lib/db/market-signals"

async function resolveTenantId() {
  const supabase = getSupabaseAdminClient()
  if (process.env.DEMO_TENANT_ID) return process.env.DEMO_TENANT_ID
  const { data, error } = await supabase.from("tenants").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error("No tenants found. Run Supabase migrations + seed-holdings.sql.")
  return data.id as string
}

export default async function MarketSignalsPage() {
  const tenantId = await resolveTenantId()
  const initialSignals = await listMarketSignalsFeed({ tenantId, limit: 50 }).catch((e) => {
    console.warn("[market-signals] unable to load DB signals; falling back to empty list", e)
    return []
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market signals"
        subtitle="Signals feed. Filter, triage, and route insights to the right investor or team."
        badges={
          <>
            <Badge variant="secondary">DB</Badge>
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
      <SignalsFeed tenantId={tenantId} initialSignals={initialSignals} />
    </div>
  )
}