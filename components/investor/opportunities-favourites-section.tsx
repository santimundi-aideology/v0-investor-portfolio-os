"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
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
import { Input } from "@/components/ui/input"
import { InvestorImage } from "@/components/investor/investor-image"
import { formatAED } from "@/lib/real-estate"
import { cn } from "@/lib/utils"

export type FavouriteStatus = "new" | "interested" | "pipeline" | "passed"

export type FavouriteOpportunity = {
  id: string
  decision: string
  decisionAt: string | null
  status: string
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

export type LinkFavourite = {
  id: string
  url: string
  title: string
  pros: string[]
  cons: string[]
  status: FavouriteStatus
  addedAt: string
}

const STATUS_CHIPS: { value: FavouriteStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "interested", label: "Interested" },
  { value: "pipeline", label: "Pipeline" },
  { value: "passed", label: "Passed" },
]

function getOpportunityFavouriteStatus(
  decision: string,
  status: string
): FavouriteStatus {
  if (decision === "not_interested" || status === "rejected") return "passed"
  if (["shortlisted", "memo_review", "deal_room"].includes(status))
    return "pipeline"
  if (decision === "interested" || decision === "very_interested")
    return "interested"
  return "new"
}

function OpportunityFavouriteCard({
  opportunity,
  onDecision,
  onStatusChange,
}: {
  opportunity: FavouriteOpportunity
  onDecision: (id: string, decision: string) => void
  onStatusChange?: (id: string, status: FavouriteStatus) => void
}) {
  const router = useRouter()
  const p = opportunity.property
  const favouriteStatus = getOpportunityFavouriteStatus(
    opportunity.decision,
    opportunity.status
  )
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

  const interestedDate =
    opportunity.decisionAt &&
    (opportunity.decision === "interested" || opportunity.decision === "very_interested")
      ? new Date(opportunity.decisionAt).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null

  return (
    <Card className="overflow-hidden border border-gray-300 bg-white shadow-md">
      <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-gray-300 bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px] font-medium capitalize text-gray-800 border-gray-700 bg-white">
            {favouriteStatus}
          </Badge>
        </div>
        {interestedDate && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <Calendar className="size-3 shrink-0" />
            <span>Added to favourites on {interestedDate}</span>
          </div>
        )}
      </div>
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
        <Link href={primaryHref} className="relative block h-20 bg-gray-100 overflow-hidden">
          <InvestorImage
            src={p?.imageUrl}
            alt={p?.title ?? "Property"}
            lazy
            aspectRatio="4/3"
            className="absolute inset-0 h-full w-full"
            sizes="(max-width: 640px) 100vw, 33vw"
            fallbackIconSize="sm"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-bold text-white text-sm truncate">
              {p?.title ?? "Property"}
            </h3>
            {p?.area && (
              <div className="flex items-center gap-1 text-xs text-white/90 mt-0.5">
                <MapPin className="size-3" />
                {p.area}
              </div>
            )}
          </div>
        </Link>

        <CardContent className="p-3 space-y-2 bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            {opportunity.matchScore != null && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                {opportunity.matchScore}% match
              </span>
            )}
            <span className="text-xs text-gray-700">
              {p?.price ? formatAED(p.price) : "—"} · {p?.size ? `${p.size} sqm` : "—"}
            </span>
          </div>
        </CardContent>
      </div>

      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between rounded-none border-t border-gray-300 h-9 text-xs text-gray-800 hover:bg-gray-50"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-gray-600" />
              Pros &amp; cons (AI)
            </span>
            {isOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-3 text-sm">
            {prosCons.loading ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="size-4 animate-spin text-gray-500" />
                <span className="text-gray-600 text-xs">
                  Generating...
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
                      Cons
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
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div
        className="flex items-center gap-2 p-2 border-t border-gray-300 bg-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="outline" size="sm" className="h-7 text-xs border-gray-800 text-gray-800 hover:bg-gray-100" asChild>
          <Link href={primaryHref}>View detail</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          onClick={() => onDecision(opportunity.id, "not_interested")}
        >
          <ThumbsDown className="size-3" />
          Remove
        </Button>
      </div>
    </Card>
  )
}

