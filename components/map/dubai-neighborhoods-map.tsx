"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import type { DubaiNeighborhood } from "./dubai-neighborhoods-map-inner"

const DubaiNeighborhoodsMapInner = dynamic(
  () =>
    import("./dubai-neighborhoods-map-inner").then((mod) => mod.DubaiNeighborhoodsMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] w-full items-center justify-center rounded-b-xl bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

const NEIGHBORHOODS_WITH_COORDS: DubaiNeighborhood[] = [
  { name: "Dubai Marina", slug: "dubai-marina", lat: 25.08, lng: 55.139, dataLabel: "Avg yield ~7%" },
  { name: "Downtown Dubai", slug: "downtown", lat: 25.1972, lng: 55.2744, dataLabel: "Prime" },
  { name: "Palm Jumeirah", slug: "palm-jumeirah", lat: 25.1124, lng: 55.139, dataLabel: "Luxury" },
  { name: "JBR", slug: "jbr", lat: 25.0789, lng: 55.131, dataLabel: "Beach" },
  { name: "Business Bay", slug: "business-bay", lat: 25.1852, lng: 55.281, dataLabel: "CBD" },
  { name: "Dubai Hills", slug: "dubai-hills", lat: 25.142, lng: 55.219, dataLabel: "Family" },
  { name: "Arabian Ranches", slug: "arabian-ranches", lat: 25.059, lng: 55.361, dataLabel: "Villas" },
]

interface DubaiNeighborhoodsMapProps {
  className?: string
  height?: string
}

export function DubaiNeighborhoodsMap({ className = "", height = "320px" }: DubaiNeighborhoodsMapProps) {
  return (
    <div className={`overflow-hidden rounded-b-xl ${className}`} style={{ height }}>
      <DubaiNeighborhoodsMapInner neighborhoods={NEIGHBORHOODS_WITH_COORDS} />
    </div>
  )
}
