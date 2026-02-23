"use client"

import * as React from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  Heart,
  ThumbsDown,
  Clock3,
  Building2,
  ChevronRight,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type OpportunityForHistory = {
  id: string
  status: string
  decision: string
  decisionAt: string | null
  decisionNote: string | null
  sharedAt: string
  memoId: string | null
  property: { title: string | null; area: string | null } | null
}

const PIPELINE_STAGES = [
  { key: "recommended", label: "Recommended", short: "New" },
  { key: "shortlisted", label: "Shortlisted", short: "Shortlist" },
  { key: "memo_review", label: "Memo review", short: "Memo" },
  { key: "deal_room", label: "Deal room", short: "Deal room" },
  { key: "acquired", label: "Acquired", short: "Done" },
] as const

const DECISION_LABELS: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  interested: { label: "Interested", icon: Heart, class: "text-blue-600" },
  very_interested: { label: "Very interested", icon: Heart, class: "text-blue-600" },
  not_interested: { label: "Passed", icon: ThumbsDown, class: "text-gray-500" },
  pending: { label: "Not yet decided", icon: Clock3, class: "text-muted-foreground" },
}

function getDecisionDisplay(decision: string) {
  return DECISION_LABELS[decision] ?? DECISION_LABELS.pending
}

export function OpportunityDecisionHistory({
  opportunities,
  className,
}: {
  opportunities: OpportunityForHistory[]
  className?: string
}) {
  const withDecision = opportunities.filter((o) => o.decisionAt != null)
  const sortedDecisions = React.useMemo(
    () =>
      [...withDecision].sort(
        (a, b) =>
          new Date(b.decisionAt!).getTime() - new Date(a.decisionAt!).getTime()
      ),
    [withDecision]
  )

  const countsByStage = React.useMemo(() => {
    const m: Record<string, number> = {}
    PIPELINE_STAGES.forEach((s) => (m[s.key] = 0))
    m.rejected = 0
    opportunities.forEach((o) => {
      if (o.status === "rejected") m.rejected += 1
      else if (m[o.status] !== undefined) m[o.status] += 1
    })
    return m
  }, [opportunities])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Pipeline overview — Apple-style clean steps */}
      <Card className="border-0 bg-gray-50/80 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight text-gray-900">
            Pipeline
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            From recommendation to acquisition. Where your opportunities stand.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-4">
            {PIPELINE_STAGES.map((stage, i) => {
              const count = countsByStage[stage.key] ?? 0
              const hasAny = count > 0
              return (
                <React.Fragment key={stage.key}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 min-w-[100px]",
                      hasAny ? "bg-white border border-gray-200/80 shadow-sm" : "bg-transparent"
                    )}
                  >
                    {hasAny ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-gray-300" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {stage.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {count} {count === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <ChevronRight className="size-4 text-gray-300 shrink-0 hidden sm:block" aria-hidden />
                  )}
                </React.Fragment>
              )
            })}
          </div>
          {countsByStage.rejected > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 bg-gray-100/80 w-fit">
              <ThumbsDown className="size-4 text-gray-400" />
              <span className="text-xs text-muted-foreground">
                Passed: {countsByStage.rejected}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision history — list of past decisions */}
      <Card className="border-0 bg-gray-50/80 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight text-gray-900">
            Decision history
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your past decisions on recommended properties.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedDecisions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 py-8 text-center">
              <Clock3 className="mx-auto size-8 text-gray-300" />
              <p className="mt-2 text-sm text-muted-foreground">
                No decisions yet. Review recommendations and mark your interest.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {sortedDecisions.slice(0, 15).map((opp) => {
                const dec = getDecisionDisplay(opp.decision)
                const Icon = dec.icon
                return (
                  <li key={opp.id}>
                    <Link
                      href={`/investor/opportunities/${opp.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white border border-transparent hover:border-gray-200/80"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200/80">
                        <Building2 className="size-4 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {opp.property?.title ?? "Property"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {opp.property?.area ?? "—"} ·{" "}
                          {new Date(opp.decisionAt!).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-xs font-medium", dec.class)}>
                          {dec.label}
                        </span>
                        <Icon className={cn("size-3.5", dec.class)} />
                      </div>
                      <ChevronRight className="size-4 text-gray-300 shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {sortedDecisions.length > 15 && (
            <p className="mt-3 text-xs text-muted-foreground text-center">
              Showing latest 15. Open individual opportunities to see full history.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
