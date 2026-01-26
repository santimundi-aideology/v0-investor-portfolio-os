"use client"

import * as React from "react"
import Link from "next/link"
import { differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns"
import {
  Building2,
  CheckSquare,
  ClipboardCheck,
  Clock,
  FolderKanban,
  Home,
  Landmark,
  Layers,
  MapPinned,
  PiggyBank,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"

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
import { mockDealRooms, mockInvestors, mockProperties, mockShortlistItems, mockTasks } from "@/lib/mock-data"
import type { DealRoom, Investor, ShortlistItem, Task } from "@/lib/types"

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

const taskPriorityOrder: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 }

export default function RealEstatePage() {
  const { role, scopedInvestorId } = useApp()

  if (role === "realtor") {
    return <RealtorRealEstateView />
  }

  const investorId = scopedInvestorId ?? "inv-1"
  return <InvestorRealEstateView role={role} investorId={investorId} />
}

function InvestorRealEstateView({ role, investorId }: { role: "owner" | "admin" | "investor"; investorId: string }) {
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
    return Object.values(combined)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((p) => ({
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
            <Link href="/deal-room">Deal rooms</Link>
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
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
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
                <div className="mt-3 text-xs text-gray-500">
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
                              <div className="text-xs text-gray-500">
                                {p?.area ?? "—"} • {p?.type ?? "—"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatAED(h.purchasePrice)}</TableCell>
                          <TableCell>{formatAED(h.currentValue)}</TableCell>
                          <TableCell>
                            <Badge variant={app >= 0 ? "secondary" : "destructive"}>{pct(app)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatAED(inc.net)}</div>
                            <div className="text-xs text-gray-500">{inc.months} months</div>
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

function RealtorRealEstateView() {
  const { user } = useApp()
  const today = React.useMemo(() => new Date(), [])

  const aiQuestions = [
    "Which investors still need qualified inventory?",
    "Summarize deals that could close this month.",
    "Draft an update for Fatima about the JVC villa diligence.",
    "What properties should I verify next?",
    "List tasks due this week and who they impact.",
  ]

  const openTasks = React.useMemo(() => mockTasks.filter((task) => task.status !== "done"), [])
  const liveDeals = React.useMemo(() => mockDealRooms.filter((deal) => deal.status !== "completed"), [])

  const tasksByInvestor = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const task of openTasks) {
      if (!task.investorId) continue
      map.set(task.investorId, (map.get(task.investorId) ?? 0) + 1)
    }
    return map
  }, [openTasks])

  const prioritizedTasks = React.useMemo(() => {
    return [...openTasks].sort((a, b) => {
      const aDue = a.dueDate ? differenceInCalendarDays(parseISO(a.dueDate), today) : Number.POSITIVE_INFINITY
      const bDue = b.dueDate ? differenceInCalendarDays(parseISO(b.dueDate), today) : Number.POSITIVE_INFINITY
      if (aDue !== bDue) return aDue - bDue
      return taskPriorityOrder[a.priority] - taskPriorityOrder[b.priority]
    })
  }, [openTasks, today])

  const propertyStats = React.useMemo(() => {
    const stats = {
      active: 0,
      newIntake: 0,
      needsVerification: 0,
    }
    for (const property of mockProperties) {
      if (property.status === "available") stats.active += 1
      if (differenceInCalendarDays(today, parseISO(property.createdAt)) <= 14) stats.newIntake += 1
      if (property.readinessStatus === "NEEDS_VERIFICATION") stats.needsVerification += 1
    }
    return stats
  }, [today])

  const tasksDueThisWeek = React.useMemo(() => {
    return openTasks.filter((task) => {
      if (!task.dueDate) return false
      const diff = differenceInCalendarDays(parseISO(task.dueDate), today)
      return diff >= 0 && diff <= 7
    }).length
  }, [openTasks, today])

  const pipelineValue = React.useMemo(() => liveDeals.reduce((sum, deal) => sum + (deal.ticketSizeAed ?? 0), 0), [liveDeals])

  const dealsClosingSoon = React.useMemo(() => {
    return liveDeals.filter((deal) => {
      if (!deal.targetCloseDate) return false
      const diff = differenceInCalendarDays(parseISO(deal.targetCloseDate), today)
      return diff >= 0 && diff <= 30
    }).length
  }, [liveDeals, today])

  const stats = React.useMemo(
    () => [
      {
        label: "Active listings",
        value: `${propertyStats.active}`,
        meta: `${propertyStats.newIntake} new in 14d`,
        icon: Building2,
      },
      {
        label: "Pipeline (AED)",
        value: formatAED(pipelineValue),
        meta: `${liveDeals.length} live files`,
        icon: FolderKanban,
      },
      {
        label: "Closing this month",
        value: `${dealsClosingSoon}`,
        meta: "Target close ≤30d",
        icon: Target,
      },
      {
        label: "Tasks this week",
        value: `${tasksDueThisWeek}`,
        meta: "Due in next 7 days",
        icon: CheckSquare,
      },
    ],
    [dealsClosingSoon, liveDeals.length, pipelineValue, propertyStats.active, propertyStats.newIntake, tasksDueThisWeek],
  )

  const readinessBuckets = React.useMemo(() => {
    return mockProperties.reduce(
      (acc, property) => {
        const status = property.readinessStatus ?? "DRAFT"
        acc[status] = (acc[status] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }, [])

  const verificationQueue = React.useMemo(
    () => mockProperties.filter((p) => p.readinessStatus === "NEEDS_VERIFICATION").slice(0, 4),
    [],
  )

  const coverageRows = React.useMemo(() => {
    return mockInvestors
      .filter((inv) => inv.status !== "inactive")
      .map((inv) => {
        const matches = mockProperties.filter((property) => {
          const typeMatch = inv.mandate?.propertyTypes?.includes(property.type)
          const areaMatch = inv.mandate?.preferredAreas?.includes(property.area)
          return typeMatch || areaMatch
        })
        const readyCount = matches.filter((property) => property.readinessStatus === "READY_FOR_MEMO").length
        const needsVerification = matches.filter((property) => property.readinessStatus === "NEEDS_VERIFICATION").length
        const coveragePct = matches.length ? Math.round((readyCount / matches.length) * 100) : 0
        return {
          investor: inv,
          readyCount,
          totalMatches: matches.length,
          needsVerification,
          coveragePct,
          openTasks: tasksByInvestor.get(inv.id) ?? 0,
          lastTouch: formatDistanceToNowStrict(parseISO(inv.lastContact), { addSuffix: true }),
        }
      })
      .sort((a, b) => a.coveragePct - b.coveragePct)
      .slice(0, 5)
  }, [tasksByInvestor])

  const shortlistFocus = React.useMemo(() => {
    const investorMap = new Map(mockInvestors.map((inv) => [inv.id, inv]))
    return [...mockShortlistItems]
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => ({
        item,
        investor: investorMap.get(item.investorId),
      }))
  }, [])

  const areaBreakdown = React.useMemo(() => {
    const map = new Map<string, { count: number; trust: number; roi: number }>()
    for (const property of mockProperties) {
      const area = property.area ?? "Unknown"
      const existing = map.get(area) ?? { count: 0, trust: 0, roi: 0 }
      existing.count += 1
      existing.trust += property.trustScore ?? 0
      existing.roi += property.roi ?? 0
      map.set(area, existing)
    }
    return Array.from(map.entries())
      .map(([area, data]) => ({
        area,
        listings: data.count,
        avgTrust: data.count ? Math.round(data.trust / data.count) : 0,
        avgRoi: data.count ? data.roi / data.count : 0,
      }))
      .sort((a, b) => b.listings - a.listings)
      .slice(0, 5)
  }, [])

  const dealsToShow = React.useMemo(() => {
    const stageOrder: Record<DealRoom["status"], number> = {
      preparation: 0,
      "due-diligence": 1,
      negotiation: 2,
      closing: 3,
      completed: 4,
    }
    return [...liveDeals]
      .sort((a, b) => {
        const stageDiff = stageOrder[a.status] - stageOrder[b.status]
        if (stageDiff !== 0) return stageDiff
        const aClose = a.targetCloseDate ? parseISO(a.targetCloseDate).getTime() : Number.POSITIVE_INFINITY
        const bClose = b.targetCloseDate ? parseISO(b.targetCloseDate).getTime() : Number.POSITIVE_INFINITY
        return aClose - bClose
      })
      .slice(0, 4)
  }, [liveDeals])

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_0%_20%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(900px_circle_at_80%_0%,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="relative">
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <ClipboardCheck className="size-5" />
                </span>
                <span>Real estate cockpit, {user.name}</span>
              </span>
            }
            subtitle="Match investor mandates, move deals, and keep inventory audit-ready."
            primaryAction={
              <AskAIBankerWidget
                agentId="real_estate_advisor"
                title="AI Deal Copilot"
                description="Ask for mandate gaps, deal blockers, or draft updates."
                suggestedQuestions={aiQuestions}
                pagePath="/real-estate"
              />
            }
            secondaryActions={
              <>
                <Button variant="outline" asChild>
                  <Link href="/properties">Inventory</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/deal-room">Deal rooms</Link>
                </Button>
              </>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-green-600" />
              Mandate coverage
            </CardTitle>
            <p className="text-xs text-gray-500">Who still needs qualified product before next check-in.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coverageRows.map((row) => (
                    <MandateCoverageRow key={row.investor.id} row={row} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href="/investors">Open investor CRM</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-4 text-green-600" />
              Inventory readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {["READY_FOR_MEMO", "NEEDS_VERIFICATION", "DRAFT"].map((status) => (
                <div key={status} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{status.replaceAll("_", " ").toLowerCase()}</span>
                    <Badge variant="secondary">{readinessBuckets[status] ?? 0}</Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((readinessBuckets[status] ?? 0) / mockProperties.length) * 100,
                        ).toFixed(0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2 text-xs">
              <div className="text-sm font-semibold">Needs verification next</div>
              {verificationQueue.length ? (
                verificationQueue.map((property) => (
                  <div key={property.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div>
                      <div className="font-medium">{property.title}</div>
                      <div className="text-gray-500">{property.area}</div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/properties/${property.id}`}>Open</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No pending verifications 🎉</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="size-4 text-green-600" />
              Deal pipeline
            </CardTitle>
            <p className="text-xs text-gray-500">See blockers before IC or closing deadlines slip.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {dealsToShow.length ? (
              dealsToShow.map((deal) => <DealPipelineRow key={deal.id} deal={deal} />)
            ) : (
              <div className="text-sm text-gray-500">No active deals. Add an opportunity from the inventory page.</div>
            )}
            <Button variant="outline" asChild className="w-full">
              <Link href="/deal-room">Open deal board</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-green-600" />
              Critical tasks
            </CardTitle>
            <p className="text-xs text-gray-500">Stay ahead of investor promises and diligence requests.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {prioritizedTasks.length ? (
              prioritizedTasks.slice(0, 5).map((task) => <RealtorTaskRow key={task.id} task={task} today={today} />)
            ) : (
              <div className="text-sm text-gray-500">All clear — no pending tasks.</div>
            )}
            <Button variant="outline" asChild className="w-full">
              <Link href="/tasks">Open task board</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-green-600" />
              Shortlist pushes
            </CardTitle>
            <p className="text-xs text-gray-500">High-confidence matches that need a nudge.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {shortlistFocus.map(({ item, investor }) => (
              <ShortlistPushCard key={item.id} item={item} investor={investor} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="size-4 text-green-600" />
              Area coverage
            </CardTitle>
            <p className="text-xs text-gray-500">Where your current book is concentrated.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {areaBreakdown.map((area) => (
              <AreaCoverageRow key={area.area} {...area} />
            ))}
          </CardContent>
        </Card>
      </div>

      <AskAIBankerWidget
        variant="floating"
        agentId="real_estate_advisor"
        title="AI Deal Copilot"
        suggestedQuestions={aiQuestions}
        pagePath="/real-estate"
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
}: {
  label: string
  value: string
  meta: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-gray-100 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500/80">{label}</div>
          <div className="mt-1 text-2xl font-bold text-foreground/90">{value}</div>
          <div className="mt-1 text-xs text-gray-500">{meta}</div>
        </div>
        <div className="rounded-full bg-green-50 p-3 text-green-600">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function MandateCoverageRow({
  row,
}: {
  row: {
    investor: Investor
    readyCount: number
    totalMatches: number
    needsVerification: number
    coveragePct: number
    openTasks: number
    lastTouch: string
  }
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{row.investor.name}</div>
        <div className="text-xs text-gray-500">
          {row.investor.mandate?.strategy ?? "—"} • {row.lastTouch}
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <div className="text-sm font-semibold">
          {row.readyCount}/{row.totalMatches || 0} ready
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary"
            style={{ width: `${Math.min(100, row.coveragePct).toFixed(0)}%` }}
          />
        </div>
      </TableCell>
      <TableCell className="text-xs">
        <Badge variant={row.openTasks ? "secondary" : "outline"}>{row.openTasks} tasks</Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/investors/${row.investor.id}`}>Open</Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

function DealPipelineRow({ deal }: { deal: DealRoom }) {
  const targetLabel = deal.targetCloseDate
    ? `Target ${formatDistanceToNowStrict(parseISO(deal.targetCloseDate), { addSuffix: true })}`
    : "No target date"

  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">{deal.propertyTitle}</div>
          <div className="text-xs text-gray-500">{deal.investorName}</div>
        </div>
        <Badge variant="secondary" className="capitalize">
          {deal.status.replaceAll("-", " ")}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{deal.ticketSizeAed ? formatAED(deal.ticketSizeAed) : "Ticket TBC"}</span>
        <span>•</span>
        <span>{targetLabel}</span>
      </div>
      {deal.nextStep ? (
        <div className="mt-2 text-xs">
          <span className="font-semibold text-green-600">Next:</span> {deal.nextStep}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-gray-500">Prob {deal.probability ?? 0}%</span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/deal-room/${deal.id}`}>Open</Link>
        </Button>
      </div>
    </div>
  )
}

function RealtorTaskRow({ task, today }: { task: Task; today: Date }) {
  const dueInDays = task.dueDate ? differenceInCalendarDays(parseISO(task.dueDate), today) : null
  const dueLabel =
    dueInDays === null
      ? "No due date"
      : dueInDays < 0
        ? `${Math.abs(dueInDays)}d overdue`
        : dueInDays === 0
          ? "Due today"
          : `Due in ${dueInDays}d`

  const dueClass =
    dueInDays === null
      ? "text-gray-500"
      : dueInDays < 0
        ? "text-destructive"
        : dueInDays <= 1
          ? "text-amber-600 dark:text-amber-300"
          : "text-gray-500"

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{task.title}</span>
        <Badge variant="outline" className="capitalize">
          {task.priority}
        </Badge>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        {task.investorName ?? "Internal"} {task.propertyTitle ? `• ${task.propertyTitle}` : null}
      </div>
      <div className={`mt-2 text-xs font-semibold ${dueClass}`}>{dueLabel}</div>
    </div>
  )
}

function ShortlistPushCard({ item, investor }: { item: ShortlistItem; investor?: Investor }) {
  const property = item.property ?? mockProperties.find((prop) => prop.id === item.propertyId)
  if (!property) return null

  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">{property.title}</div>
          <div className="text-xs text-gray-500">
            {investor?.name ?? "Investor"} • Score {item.score}
          </div>
        </div>
        <Badge variant="secondary" className="capitalize">
          {item.status.replaceAll("-", " ")}
        </Badge>
      </div>
      {item.notes ? <div className="mt-2 text-xs text-gray-500">{item.notes}</div> : null}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          {property.area} • {property.type}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/properties/${property.id}`}>Open</Link>
        </Button>
      </div>
    </div>
  )
}

function AreaCoverageRow({
  area,
  listings,
  avgTrust,
  avgRoi,
}: {
  area: string
  listings: number
  avgTrust: number
  avgRoi: number
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <div>
        <div className="font-semibold">{area}</div>
        <div className="text-xs text-gray-500">{listings} listings</div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <Badge variant="secondary">Trust {avgTrust}</Badge>
        <span className="font-semibold text-green-600">{avgRoi ? `${avgRoi.toFixed(1)}%` : "—"}</span>
      </div>
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
    <Card className="overflow-hidden border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-green-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500/80">{label}</p>
          <div className="rounded-full bg-green-50 p-2 text-green-600">
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
      <div className="mt-1 text-xs text-gray-500">{body}</div>
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
            <Icon className="size-5 text-gray-500" />
          </div>
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
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
            <div className="text-xs text-gray-500">
              {p.area} • {p.type}
            </div>
          </div>
          <Badge variant="secondary">Score {score}</Badge>
        </div>
        <div className="text-sm font-semibold">{formatAED(p.price)}</div>
        <div className="text-xs text-gray-500">
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

 
