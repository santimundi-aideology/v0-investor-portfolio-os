"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Loader2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"

/* ─── Types (exported for payments page) ─────────────────── */

export type Milestone = {
  id: string
  holdingId: string
  propertyTitle: string
  propertyArea: string
  purchasePrice: number
  label: string
  milestoneType: string
  sequenceOrder: number
  amount: number
  percentage: number | null
  dueDate: string | null
  paidDate: string | null
  status: string
  notes: string | null
}

export type PaymentSummary = {
  totalAmount: number
  totalPaid: number
  totalUpcoming: number
  paidPct: number
  holdingCount: number
  nextPayment: {
    propertyTitle: string
    label: string
    amount: number
    dueDate: string
  } | null
  upcomingPayments: {
    propertyTitle: string
    label: string
    amount: number
    dueDate: string
    holdingId: string
  }[]
}

export type PaymentMilestonesAPIResponse = {
  milestones: Milestone[]
  summary: PaymentSummary
}

/* ─── Status helpers ────────────────────────────────────── */

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  paid: { icon: CheckCircle2, color: "text-emerald-600", label: "Paid" },
  scheduled: { icon: Clock, color: "text-blue-600", label: "Scheduled" },
  upcoming: { icon: Circle, color: "text-gray-400", label: "Upcoming" },
  overdue: { icon: AlertCircle, color: "text-rose-600", label: "Overdue" },
}

const today = () => new Date().toISOString().slice(0, 10)

/** Resolve display status: treat past-due unpaid as overdue */
export function getDisplayStatus(m: Milestone): string {
  if (m.status === "paid") return "paid"
  if (m.dueDate && m.dueDate < today()) return "overdue"
  return m.status || "upcoming"
}

export function formatDate(d: string | null): string {
  if (!d) return "TBD"
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

export function formatDateFull(d: string | null): string {
  if (!d) return "TBD"
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/* ─── Mark as paid button ───────────────────────────────── */

function MarkAsPaidButton({ milestoneId, onSuccess }: { milestoneId: string; onSuccess: () => void }) {
  const [loading, setLoading] = React.useState(false)
  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/investor/payment-milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) onSuccess()
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0 h-7 text-xs border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Mark paid"}
    </Button>
  )
}

/* ─── Holding-level milestone list ──────────────────────── */

