"use client"

import * as React from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderKanban,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { MemosPageClient } from "@/components/memos/memos-page-client"
import { DealPipelineKanban } from "@/components/deals/deal-pipeline-kanban"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAPI } from "@/lib/hooks/use-api"
import type { DealRoom, Memo } from "@/lib/types"

// ─── Types ───────────────────────────────────────────────────

type JourneyStage = "analysis" | "shortlisted" | "memo-review" | "deal-room" | "closed"

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

// ─── Constants ───────────────────────────────────────────────

const JOURNEY_STAGES: {
  key: JourneyStage
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: "analysis", label: "Analysis", icon: Search },
  { key: "shortlisted", label: "Shortlisted", icon: Sparkles },
  { key: "memo-review", label: "Memo Review", icon: FileText },
  { key: "deal-room", label: "Deal Room", icon: FolderKanban },
  { key: "closed", label: "Closed", icon: CheckCircle2 },
]

const OPP_STATUS_MAP: Record<JourneyStage, string> = {
  analysis: "recommended",
  shortlisted: "recommended,shortlisted",
  "memo-review": "memo_review",
  "deal-room": "deal_room",
  closed: "acquired,rejected,expired",
}

const STATUS_LABELS: Record<string, string> = {
  recommended: "Recommended",
  shortlisted: "Shortlisted",
  memo_review: "Memo Review",
  deal_room: "Deal Room",
  acquired: "Acquired",
  rejected: "Rejected",
  expired: "Expired",
}

const DECISION_LABELS: Record<string, string> = {
  pending: "Pending",
  interested: "Interested",
  very_interested: "Very interested",
  not_interested: "Not interested",
}

// ─── Helpers ─────────────────────────────────────────────────

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

function getNextActions(opp: RealtorOpportunity) {
  if (opp.status === "shortlisted") {
    return [
      { label: "Move to Memo Review", status: "memo_review", icon: RefreshCcw },
      ...(opp.memoId
        ? [{ label: "Move to Deal Room", status: "deal_room", icon: ArrowRight }]
        : []),
      { label: "Mark Expired", status: "expired", icon: XCircle },
    ]
  }
  if (opp.status === "memo_review") {
    return [
      { label: "Move to Deal Room", status: "deal_room", icon: ArrowRight },
      { label: "Mark Expired", status: "expired", icon: XCircle },
    ]
  }
  if (opp.status === "deal_room") {
    return [
      { label: "Mark Acquired", status: "acquired", icon: CheckCircle2 },
      { label: "Mark Expired", status: "expired", icon: XCircle },
    ]
  }
  return []
}

// ─── Journey Navigation ─────────────────────────────────────

