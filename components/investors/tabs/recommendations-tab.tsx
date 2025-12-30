"use client"

import * as React from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { ArrowRight, MessageCircle, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"

import type { Investor, Recommendation, RecommendationStatus, RecommendationTrigger } from "@/lib/types"
import { listRecommendationsByInvestor } from "@/lib/recommendation-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"

function statusVariant(status: RecommendationStatus) {
  switch (status) {
    case "DRAFT":
      return "outline"
    case "SENT":
      return "secondary"
    case "VIEWED":
      return "default"
    case "QUESTIONS":
      return "secondary"
    case "APPROVED":
      return "default"
    case "REJECTED":
      return "destructive"
    case "SUPERSEDED":
      return "outline"
    default:
      return "outline"
  }
}

function statusLabel(status: RecommendationStatus) {
  return status.replace(/_/g, " ")
}

function triggerLabel(trigger: RecommendationTrigger) {
  return trigger === "ai_insight"
    ? "AI Insight"
    : trigger === "nlp_query"
      ? "NLP query"
      : "Manual"
}

function hasPendingQuestions(rec: Recommendation) {
  return rec.qna.some((q) => !q.finalAnswer)
}

function shouldFollowUp(rec: Recommendation) {
  if (rec.status === "QUESTIONS" && hasPendingQuestions(rec)) return true
  if (rec.status !== "SENT") return false
  if (!rec.sentAt) return false
  const sentMs = new Date(rec.sentAt).getTime()
  if (Number.isNaN(sentMs)) return false
  const THREE_DAYS = 1000 * 60 * 60 * 24 * 3
  const hasViewed = rec.activity.some((a) => a.type === "viewed")
  return !hasViewed && Date.now() - sentMs > THREE_DAYS
}

function RelativeTime({ at }: { at?: string }) {
  const [label, setLabel] = React.useState<string>("")

  React.useEffect(() => {
    if (!at) return
    const ms = new Date(at).getTime()
    if (Number.isNaN(ms)) return
    setLabel(formatDistanceToNowStrict(ms, { addSuffix: true }))
  }, [at])

  if (!at) return <span className="text-xs text-muted-foreground">—</span>
  return <span className="text-xs text-muted-foreground">{label || "…"}</span>
}

export function RecommendationsTab({ investor }: { investor: Investor }) {
  const [items, setItems] = React.useState<Recommendation[]>([])

  React.useEffect(() => {
    setItems(listRecommendationsByInvestor(investor.id))
  }, [investor.id])

  if (items.length === 0) {
    return (
      <EmptyState
        title="No recommendations yet"
        description="Create a recommendation bundle to send opportunities to this investor."
        icon={<Sparkles className="size-5" />}
        action={
          <Button asChild>
            <Link href={`/recommendations/new?investorId=${investor.id}`}>+ New Recommendation</Link>
          </Button>
        }
      />
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Recommendations</CardTitle>
        <Button asChild>
          <Link href={`/recommendations/new?investorId=${investor.id}`}>+ New Recommendation</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((rec) => {
          const followUp = shouldFollowUp(rec)
          const pendingQ = rec.status === "QUESTIONS" && hasPendingQuestions(rec)

          return (
            <div key={rec.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(rec.status)} className="capitalize">
                      {statusLabel(rec.status)}
                    </Badge>
                    <Badge variant="outline">{triggerLabel(rec.trigger)}</Badge>
                    <Badge variant="secondary">{rec.propertyIds.length} properties</Badge>
                  </div>
                  <div className="font-semibold truncate">{rec.title}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Last activity:</span>
                    <RelativeTime at={rec.lastActivityAt ?? rec.updatedAt} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {followUp ? (
                    <Button
                      variant={pendingQ ? "default" : "secondary"}
                      onClick={() =>
                        toast("Follow up", {
                          description: pendingQ
                            ? "Investor has questions pending. Consider replying today."
                            : "Recommendation has not been viewed after 3 days. Consider a follow-up.",
                        })
                      }
                    >
                      {pendingQ ? <MessageCircle className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                      Follow up
                    </Button>
                  ) : null}

                  {rec.status === "APPROVED" ? (
                    <Button variant="outline" asChild>
                      <Link href="/deal-room">Open Deal Rooms</Link>
                    </Button>
                  ) : null}

                  <Button variant="outline" asChild>
                    <Link href={`/recommendations/${rec.id}`}>
                      View
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {rec.status === "QUESTIONS" ? (
                <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">What’s next</div>
                  <div className="text-muted-foreground mt-1">
                    {hasPendingQuestions(rec)
                      ? "Draft and send answers to keep momentum."
                      : "No pending questions—consider nudging for a decision."}
                  </div>
                </div>
              ) : rec.status === "SENT" ? (
                <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">What’s next</div>
                  <div className="text-muted-foreground mt-1">Monitor for views and questions. Follow up if needed.</div>
                </div>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}


