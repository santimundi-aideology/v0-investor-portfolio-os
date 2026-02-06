"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Building2,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Loader2,
  MapPin,
  Bed,
  Ruler,
  Search,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { getPropertyById, mockProperties } from "@/lib/mock-data"
import type { Property } from "@/lib/types"

function formatAED(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(2)}M`
  if (Math.abs(amount) >= 1_000) return `AED ${(amount / 1_000).toFixed(0)}K`
  return `AED ${amount.toLocaleString()}`
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

interface SimulationResult {
  year: number
  propertyValue: number
  cumulativeRent: number
  cumulativeExpenses: number
  netCashFlow: number
  totalReturn: number
  totalReturnPct: number
  equityMultiple: number
  annualizedIrr: number
  // Annual breakdown for cash-flow chart
  annualRentIncome: number
  annualExpenses: number
  annualMortgage: number
  annualNetCashFlow: number
  // Return decomposition for waterfall
  capitalAppreciation: number
  mortgagePaydown: number
  netRentalProfit: number
  exitCosts: number
  outstandingLoan: number
}

function calculateSimulation(params: {
  purchasePrice: number
  downPaymentPct: number
  mortgageRate: number
  mortgageTerm: number
  annualRentIncome: number
  rentalGrowthPct: number
  occupancyRate: number
  annualExpensesPct: number
  appreciationPct: number
  holdPeriod: number
  exitCostPct: number
  dldFee: number
}): SimulationResult[] {
  const {
    purchasePrice,
    downPaymentPct,
    mortgageRate,
    mortgageTerm,
    annualRentIncome,
    rentalGrowthPct,
    occupancyRate,
    annualExpensesPct,
    appreciationPct,
    holdPeriod,
    exitCostPct,
    dldFee,
  } = params

  const downPayment = purchasePrice * (downPaymentPct / 100)
  const loanAmount = purchasePrice - downPayment
  const dldFeeAmount = purchasePrice * (dldFee / 100)
  const initialInvestment = downPayment + dldFeeAmount

  // Monthly mortgage payment
  const monthlyRate = mortgageRate / 100 / 12
  const totalPayments = mortgageTerm * 12
  const monthlyPayment = loanAmount > 0
    ? monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : loanAmount / totalPayments // 0% interest: divide principal evenly
    : 0
  const annualMortgagePayment = monthlyPayment * 12

  const results: SimulationResult[] = []
  let cumulativeRent = 0
  let cumulativeExpenses = 0

  for (let year = 1; year <= holdPeriod; year++) {
    const propertyValue = purchasePrice * Math.pow(1 + appreciationPct / 100, year)
    const yearlyRent = annualRentIncome * Math.pow(1 + rentalGrowthPct / 100, year - 1) * (occupancyRate / 100)
    const yearlyOpex = propertyValue * (annualExpensesPct / 100)
    const yearlyExpenses = yearlyOpex + annualMortgagePayment

    cumulativeRent += yearlyRent
    cumulativeExpenses += yearlyExpenses

    const netCashFlow = cumulativeRent - cumulativeExpenses
    const yearExitCosts = propertyValue * (exitCostPct / 100)

    // Outstanding mortgage balance
    const remainingPayments = Math.max(0, totalPayments - year * 12)
    const outstandingLoan = remainingPayments > 0
      ? loanAmount * (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, year * 12)) / (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0

    const netSaleProceeds = propertyValue - outstandingLoan - yearExitCosts
    const totalReturn = netSaleProceeds + netCashFlow - initialInvestment
    const totalReturnPct = initialInvestment > 0 ? (totalReturn / initialInvestment) * 100 : 0
    const equityMultiple = initialInvestment > 0 ? (netSaleProceeds + netCashFlow) / initialInvestment : 0

    // Simplified IRR approximation
    const annualizedIrr = year > 0 ? (Math.pow(Math.max(0.001, equityMultiple), 1 / year) - 1) * 100 : 0

    // Return decomposition
    const capitalAppreciation = propertyValue - purchasePrice
    const mortgagePaydown = loanAmount - outstandingLoan
    const netRentalProfit = cumulativeRent - (cumulativeExpenses - annualMortgagePayment * year) // rent minus opex only

    results.push({
      year,
      propertyValue: Math.round(propertyValue),
      cumulativeRent: Math.round(cumulativeRent),
      cumulativeExpenses: Math.round(cumulativeExpenses),
      netCashFlow: Math.round(netCashFlow),
      totalReturn: Math.round(totalReturn),
      totalReturnPct: Math.round(totalReturnPct * 10) / 10,
      equityMultiple: Math.round(equityMultiple * 100) / 100,
      annualizedIrr: Math.round(annualizedIrr * 10) / 10,
      // Annual breakdown
      annualRentIncome: Math.round(yearlyRent),
      annualExpenses: Math.round(yearlyOpex),
      annualMortgage: Math.round(annualMortgagePayment),
      annualNetCashFlow: Math.round(yearlyRent - yearlyExpenses),
      // Return decomposition
      capitalAppreciation: Math.round(capitalAppreciation),
      mortgagePaydown: Math.round(mortgagePaydown),
      netRentalProfit: Math.round(netRentalProfit),
      exitCosts: Math.round(yearExitCosts),
      outstandingLoan: Math.round(outstandingLoan),
    })
  }

  return results
}

function SliderWithValue({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  prefix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  suffix?: string
  prefix?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-semibold tabular-nums">
          {prefix}{value.toLocaleString()}{suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  )
}

/** Estimate annual rent from ROI% and price, or default to ~6% yield */
function estimateAnnualRent(property: Property): number {
  if (property.roi && property.price) {
    return Math.round((property.roi / 100) * property.price)
  }
  // Default 6% gross yield estimate
  return Math.round(property.price * 0.06)
}

export default function ROICalculatorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ROICalculatorContent />
    </Suspense>
  )
}

function ROICalculatorContent() {
  const searchParams = useSearchParams()
  const propertyId = searchParams.get("propertyId")

  // Load property if propertyId is present
  const [property, setProperty] = React.useState<Property | null>(null)
  const [loading, setLoading] = React.useState(!!propertyId)

  // Property search for standalone mode
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showPropertyPicker, setShowPropertyPicker] = React.useState(!propertyId)

  React.useEffect(() => {
    if (!propertyId) {
      setLoading(false)
      return
    }
    // Try mock data first
    const found = getPropertyById(propertyId)
    if (found) {
      setProperty(found)
      setShowPropertyPicker(false)
    }
    setLoading(false)
  }, [propertyId])

  // Input parameters - defaults or property-derived
  const [purchasePrice, setPurchasePrice] = React.useState(2_500_000)
  const [downPaymentPct, setDownPaymentPct] = React.useState(25)
  const [mortgageRate, setMortgageRate] = React.useState(4.5)
  const [mortgageTerm, setMortgageTerm] = React.useState(25)
  const [annualRent, setAnnualRent] = React.useState(150_000)
  const [rentalGrowthPct, setRentalGrowthPct] = React.useState(3)
  const [occupancyRate, setOccupancyRate] = React.useState(92)
  const [expensesPct, setExpensesPct] = React.useState(2.5)
  const [appreciationPct, setAppreciationPct] = React.useState(5)
  const [holdPeriod, setHoldPeriod] = React.useState(5)
  const [exitCostPct, setExitCostPct] = React.useState(2)
  const [dldFee, setDldFee] = React.useState(4)
  const [initialized, setInitialized] = React.useState(false)

  // Pre-fill from property when loaded
  React.useEffect(() => {
    if (property && !initialized) {
      setPurchasePrice(property.price)
      setAnnualRent(estimateAnnualRent(property))
      setInitialized(true)
    }
  }, [property, initialized])

  // Select a property from the picker
  const selectProperty = (p: Property) => {
    setProperty(p)
    setPurchasePrice(p.price)
    setAnnualRent(estimateAnnualRent(p))
    setShowPropertyPicker(false)
    setSearchQuery("")
  }

  const filteredProperties = React.useMemo(() => {
    if (!searchQuery.trim()) return mockProperties.slice(0, 8)
    const q = searchQuery.toLowerCase()
    return mockProperties.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [searchQuery])

  const simulation = React.useMemo(
    () =>
      calculateSimulation({
        purchasePrice,
        downPaymentPct,
        mortgageRate,
        mortgageTerm,
        annualRentIncome: annualRent,
        rentalGrowthPct,
        occupancyRate,
        annualExpensesPct: expensesPct,
        appreciationPct,
        holdPeriod,
        exitCostPct,
        dldFee,
      }),
    [purchasePrice, downPaymentPct, mortgageRate, mortgageTerm, annualRent, rentalGrowthPct, occupancyRate, expensesPct, appreciationPct, holdPeriod, exitCostPct, dldFee]
  )

  const finalYear = simulation[simulation.length - 1]
  const downPayment = purchasePrice * (downPaymentPct / 100)
  const initialInvestment = downPayment + purchasePrice * (dldFee / 100)
  const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0
  const netYield = purchasePrice > 0 ? ((annualRent * (occupancyRate / 100) - purchasePrice * (expensesPct / 100)) / purchasePrice) * 100 : 0

  const handleReset = () => {
    if (property) {
      setPurchasePrice(property.price)
      setAnnualRent(estimateAnnualRent(property))
    } else {
      setPurchasePrice(2_500_000)
      setAnnualRent(150_000)
    }
    setDownPaymentPct(25)
    setMortgageRate(4.5)
    setMortgageTerm(25)
    setRentalGrowthPct(3)
    setOccupancyRate(92)
    setExpensesPct(2.5)
    setAppreciationPct(5)
    setHoldPeriod(5)
    setExitCostPct(2)
    setDldFee(4)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back to property link */}
      {property && (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/properties/${property.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {property.title}
          </Link>
        </Button>
      )}

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calculator className="size-5" />
            </span>
            <span>ROI Calculator</span>
          </span>
        }
        subtitle={
          property
            ? `Investment simulation for ${property.title}`
            : "Select a property or run a standalone simulation"
        }
        primaryAction={
          <div className="flex gap-2">
            {property && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProperty(null)
                  setShowPropertyPicker(true)
                  setInitialized(false)
                }}
              >
                Change Property
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="mr-1 size-3.5" />
              Reset
            </Button>
          </div>
        }
      />

      {/* Property Context Card */}
      {property && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{property.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {property.area}
                    </span>
                    {property.bedrooms && (
                      <span className="flex items-center gap-1">
                        <Bed className="size-3" />
                        {property.bedrooms} BR
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Ruler className="size-3" />
                      {property.size.toLocaleString()} sqft
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{formatAED(property.price)}</div>
                {property.roi && (
                  <Badge variant="secondary" className="text-xs">
                    Est. ROI {property.roi}%
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Picker (when no property selected) */}
      {showPropertyPicker && !property && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="size-4" />
              Select a Property
            </CardTitle>
            <CardDescription>
              Choose a property to run the ROI calculation, or skip to use manual inputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid gap-2 max-h-[320px] overflow-y-auto">
              {filteredProperties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProperty(p)}
                  className="flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 hover:border-primary/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{p.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="size-3" />
                        {p.area}
                      </span>
                      {p.bedrooms && (
                        <span>{p.bedrooms} BR</span>
                      )}
                      <span>{p.size.toLocaleString()} sqft</span>
                    </div>
                  </div>
                  <div className="text-right pl-3 shrink-0">
                    <div className="font-semibold text-sm">{formatAED(p.price)}</div>
                    {p.roi && (
                      <div className="text-xs text-emerald-600">{p.roi}% ROI</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPropertyPicker(false)}
                className="text-xs text-muted-foreground"
              >
                Skip &mdash; use manual inputs instead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Results Panel */}
        <div className="space-y-6">
          {/* Key KPIs */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Return</div>
                <div className={cn(
                  "text-2xl font-bold mt-1",
                  finalYear?.totalReturn >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {formatAED(finalYear?.totalReturn || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPercent(finalYear?.totalReturnPct || 0)} on equity
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Equity Multiple</div>
                <div className="text-2xl font-bold mt-1">
                  {finalYear?.equityMultiple.toFixed(2)}x
                </div>
                <div className="text-xs text-muted-foreground">
                  On {formatAED(initialInvestment)} invested
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Annualized IRR</div>
                <div className={cn(
                  "text-2xl font-bold mt-1",
                  (finalYear?.annualizedIrr || 0) >= 8 ? "text-emerald-600" : "text-amber-600"
                )}>
                  {finalYear?.annualizedIrr}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Over {holdPeriod} years
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Exit Value</div>
                <div className="text-2xl font-bold mt-1">
                  {formatAED(finalYear?.propertyValue || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Net Yield: {netYield.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Year-by-Year Projection Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="size-4" />
                Year-by-Year Projection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 px-3 text-left">Year</th>
                      <th className="py-2 px-3 text-right">Property Value</th>
                      <th className="py-2 px-3 text-right">Cumul. Rent</th>
                      <th className="py-2 px-3 text-right">Cumul. Expenses</th>
                      <th className="py-2 px-3 text-right">Net Cash Flow</th>
                      <th className="py-2 px-3 text-right">Total Return</th>
                      <th className="py-2 px-3 text-right">Equity Multiple</th>
                      <th className="py-2 px-3 text-right">IRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {simulation.map((row) => (
                      <tr key={row.year} className="hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">Y{row.year}</td>
                        <td className="py-2 px-3 text-right">{formatAED(row.propertyValue)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600">{formatAED(row.cumulativeRent)}</td>
                        <td className="py-2 px-3 text-right text-red-500">{formatAED(row.cumulativeExpenses)}</td>
                        <td className={cn(
                          "py-2 px-3 text-right font-medium",
                          row.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {formatAED(row.netCashFlow)}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right font-medium",
                          row.totalReturn >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {formatAED(row.totalReturn)}
                        </td>
                        <td className="py-2 px-3 text-right">{row.equityMultiple.toFixed(2)}x</td>
                        <td className={cn(
                          "py-2 px-3 text-right font-medium",
                          row.annualizedIrr >= 8 ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {row.annualizedIrr}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Annual Cash Flow Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="size-4" />
                Annual Cash Flow
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Net cash in your pocket each year (rent minus expenses & mortgage).
                {simulation.some(r => r.annualNetCashFlow < 0) && simulation.some(r => r.annualNetCashFlow >= 0)
                  ? ` Turns cash-positive in Year ${simulation.findIndex(r => r.annualNetCashFlow >= 0) + 1}.`
                  : simulation.every(r => r.annualNetCashFlow >= 0)
                    ? " Cash-positive from day one."
                    : " Cash-negative throughout hold period — returns come at exit."
                }
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const maxAbs = Math.max(...simulation.map(r => Math.abs(r.annualNetCashFlow)), 1)
                return (
                  <>
                    <div className="flex items-center gap-1.5" style={{ height: 140 }}>
                      {simulation.map((row) => {
                        const isPositive = row.annualNetCashFlow >= 0
                        const barPct = (Math.abs(row.annualNetCashFlow) / maxAbs) * 50 // 50% max so both directions fit
                        return (
                          <div
                            key={row.year}
                            className="flex-1 flex flex-col items-center h-full relative"
                          >
                            {/* Zero line at 50% */}
                            <div className="absolute top-1/2 w-full border-t border-dashed border-muted-foreground/30" />
                            {/* Bar */}
                            <div className="w-full h-full flex flex-col items-center justify-center relative">
                              {isPositive ? (
                                <div
                                  className="w-full bg-emerald-500/70 rounded-t absolute"
                                  style={{
                                    height: `${barPct}%`,
                                    bottom: "50%",
                                  }}
                                  title={`Y${row.year}: ${formatAED(row.annualNetCashFlow)}`}
                                />
                              ) : (
                                <div
                                  className="w-full bg-red-400/70 rounded-b absolute"
                                  style={{
                                    height: `${barPct}%`,
                                    top: "50%",
                                  }}
                                  title={`Y${row.year}: ${formatAED(row.annualNetCashFlow)}`}
                                />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {simulation.map((row) => (
                        <div key={row.year} className="flex-1 text-center">
                          <span className="text-[10px] text-muted-foreground">Y{row.year}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-500/70" /> Cash inflow
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-400/70" /> Cash outflow
                      </div>
                      <div className="ml-auto font-medium">
                        {finalYear && (
                          <span className={finalYear.annualNetCashFlow >= 0 ? "text-emerald-600" : "text-red-500"}>
                            Y{holdPeriod}: {formatAED(finalYear.annualNetCashFlow)}/yr
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>

          {/* Return Decomposition Waterfall */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4" />
                Where Does Your Profit Come From?
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Breakdown of {formatAED(finalYear?.totalReturn || 0)} total return at Year {holdPeriod} exit.
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                if (!finalYear) return null

                // Correct decomposition: these 5 items sum exactly to totalReturn
                const appreciation = finalYear.capitalAppreciation
                const rentalProfit = finalYear.netRentalProfit
                const totalMortgagePayments = finalYear.annualMortgage * holdPeriod
                const mortgageInterest = totalMortgagePayments - finalYear.mortgagePaydown
                const exitC = finalYear.exitCosts
                const dldCost = purchasePrice * (dldFee / 100)

                const items = [
                  {
                    label: "Capital Appreciation",
                    value: appreciation,
                    color: "bg-blue-500",
                    description: `Property value: ${formatAED(purchasePrice)} → ${formatAED(finalYear.propertyValue)} (+${((finalYear.propertyValue / purchasePrice - 1) * 100).toFixed(1)}%)`,
                  },
                  {
                    label: "Net Rental Profit",
                    value: rentalProfit,
                    color: "bg-emerald-500",
                    description: `${formatAED(finalYear.cumulativeRent)} rent collected, minus ${formatAED(finalYear.cumulativeRent - rentalProfit)} in operating expenses`,
                  },
                  ...(mortgageInterest > 0
                    ? [
                        {
                          label: "Mortgage Interest Paid",
                          value: -mortgageInterest,
                          color: "bg-red-400",
                          description: `${formatAED(totalMortgagePayments)} total payments: ${formatAED(finalYear.mortgagePaydown)} principal + ${formatAED(mortgageInterest)} interest`,
                        },
                      ]
                    : []),
                  {
                    label: "Exit Costs",
                    value: -exitC,
                    color: "bg-amber-500",
                    description: `${exitCostPct}% of ${formatAED(finalYear.propertyValue)} exit value`,
                  },
                  {
                    label: "DLD Registration Fee",
                    value: -dldCost,
                    color: "bg-amber-400",
                    description: `${dldFee}% upfront registration paid on ${formatAED(purchasePrice)}`,
                  },
                ]

                // Sanity check: items should sum to totalReturn
                // appreciation + rentalProfit - mortgageInterest - exitCosts - dldFee = totalReturn
                const maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 1)

                // Find the dominant profit driver
                const positiveItems = items.filter((i) => i.value > 0)
                const topDriver = positiveItems.sort((a, b) => b.value - a.value)[0]

                return (
                  <div className="space-y-2.5">
                    {items.map((item) => {
                      const isPositive = item.value >= 0
                      const barWidth = (Math.abs(item.value) / maxVal) * 100
                      return (
                        <div key={item.label} className="group">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                isPositive ? "text-emerald-600" : "text-red-500"
                              )}
                            >
                              {isPositive ? "+" : ""}
                              {formatAED(item.value)}
                            </span>
                          </div>
                          <div className="h-3.5 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                isPositive ? item.color : "bg-red-400/60"
                              )}
                              style={{ width: `${Math.max(1, barWidth)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.description}
                          </p>
                        </div>
                      )
                    })}

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Net Profit</span>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          finalYear.totalReturn >= 0 ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        {finalYear.totalReturn >= 0 ? "+" : ""}
                        {formatAED(finalYear.totalReturn)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        On {formatAED(initialInvestment)} equity invested
                      </span>
                      <span>
                        {finalYear.totalReturnPct >= 0 ? "+" : ""}
                        {finalYear.totalReturnPct}% return ({finalYear.annualizedIrr}% IRR)
                      </span>
                    </div>

                    {/* Insight callout */}
                    {topDriver && (
                      <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Key driver: </span>
                        {topDriver.label === "Capital Appreciation"
                          ? `This is primarily an appreciation play — ${((appreciation / (appreciation + Math.max(0, rentalProfit))) * 100).toFixed(0)}% of gross gains come from property value growth.`
                          : topDriver.label === "Net Rental Profit"
                            ? `This is primarily a rental yield play — ${((rentalProfit / (Math.max(0, appreciation) + rentalProfit)) * 100).toFixed(0)}% of gross gains come from rental income.`
                            : `${topDriver.label} is the dominant return factor.`}
                        {mortgageInterest > 0 && finalYear.totalReturn > 0 && (
                          <>
                            {" "}
                            Leverage costs {formatAED(mortgageInterest)} in interest but amplifies equity returns to{" "}
                            {finalYear.totalReturnPct.toFixed(0)}% on {formatAED(initialInvestment)} invested.
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Input Parameters Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-4" />
                Property & Purchase
              </CardTitle>
              {property && (
                <CardDescription className="text-xs">
                  Pre-filled from {property.title}. Adjust as needed.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-sm">Purchase Price (AED)</Label>
                <Input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <SliderWithValue
                label="Down Payment"
                value={downPaymentPct}
                onChange={setDownPaymentPct}
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
              <div className="text-xs text-muted-foreground text-right">
                {formatAED(downPayment)} cash required
              </div>

              <SliderWithValue
                label="DLD Registration Fee"
                value={dldFee}
                onChange={setDldFee}
                min={0}
                max={6}
                step={0.5}
                suffix="%"
              />

              <Separator />

              <SliderWithValue
                label="Mortgage Rate"
                value={mortgageRate}
                onChange={setMortgageRate}
                min={0}
                max={10}
                step={0.25}
                suffix="%"
              />

              <SliderWithValue
                label="Mortgage Term"
                value={mortgageTerm}
                onChange={setMortgageTerm}
                min={5}
                max={30}
                step={1}
                suffix=" yrs"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="size-4" />
                Income & Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-sm">Annual Rent (AED)</Label>
                <Input
                  type="number"
                  value={annualRent}
                  onChange={(e) => setAnnualRent(Number(e.target.value))}
                  className="mt-1"
                />
                <div className="text-xs text-muted-foreground text-right mt-1">
                  Gross yield: {grossYield.toFixed(1)}%
                </div>
              </div>

              <SliderWithValue
                label="Rental Growth"
                value={rentalGrowthPct}
                onChange={setRentalGrowthPct}
                min={0}
                max={10}
                step={0.5}
                suffix="% /yr"
              />

              <SliderWithValue
                label="Occupancy"
                value={occupancyRate}
                onChange={setOccupancyRate}
                min={50}
                max={100}
                step={1}
                suffix="%"
              />

              <SliderWithValue
                label="Expenses (% of value)"
                value={expensesPct}
                onChange={setExpensesPct}
                min={0}
                max={5}
                step={0.25}
                suffix="%"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4" />
                Growth & Exit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <SliderWithValue
                label="Annual Appreciation"
                value={appreciationPct}
                onChange={setAppreciationPct}
                min={-5}
                max={15}
                step={0.5}
                suffix="% /yr"
              />

              <SliderWithValue
                label="Hold Period"
                value={holdPeriod}
                onChange={setHoldPeriod}
                min={1}
                max={15}
                step={1}
                suffix=" years"
              />

              <SliderWithValue
                label="Exit Costs"
                value={exitCostPct}
                onChange={setExitCostPct}
                min={0}
                max={5}
                step={0.5}
                suffix="%"
              />
            </CardContent>
          </Card>

          {/* Quick Summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4 space-y-2">
              {property && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Property</span>
                    <span className="font-semibold truncate ml-2 text-right">{property.title}</span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Invested</span>
                <span className="font-semibold">{formatAED(initialInvestment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Yield</span>
                <span className="font-semibold">{grossYield.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Yield</span>
                <span className="font-semibold">{netYield.toFixed(1)}%</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="font-medium">Exit IRR ({holdPeriod}yr)</span>
                <span className={cn(
                  "font-bold",
                  (finalYear?.annualizedIrr || 0) >= 8 ? "text-emerald-600" : "text-amber-600"
                )}>
                  {finalYear?.annualizedIrr}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
