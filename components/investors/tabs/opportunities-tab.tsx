"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { formatDistanceToNowStrict } from "date-fns"
import {
  ArrowRight,
  Bed,
  Building2,
  FileText,
  Heart,
  MapPin,
  MessageSquare,
  Maximize2,
  Sparkles,
  Star,
  ThumbsDown,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

const decisionConfig: Record<string, { label: string; dot: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:          { label: "Pending",          dot: "bg-gray-400",    bg: "bg-gray-50",    text: "text-gray-600",    icon: Sparkles },
  interested:       { label: "Interested",       dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", icon: Heart },
  very_interested:  { label: "Very Interested",  dot: "bg-green-500",   bg: "bg-green-50",   text: "text-green-700",   icon: Star },
  not_interested:   { label: "Not Interested",   dot: "bg-red-400",     bg: "bg-red-50",     text: "text-red-600",     icon: ThumbsDown },
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
  return <span>{label || "\u2014"}</span>
}

export function OpportunitiesTab({ investorId }: { investorId: string }) {
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/realtor") ? "/realtor" : ""
  const { data, isLoading, error } = useAPI<OpportunitiesResponse>(
    investorId ? `/api/investors/${investorId}/opportunities` : null
  )

  const opportunities = data?.opportunities ?? []

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardContent className="flex h-40 items-center justify-center">
          <span className="text-sm text-gray-400">Loading opportunities...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-gray-100">
        <CardContent className="flex h-40 items-center justify-center">
          <span className="text-sm text-red-500">Failed to load opportunities</span>
        </CardContent>
      </Card>
    )
  }

  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="No opportunities shared yet"
        description="Share properties with this investor to create opportunities. Use the Share dialog from properties or the recommended properties section below."
        icon={<Sparkles className="size-5" />}
      />
    )
  }

  const grouped = {
    actionNeeded: opportunities.filter((o) => o.decision === "interested" || o.decision === "very_interested"),
    pending: opportunities.filter((o) => o.decision === "pending"),
    rejected: opportunities.filter((o) => o.decision === "not_interested"),
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryChip label="Total" value={opportunities.length} />
        <SummaryChip label="Interested" value={grouped.actionNeeded.length} color="emerald" />
        <SummaryChip label="Pending" value={grouped.pending.length} color="amber" />
        <SummaryChip label="Rejected" value={grouped.rejected.length} color="gray" />
      </div>

      {grouped.actionNeeded.length > 0 && (
        <Section label="Investor interested" count={grouped.actionNeeded.length} color="text-emerald-700">
          <div className="grid gap-3 sm:grid-cols-2">
            {grouped.actionNeeded.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} basePath={basePath} />
            ))}
          </div>
        </Section>
      )}

      {grouped.pending.length > 0 && (
        <Section label="Awaiting decision" count={grouped.pending.length} color="text-gray-500">
          <div className="grid gap-3 sm:grid-cols-2">
            {grouped.pending.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} basePath={basePath} />
            ))}
          </div>
        </Section>
      )}

      {grouped.rejected.length > 0 && (
        <Section label="Not interested" count={grouped.rejected.length} color="text-gray-400">
          <div className="grid gap-3 sm:grid-cols-2">
            {grouped.rejected.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} basePath={basePath} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ label, count, color, children }: { label: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className={`mb-3 text-sm font-semibold ${color}`}>
        {label} ({count})
      </h3>
      {children}
    </section>
  )
}

