import { Suspense } from "react"

import { LoadingSkeleton } from "@/components/layout/loading-skeleton"
import { RoleRedirect } from "@/components/security/role-redirect"
import { InvestorsPageClient } from "@/components/investors/investors-page-client"
import "@/lib/init-investor-store"

export default function InvestorsPage() {
  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />
      <Suspense fallback={<LoadingSkeleton />}>
        <InvestorsPageClient />
      </Suspense>
    </>
  )
}


