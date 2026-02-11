"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Edit3,
  ExternalLink,
  MessageCircle,
  Send,
  Sparkles,
  ThumbsDown,
} from "lucide-react"
import { formatDistanceToNowStrict } from "date-fns"

import { RoleRedirect } from "@/components/security/role-redirect"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import type { Counterfactual, Investor, Property, Recommendation, RecommendationStatus } from "@/lib/types"
import { useAPI } from "@/lib/hooks/use-api"
import { mapListingToProperty } from "@/lib/utils/map-listing"
import {
  addCounterfactualToRecommendation,
  addInvestorQuestion,
  getRecommendationById,
  markViewed,
  removeProperty,
  saveDraftAnswer,
  sendAnswer,
  sendRecommendation,
  setDecision,
  updateRecommendation,
} from "@/lib/recommendation-store"
import { CounterfactualCard } from "@/components/recommendations/counterfactual-card"
import { cn } from "@/lib/utils"

function statusBadgeClasses(status: RecommendationStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-muted text-muted-foreground"
    case "SENT":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20"
    case "VIEWED":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    case "QUESTIONS":
      return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
    case "APPROVED":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    case "REJECTED":
      return "bg-destructive/10 text-destructive border-destructive/20"
    case "SUPERSEDED":
      return "bg-muted text-muted-foreground"
  }
}

function triggerCopy(trigger: Recommendation["trigger"]) {
  switch (trigger) {
    case "ai_insight":
      return "Created from AI Insight"
    case "nlp_query":
      return "Created from NLP search"
    default:
      return "Manual"
  }
}