function SummaryChip({ label, value, color }: { label: string; value: number; color?: string }) {
  const bgMap: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50/40",
    amber:   "border-amber-200 bg-amber-50/40",
    gray:    "border-gray-200 bg-gray-50/40",
  }
  const textMap: Record<string, string> = {
    emerald: "text-emerald-700",
    amber:   "text-amber-700",
    gray:    "text-gray-500",
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${color ? bgMap[color] ?? "" : "border-gray-100"}`}>
      <div className={`text-2xl font-bold ${color ? textMap[color] ?? "text-gray-900" : "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function OpportunityCard({
  opportunity,
  basePath,
}: {
  opportunity: Opportunity
  basePath: string
}) {
  const router = useRouter()
  const p = opportunity.property
  const config = decisionConfig[opportunity.decision] ?? decisionConfig.pending
  const DecisionIcon = config.icon
  const hasImage = !!p?.imageUrl
  const yieldPct = p?.expectedRent && p?.price && p.price > 0
    ? ((p.expectedRent * 12) / p.price * 100).toFixed(1)
    : null

  return (
    <div
      className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:border-gray-200 hover:shadow-md cursor-pointer"
      onClick={() => router.push(`${basePath}/properties/${opportunity.listingId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") router.push(`${basePath}/properties/${opportunity.listingId}`) }}
    >

        {/* Image */}
        <div className="relative h-36 w-full bg-gray-100 overflow-hidden">
          {hasImage ? (
            <Image
              src={p!.imageUrl!}
              alt={p?.title ?? "Property"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 50vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Building2 className="h-10 w-10 text-gray-300" />
            </div>
          )}

          {/* Overlays on image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Decision badge top-left */}
          <div className="absolute top-2.5 left-2.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm ${config.bg} ${config.text} border-white/30`}>
              <DecisionIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>

          {/* Match score top-right */}
          {opportunity.matchScore != null && opportunity.matchScore > 0 && (
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold text-gray-800">
                {opportunity.matchScore}% match
              </span>
            </div>
          )}

          {/* Price bottom-left */}
          {p?.price && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="text-sm font-bold text-white drop-shadow-md">{formatAED(p.price)}</span>
            </div>
          )}

          {/* Messages bottom-right */}
          {opportunity.messageCount > 0 && (
            <div className="absolute bottom-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                <MessageSquare className="h-2.5 w-2.5" />
                {opportunity.messageCount}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-2">
          {/* Title */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-green-700 transition-colors">
              {p?.title ?? "Unknown property"}
            </h4>
            {p?.area && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {p.area}
                {p.developer && <span className="truncate"> &middot; {p.developer}</span>}
              </p>
            )}
          </div>

          {/* Property details chips */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {p?.type && (
              <span className="flex items-center gap-1 capitalize">
                <Building2 className="h-3 w-3 text-gray-400" />
                {p.type}
              </span>
            )}
            {p?.bedrooms != null && (
              <span className="flex items-center gap-1">
                <Bed className="h-3 w-3 text-gray-400" />
                {p.bedrooms} BR
              </span>
            )}
            {p?.size != null && (
              <span className="flex items-center gap-1">
                <Maximize2 className="h-3 w-3 text-gray-400" />
                {p.size.toLocaleString()} sqft
              </span>
            )}
            {yieldPct && (
              <span className="font-medium text-green-600">{yieldPct}% yield</span>
            )}
          </div>

          {/* Match reasons */}
          {opportunity.matchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {opportunity.matchReasons.slice(0, 3).map((reason, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-[10px] text-green-700"
                >
                  {reason}
                </span>
              ))}
              {opportunity.matchReasons.length > 3 && (
                <span className="text-[10px] text-gray-400">+{opportunity.matchReasons.length - 3} more</span>
              )}
            </div>
          )}

          {/* Shared message */}
          {opportunity.sharedMessage && opportunity.sharedMessage !== "Shared from Property Intake" && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
              <span className="font-medium text-blue-500">Realtor note: </span>
              {opportunity.sharedMessage}
            </div>
          )}

          {/* Investor note */}
          {opportunity.decisionNote && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
              <span className="font-medium text-gray-500">Note: </span>
              {opportunity.decisionNote}
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
            <span className="text-[10px] text-gray-400">
              Shared <RelativeTime at={opportunity.sharedAt} />
              {opportunity.sharedByName && ` by ${opportunity.sharedByName}`}
            </span>
            <div className="flex items-center gap-1.5">
              {opportunity.memoId && (
                <Link
                  href={`${basePath}/memos/${opportunity.memoId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-sky-600 hover:bg-sky-50 transition-colors"
                >
                  <FileText className="h-3 w-3" />
                  IC Memo
                </Link>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 group-hover:text-green-600 transition-colors">
                View Property
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
    </div>
  )
}
