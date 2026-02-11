"use client"

import * as React from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import {
  ArrowRight,
  FileText,
  Heart,
  MessageSquare,
  Sparkles,
  Star,
  ThumbsDown,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
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

type Opportunity = {
  id: string
  investorId: string
  listingId: string
  isOwned: boolean
  status: string
  decision: string
  decisionAt: string | null
  decisionNote: string | null
  sharedBy: string
  sharedByName: string | null
  sharedAt: string
  sharedMessage: string | null
  matchScore: number | null
  matchReasons: string[]
  memoId: string | null
  dealRoomId: string | null
  messageCount: number
  property: OpportunityProperty | null
}

type OpportunitiesResponse = {
  investorId: string
  opportunities: Opportunity[]
  counts: {
    total: number
    recommended?: number
    interested?: number
    veryInterested?: number
    pipeline?: number
    rejected?: number
  }
}

const decisionConfig: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", variant: "outline", icon: Sparkles },
  interested: { label: "Interested", variant: "secondary", icon: Heart },
  very_interested: { label: "Very Interested", variant: "default", icon: Star },
  not_interested: { label: "Not Interested", variant: "destructive", icon: ThumbsDown },
}

function formatAED(value: number) {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

function RelativeTime({ at }: { at?: string | null }) {
  const [label, setLabel] = React.useState("")
  React.useEffect(() => {
    if (!at) return
    const ms = new Date(at).getTime()
    if (Number.isNaN(ms)) return
    setLabel(formatDistanceToNowStrict(ms, { addSuffix: true }))
  }, [at])
  return <span className="text-xs text-muted-foreground">{label || "\u2014"}</span>
}

export function OpportunitiesTab({ investorId }: { investorId: string }) {
  const { data, isLoading, error } = useAPI<OpportunitiesResponse>(
    investorId ? `/api/investors/${investorId}/opportunities` : null
  )

  const opportunities = data?.opportunities ?? []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading opportunities...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <span className="text-sm text-destructive">Failed to load opportunities</span>
        </CardContent>
      </Card>
    )
  }

  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="No opportunities shared yet"
        description="Share properties with this investor to create opportunities. Use the 'Share' dialog from properties or the recommended properties section below."
        icon={<Sparkles className="size-5" />}
      />
    )
  }

  // Group by decision
  const grouped = {
    actionNeeded: opportunities.filter((o) => o.decision === "interested" || o.decision === "very_interested"),
    pending: opportunities.filter((o) => o.decision === "pending"),
    rejected: opportunities.filter((o) => o.decision === "not_interested"),
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Total" value={opportunities.length} />
        <SummaryCard
          label="Interested"
          value={grouped.actionNeeded.length}
          className="border-emerald-200 bg-emerald-50/30"
        />
        <SummaryCard label="Pending" value={grouped.pending.length} />
        <SummaryCard
          label="Rejected"
          value={grouped.rejected.length}
          className="border-gray-200 bg-gray-50/30"
        />
      </div>

      {/* Action needed - investor responded positively */}
      {grouped.actionNeeded.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-emerald-700">
            Investor interested ({grouped.actionNeeded.length})
          </h3>
          <div className="space-y-3">
            {grouped.actionNeeded.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} investorId={investorId} />
            ))}
          </div>
        </section>
      )}

      {/* Pending decisions */}
      {grouped.pending.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Awaiting decision ({grouped.pending.length})
          </h3>
          <div className="space-y-3">
            {grouped.pending.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} investorId={investorId} />
            ))}
          </div>
        </section>
      )}

      {/* Rejected */}
      {grouped.rejected.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-400">
            Not interested ({grouped.rejected.length})
          </h3>
          <div className="space-y-3">
            {grouped.rejected.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} investorId={investorId} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

function OpportunityCard({
  opportunity,
  investorId,
}: {
  opportunity: Opportunity
  investorId: string
}) {
  const p = opportunity.property
  const config = decisionConfig[opportunity.decision] ?? decisionConfig.pending
  const DecisionIcon = config.icon

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={config.variant} className="gap-1">
                <DecisionIcon className="size-3" />
                {config.label}
              </Badge>
              {opportunity.status !== "recommended" && (
                <Badge variant="outline" className="capitalize">
                  {opportunity.status.replace(/_/g, " ")}
                </Badge>
              )}
              {opportunity.messageCount > 0 && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <MessageSquare className="size-3" />
                  {opportunity.messageCount}
                </Badge>
              )}
            </div>

            <div className="font-semibold truncate">
              {p?.title ?? "Unknown property"}
            </div>
            <div className="text-sm text-muted-foreground">
              {[p?.area, p?.type, p?.price ? formatAED(p.price) : null]
                .filter(Boolean)
                .join(" \u00b7 ")}
            </div>

            {opportunity.decisionNote && (
              <div className="mt-2 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                <span className="font-medium">Investor note:</span> {opportunity.decisionNote}
              </div>
            )}

            {opportunity.decisionAt && opportunity.decision !== "pending" && (
              <div className="text-xs text-muted-foreground">
                Decided <RelativeTime at={opportunity.decisionAt} />
              </div>
            )}

            {opportunity.sharedMessage && (
              <div className="text-xs text-muted-foreground italic">
                &quot;{opportunity.sharedMessage}&quot;
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            {opportunity.matchScore != null && opportunity.matchScore > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                Match: {opportunity.matchScore}%
              </Badge>
            )}

            <div className="flex gap-2">
              {opportunity.memoId && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/memos/${opportunity.memoId}`}>
                    <FileText className="mr-1.5 size-3.5" />
                    Memo
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/properties/${opportunity.listingId}`}>
                  <ArrowRight className="mr-1.5 size-3.5" />
                  Property
                </Link>
              </Button>
            </div>

            <div className="text-[10px] text-muted-foreground">
              Shared <RelativeTime at={opportunity.sharedAt} />
              {opportunity.sharedByName && ` by ${opportunity.sharedByName}`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
