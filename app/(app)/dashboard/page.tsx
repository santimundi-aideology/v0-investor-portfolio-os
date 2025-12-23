"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Building2, ListChecks, CheckSquare, Clock, TrendingUp, AlertCircle } from "lucide-react"
import Link from "next/link"
import { mockInvestors, mockProperties, mockShortlistItems, mockTasks, mockActivities } from "@/lib/mock-data"

const kpis = [
  {
    title: "Total Investors",
    value: mockInvestors.length.toString(),
    change: "+2 this month",
    icon: Users,
  },
  {
    title: "Active Deals",
    value: mockProperties.filter((p) => p.status === "under-offer").length.toString(),
    change: "1 in due diligence",
    icon: Building2,
  },
  {
    title: "Shortlist Items",
    value: mockShortlistItems.length.toString(),
    change: "3 pending review",
    icon: ListChecks,
  },
  {
    title: "Tasks Due",
    value: mockTasks.filter((t) => t.status !== "done").length.toString(),
    change: "2 high priority",
    icon: CheckSquare,
  },
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
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of your investor portfolio and active deals" />

      {/* KPIs */}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.slice(0, 5).map((activity) => {
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

        {/* Investors Needing Action */}
        <Card>
          <CardHeader>
            <CardTitle>Investors Needing Action</CardTitle>
            <CardDescription>Pending onboarding or follow-up required</CardDescription>
          </CardHeader>
          <CardContent>
            {investorsNeedingAction.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead></TableHead>
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
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/investors/${investor.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                All investors are up to date
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
