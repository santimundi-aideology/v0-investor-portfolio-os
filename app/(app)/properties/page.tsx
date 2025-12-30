import { Suspense } from "react"
import { PropertiesContent } from "@/components/properties/properties-content"
import { LoadingSkeleton } from "@/components/layout/loading-skeleton"
import { RoleRedirect } from "@/components/security/role-redirect"

export default function PropertiesPage() {
  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/real-estate" />
      <Suspense fallback={<LoadingSkeleton />}>
        <PropertiesContent />
      </Suspense>
    </>
  )
}