function LinkFavouriteCard({
  item,
  onStatusChange,
  onRemove,
}: {
  item: LinkFavourite
  onStatusChange: (id: string, status: FavouriteStatus) => void
  onRemove: (id: string) => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  const addedDate = item.addedAt
    ? new Date(item.addedAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <Card className="overflow-hidden border border-gray-300 bg-white shadow-md">
      <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-gray-300 bg-gray-50 flex-wrap">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px] font-medium capitalize text-gray-800 border-gray-700 bg-white">
            {item.status}
          </Badge>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {STATUS_CHIPS.map(({ value }) => (
              <Button
                key={value}
                variant={item.status === value ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-1.5 text-[10px] border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
                onClick={() => onStatusChange(item.id, value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
        {addedDate && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <Calendar className="size-3 shrink-0" />
            <span>Added {addedDate}</span>
          </div>
        )}
      </div>
      <div className="p-3 bg-white">
        <h3 className="font-bold text-sm truncate text-gray-900">
          {item.title || "Property listing"}
        </h3>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-600 hover:text-gray-900 hover:underline flex items-center gap-1 mt-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {item.url.slice(0, 50)}...
          <ExternalLink className="size-3" />
        </a>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between rounded-none border-t border-gray-300 h-9 text-xs text-gray-800 hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-gray-600" />
              Pros &amp; cons
            </span>
            {isOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-3 text-sm">
            {item.pros.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1.5">
                  Pros
                </p>
                <ul className="space-y-1">
                  {item.pros.map((pro, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {item.cons.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1.5">
                  Cons
                </p>
                <ul className="space-y-1">
                  {item.cons.map((con, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-center gap-2 p-2 border-t border-gray-300 bg-gray-50 flex-wrap">
        <Button variant="outline" size="sm" className="h-7 text-xs border-gray-800 text-gray-800 hover:bg-gray-100" asChild>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            View listing
          </a>
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200" onClick={() => onRemove(item.id)}>
          <ThumbsDown className="size-3" />
          Remove
        </Button>
      </div>
    </Card>
  )
}

const STORAGE_KEY = "investor_link_favourites"

export function getStoredLinkFavourites(investorId: string | null): LinkFavourite[] {
  if (typeof window === "undefined" || !investorId) return []
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${investorId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LinkFavourite[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setStoredLinkFavourites(
  investorId: string | null,
  items: LinkFavourite[]
) {
  if (typeof window === "undefined" || !investorId) return
  try {
    localStorage.setItem(
      `${STORAGE_KEY}_${investorId}`,
      JSON.stringify(items)
    )
  } catch {
    // ignore
  }
}

export function OpportunitiesFavouritesSection({
  opportunities,
  linkFavourites,
  onDecision,
  onAddLinkFavourite,
  onRemoveLinkFavourite,
  onLinkFavouriteStatusChange,
  investorId,
  className,
  embedded,
}: {
  opportunities: FavouriteOpportunity[]
  linkFavourites: LinkFavourite[]
  onDecision: (id: string, decision: string) => void
  onAddLinkFavourite: (item: Omit<LinkFavourite, "id" | "addedAt" | "status">) => void
  onRemoveLinkFavourite: (id: string) => void
  onLinkFavouriteStatusChange?: (id: string, status: FavouriteStatus) => void
  investorId: string | null
  className?: string
  /** When true, used inside Opportunities page solid container: no header, no outer card bg */
  embedded?: boolean
}) {
  const [statusFilter, setStatusFilter] =
    React.useState<FavouriteStatus | "all">("all")
  const [linkInput, setLinkInput] = React.useState("")
  const [adding, setAdding] = React.useState(false)
  const [addError, setAddError] = React.useState<string | null>(null)

  const opportunityWithStatus = React.useMemo(() => {
    return opportunities.map((opp) => ({
      ...opp,
      favouriteStatus: getOpportunityFavouriteStatus(
        opp.decision,
        opp.status
      ) as FavouriteStatus,
    }))
  }, [opportunities])

  const allFavouritesFiltered = React.useMemo(() => {
    const filter = (s: FavouriteStatus) =>
      statusFilter === "all" || s === statusFilter
    const opps = opportunityWithStatus.filter((o) => filter(o.favouriteStatus))
    const links = linkFavourites.filter((l) => filter(l.status))
    return { opps, links }
  }, [opportunityWithStatus, linkFavourites, statusFilter])

  const handleAddByLink = async () => {
    const url = linkInput.trim()
    if (!url) {
      setAddError("Please enter a listing URL")
      return
    }
    setAddError(null)
    setAdding(true)
    try {
      const res = await fetch("/api/investor/favourites/pros-cons-from-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(data.error || "Failed to analyse link")
        return
      }
      onAddLinkFavourite({
        url,
        title: data.title || "Property listing",
        pros: Array.isArray(data.pros) ? data.pros : [],
        cons: Array.isArray(data.cons) ? data.cons : [],
      })
      setLinkInput("")
    } catch {
      setAddError("Something went wrong")
    } finally {
      setAdding(false)
    }
  }

  const totalCount =
    opportunityWithStatus.length + linkFavourites.length

  const content = (
    <>
      {/* Status chips */}
      <div className={cn("flex flex-wrap gap-2", embedded && "mb-6")}>
        {STATUS_CHIPS.map(({ value, label }) => (
          <Button
            key={value}
            variant={statusFilter === value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs border-gray-200 text-gray-700"
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </Button>
        ))}
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs border-gray-200 text-gray-700"
          onClick={() => setStatusFilter("all")}
        >
          All
        </Button>
      </div>

      {/* Add by link */}
      <div className={cn("space-y-2", embedded && "mb-8")}>
        <p className="text-xs font-medium text-gray-500">
          Add a favourite by pasting a property listing URL (e.g. Property Finder, Bayut, Dubizzle)
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="https://..."
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddByLink()}
            className={cn("flex-1 w-full border-gray-200", embedded && "max-w-none")}
          />
          <Button size="sm" onClick={handleAddByLink} disabled={adding} className="sm:w-auto">
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
        </div>
        {addError && (
          <p className="text-xs text-destructive">{addError}</p>
        )}
      </div>

      {/* List */}
      {totalCount === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center">
          <Heart className="mx-auto size-12 text-gray-300" />
          <h3 className="mt-4 text-base font-semibold text-gray-600">
            No favourites yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Mark opportunities as interested, or add a listing link above to get AI pros and cons.
          </p>
        </div>
      ) : (
        <div className={cn("grid sm:grid-cols-2 lg:grid-cols-3", embedded ? "gap-6" : "gap-3")}>
          {allFavouritesFiltered.opps.map((opp) => (
            <OpportunityFavouriteCard
              key={opp.id}
              opportunity={opp}
              onDecision={onDecision}
            />
          ))}
          {allFavouritesFiltered.links.map((item) => (
            <LinkFavouriteCard
              key={item.id}
              item={item}
              onStatusChange={onLinkFavouriteStatusChange ?? (() => {})}
              onRemove={onRemoveLinkFavourite}
            />
          ))}
        </div>
      )}
    </>
  )

  if (embedded) {
    return <div className={cn("space-y-6", className)}>{content}</div>
  }

  return (
    <Card className={cn("border border-gray-100 bg-white shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight text-gray-900 flex items-center gap-2">
          <Heart className="size-5 text-rose-500" />
          My Favourites
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Highlight properties you like. Add from your realtor&apos;s suggestions or paste a listing link to get AI pros and cons based on your preferences.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  )
}
