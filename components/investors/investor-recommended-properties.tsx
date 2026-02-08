"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, Sparkles } from "lucide-react"

import type { Investor, Property } from "@/lib/types"
import { getAllProperties } from "@/lib/property-store"
import { matchPropertiesToInvestor } from "@/lib/property-matching"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface InvestorRecommendedPropertiesProps {
  investor: Investor
  onShare: (property: Property) => void
}

function formatPrice(value: number) {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  return `AED ${value.toLocaleString()}`
}

export function InvestorRecommendedProperties({ investor, onShare }: InvestorRecommendedPropertiesProps) {
  const allProperties = React.useMemo(() => {
    return getAllProperties()
  }, [])

  const matches = React.useMemo(() => matchPropertiesToInvestor(investor, allProperties).slice(0, 3), [investor, allProperties])

  if (matches.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-base">Recommended properties</CardTitle>
        </div>
        <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wider">
          AI beta
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.map(({ property, score, reasons }) => (
          <div key={property.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="text-sm font-semibold">{property.title}</div>
                <p className="text-xs text-muted-foreground">
                  {property.area} · {formatPrice(property.price)}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="capitalize">
                    {property.type}
                  </Badge>
                  <span>Match score {score}/100</span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {reasons.slice(0, 3).map((reason) => (
                    <li key={reason} className="flex items-start gap-1.5">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/properties/${property.id}`}>
                    View details
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="sm" onClick={() => onShare(property)}>
                  Share with {investor.name.split(" ")[0]}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}


