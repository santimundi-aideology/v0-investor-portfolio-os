"use client"

import * as React from "react"
import { Building2, TrendingUp, MapPin, Sparkles, ArrowUpRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Property } from "@/lib/types"

interface PropertyStatsBannerProps {
  properties: Property[]
  className?: string
}

function formatPrice(value: number): string {
  if (value >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  return `AED ${(value / 1_000).toFixed(0)}K`
}

export function PropertyStatsBanner({ properties, className }: PropertyStatsBannerProps) {
  // Calculate stats
  const stats = React.useMemo(() => {
    const available = properties.filter(p => p.status === "available")
    const totalValue = available.reduce((sum, p) => sum + (p.price ?? 0), 0)
    const avgRoi = available.filter(p => p.roi).reduce((sum, p, _, arr) => sum + (p.roi ?? 0) / arr.length, 0)
    const areas = new Set(properties.map(p => p.area))
    const readyForMemo = properties.filter(p => p.readinessStatus === "READY_FOR_MEMO").length
    
    return {
      total: properties.length,
      available: available.length,
      totalValue,
      avgRoi: avgRoi.toFixed(1),
      areaCount: areas.size,
      readyForMemo,
    }
  }, [properties])

  // Get featured property for background
  const featuredProperty = React.useMemo(() => {
    return properties.find(p => p.status === "available" && p.imageUrl && p.roi && p.roi > 8)
      || properties.find(p => p.imageUrl)
  }, [properties])

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        {featuredProperty?.imageUrl && (
          <img
            src={featuredProperty.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/85 to-gray-900/70" />
      </div>

      {/* Content */}
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left side - Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Property Portfolio</h2>
                <p className="text-sm text-white/70">Real estate opportunities across Dubai</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">{stats.available}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Available</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">{formatPrice(stats.totalValue)}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Total Value</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-green-400">{stats.avgRoi}%</span>
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Avg ROI</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">{stats.areaCount}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Locations</div>
              </div>
            </div>
          </div>

          {/* Right side - Quick Actions */}
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                <Sparkles className="mr-1 h-3 w-3" />
                {stats.readyForMemo} Ready for Memo
              </Badge>
              <Badge className="bg-white/10 text-white/80 border-white/20">
                <MapPin className="mr-1 h-3 w-3" />
                {stats.areaCount} Areas
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button asChild className="bg-white text-gray-900 hover:bg-white/90">
                <Link href="/properties/add">
                  Add Property
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link href="/recommendations/new">
                  AI Match <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
