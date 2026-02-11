"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  ThumbsDown,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { cn } from "@/lib/utils"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"

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

type OpportunityCounts = {
  recommended: number
  interested: number
  veryInterested: number
  pipeline: number
  rejected: number
  total: number
}

function formatAED(value: number) {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

const decisionConfig = {
  pending: {
    label: "New",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Sparkles,
  },
  interested: {
    label: "Interested",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Heart,
  },
  very_interested: {
    label: "Very Interested",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Star,
  },
  not_interested: {
    label: "Not Interested",
    color: "bg-gray-50 text-gray-400 border-gray-200 line-through",
    icon: ThumbsDown,
  },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  recommended: { label: "Recommended", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  shortlisted: { label: "Shortlisted", color: "bg-blue-50 text-blue-700 border-blue-200" },
  memo_review: { label: "Memo Review", color: "bg-purple-50 text-purple-700 border-purple-200" },
  deal_room: { label: "In Deal Room", color: "bg-amber-50 text-amber-700 border-amber-200" },
  acquired: { label: "Acquired", color: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", color: "bg-gray-50 text-gray-500 border-gray-200" },
}

function OpportunityCard({
  opportunity,
  onDecision,
}: {
  opportunity: Opportunity
  onDecision: (id: string, decision: string, note?: string) => void
}) {
  const [showNote, setShowNote] = React.useState(false)
  const [note, setNote] = React.useState("")
  const p = opportunity.property
  const dec = decisionConfig[opportunity.decision as keyof typeof decisionConfig] ?? decisionConfig.pending
  const st = statusConfig[opportunity.status] ?? statusConfig.recommended

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      {/* Property header */}
      <div className="relative h-36 bg-muted">
        {p?.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.title ?? "Property"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="size-12 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-semibold text-white text-sm truncate">
            {p?.title ?? "Property"}
          </h3>
          {p?.area && (
            <div className="flex items-center gap-1 text-xs text-white/80">
              <MapPin className="size-3" />
              {p.area}
            </div>
          )}
        </div>
        <Badge variant="outline" className={cn("absolute top-3 right-3 text-[10px]", st.color)}>
          {st.label}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Key info */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Price</p>
            <p className="text-sm font-semibold">
              {p?.price ? formatAED(p.price) : "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Size</p>
            <p className="text-sm font-semibold">
              {p?.size ? `${p.size} sqm` : "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Beds</p>
            <p className="text-sm font-semibold">{p?.bedrooms ?? "—"}</p>
          </div>
        </div>

        {/* Match score + reasons */}
        {opportunity.matchScore && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {opportunity.matchScore}% match
            </Badge>
            {opportunity.matchReasons.slice(0, 2).map((r) => (
              <span key={r} className="text-[10px] text-muted-foreground">{r}</span>
            ))}
          </div>
        )}

        {/* Shared by */}
        <div className="text-xs text-muted-foreground">
          Shared by <span className="font-medium text-foreground">{opportunity.sharedByName ?? "Your advisor"}</span>
          {" "}on {new Date(opportunity.sharedAt).toLocaleDateString()}
        </div>

        {opportunity.sharedMessage && (
          <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
            &quot;{opportunity.sharedMessage}&quot;
          </p>
        )}

        {/* Decision controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-auto">
            Your decision:
          </span>
          <Button
            variant={opportunity.decision === "interested" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onDecision(opportunity.id, "interested")}
          >
            <Heart className="size-3" />
            Interested
          </Button>
          <Button
            variant={opportunity.decision === "very_interested" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs gap-1",
              opportunity.decision === "very_interested" &&
                "bg-amber-500 hover:bg-amber-600"
            )}
            onClick={() => onDecision(opportunity.id, "very_interested")}
          >
            <Star className="size-3" />
            Very Interested
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => setShowNote(!showNote)}
          >
            <X className="size-3" />
            Pass
          </Button>
        </div>

        {showNote && (
          <div className="space-y-2 pt-1">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional: reason for passing..."
              className="text-xs h-16 resize-none"
            />
            <Button
              size="sm"
              variant="destructive"
              className="text-xs h-7"
              onClick={() => {
                onDecision(opportunity.id, "not_interested", note)
                setShowNote(false)
                setNote("")
              }}
            >
              Confirm Pass
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {opportunity.memoId && (
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link href={`/investor/memos/${opportunity.memoId}`}>
                View Memo
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
            <Link href={`/investor/recommendations/${opportunity.id}`}>
              <MessageSquare className="size-3" />
              Chat ({opportunity.messageCount})
            </Link>
          </Button>
          <AskAIBankerWidget
            agentId="real_estate_advisor"
            title="AI Advisor"
            suggestedQuestions={[
              `Tell me about ${p?.title ?? "this property"}`,
              `What's the expected yield for ${p?.area ?? "this area"}?`,
              `How does this compare to market prices?`,
            ]}
            pagePath="/investor/recommendations"
            variant="inline"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default function InvestorRecommendationsPage() {
  const { scopedInvestorId } = useApp()

  const {
    data: apiData,
    isLoading,
    mutate,
  } = useAPI<{ opportunities: Opportunity[]; counts: OpportunityCounts }>(
    "/api/investor/opportunities"
  )

  const opportunities = apiData?.opportunities ?? []
  const counts = apiData?.counts ?? {
    recommended: 0,
    interested: 0,
    veryInterested: 0,
    pipeline: 0,
    rejected: 0,
    total: 0,
  }

  const handleDecision = async (
    id: string,
    decision: string,
    note?: string
  ) => {
    try {
      await fetch(`/api/investor/opportunities/${id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      })
      mutate()
    } catch (err) {
      console.error("Failed to update decision:", err)
    }
  }

  // Filter into tabs
  const newOpps = opportunities.filter(
    (o) => o.decision === "pending" && o.status === "recommended"
  )
  const interestedOpps = opportunities.filter(
    (o) => o.decision === "interested" || o.decision === "very_interested"
  )
  const pipelineOpps = opportunities.filter((o) =>
    ["shortlisted", "memo_review", "deal_room"].includes(o.status)
  )
  const passedOpps = opportunities.filter(
    (o) => o.status === "rejected" || o.decision === "not_interested"
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading recommendations...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="size-6 text-primary" />
                Recommendations
              </h1>
              <p className="text-sm text-gray-500">
                Properties your advisor has recommended for you. Review each
                opportunity, ask questions, and indicate your interest level.
              </p>
            </div>
            <AskAIBankerWidget
              agentId="real_estate_advisor"
              title="AI Investment Advisor"
              description="Get help evaluating opportunities"
              suggestedQuestions={[
                "Which recommendations best match my mandate?",
                "Compare my top opportunities",
                "What should I prioritize?",
              ]}
              pagePath="/investor/recommendations"
              scopedInvestorId={scopedInvestorId}
              variant="inline"
            />
          </div>
        </div>
      </div>

      {/* Summary counters */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{counts.recommended}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {counts.interested + counts.veryInterested}
              </p>
              <p className="text-xs text-muted-foreground">Interested</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {counts.pipeline}
              </p>
              <p className="text-xs text-muted-foreground">Pipeline</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-400">
                {counts.rejected}
              </p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="new" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="new">New ({newOpps.length})</TabsTrigger>
            <TabsTrigger value="interested">
              Interested ({interestedOpps.length})
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              Pipeline ({pipelineOpps.length})
            </TabsTrigger>
            <TabsTrigger value="passed">
              Passed ({passedOpps.length})
            </TabsTrigger>
          </TabsList>

          {[
            { value: "new", items: newOpps },
            { value: "interested", items: interestedOpps },
            { value: "pipeline", items: pipelineOpps },
            { value: "passed", items: passedOpps },
          ].map(({ value, items }) => (
            <TabsContent key={value} value={value}>
              {items.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onDecision={handleDecision}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <Sparkles className="mx-auto size-12 text-gray-300" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No {value === "new" ? "new recommendations" : `${value} opportunities`} yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {value === "new"
                      ? "Your advisor will share properties here when they find good matches for your mandate."
                      : "Move opportunities here by updating your interest level."}
                  </p>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
