"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Building2,
  Calendar,
  MapPin,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Target,
  DollarSign,
  BarChart3,
  Shield,
  FileText,
  Loader2,
  ArrowRight,
  Clock,
  Percent,
  Home,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PaymentPlanChart, PaymentPlanChartCompact } from "@/components/charts/payment-plan-chart"
import { ScoreRadarChart } from "@/components/charts/score-radar-chart"
import type {
  OffPlanProject,
  OffPlanUnit,
  OffPlanPaymentPlan,
  OffPlanEvaluationResult,
  OffPlanMemoContent,
} from "@/lib/types"

interface EnhancedOffPlanPdfData {
  cashFlowTable?: { rows: { year: number; grossRent: number; expenses: number; mortgagePayment: number; netCashFlow: number; propertyValue: number; cumulativeReturn: number }[]; exitProceeds: number; totalProfit: number; holdPeriod: number }
  operatingExpenses?: { serviceCharge: number; managementFee: number; maintenanceReserve: number; insurance: number; totalAnnual: number; grossRent: number; netRent: number; serviceChargePerSqft?: number; notes?: string }
  scenarios?: { label: string; annualRent: number; occupancy: number; exitPrice: number; fiveYearIrr: number; netProfit: number }[]
  comparables?: { name: string; distance: string; price: number; pricePerSqft: number; size?: string; date: string; source?: string; type?: string; note?: string }[]
  growth?: { narrative: string; neighborhoodTrend: string; annualGrowthBase: number; annualGrowthConservative: number; annualGrowthUpside: number; projectedValue1Y: number; projectedValue3Y: number; projectedValue5Y: number; drivers: string[]; sensitivities: string[] }
  returnBridge?: { purchasePrice: number; dldRatePct: number; dldFee: number; brokerFeePct: number; brokerFee: number; totalProjectCost: number; mortgageLtvPct: number; mortgageAmount: number; equityInvested: number; annualInterestRatePct: number; annualInterest: number; resalePrice: number; netSaleProceedsAfterMortgage: number; netProfitAfterInterest: number; roiOnEquityPct: number; assumptions: string }
  strategy?: { plan: string; holdPeriod: number; exit: string; focusPoints: string[] }
}

interface OffPlanMemoDisplayProps {
  project: OffPlanProject
  selectedUnit: OffPlanUnit
  paymentPlan: OffPlanPaymentPlan
  evaluation: OffPlanEvaluationResult & { enhancedPdfData?: EnhancedOffPlanPdfData }
  onSave: (notes: string) => Promise<void>
  onReset: () => void
  isSaving?: boolean
  savedMemoId?: string | null
  propertyImages?: string[]
}

