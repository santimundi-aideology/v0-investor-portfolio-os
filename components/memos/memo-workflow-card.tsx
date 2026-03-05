"use client"

import * as React from "react"
import {
  Send,
  CheckCircle2,
  Clock,
  FileSearch,
  ArrowRight,
  RotateCcw,
  Loader2,
  Gavel,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/components/providers/app-provider"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface MemoWorkflowCardProps {
  memoId: string
  memoState: string
  investorId: string
  propertyId: string
}

const STATE_CONFIG: Record<string, {
  label: string
  description: string
  badgeClass: string
}> = {
  draft: {
    label: "Draft",
    description: "This memo is being prepared",
    badgeClass: "bg-gray-100 text-gray-700",
  },
  pending_review: {
    label: "Pending Review",
    description: "Awaiting manager approval",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  ready: {
    label: "Ready to Send",
    description: "Approved and ready for investor",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  sent: {
    label: "Sent",
    description: "Delivered to investor",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  opened: {
    label: "Opened",
    description: "Investor has viewed the memo",
    badgeClass: "bg-violet-100 text-violet-700",
  },
  decided: {
    label: "Decided",
    description: "Investor has made a decision",
    badgeClass: "bg-sky-100 text-sky-700",
  },
}

export function MemoWorkflowCard({
  memoId,
  memoState: initialState,
  investorId,
  propertyId,
}: MemoWorkflowCardProps) {
  const { platformRole } = useApp()
  const router = useRouter()
  const [state, setState] = React.useState(initialState)
  const [loading, setLoading] = React.useState<string | null>(null)
  const [decision, setDecision] = React.useState<{
    type: string
    reasonTags: string[]
  } | null>(null)

  React.useEffect(() => {
    if (state === "decided") {
      fetch(`/api/memos/${memoId}`)
        .then((r) => r.json())
        .then((data) => {
          const d = data?.latestDecision ?? data?.decision
          if (d) {
            setDecision({
              type: d.decision_type ?? d.decisionType ?? d.type,
              reasonTags: d.reason_tags ?? d.reasonTags ?? [],
            })
          }
        })
        .catch(() => {})
    }
  }, [state, memoId])

  const callTransition = async (endpoint: string, label: string, body?: Record<string, unknown>) => {
    setLoading(endpoint)
    try {
      const res = await fetch(`/api/memos/${memoId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `Failed to ${label}`)
      }
      const data = await res.json()
      const newState = data?.state ?? data?.memo?.state
      if (newState) setState(newState)
      toast.success(label, { description: "Memo workflow updated" })
      router.refresh()
    } catch (err) {
      toast.error(`Could not ${label.toLowerCase()}`, {
        description: (err as Error)?.message ?? "Please try again.",
      })
    } finally {
      setLoading(null)
    }
  }

  const config = STATE_CONFIG[state] ?? STATE_CONFIG.draft

  const isAgent = platformRole === "agent" || platformRole === "super_admin"
  const isManager = platformRole === "manager" || platformRole === "super_admin"

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          Workflow
          <Badge className={config.badgeClass}>{config.label}</Badge>
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">{config.description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Draft: agent can submit for review */}
        {state === "draft" && isAgent && (
          <Button
            className="w-full"
            onClick={() => callTransition("submit-review", "Submitted for review")}
            disabled={!!loading}
          >
            {loading === "submit-review" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSearch className="mr-2 h-4 w-4" />
            )}
            Submit for Review
          </Button>
        )}

        {/* Pending review: manager can approve or request changes */}
        {state === "pending_review" && isManager && (
          <>
            <Button
              className="w-full"
              onClick={() => callTransition("approve", "Memo approved")}
              disabled={!!loading}
            >
              {loading === "approve" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => callTransition("request-changes", "Changes requested", { comment: "" })}
              disabled={!!loading}
            >
              {loading === "request-changes" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Request Changes
            </Button>
          </>
        )}

        {/* Pending review: non-manager sees waiting state */}
        {state === "pending_review" && !isManager && (
          <div className="flex items-center gap-2 py-2 text-sm text-amber-600">
            <Clock className="size-4" />
            Waiting for manager approval
          </div>
        )}

        {/* Ready state: handled by MemoSendVantage component */}
        {state === "ready" && (
          <div className="flex items-center gap-2 py-2 text-sm text-emerald-600">
            <ArrowRight className="size-4" />
            Ready — use "Send on Vantage" above to deliver
          </div>
        )}

        {/* Sent / Opened: status indicator */}
        {(state === "sent" || state === "opened") && (
          <div className="flex items-center gap-2 py-2 text-sm text-blue-600">
            <Send className="size-4" />
            {state === "sent" ? "Memo sent to investor" : "Investor has opened the memo"}
          </div>
        )}

        {/* Decided: show decision + create deal room */}
        {state === "decided" && (
          <div className="space-y-3">
            {decision && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Gavel className="size-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {decision.type === "approved"
                      ? "Approved"
                      : decision.type === "approved_conditional"
                        ? "Approved (Conditional)"
                        : "Rejected"}
                  </span>
                  <Badge
                    className={
                      decision.type === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }
                  >
                    {decision.type === "rejected" ? "Rejected" : "Approved"}
                  </Badge>
                </div>
                {decision.reasonTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {decision.reasonTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            {decision && decision.type !== "rejected" && (
              <Button
                className="w-full"
                onClick={() => createDealRoom()}
                disabled={!!loading}
              >
                {loading === "create-deal-room" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Deal Room
              </Button>
            )}
          </div>
        )}

        {/* Progress indicator */}
        <div className="pt-2">
          <div className="flex items-center gap-1">
            {["draft", "pending_review", "ready", "sent", "decided"].map((s, i) => {
              const steps = ["draft", "pending_review", "ready", "sent", "opened", "decided"]
              const currentIdx = Math.max(steps.indexOf(state), 0)
              // Map to 5-segment bar (merge sent+opened into step 3)
              const segmentIdx = i
              const effectiveIdx = currentIdx >= 4 ? 4 : currentIdx  // "opened" maps to same bar position as "sent"
              const isCompleted = segmentIdx < effectiveIdx
              const isCurrent = segmentIdx === effectiveIdx
              return (
                <React.Fragment key={s}>
                  <div
                    className={`h-1.5 flex-1 rounded-full ${
                      isCompleted
                        ? "bg-green-500"
                        : isCurrent
                          ? "bg-blue-500"
                          : "bg-gray-200"
                    }`}
                  />
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  async function createDealRoom() {
    setLoading("create-deal-room")
    try {
      const res = await fetch("/api/deal-rooms/from-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to create deal room")
      }
      const data = await res.json()
      toast.success("Deal room created", {
        description: "Proceeding to deal management",
      })
      const dealRoomId = data.dealRoom?.id ?? data.id
      router.push(`/deal-room/${dealRoomId}`)
    } catch (err) {
      toast.error("Could not create deal room", {
        description: (err as Error)?.message ?? "Please try again.",
      })
    } finally {
      setLoading(null)
    }
  }
}
