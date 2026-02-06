"use client"

import * as React from "react"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar,
  DollarSign,
  ArrowDown,
  ArrowUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface CMAResult {
  area: string
  propertyType: string
  comparableCount: number
  confidence: "high" | "medium" | "low" | "insufficient"
  medianPrice: number | null
  medianPricePerSqft: number | null
  avgPrice: number | null
  avgPricePerSqft: number | null
  priceRange: { min: number; max: number } | null
  askingPriceVsMedian: number | null
  isGoodDeal: boolean
  comparables: {
    transactionId: string
    buildingName: string
    projectName: string
    date: string
    price: number
    pricePsf: number
    sizeSqft: number
    rooms: string
    type: string
    matchTier: number
    matchDescription: string
  }[]
  monthlyTrends: { month: string; avgPrice: number; avgPsf: number; count: number }[]
  areaStats: {
    totalTransactions: number
    avgPrice: number
    avgPricePerSqm: number
    latestTransaction: string | null
  } | null
  tieredAnalysis: {
    tier: number
    description: string
    confidence: number
    count: number
    medianPrice: number
    medianPsf: number
  }[]
}

interface CMAPanelProps {
  area: string
  propertyType: string
  bedrooms: number
  sizeSqft: number | null
  askingPrice: number
  buildingName?: string | null
  onCMALoaded?: (cma: CMAResult) => void
}

