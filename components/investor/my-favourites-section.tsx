"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  MapPin,
  Sparkles,
  ThumbsDown,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { formatAED } from "@/lib/real-estate"
import { cn } from "@/lib/utils"

export type FavouriteOpportunity = {
  id: string
  decision: string
  decisionAt: string | null
  matchScore: number | null
  matchReasons: string[]
  memoId: string | null
  property: {
    title: string | null
    area: string | null
    type: string | null
    price: number | null
    size: number | null
    bedrooms: number | null
    imageUrl: string | null
    developer: string | null
    expectedRent: number | null
  } | null
}

const PREFERENCE_LEVELS = {
  very_interested: {
    label: "Very interested",
    shortLabel: "Top pick",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    icon: Zap,
  },
  interested: {
    label: "Interested",
    shortLabel: "Interested",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Heart,
  },
} as const

function FavouriteCard({
  opportunity,
  onDecision,
}: {
  opportunity: FavouriteOpportunity
  onDecision: (id: string, decision: string) => void
}) {
  const router = useRouter()
  const p = opportunity.property
  const prefLevel =
    opportunity.decision === "very_interested"
      ? PREFERENCE_LEVELS.very_interested
      : PREFERENCE_LEVELS.interested
  const PrefIcon = prefLevel.icon
  const [isOpen, setIsOpen] = React.useState(false)
  const [prosCons, setProsCons] = React.useState<{
    pros: string[]
    cons: string[]
    loading: boolean
  }>({ pros: [], cons: [], loading: false })

  const fetchProsCons = React.useCallback(async () => {
    setProsCons((prev) => ({ ...prev, loading: true }))
    try {
      const res = await fetch(
        `/api/investor/opportunities/${opportunity.id}/pros-cons`
      )
      if (res.ok) {
        const data = await res.json()
        setProsCons({
          pros: data.pros ?? [],
          cons: data.cons ?? [],
          loading: false,
        })
      } else {
        setProsCons((prev) => ({ ...prev, loading: false }))
      }
    } catch {
      setProsCons((prev) => ({ ...prev, loading: false }))
    }
  }, [opportunity.id])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && prosCons.pros.length === 0 && !prosCons.loading) {
      fetchProsCons()
    }
  }

  const primaryHref = opportunity.memoId
    ? `/investor/memos/${opportunity.memoId}`
    : `/investor/opportunities/${opportunity.id}`

  const pros = prosCons.pros.length > 0 ? prosCons.pros : opportunity.matchReasons
  const cons = prosCons.cons

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div
        className="cursor-pointer"
        onClick={() => router.push(primaryHref)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            router.push(primaryHref)
          }
        }}
      >
        <Link href={primaryHref} className="relative block h-28 bg-muted">
          {p?.imageUrl ? (
            <img
              src={p.imageUrl}
              alt={p.title ?? "Property"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Building2 className="size-10 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="font-semibold text-white text-sm truncate">
              {p?.title ?? "Property"}
            </h3>
            {p?.area && (
              <div className="flex items-center gap-1 text-xs text-white/90">
                <MapPin className="size-3" />
                {p.area}
              </div>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "absolute top-2 right-2 text-[10px] gap-1",
              prefLevel.color
            )}
          >
            <PrefIcon className="size-3" />
            {prefLevel.shortLabel}
          </Badge>
        </Link>

        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            {opportunity.matchScore != null && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                {opportunity.matchScore}% match
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {p?.price ? formatAED(p.price) : "—"} · {p?.size ? `${p.size} sqm` : "—"}
            </span>
          </div>
        </CardContent>
      </div>

      {/* Collapsible pros/cons panel */}
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between rounded-none border-t h-9 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              View pros and cons (AI based on your preferences)
            </span>
            {isOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t bg-gray-50/80 p-3 space-y-3 text-sm">
            {prosCons.loading ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-muted-foreground text-xs">
                  Generating AI analysis...
                </span>
              </div>
            ) : (
              <>
                {pros.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1.5">
                      Pros
                    </p>
                    <ul className="space-y-1">
                      {pros.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {cons.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1.5">
                      Cons / Considerations
                    </p>
                    <ul className="space-y-1">
                      {cons.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-xs">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pros.length === 0 && cons.length === 0 && !prosCons.loading && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Could not generate analysis. Try again.
                  </p>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Quick actions */}
      <div
        className="flex items-center gap-2 p-2 border-t bg-gray-50/50"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
          <Link href={primaryHref}>View detail</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 text-gray-500"
          onClick={() => onDecision(opportunity.id, "pass")}
        >
          <ThumbsDown className="size-3" />
          Remove from favourites
        </Button>
      </div>
    </Card>
  )
}

export function MyFavouritesSection({
  opportunities,
  onDecision,
  className,
}: {
  opportunities: FavouriteOpportunity[]
  onDecision: (id: string, decision: string) => void
  className?: string
}) {
  const veryInterested = opportunities.filter(
    (o) => o.decision === "very_interested"
  )
  const interested = opportunities.filter((o) => o.decision === "interested")

  const groups = [
    {
      key: "very_interested",
      label: "Very interested",
      items: veryInterested,
      ...PREFERENCE_LEVELS.very_interested,
    },
    {
      key: "interested",
      label: "Interested",
      items: interested,
      ...PREFERENCE_LEVELS.interested,
    },
  ].filter((g) => g.items.length > 0)

  if (opportunities.length === 0) {
    return (
      <Card className={cn("border-0 bg-gray-50/80 shadow-none", className)}>
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            <Heart className="size-5 text-rose-500" />
            My Favourites
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Properties you mark as &quot;Interested&quot; or &quot;Very interested&quot; will appear here. You can expand AI-generated pros and cons based on your preferences.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 py-10 text-center">
            <Heart className="mx-auto size-12 text-gray-300" />
            <h3 className="mt-4 text-base font-semibold text-gray-600">
              You have no favourites yet
            </h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Review opportunities and mark those that interest you to
              see them here with personalised pros and cons analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-0 bg-gray-50/80 shadow-none", className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight text-gray-900 flex items-center gap-2">
          <Heart className="size-5 text-rose-500" />
          My Favourites
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your highlights. Expand each tab to see pros and cons
          generated by AI based on your mandate and preferences.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => {
          const Icon = group.icon
          return (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant="outline"
                  className={cn("text-xs gap-1", group.color)}
                >
                  <Icon className="size-3" />
                  {group.label} ({group.items.length})
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                {group.items.map((opp) => (
                  <FavouriteCard
                    key={opp.id}
                    opportunity={opp}
                    onDecision={onDecision}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
