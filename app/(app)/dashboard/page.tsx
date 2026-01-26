"use client"

import * as React from "react"
import Link from "next/link"
import { differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns"

import { PageHeader } from "@/components/layout/page-header"
import { ContextPanel } from "@/components/layout/context-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckSquare,
  ClipboardCheck,
  Clock,
  FolderKanban,
  TrendingUp,
  Users,
} from "lucide-react"
import { mockActivities, mockDealRooms, mockInvestors, mockProperties, mockTasks } from "@/lib/mock-data"
import { useApp } from "@/components/providers/app-provider"
import { InvestorDashboard } from "@/components/investor/investor-dashboard"
import { PropertyGalleryStrip } from "@/components/properties/featured-properties-carousel"
import { getInvestorById } from "@/lib/mock-data"
import type { DealRoom, Task } from "@/lib/types"
import { formatAED } from "@/lib/real-estate"

const priorityOrder: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 }

function getActivityIcon(type: string) {
  switch (type) {
    case "investor_added":
      return Users
    case "property_listed":
      return Building2
    case "memo_created":
      return TrendingUp
    case "task_completed":
      return CheckSquare
    case "deal_updated":
      return AlertCircle
    default:
      return Clock
  }
}

function DashboardPage() {
  const { role, scopedInvestorId } = useApp()

  if (role === "investor") {
    const investorId = scopedInvestorId ?? "inv-1"
    const investorName = getInvestorById(investorId)?.name ?? "Investor"
    return <InvestorDashboard investorId={investorId} investorName={investorName} />
  }

  return <InternalDashboard />
}