function readinessBadge(status?: string) {
  if (!status) return <Badge variant="outline">—</Badge>
  const cls =
    status === "READY_FOR_MEMO"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      : status === "NEEDS_VERIFICATION"
        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
        : "bg-muted text-muted-foreground"
  return (
    <Badge variant="outline" className={cls}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

function RelativeTime({ at }: { at?: string }) {
  const [label, setLabel] = React.useState<string>("")
  React.useEffect(() => {
    if (!at) return
    const ms = new Date(at).getTime()
    if (Number.isNaN(ms)) return
    setLabel(formatDistanceToNowStrict(ms, { addSuffix: true }))
  }, [at])
  return <span className="text-xs text-muted-foreground">{label || "—"}</span>
}

function fitBullets(_propertyId: string, p?: Property | null) {
  const bullets: string[] = []
  if (p?.roi) bullets.push(`Targets yield: ${p.roi}% ROI`)
  bullets.push(`Area fit: ${p?.area ?? "Prime area"} aligned with mandate`)
  bullets.push("Downside protection: strong comps + liquidity (placeholder)")
  return bullets.slice(0, 3)
}

export default function RecommendationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [rec, setRec] = React.useState<Recommendation | null>(null)
  const [titleEditing, setTitleEditing] = React.useState(false)
  const [titleDraft, setTitleDraft] = React.useState("")
  const [summaryEditing, setSummaryEditing] = React.useState(false)
  const [summaryDraft, setSummaryDraft] = React.useState("")
  const [pendingAdd, setPendingAdd] = React.useState<Counterfactual | null>(null)

  React.useEffect(() => {
    const r = getRecommendationById(id)
    setRec(r)
    if (r) {
      setTitleDraft(r.title)
      setSummaryDraft(r.summary ?? "")
    }
  }, [id])

  if (!id) return null

  // Fetch investor and listings data from API
  const { data: investorData } = useAPI<Investor>(rec ? `/api/investors/${rec.investorId}` : null)
  const investor = investorData ?? null

  // Fetch listings for property details
  const { data: listingsData } = useAPI<{ listings: Record<string, unknown>[] }>("/api/listings")
  const propertiesMap = React.useMemo(() => {
    const map = new Map<string, Property>()
    if (listingsData?.listings) {
      for (const l of listingsData.listings) {
        const p = mapListingToProperty(l)
        map.set(p.id, p)
      }
    }
    return map
  }, [listingsData])

  if (!rec) {
    return (
      <>
        <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />
        <EmptyState
          title="Recommendation not found"
          description="This recommendation may have been deleted or the link is invalid."
          icon={<AlertTriangle className="size-5" />}
          action={
            <Button asChild>
              <Link href="/investors">Back to investors</Link>
            </Button>
          }
        />
      </>
    )
  }

  const [sending, setSending] = React.useState(false)

  const primaryCta =
    rec.status === "DRAFT"
      ? {
          label: sending ? "Sending..." : "Send to Investor",
          icon: <Send className="mr-2 h-4 w-4" />,
          disabled: sending,
          onClick: async () => {
            setSending(true)
            try {
              // Create investor_opportunities rows for each property in the bundle
              const results = await Promise.allSettled(
                rec.propertyIds.map((listingId) =>
                  fetch(`/api/investors/${rec.investorId}/opportunities`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      listingId,
                      sharedMessage: rec.summary || `Recommendation: ${rec.title}`,
                    }),
                  }).then((res) => {
                    if (!res.ok) throw new Error("Failed")
                    return res
                  })
                )
              )
              const succeeded = results.filter((r) => r.status === "fulfilled").length
              const failed = results.filter((r) => r.status === "rejected").length

              sendRecommendation(rec.id)
              setRec(getRecommendationById(rec.id))

              if (failed === 0) {
                toast.success("Recommendation sent", {
                  description: `${succeeded} opportunities created for investor.`,
                })
              } else {
                toast.warning("Recommendation sent with issues", {
                  description: `${succeeded} opportunities created, ${failed} failed.`,
                })
              }
            } catch {
              toast.error("Failed to send recommendation")
            } finally {
              setSending(false)
            }
          },
        }
      : rec.status === "APPROVED"
        ? {
            label: "Open Deal Room",
            icon: <ExternalLink className="mr-2 h-4 w-4" />,
            onClick: () => router.push("/deal-room"),
          }
        : rec.status === "REJECTED"
          ? {
              label: "Create new recommendation",
              icon: <Sparkles className="mr-2 h-4 w-4" />,
              onClick: () => router.push(`/recommendations/new?investorId=${rec.investorId}&supersede=${rec.id}`),
            }
          : {
              label: "Follow up",
              icon: <MessageCircle className="mr-2 h-4 w-4" />,
              onClick: () =>
                toast("Follow up", { description: "Placeholder: send a follow-up message to the investor." }),
            }

  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={investor ? `/investors/${investor.id}` : "/investors"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        <PageHeader
          title={
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn(statusBadgeClasses(rec.status))}>
                  {rec.status}
                </Badge>
                <Badge variant="outline">{triggerCopy(rec.trigger)}</Badge>
                <span className="text-sm text-muted-foreground">
                  Investor:{" "}
                  {investor ? (
                    <Link href={`/investors/${investor.id}`} className="underline underline-offset-4">
                      {investor.name}
                    </Link>
                  ) : (
                    rec.investorId
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {titleEditing ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                    <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          updateRecommendation(rec.id, { title: titleDraft })
                          toast.success("Title updated")
                          setTitleEditing(false)
                          setRec(getRecommendationById(rec.id))
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTitleDraft(rec.title)
                          setTitleEditing(false)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-semibold tracking-tight">{rec.title}</h1>
                    <Button variant="ghost" size="icon" onClick={() => setTitleEditing(true)}>
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Edit title</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          }
          subtitle={
            <div className="flex items-center gap-2">
              <span>Last activity:</span>
              <RelativeTime at={rec.lastActivityAt ?? rec.updatedAt} />
            </div>
          }
          primaryAction={
            <Button onClick={primaryCta.onClick} disabled={"disabled" in primaryCta && !!primaryCta.disabled}>
              {primaryCta.icon}
              {primaryCta.label}
            </Button>
          }
          secondaryActions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  markViewed(rec.id)
                  toast("Demo", { description: "Marked as VIEWED (demo action)." })
                  setRec(getRecommendationById(rec.id))
                }}
              >
                Mark viewed (demo)
              </Button>
            </div>
          }
        />

        {/* 1) Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summaryEditing ? (
              <div className="space-y-2">
                <Textarea value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} rows={5} />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      updateRecommendation(rec.id, { summary: summaryDraft })
                      toast.success("Summary updated")
                      setSummaryEditing(false)
                      setRec(getRecommendationById(rec.id))
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSummaryDraft(rec.summary ?? "")
                      setSummaryEditing(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : rec.summary ? (
              <div className="space-y-2">
                <p className="text-sm leading-6 text-foreground">{rec.summary}</p>
                <Button variant="outline" size="sm" onClick={() => setSummaryEditing(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit summary
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm font-medium">No summary yet</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Add a narrative to explain the recommendation bundle.
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => {
                      const generated =
                        "AI draft (placeholder): This recommendation prioritizes prime assets with stable demand, strong comps, and clear downside protection aligned to the investor’s yield target."
                      updateRecommendation(rec.id, { summary: generated })
                      toast.success("Generated summary (placeholder)")
                      setRec(getRecommendationById(rec.id))
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate summary (AI)
                  </Button>
                  <Button variant="outline" onClick={() => setSummaryEditing(true)}>
                    Write manually
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2) Investment Context (collapsed) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Investment context</CardTitle>
          </CardHeader>
          <CardContent>
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span>Show mandate + budget snapshot</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Mandate</div>
                  <div className="mt-1 text-sm">
                    {investor?.mandate?.strategy ?? "—"} • Target {investor?.mandate?.yieldTarget ?? "—"} •{" "}
                    {investor?.mandate?.riskTolerance ?? "—"} risk
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Preferred areas: {investor?.mandate?.preferredAreas?.join(", ") || "—"}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Budget</div>
                  <div className="mt-1 text-sm">
                    {investor?.mandate?.minInvestment?.toLocaleString?.() ?? "—"} –{" "}
                    {investor?.mandate?.maxInvestment?.toLocaleString?.() ?? "—"} AED (placeholder)
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Portfolio exposure: concentration checks (placeholder)</div>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>

        {/* 3) Recommended Properties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recommended properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rec.propertyIds.length === 0 ? (
              <EmptyState
                title="No properties selected"
                description="Add properties to build a recommendation."
                icon={<Sparkles className="size-5" />}
                action={<Button asChild><Link href={`/recommendations/new?investorId=${rec.investorId}`}>+ Add properties</Link></Button>}
              />
            ) : (
              rec.propertyIds.map((pid) => {
                const p = propertiesMap.get(pid) ?? null
                if (!p) return null
                const note = rec.propertyNotes?.[pid]
                return (
                  <Card key={pid} className="border-border/70">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {p.area} • <span className="capitalize">{p.type}</span> • AED{" "}
                            {(p.price / 1_000_000).toFixed(1)}M
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {readinessBadge(p.readinessStatus)}
                            <Badge variant="outline">Trust: {p.trustScore ?? "—"}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/properties/${p.id}`}>View property</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeProperty(rec.id, pid)
                              toast("Removed", { description: "Property removed from recommendation." })
                              setRec(getRecommendationById(rec.id))
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border bg-muted/30 p-3">
                        <div className="text-sm font-medium">Why it fits</div>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {fitBullets(pid, p).map((b, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-emerald-600">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {note?.includedDespite ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                            <div className="flex-1 space-y-2">
                              <div className="text-sm font-medium text-amber-900">
                                Included despite: {note.includedDespite}
                              </div>
                              <div className="text-xs text-amber-800">
                                Add rationale for including this excluded property (editable).
                              </div>
                              <Textarea
                                value={note.rationale ?? ""}
                                onChange={(e) => {
                                  const next = {
                                    ...(rec.propertyNotes ?? {}),
                                    [pid]: { ...note, rationale: e.target.value },
                                  }
                                  updateRecommendation(rec.id, { propertyNotes: next })
                                  setRec(getRecommendationById(rec.id))
                                }}
                                rows={3}
                                placeholder="Rationale (e.g., strategic adjacency, pricing concession, special lease terms)..."
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* 4) Counterfactuals (internal-only) */}
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Considered but not recommended <Badge variant="secondary">{rec.counterfactuals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between rounded-md border bg-amber-50/40 px-3 py-2 text-sm">
                <span>Show counterfactuals</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-3">
                {rec.counterfactuals.map((c) => {
                  const p = propertiesMap.get(c.propertyId) ?? null
                  if (!p) return null
                  return (
                    <CounterfactualCard
                      key={c.propertyId}
                      counterfactual={c}
                      propertyTitle={p.title}
                      propertyPrice={p.price}
                      propertyArea={p.area}
                      propertyType={p.type}
                      readinessStatus={p.readinessStatus}
                      onAddAnyway={() => setPendingAdd(c)}
                    />
                  )
                })}
              </div>
            </details>
          </CardContent>
        </Card>

        {/* 5) Investor interaction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Investor interaction</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="qna" className="space-y-4">
              <TabsList>
                <TabsTrigger value="qna">Q&amp;A</TabsTrigger>
                <TabsTrigger value="decision">Decision</TabsTrigger>
              </TabsList>

              <TabsContent value="qna" className="space-y-4">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-sm font-medium">Demo controls</div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addInvestorQuestion(rec.id, "Can you share the downside case and exit strategy for option #2?")
                        toast("Demo", { description: "Added an investor question." })
                        setRec(getRecommendationById(rec.id))
                      }}
                    >
                      Simulate investor question
                    </Button>
                  </div>
                </div>

                {rec.qna.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No questions yet.</div>
                ) : (
                  <div className="space-y-3">
                    {rec.qna.map((q) => (
                      <div key={q.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">Investor question</div>
                          <Badge variant="outline">
                            <RelativeTime at={q.askedAt} />
                          </Badge>
                        </div>
                        <div className="text-sm">{q.question}</div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="text-sm font-medium">Your answer</div>
                          <Textarea
                            value={q.finalAnswer ?? q.draftAnswer ?? ""}
                            onChange={(e) => {
                              saveDraftAnswer(rec.id, q.id, e.target.value)
                              setRec(getRecommendationById(rec.id))
                            }}
                            rows={4}
                            placeholder="Draft answer..."
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const aiDraft =
                                  "AI draft (placeholder): Downside case assumes 10% vacancy buffer and 5% capex reserve; exit targets a conservative cap rate based on recent comps."
                                saveDraftAnswer(rec.id, q.id, aiDraft)
                                toast("AI draft added", { description: "Placeholder answer inserted." })
                                setRec(getRecommendationById(rec.id))
                              }}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              AI draft
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const final = q.draftAnswer ?? ""
                                if (!final.trim()) {
                                  toast.error("Answer is empty")
                                  return
                                }
                                sendAnswer(rec.id, q.id, final)
                                toast.success("Answer sent")
                                setRec(getRecommendationById(rec.id))
                              }}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send answer
                            </Button>
                          </div>
                          {q.finalAnswer ? (
                            <div className="text-xs text-muted-foreground">
                              Sent <RelativeTime at={q.answeredAt} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="decision" className="space-y-4">
                {rec.decision ? (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Decision</div>
                      <Badge variant={rec.decision.outcome === "APPROVED" ? "default" : "destructive"}>
                        {rec.decision.outcome}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Decided <RelativeTime at={rec.decision.decidedAt} />
                    </div>
                    {rec.decision.reasonTags?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {rec.decision.reasonTags.map((t) => (
                          <Badge key={t} variant="outline">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {rec.decision.note ? <div className="mt-3 text-sm">{rec.decision.note}</div> : null}
                  </div>
                ) : (
                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium">No decision yet</div>
                    <div className="mt-1 text-sm text-muted-foreground">For demo, you can set an outcome here.</div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => {
                          setDecision(rec.id, { outcome: "APPROVED", decidedAt: new Date().toISOString() })
                          toast.success("Marked approved (demo)")
                          setRec(getRecommendationById(rec.id))
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setDecision(rec.id, { outcome: "REJECTED", decidedAt: new Date().toISOString() })
                          toast("Marked rejected (demo)")
                          setRec(getRecommendationById(rec.id))
                        }}
                      >
                        <ThumbsDown className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 6) Activity timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rec.activity
                .slice()
                .sort((a, b) => b.at.localeCompare(a.at))
                .map((a, idx) => (
                  <div key={`${a.at}-${idx}`} className="flex items-start justify-between gap-4 rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{a.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{a.type}</div>
                    </div>
                    <RelativeTime at={a.at} />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Add-anyway confirmation */}
        <AlertDialog open={!!pendingAdd} onOpenChange={(open) => !open && setPendingAdd(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Add excluded property?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAdd ? (
                  <>
                    This property was excluded because: <strong>{pendingAdd.reasonLabels?.[0] ?? "policy rule"}</strong>.
                    Add anyway?
                  </>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingAdd(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!pendingAdd) return
                  addCounterfactualToRecommendation(rec.id, pendingAdd.propertyId)
                  toast.success("Added anyway", { description: "Property moved into recommended list." })
                  setPendingAdd(null)
                  setRec(getRecommendationById(rec.id))
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Add anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}


