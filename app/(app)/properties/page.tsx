import { Suspense } from "react"
import { PropertiesContent } from "@/components/properties/properties-content"

export default function PropertiesPage() {
  return (
    <Suspense fallback={null}>
      <PropertiesContent />
    </Suspense>
  )
}
