"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ThumbsDown,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatAED } from "@/lib/real-estate"
import { cn } from "@/lib/utils"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop"

const ADVISOR_DISPLAY_NAME = "Sarah"

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
  status: string
  decision: string
  decisionAt: string | null
  sharedByName: string | null
  sharedAt: string
  sharedMessage: string | null
  matchScore: number | null
  matchReasons: string[]
  memoId: string | null
  messageCount: number
  property: OpportunityProperty | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  recommended: { label: "Recommended", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  shortlisted: { label: "Shortlisted", color: "bg-blue-50 text-blue-700 border-blue-200" },
  memo_review: { label: "Memo Review", color: "bg-purple-50 text-purple-700 border-purple-200" },
  deal_room: { label: "In Deal Room", color: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected: { label: "Rejected", color: "bg-gray-50 text-gray-500 border-gray-200" },
}

function getUiDecision(decision: string, decisionAt: string | null): string | null {
  if (decision === "very_interested") return "very_interested"
  if (decision === "interested") return "interested"
  if (decision === "not_interested") return "pass"
  if (decision === "pending" && decisionAt) return "not_now"
  return null
}

function OpportunityCard({
  opportunity,
  onDecision,
  isInterested,
}: {
  opportunity: Opportunity
  onDecision: (id: string, decision: string) => void
  isInterested?: boolean
}) {
  const router = useRouter()
  const [passing, setPassing] = React.useState(false)
  const p = opportunity.property
  const st = statusConfig[opportunity.status] ?? statusConfig.recommended
  const primaryHref = opportunity.memoId
    ? `/investor/memos/${opportunity.memoId}`
    : `/investor/opportunities/${opportunity.id}`
  const imageUrl = p?.imageUrl || PLACEHOLDER_IMAGE

  const handlePass = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPassing(true)
    onDecision(opportunity.id, "pass")
  }

  const handleInterested = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDecision(opportunity.id, "interested")
    toast.success("Added to My Favourites", {
      description: "View it in the Favourites section",
      action: {
        label: "View Favourites",
        onClick: () => router.push("/investor/opportunities/favourites"),
      },
    })
  }

  const handleTopPick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDecision(opportunity.id, "very_interested")
    toast.success("Added to My Favourites as Top Pick", {
      description: "View it in the Favourites section",
      action: {
        label: "View Favourites",
        onClick: () => router.push("/investor/opportunities/favourites"),
      },
    })
  }

  if (passing) return null

  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer"
      onClick={() => router.push(primaryHref)}
    >
      <Link href={primaryHref} className="relative block h-40 bg-muted">
        <img
          src={imageUrl}
          alt={p?.title ?? "Property"}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-semibold text-white text-sm truncate">{p?.title ?? "Property"}</h3>
          {p?.area && (
            <div className="flex items-center gap-1 text-xs text-white/80">
              <MapPin className="size-3" />
              {p.area}
            </div>
          )}
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          {isInterested && (
            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
              <Heart className="size-3 mr-0.5" />
              In Favourites
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-[10px]", st.color)}>
            {st.label}
          </Badge>
        </div>
      </Link>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Price</p>
            <p className="text-sm font-semibold">{p?.price ? formatAED(p.price) : "—"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Size</p>
            <p className="text-sm font-semibold">{p?.size ? `${p.size} sqm` : "—"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Beds</p>
            <p className="text-sm font-semibold">{p?.bedrooms ?? "—"}</p>
          </div>
        </div>
        {opportunity.matchScore != null && (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            {opportunity.matchScore}% match
          </Badge>
        )}
        <div className="text-xs text-muted-foreground">
          Shared by {opportunity.sharedByName ?? "Your advisor"} on{" "}
          {new Date(opportunity.sharedAt).toLocaleDateString()}
        </div>
        <div
          className="flex flex-wrap items-center gap-2 pt-1 border-t"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleTopPick}>
            <Zap className="size-3" />
            Top pick
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleInterested}>
            <Heart className="size-3" />
            Interested
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onDecision(opportunity.id, "not_now") }}>
            <Clock3 className="size-3" />
            Not now
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-gray-500 hover:text-destructive hover:border-destructive"
            onClick={handlePass}
          >
            <ThumbsDown className="size-3" />
            Pass
          </Button>
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1 gap-1" asChild>
            <Link href={`/investor/opportunities/${opportunity.id}`}>
              <MessageSquare className="size-3" />
              Chat ({opportunity.messageCount})
            </Link>
          </Button>
          <Button variant="default" size="sm" className="h-7 text-xs gap-1 shrink-0" asChild>
            <Link href={`/investor/opportunities/${opportunity.id}`}>
              <Send className="size-3" />
              Send to Realtor
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RealtorSuggestionsPage() {
  const { scopedInvestorId } = useApp()
  const investorApiUrl = scopedInvestorId
    ? `/api/investor/opportunities?investorId=${scopedInvestorId}`
    : null

  const { data: apiData, isLoading, mutate } = useAPI<{
    opportunities: Opportunity[]
    counts: { recommended: number; interested: number; veryInterested: number; pipeline: number; rejected: number; total: number }
  }>(investorApiUrl)

  const opportunities = apiData?.opportunities ?? []
  const counts = apiData?.counts ?? { recommended: 0, interested: 0, veryInterested: 0, pipeline: 0, rejected: 0, total: 0 }
  const advisorName = opportunities[0]?.sharedByName?.trim() || ADVISOR_DISPLAY_NAME

  const handleDecision = async (id: string, decision: string) => {
    try {
      await fetch(`/api/investor/opportunities/${id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: decision === "pass" ? "not_interested" : decision }),
      })
      mutate()
    } catch (err) {
      console.error("Failed to update decision:", err)
    }
  }

  const newOpps = opportunities.filter(
    (o) =>
      o.status === "recommended" &&
      !["interested", "very_interested", "pass"].includes(getUiDecision(o.decision, o.decisionAt) ?? "")
  )
  const interestedOpps = opportunities.filter(
    (o) =>
      getUiDecision(o.decision, o.decisionAt) === "interested" ||
      getUiDecision(o.decision, o.decisionAt) === "very_interested"
  )
  const pipelineOpps = opportunities.filter((o) =>
    ["shortlisted", "memo_review", "deal_room"].includes(o.status)
  )
  const passedOpps = opportunities.filter(
    (o) =>
      o.status === "rejected" || getUiDecision(o.decision, o.decisionAt) === "pass"
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      <header className="border-b border-gray-100 bg-white">
        <div className="w-full py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/opportunities">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Realtor suggestions</h1>
              <p className="text-sm text-muted-foreground">
                Properties {advisorName} has shared with you
              </p>
            </div>
          </div>
        </div>
      </header>
      <div className="w-full py-6">
        <Tabs defaultValue="new" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="new">New ({newOpps.length})</TabsTrigger>
            <TabsTrigger value="interested">Interested ({interestedOpps.length})</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline ({pipelineOpps.length})</TabsTrigger>
            <TabsTrigger value="passed">Passed ({passedOpps.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            {newOpps.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {newOpps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onDecision={handleDecision}
                    isInterested={false}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Building2 className="mx-auto size-12 text-gray-300" />
                <h3 className="mt-4 font-semibold">No new suggestions</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your realtor will share properties here when they find matches.
                </p>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="interested">
            {interestedOpps.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {interestedOpps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onDecision={handleDecision}
                    isInterested
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Heart className="mx-auto size-12 text-gray-300" />
                <h3 className="mt-4 font-semibold">No interested items</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mark suggestions as Interested to see them here.
                </p>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="pipeline">
            {pipelineOpps.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pipelineOpps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onDecision={handleDecision}
                    isInterested={
                      opp.decision === "interested" || opp.decision === "very_interested"
                    }
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Building2 className="mx-auto size-12 text-gray-300" />
                <h3 className="mt-4 font-semibold">No pipeline items</h3>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="passed">
            {passedOpps.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {passedOpps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onDecision={handleDecision}
                    isInterested={false}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <ThumbsDown className="mx-auto size-12 text-gray-300" />
                <h3 className="mt-4 font-semibold">No passed items</h3>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
