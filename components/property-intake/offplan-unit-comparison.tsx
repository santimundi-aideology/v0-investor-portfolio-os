"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Eye,
  Minus,
  Star,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { OffPlanUnit, OffPlanPaymentPlan, OffPlanProject } from "@/lib/types"

interface OffPlanUnitComparisonProps {
  project: OffPlanProject
  units: OffPlanUnit[]
  paymentPlan: OffPlanPaymentPlan
  onSelectBest?: (unit: OffPlanUnit) => void
}

function formatAED(amount: number): string {
  if (amount >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `AED ${(amount / 1_000).toFixed(0)}K`
  return `AED ${amount.toLocaleString()}`
}

function calculateUnitMetrics(unit: OffPlanUnit, paymentPlan: OffPlanPaymentPlan) {
  // Payment plan calculation from milestones
  const bookingMilestone = paymentPlan.milestones.find((m) =>
    m.description?.toLowerCase().includes("booking") || m.milestone === 1
  )
  const bookingPct = bookingMilestone?.percentage || 10
  const constructionPct = paymentPlan.constructionPercent || 50
  const postHandoverPct = paymentPlan.postHandoverPercent || 40

  return calculateUnitMetricsUtil({
    totalPrice: unit.totalPrice,
    constructionPercent: constructionPct,
    postHandoverPercent: postHandoverPct,
    bookingPercent: bookingPct,
  })
}

function MetricCell({ label, value, highlight, best }: { label: string; value: string | number; highlight?: boolean; best?: boolean }) {
  return (
    <div className={cn(
      "py-2 px-3 rounded-md text-center",
      best && "bg-emerald-50 ring-1 ring-emerald-200",
      highlight && !best && "bg-blue-50"
    )}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn(
        "text-sm font-semibold",
        best && "text-emerald-700"
      )}>
        {typeof value === "number" ? value.toLocaleString() : value}
        {best && <Star className="inline size-3 ml-1 text-emerald-500" />}
      </div>
    </div>
  )
}

