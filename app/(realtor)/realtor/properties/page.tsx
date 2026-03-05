import { Suspense } from "react"
import { LoadingSkeleton } from "@/components/layout/loading-skeleton"
import { PropertiesContent } from "@/components/properties/properties-content"

export default function RealtorPropertiesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PropertiesContent />
    </Suspense>
  )
}
