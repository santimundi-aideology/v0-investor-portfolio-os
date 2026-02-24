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
    images?: string[]
  } | null
  financials: {
    currentValue: number
    appreciationPct: number
    netYieldPct: number
    occupancyRate: number
    purchasePrice?: number
    monthlyRent?: number
    annualExpenses?: number
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

  const getAppreciationColor = (appreciationPct: number) => {
    if (appreciationPct >= 0) return "text-emerald-700 bg-emerald-500/10 border-emerald-200 dark:text-emerald-300 dark:border-emerald-800"
    return "text-red-700 bg-red-500/10 border-red-200 dark:text-red-300 dark:border-red-800"
  }

  const getYieldColor = (yieldPct: number) => {
    const diff = yieldPct - mandateYieldTarget
    if (diff >= 1) return "text-emerald-700 dark:text-emerald-300"
    if (diff >= -0.5) return "text-amber-700 dark:text-amber-300"
    return "text-red-700 dark:text-red-300"
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
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
      {holdings.map((holding) => {
        const monthlyRent = holding.financials.monthlyRent ?? 0
        const purchasePrice = holding.financials.purchasePrice ?? holding.financials.currentValue
        const netAnnualEst = monthlyRent * 12 * holding.financials.occupancyRate - (holding.financials.annualExpenses ?? 0)

        return (
          <Link key={holding.id} href={`/investor/portfolio/${holding.id}`}>
            <Card className="group overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-lg hover:border-primary/30 dark:border-border cursor-pointer h-full">
              <div className="flex flex-col sm:flex-row">
                {/* Image — more space, aspect 4/3 or square on larger cards */}
                <div className="relative w-full sm:w-[280px] sm:min-h-[220px] aspect-[4/3] sm:aspect-auto sm:shrink-0 overflow-hidden bg-muted">
                  {(holding.property?.imageUrl ?? holding.property?.images?.[0]) ? (
                    <Image
                      src={(holding.property?.imageUrl ?? holding.property?.images?.[0])!}
                      alt={holding.property?.title ?? "Property"}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 280px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted">
                      <Building2 className="size-12 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <Badge
                    variant="outline"
                    className={cn(
                      "absolute top-3 right-3 gap-1.5 border-2 px-2.5 py-1 text-sm font-bold tabular-nums shadow-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm",
                      getAppreciationColor(holding.financials.appreciationPct)
                    )}
                  >
                    {holding.financials.appreciationPct >= 0 ? <TrendingUp className="size-3.5 shrink-0" /> : <TrendingDown className="size-3.5 shrink-0" />}
                    {holding.financials.appreciationPct >= 0 ? "+" : ""}
                    {holding.financials.appreciationPct.toFixed(1)}%
                  </Badge>
                </div>

                <CardContent className="flex flex-1 flex-col p-5 min-w-0">
                  <h4 className="font-semibold text-lg leading-tight">
                    {holding.property?.title || "Property"}
                  </h4>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {holding.property?.area && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 shrink-0" />
                        {holding.property.area}
                      </span>
                    )}
                    {holding.property?.type && (
                      <Badge variant="secondary" className="capitalize text-xs font-normal">
                        {holding.property.type}
                      </Badge>
                    )}
                  </div>

                  {/* Key metrics — two rows for clarity */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/40 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Value</p>
                      <p className="text-sm font-semibold mt-0.5">{formatCurrency(holding.financials.currentValue)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/40 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Yield</p>
                      <p className={cn("text-sm font-semibold mt-0.5 flex items-center gap-1", getYieldColor(holding.financials.netYieldPct))}>
                        <Percent className="size-3" />
                        {holding.financials.netYieldPct.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/40 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Occupancy</p>
                      <p className="text-sm font-semibold mt-0.5">{(holding.financials.occupancyRate * 100).toFixed(0)}%</p>
                    </div>
                    {monthlyRent > 0 && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/40 p-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Monthly rent</p>
                        <p className="text-sm font-semibold mt-0.5">{formatCurrency(monthlyRent)}</p>
                      </div>
                    )}
                    {purchasePrice > 0 && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/40 p-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Purchase</p>
                        <p className="text-sm font-semibold mt-0.5">{formatCurrency(purchasePrice)}</p>
                      </div>
                    )}
                    {netAnnualEst !== 0 && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/40 p-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Net annual</p>
                        <p className="text-sm font-semibold mt-0.5">{formatCurrency(Math.round(netAnnualEst))}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      In Portfolio
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                      View details
                      <ChevronRight className="size-4 shrink-0" />
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
