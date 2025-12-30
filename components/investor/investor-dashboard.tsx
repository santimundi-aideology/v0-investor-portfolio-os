"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, Bell, Building2, CalendarClock, FileText, FolderKanban } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ContextPanel } from "@/components/layout/context-panel"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MiniAreaSparkline } from "@/components/charts/mini-area-sparkline"
import { MiniLineSparkline } from "@/components/charts/mini-line-sparkline"
import { AllocationPieChart } from "@/components/charts/allocation-pie-chart"
import { cn } from "@/lib/utils"
import { mockDealRooms, mockMemos, mockProperties } from "@/lib/mock-data"
import type { DealRoom } from "@/lib/types"
import {
  calcAppreciationPct,
  calcYieldPct,
  forecastMonthlyNetIncome,
  formatAED,
  getHoldingProperty,
  getOpportunitiesForInvestor,
  getPortfolioSummary,
} from "@/lib/real-estate"

const dealStatusClasses: Record<DealRoom["status"], string> = {
  preparation: "bg-muted text-muted-foreground",
  "due-diligence": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  negotiation: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  closing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
}

function dealStatusLabel(status: DealRoom["status"]) {
  switch (status) {
    case "due-diligence":
      return "Due diligence"
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

export function InvestorDashboard({
  investorId,
  investorName,
}: {
  investorId: string
  investorName: string
}) {
  const summary = React.useMemo(() => getPortfolioSummary(investorId), [investorId])
  const opportunities = React.useMemo(() => getOpportunitiesForInvestor(investorId), [investorId])

  const dealRooms = React.useMemo(
    () => mockDealRooms.filter((d) => d.investorId === investorId && d.status !== "completed"),
    [investorId],
  )

  const valueSeries = React.useMemo(() => {
    const base = summary.totalPurchaseCost || summary.totalPortfolioValue
    const now = summary.totalPortfolioValue
    return [
      { m: "Mar", v: Math.round(base * 0.985) },
      { m: "Jun", v: Math.round(base * 1.01) },
      { m: "Sep", v: Math.round(base * 1.03) },
      { m: "Dec", v: Math.round(base * 1.05) },
      { m: "Now", v: Math.round(now) },
    ]
  }, [summary.totalPurchaseCost, summary.totalPortfolioValue])

  const incomeSeries = React.useMemo(() => {
    const combined: { m: string; n: number }[] = []
    // make a small 6-point trend from the 12m forecast
    const all = summary.holdings.flatMap((h) => forecastMonthlyNetIncome(h, 12))
    const byMonth = new Map<string, number>()
    for (const p of all) byMonth.set(p.month, (byMonth.get(p.month) ?? 0) + p.net)
    const months = Array.from(byMonth.keys()).sort().slice(0, 6)
    for (const month of months) combined.push({ m: month.slice(5), n: Math.round(byMonth.get(month) ?? 0) })
    return combined
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

  const topHoldings = React.useMemo(() => {
    return [...summary.holdings]
      .map((h) => ({ h, p: getHoldingProperty(h), y: calcYieldPct(h), a: calcAppreciationPct(h) }))
      .sort((x, y) => y.h.currentValue - x.h.currentValue)
      .slice(0, 5)
  }, [summary.holdings])

  const investorMemos = React.useMemo(
    () => mockMemos.filter((m) => m.investorId === investorId).slice(0, 3),
    [investorId],
  )

  const aiQuestions = [
    "How is my portfolio performing vs market?",
    "Where can I improve yield without increasing risk?",
    "Should I sell any asset in the next 6 months?",
    "Suggest the top 2 opportunities that match my mandate",
    "Summarize my risks and mitigations",
  ]

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-secondary/40 p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(6,182,212,0.12),transparent_55%)]" />

        <div className="relative">
          <PageHeader
            title={
              <span className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </span>
                <span>Welcome back, {investorName}</span>
              </span>
            }
            subtitle="Your portfolio snapshot, income outlook, and the next best opportunities—at a glance."
            primaryAction={
              <AskAIBankerWidget
                agentId="real_estate_advisor"
                title="AI Real Estate Advisor"
                description="Insights & recommendations tailored to your real estate portfolio."
                suggestedQuestions={aiQuestions}
                pagePath="/real-estate"
                scopedInvestorId={investorId}
                variant="inline"
              />
            }
            secondaryActions={
              <>
                <Button variant="outline" asChild>
                  <Link href="/real-estate">
                    Open portfolio <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/deal-room">Deal rooms</Link>
                </Button>
              </>
            }
          />

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Portfolio value"
              value={formatAED(summary.totalPortfolioValue)}
              meta={`Appreciation ${summary.appreciationPct.toFixed(1)}% since purchase`}
              right={<MiniAreaSparkline data={valueSeries} dataKey="v" />}
              badge={<Badge variant="secondary">Stable</Badge>}
            />
            <MetricCard
              label="Monthly income (effective)"
              value={formatAED(summary.totalMonthlyRental)}
              meta={`Occupancy ${summary.occupancyPct.toFixed(1)}% • Avg net yield ${summary.avgYieldPct.toFixed(2)}%`}
              right={<MiniLineSparkline data={incomeSeries} dataKey="n" />}
              badge={
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" variant="outline">
                  On track
                </Badge>
              }
            />
            <MetricCard
              label="Allocation"
              value={`${summary.propertyCount} assets`}
              meta="Diversification by property type"
              right={<AllocationPieChart data={allocation} />}
              badge={<Badge variant="outline">Balanced</Badge>}
              compactRight
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Holdings */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Holdings</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/real-estate">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Yield</TableHead>
                      <TableHead>Appreciation</TableHead>
                      <TableHead className="text-right">Insight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topHoldings.map(({ h, p, y, a }) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div className="min-w-[240px]">
                            <div className="font-medium">{p?.title ?? h.propertyId}</div>
                            <div className="text-xs text-muted-foreground">
                              {p?.area ?? "—"} • <span className="capitalize">{p?.type ?? "—"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatAED(h.currentValue)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/5">
                            {y.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              a >= 0
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {a.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AskAIBankerWidget
                            agentId="real_estate_advisor"
                            title="AI Real Estate Advisor"
                            suggestedQuestions={[
                              `What's the ROI on ${p?.title ?? "this property"}?`,
                              `How does ${p?.area ?? "this location"} compare to market averages?`,
                              `Should I hold or sell ${p?.title ?? "this property"}?`,
                            ]}
                            pagePath="/properties"
                            scopedInvestorId={investorId}
                            propertyId={h.propertyId}
                            variant="inline"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Opportunities</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/properties">Browse</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {opportunities.slice(0, 4).map((o) => (
                  <OpportunityRow key={o.propertyId} propertyId={o.propertyId} score={o.score} reasons={o.reasons} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <ContextPanel title="Investor brief">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <AlertRow title="Rent renewal window" body="One lease is within 45 days of renewal. Consider a re-price strategy." />
              <AlertRow title="Market signal" body="Dubai Marina office demand remains resilient; cap rates stable." />
              <AlertRow title="Document request" body="A due diligence document is pending in your Deal Room." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" />
                Next steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-lg border p-3">
                <div className="font-medium">Review new opportunities</div>
                <div className="mt-1 text-xs text-muted-foreground">2 assets match your mandate in preferred areas.</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-medium">Approve memo (if ready)</div>
                <div className="mt-1 text-xs text-muted-foreground">Quickly review memo highlights & approve/reject.</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                  <FolderKanban className="size-4 text-primary" />
                  Deal rooms
              </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/deal-room">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {dealRooms.length ? (
                dealRooms.slice(0, 3).map((d) => (
                  <Button key={d.id} asChild variant="outline" className="w-full justify-between">
                    <Link href={`/deal-room/${d.id}`}>
                      <span className="truncate">{d.title}</span>
                      <Badge variant="outline" className={`ml-3 shrink-0 ${dealStatusClasses[d.status]}`}>
                        {dealStatusLabel(d.status)}
                      </Badge>
                    </Link>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No ongoing deal rooms.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Recent IC memos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {investorMemos.length ? (
                investorMemos.map((m) => (
                  <Button key={m.id} asChild variant="outline" className="w-full justify-between">
                    <Link href={`/memos/${m.id}`}>
                      <span className="truncate">{m.title}</span>
                      <Badge variant="secondary" className="ml-3 capitalize">
                        {m.status}
                      </Badge>
                    </Link>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No memos yet.</div>
              )}
              <Separator />
              <Button asChild className="w-full">
                <Link href="/memos/new">Generate a memo</Link>
              </Button>
            </CardContent>
          </Card>
        </ContextPanel>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  meta,
  right,
  badge,
  compactRight,
}: {
  label: string
  value: string
  meta: string
  right: React.ReactNode
  badge?: React.ReactNode
  compactRight?: boolean
}) {
  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-secondary/30 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">{label}</div>
              {badge}
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-foreground/90">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
          </div>
          <div className={cn("w-[140px] shrink-0", compactRight ? "w-[160px]" : "")}>{right}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  )
}

function OpportunityRow({
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
    <Card className="border-border/50 hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{p.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {p.area} • <span className="capitalize">{p.type}</span>
            </div>
            <div className="mt-2 text-sm font-semibold">{formatAED(p.price)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{reasons.join(" • ")}</div>
          </div>
          <Badge variant="secondary">Score {score}</Badge>
        </div>
        <div className="mt-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/properties/${p.id}`}>
              View opportunity <ArrowUpRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


