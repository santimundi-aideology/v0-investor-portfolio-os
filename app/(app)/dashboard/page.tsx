"use client"

import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { ContextPanel } from "@/components/layout/context-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Building2, CheckSquare, Clock, ListChecks, TrendingUp, Users } from "lucide-react"
import { mockInvestors, mockProperties, mockShortlistItems, mockTasks, mockActivities } from "@/lib/mock-data"
import { useApp } from "@/components/providers/app-provider"
import { InvestorDashboard } from "@/components/investor/investor-dashboard"
import { getInvestorById } from "@/lib/mock-data"

const kpis = [
  { title: "Total Investors", value: mockInvestors.length.toString(), change: "+2 this month", icon: Users },
  { title: "Active Deals", value: mockProperties.filter((p) => p.status === "under-offer").length.toString(), change: "1 in due diligence", icon: Building2 },
  { title: "Shortlist Items", value: mockShortlistItems.length.toString(), change: "3 pending review", icon: ListChecks },
  { title: "Tasks Due", value: mockTasks.filter((t) => t.status !== "done").length.toString(), change: "2 high priority", icon: CheckSquare },
]

const investorsNeedingAction = mockInvestors.filter(
  (inv) => inv.status === "pending" || new Date(inv.lastContact) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
)

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

function formatTimeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardPage() {
  const { role, scopedInvestorId } = useApp()

  if (role === "investor") {
    const investorId = scopedInvestorId ?? "inv-1"
    const investorName = getInvestorById(investorId)?.name ?? "Investor"
    return <InvestorDashboard investorId={investorId} investorName={investorName} />
  }

  const dueTasks = mockTasks.filter((t) => t.status !== "done").slice(0, 5)
  const pipeline = [
    { stage: "Sourcing", count: 6 },
    { stage: "Underwriting", count: 3 },
    { stage: "IC Review", count: 2 },
    { stage: "Due Diligence", count: 1 },
    { stage: "Closing", count: 1 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="text-blue-600">Dashboard</span>}
        subtitle={<span className="text-blue-500">Overview of your investor portfolio and active deals</span>}
        primaryAction={
          <Button asChild>
            <Link href="/investors">New Investor</Link>
          </Button>
        }
        secondaryActions={
          <Button variant="outline" asChild>
            <Link href="/properties">Add Property</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Pipeline by stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pipeline.map((row) => (
                      <TableRow key={row.stage}>
                        <TableCell className="font-medium">{row.stage}</TableCell>
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
              <CardTitle>Tasks due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dueTasks.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {t.investorName ? `Investor: ${t.investorName} • ` : ""}
                      {t.dueDate ? `Due: ${t.dueDate}` : "No due date"}
                    </div>
                  </div>
                  <Badge variant={t.priority === "high" ? "destructive" : "secondary"} className="shrink-0">
                    {t.priority}
                  </Badge>
                </div>
              ))}
              <Separator />
              <div className="flex justify-end">
                <Button variant="outline" asChild>
                  <Link href="/tasks">View all tasks</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Investors needing action</CardTitle>
            </CardHeader>
            <CardContent>
              {investorsNeedingAction.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Contact</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investorsNeedingAction.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{investor.name}</p>
                              <p className="text-xs text-muted-foreground">{investor.company}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={investor.status === "pending" ? "secondary" : "outline"}>
                              {investor.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{investor.lastContact}</TableCell>
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
                <div className="text-muted-foreground py-8 text-center text-sm">All investors are up to date</div>
              )}
            </CardContent>
          </Card>
        </div>

        <ContextPanel title="Recent activity">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {mockActivities.slice(0, 6).map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </ContextPanel>
      </div>
    </div>
  )
}
