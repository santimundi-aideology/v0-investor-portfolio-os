"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, RefreshCw, TrendingDown, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"
import { useIsMobile } from "@/lib/hooks/use-media-query"

type ScenarioName = "bear" | "base" | "bull"

interface RentalScenario {
  name: ScenarioName
  monthly: { month: string; rent: number; occupancy: number; netIncome: number }[]
  annualTotal: number
  yieldPct: number
}

interface ValueScenario {
  name: ScenarioName
  monthly: { month: string; value: number; changeFromCurrent: number }[]
  finalValue: number
  appreciationPct: number
}

interface RiskFactor {
  factor: string
  impact: "high" | "medium" | "low"
  description: string
}

interface ForecastData {
  holdingId: string
  propertyTitle: string
  area: string
  generatedAt: string
  currentMetrics: {
    currentValue: number
    purchasePrice: number
    monthlyRent: number
    occupancyRate: number
    annualExpenses: number
    appreciationPct: number
    netYieldPct: number
  }
  rentalForecast: {
    scenarios: RentalScenario[]
    assumptions: string[]
  }
  valueForecast: {
    scenarios: ValueScenario[]
    assumptions: string[]
  }
  riskFactors: RiskFactor[]
  narrative: string
  marketContext: {
    areaMedianPrice: number | null
    areaMedianRent: number | null
    areaPriceTrend: string
    supplyLevel: string
    avgDaysOnMarket: number
    activeListings: number
  }
  historicalSnapshots: { date: string; value: number; rent: number | null; occupancy: number | null }[]
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

const impactColors: Record<string, string> = {
  high: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-700 border-blue-500/20",
}

export function HoldingForecastChart({ holdingId }: { holdingId: string }) {
  const { data: forecast, isLoading, mutate } = useAPI<ForecastData>(
    holdingId ? `/api/investor/forecast/${holdingId}` : null
  )
  const [selectedScenarios, setSelectedScenarios] = React.useState<Set<ScenarioName>>(
    new Set(["bear", "base", "bull"])
  )
  const [showAssumptions, setShowAssumptions] = React.useState(false)
  const [isRegenerating, setIsRegenerating] = React.useState(false)
  const isMobile = useIsMobile()

  const toggleScenario = (name: ScenarioName) => {
    setSelectedScenarios((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        if (next.size > 1) next.delete(name) // Keep at least one
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    await mutate()
    setIsRegenerating(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Generating AI forecast...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!forecast) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">Unable to generate forecast</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRegenerate}>
              <RefreshCw className="mr-2 size-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Build combined chart data for value forecast
  const valueChartData = React.useMemo(() => {
    const baseScenario = forecast.valueForecast.scenarios.find(s => s.name === "base")
    if (!baseScenario) return []

    return baseScenario.monthly.map((_, i) => {
      const point: Record<string, unknown> = {
        month: baseScenario.monthly[i].month,
      }
      for (const scenario of forecast.valueForecast.scenarios) {
        if (selectedScenarios.has(scenario.name)) {
          point[scenario.name] = scenario.monthly[i].value
        }
      }
      return point
    })
  }, [forecast, selectedScenarios])

  // Build combined chart data for rental forecast
  const rentalChartData = React.useMemo(() => {
    const baseScenario = forecast.rentalForecast.scenarios.find(s => s.name === "base")
    if (!baseScenario) return []

    return baseScenario.monthly.map((_, i) => {
      const point: Record<string, unknown> = {
        month: baseScenario.monthly[i].month,
      }
      for (const scenario of forecast.rentalForecast.scenarios) {
        if (selectedScenarios.has(scenario.name)) {
          point[scenario.name] = scenario.monthly[i].netIncome
        }
      }
      return point
    })
  }, [forecast, selectedScenarios])

  // Historical + forecast combined data for value
  const combinedValueData = React.useMemo(() => {
    const historical = forecast.historicalSnapshots.map(s => ({
      month: s.date,
      historical: s.value,
      isHistorical: true,
    }))

    const futureBase = forecast.valueForecast.scenarios.find(s => s.name === "base")
    const future = (futureBase?.monthly ?? []).map(m => ({
      month: m.month,
      ...Object.fromEntries(
        forecast.valueForecast.scenarios
          .filter(s => selectedScenarios.has(s.name))
          .map(s => [s.name, s.monthly.find(fm => fm.month === m.month)?.value])
      ),
      isHistorical: false,
    }))

    return [...historical, ...future]
  }, [forecast, selectedScenarios])

  const baseRental = forecast.rentalForecast.scenarios.find(s => s.name === "base")
  const baseValue = forecast.valueForecast.scenarios.find(s => s.name === "base")

  return (
    <div className="space-y-4">
      {/* Scenario selector + regenerate */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["bear", "base", "bull"] as const).map((name) => (
            <Button
              key={name}
              variant={selectedScenarios.has(name) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleScenario(name)}
              className="min-h-[36px]"
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Generated {new Date(forecast.generatedAt).toLocaleDateString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={cn("mr-2 size-3", isRegenerating && "animate-spin")} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Scenario KPI summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {forecast.valueForecast.scenarios
          .filter((s) => selectedScenarios.has(s.name))
          .map((scenario) => {
            const rentalScenario = forecast.rentalForecast.scenarios.find(
              (r) => r.name === scenario.name
            )
            return (
              <Card key={scenario.name} className="border-l-4" style={{ borderLeftColor: scenarioColors[scenario.name] }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">{scenarioLabels[scenario.name]}</span>
                    {scenario.appreciationPct >= 0 ? (
                      <TrendingUp className="size-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="size-3 text-rose-600" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">12M Value</span>
                      <span className="font-medium">{formatAED(scenario.finalValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Appreciation</span>
                      <span className={cn("font-medium", scenario.appreciationPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {scenario.appreciationPct >= 0 ? "+" : ""}{scenario.appreciationPct.toFixed(1)}%
                      </span>
                    </div>
                    {rentalScenario && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Annual Income</span>
                          <span className="font-medium">{formatAED(rentalScenario.annualTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Projected Yield</span>
                          <span className="font-medium">{rentalScenario.yieldPct.toFixed(1)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {/* Main charts */}
      <Tabs defaultValue="value" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="value" className="min-h-[44px] sm:min-h-0">Value Forecast</TabsTrigger>
          <TabsTrigger value="income" className="min-h-[44px] sm:min-h-0">Rental Income</TabsTrigger>
          <TabsTrigger value="combined" className="min-h-[44px] sm:min-h-0">Historical + Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="value">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Property Value Forecast (12 Months)</CardTitle>
              <CardDescription>
                Projected property value across {selectedScenarios.size} scenario{selectedScenarios.size !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] sm:h-[320px] w-full touch-pan-y">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={valueChartData} margin={{ left: 0, right: 0, top: 10, bottom: 10 }}>
                    <defs>
                      {(["bear", "base", "bull"] as const).map((name) => (
                        <linearGradient key={name} id={`grad-${name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={scenarioColors[name]} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={scenarioColors[name]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      fontSize={isMobile ? 10 : 11}
                      interval={isMobile ? 2 : 1}
                      tickFormatter={(v) => {
                        const d = new Date(v + "-01")
                        return d.toLocaleDateString("en-US", { month: "short" })
                      }}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                        backgroundColor: "hsl(var(--background))",
                      }}
                      formatter={(value: number, name: string) => [
                        formatAED(value),
                        scenarioLabels[name as ScenarioName] ?? name,
                      ]}
                      labelFormatter={(label) => {
                        const d = new Date(label + "-01")
                        return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                      }}
                    />
                    <ReferenceLine
                      y={forecast.currentMetrics.currentValue}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      label={isMobile ? undefined : { value: "Current", fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "insideBottomLeft" }}
                    />
                    {(["bear", "base", "bull"] as const)
                      .filter((n) => selectedScenarios.has(n))
                      .map((name) => (
                        <Area
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={scenarioColors[name]}
                          fillOpacity={1}
                          fill={`url(#grad-${name})`}
                          strokeWidth={name === "base" ? 2.5 : 1.5}
                          dot={false}
                          activeDot={{ r: isMobile ? 5 : 4, fill: scenarioColors[name] }}
                        />
                      ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Net Rental Income Forecast (12 Months)</CardTitle>
              <CardDescription>
                Monthly net income after expenses across scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] sm:h-[320px] w-full touch-pan-y">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rentalChartData} margin={{ left: isMobile ? -10 : 0, right: 0, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      fontSize={isMobile ? 10 : 11}
                      interval={isMobile ? 2 : 1}
                      tickFormatter={(v) => {
                        const d = new Date(v + "-01")
                        return d.toLocaleDateString("en-US", { month: "short" })
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={isMobile ? 10 : 11}
                      width={isMobile ? 40 : 55}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                        backgroundColor: "hsl(var(--background))",
                      }}
                      formatter={(value: number, name: string) => [
                        formatAED(value),
                        scenarioLabels[name as ScenarioName] ?? name,
                      ]}
                      labelFormatter={(label) => {
                        const d = new Date(label + "-01")
                        return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                      }}
                    />
                    {(["bear", "base", "bull"] as const)
                      .filter((n) => selectedScenarios.has(n))
                      .map((name) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={scenarioColors[name]}
                          strokeWidth={name === "base" ? 2.5 : 1.5}
                          dot={false}
                          activeDot={{ r: isMobile ? 5 : 4, fill: scenarioColors[name] }}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combined">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historical Value + Forecast</CardTitle>
              <CardDescription>
                Actual historical values transitioning into projected scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] sm:h-[320px] w-full touch-pan-y">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedValueData} margin={{ left: 0, right: 0, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      fontSize={isMobile ? 10 : 11}
                      interval={isMobile ? 3 : 2}
                      tickFormatter={(v) => {
                        const d = new Date(v + "-01")
                        return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
                      }}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "12px",
                        backgroundColor: "hsl(var(--background))",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "historical") return [formatAED(value), "Actual Value"]
                        return [formatAED(value), scenarioLabels[name as ScenarioName] ?? name]
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="historical"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                    {(["bear", "base", "bull"] as const)
                      .filter((n) => selectedScenarios.has(n))
                      .map((name) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={scenarioColors[name]}
                          strokeWidth={name === "base" ? 2 : 1.5}
                          strokeDasharray={name === "base" ? undefined : "5 5"}
                          dot={false}
                          activeDot={{ r: 4, fill: scenarioColors[name] }}
                          connectNulls={false}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-0.5 bg-primary" />
                  <span className="text-muted-foreground">Historical</span>
                </div>
                {(["bear", "base", "bull"] as const)
                  .filter((n) => selectedScenarios.has(n))
                  .map((name) => (
                    <div key={name} className="flex items-center gap-2 text-xs">
                      <div className="w-4 h-0.5" style={{ backgroundColor: scenarioColors[name], borderStyle: name !== "base" ? "dashed" : undefined }} />
                      <span className="text-muted-foreground">{scenarioLabels[name]}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Narrative */}
      {forecast.narrative && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {forecast.narrative}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {forecast.riskFactors?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk Factors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {forecast.riskFactors.map((risk, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge variant="outline" className={cn("shrink-0 mt-0.5", impactColors[risk.impact])}>
                    {risk.impact}
                  </Badge>
                  <div>
                    <div className="font-medium text-sm">{risk.factor}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{risk.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assumptions (collapsible) */}
      <Card>
        <CardHeader className="pb-2">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setShowAssumptions(!showAssumptions)}
          >
            <CardTitle className="text-base">Key Assumptions</CardTitle>
            {showAssumptions ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </CardHeader>
        {showAssumptions && (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium mb-2">Value Forecast</h4>
                <ul className="space-y-1">
                  {forecast.valueForecast.assumptions.map((a, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Rental Forecast</h4>
                <ul className="space-y-1">
                  {forecast.rentalForecast.assumptions.map((a, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Market Context */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Market Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Area Median Price</div>
              <div className="font-medium">
                {forecast.marketContext.areaMedianPrice
                  ? formatAED(forecast.marketContext.areaMedianPrice)
                  : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Area Median Rent</div>
              <div className="font-medium">
                {forecast.marketContext.areaMedianRent
                  ? formatAED(forecast.marketContext.areaMedianRent) + "/yr"
                  : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Price Trend</div>
              <div className="font-medium capitalize flex items-center gap-1">
                {forecast.marketContext.areaPriceTrend === "rising" ? (
                  <TrendingUp className="size-3 text-emerald-600" />
                ) : forecast.marketContext.areaPriceTrend === "declining" ? (
                  <TrendingDown className="size-3 text-rose-600" />
                ) : null}
                {forecast.marketContext.areaPriceTrend}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Supply Level</div>
              <div className="font-medium capitalize">{forecast.marketContext.supplyLevel}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg Days on Market</div>
              <div className="font-medium">{forecast.marketContext.avgDaysOnMarket} days</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Active Listings</div>
              <div className="font-medium">{forecast.marketContext.activeListings}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
