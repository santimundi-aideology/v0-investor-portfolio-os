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
    accent: "border-amber-200 bg-amber-50",
    badgeClass: "bg-amber-100 text-amber-700",
    emptyTitle: "No deals in preparation",
  },
  "due-diligence": {
    label: "Due diligence",
    hint: "Inspections & docs",
    accent: "border-sky-200 bg-sky-50",
    badgeClass: "bg-sky-100 text-sky-700",
    emptyTitle: "No active diligence files",
  },
  negotiation: {
    label: "Negotiation",
    hint: "LOIs + terms",
    accent: "border-violet-200 bg-violet-50",
    badgeClass: "bg-violet-100 text-violet-700",
    emptyTitle: "No negotiations in flight",
  },
  closing: {
    label: "Closing",
    hint: "MOU to transfer",
    accent: "border-green-200 bg-green-50",
    badgeClass: "bg-green-100 text-green-700",
    emptyTitle: "Nothing nearing closing",
  },
}

const priorityOrder: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 }

export default function RealtorOpsPage() {
  const { user } = useApp()
  const today = React.useMemo(() => new Date(), [])
  const [loading, setLoading] = React.useState(true)
  const [statCards, setStatCards] = React.useState<Array<{ label: string; value: string; meta: string; icon: React.ComponentType<{ className?: string }> }>>([])
  const [prioritizedTasks, setPrioritizedTasks] = React.useState<Task[]>([])
  const [stagePipelines, setStagePipelines] = React.useState<Record<DealStageKey, DealRoom[]>>({
    preparation: [],
    "due-diligence": [],
    negotiation: [],
    closing: [],
  })
  const [investorsNeedingTouch, setInvestorsNeedingTouch] = React.useState<Array<{ id: string; name: string; company: string; lastContact: string; mandate?: { strategy?: string; yieldTarget?: number }; openTasksCount: number }>>([])
  const [readinessBuckets, setReadinessBuckets] = React.useState<Record<string, number>>({})
  const [verificationQueue, setVerificationQueue] = React.useState<Array<{ id: string; title: string; area: string }>>([])
  const [activityFeed, setActivityFeed] = React.useState<Array<{ id: string; type: string; title: string; description: string; timestamp: string }>>([])

  React.useEffect(() => {
    async function loadRealtorData() {
      try {
        const [statsRes, pipelineRes, tasksRes, investorsRes, propertiesRes, activitiesRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/pipeline"),
          fetch("/api/dashboard/tasks"),
          fetch("/api/dashboard/investors"),
          fetch("/api/dashboard/properties"),
          fetch("/api/dashboard/activities"),
        ])

        const [statsData, pipelineData, tasksData, investorsData, propertiesData, activitiesData] = await Promise.all([
          statsRes.json(),
          pipelineRes.json(),
          tasksRes.json(),
          investorsRes.json(),
          propertiesRes.json(),
          activitiesRes.json(),
        ])

        // Set stat cards
        const diligenceDeals = pipelineData.stages?.["due-diligence"]?.count || 0
        setStatCards([
          {
            label: "Active investors",
            value: `${statsData.activeInvestors || 0}`,
            meta: "Relationships that need weekly touch",
            icon: Users,
          },
          {
            label: "Pipeline (AED)",
            value: formatAED(statsData.pipelineValue || 0),
            meta: "Ticket size across live deals",
            icon: FolderKanban,
          },
          {
            label: "Tasks due soon",
            value: `${statsData.tasksDueSoon || 0}`,
            meta: "Next 72h reminders",
            icon: CheckSquare,
          },
          {
            label: "Deals in diligence",
            value: `${diligenceDeals}`,
            meta: "Needing inspection / docs",
            icon: Target,
          },
        ])

        // Set tasks
        const tasks = (tasksData.tasks || []).map((t: { due_date: string; investor_name?: string; property_title?: string; priority: string }) => ({
          id: t.id || "",
          title: t.title || "",
          status: t.status || "todo",
          priority: (t.priority || "medium") as Task["priority"],
          dueDate: t.due_date || null,
          investorName: t.investor_name || null,
          propertyTitle: t.property_title || null,
        }))
        setPrioritizedTasks(tasks)

        // Set pipeline stages
        const pipelines: Record<DealStageKey, DealRoom[]> = {
          preparation: [],
          "due-diligence": [],
          negotiation: [],
          closing: [],
        }
        Object.entries(pipelineData.stages || {}).forEach(([stage, data]: [string, unknown]) => {
          const deals = (data as { deals: unknown[] })?.deals || []
          if (stage in pipelines) {
            pipelines[stage as DealStageKey] = deals.map((d: Record<string, unknown>) => ({
              id: d.id as string,
              status: stage as DealRoom["status"],
              ticketSizeAed: d.ticketSize as number,
              propertyTitle: d.propertyTitle as string,
              investorName: d.investorName as string,
            }))
          }
        })
        setStagePipelines(pipelines)

        // Set investors
        setInvestorsNeedingTouch(investorsData.investors || [])

        // Set properties
        setReadinessBuckets(propertiesData.readinessBuckets || {})
        setVerificationQueue(propertiesData.verificationQueue || [])

        // Set activities
        setActivityFeed(activitiesData.activities || [])
      } catch (err) {
        console.error("Failed to load realtor data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadRealtorData()
  }, [])

  const tasksByInvestor = React.useMemo(() => {
    const map = new Map<string, number>()
    investorsNeedingTouch.forEach((inv) => {
      map.set(inv.id, inv.openTasksCount)
    })
    return map
  }, [investorsNeedingTouch])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-gray-500">Loading realtor dashboard...</div>
      </div>
    )
  }

  const aiQuestions = [
    "Which investor do I need to follow up with today?",
    "Summarize blockers in my live deals",
    "Draft a follow-up note for the Marina Tower LOI",
    "Highlight properties that still need verification",
    "What should be my top 3 actions right now?",
  ]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="relative">
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <ClipboardCheck className="size-5" />
                </span>
                <span className="text-gray-900">Real estate cockpit, {user.name}</span>
              </span>
            }
            subtitle="Match investor mandates, move deals, and keep inventory audit-ready."
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
                <CheckSquare className="size-4 text-green-600" />
                Key priorities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prioritizedTasks.length ? (
                prioritizedTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} today={today} />)
              ) : (
                <div className="text-sm text-gray-500">No open tasks. Enjoy the breather!</div>
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
                <FolderKanban className="size-4 text-green-600" />
                Pipeline board
              </CardTitle>
              <p className="text-xs text-gray-500">
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
                <Phone className="size-4 text-green-600" />
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
                          <div className="text-xs text-gray-500">{inv.company}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium capitalize">{inv.mandate?.strategy ?? "—"}</div>
                          <div className="text-gray-500">Yield {inv.mandate?.yieldTarget ?? "—"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
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
                <MapPinned className="size-4 text-green-600" />
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
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((readinessBuckets[status] ?? 0) / (Object.values(readinessBuckets).reduce((a, b) => a + b, 0) || 1)) * 100,
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
                        <div className="text-gray-500">{property.area}</div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/properties/${property.id}`}>Open</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">All properties verified. 🎉</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ActivitySquare className="size-4 text-green-600" />
                Latest activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {activityFeed.map((activity) => (
                <div key={activity.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{activity.type.replaceAll("_", " ")}</span>
                    <span>{formatDistanceToNowStrict(new Date(activity.timestamp))} ago</span>
                  </div>
                  <div className="mt-1 font-medium">{activity.title}</div>
                  <div className="text-xs text-gray-500">{activity.description}</div>
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
    <Card className="border-gray-100 bg-white shadow-sm">
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
        ? "text-red-600"
        : dueInDays <= 1
          ? "text-amber-600"
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

function StageColumn({ stage, deals }: { stage: DealStageKey; deals: DealRoom[] }) {
  const meta = stageMeta[stage]
  const totalValue = deals.reduce((sum, deal) => sum + (deal.ticketSizeAed ?? 0), 0)
  return (
    <div className={`rounded-2xl border ${meta.accent} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{meta.label}</div>
          <div className="text-xs text-gray-500">{meta.hint}</div>
        </div>
        <Badge className={`${meta.badgeClass}`}>{deals.length}</Badge>
      </div>
      <div className="mt-2 text-xs font-semibold text-gray-500">{formatAED(totalValue)}</div>
      <div className="mt-3 space-y-3">
        {deals.length ? (
          deals.map((deal) => (
            <div key={deal.id} className="rounded-lg border border-gray-100 bg-white p-3 text-xs">
              <div className="font-semibold">{deal.propertyTitle}</div>
              <div className="text-gray-500">{deal.investorName}</div>
              {deal.nextStep ? <div className="mt-1 text-[11px] text-green-600">Next: {deal.nextStep}</div> : null}
              <div className="mt-2 flex items-center justify-between">
                <span>Prob {deal.probability ?? 0}%</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/deal-room/${deal.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-xs text-gray-500">{meta.emptyTitle}</div>
        )}
      </div>
    </div>
  )
}

