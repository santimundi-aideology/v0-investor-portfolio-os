"use client"

import * as React from "react"
import Link from "next/link"
import { Building2, Home, Landmark, MapPinned, PiggyBank, TrendingUp } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useApp } from "@/components/providers/app-provider"
import {
  calcAppreciationPct,
  calcIncomeToDate,
  calcYieldPct,
  forecastMonthlyNetIncome,
  formatAED,
  getHoldingProperty,
  getOpportunitiesForInvestor,
  getPortfolioSummary,
} from "@/lib/real-estate"
import { PortfolioValueChart } from "@/components/charts/portfolio-value-chart"
import { RentalIncomeForecastChart } from "@/components/charts/rental-income-forecast-chart"
import { AllocationPieChart } from "@/components/charts/allocation-pie-chart"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { mockProperties } from "@/lib/mock-data"

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

export default function RealEstatePage() {
  const { role, scopedInvestorId } = useApp()

  // Investor-scoped view: show only their portfolio.
  const investorId = scopedInvestorId ?? "inv-1"
  const summary = React.useMemo(() => getPortfolioSummary(investorId), [investorId])

  const opportunities = React.useMemo(() => getOpportunitiesForInvestor(investorId), [investorId])

  const valueSeries = React.useMemo(() => {
    // Simple derived series: interpolate from purchase cost to current value.
    const base = summary.totalPurchaseCost || summary.totalPortfolioValue
    const now = summary.totalPortfolioValue
    const points = [
      { month: "2024-03", value: base * 0.98 },
      { month: "2024-06", value: base * 1.01 },
      { month: "2024-09", value: base * 1.03 },
      { month: "2024-12", value: base * 1.05 },
      { month: "2025-03", value: now },
    ]
    return points.map((p) => ({ ...p, value: Math.round(p.value) }))
  }, [summary.totalPurchaseCost, summary.totalPortfolioValue])

  const forecast = React.useMemo(() => {
    const combined: Record<string, { month: string; net: number; gross: number }> = {}
    for (const h of summary.holdings) {
      const f = forecastMonthlyNetIncome(h, 12)
      for (const p of f) {
        if (!combined[p.month]) combined[p.month] = { month: p.month, net: 0, gross: 0 }
        combined[p.month].net += p.net
        combined[p.month].gross += p.gross
      }
    }
    return Object.values(combined).sort((a, b) => a.month.localeCompare(b.month)).map((p) => ({
      ...p,
      net: Math.round(p.net),
      gross: Math.round(p.gross),
    }))
  }, [summary.holdings])

  const allocation = React.useMemo(() => {
    const byType = new Map<string, number>()
    for (const h of summary.holdings) {
      const p = getHoldingProperty(h)
      const key = p?.type ?? "unknown"
      byType.set(key, (byType.get(key) ?? 0) + h.currentValue)
    }
    return Array.from(byType.entries()).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [summary.holdings])

  const aiQuestions = [
    "How is my property portfolio performing?",
    "What's the rental yield on my properties?",
    "Suggest properties with high ROI potential",
    "Analyze market trends in Dubai Marina",
    "Compare my properties to market averages",
    "What's the best time to sell one of my properties?",
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "investor" ? "My Real Estate Portfolio" : "Real Estate Analytics"}
        subtitle="Portfolio performance, income, and recommendations."
        primaryAction={
          <AskAIBankerWidget
            agentId="real_estate_advisor"
            title="AI Real Estate Advisor"
            suggestedQuestions={aiQuestions}
            pagePath="/real-estate"
            scopedInvestorId={investorId}
          />
        }
        secondaryActions={
          <Button variant="outline" asChild>
            <Link href="/deal-room/deal-1">Deal room</Link>
          </Button>
        }
      />

      {summary.propertyCount === 0 ? (
        <EmptyState
          title="No properties in your portfolio yet"
          description="Once you invest, we’ll track value, rental income, and performance here."
          icon={<Building2 className="size-5" />}
          action={
            <Button asChild>
              <Link href="/properties">Explore opportunities</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Portfolio value" value={formatAED(summary.totalPortfolioValue)} icon={PiggyBank} trend="+4.2% YoY" />
            <StatCard label="Monthly income" value={formatAED(summary.totalMonthlyRental)} icon={TrendingUp} />
            <StatCard label="Average yield" value={pct(summary.avgYieldPct)} icon={Landmark} />
            <StatCard label="Assets" value={`${summary.propertyCount}`} icon={Building2} />
            <StatCard label="Occupancy" value={pct(summary.occupancyPct)} icon={MapPinned} />
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle>Portfolio value trend</CardTitle>
              </CardHeader>
              <CardContent>
                <PortfolioValueChart data={valueSeries} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Allocation (by type)</CardTitle>
              </CardHeader>
              <CardContent>
                <AllocationPieChart data={allocation} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {allocation.map((a) => (
                    <div key={a.name} className="flex items-center justify-between rounded-md border px-2 py-1">
                      <span className="capitalize">{a.name}</span>
                      <span>{Math.round((a.value / summary.totalPortfolioValue) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle>Rental income forecast (next 12 months)</CardTitle>
              </CardHeader>
              <CardContent>
                <RentalIncomeForecastChart data={forecast} />
                <div className="mt-3 text-xs text-muted-foreground">
                  Net forecast assumes occupancy stays stable and rents grow modestly.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>AI insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Insight
                  title="Performance summary"
                  body={`Your portfolio is up ${pct(summary.appreciationPct)} since purchase with an estimated net yield of ${pct(
                    summary.avgYieldPct,
                  )}.`}
                />
                <Insight
                  title="Optimization"
                  body="Prioritize lease renewal timing on your top-yield asset and review expenses to protect net yield."
                />
                <Insight
                  title="Diversification"
                  body="Consider adding a complementary asset type to reduce concentration risk (e.g. residential vs commercial)."
                />
              </CardContent>
            </Card>
          </div>

          {/* Property table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Owned properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Purchase</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Appreciation</TableHead>
                      <TableHead>Income to date</TableHead>
                      <TableHead>Net yield</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.holdings.map((h) => {
                      const p = getHoldingProperty(h)
                      const inc = calcIncomeToDate(h)
                      const app = calcAppreciationPct(h)
                      const y = calcYieldPct(h)
                      return (
                        <TableRow key={h.id}>
                          <TableCell>
                            <div className="min-w-[240px]">
                              <div className="font-medium">{p?.title ?? h.propertyId}</div>
                              <div className="text-xs text-muted-foreground">{p?.area ?? "—"} • {p?.type ?? "—"}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatAED(h.purchasePrice)}</TableCell>
                          <TableCell>{formatAED(h.currentValue)}</TableCell>
                          <TableCell>
                            <Badge variant={app >= 0 ? "secondary" : "destructive"}>{pct(app)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatAED(inc.net)}</div>
                            <div className="text-xs text-muted-foreground">{inc.months} months</div>
                          </TableCell>
                          <TableCell>{pct(y)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/properties/${h.propertyId}`}>View</Link>
                              </Button>
                              <AskAIBankerWidget
                                variant="inline"
                                agentId="real_estate_advisor"
                                title="AI Real Estate Advisor"
                                suggestedQuestions={[
                                  `What's the ROI on my property in ${p?.area ?? "this location"}?`,
                                  `Should I sell ${p?.title ?? "this property"}?`,
                                  `How can I improve the yield on ${p?.title ?? "this property"}?`,
                                ]}
                                pagePath="/properties"
                                scopedInvestorId={investorId}
                                propertyId={h.propertyId}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Opportunities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Opportunities shared by your Realtor</div>
              <Button variant="outline" asChild>
                <Link href="/properties">Browse inventory</Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {opportunities.map((o) => (
                <OpportunityCard key={o.propertyId} propertyId={o.propertyId} score={o.score} reasons={o.reasons} />
              ))}
            </div>
          </div>

          <Separator />

          {/* Categories grid (banking-like) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Category title="Residential Properties" subtitle="Apartments, Villas, Townhouses" icon={Home} />
            <Category title="Commercial Properties" subtitle="Offices, Retail, Warehouses" icon={Building2} />
            <Category title="Land & Development" subtitle="Plots, development theses" icon={Landmark} />
            <Category title="REITs & Funds" subtitle="Diversification placeholders" icon={TrendingUp} />
            <Category title="Vacation Rentals" subtitle="Short-term yield opportunities" icon={MapPinned} />
            <Category title="International Properties" subtitle="Cross-market allocation" icon={PiggyBank} />
          </div>
        </>
      )}

      {/* Floating chat bubble on real estate pages */}
      <AskAIBankerWidget
        variant="floating"
        agentId="real_estate_advisor"
        title="AI Real Estate Advisor"
        suggestedQuestions={aiQuestions}
        pagePath="/real-estate"
        scopedInvestorId={investorId}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
}) {
  return (
    <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-secondary/40 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{label}</p>
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-1">
          <div className="text-3xl font-bold tracking-tight text-foreground/90">{value}</div>
          {trend && (
            <p className="mt-1 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Insight({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  )
}

function Category({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OpportunityCard({
  propertyId,
  score,
  reasons,
}: {
  propertyId: string
  score: number
  reasons: string[]
}) {
  const p = mockProperties.find((x) => x.id === propertyId)
  if (!p) return null

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="pt-6 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{p.title}</div>
            <div className="text-xs text-muted-foreground">{p.area} • {p.type}</div>
          </div>
          <Badge variant="secondary">Score {score}</Badge>
        </div>
        <div className="text-sm font-semibold">{formatAED(p.price)}</div>
        <div className="text-xs text-muted-foreground">
          {reasons.length ? reasons.join(" • ") : "Recommended based on your mandate"}
        </div>
        <div className="pt-2">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href={`/properties/${p.id}`}>View opportunity</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


