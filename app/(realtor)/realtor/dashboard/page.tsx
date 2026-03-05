"use client"

import * as React from "react"
import Link from "next/link"
import { differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns"
import {
  ActivitySquare,
  CheckSquare,
  FolderKanban,
  MapPinned,
  Phone,
  Target,
  Users,
} from "lucide-react"

import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
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
    accent: "border-teal-200 bg-teal-50",
    badgeClass: "bg-teal-100 text-teal-700",
    emptyTitle: "Nothing nearing closing",
  },
}

const priorityOrder: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 }

export default function RealtorDashboardPage() {
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
        // Single request — auth checked once, all DB queries run in parallel server-side
        const res = await fetch("/api/dashboard/overview")
        if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`)
        const data = await res.json()

        const { stats, pipeline, tasks: rawTasks, investors: rawInvestors, properties, activities: rawActivities } = data

        const diligenceDeals = pipeline.stages?.["due-diligence"]?.count || 0
        setStatCards([
          {
            label: "Active investors",
            value: `${stats.activeInvestors || 0}`,
            meta: "Relationships that need weekly touch",
            icon: Users,
          },
          {
            label: "Pipeline (AED)",
            value: formatAED(stats.pipelineValue || 0),
            meta: "Ticket size across live deals",
            icon: FolderKanban,
          },
          {
            label: "Tasks due soon",
            value: `${stats.tasksDueSoon || 0}`,
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

        const tasks = (rawTasks || []).map((t: { id?: string; title?: string; status?: string; due_date: string; investor_name?: string; property_title?: string; priority: string }) => ({
          id: t.id || "",
          title: t.title || "",
          status: (t.status || "open") as Task["status"],
          priority: (t.priority || "medium") as Task["priority"],
          dueDate: t.due_date || undefined,
          investorName: t.investor_name || undefined,
          propertyTitle: t.property_title || undefined,
          createdAt: new Date().toISOString(),
        }))
        setPrioritizedTasks(tasks)

        const pipelines: Record<DealStageKey, DealRoom[]> = {
          preparation: [],
          "due-diligence": [],
          negotiation: [],
          closing: [],
        }
        Object.entries(pipeline.stages || {}).forEach(([stage, stageData]: [string, unknown]) => {
          const deals = ((stageData as { deals: unknown[] })?.deals || []) as Record<string, unknown>[]
          if (stage in pipelines) {
            pipelines[stage as DealStageKey] = deals.map((d) => ({
              id: d.id as string,
              status: stage as DealRoom["status"],
              ticketSizeAed: d.ticketSize as number,
              propertyTitle: d.propertyTitle as string,
              investorName: d.investorName as string,
            })) as unknown as DealRoom[]
          }
        })
        setStagePipelines(pipelines)

        setInvestorsNeedingTouch(rawInvestors || [])
        setReadinessBuckets(properties.readinessBuckets || {})
        setVerificationQueue(properties.verificationQueue || [])
        setActivityFeed(rawActivities || [])
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

  const totalPipelineValue = Object.values(stagePipelines).flat().reduce((sum, d) => sum + (d.ticketSizeAed ?? 0), 0)
  const totalDeals = Object.values(stagePipelines).flat().length
  const closingDeals = stagePipelines.closing?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Hero: branded overview mirroring investor dashboard */}
      <div
        className="relative -mx-4 -mt-4 min-h-[320px] overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mt-6"
        style={{
          backgroundImage: "linear-gradient(180deg, rgba(15,35,41,0.92) 0%, rgba(15,35,41,0.88) 50%, rgba(15,35,41,0.95) 100%), url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80')",
          backgroundSize: "115%",
          backgroundPosition: "center 40%",
          backgroundColor: "#0f2329",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.10),transparent)]" />
        <div className="relative px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-medium text-white/70 uppercase tracking-widest mb-1">Total Pipeline Value</p>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                  {formatAED(totalPipelineValue)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Active Investors</p>
                  <p className="text-sm sm:text-base font-bold text-teal-200 mt-0.5">
                    {statCards.find((c) => c.label === "Active investors")?.value ?? "0"}
                  </p>
                </div>
                <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Live Deals</p>
                  <p className="text-sm sm:text-base font-bold text-teal-200 mt-0.5">
                    {totalDeals}
                  </p>
                </div>
                <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Tasks Due Soon</p>
                  <p className="text-sm sm:text-base font-bold text-teal-200 mt-0.5">
                    {statCards.find((c) => c.label === "Tasks due soon")?.value ?? "0"}
                  </p>
                </div>
                <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Nearing Closing</p>
                  <p className="text-sm sm:text-base font-bold text-teal-200 mt-0.5">
                    {closingDeals}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <AskAIBankerWidget
                agentId="real_estate_advisor"
                title="AI Deal Copilot"
                description="Ask for investor updates, deal blockers, or draft notes."
                suggestedQuestions={aiQuestions}
                pagePath="/realtor/dashboard"
              />
              <Button asChild className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-4 sm:px-5 uppercase tracking-wide shadow-lg h-9">
                <Link href="/realtor/property-intake">New Intake</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Pipeline by stage</h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-transparent">
                    <TableHead className="text-[10px] sm:text-xs text-teal-200/80 font-medium py-2">Stage</TableHead>
                    <TableHead className="text-right text-[10px] sm:text-xs text-teal-200/80 font-medium py-2">Deals</TableHead>
                    <TableHead className="text-right text-[10px] sm:text-xs text-teal-200/80 font-medium py-2">Value (AED)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs sm:text-sm">
                  {(Object.keys(stageMeta) as DealStageKey[]).map((stage) => {
                    const deals = stagePipelines[stage] ?? []
                    const stageValue = deals.reduce((sum, d) => sum + (d.ticketSizeAed ?? 0), 0)
                    return (
                      <TableRow key={stage} className="border-white/20 hover:bg-transparent">
                        <TableCell className="font-medium text-white/90 py-1.5 capitalize">{stageMeta[stage].label}</TableCell>
                        <TableCell className="text-right text-white/90 py-1.5">{deals.length}</TableCell>
                        <TableCell className="text-right text-white/90 py-1.5">{formatAED(stageValue)}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="font-semibold border-white/20">
                    <TableCell className="text-white py-1.5">Total</TableCell>
                    <TableCell className="text-right text-white py-1.5">{totalDeals}</TableCell>
                    <TableCell className="text-right text-white py-1.5">{formatAED(totalPipelineValue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Inventory readiness</h3>
              <div className="space-y-3">
                {["READY_FOR_MEMO", "NEEDS_VERIFICATION", "DRAFT"].map((status) => {
                  const count = readinessBuckets[status] ?? 0
                  const total = Object.values(readinessBuckets).reduce((a, b) => a + b, 0) || 1
                  const pct = Math.min(100, (count / total) * 100)
                  const label = status.replaceAll("_", " ").toLowerCase()
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-white/80 capitalize">{label}</span>
                        <span className="text-teal-200 font-semibold">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-teal-400 transition-all" style={{ width: `${pct.toFixed(0)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 rounded-md border border-teal-400/20 bg-teal-900/50 backdrop-blur-sm p-3">
                <p className="text-xs font-semibold text-teal-100">Daily focus</p>
                <p className="text-[11px] text-teal-200/90 mt-0.5">Match investor mandates, move deals forward, and keep inventory audit-ready.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-4 text-teal-600" />
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
                <Link href="/realtor/tasks">Open task board</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="size-4 text-teal-600" />
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
                <Phone className="size-4 text-teal-600" />
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
                          {inv.lastContact ? `${formatDistanceToNowStrict(parseISO(inv.lastContact))} ago` : "—"}
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
                <Link href="/realtor/investors">View all investors</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MapPinned className="size-4 text-teal-600" />
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
                        className="h-2 rounded-full bg-teal-500 transition-all"
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
                        <Link href={`/realtor/properties/${property.id}`}>Open</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">All properties verified.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ActivitySquare className="size-4 text-teal-600" />
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
        pagePath="/realtor/dashboard"
      />
    </div>
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
              {deal.nextStep ? <div className="mt-1 text-[11px] text-teal-600">Next: {deal.nextStep}</div> : null}
              <div className="mt-2 flex items-center justify-between">
                <span>Prob {deal.probability ?? 0}%</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/realtor/deal-room/${deal.id}`}>Open</Link>
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
