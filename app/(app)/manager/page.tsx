"use client"

import * as React from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import {
  AlertTriangle,
  ArrowUpRight,
  FolderKanban,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { RoleRedirect } from "@/components/security/role-redirect"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAPI } from "@/lib/hooks/use-api"
import { formatAED } from "@/lib/real-estate"

type Timeframe = "7d" | "30d" | "90d"

type ManagerOverview = {
  summary: {
    activeInvestors: number
    activeRealtors: number
    liveDeals: number
    pipelineValue: number
    dealsAtRisk: number
    overdueTasks: number
    tasksDueSoon: number
    staleOpportunities: number
  }
  stageBreakdown: Array<{ stage: string; count: number; value: number }>
  riskAlerts: Array<{ id: string; title: string; severity: string; count: number; href: string }>
}

type TeamPerformance = {
  rows: Array<{
    realtorId: string
    name: string
    email: string
    isActive: boolean
    openDeals: number
    pipelineValue: number
    dealsAtRisk: number
    overdueTasks: number
    tasksDueSoon: number
    openOpportunities: number
    awaitingInvestorReply: number
    lastActivityAt: string | null
  }>
}

type PipelineData = {
  stages: Record<string, { count: number; value: number; deals: unknown[] }>
  stuckDeals: Array<{
    id: string
    stage: string
    propertyTitle: string | null
    investorName: string | null
    ticketSizeAed: number
    priority: "low" | "medium" | "high"
    assignedAgentName: string | null
    updatedAt: string
  }>
}

type ConversationData = {
  summary: { needsReply: number; stale24h: number; highRisk: number }
  rows: Array<{
    opportunityId: string
    status: string
    investorName: string
    propertyTitle: string
    realtorName: string
    lastMessageAt: string
    lastSenderRole: string | null
    staleHours: number | null
    needsReply: boolean
    highRisk: boolean
  }>
}

function stageLabel(stage: string) {
  if (stage === "due-diligence") return "Due diligence"
  return stage.replace(/_/g, " ")
}

