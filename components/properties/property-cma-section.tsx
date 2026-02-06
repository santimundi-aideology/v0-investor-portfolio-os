"use client"

import * as React from "react"
import { CMAPanel } from "@/components/property-intake/cma-panel"

interface PropertyCMASectionProps {
  area: string
  propertyType: string
  bedrooms: number
  sizeSqft: number
  askingPrice: number
  buildingName?: string | null
}

/**
 * Client-side wrapper to render the CMA panel on a property detail page.
 * Maps property type strings to the CMA-expected format.
 */
export function PropertyCMASection({
  area,
  propertyType,
  bedrooms,
  sizeSqft,
  askingPrice,
  buildingName,
}: PropertyCMASectionProps) {
  // Map generic property types to CMA-compatible types
  const cmaPropertyType = React.useMemo(() => {
    const lower = propertyType.toLowerCase()
    if (lower.includes("villa") || lower.includes("townhouse")) return "Villa"
    if (lower.includes("land")) return "Land"
    if (lower.includes("commercial") || lower.includes("office")) return "Unit"
    return "Unit"
  }, [propertyType])

  return (
    <CMAPanel
      area={area}
      propertyType={cmaPropertyType}
      bedrooms={bedrooms}
      sizeSqft={sizeSqft > 0 ? sizeSqft : null}
      askingPrice={askingPrice}
      buildingName={buildingName}
    />
  )
}
