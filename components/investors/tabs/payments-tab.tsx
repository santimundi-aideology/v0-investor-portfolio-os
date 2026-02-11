"use client"

import * as React from "react"
import { Calendar, CheckCircle2, Clock, DollarSign, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { EmptyState } from "@/components/layout/empty-state"
import { useAPI } from "@/lib/hooks/use-api"

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

type Summary = {
  totalAmount: number
  totalPaid: number
  totalUpcoming: number
  paidPct: number
  holdingCount: number
  nextPayment: {
    propertyTitle: string
    label: string
    amount: number
    dueDate: string | null
  } | null
  upcomingPayments: Array<{
    propertyTitle: string
    label: string
    amount: number
    dueDate: string | null
    holdingId: string
  }>
}

type PaymentResponse = {
  milestones: Milestone[]
  summary: Summary
}

function formatAED(value: number) {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  paid: { label: "Paid", variant: "default" },
  upcoming: { label: "Upcoming", variant: "secondary" },
  due: { label: "Due", variant: "destructive" },
  overdue: { label: "Overdue", variant: "destructive" },
  pending: { label: "Pending", variant: "outline" },
}

export function PaymentsTab({ investorId }: { investorId: string }) {
  const { data, isLoading, error } = useAPI<PaymentResponse>(
    investorId ? `/api/investors/${investorId}/payment-milestones` : null
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading payment milestones...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <span className="text-sm text-destructive">Failed to load payment data</span>
        </CardContent>
      </Card>
    )
  }

  const milestones = data?.milestones ?? []
  const summary = data?.summary

  if (milestones.length === 0) {
    return (
      <EmptyState
        title="No payment milestones"
        description="This investor has no payment milestones tracked yet."
        icon={<DollarSign className="size-5" />}
      />
    )
  }

  // Group milestones by holding
  const groupedByHolding = milestones.reduce<Record<string, { propertyTitle: string; purchasePrice: number; milestones: Milestone[] }>>((acc, m) => {
    if (!acc[m.holdingId]) {
      acc[m.holdingId] = {
        propertyTitle: m.propertyTitle,
        purchasePrice: m.purchasePrice,
        milestones: [],
      }
    }
    acc[m.holdingId].milestones.push(m)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="size-4" />
                <span className="text-xs">Total</span>
              </div>
              <div className="mt-1 text-xl font-bold">{formatAED(summary.totalAmount)}</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-4" />
                <span className="text-xs">Paid</span>
              </div>
              <div className="mt-1 text-xl font-bold text-emerald-700">{formatAED(summary.totalPaid)}</div>
              <Progress value={summary.paidPct} className="mt-2 h-1.5" />
              <div className="mt-1 text-[10px] text-muted-foreground">{summary.paidPct}% complete</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4" />
                <span className="text-xs">Upcoming</span>
              </div>
              <div className="mt-1 text-xl font-bold">{formatAED(summary.totalUpcoming)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" />
                <span className="text-xs">Next Payment</span>
              </div>
              {summary.nextPayment ? (
                <>
                  <div className="mt-1 text-sm font-semibold">{formatAED(summary.nextPayment.amount)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {summary.nextPayment.label} - {formatDate(summary.nextPayment.dueDate)}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">All paid</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming payments alert */}
      {summary?.upcomingPayments && summary.upcomingPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.upcomingPayments.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.propertyTitle}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatAED(p.amount)}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(p.dueDate)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-property breakdown */}
      {Object.entries(groupedByHolding).map(([holdingId, group]) => {
        const paidCount = group.milestones.filter((m) => m.status === "paid").length
        const totalCount = group.milestones.length
        const paidAmount = group.milestones.filter((m) => m.status === "paid").reduce((s, m) => s + m.amount, 0)
        const totalAmount = group.milestones.reduce((s, m) => s + m.amount, 0)
        const paidPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0

        return (
          <Card key={holdingId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{group.propertyTitle}</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {paidCount}/{totalCount} paid
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Purchase: {formatAED(group.purchasePrice)}</span>
                <span>{paidPct}% paid</span>
              </div>
              <Progress value={paidPct} className="mt-2 h-1.5" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.milestones.map((m) => {
                  const cfg = statusConfig[m.status] ?? statusConfig.pending
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-md border p-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.label}</span>
                          <Badge variant={cfg.variant} className="text-[10px]">
                            {cfg.label}
                          </Badge>
                        </div>
                        {m.percentage && (
                          <div className="text-[10px] text-muted-foreground">{m.percentage}% of purchase</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatAED(m.amount)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {m.status === "paid" ? `Paid ${formatDate(m.paidDate)}` : `Due ${formatDate(m.dueDate)}`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
