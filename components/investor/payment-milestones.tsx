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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"

/* ─── Types ─────────────────────────────────────────────── */

type Milestone = {
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

type PaymentSummary = {
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

type APIResponse = {
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

function formatDate(d: string | null): string {
  if (!d) return "TBD"
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

function formatDateFull(d: string | null): string {
  if (!d) return "TBD"
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/* ─── Holding-level milestone list ──────────────────────── */

export function HoldingPaymentMilestones({ holdingId }: { holdingId: string }) {
  const { data, isLoading } = useAPI<APIResponse>(
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
            const sc = statusConfig[m.status] ?? statusConfig.upcoming
            const Icon = sc.icon
            const isLast = idx === milestones.length - 1

            return (
              <div key={m.id} className="flex gap-3">
                {/* Timeline line + icon */}
                <div className="flex flex-col items-center">
                  <Icon className={cn("size-5 shrink-0 z-10 bg-background", sc.color)} />
                  {!isLast && (
                    <div className={cn(
                      "w-px flex-1 min-h-[24px]",
                      m.status === "paid" ? "bg-emerald-300" : "bg-border"
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        m.status === "paid" && "text-muted-foreground"
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
                        m.status === "paid" ? "text-muted-foreground" : "text-foreground"
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

export function PortfolioPaymentOverview() {
  const { data, isLoading } = useAPI<APIResponse>("/api/investor/payment-milestones")

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
    return null
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
      {/* Summary KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatAED(summary.totalAmount)}</p>
            <p className="text-[11px] text-muted-foreground">Total Commitments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatAED(summary.totalPaid)}</p>
            <p className="text-[11px] text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{formatAED(summary.totalUpcoming)}</p>
            <p className="text-[11px] text-muted-foreground">Remaining</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.paidPct}%</p>
            <p className="text-[11px] text-muted-foreground">Overall Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall progress bar */}
      <Card>
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
              {summary.upcomingPayments.map((p, idx) => (
                <Link
                  key={idx}
                  href={`/investor/portfolio/${p.holdingId}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-all hover:border-primary hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.propertyTitle}</p>
                    <p className="text-xs text-muted-foreground">{p.label}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatAED(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDateFull(p.dueDate)}</p>
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
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
                    const sc = statusConfig[m.status] ?? statusConfig.upcoming
                    const Icon = sc.icon
                    return (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <Icon className={cn("size-3.5 shrink-0", sc.color)} />
                        <span className={cn("flex-1 truncate", m.status === "paid" && "text-muted-foreground")}>
                          {m.label}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {m.status === "paid" ? formatDate(m.paidDate) : formatDate(m.dueDate)}
                        </span>
                        <span className={cn(
                          "font-medium tabular-nums shrink-0 w-20 text-right",
                          m.status === "paid" ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {formatAED(m.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Next payment callout */}
                {nextUnpaid && (
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-blue-700 dark:text-blue-300 font-medium">Next: </span>
                      <span className="text-blue-600 dark:text-blue-400">{nextUnpaid.label}</span>
                    </div>
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
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
