"use client"

import * as React from "react"
import {
  Check,
  AlertTriangle,
  ShieldCheck,
  Clock3,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Heart,
  ThumbsDown,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type DecisionType = "approved" | "rejected" | "approved_conditional"
type InvestorAction = "interested" | "not_now" | "pass"

type Comp = {
  description?: string
  source?: string
  source_detail?: string
  price?: number
  price_per_sqft?: number
  rent_per_year?: number
  observed_date?: string
}

type MemoContent = {
  execSummary?: string
  scenarios?: Record<string, unknown>
  assumptions?: string[]
  evidence?: {
    comps?: Comp[]
  }
}

type MemoVersion = {
  version: number
  content: MemoContent
  createdAt: string
  createdBy: string
}

interface MemoDecisionPanelProps {
  memoId: string
  memoState: string
  trustStatus?: "verified" | "unknown" | "flagged"
  trustReason?: string
  currentVersion?: MemoVersion
  onDecisionMade?: (decision: InvestorAction) => void
}

const REASON_TAGS = [
  { id: "alignment", label: "Aligns with mandate" },
  { id: "pricing", label: "Favorable pricing" },
  { id: "location", label: "Preferred location" },
  { id: "yield", label: "Strong yield profile" },
  { id: "appreciation", label: "Appreciation potential" },
  { id: "risk_low", label: "Acceptable risk" },
  { id: "off_mandate", label: "Off mandate" },
  { id: "pricing_high", label: "Price too high" },
  { id: "location_concern", label: "Location concerns" },
  { id: "yield_low", label: "Insufficient yield" },
  { id: "risk_high", label: "Risk too high" },
  { id: "timing", label: "Bad timing" },
]

const POSITIVE_TAGS = ["alignment", "pricing", "location", "yield", "appreciation", "risk_low"]
const NEGATIVE_TAGS = ["off_mandate", "pricing_high", "location_concern", "yield_low", "risk_high", "timing"]

export function MemoDecisionPanel({
  memoId,
  memoState,
  trustStatus = "unknown",
  trustReason,
  currentVersion,
  onDecisionMade,
}: MemoDecisionPanelProps) {
  const [showApproveDialog, setShowApproveDialog] = React.useState(false)
  const [showRejectDialog, setShowRejectDialog] = React.useState(false)
  const [showNotNowDialog, setShowNotNowDialog] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])
  const [comment, setComment] = React.useState("")
  const [conditionText, setConditionText] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState<InvestorAction | null>(null)

  const canDecide = ["sent", "opened"].includes(memoState)
  const isDecided = memoState === "decided"

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  function mapDecisionTypeToAction(decisionType: DecisionType): InvestorAction {
    if (decisionType === "approved") return "interested"
    if (decisionType === "approved_conditional") return "not_now"
    return "pass"
  }

  async function submitDecision(
    decisionType: DecisionType,
    opts?: { reasonTags?: string[]; comment?: string; conditionText?: string; action?: InvestorAction }
  ) {
    const reasonTags = opts?.reasonTags ?? selectedTags
    const commentText = opts?.comment ?? comment
    const condition = opts?.conditionText ?? conditionText

    if (reasonTags.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/investor/memos/${memoId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "investor" },
        body: JSON.stringify({
          decision: decisionType,
          reasonTags,
          conditionText: decisionType === "approved_conditional" ? condition : undefined,
          comment: commentText || undefined,
        }),
      })

      if (res.ok) {
        const action = opts?.action ?? mapDecisionTypeToAction(decisionType)
        setSubmitted(action)
        setShowApproveDialog(false)
        setShowRejectDialog(false)
        setShowNotNowDialog(false)
        onDecisionMade?.(action)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function resetAndOpen(setter: React.Dispatch<React.SetStateAction<boolean>>) {
    setSelectedTags([])
    setComment("")
    setConditionText("")
    setter(true)
  }

  // ── Decided state ──────────────────────────────────────────────────
  if (isDecided || submitted) {
    const label =
      submitted === "interested" || memoState === "decided"
        ? "Interested"
        : submitted === "pass"
          ? "Pass"
          : "Not Now"
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="text-sm">
            <span className="font-medium text-emerald-700">Decision submitted:</span>{" "}
            <span className="text-gray-600">{label} — realtor notified</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <a href="/investor/memos">
            All memos <ArrowRight className="ml-1.5 size-3" />
          </a>
        </Button>
      </div>
    )
  }

  // ── Not ready state ────────────────────────────────────────────────
  if (!canDecide) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-amber-100">
          <Clock3 className="size-4 text-amber-600" />
        </div>
        <p className="text-sm text-amber-700">
          Memo in <span className="font-medium capitalize">{memoState}</span> state — not ready for decision
        </p>
      </div>
    )
  }

  // ── Active decision bar ────────────────────────────────────────────
  const trustIcon =
    trustStatus === "verified" ? (
      <ShieldCheck className="size-3.5 text-emerald-600" />
    ) : trustStatus === "flagged" ? (
      <AlertTriangle className="size-3.5 text-red-500" />
    ) : (
      <AlertTriangle className="size-3.5 text-amber-500" />
    )

  const trustLabel =
    trustStatus === "verified" ? "Verified" : trustStatus === "flagged" ? "Flagged" : "Unverified"

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Left: trust + version pill */}
        <div className="hidden items-center gap-2 sm:flex">
          <Badge
            variant="outline"
            className={cn(
              "gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              trustStatus === "verified"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : trustStatus === "flagged"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            {trustIcon}
            {trustLabel}
          </Badge>
          <span className="text-[11px] text-gray-400">v{currentVersion?.version ?? 1}</span>
        </div>

        {/* Divider */}
        <div className="hidden h-5 w-px bg-gray-200 sm:block" />

        {/* Center: AI sparkle hint */}
        <div className="mr-auto flex items-center gap-1.5 text-xs text-gray-500">
          <Sparkles className="size-3.5 text-green-500" />
          <span className="hidden md:inline">Review the analysis below, then decide</span>
          <span className="md:hidden">Your decision</span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => resetAndOpen(setShowApproveDialog)}
            size="sm"
            className="h-8 gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Heart className="size-3.5" />
            Interested
          </Button>
          <Button
            onClick={() => resetAndOpen(setShowNotNowDialog)}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-4 text-xs font-semibold"
          >
            <Clock3 className="size-3.5" />
            <span className="hidden sm:inline">Not Now</span>
          </Button>
          <Button
            onClick={() => resetAndOpen(setShowRejectDialog)}
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <ThumbsDown className="size-3.5" />
            <span className="hidden sm:inline">Pass</span>
          </Button>
        </div>
      </div>

      {/* ── Interested Dialog ──────────────────────────────────────── */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Heart className="size-5" />
              Mark as Interested
            </DialogTitle>
            <DialogDescription>
              Select the reasons that support your interest in this deal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reasons</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {REASON_TAGS.filter((t) => POSITIVE_TAGS.includes(t.id)).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedTags.includes(tag.id)
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border bg-background hover:border-emerald-300 hover:bg-emerald-50"
                    )}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes for realtor (optional)</label>
              <textarea
                className="mt-1.5 w-full rounded-lg border bg-background p-3 text-sm"
                rows={2}
                placeholder="Any notes for the realtor..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <p className="text-xs font-medium text-amber-800">Conditional?</p>
              <textarea
                className="mt-1.5 w-full rounded-lg border bg-background p-2.5 text-sm"
                rows={2}
                placeholder="e.g., Subject to price negotiation below AED 4.5M..."
                value={conditionText}
                onChange={(e) => setConditionText(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitDecision("approved", { action: "interested" })}
              disabled={selectedTags.length === 0 || submitting}
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submitting ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 size-3.5" />
              )}
              {submitting ? "Submitting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pass Dialog ────────────────────────────────────────────── */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ThumbsDown className="size-5" />
              Pass on This Opportunity
            </DialogTitle>
            <DialogDescription>
              Help your realtor learn what to avoid next time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reasons</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {REASON_TAGS.filter((t) => NEGATIVE_TAGS.includes(t.id)).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedTags.includes(tag.id)
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-border bg-background hover:border-red-300 hover:bg-red-50"
                    )}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Feedback</label>
              <textarea
                className="mt-1.5 w-full rounded-lg border bg-background p-3 text-sm"
                rows={3}
                placeholder="What would need to change for you to reconsider..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitDecision("rejected", { action: "pass" })}
              disabled={selectedTags.length === 0 || submitting}
              size="sm"
              variant="destructive"
            >
              {submitting ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <ThumbsDown className="mr-1.5 size-3.5" />
              )}
              {submitting ? "Submitting..." : "Confirm Pass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Not Now Dialog ─────────────────────────────────────────── */}
      <Dialog open={showNotNowDialog} onOpenChange={setShowNotNowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock3 className="size-5 text-gray-600" />
              Not Now
            </DialogTitle>
            <DialogDescription>
              Let your realtor know you are not ready to proceed at this time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Optional note</label>
              <textarea
                className="mt-1.5 w-full rounded-lg border bg-background p-3 text-sm"
                rows={3}
                placeholder="Anything your realtor should know..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Suggestions:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  "Revisit after current deal closes",
                  "Share similar options next quarter",
                  "Waiting for financing window",
                  "Market timing is not ideal",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setComment(s)}
                    className="rounded-full border px-2.5 py-1 text-[11px] text-gray-600 hover:border-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowNotNowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                submitDecision("approved_conditional", {
                  action: "not_now",
                  reasonTags: ["timing"],
                  conditionText: comment.trim() || "Investor marked this memo as not now.",
                  comment,
                })
              }
              disabled={submitting}
              size="sm"
            >
              {submitting ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Clock3 className="mr-1.5 size-3.5" />
              )}
              {submitting ? "Submitting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