export function HoldingPaymentMilestones({ holdingId }: { holdingId: string }) {
  const { data, isLoading } = useAPI<PaymentMilestonesAPIResponse>(
    holdingId ? `/api/investor/payment-milestones?holdingId=${holdingId}` : null
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.milestones.length === 0) {
    return null // Don't show card if no milestones
  }

  const milestones = data.milestones
  const totalAmount = milestones.reduce((s, m) => s + m.amount, 0)
  const totalPaid = milestones.filter(m => m.status === "paid").reduce((s, m) => s + m.amount, 0)
  const paidPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-primary" />
            Payment Schedule
          </CardTitle>
          <Badge variant="outline" className={cn(
            "text-xs",
            paidPct === 100
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              : "border-blue-500/30 bg-blue-500/10 text-blue-700"
          )}>
            {paidPct}% paid
          </Badge>
        </div>
        <CardDescription>
          {formatAED(totalPaid)} of {formatAED(totalAmount)} paid
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <Progress value={paidPct} className="h-2" />

        {/* Milestones timeline */}
        <div className="relative space-y-0">
          {milestones.map((m, idx) => {
            const displayStatus = getDisplayStatus(m)
            const sc = statusConfig[displayStatus] ?? statusConfig.upcoming
            const Icon = sc.icon
            const isLast = idx === milestones.length - 1
            const isOverdue = displayStatus === "overdue"

            return (
              <div key={m.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <Icon className={cn("size-5 shrink-0 z-10 bg-background", sc.color)} />
                  {!isLast && (
                    <div className={cn(
                      "w-px flex-1 min-h-[24px]",
                      m.status === "paid" ? "bg-emerald-300" : isOverdue ? "bg-rose-300" : "bg-border"
                    )} />
                  )}
                </div>
                <div className={cn("flex-1 pb-4", isLast && "pb-0", isOverdue && "rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 px-2 py-1 -mx-2")}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        m.status === "paid" && "text-muted-foreground",
                        isOverdue && "text-rose-700 dark:text-rose-300"
                      )}>
                        {m.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.status === "paid"
                          ? `Paid ${formatDateFull(m.paidDate)}`
                          : `Due ${formatDateFull(m.dueDate)}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-semibold",
                        m.status === "paid" ? "text-muted-foreground" : "text-foreground",
                        isOverdue && "text-rose-700 dark:text-rose-300"
                      )}>
                        {formatAED(m.amount)}
                      </p>
                      {m.percentage && (
                        <p className="text-[10px] text-muted-foreground">{m.percentage}%</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Portfolio-wide payment overview ───────────────────── */

type PortfolioPaymentOverviewProps = {
  /** When provided, use this data instead of fetching (for payments page with filters) */
  data?: PaymentMilestonesAPIResponse | null
  /** Callback after marking a milestone as paid */
  onMarkPaid?: (milestoneId: string) => void
  /** Revalidate after mark paid */
  mutate?: () => void
  /** Show "Mark as paid" button on unpaid milestones */
  showMarkAsPaid?: boolean
  /** When true, do not render the summary KPI cards (e.g. when shown in page hero) */
  hideSummaryKpis?: boolean
}

export function PortfolioPaymentOverview({
  data: dataProp,
  onMarkPaid,
  mutate,
  showMarkAsPaid = false,
  hideSummaryKpis = false,
}: PortfolioPaymentOverviewProps = {}) {
  const { data: fetchedData, isLoading, mutate: swrMutate } = useAPI<PaymentMilestonesAPIResponse>(
    dataProp === undefined ? "/api/investor/payment-milestones" : null
  )
  const data = dataProp !== undefined ? dataProp : fetchedData

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.milestones.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <CreditCard className="size-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No payment milestones yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Payment milestones are installments linked to properties in your portfolio (e.g. down payment, stage payments, or handover). Add assets with a payment plan to see your schedule here.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="default">
              <Link href="/investor/portfolio">Go to Portfolio</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/investor/opportunities">Browse opportunities</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { summary, milestones } = data

  // Group by holding
  const holdingGroups = new Map<string, { title: string; area: string; purchasePrice: number; milestones: Milestone[] }>()
  for (const m of milestones) {
    if (!holdingGroups.has(m.holdingId)) {
      holdingGroups.set(m.holdingId, {
        title: m.propertyTitle,
        area: m.propertyArea,
        purchasePrice: m.purchasePrice,
        milestones: [],
      })
    }
    holdingGroups.get(m.holdingId)!.milestones.push(m)
  }

  return (
    <div className="space-y-4">
      {!hideSummaryKpis && (
        <>
          {/* Summary KPIs — responsive grid, touch-friendly on mobile */}
          <div className="grid gap-2 grid-cols-2 sm:gap-3 sm:grid-cols-4">
            <Card className="min-h-[72px] sm:min-h-0">
              <CardContent className="p-3 text-center sm:p-4">
                <p className="text-lg font-bold tabular-nums sm:text-2xl">{formatAED(summary.totalAmount)}</p>
                <p className="text-[11px] text-muted-foreground">Total Commitments</p>
              </CardContent>
            </Card>
            <Card className="min-h-[72px] sm:min-h-0">
              <CardContent className="p-3 text-center sm:p-4">
                <p className="text-lg font-bold tabular-nums text-emerald-600 sm:text-2xl">{formatAED(summary.totalPaid)}</p>
                <p className="text-[11px] text-muted-foreground">Total Paid</p>
              </CardContent>
            </Card>
            <Card className="min-h-[72px] sm:min-h-0">
              <CardContent className="p-3 text-center sm:p-4">
                <p className="text-lg font-bold tabular-nums text-blue-600 sm:text-2xl">{formatAED(summary.totalUpcoming)}</p>
                <p className="text-[11px] text-muted-foreground">Remaining</p>
              </CardContent>
            </Card>
            <Card className="min-h-[72px] sm:min-h-0">
              <CardContent className="p-3 text-center sm:p-4">
                <p className="text-lg font-bold tabular-nums sm:text-2xl">{summary.paidPct}%</p>
                <p className="text-[11px] text-muted-foreground">Overall Progress</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Progress bar: always show (when KPIs hidden, show as first element in schedule) */}
      <Card className="rounded-xl border border-gray-200/80 dark:border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Portfolio Payment Progress</span>
            <span className="text-sm text-muted-foreground">{summary.paidPct}% complete</span>
          </div>
          <Progress value={summary.paidPct} className="h-3" />
        </CardContent>
      </Card>

      {/* Upcoming payments */}
      {summary.upcomingPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4 text-primary" />
              Upcoming Payments
            </CardTitle>
            <CardDescription>Next scheduled payments across your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.upcomingPayments.map((p, idx) => {
                const isOverdue = p.dueDate && p.dueDate < today()
                return (
                  <Link
                    key={idx}
                    href={`/investor/portfolio/${p.holdingId}`}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 transition-all hover:border-primary hover:shadow-sm",
                      isOverdue && "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium truncate", isOverdue && "text-rose-800 dark:text-rose-200")}>{p.propertyTitle}</p>
                      <p className={cn("text-xs text-muted-foreground", isOverdue && "text-rose-600 dark:text-rose-400")}>{p.label}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={cn("text-sm font-semibold", isOverdue && "text-rose-700 dark:text-rose-300")}>{formatAED(p.amount)}</p>
                        <p className={cn("text-xs text-muted-foreground", isOverdue && "text-rose-600 dark:text-rose-400")}>{formatDateFull(p.dueDate)}</p>
                      </div>
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-holding breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-primary" />
            Payment Schedule by Property
          </CardTitle>
          <CardDescription>
            Milestone breakdown for each holding in your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from(holdingGroups.entries()).map(([holdingId, group]) => {
            const paid = group.milestones.filter(m => m.status === "paid").reduce((s, m) => s + m.amount, 0)
            const total = group.milestones.reduce((s, m) => s + m.amount, 0)
            const pct = total > 0 ? Math.round((paid / total) * 100) : 0
            const nextUnpaid = group.milestones.find(m => m.status !== "paid")

            return (
              <div key={holdingId} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/investor/portfolio/${holdingId}`} className="text-sm font-semibold hover:underline truncate block">
                      {group.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{group.area}</p>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] shrink-0",
                    pct === 100
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-700"
                  )}>
                    {pct === 100 ? "Fully Paid" : `${pct}% paid`}
                  </Badge>
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatAED(paid)} paid</span>
                    <span>{formatAED(total)} total</span>
                  </div>
                </div>

                {/* Compact milestone list */}
                <div className="grid gap-1.5">
                  {group.milestones.map(m => {
                    const displayStatus = getDisplayStatus(m)
                    const sc = statusConfig[displayStatus] ?? statusConfig.upcoming
                    const Icon = sc.icon
                    const isOverdue = displayStatus === "overdue"
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-center gap-2 text-xs rounded px-2 py-1 -mx-2",
                          isOverdue && "bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800"
                        )}
                      >
                        <Icon className={cn("size-3.5 shrink-0", sc.color)} />
                        <span className={cn("flex-1 truncate min-w-0", m.status === "paid" && "text-muted-foreground", isOverdue && "text-rose-700 dark:text-rose-300 font-medium")}>
                          {m.label}
                        </span>
                        <span className={cn("text-muted-foreground shrink-0", isOverdue && "text-rose-600 dark:text-rose-400")}>
                          {m.status === "paid" ? formatDate(m.paidDate) : formatDate(m.dueDate)}
                        </span>
                        <span className={cn(
                          "font-medium tabular-nums shrink-0 w-20 text-right",
                          m.status === "paid" ? "text-muted-foreground" : "text-foreground",
                          isOverdue && "text-rose-700 dark:text-rose-300"
                        )}>
                          {formatAED(m.amount)}
                        </span>
                        {showMarkAsPaid && m.status !== "paid" && (
                          <MarkAsPaidButton
                            milestoneId={m.id}
                            onSuccess={() => {
                              onMarkPaid?.(m.id)
                              mutate?.()
                              swrMutate?.()
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Next payment callout */}
                {nextUnpaid && (
                  <div className={cn(
                    "rounded-md px-3 py-2 flex items-center justify-between",
                    getDisplayStatus(nextUnpaid) === "overdue"
                      ? "bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800"
                      : "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                  )}>
                    <div className="text-xs">
                      <span className={cn(
                        "font-medium",
                        getDisplayStatus(nextUnpaid) === "overdue"
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-blue-700 dark:text-blue-300"
                      )}>
                        {getDisplayStatus(nextUnpaid) === "overdue" ? "Overdue: " : "Next: "}
                      </span>
                      <span className={getDisplayStatus(nextUnpaid) === "overdue" ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}>
                        {nextUnpaid.label}
                      </span>
                    </div>
                    <div className={cn(
                      "text-xs font-semibold",
                      getDisplayStatus(nextUnpaid) === "overdue" ? "text-rose-700 dark:text-rose-300" : "text-blue-700 dark:text-blue-300"
                    )}>
                      {formatAED(nextUnpaid.amount)} &middot; {formatDateFull(nextUnpaid.dueDate)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
