"use client"

import * as React from "react"
import Link from "next/link"
import { differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns"
import {
  ActivitySquare,
  ArrowUpRight,
  CheckSquare,
  ClipboardCheck,
  FolderKanban,
  MapPinned,
  Phone,
  Target,
  Users,
} from "lucide-react"

import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { PageHeader } from "@/components/layout/page-header"
import { useApp } from "@/components/providers/app-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { mockActivities, mockDealRooms, mockInvestors, mockProperties, mockTasks } from "@/lib/mock-data"
import type { DealRoom, Task } from "@/lib/types"
import { formatAED } from "@/lib/real-estate"

type DealStageKey = "preparation" | "due-diligence" | "negotiation" | "closing"

const stageMeta: Record<
  DealStageKey,
  { label: string; hint: string; accent: string; badgeClass: string; emptyTitle: string }
> = {
  preparation: {
    label: "Preparation",
    hint: "Mandates + underwriting",
    accent: "border-amber-100 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
    emptyTitle: "No deals in preparation",
  },
  "due-diligence": {
    label: "Due diligence",
    hint: "Inspections & docs",
    accent: "border-sky-100 bg-sky-50/50 dark:border-sky-900/40 dark:bg-sky-950/20",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
    emptyTitle: "No active diligence files",
  },
  negotiation: {
    label: "Negotiation",
    hint: "LOIs + terms",
    accent: "border-violet-100 bg-violet-50/40 dark:border-violet-900/40 dark:bg-violet-950/20",
    badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100",
    emptyTitle: "No negotiations in flight",
  },
  closing: {
    label: "Closing",
    hint: "MOU to transfer",
    accent: "border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
    emptyTitle: "Nothing nearing closing",
  },
}

const priorityOrder: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 }

