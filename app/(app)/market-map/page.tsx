import { PageHeader } from "@/components/layout/page-header"
import { DubaiMarketMap } from "@/components/map/dubai-market-map"

export default function MarketMapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dubai Market Map"
        subtitle="Explore 50,000+ real estate transactions across Dubai with interactive mapping"
      />
      <DubaiMarketMap />
    </div>
  )
}