function InternalDashboard() {
  const { user } = useApp()
  const today = React.useMemo(() => new Date(), [])

  const openTasks = React.useMemo(() => mockTasks.filter((t) => t.status !== "done"), [])
  const prioritizedTasks = React.useMemo(() => {
    return [...openTasks].sort((a, b) => {
      const aDue = a.dueDate ? differenceInCalendarDays(parseISO(a.dueDate), today) : Number.POSITIVE_INFINITY
      const bDue = b.dueDate ? differenceInCalendarDays(parseISO(b.dueDate), today) : Number.POSITIVE_INFINITY
      if (aDue !== bDue) return aDue - bDue
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [openTasks, today])

  const liveDeals = React.useMemo(() => mockDealRooms.filter((d) => d.status !== "completed"), [])

  const investorsNeedingTouch = React.useMemo(() => {
    return [...mockInvestors]
      .filter((inv) => inv.status !== "inactive")
      .sort((a, b) => parseISO(a.lastContact).getTime() - parseISO(b.lastContact).getTime())
      .slice(0, 6)
  }, [])

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

  const stats = React.useMemo(() => {
    const activeInvestors = mockInvestors.filter((inv) => inv.status === "active").length
    const pipelineValue = liveDeals.reduce((sum, deal) => sum + (deal.ticketSizeAed ?? 0), 0)
    const tasksDueSoon = prioritizedTasks.filter((task) => {
      if (!task.dueDate) return false
      return differenceInCalendarDays(parseISO(task.dueDate), today) <= 3
    }).length
    const needsVerification = readinessBuckets["NEEDS_VERIFICATION"] ?? 0

    return [
      {
        label: "Active investors",
        value: `${activeInvestors}`,
        meta: "Relationships to keep warm",
        icon: Users,
      },
      {
        label: "Live pipeline (AED)",
        value: formatAED(pipelineValue),
        meta: `${liveDeals.length} active deals`,
        icon: FolderKanban,
      },
      {
        label: "Tasks due soon",
        value: `${tasksDueSoon}`,
        meta: "Next 72 hours",
        icon: CheckSquare,
      },
      {
        label: "Needs verification",
        value: `${needsVerification}`,
        meta: "Inventory blocking memos",
        icon: AlertCircle,
      },
    ]
  }, [liveDeals, prioritizedTasks, readinessBuckets, today])

  const pipelineStages = React.useMemo(() => {
    const stageOrder: DealRoom["status"][] = ["preparation", "due-diligence", "negotiation", "closing"]
    const stageLabel: Record<DealRoom["status"], string> = {
      preparation: "Preparation",
      "due-diligence": "Due diligence",
      negotiation: "Negotiation",
      closing: "Closing",
      completed: "Completed",
    }
    return stageOrder.map((stage) => {
      const deals = liveDeals.filter((d) => d.status === stage)
      const value = deals.reduce((sum, d) => sum + (d.ticketSizeAed ?? 0), 0)
      return {
        stage,
        label: stageLabel[stage],
        count: deals.length,
        value,
      }
    })
  }, [liveDeals])

  const activityFeed = React.useMemo(
    () => [...mockActivities].sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1)).slice(0, 7),
    [],
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-100 p-8">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <ClipboardCheck className="size-5" />
              </span>
              <span>Good morning, {user.name}</span>
            </span>
          }
          subtitle="Your daily command center for investors, deals, and inventory."
          primaryAction={
            <Button asChild>
              <Link href="/realtor">
                Open Realtor Ops <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>
          }
          secondaryActions={
            <>
              <Button variant="outline" asChild>
                <Link href="/investors">Investors</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/properties">Inventory</Link>
              </Button>
            </>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Featured Properties Gallery */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Featured Properties</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/properties">
                View all <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PropertyGalleryStrip
            properties={mockProperties.filter(p => p.status === "available").slice(0, 8)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Pipeline by stage</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/deal-room">
                    Deal rooms <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pipelineStages.map((row) => (
                      <TableRow key={row.stage}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className="text-right text-sm">{formatAED(row.value)}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Today’s priorities</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/tasks">
                    Task board <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prioritizedTasks.length ? (
                prioritizedTasks.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} today={today} />)
              ) : (
                <div className="text-sm text-gray-500">No open tasks. Enjoy the breather!</div>
              )}
              <Separator />
              <Button variant="outline" asChild className="w-full">
                <Link href="/tasks">Open all tasks</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Investor follow-ups</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/investors">
                    CRM <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {investorsNeedingTouch.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mandate</TableHead>
                        <TableHead>Last touch</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investorsNeedingTouch.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{investor.name}</p>
                              <p className="text-xs text-gray-500">{investor.company}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div className="font-medium capitalize">{investor.mandate?.strategy ?? "—"}</div>
                              <div className="text-gray-500">Yield {investor.mandate?.yieldTarget ?? "—"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {formatDistanceToNowStrict(parseISO(investor.lastContact))} ago
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/investors/${investor.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-gray-500 py-8 text-center text-sm">All investors are up to date</div>
              )}
            </CardContent>
          </Card>
        </div>

        <ContextPanel title="Recent activity">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Inventory readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["READY_FOR_MEMO", "NEEDS_VERIFICATION", "DRAFT"] as const).map((status) => (
                <div key={status} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{status.replaceAll("_", " ").toLowerCase()}</span>
                    <Badge variant="secondary">{readinessBuckets[status] ?? 0}</Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-primary"
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

              {verificationQueue.length ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-600">Verify next</div>
                    {verificationQueue.map((p) => (
                      <Button key={p.id} variant="outline" size="sm" asChild className="w-full justify-between">
                        <Link href={`/properties/${p.id}`}>
                          <span className="truncate">{p.title}</span>
                          <ArrowUpRight className="ml-2 size-4 shrink-0" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Latest activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityFeed.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.description}</p>
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {formatDistanceToNowStrict(new Date(activity.timestamp))}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </ContextPanel>
      </div>
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
    <Card className="bg-white border border-gray-100 rounded-xl shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
          <div className="mt-1 text-xs text-gray-500">{meta}</div>
        </div>
        <div className="rounded-full bg-green-50 p-3 text-green-600">
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
      ? "text-gray-500"
      : dueInDays < 0
        ? "text-destructive"
        : dueInDays <= 1
          ? "text-amber-600 dark:text-amber-300"
          : "text-gray-500"

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-900">{task.title}</span>
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

export default DashboardPage
