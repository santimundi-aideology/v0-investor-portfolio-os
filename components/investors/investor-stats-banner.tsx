"use client"

import * as React from "react"
import { Users, TrendingUp, Building2, Sparkles, UserPlus } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Investor } from "@/lib/types"
import { mockProperties } from "@/lib/mock-data"

interface InvestorStatsBannerProps {
  investors: Investor[]
  className?: string
}

function formatAUM(value: number): string {
  if (value >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(0)}M`
  return `AED ${(value / 1_000).toFixed(0)}K`
}

export function InvestorStatsBanner({ investors, className }: InvestorStatsBannerProps) {
  // Calculate stats
  const stats = React.useMemo(() => {
    const active = investors.filter(i => i.status === "active")
    const totalAUM = investors.reduce((sum, i) => sum + (i.aumAed ?? 0), 0)
    const totalDeals = investors.reduce((sum, i) => sum + (i.totalDeals ?? 0), 0)
    const familyOffices = investors.filter(i => i.segment === "family_office").length
    
    return {
      total: investors.length,
      active: active.length,
      totalAUM,
      totalDeals,
      familyOffices,
    }
  }, [investors])

  // Get property images for background collage
  const bgImages = React.useMemo(() => {
    return mockProperties
      .filter(p => p.imageUrl)
      .slice(0, 4)
      .map(p => p.imageUrl!)
  }, [])

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Background Image Collage */}
      <div className="absolute inset-0 flex">
        {bgImages.map((url, i) => (
          <div key={i} className="relative flex-1 overflow-hidden">
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/95 via-green-800/90 to-green-900/80" />
      </div>

      {/* Content */}
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left side - Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Investor CRM</h2>
                <p className="text-sm text-white/70">Manage relationships and opportunities</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">{stats.active}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Active</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">{formatAUM(stats.totalAUM)}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Total AUM</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-green-300">{stats.totalDeals}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Total Deals</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">{stats.familyOffices}</div>
                <div className="text-xs text-white/60 uppercase tracking-wide">Family Offices</div>
              </div>
            </div>
          </div>

          {/* Right side - Quick Actions */}
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white/20 text-white border-white/30">
                <Building2 className="mr-1 h-3 w-3" />
                {stats.total} Investors
              </Badge>
              <Badge className="bg-green-400/20 text-green-200 border-green-400/30">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Matching
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button asChild className="bg-white text-green-700 hover:bg-white/90">
                <Link href="/investors/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Investor
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link href="/recommendations/new">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Match
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
