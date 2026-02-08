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
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-green-50 via-white to-blue-50 border border-gray-100 p-8 shadow-sm">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg">
                <Radar className="size-6" />
              </span>
              <span className="text-3xl font-bold text-gray-900">Market Signals</span>
            </span>
          }
          subtitle="Real-time market intelligence and investment opportunities. Filter, analyze, and route insights to investors."
          badges={
            <>
              <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">Live Data</Badge>
              <Badge variant="outline" className="bg-white/80 backdrop-blur-sm gap-2 border-green-200 text-green-700">
                <Radar className="h-3.5 w-3.5" />
                Active Feed
              </Badge>
            </>
          }
          primaryAction={
            <Button type="button" variant="outline" className="bg-white/80 backdrop-blur-sm hover:bg-white">
              Export Report
            </Button>
          }
        />
      </div>
      <SignalsFeed tenantId={tenantId} initialSignals={initialSignals} />
    </div>
  )
}