export function OffPlanMemoDisplay({
  project,
  selectedUnit,
  paymentPlan,
  evaluation,
  onSave,
  onReset,
  isSaving = false,
  savedMemoId,
  propertyImages = [],
}: OffPlanMemoDisplayProps) {
  const [notes, setNotes] = React.useState("")
  const memo = evaluation.memoContent
  const enhanced = evaluation.enhancedPdfData

  const formatCurrency = (value: number) =>
    `AED ${value.toLocaleString()}`

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case "strong_buy":
        return <Badge className="bg-green-600">Strong Buy</Badge>
      case "buy":
        return <Badge className="bg-green-500">Buy</Badge>
      case "hold":
        return <Badge variant="secondary">Hold</Badge>
      case "pass":
        return <Badge variant="destructive">Pass</Badge>
      default:
        return <Badge variant="outline">{rec}</Badge>
    }
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case "PROCEED":
        return (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-6 w-6" />
            <span className="text-2xl font-bold">PROCEED</span>
          </div>
        )
      case "CONDITIONAL":
        return (
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-2xl font-bold">CONDITIONAL</span>
          </div>
        )
      case "PASS":
        return (
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="h-6 w-6" />
            <span className="text-2xl font-bold">PASS</span>
          </div>
        )
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "low":
        return <Badge className="bg-green-100 text-green-700">Low</Badge>
      case "medium":
        return <Badge className="bg-amber-100 text-amber-700">Medium</Badge>
      case "high":
        return <Badge className="bg-red-100 text-red-700">High</Badge>
      default:
        return <Badge variant="outline">{level}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">
              {selectedUnit.type} - {project.projectName}
            </h2>
            {getRecommendationBadge(evaluation.recommendation)}
            <Badge variant="outline">Score: {evaluation.overallScore}/100</Badge>
          </div>
          <p className="text-gray-600">{evaluation.headline}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {project.developer}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {project.location.area}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {project.completionDate}
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="flex items-center gap-4 rounded-lg border bg-gray-50 p-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {memo.financialProjections.expectedAppreciation.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Expected Appreciation</div>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div className="text-center">
            <div className="text-xl font-bold">
              {memo.financialProjections.projectedRentalYieldGross}%
            </div>
            <div className="text-xs text-gray-500">Projected Yield</div>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div className="text-center">
            <div className="text-xl font-bold text-amber-600">
              {paymentPlan.postHandoverPercent}%
            </div>
            <div className="text-xs text-gray-500">On Completion</div>
          </div>
        </div>
      </div>

      {/* Property Images */}
      {propertyImages.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: propertyImages.length === 1 ? "1fr" : propertyImages.length === 2 ? "1fr 1fr" : "2fr 1fr 1fr" }}>
          {propertyImages.slice(0, 5).map((img, idx) => (
            <div key={idx} className={`relative overflow-hidden rounded-lg bg-muted ${idx === 0 && propertyImages.length >= 3 ? "row-span-2" : ""}`} style={{ height: idx === 0 ? (propertyImages.length >= 3 ? "320px" : "200px") : "156px" }}>
              <Image
                src={img}
                alt={`${project.projectName} - ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
                unoptimized
                onError={(e) => {
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    e.currentTarget.style.display = "none"
                    parent.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>'
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Project Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">{memo.projectSummary}</p>
              {memo.projectHighlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {memo.projectHighlights.map((h, idx) => (
                    <Badge key={idx} variant="outline">{h}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unit Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Home className="h-5 w-5 text-green-600" />
                Unit Analysis
              </CardTitle>
              <CardDescription>Unit {selectedUnit.unitNumber} • Level {selectedUnit.level}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-lg font-semibold">{selectedUnit.type}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Size</p>
                  <p className="text-lg font-semibold">{selectedUnit.sizeSqft.toLocaleString()} sqft</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Price / sqft</p>
                  <p className="text-lg font-semibold">AED {selectedUnit.pricePerSqft.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border bg-green-50 p-3">
                  <p className="text-xs text-green-600">Total Price</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(selectedUnit.totalPrice)}</p>
                </div>
              </div>
              {selectedUnit.views && (
                <div className="mt-4 text-sm">
                  <span className="text-gray-500">Views: </span>
                  <span className="font-medium">{selectedUnit.views}</span>
                </div>
              )}
              <p className="mt-4 text-sm text-gray-600">{memo.unitAnalysis.valueAssessment}</p>
            </CardContent>
          </Card>

          {/* Payment Plan Chart */}
          <PaymentPlanChart
            cashFlowSchedule={memo.paymentPlanAnalysis.cashFlowSchedule}
            totalPrice={selectedUnit.totalPrice}
          />

          {/* Developer Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Developer Assessment
              </CardTitle>
              <CardDescription>{project.developer}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <span className="text-2xl font-bold text-amber-700">
                    {memo.developerAssessment.grade}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{memo.developerAssessment.score}/100</span>
                    <Badge variant={memo.developerAssessment.financialStability === "strong" ? "default" : "secondary"}>
                      {memo.developerAssessment.financialStability} stability
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{memo.developerAssessment.trackRecordSummary}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {memo.developerAssessment.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {memo.developerAssessment.concerns.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Concerns</h4>
                    <ul className="space-y-1">
                      {memo.developerAssessment.concerns.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Financial Projections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">Purchase Price</p>
                  <p className="text-xl font-bold">{formatCurrency(memo.financialProjections.purchasePrice)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">Est. Completion Value</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(memo.financialProjections.estimatedCompletionValue)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">Expected Gain</p>
                  <p className="text-xl font-bold text-green-600">
                    +{formatCurrency(memo.financialProjections.expectedAppreciationAed)}
                  </p>
                  <p className="text-xs text-green-600">
                    +{memo.financialProjections.expectedAppreciation.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">Est. Annual Rent</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(memo.financialProjections.estimatedAnnualRent)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">Gross Rental Yield</p>
                  <p className="text-lg font-semibold">
                    {memo.financialProjections.projectedRentalYieldGross}%
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">Net Rental Yield</p>
                  <p className="text-lg font-semibold">
                    {memo.financialProjections.projectedRentalYieldNet}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Return Bridge */}
          {enhanced?.returnBridge && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Investment Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Purchase Price</span><span className="font-semibold">{formatCurrency(enhanced.returnBridge.purchasePrice)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">DLD Fee ({enhanced.returnBridge.dldRatePct}%)</span><span className="font-semibold">{formatCurrency(enhanced.returnBridge.dldFee)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Broker Fee ({enhanced.returnBridge.brokerFeePct}%)</span><span className="font-semibold">{formatCurrency(enhanced.returnBridge.brokerFee)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>Total Project Cost</span><span>{formatCurrency(enhanced.returnBridge.totalProjectCost)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Equity Invested</span><span className="font-semibold">{formatCurrency(enhanced.returnBridge.equityInvested)}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-gray-500">Projected Resale ({enhanced.cashFlowTable?.holdPeriod || 5}Y post-completion)</span><span className="font-semibold text-green-600">{formatCurrency(enhanced.returnBridge.resalePrice)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Net Profit</span><span className="font-bold text-green-600">{formatCurrency(enhanced.returnBridge.netProfitAfterInterest)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">ROI on Equity</span><span className="font-bold text-green-600">{enhanced.returnBridge.roiOnEquityPct}%</span></div>
                  <p className="text-xs text-gray-400 mt-2">{enhanced.returnBridge.assumptions}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Operating Expenses */}
          {enhanced?.operatingExpenses && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                  Annual Operating Expenses (Post-Completion)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Service Charge ({enhanced.operatingExpenses.serviceChargePerSqft ? `AED ${enhanced.operatingExpenses.serviceChargePerSqft}/sqft` : "est."})</span><span className="font-semibold">{formatCurrency(enhanced.operatingExpenses.serviceCharge)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Property Management (5%)</span><span className="font-semibold">{formatCurrency(enhanced.operatingExpenses.managementFee)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Maintenance Reserve (1%)</span><span className="font-semibold">{formatCurrency(enhanced.operatingExpenses.maintenanceReserve)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Insurance (0.1%)</span><span className="font-semibold">{formatCurrency(enhanced.operatingExpenses.insurance)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-red-600"><span>Total Annual Expenses</span><span>{formatCurrency(enhanced.operatingExpenses.totalAnnual)}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-gray-500">Gross Rent</span><span className="font-semibold">{formatCurrency(enhanced.operatingExpenses.grossRent)}</span></div>
                  <div className="flex justify-between font-semibold text-green-600"><span>Net Rent</span><span>{formatCurrency(enhanced.operatingExpenses.netRent)}</span></div>
                  {enhanced.operatingExpenses.notes && <p className="text-xs text-gray-400">{enhanced.operatingExpenses.notes}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Post-Completion Cash Flow Table */}
          {enhanced?.cashFlowTable && enhanced.cashFlowTable.rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Post-Completion Cash Flow ({enhanced.cashFlowTable.holdPeriod}Y)
                </CardTitle>
                <CardDescription>Year-by-year rental income, expenses, and property value after handover</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500">
                        <th className="text-left py-2 pr-4">Year</th>
                        <th className="text-right py-2 px-2">Gross Rent</th>
                        <th className="text-right py-2 px-2">Expenses</th>
                        <th className="text-right py-2 px-2">Net Cash Flow</th>
                        <th className="text-right py-2 px-2">Property Value</th>
                        <th className="text-right py-2 pl-2">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enhanced.cashFlowTable.rows.map((row) => (
                        <tr key={row.year} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium">Y{row.year}</td>
                          <td className="text-right py-2 px-2 text-green-600">{formatCurrency(row.grossRent)}</td>
                          <td className="text-right py-2 px-2 text-red-600">-{formatCurrency(row.expenses)}</td>
                          <td className={`text-right py-2 px-2 font-semibold ${row.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(row.netCashFlow)}</td>
                          <td className="text-right py-2 px-2">{formatCurrency(row.propertyValue)}</td>
                          <td className={`text-right py-2 pl-2 ${row.cumulativeReturn >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(row.cumulativeReturn)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-2 pr-4">Exit</td>
                        <td colSpan={2} className="text-right py-2 px-2 text-gray-500">Sale Proceeds</td>
                        <td className="text-right py-2 px-2 text-green-700">{formatCurrency(enhanced.cashFlowTable.exitProceeds)}</td>
                        <td className="text-right py-2 px-2"></td>
                        <td className="text-right py-2 pl-2 text-green-700">{formatCurrency(enhanced.cashFlowTable.totalProfit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scenario Analysis */}
          {enhanced?.scenarios && enhanced.scenarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Scenario Analysis
                </CardTitle>
                <CardDescription>Upside / Base / Downside projections varying rent, occupancy, and exit price</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500">
                        <th className="text-left py-2 pr-4">Scenario</th>
                        <th className="text-right py-2 px-2">Annual Rent</th>
                        <th className="text-right py-2 px-2">Occupancy</th>
                        <th className="text-right py-2 px-2">Exit Price</th>
                        <th className="text-right py-2 px-2">5Y IRR</th>
                        <th className="text-right py-2 pl-2">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enhanced.scenarios.map((s) => (
                        <tr key={s.label} className={`border-b border-gray-100 ${s.label === "Base" ? "bg-gray-50 font-medium" : ""}`}>
                          <td className="py-2 pr-4">
                            <Badge variant={s.label === "Upside" ? "default" : s.label === "Downside" ? "destructive" : "secondary"} className="text-xs">
                              {s.label}
                            </Badge>
                          </td>
                          <td className="text-right py-2 px-2">{formatCurrency(s.annualRent)}</td>
                          <td className="text-right py-2 px-2">{s.occupancy}%</td>
                          <td className="text-right py-2 px-2">{formatCurrency(s.exitPrice)}</td>
                          <td className={`text-right py-2 px-2 font-semibold ${s.fiveYearIrr >= 0 ? "text-green-600" : "text-red-600"}`}>{s.fiveYearIrr}%</td>
                          <td className={`text-right py-2 pl-2 font-semibold ${s.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(s.netProfit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Growth Projections */}
          {enhanced?.growth && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Future Value Outlook (Post-Completion)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{enhanced.growth.narrative}</p>
                <p className="text-sm text-gray-500 italic">{enhanced.growth.neighborhoodTrend}</p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-gray-500">1 Year</p>
                    <p className="text-lg font-bold">{formatCurrency(enhanced.growth.projectedValue1Y)}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-gray-500">3 Years</p>
                    <p className="text-lg font-bold">{formatCurrency(enhanced.growth.projectedValue3Y)}</p>
                  </div>
                  <div className="rounded-lg border bg-green-50 p-3 text-center">
                    <p className="text-xs text-green-600">5 Years</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(enhanced.growth.projectedValue5Y)}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Conservative</p>
                    <p className="font-semibold">{enhanced.growth.annualGrowthConservative}%/yr</p>
                  </div>
                  <div className="rounded-lg border bg-blue-50 p-3 text-center">
                    <p className="text-xs text-blue-600">Base</p>
                    <p className="font-semibold text-blue-700">{enhanced.growth.annualGrowthBase}%/yr</p>
                  </div>
                  <div className="rounded-lg border bg-green-50 p-3 text-center">
                    <p className="text-xs text-green-600">Upside</p>
                    <p className="font-semibold text-green-700">{enhanced.growth.annualGrowthUpside}%/yr</p>
                  </div>
                </div>

                {enhanced.growth.drivers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Growth Drivers</h4>
                    <ul className="space-y-1">
                      {enhanced.growth.drivers.map((d, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {enhanced.growth.sensitivities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Sensitivities</h4>
                    <ul className="space-y-1">
                      {enhanced.growth.sensitivities.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Strategy */}
          {enhanced?.strategy && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Investment Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{enhanced.strategy.plan}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Hold Period</p>
                    <p className="font-semibold">{enhanced.strategy.holdPeriod} years (incl. construction)</p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Exit Strategy</p>
                    <p className="font-semibold text-sm">{enhanced.strategy.exit}</p>
                  </div>
                </div>
                {enhanced.strategy.focusPoints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Key Focus Points</h4>
                    <ul className="space-y-1">
                      {enhanced.strategy.focusPoints.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced DLD Comparables */}
          {enhanced?.comparables && enhanced.comparables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Market Comparables (DLD + AI)
                </CardTitle>
                <CardDescription>{enhanced.comparables.length} comparable transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500">
                        <th className="text-left py-2 pr-4">Property</th>
                        <th className="text-right py-2 px-2">Price</th>
                        <th className="text-right py-2 px-2">AED/sqft</th>
                        <th className="text-right py-2 px-2">Date</th>
                        <th className="text-right py-2 pl-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enhanced.comparables.slice(0, 8).map((c, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2 pr-4">
                            <p className="font-medium">{c.name}</p>
                            {c.note && <p className="text-xs text-gray-500">{c.note}</p>}
                          </td>
                          <td className="text-right py-2 px-2">{formatCurrency(c.price)}</td>
                          <td className="text-right py-2 px-2">{c.pricePerSqft > 0 ? `AED ${c.pricePerSqft.toLocaleString()}` : "—"}</td>
                          <td className="text-right py-2 px-2 text-gray-500">{c.date}</td>
                          <td className="text-right py-2 pl-2">
                            <Badge variant={c.source === "DLD" ? "default" : "secondary"} className="text-xs">{c.source}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Location Analysis
              </CardTitle>
              <CardDescription>Grade {memo.locationAnalysis.grade} • {memo.locationAnalysis.areaProfile}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {memo.locationAnalysis.highlights.length > 0 && (
                <ul className="space-y-2">
                  {memo.locationAnalysis.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}

              {Object.keys(memo.locationAnalysis.proximity).length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(memo.locationAnalysis.proximity).map(([key, value]) => (
                    <div key={key} className="rounded-lg border bg-gray-50 p-3 text-sm">
                      <p className="text-xs text-gray-500">{key}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Comparables (fallback when no enhanced DLD comparables) */}
          {!(enhanced?.comparables && enhanced.comparables.length > 0) && memo.marketComparables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Market Comparables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {memo.marketComparables.map((comp, idx) => (
                    <div key={idx} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{comp.project}</p>
                          <p className="text-xs text-gray-500">{comp.developer} • {comp.area}</p>
                        </div>
                        {comp.completionStatus && (
                          <Badge variant={comp.completionStatus === "completed" ? "default" : "secondary"}>
                            {comp.completionStatus.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Price/sqft</p>
                          <p className="font-medium">AED {comp.pricePerSqft?.toLocaleString() ?? "N/A"}</p>
                        </div>
                        {comp.completionDate && (
                          <div>
                            <p className="text-xs text-gray-500">Completion</p>
                            <p className="font-medium">{comp.completionDate}</p>
                          </div>
                        )}
                        {comp.appreciation && (
                          <div>
                            <p className="text-xs text-gray-500">Appreciation</p>
                            <p className="font-medium text-green-600">+{comp.appreciation}%</p>
                          </div>
                        )}
                      </div>
                      {comp.note && <p className="mt-2 text-xs text-gray-500">{comp.note}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Risk Assessment
              </CardTitle>
              <CardDescription>
                Overall Risk Level: {getRiskBadge(memo.overallRiskLevel)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {memo.riskAssessment.map((risk, idx) => (
                  <div key={idx} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{risk.category}</span>
                      {getRiskBadge(risk.level)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                    <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-2">
                      <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Mitigation:</strong> {risk.mitigation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Investment Thesis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Investment Thesis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">{memo.investmentThesis}</p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Key Strengths</h4>
                  <ul className="space-y-1">
                    {memo.keyStrengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Key Considerations</h4>
                  <ul className="space-y-1">
                    {memo.keyConsiderations.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final Recommendation */}
          <Card className={
            memo.recommendation.decision === "PROCEED"
              ? "border-green-200 bg-green-50"
              : memo.recommendation.decision === "CONDITIONAL"
              ? "border-amber-200 bg-amber-50"
              : "border-red-200 bg-red-50"
          }>
            <CardHeader>
              <CardTitle className="text-lg">Final Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getDecisionBadge(memo.recommendation.decision)}
              <p className="text-gray-700">{memo.recommendation.reasoning}</p>
              
              {memo.recommendation.conditions && memo.recommendation.conditions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Conditions</h4>
                  <ul className="space-y-1">
                    {memo.recommendation.conditions.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {memo.recommendation.suggestedNegotiationPoints && memo.recommendation.suggestedNegotiationPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Suggested Negotiation Points</h4>
                  <ul className="space-y-1">
                    {memo.recommendation.suggestedNegotiationPoints.map((p, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <DollarSign className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Score Radar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score Analysis</CardTitle>
              <CardDescription>Investment criteria breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreRadarChart
                data={[
                  { factor: "Developer", score: evaluation.factors.developerCredibility, maxScore: 25 },
                  { factor: "Location", score: evaluation.factors.locationPremium, maxScore: 25 },
                  { factor: "Payment Plan", score: evaluation.factors.paymentPlanAttractiveness, maxScore: 25 },
                  { factor: "Appreciation", score: evaluation.factors.appreciationPotential, maxScore: 25 },
                ]}
              />
              <Separator />
              <div className="space-y-2">
                {[
                  { key: "developerCredibility", label: "Developer Credibility" },
                  { key: "locationPremium", label: "Location Premium" },
                  { key: "paymentPlanAttractiveness", label: "Payment Plan" },
                  { key: "appreciationPotential", label: "Appreciation Potential" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold">
                      {evaluation.factors[key as keyof typeof evaluation.factors]}/25
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold">Overall Score</span>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-24 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-3 rounded-full bg-green-500"
                      style={{ width: `${evaluation.overallScore}%` }}
                    />
                  </div>
                  <span className="font-bold text-green-600">{evaluation.overallScore}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentPlanChartCompact
                cashFlowSchedule={memo.paymentPlanAnalysis.cashFlowSchedule}
                totalPrice={selectedUnit.totalPrice}
              />
            </CardContent>
          </Card>

          {/* Save Section */}
          {!savedMemoId ? (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-green-600" />
                  Save as IC Memo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes for this off-plan IC memo..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSaving}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => onSave(notes)}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save to IC Memos
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-6 text-center space-y-4">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">IC Memo Saved!</h3>
                  <p className="text-sm text-green-700">Ready for review.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link href={`/memos/${savedMemoId}`}>View Memo</Link>
                  </Button>
                  <Button variant="outline" onClick={onReset}>
                    Analyze Another Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Source Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium">Off-Plan Brochure</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Project</span>
                <span className="font-medium">{project.projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Developer</span>
                <span className="font-medium">{project.developer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unit</span>
                <span className="font-medium">{selectedUnit.unitNumber}</span>
              </div>
              <Separator />
              <div className="text-xs text-gray-400">
                Generated: {new Date(memo.generatedAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