export function OffPlanUnitComparison({ project, units, paymentPlan, onSelectBest }: OffPlanUnitComparisonProps) {
  if (units.length < 2) return null

  const unitsWithMetrics = units.map((unit) => ({
    unit,
    metrics: calculateUnitMetrics(unit, paymentPlan),
  }))

  // Determine "best" for each metric
  const bestPsf = Math.min(...unitsWithMetrics.map((u) => u.unit.pricePerSqft))
  const bestSize = Math.max(...unitsWithMetrics.map((u) => u.unit.sizeSqft))
  const bestRoi = Math.max(...unitsWithMetrics.map((u) => u.metrics.roiOnCashDeployed))
  const bestPrice = Math.min(...unitsWithMetrics.map((u) => u.unit.totalPrice))

  // Overall scoring: lower PSF + higher size + higher ROI = better
  const scored = unitsWithMetrics.map((u) => {
    let score = 0
    // Price per sqft score (lower is better, max 30)
    const psfRange = Math.max(...units.map((x) => x.pricePerSqft)) - bestPsf
    if (psfRange > 0) {
      score += 30 * (1 - (u.unit.pricePerSqft - bestPsf) / psfRange)
    } else {
      score += 30
    }
    // Size score (bigger is better, max 25)
    if (bestSize > 0) {
      score += 25 * (u.unit.sizeSqft / bestSize)
    }
    // ROI score (higher is better, max 25)
    const maxRoi = Math.max(...unitsWithMetrics.map((x) => x.metrics.roiOnCashDeployed))
    if (maxRoi > 0) {
      score += 25 * (u.metrics.roiOnCashDeployed / maxRoi)
    }
    // Views bonus (max 20)
    const hasViews = u.unit.views && u.unit.views.toLowerCase() !== "n/a"
    if (hasViews) score += 10
    // Higher floor bonus
    score += Math.min(10, u.unit.level / 5)

    return { ...u, score: Math.round(score) }
  }).sort((a, b) => b.score - a.score)

  const bestUnit = scored[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              Unit Comparison Analysis
            </CardTitle>
            <CardDescription>
              Comparing {units.length} selected units from {project.projectName}
            </CardDescription>
          </div>
          {bestUnit && (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
              <Star className="size-3 mr-1" />
              Best: {bestUnit.unit.unitNumber}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Side-by-side comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-32">Metric</th>
                {scored.map((s) => (
                  <th key={s.unit.unitNumber} className="text-center py-2 px-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold">{s.unit.unitNumber}</span>
                      <Badge variant={s === bestUnit ? "default" : "outline"} className="text-[10px]">
                        Score: {s.score}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Unit Basics */}
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Type</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center">
                    <Badge variant="outline">{s.unit.type}</Badge>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Level</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center font-medium">
                    {s.unit.level}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Size</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className={cn(
                    "py-2 px-3 text-center font-medium",
                    s.unit.sizeSqft === bestSize && "text-emerald-700 bg-emerald-50"
                  )}>
                    {s.unit.sizeSqft.toLocaleString()} sqft
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Views</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center text-xs">
                    {s.unit.views || "—"}
                  </td>
                ))}
              </tr>

              {/* Pricing */}
              <tr className="bg-muted/30">
                <td colSpan={scored.length + 1} className="py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pricing
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Total Price</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className={cn(
                    "py-2 px-3 text-center font-semibold",
                    s.unit.totalPrice === bestPrice && "text-emerald-700 bg-emerald-50"
                  )}>
                    {formatAED(s.unit.totalPrice)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Price/sqft</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className={cn(
                    "py-2 px-3 text-center font-medium",
                    s.unit.pricePerSqft === bestPsf && "text-emerald-700 bg-emerald-50"
                  )}>
                    AED {s.unit.pricePerSqft.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Investment Returns */}
              <tr className="bg-muted/30">
                <td colSpan={scored.length + 1} className="py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Projected Returns
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Est. Completion Value</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center font-medium">
                    {formatAED(s.metrics.estimatedCompletionValue)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Capital Gain %</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center font-medium text-emerald-600">
                    +{s.metrics.capitalGainPct}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Est. Monthly Rent</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center font-medium">
                    {formatAED(s.metrics.monthlyRent)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">ROI on Cash Deployed</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className={cn(
                    "py-2 px-3 text-center font-semibold",
                    s.metrics.roiOnCashDeployed === bestRoi && "text-emerald-700 bg-emerald-50"
                  )}>
                    {s.metrics.roiOnCashDeployed}%
                  </td>
                ))}
              </tr>

              {/* Cash Flow */}
              <tr className="bg-muted/30">
                <td colSpan={scored.length + 1} className="py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment Plan
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">Booking ({paymentPlan.milestones.find((m) => m.description?.toLowerCase().includes("booking"))?.percentage || 10}%)</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center">
                    {formatAED(s.metrics.bookingAmount)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">During Construction</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center">
                    {formatAED(s.metrics.constructionAmount)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-xs text-muted-foreground">On Handover</td>
                {scored.map((s) => (
                  <td key={s.unit.unitNumber} className="py-2 px-3 text-center">
                    {formatAED(s.metrics.handoverAmount)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <Separator />

        {/* Recommendation */}
        {bestUnit && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-emerald-800">
                  Recommended: Unit {bestUnit.unit.unitNumber}
                </h4>
                <p className="text-sm text-emerald-700 mt-1">
                  Best overall value with {bestUnit.unit.pricePerSqft === bestPsf ? "lowest price per sqft" : "strong pricing"},
                  {" "}{bestUnit.unit.sizeSqft === bestSize ? "largest size" : `${bestUnit.unit.sizeSqft.toLocaleString()} sqft`},
                  {" "}and {bestUnit.metrics.roiOnCashDeployed}% ROI on cash deployed.
                  {bestUnit.unit.views && ` Features ${bestUnit.unit.views} views.`}
                </p>
                {onSelectBest && (
                  <button
                    onClick={() => onSelectBest(bestUnit.unit)}
                    className="mt-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Select this unit for IC Memo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
