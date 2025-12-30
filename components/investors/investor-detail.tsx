"use client"

import * as React from "react"

import { useBreadcrumbs } from "@/components/providers/app-provider"
import { PageHeader } from "@/components/layout/page-header"
import { ContextPanel } from "@/components/layout/context-panel"
import { ScopedInvestorGuard } from "@/components/security/scoped-investor-guard"
import { RoleRedirect } from "@/components/security/role-redirect"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import type { DealRoom, Investor, Memo, ShortlistItem, Task } from "@/lib/types"
import { MandateTab } from "@/components/investors/tabs/mandate-tab"
import { ShortlistTab } from "@/components/investors/tabs/shortlist-tab"
import { MemosTab } from "@/components/investors/tabs/memos-tab"
import { TasksTab } from "@/components/investors/tabs/tasks-tab"
import { DocumentsTab } from "@/components/investors/tabs/documents-tab"
import { RecommendationsTab } from "@/components/investors/tabs/recommendations-tab"
import { DealRoomsTab } from "@/components/investors/tabs/deal-rooms-tab"

export function InvestorDetail({
  investor,
  shortlist,
  memos,
  tasks,
  dealRooms,
}: {
  investor: Investor
  shortlist: ShortlistItem[]
  memos: Memo[]
  tasks: Task[]
  dealRooms: DealRoom[]
}) {
  const crumbs = React.useMemo(
    () => [
      { label: "Investors", href: "/investors" },
      { label: investor.name },
    ],
    [investor.name],
  )
  useBreadcrumbs(crumbs)

  const statusLabel =
    investor.status === "active" ? "Active" : investor.status === "pending" ? "Watching" : "Closed"

  const statusClass =
    investor.status === "active"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      : investor.status === "pending"
        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
        : "bg-muted text-muted-foreground"

  return (
    <>
      {/* Internal-only: investors must never see internal CRM views */}
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />

    <ScopedInvestorGuard investorId={investor.id}>
      <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={investor.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {investor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span>{investor.name}</span>
          </div>
        }
        subtitle={`${investor.company} • Last contact: ${investor.lastContact}`}
        badges={
          <Badge variant="outline" className={statusClass}>
            {statusLabel}
          </Badge>
        }
        primaryAction={
          <>
            <Button asChild>
                  <a href={`/recommendations/new?investorId=${investor.id}`}>+ New Recommendation</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/memos/new?investorId=${investor.id}`}>Generate IC Memo</a>
            </Button>
          </>
        }
        secondaryActions={
          <>
            <Button variant="outline" asChild>
              <a href={`/properties/new?investorId=${investor.id}&returnTo=investor`}>Add candidate property</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/tasks?investorId=${investor.id}`}>Add task</a>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Tabs defaultValue="mandate" className="space-y-4">
            <TabsList>
              <TabsTrigger value="mandate">Mandate</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="shortlist">Shortlist ({shortlist.length})</TabsTrigger>
              <TabsTrigger value="memos">IC Memos ({memos.length})</TabsTrigger>
                  <TabsTrigger value="dealRooms">Deal Rooms ({dealRooms.filter((d) => d.status !== "completed").length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="mandate">
              <MandateTab mandate={investor.mandate} />
            </TabsContent>

                <TabsContent value="recommendations">
                  <RecommendationsTab investor={investor} />
            </TabsContent>

            <TabsContent value="shortlist">
              <ShortlistTab items={shortlist} />
            </TabsContent>

            <TabsContent value="memos">
              <MemosTab memos={memos} investorId={investor.id} />
            </TabsContent>

                <TabsContent value="dealRooms">
                  <DealRoomsTab dealRooms={dealRooms} />
            </TabsContent>

            <TabsContent value="tasks">
              <TasksTab tasks={tasks} />
            </TabsContent>

            <TabsContent value="documents">
              <DocumentsTab />
            </TabsContent>
          </Tabs>
        </div>

        <ContextPanel title="Context">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Next best actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-md border p-3">
                <div className="font-medium">Confirm mandate</div>
                <div className="text-muted-foreground mt-1">Validate strategy, risk, and target ticket size.</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="font-medium">Send shortlist update</div>
                <div className="text-muted-foreground mt-1">Share 2–3 new matches for review.</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="font-medium">Schedule check-in</div>
                <div className="text-muted-foreground mt-1">Propose a 15-min call next week.</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-md border p-3">
                Prefers Grade A assets with clear downside protection. Focus on Dubai Marina and Business Bay.
              </div>
              <div className="rounded-md border p-3">
                Interested in off-market opportunities; expects quick turnaround once underwriting is complete.
              </div>
            </CardContent>
          </Card>
        </ContextPanel>
      </div>
      </div>
    </ScopedInvestorGuard>
    </>
  )
}


