import { PageHeader } from "@/components/layout/page-header"
import { MarketCompareClient } from "@/components/market/market-compare-client"

export default function MarketComparePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Price Comparison"
        subtitle="Compare actual DLD transaction prices with Bayut & Property Finder listings"
      />
      <MarketCompareClient />
    </div>
  )
}