function formatAED(amount: number): string {
  if (amount >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `AED ${(amount / 1_000).toFixed(0)}K`
  return `AED ${amount.toLocaleString()}`
}

const confidenceBadge: Record<string, { color: string; label: string }> = {
  high: { color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", label: "High Confidence" },
  medium: { color: "bg-blue-500/10 text-blue-700 border-blue-500/20", label: "Medium Confidence" },
  low: { color: "bg-amber-500/10 text-amber-700 border-amber-500/20", label: "Low Confidence" },
  insufficient: { color: "bg-red-500/10 text-red-700 border-red-500/20", label: "Insufficient Data" },
}

export function CMAPanel({ area, propertyType, bedrooms, sizeSqft, askingPrice, buildingName, onCMALoaded }: CMAPanelProps) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [cma, setCma] = React.useState<CMAResult | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function fetchCMA() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/property-intake/cma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area, propertyType, bedrooms, sizeSqft, askingPrice, buildingName }),
        })
        if (!res.ok) throw new Error("Failed to generate CMA")
        const data = await res.json()
        if (!cancelled) {
          setCma(data.cma)
          onCMALoaded?.(data.cma)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "CMA unavailable")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCMA()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, propertyType, bedrooms, sizeSqft, askingPrice, buildingName])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating CMA from DLD transactions...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !cma) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="size-5 text-amber-500" />
            <p className="text-sm text-muted-foreground">{error || "No DLD data available for this area"}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const conf = confidenceBadge[cma.confidence] || confidenceBadge.insufficient

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-5 text-primary" />
              DLD Market Analysis (CMA)
            </CardTitle>
            <CardDescription>
              Based on {cma.comparableCount} real DLD transactions in {cma.area}
            </CardDescription>
          </div>
          <Badge variant="outline" className={conf.color}>{conf.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Price Comparison */}
        {cma.medianPrice && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Asking Price</div>
                <div className="text-lg font-bold">{formatAED(askingPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">DLD Median</div>
                <div className="text-lg font-bold text-primary">{formatAED(cma.medianPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">vs Market</div>
                <div className={cn(
                  "flex items-center justify-center gap-1 text-lg font-bold",
                  cma.askingPriceVsMedian !== null && cma.askingPriceVsMedian <= 0
                    ? "text-emerald-600"
                    : "text-amber-600"
                )}>
                  {cma.askingPriceVsMedian !== null && cma.askingPriceVsMedian <= 0 ? (
                    <ArrowDown className="size-4" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                  {cma.askingPriceVsMedian !== null
                    ? `${cma.askingPriceVsMedian > 0 ? "+" : ""}${cma.askingPriceVsMedian}%`
                    : "N/A"}
                </div>
                {cma.isGoodDeal && (
                  <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 mt-1">
                    <CheckCircle2 className="size-3" />
                    Good deal
                  </div>
                )}
              </div>
            </div>

            {cma.priceRange && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Range: {formatAED(cma.priceRange.min)}</span>
                  <span>{formatAED(cma.priceRange.max)}</span>
                </div>
                <div className="relative mt-1 h-2 rounded-full bg-muted">
                  {cma.medianPrice && cma.priceRange.max > cma.priceRange.min && (
                    <>
                      <div
                        className="absolute h-full rounded-full bg-primary/30"
                        style={{
                          left: "0%",
                          width: "100%",
                        }}
                      />
                      <div
                        className="absolute h-full w-1 rounded bg-primary"
                        style={{
                          left: `${((cma.medianPrice - cma.priceRange.min) / (cma.priceRange.max - cma.priceRange.min)) * 100}%`,
                        }}
                        title="Median"
                      />
                      <div
                        className="absolute h-full w-1.5 rounded bg-amber-500"
                        style={{
                          left: `${Math.min(100, Math.max(0, ((askingPrice - cma.priceRange.min) / (cma.priceRange.max - cma.priceRange.min)) * 100))}%`,
                        }}
                        title="Asking"
                      />
                    </>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>Min</span>
                  <span className="text-primary">Median</span>
                  <span className="text-amber-500">Asking</span>
                  <span>Max</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PSF Comparison */}
        {cma.medianPricePerSqft && cma.avgPricePerSqft && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">DLD Median /sqft</div>
              <div className="text-base font-semibold">AED {cma.medianPricePerSqft?.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">DLD Average /sqft</div>
              <div className="text-base font-semibold">AED {cma.avgPricePerSqft?.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Tiered Analysis */}
        {cma.tieredAnalysis.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Comparable Tiers</h4>
              <div className="space-y-2">
                {cma.tieredAnalysis.map((tier) => (
                  <div key={tier.tier} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">T{tier.tier}</Badge>
                      <span className="text-muted-foreground">{tier.description}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{tier.count} txns</span>
                      <span className="font-medium">{formatAED(tier.medianPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recent Comparables */}
        {cma.comparables.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Recent DLD Transactions</h4>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {cma.comparables.slice(0, 8).map((comp) => (
                  <div key={comp.transactionId} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-xs">{comp.buildingName}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="size-3" />
                          {comp.date}
                        </span>
                        <span>{comp.rooms} BR</span>
                        <span>{comp.sizeSqft.toLocaleString()} sqft</span>
                      </div>
                    </div>
                    <div className="text-right pl-3">
                      <div className="font-medium text-xs">{formatAED(comp.price)}</div>
                      <div className="text-[10px] text-muted-foreground">AED {comp.pricePsf}/sqft</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Monthly Price Trends */}
        {cma.monthlyTrends.length >= 3 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Price Trend (Last 12 months)</h4>
              <div className="flex items-end gap-1 h-16">
                {cma.monthlyTrends.map((t, i) => {
                  const maxPrice = Math.max(...cma.monthlyTrends.map((m) => m.avgPrice))
                  const minPrice = Math.min(...cma.monthlyTrends.map((m) => m.avgPrice))
                  const range = maxPrice - minPrice || 1
                  const height = ((t.avgPrice - minPrice) / range) * 100
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors relative group"
                      style={{ height: `${Math.max(10, height)}%` }}
                      title={`${t.month}: ${formatAED(t.avgPrice)} (${t.count} txns)`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{cma.monthlyTrends[0]?.month}</span>
                <span>{cma.monthlyTrends[cma.monthlyTrends.length - 1]?.month}</span>
              </div>
            </div>
          </>
        )}

        {/* Area Stats */}
        {cma.areaStats && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Building2 className="size-3" />
              Area Overview: {cma.area}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Total Transactions:</span>{" "}
                <span className="font-medium">{cma.areaStats.totalTransactions.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Price:</span>{" "}
                <span className="font-medium">{formatAED(cma.areaStats.avgPrice)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
