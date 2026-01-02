"use client"

import * as React from "react"
import { ChevronDown, AlertTriangle, Plus } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Counterfactual } from "@/lib/types"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface CounterfactualCardProps {
  counterfactual: Counterfactual
  propertyTitle: string
  propertyPrice: number
  propertyArea: string
  propertyType: string
  readinessStatus?: string
  onAddAnyway?: (propertyId: string) => void
}

export function CounterfactualCard({
  counterfactual,
  propertyTitle,
  propertyPrice,
  propertyArea,
  propertyType,
  readinessStatus,
  onAddAnyway,
}: CounterfactualCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const formatPrice = (price: number) => {
    return `AED ${(price / 1000000).toFixed(1)}M`
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{propertyTitle}</h4>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{propertyArea}</span>
              <span>•</span>
              <span className="capitalize">{propertyType}</span>
              <span>•</span>
              <span className="font-medium">{formatPrice(propertyPrice)}</span>
            </div>
          </div>
          {readinessStatus && (
            <Badge
              variant="outline"
              className={cn(
                readinessStatus === "READY_FOR_MEMO"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : readinessStatus === "NEEDS_VERIFICATION"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-gray-500/10 text-gray-600 border-gray-500/20"
              )}
            >
              {readinessStatus?.replace(/_/g, " ") ?? "Draft"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Reason Chips */}
        <div className="flex flex-wrap gap-1.5">
          {counterfactual.reasonLabels.slice(0, 3).map((label, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="bg-white/80 text-amber-700 border-amber-300 text-xs"
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              {label}
            </Badge>
          ))}
        </div>

        {/* Expandable Details */}
        <details
          className="group"
          open={isExpanded}
          onToggle={(e) => setIsExpanded(e.currentTarget.open)}
        >
          <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground">
            <span>Details</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            {counterfactual.details && (
              <p className="text-muted-foreground">{counterfactual.details}</p>
            )}

            {counterfactual.violatedConstraints && counterfactual.violatedConstraints.length > 0 && (
              <div>
                <p className="font-medium mb-1">Violated Constraints:</p>
                <ul className="space-y-1 text-muted-foreground">
                  {counterfactual.violatedConstraints.map((constraint, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600">•</span>
                      <span>
                        <span className="font-medium">{constraint.key}:</span> Expected{" "}
                        {typeof constraint.expected === "number"
                          ? constraint.expected.toLocaleString()
                          : String(constraint.expected)}{" "}
                        but got{" "}
                        {typeof constraint.actual === "number"
                          ? constraint.actual.toLocaleString()
                          : String(constraint.actual)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {counterfactual.whatWouldChangeMyMind && counterfactual.whatWouldChangeMyMind.length > 0 && (
              <div>
                <p className="font-medium mb-1">What would make it acceptable:</p>
                <ul className="space-y-1 text-muted-foreground">
                  {counterfactual.whatWouldChangeMyMind.map((condition, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/properties/${counterfactual.propertyId}`}>View Property</Link>
          </Button>
          {onAddAnyway && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onAddAnyway(counterfactual.propertyId)}
              className="flex-1"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add anyway
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

