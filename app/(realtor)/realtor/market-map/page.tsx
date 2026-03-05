"use client"

import { Map, Layers, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DubaiMarketMap } from "@/components/map/dubai-market-map"

export default function RealtorMarketMapPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-teal-50 via-white to-blue-50 border border-gray-100 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg">
              <Map className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                Dubai Market Map
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Interactive mapping · Market signals · Area analytics
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm gap-1.5">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              Live Data
            </Badge>
            <Badge variant="outline" className="bg-white/80 backdrop-blur-sm gap-1.5 border-teal-200 text-teal-700">
              <Layers className="h-3.5 w-3.5" />
              Interactive
            </Badge>
            <Badge variant="outline" className="bg-white/80 backdrop-blur-sm gap-1.5 border-blue-200 text-blue-700">
              <TrendingUp className="h-3.5 w-3.5" />
              50K+ Transactions
            </Badge>
          </div>
        </div>
      </div>

      <DubaiMarketMap />
    </div>
  )
}
