"use client"

import * as React from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MessageSquare,
  RefreshCcw,
  XCircle,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAPI } from "@/lib/hooks/use-api"

type OpportunityProperty = {
  title: string | null
  area: string | null
  type: string | null
  price: number | null
  size: number | null
  bedrooms: number | null
  imageUrl: string | null
  developer: string | null
  expectedRent: number | null
}

type RealtorOpportunity = {
  id: string
  investorId: string
  investorName: string | null
  investorCompany: string | null
  listingId: string
  status: string
  decision: string
  decisionAt: string | null
  decisionNote: string | null
  sharedAt: string
  sharedBy: string
  sharedByName: string | null
  sharedMessage: string | null
  matchScore: number | null
  matchReasons: string[]
  memoId: string | null
  dealRoomId: string | null
  holdingId: string | null
  messageCount: number
  property: OpportunityProperty | null
}

type RealtorOpportunitiesResponse = {
  opportunities: RealtorOpportunity[]
  counts: {
    total: number
    recommended: number
    shortlisted: number
    memoReview: number
    dealRoom: number
    acquired: number
    rejected: number
    expired: number
  }
}

const statusLabel: Record<string, string> = {
  recommended: "Recommended",
  shortlisted: "Shortlisted",
  memo_review: "Memo Review",
  deal_room: "Deal Room",
  acquired: "Acquired",
  rejected: "Rejected",
  expired: "Expired",
}

const decisionLabel: Record<string, string> = {
  pending: "Pending",
  interested: "Interested",
  very_interested: "Very interested",
  not_interested: "Not interested",
}

function formatAED(value: number) {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

function RelativeTime({ at }: { at?: string | null }) {
  if (!at) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span className="text-xs text-muted-foreground">
      {formatDistanceToNowStrict(new Date(at), { addSuffix: true })}
    </span>
  )
}

function buildStatusQuery(tab: string) {
  switch (tab) {
    case "new":
      return "recommended"
    case "interested":
      return "shortlisted"
    case "execution":
      return "memo_review,deal_room"
    case "closed":
      return "acquired,rejected,expired"
    default:
      return ""
  }
}

function nextActions(opportunity: RealtorOpportunity) {
  if (opportunity.status === "shortlisted") {
    return [
      { label: "Move to Memo Review", status: "memo_review", icon: RefreshCcw },
      ...(opportunity.memoId
        ? [{ label: "Move to Deal Room", status: "deal_room", icon: ArrowRight }]
        : []),
      { label: "Mark Expired", status: "expired", icon: XCircle },
    ]
  }
  if (opportunity.status === "memo_review") {
    return [
      { label: "Move to Deal Room", status: "deal_room", icon: ArrowRight },
      { label: "Mark Expired", status: "expired", icon: XCircle },
    ]
  }
  if (opportunity.status === "deal_room") {
    return [
      { label: "Mark Acquired", status: "acquired", icon: CheckCircle2 },
      { label: "Mark Expired", status: "expired", icon: XCircle },
    ]
  }
  return []
}

