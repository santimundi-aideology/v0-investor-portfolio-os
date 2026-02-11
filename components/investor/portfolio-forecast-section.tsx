"use client"

import * as React from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingDown, TrendingUp, ArrowUpRight, PieChart } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"

type ScenarioName = "bear" | "base" | "bull"

interface PortfolioForecast {
  investorId: string
  generatedAt: string
  holdingCount: number
  currentMetrics: {
    totalValue: number
    totalPurchasePrice: number
    totalMonthlyIncome: number
    netAnnualIncome: number
    avgYieldPct: number
    avgOccupancy: number
    appreciationPct: number
    portfolioTrend: string
  }
  scenarios: {
    name: ScenarioName
    value: {
      monthly: { month: string; value: number }[]
      finalValue: number
      appreciationPct: number
    }
    income: {
      monthly: { month: string; grossRent: number; netIncome: number; expenses: number }[]
      annualNetIncome: number
      projectedYieldPct: number
    }
  }[]
  holdingSummaries: {
    holdingId: string
    propertyTitle: string
    area: string
    type: string
    currentValue: number
    monthlyRent: number
    netYieldPct: number
    appreciationPct: number
    weightPct: number
  }[]
  diversification: {
    byArea: { area: string; value: number; pct: number }[]
    byType: { type: string; value: number; pct: number }[]
    concentrationRisk: string
  }
  historicalPortfolioValue: { date: string; totalValue: number; totalRent: number }[]
}

const scenarioColors: Record<ScenarioName, string> = {
  bear: "#ef4444",
  base: "#3b82f6",
  bull: "#22c55e",
}

const scenarioLabels: Record<ScenarioName, string> = {
  bear: "Bear Case",
  base: "Base Case",
  bull: "Bull Case",
}

export function PortfolioForecastSection() {
  const { scopedInvestorId } = useApp()
  const { data: forecast, isLoading } = useAPI<PortfolioForecast>(
    scopedInvestorId ? "/api/investor/forecast/portfolio" : null
  )
  const [selectedScenarios, setSelectedScenarios] = React.useState<Set<ScenarioName>>(
    new Set(["bear", "base", "bull"])
  )

  const toggleScenario = (name: ScenarioName) => {
    setSelectedScenarios((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        if (next.size > 1) next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Generating portfolio forecast...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!forecast || !forecast.scenarios?.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <PieChart className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No holdings available for forecasting</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scenario selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Forecast</h3>
          <p className="text-sm text-muted-foreground">
            12-month projections across {forecast.holdingCount} properties
            {forecast.currentMetrics.portfolioTrend !== "stable" && (
              <span> • Market trend: <span className="capitalize font-medium">{forecast.currentMetrics.portfolioTrend}</span></span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["bear", "base", "bull"] as const).map((name) => (
            <Button
              key={name}
              variant={selectedScenarios.has(name) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleScenario(name)}
              style={{
                backgroundColor: selectedScenarios.has(name) ? scenarioColors[name] : undefined,
                borderColor: scenarioColors[name],
                color: selectedScenarios.has(name) ? "white" : scenarioColors[name],
              }}
            >
              {scenarioLabels[name]}
            </Button>
          ))}
        </div>
      </div>

      {/* Scenario KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {forecast.scenarios
          .filter((s) => selectedScenarios.has(s.name))
          .map((scenario) => (
            <Card key={scenario.name} className="border-l-4" style={{ borderLeftColor: scenarioColors[scenario.name] }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold">{scenarioLabels[scenario.name]}</span>
                  {scenario.value.appreciationPct >= 0 ? (
                    <TrendingUp className="size-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="size-3 text-rose-600" />
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Portfolio Value (12M)</div>
                    <div className="text-lg font-bold">{formatAED(scenario.value.finalValue)}</div>
                    <div className={cn("text-xs font-medium", scenario.value.appreciationPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {scenario.value.appreciationPct >= 0 ? "+" : ""}{scenario.value.appreciationPct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Annual Net Income</div>
                    <div className="text-lg font-bold">{formatAED(scenario.income.annualNetIncome)}</div>
                    <div className="text-xs text-muted-foreground">
                      Yield: {scenario.income.projectedYieldPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Holdings breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Holdings Performance Breakdown</CardTitle>
          <CardDescription>
            Current performance metrics for each property in your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {forecast.holdingSummaries.map((h) => (
              <Link
                key={h.holdingId}
                href={`/investor/portfolio/${h.holdingId}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-all hover:border-primary hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{h.propertyTitle}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{h.area}</span>
                    <span>•</span>
                    <span className="capitalize">{h.type}</span>
                    <span>•</span>
                    <span>{h.weightPct.toFixed(0)}% of portfolio</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <div className="font-medium text-sm">{formatAED(h.currentValue)}</div>
                    <div className={cn("text-xs", h.appreciationPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {h.appreciationPct >= 0 ? "+" : ""}{h.appreciationPct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-primary/5">
                      {h.netYieldPct.toFixed(1)}%
                    </Badge>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Diversification analysis */}
      {forecast.diversification && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Diversification by Area</CardTitle>
              {forecast.diversification.concentrationRisk !== "low" && (
                <Badge variant="outline" className={cn(
                  "w-fit",
                  forecast.diversification.concentrationRisk === "high" 
                    ? "bg-rose-500/10 text-rose-700"
                    : "bg-amber-500/10 text-amber-700"
                )}>
                  {forecast.diversification.concentrationRisk} concentration risk
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {forecast.diversification.byArea.map((a) => (
                  <div key={a.area} className="flex items-center justify-between">
                    <span className="text-sm">{a.area}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, a.pct)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{a.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Diversification by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {forecast.diversification.byType.map((t) => (
                  <div key={t.type} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{t.type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, t.pct)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{t.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
