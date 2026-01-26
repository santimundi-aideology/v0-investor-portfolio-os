"use client"

import * as React from "react"
import { Check, X, MessageSquare, Sparkles, AlertTriangle, ShieldCheck, Clock, Loader2, CheckCircle2, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  onDecisionMade?: (decision: DecisionType) => void
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
  const [showRequestChangesDialog, setShowRequestChangesDialog] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])
  const [comment, setComment] = React.useState("")
  const [conditionText, setConditionText] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState<DecisionType | null>(null)
  const [aiSummary, setAiSummary] = React.useState<string | null>(null)
  const [loadingAiSummary, setLoadingAiSummary] = React.useState(false)

  const canDecide = ["sent", "opened"].includes(memoState)
  const isDecided = memoState === "decided"

  // Generate AI summary of key decision factors
  React.useEffect(() => {
    if (!currentVersion?.content || aiSummary) return
    
    setLoadingAiSummary(true)
    // Simulate AI analysis based on memo content
    const timer = setTimeout(() => {
      const content = currentVersion.content
      const summary = generateAiSummary(content)
      setAiSummary(summary)
      setLoadingAiSummary(false)
    }, 1200)
    
    return () => clearTimeout(timer)
  }, [currentVersion, aiSummary])

  function generateAiSummary(content: MemoContent): string {
    const points: string[] = []
    
    if (content.execSummary) {
      points.push("Executive summary provided with clear investment thesis")
    }
    
    const compsCount = content.evidence?.comps?.length ?? 0
    if (compsCount > 0) {
      points.push(`${compsCount} comparable properties analyzed for valuation support`)
    }
    
    const assumptionsCount = content.assumptions?.length ?? 0
    if (assumptionsCount > 0) {
      points.push(`${assumptionsCount} key assumptions documented for transparency`)
    }
    
    if (content.scenarios) {
      const scenarioCount = Object.keys(content.scenarios).length
      if (scenarioCount > 0) {
        points.push(`${scenarioCount} scenario(s) modeled for risk assessment`)
      }
    }
    
    if (points.length === 0) {
      return "This memo contains limited information. Consider requesting more details before making a decision."
    }
    
    return points.join(". ") + ". Review each section carefully before proceeding."
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  async function submitDecision(decisionType: DecisionType) {
    if (selectedTags.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/investor/memos/${memoId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "investor" },
        body: JSON.stringify({
          decision: decisionType,
          reasonTags: selectedTags,
          conditionText: decisionType === "approved_conditional" ? conditionText : undefined,
          comment: comment || undefined,
        }),
      })

      if (res.ok) {
        setSubmitted(decisionType)
        setShowApproveDialog(false)
        setShowRejectDialog(false)
        setShowRequestChangesDialog(false)
        onDecisionMade?.(decisionType)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function openApproveDialog() {
    setSelectedTags([])
    setComment("")
    setConditionText("")
    setShowApproveDialog(true)
  }

  function openRejectDialog() {
    setSelectedTags([])
    setComment("")
    setShowRejectDialog(true)
  }

  function openRequestChangesDialog() {
    setComment("")
    setShowRequestChangesDialog(true)
  }

  if (isDecided || submitted) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                Decision Submitted
              </h3>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                {submitted === "approved" || memoState === "decided"
                  ? "This memo has been approved. The realtor will be notified."
                  : submitted === "rejected"
                    ? "This memo has been rejected. The realtor will be notified."
                    : "This memo has been conditionally approved. Review the conditions with your realtor."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="/investor/memos">
                View all memos <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!canDecide) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Clock className="size-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                Memo Not Ready for Decision
              </h3>
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                This memo is in <span className="font-medium capitalize">{memoState}</span> state. 
                It must be sent to you before you can approve or reject it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-green-100 bg-white shadow-lg">
        <CardContent className="p-6">
          {/* Trust Badge Section */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrustBadge status={trustStatus} reason={trustReason} />
              <span className="text-sm text-gray-500">
                Memo v{currentVersion?.version ?? 1}
              </span>
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="mb-6 rounded-xl border bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                <Sparkles className="size-4 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground">AI Decision Summary</h4>
                {loadingAiSummary ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing memo content...
                  </div>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    {aiSummary}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Button
              onClick={openApproveDialog}
              className="h-16 text-lg font-semibold bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
              size="lg"
            >
              <Check className="mr-2 size-6" />
              Approve
            </Button>
            <Button
              onClick={openRejectDialog}
              variant="destructive"
              className="h-16 text-lg font-semibold shadow-lg shadow-destructive/25"
              size="lg"
            >
              <X className="mr-2 size-6" />
              Reject
            </Button>
            <Button
              onClick={openRequestChangesDialog}
              variant="outline"
              className="h-16 text-lg font-semibold"
              size="lg"
            >
              <MessageSquare className="mr-2 size-5" />
              Request Changes
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            Your decision will be recorded and the realtor will be notified immediately.
          </p>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Check className="size-6" />
              Approve Memo
            </DialogTitle>
            <DialogDescription>
              Confirm your approval of this investment memo. Select the reasons that support your decision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason(s) for approval</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {REASON_TAGS.filter((t) => POSITIVE_TAGS.includes(t.id)).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
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
              <label className="text-sm font-medium">Additional comments (optional)</label>
              <textarea
                className="mt-2 w-full rounded-lg border bg-background p-3 text-sm"
                rows={3}
                placeholder="Add any notes for the realtor..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Conditional approval?
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    If your approval is subject to conditions, specify them below.
                  </p>
                  <textarea
                    className="mt-2 w-full rounded-lg border bg-background p-3 text-sm"
                    rows={2}
                    placeholder="e.g., Subject to final price negotiation below AED 4.5M..."
                    value={conditionText}
                    onChange={(e) => setConditionText(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitDecision(conditionText ? "approved_conditional" : "approved")}
              disabled={selectedTags.length === 0 || submitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="mr-2 size-4" />
                  Confirm Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X className="size-6" />
              Reject Memo
            </DialogTitle>
            <DialogDescription>
              Please provide feedback on why this memo does not meet your requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason(s) for rejection</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {REASON_TAGS.filter((t) => NEGATIVE_TAGS.includes(t.id)).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      selectedTags.includes(tag.id)
                        ? "border-destructive bg-destructive text-white"
                        : "border-border bg-background hover:border-destructive/50 hover:bg-destructive/5"
                    )}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Feedback for the realtor</label>
              <textarea
                className="mt-2 w-full rounded-lg border bg-background p-3 text-sm"
                rows={4}
                placeholder="Explain what would need to change for you to reconsider..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitDecision("rejected")}
              disabled={selectedTags.length === 0 || submitting}
              variant="destructive"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <X className="mr-2 size-4" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <Dialog open={showRequestChangesDialog} onOpenChange={setShowRequestChangesDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-6 text-green-600" />
              Request Changes
            </DialogTitle>
            <DialogDescription>
              Ask the realtor to revise the memo before you make a final decision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">What changes do you need?</label>
              <textarea
                className="mt-2 w-full rounded-lg border bg-background p-3 text-sm"
                rows={5}
                placeholder="Describe the additional information, clarifications, or changes you need..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="text-sm font-medium">Common requests:</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-500">
                <li>• More comparable sales data</li>
                <li>• Updated financial projections</li>
                <li>• Additional due diligence on title/ownership</li>
                <li>• Clarification on renovation costs</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestChangesDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Just close for now - this would send a message to the realtor
                setShowRequestChangesDialog(false)
              }}
              disabled={!comment.trim()}
            >
              <MessageSquare className="mr-2 size-4" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TrustBadge({ status, reason }: { status: "verified" | "unknown" | "flagged"; reason?: string }) {
  const config = {
    verified: {
      icon: ShieldCheck,
      label: "Verified",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800",
    },
    unknown: {
      icon: AlertTriangle,
      label: "Unverified",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
    },
    flagged: {
      icon: AlertTriangle,
      label: "Flagged",
      className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
    },
  }

  const { icon: Icon, label, className } = config[status]

  return (
    <Badge variant="outline" className={cn("gap-1.5 px-3 py-1.5", className)}>
      <Icon className="size-4" />
      {label}
      {reason && <span className="opacity-75">• {reason}</span>}
    </Badge>
  )
}
