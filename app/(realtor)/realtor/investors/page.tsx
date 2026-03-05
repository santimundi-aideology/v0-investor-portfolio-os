import { Suspense } from "react"
import { LoadingSkeleton } from "@/components/layout/loading-skeleton"
import { InvestorsPageClient } from "@/components/investors/investors-page-client"

export default function RealtorInvestorsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <InvestorsPageClient />
    </Suspense>
  )
}