export default function RealtorOpportunitiesPage() {
  const [tab, setTab] = React.useState("new")
  const [search, setSearch] = React.useState("")
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [acquireModalId, setAcquireModalId] = React.useState<string | null>(null)
  const [holdingIdInput, setHoldingIdInput] = React.useState("")
  const deferredSearch = React.useDeferredValue(search)

  const statusQuery = buildStatusQuery(tab)
  const endpoint = `/api/realtor/opportunities?status=${encodeURIComponent(
    statusQuery
  )}${deferredSearch ? `&search=${encodeURIComponent(deferredSearch)}` : ""}`
  const { data, isLoading, error, mutate } = useAPI<RealtorOpportunitiesResponse>(endpoint)

  async function updateStatus(
    id: string,
    status: "memo_review" | "deal_room" | "acquired" | "expired",
    extra?: { holdingId?: string }
  ) {
    try {
      setPendingId(id)
      const res = await fetch(`/api/realtor/opportunities/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      })
      if (!res.ok) {
        throw new Error("Failed to update opportunity")
      }
      await mutate()
    } catch (err) {
      console.error("[realtor/opportunities] update failed:", err)
    } finally {
      setPendingId(null)
    }
  }

  const opportunities = data?.opportunities ?? []
  const counts = data?.counts

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        subtitle="Track new shares, investor interest, and progress to close."
        secondaryActions={
          <Button variant="outline" asChild>
            <Link href="/realtor">Back to cockpit</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{counts?.recommended ?? 0}</div>
            <div className="text-xs text-muted-foreground">New shares</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{counts?.shortlisted ?? 0}</div>
            <div className="text-xs text-muted-foreground">Interested</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">
              {(counts?.memoReview ?? 0) + (counts?.dealRoom ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">In execution</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">
              {(counts?.acquired ?? 0) + (counts?.rejected ?? 0) + (counts?.expired ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">Closed</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Opportunity board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="new">New</TabsTrigger>
                <TabsTrigger value="interested">Interested</TabsTrigger>
                <TabsTrigger value="execution">Execution</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search investor, property, area..."
              className="w-full lg:w-80"
            />
          </div>

          {isLoading ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Loading opportunities...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/40 p-8 text-center text-sm text-destructive">
              Failed to load opportunities.
            </div>
          ) : opportunities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Building2 className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No opportunities in this bucket.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {opportunities.map((opportunity) => {
                const actions = nextActions(opportunity)
                return (
                  <Card key={opportunity.id} className="overflow-hidden">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {opportunity.property?.title ?? "Unknown property"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[opportunity.property?.area, opportunity.property?.type]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </div>
                        </div>
                        <Badge variant="outline">{statusLabel[opportunity.status] ?? opportunity.status}</Badge>
                      </div>

                      <div className="text-sm">
                        <span className="font-medium">{opportunity.investorName ?? "Unknown investor"}</span>
                        {opportunity.investorCompany ? (
                          <span className="text-muted-foreground"> · {opportunity.investorCompany}</span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">
                          {decisionLabel[opportunity.decision] ?? opportunity.decision}
                        </Badge>
                        <span className="text-muted-foreground">
                          Shared <RelativeTime at={opportunity.sharedAt} />
                        </span>
                        {opportunity.messageCount > 0 ? (
                          <Badge variant="outline" className="gap-1">
                            <MessageSquare className="size-3" />
                            {opportunity.messageCount}
                          </Badge>
                        ) : null}
                        {opportunity.matchScore ? (
                          <Badge variant="outline">{opportunity.matchScore}% match</Badge>
                        ) : null}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {opportunity.property?.price ? formatAED(opportunity.property.price) : "Price n/a"}
                      </div>

                      {opportunity.decisionNote ? (
                        <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                          Investor note: {opportunity.decisionNote}
                        </div>
                      ) : null}
                      {opportunity.status === "shortlisted" && !opportunity.memoId ? (
                        <div className="rounded-md border bg-amber-50 p-2 text-xs text-amber-700">
                          Attach or generate a memo before moving this opportunity to deal room.
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/properties/${opportunity.listingId}`}>Property</Link>
                        </Button>
                        {opportunity.memoId ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/memos/${opportunity.memoId}`}>Memo</Link>
                          </Button>
                        ) : null}
                        {opportunity.dealRoomId ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/deal-room/${opportunity.dealRoomId}`}>Deal room</Link>
                          </Button>
                        ) : null}
                      </div>

                      {actions.length > 0 ? (
                        <div className="space-y-2 border-t pt-3">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Lifecycle actions
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {actions.map((action) => {
                              const Icon = action.icon
                              const disabled = pendingId === opportunity.id
                              if (action.status === "acquired") {
                                return (
                                  <Button
                                    key={action.status}
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => {
                                      setAcquireModalId(opportunity.id)
                                      setHoldingIdInput("")
                                    }}
                                  >
                                    <CheckCircle2 className="mr-1.5 size-3.5" />
                                    {action.label}
                                  </Button>
                                )
                              }
                              return (
                                <Button
                                  key={action.status}
                                  size="sm"
                                  variant={action.status === "expired" ? "destructive" : "outline"}
                                  disabled={disabled}
                                  onClick={() =>
                                    updateStatus(
                                      opportunity.id,
                                      action.status as "memo_review" | "deal_room" | "expired"
                                    )
                                  }
                                >
                                  <Icon className="mr-1.5 size-3.5" />
                                  {action.label}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {acquireModalId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mark as acquired</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter the `holdingId` that represents this closed investment.
            </p>
            <Input
              placeholder="holding UUID"
              value={holdingIdInput}
              onChange={(e) => setHoldingIdInput(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                disabled={!holdingIdInput.trim() || !!pendingId}
                onClick={async () => {
                  const id = acquireModalId
                  setAcquireModalId(null)
                  await updateStatus(id, "acquired", { holdingId: holdingIdInput.trim() })
                }}
              >
                Confirm acquired
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAcquireModalId(null)
                  setHoldingIdInput("")
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
