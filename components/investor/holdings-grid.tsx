"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Building2,
  ChevronRight,
  MapPin,
  Percent,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface HoldingData {
  id: string
  listingId: string
  property: {
    title: string
    area: string
    type: string
    imageUrl?: string
  } | null
  financials: {
    currentValue: number
    appreciationPct: number
    netYieldPct: number
    occupancyRate: number
  }
}

interface HoldingsGridProps {
  holdings: HoldingData[]
  mandateYieldTarget?: number
}

export function HoldingsGrid({ holdings, mandateYieldTarget = 8.5 }: HoldingsGridProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) {
      return `AED ${(amount / 1_000_000).toFixed(1)}M`
    }
    if (amount >= 1_000) {
      return `AED ${(amount / 1_000).toFixed(0)}K`
    }
    return `AED ${amount.toLocaleString()}`
  }

  const getPerformanceColor = (yieldPct: number) => {
    const diff = yieldPct - mandateYieldTarget
    if (diff >= 1) return "text-emerald-600 bg-emerald-50 border-emerald-200"
    if (diff >= -0.5) return "text-amber-600 bg-amber-50 border-amber-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto size-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">No portfolio holdings yet</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {holdings.map((holding) => (
        <Link key={holding.id} href={`/investor/portfolio/${holding.id}`}>
          <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
            {/* Property Image */}
            <div className="relative h-40 bg-muted">
              {holding.property?.imageUrl ? (
                <Image
                  src={holding.property.imageUrl}
                  alt={holding.property.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Building2 className="size-10 text-muted-foreground/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Performance Badge */}
              <Badge
                variant="outline"
                className={cn(
                  "absolute top-3 right-3 gap-1 border",
                  getPerformanceColor(holding.financials.netYieldPct)
                )}
              >
                {holding.financials.appreciationPct >= 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {holding.financials.appreciationPct >= 0 ? "+" : ""}
                {holding.financials.appreciationPct.toFixed(1)}%
              </Badge>

              {/* Property Info Overlay */}
              <div className="absolute bottom-3 left-3 right-3">
                <h4 className="font-semibold text-white text-sm truncate">
                  {holding.property?.title || "Property"}
                </h4>
                {holding.property?.area && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                    <MapPin className="size-3" />
                    {holding.property.area}
                  </div>
                )}
              </div>
            </div>

            <CardContent className="p-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {formatCurrency(holding.financials.currentValue)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground">Yield</p>
                  <p className="text-sm font-semibold mt-0.5 flex items-center justify-center gap-1">
                    <Percent className="size-3" />
                    {holding.financials.netYieldPct.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground">Occupied</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {(holding.financials.occupancyRate * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Property Type */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="capitalize text-xs">
                  {holding.property?.type || "property"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 group-hover:text-primary"
                >
                  View Details
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