export default function ManagerPage() {
  const [timeframe, setTimeframe] = React.useState<Timeframe>("30d")
  const [realtorId, setRealtorId] = React.useState("all")
  const [stage, setStage] = React.useState("all")
  const [priority, setPriority] = React.useState("all")

  const realtorFilter = realtorId === "all" ? "" : realtorId
  const stageFilter = stage === "all" ? "" : stage
  const priorityFilter = priority === "all" ? "" : priority

  const baseQuery = `timeframe=${timeframe}${
    realtorFilter ? `&realtorId=${encodeURIComponent(realtorFilter)}` : ""
  }${stageFilter ? `&stage=${encodeURIComponent(stageFilter)}` : ""}${
    priorityFilter ? `&priority=${encodeURIComponent(priorityFilter)}` : ""
  }`

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useAPI<ManagerOverview>(`/api/manager/overview?${baseQuery}`, {
    refreshInterval: 30000,
  })
  const {
    data: teamPerformance,
    isLoading: teamLoading,
    error: teamError,
  } = useAPI<TeamPerformance>(`/api/manager/team-performance?${baseQuery}`)
  const {
    data: pipeline,
    isLoading: pipelineLoading,
    error: pipelineError,
  } = useAPI<PipelineData>(`/api/manager/pipeline?${baseQuery}`)
  const {
    data: conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useAPI<ConversationData>(`/api/manager/conversations?${baseQuery}`)

  const realtorOptions = React.useMemo(() => {
    const rows = teamPerformance?.rows ?? []
    return rows.map((r) => ({ id: r.realtorId, label: r.name }))
  }, [teamPerformance])

  return (
    <>
      <RoleRedirect allow={["admin"]} redirectTo="/dashboard" />
      <div className="space-y-6">
        <PageHeader
          title="Manager Cockpit"
          subtitle="Run company operations: team performance, pipeline risk, and conversation governance."
          primaryAction={
            <Button asChild>
              <Link href="/team">
                Manage team <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
          secondaryActions={
            <>
              <Button variant="outline" asChild>
                <Link href="/deal-room">Deal pipeline</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/audit-log">Audit log</Link>
              </Button>
            </>
          }
        />

        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-4">
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
                <SelectTrigger>
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={realtorId} onValueChange={setRealtorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Realtor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All realtors</SelectItem>
                  {realtorOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  <SelectItem value="preparation">Preparation</SelectItem>
                  <SelectItem value="due-diligence">Due diligence</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={FolderKanban}
            label="Live pipeline"
            value={overviewLoading ? "—" : formatAED(overview?.summary.pipelineValue ?? 0)}
            hint={`${overview?.summary.liveDeals ?? 0} open deals`}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Deals at risk"
            value={overviewLoading ? "—" : String(overview?.summary.dealsAtRisk ?? 0)}
            hint={`${overview?.summary.overdueTasks ?? 0} overdue tasks`}
          />
          <KpiCard
            icon={Users}
            label="Active realtors"
            value={overviewLoading ? "—" : String(overview?.summary.activeRealtors ?? 0)}
            hint={`${overview?.summary.activeInvestors ?? 0} active investors`}
          />
          <KpiCard
            icon={MessageSquare}
            label="Conversations at risk"
            value={conversationsLoading ? "—" : String(conversations?.summary.highRisk ?? 0)}
            hint={`${conversations?.summary.needsReply ?? 0} need reply`}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Team performance</CardTitle>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <div className="text-sm text-muted-foreground">Loading team performance...</div>
              ) : teamError ? (
                <div className="text-sm text-destructive">Failed to load team performance.</div>
              ) : (teamPerformance?.rows?.length ?? 0) === 0 ? (
                <div className="text-sm text-muted-foreground">No realtor data found for this tenant.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Realtor</TableHead>
                        <TableHead>Open deals</TableHead>
                        <TableHead>Pipeline</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Last activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamPerformance?.rows.map((row) => (
                        <TableRow key={row.realtorId}>
                          <TableCell>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-muted-foreground">{row.email}</div>
                          </TableCell>
                          <TableCell>{row.openDeals}</TableCell>
                          <TableCell>{formatAED(row.pipelineValue)}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div>{row.dealsAtRisk} deals at risk</div>
                              <div>{row.overdueTasks} overdue tasks</div>
                              <div>{row.awaitingInvestorReply} stale replies</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.lastActivityAt
                              ? formatDistanceToNowStrict(new Date(row.lastActivityAt), { addSuffix: true })
                              : "No recent activity"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Governance shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(overview?.riskAlerts ?? []).map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/30"
                >
                  <div className="text-sm">
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-xs text-muted-foreground">{alert.count} items</div>
                  </div>
                  <Badge variant={alert.severity === "high" ? "destructive" : "secondary"}>
                    {alert.severity}
                  </Badge>
                </Link>
              ))}
              {(overview?.riskAlerts ?? []).length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No active risk alerts for the selected filters.
                </div>
              ) : null}
              <Separator />
              <div className="grid gap-2">
                <Button variant="outline" asChild>
                  <Link href="/team">Open user access</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/audit-log">Review audit trail</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/realtor/opportunities">Open CRM opportunities</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global pipeline board</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineLoading ? (
              <div className="text-sm text-muted-foreground">Loading pipeline...</div>
            ) : pipelineError ? (
              <div className="text-sm text-destructive">Failed to load pipeline.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
                {Object.entries(pipeline?.stages ?? {}).map(([stageKey, stageData]) => (
                  <div key={stageKey} className="rounded-lg border p-3">
                    <div className="text-sm font-semibold capitalize">{stageLabel(stageKey)}</div>
                    <div className="mt-1 text-xl font-bold">{stageData.count}</div>
                    <div className="text-xs text-muted-foreground">{formatAED(stageData.value)}</div>
                  </div>
                ))}
              </div>
            )}

            <Separator className="my-4" />

            <div className="text-sm font-medium">Stuck deals</div>
            {pipelineLoading ? null : (pipeline?.stuckDeals?.length ?? 0) === 0 ? (
              <div className="mt-2 text-sm text-muted-foreground">No stuck deals in current filters.</div>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Investor</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pipeline?.stuckDeals ?? []).slice(0, 12).map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell>{deal.propertyTitle ?? "Unknown property"}</TableCell>
                        <TableCell>{deal.investorName ?? "Unknown investor"}</TableCell>
                        <TableCell className="capitalize">{stageLabel(deal.stage)}</TableCell>
                        <TableCell>{deal.assignedAgentName ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <Badge variant={deal.priority === "high" ? "destructive" : "secondary"}>
                            {deal.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(deal.updatedAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation monitor</CardTitle>
          </CardHeader>
          <CardContent>
            {conversationsLoading ? (
              <div className="text-sm text-muted-foreground">Loading conversation monitor...</div>
            ) : conversationsError ? (
              <div className="text-sm text-destructive">Failed to load conversation monitor.</div>
            ) : (conversations?.rows?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">No conversations found in this timeframe.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Realtor</TableHead>
                      <TableHead>Last sender</TableHead>
                      <TableHead>Stale</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations?.rows.slice(0, 15).map((row) => (
                      <TableRow key={row.opportunityId}>
                        <TableCell>{row.investorName}</TableCell>
                        <TableCell>{row.propertyTitle}</TableCell>
                        <TableCell>{row.realtorName}</TableCell>
                        <TableCell className="capitalize">{row.lastSenderRole ?? "none"}</TableCell>
                        <TableCell>{row.staleHours != null ? `${row.staleHours}h` : "—"}</TableCell>
                        <TableCell>
                          {row.highRisk ? (
                            <Badge variant="destructive">High risk</Badge>
                          ) : row.needsReply ? (
                            <Badge variant="secondary">Needs reply</Badge>
                          ) : (
                            <Badge variant="outline">Healthy</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {overviewError ? (
          <div className="text-sm text-destructive">Manager overview failed to load. Please retry.</div>
        ) : null}
      </div>
    </>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