function JourneyNav({
  activeStage,
  onStageChange,
  counts,
}: {
  activeStage: JourneyStage
  onStageChange: (stage: JourneyStage) => void
  counts: Record<JourneyStage, number>
}) {
  return (
    <Card className="p-1.5 sm:p-2">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {JOURNEY_STAGES.map((stage, idx) => {
          const isActive = stage.key === activeStage
          const count = counts[stage.key]
          const Icon = stage.icon
          return (
            <React.Fragment key={stage.key}>
              {idx > 0 && (
                <ChevronRight className="mx-0.5 size-4 shrink-0 text-gray-300" />
              )}
              <button
                type="button"
                onClick={() => onStageChange(stage.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200/60"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{stage.label}</span>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={cn(
                    "ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] font-semibold",
                    isActive && "bg-teal-600"
                  )}
                >
                  {count}
                </Badge>
              </button>
            </React.Fragment>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Investor Pipeline Stage ─────────────────────────────────

function InvestorPipelineStage({
  opportunities,
  isLoading,
  error,
  onUpdateStatus,
}: {
  opportunities: RealtorOpportunity[]
  isLoading: boolean
  error: unknown
  onUpdateStatus: (id: string, status: string, extra?: { holdingId?: string }) => Promise<void>
}) {
  const [search, setSearch] = React.useState("")
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [acquireModalId, setAcquireModalId] = React.useState<string | null>(null)
  const [holdingIdInput, setHoldingIdInput] = React.useState("")
  const deferredSearch = React.useDeferredValue(search)

  const filtered = React.useMemo(() => {
    if (!deferredSearch.trim()) return opportunities
    const q = deferredSearch.toLowerCase()
    return opportunities.filter(
      (o) =>
        o.investorName?.toLowerCase().includes(q) ||
        o.investorCompany?.toLowerCase().includes(q) ||
        o.property?.title?.toLowerCase().includes(q) ||
        o.property?.area?.toLowerCase().includes(q)
    )
  }, [opportunities, deferredSearch])

  async function handleUpdateStatus(id: string, status: string, extra?: { holdingId?: string }) {
    try {
      setPendingId(id)
      await onUpdateStatus(id, status, extra)
    } finally {
      setPendingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState
            title="Failed to load"
            description="Could not load opportunities. Please try again."
            icon={<Building2 className="size-5" />}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search investor, property, area..."
        className="w-full sm:w-80"
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              title="No opportunities here"
              description={search ? "Try adjusting your search." : "No opportunities in this stage yet."}
              icon={<Building2 className="size-5" />}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((opportunity) => {
            const actions = getNextActions(opportunity)
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
                    <Badge variant="outline">
                      {STATUS_LABELS[opportunity.status] ?? opportunity.status}
                    </Badge>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">{opportunity.investorName ?? "Unknown investor"}</span>
                    {opportunity.investorCompany && (
                      <span className="text-muted-foreground"> · {opportunity.investorCompany}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">
                      {DECISION_LABELS[opportunity.decision] ?? opportunity.decision}
                    </Badge>
                    <span className="text-muted-foreground">
                      Shared <RelativeTime at={opportunity.sharedAt} />
                    </span>
                    {opportunity.messageCount > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <MessageSquare className="size-3" />
                        {opportunity.messageCount}
                      </Badge>
                    )}
                    {opportunity.matchScore ? (
                      <Badge variant="outline">{opportunity.matchScore}% match</Badge>
                    ) : null}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {opportunity.property?.price ? formatAED(opportunity.property.price) : "Price n/a"}
                  </div>

                  {opportunity.decisionNote && (
                    <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                      Investor note: {opportunity.decisionNote}
                    </div>
                  )}
                  {opportunity.status === "shortlisted" && !opportunity.memoId && (
                    <div className="rounded-md border bg-amber-50 p-2 text-xs text-amber-700">
                      Attach or generate a memo before moving to deal room.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/realtor/properties/${opportunity.listingId}`}>Property</Link>
                    </Button>
                    {opportunity.memoId && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/memos/${opportunity.memoId}`}>Memo</Link>
                      </Button>
                    )}
                    {opportunity.dealRoomId && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/deal-room/${opportunity.dealRoomId}`}>Deal room</Link>
                      </Button>
                    )}
                  </div>

                  {actions.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Actions
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
                              onClick={() => handleUpdateStatus(opportunity.id, action.status)}
                            >
                              <Icon className="mr-1.5 size-3.5" />
                              {action.label}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {acquireModalId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mark as acquired</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter the holding ID for this investment.
            </p>
            <Input
              placeholder="Holding UUID"
              value={holdingIdInput}
              onChange={(e) => setHoldingIdInput(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                disabled={!holdingIdInput.trim() || !!pendingId}
                onClick={async () => {
                  const id = acquireModalId
                  setAcquireModalId(null)
                  await handleUpdateStatus(id, "acquired", { holdingId: holdingIdInput.trim() })
                }}
              >
                Confirm
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
      )}
    </div>
  )
}

// ─── Deal Room Stage ─────────────────────────────────────────

function DealRoomStage({
  deals,
  isLoading,
  error,
  onMoveStage,
  onRetry,
}: {
  deals: DealRoom[]
  isLoading: boolean
  error: unknown
  onMoveStage: (dealId: string, newStage: DealRoom["status"]) => void
  onRetry: () => void
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading deals...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-16">
          <EmptyState
            title="Failed to load deals"
            description="Could not fetch deal rooms. Please try again."
            icon={<FolderKanban className="size-5" />}
            action={
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="py-16">
          <EmptyState
            title="No deal rooms yet"
            description="Deal rooms will appear here once created from the pipeline."
            icon={<FolderKanban className="size-5" />}
          />
        </CardContent>
      </Card>
    )
  }

  return <DealPipelineKanban deals={deals} onMoveStage={onMoveStage} />
}

// ─── Main Component ──────────────────────────────────────────

export function OpportunitiesJourney() {
  const [activeStage, setActiveStage] = React.useState<JourneyStage>("analysis")

  const { data: memosData } = useAPI<Memo[]>("/api/memos")

  // Always-on fetch (no status filter) so badge counts are globally accurate
  const { data: globalCounts, mutate: mutateGlobalCounts } =
    useAPI<RealtorOpportunitiesResponse>("/api/realtor/opportunities")

  const {
    data: oppData,
    isLoading: oppLoading,
    error: oppError,
    mutate: oppMutate,
  } = useAPI<RealtorOpportunitiesResponse>(
    `/api/realtor/opportunities?status=${encodeURIComponent(OPP_STATUS_MAP[activeStage])}`
  )
  const {
    data: dealsData,
    isLoading: dealsLoading,
    error: dealsError,
    mutate: dealsMutate,
  } = useAPI<DealRoom[]>("/api/deal-rooms")

  const counts = React.useMemo<Record<JourneyStage, number>>(
    () => ({
      analysis: memosData?.length ?? 0,
      shortlisted:
        (globalCounts?.counts?.recommended ?? 0) +
        (globalCounts?.counts?.shortlisted ?? 0),
      "memo-review": globalCounts?.counts?.memoReview ?? 0,
      "deal-room":
        dealsData?.filter((d) => d.status !== "completed").length ?? 0,
      closed:
        (globalCounts?.counts?.acquired ?? 0) +
        (globalCounts?.counts?.rejected ?? 0) +
        (globalCounts?.counts?.expired ?? 0),
    }),
    [memosData, globalCounts, dealsData]
  )

  const handleUpdateOppStatus = React.useCallback(
    async (id: string, status: string, extra?: { holdingId?: string }) => {
      const res = await fetch(`/api/realtor/opportunities/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      })
      if (!res.ok) {
        toast.error("Failed to update opportunity")
        return
      }
      toast.success("Opportunity updated")
      await Promise.all([oppMutate(), mutateGlobalCounts()])
    },
    [oppMutate, mutateGlobalCounts]
  )

  const handleMoveDealStage = React.useCallback(
    async (dealId: string, newStage: DealRoom["status"]) => {
      try {
        const res = await fetch(`/api/deal-rooms/${dealId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStage }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error || "Failed to update stage")
        }
        toast.success("Deal stage updated")
        dealsMutate()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update deal stage")
      }
    },
    [dealsMutate]
  )

  const isPipelineStage =
    activeStage === "shortlisted" ||
    activeStage === "memo-review" ||
    activeStage === "closed"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        subtitle="Track the full journey from property analysis to deal close."
        primaryAction={
          <Button asChild className="bg-teal-500 hover:bg-teal-600">
            <Link href="/realtor/property-intake">Analyse new Opportunity</Link>
          </Button>
        }
      />

      <JourneyNav
        activeStage={activeStage}
        onStageChange={setActiveStage}
        counts={counts}
      />

      {activeStage === "analysis" && (
        <MemosPageClient
          embedded
          ctaLabel="Analyse new Opportunity"
          ctaHref="/realtor/property-intake"
          memoLinkPrefix="/realtor/memos"
        />
      )}

      {isPipelineStage && (
        <InvestorPipelineStage
          opportunities={oppData?.opportunities ?? []}
          isLoading={oppLoading}
          error={oppError}
          onUpdateStatus={handleUpdateOppStatus}
        />
      )}

      {activeStage === "deal-room" && (
        <DealRoomStage
          deals={dealsData ?? []}
          isLoading={dealsLoading}
          error={dealsError}
          onMoveStage={handleMoveDealStage}
          onRetry={() => dealsMutate()}
        />
      )}
    </div>
  )
}