export default function RealtorOpsPage() {
  const { user } = useApp()
  const today = React.useMemo(() => new Date(), [])

  const openTasks = React.useMemo(
    () => mockTasks.filter((task) => task.status !== "done"),
    [],
  )

  const prioritizedTasks = React.useMemo(() => {
    return [...openTasks].sort((a, b) => {
      const aDue = a.dueDate ? differenceInCalendarDays(parseISO(a.dueDate), today) : Number.POSITIVE_INFINITY
      const bDue = b.dueDate ? differenceInCalendarDays(parseISO(b.dueDate), today) : Number.POSITIVE_INFINITY
      if (aDue !== bDue) return aDue - bDue
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [openTasks, today])

  const stagePipelines = React.useMemo(() => {
    const initial: Record<DealStageKey, DealRoom[]> = {
      preparation: [],
      "due-diligence": [],
      negotiation: [],
      closing: [],
    }
    for (const deal of mockDealRooms) {
      if (deal.status === "completed") continue
      if (initial[deal.status as DealStageKey]) {
        initial[deal.status as DealStageKey].push(deal)
      }
    }
    return initial
  }, [])

  const investorsNeedingTouch = React.useMemo(() => {
    return [...mockInvestors]
      .filter((inv) => inv.status !== "inactive")
      .sort((a, b) => {
        const aDate = parseISO(a.lastContact)
        const bDate = parseISO(b.lastContact)
        return aDate.getTime() - bDate.getTime()
      })
      .slice(0, 5)
  }, [])

  const tasksByInvestor = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const task of openTasks) {
      if (!task.investorId) continue
      map.set(task.investorId, (map.get(task.investorId) ?? 0) + 1)
    }
    return map
  }, [openTasks])

  const readinessBuckets = React.useMemo(() => {
    return mockProperties.reduce(
      (acc, property) => {
        acc[property.readinessStatus] = (acc[property.readinessStatus] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }, [])

  const verificationQueue = React.useMemo(
    () => mockProperties.filter((p) => p.readinessStatus === "NEEDS_VERIFICATION").slice(0, 4),
    [],
  )

  const activityFeed = React.useMemo(
    () => [...mockActivities].sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1)).slice(0, 5),
    [],
  )

  const statCards = React.useMemo(() => {
    const activeInvestors = mockInvestors.filter((inv) => inv.status === "active").length
    const pipelineValue = mockDealRooms.reduce((sum, deal) => sum + (deal.ticketSizeAed ?? 0), 0)
    const tasksDueSoon = prioritizedTasks.filter((task) => {
      if (!task.dueDate) return false
      return differenceInCalendarDays(parseISO(task.dueDate), today) <= 3
    }).length
    const diligenceDeals = mockDealRooms.filter((deal) => deal.status === "due-diligence").length
    return [
      {
        label: "Active investors",
        value: `${activeInvestors}`,
        meta: "Relationships that need weekly touch",
        icon: Users,
      },
      {
        label: "Pipeline (AED)",
        value: formatAED(pipelineValue),
        meta: "Ticket size across live deals",
        icon: FolderKanban,
      },
      {
        label: "Tasks due soon",
        value: `${tasksDueSoon}`,
        meta: "Next 72h reminders",
        icon: CheckSquare,
      },
      {
        label: "Deals in diligence",
        value: `${diligenceDeals}`,
        meta: "Needing inspection / docs",
        icon: Target,
      },
    ]
  }, [prioritizedTasks, today])

  const aiQuestions = [
    "Which investor do I need to follow up with today?",
    "Summarize blockers in my live deals",
    "Draft a follow-up note for the Marina Tower LOI",
    "Highlight properties that still need verification",
    "What should be my top 3 actions right now?",
  ]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-secondary/40 p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_0%_20%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(900px_circle_at_80%_0%,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="relative">
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardCheck className="size-5" />
                </span>
                <span>Good morning, {user.name}</span>
              </span>
            }
            subtitle="Run your mandates, deals, and follow-ups from a single cockpit."
            primaryAction={
              <AskAIBankerWidget
                agentId="real_estate_advisor"
                title="AI Deal Copilot"
                description="Ask for investor updates, deal blockers, or draft notes."
                suggestedQuestions={aiQuestions}
                pagePath="/realtor"
              />
            }
            secondaryActions={
              <>
                <Button variant="outline" asChild>
                  <Link href="/tasks">
                    Tasks <ArrowUpRight className="ml-2 size-4" />
                  </Link>
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
        {statCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-4 text-primary" />
                Key priorities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prioritizedTasks.length ? (
                prioritizedTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} today={today} />)
              ) : (
                <div className="text-sm text-muted-foreground">No open tasks. Enjoy the breather!</div>
              )}
              <Separator />
              <Button variant="outline" asChild className="w-full">
                <Link href="/tasks">Open task board</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="size-4 text-primary" />
                Pipeline board
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Track inspection, LOI, and closing progress across mandates.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                {(Object.keys(stageMeta) as DealStageKey[]).map((stage) => (
                  <StageColumn key={stage} stage={stage} deals={stagePipelines[stage]} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Phone className="size-4 text-primary" />
                Investor follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Mandate</TableHead>
                      <TableHead>Last touch</TableHead>
                      <TableHead className="text-right">Open tasks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investorsNeedingTouch.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="font-medium">{inv.name}</div>
                          <div className="text-xs text-muted-foreground">{inv.company}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium capitalize">{inv.mandate?.strategy ?? "—"}</div>
                          <div className="text-muted-foreground">Yield {inv.mandate?.yieldTarget ?? "—"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNowStrict(parseISO(inv.lastContact))} ago
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {tasksByInvestor.get(inv.id) ?? 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button variant="outline" asChild className="w-full">
                <Link href="/investors">View all investors</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MapPinned className="size-4 text-primary" />
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
                <div className="text-sm font-semibold">Needs verification</div>
                {verificationQueue.length ? (
                  verificationQueue.map((property) => (
                    <div key={property.id} className="flex items-center justify-between rounded-lg border p-2">
                      <div>
                        <div className="font-medium">{property.title}</div>
                        <div className="text-muted-foreground">{property.area}</div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/properties/${property.id}`}>Open</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground">All properties verified. 🎉</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ActivitySquare className="size-4 text-primary" />
                Latest activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {activityFeed.map((activity) => (
                <div key={activity.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{activity.type.replaceAll("_", " ")}</span>
                    <span>{formatDistanceToNowStrict(new Date(activity.timestamp))} ago</span>
                  </div>
                  <div className="mt-1 font-medium">{activity.title}</div>
                  <div className="text-xs text-muted-foreground">{activity.description}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AskAIBankerWidget
        variant="floating"
        agentId="real_estate_advisor"
        title="AI Deal Copilot"
        suggestedQuestions={aiQuestions}
        pagePath="/realtor"
      />
    </div>
  )
}

function KpiCard({
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
    <Card className="border-border/50 bg-gradient-to-br from-card to-muted/50 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">{label}</div>
          <div className="mt-1 text-2xl font-bold text-foreground/90">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
        </div>
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function TaskRow({ task, today }: { task: Task; today: Date }) {
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
      ? "text-muted-foreground"
      : dueInDays < 0
        ? "text-destructive"
        : dueInDays <= 1
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground"

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{task.title}</span>
        <Badge variant="outline" className="capitalize">
          {task.priority}
        </Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {task.investorName ?? "Internal"} {task.propertyTitle ? `• ${task.propertyTitle}` : null}
      </div>
      <div className={`mt-2 text-xs font-semibold ${dueClass}`}>{dueLabel}</div>
    </div>
  )
}

function StageColumn({ stage, deals }: { stage: DealStageKey; deals: DealRoom[] }) {
  const meta = stageMeta[stage]
  const totalValue = deals.reduce((sum, deal) => sum + (deal.ticketSizeAed ?? 0), 0)
  return (
    <div className={`rounded-2xl border ${meta.accent} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{meta.label}</div>
          <div className="text-xs text-muted-foreground">{meta.hint}</div>
        </div>
        <Badge className={`${meta.badgeClass}`}>{deals.length}</Badge>
      </div>
      <div className="mt-2 text-xs font-semibold text-muted-foreground">{formatAED(totalValue)}</div>
      <div className="mt-3 space-y-3">
        {deals.length ? (
          deals.map((deal) => (
            <div key={deal.id} className="rounded-lg border bg-background/60 p-3 text-xs">
              <div className="font-semibold">{deal.propertyTitle}</div>
              <div className="text-muted-foreground">{deal.investorName}</div>
              {deal.nextStep ? <div className="mt-1 text-[11px] text-primary">Next: {deal.nextStep}</div> : null}
              <div className="mt-2 flex items-center justify-between">
                <span>Prob {deal.probability ?? 0}%</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/deal-room/${deal.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">{meta.emptyTitle}</div>
        )}
      </div>
    </div>
  )
}

