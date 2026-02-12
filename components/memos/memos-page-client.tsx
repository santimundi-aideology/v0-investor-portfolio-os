"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, FileText, Loader2, Search, SlidersHorizontal, Trash2, User, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
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
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import { mapListingToProperty } from "@/lib/utils/map-listing"
import type { Memo, Property } from "@/lib/types"

function getStatusVariant(status: string) {
  switch (status) {
    case "approved":
      return "default"
    case "review":
      return "secondary"
    case "draft":
      return "outline"
    case "rejected":
      return "destructive"
    default:
      return "outline"
  }
}

function normalizeStatus(rawStatus: unknown, rawState: unknown): Memo["status"] {
  if (rawStatus === "draft" || rawStatus === "review" || rawStatus === "approved" || rawStatus === "sent") {
    return rawStatus
  }
  switch (rawState) {
    case "draft":
      return "draft"
    case "pending_review":
      return "review"
    case "ready":
      return "approved"
    case "sent":
    case "opened":
    case "decided":
      return "sent"
    default:
      return "draft"
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function MemosPageClient() {
  const { role, scopedInvestorId } = useApp()
  const { data: allMemos, isLoading: memosLoading, mutate } = useAPI<Memo[]>("/api/memos")
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest")

  const canDelete = role !== "investor"

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!pendingDeleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/memos/${pendingDeleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete memo")
      }
      toast.success("IC memo deleted")
      await mutate()
    } catch (err) {
      toast.error("Could not delete memo", {
        description: (err as Error)?.message ?? "Please try again.",
      })
    } finally {
      setDeleting(false)
      setPendingDeleteId(null)
    }
  }, [pendingDeleteId, mutate])
  const { data: listings, isLoading: listingsLoading } = useAPI<Record<string, unknown>[]>("/api/listings")

  const propertiesMap = React.useMemo(() => {
    const map = new Map<string, Property>()
    if (!listings) return map
    for (const listing of listings) {
      const property = mapListingToProperty(listing)
      map.set(property.id, property)
    }
    return map
  }, [listings])

  const visible = React.useMemo(() => {
    const memos = (allMemos ?? []).map((m) => {
      const raw = m as unknown as Record<string, unknown>
      const propertyId =
        (typeof raw.propertyId === "string" && raw.propertyId) ||
        (typeof raw.listingId === "string" && raw.listingId) ||
        (typeof raw.listing_id === "string" && raw.listing_id) ||
        ""

      const property = propertyId ? propertiesMap.get(propertyId) : undefined

      // Enriched fields from the API (extracted from memo_versions content)
      const enrichedTitle = typeof raw.title === "string" ? raw.title.trim() : ""
      const enrichedPropertyTitle = typeof raw.propertyTitle === "string" ? raw.propertyTitle : ""
      const enrichedCoverImage = typeof raw.coverImage === "string" ? raw.coverImage : ""

      return {
        ...m,
        investorId:
          (typeof raw.investorId === "string" && raw.investorId) ||
          (typeof raw.investor_id === "string" && raw.investor_id) ||
          "",
        investorName:
          (typeof raw.investorName === "string" && raw.investorName) ||
          (raw.investor_id ? "Investor" : "Unassigned"),
        propertyId,
        propertyTitle:
          enrichedPropertyTitle ||
          property?.title ||
          "Property",
        title:
          enrichedTitle ||
          (property?.title ? `IC Memo: ${property.title}` : "Investment Committee Memo"),
        status: normalizeStatus(raw.status, raw.state),
        createdAt:
          (typeof raw.createdAt === "string" && raw.createdAt) ||
          (typeof raw.created_at === "string" && raw.created_at) ||
          new Date().toISOString(),
        updatedAt:
          (typeof raw.updatedAt === "string" && raw.updatedAt) ||
          (typeof raw.updated_at === "string" && raw.updated_at) ||
          new Date().toISOString(),
        // Attach cover image for rendering (used when no listing match)
        _coverImage: enrichedCoverImage || undefined,
      } as Memo & { _coverImage?: string }
    })

    return role === "investor" && scopedInvestorId
      ? memos.filter((m) => m.investorId === scopedInvestorId)
      : memos
  }, [allMemos, role, scopedInvestorId, propertiesMap])

  // Apply filters + sorting on the normalized list
  const filtered = React.useMemo(() => {
    let result = visible

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((m) => m.status === statusFilter)
    }

    // Text search (title, property, investor name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.propertyTitle.toLowerCase().includes(q) ||
          m.investorName.toLowerCase().includes(q)
      )
    }

    // Sort
    result.sort((a, b) => {
      const aTs = Date.parse(a.createdAt || a.updatedAt || "")
      const bTs = Date.parse(b.createdAt || b.updatedAt || "")
      const aTime = Number.isNaN(aTs) ? 0 : aTs
      const bTime = Number.isNaN(bTs) ? 0 : bTs
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime
    })

    return result
  }, [visible, statusFilter, searchQuery, sortOrder])

  // Unique statuses for the filter dropdown
  const availableStatuses = React.useMemo(() => {
    const set = new Set(visible.map((m) => m.status))
    return Array.from(set).sort()
  }, [visible])

  const hasActiveFilters = statusFilter !== "all" || searchQuery.trim() !== ""

  const isLoading = memosLoading || listingsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="IC Memos"
          subtitle="Loading memos..."
          primaryAction={
            <Button asChild>
              <Link href="/memos/new">Generate memo</Link>
            </Button>
          }
        />
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="IC Memos"
        subtitle={`${filtered.length} of ${visible.length} investment committee memos`}
        primaryAction={
          <Button asChild>
            <Link href="/memos/new">Generate memo</Link>
          </Button>
        }
      />

      {/* Filter bar */}
      {visible.length > 0 && (
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by title, property, investor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </Card>
      )}

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && !deleting && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IC memo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The memo and its versions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-500 text-white shadow-sm hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((memo) => {
          const property = memo.propertyId ? propertiesMap.get(memo.propertyId) : undefined
          const coverImageUrl = property?.imageUrl || (memo as Memo & { _coverImage?: string })._coverImage
          return (
            <div key={memo.id} className="relative group">
              <Link href={`/memos/${memo.id}`} className="block">
                <Card className="overflow-hidden border-gray-100 transition-all hover:shadow-lg hover:-translate-y-0.5">
                {/* Property Image Header */}
                {coverImageUrl && (
                  <div className="relative h-36 overflow-hidden">
                    <Image
                      src={coverImageUrl}
                      alt={property?.title || memo.propertyTitle}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized={!property?.imageUrl}
                      onError={(e) => { e.currentTarget.style.display = "none" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    
                    {/* Status Badge */}
                    <Badge 
                      variant={getStatusVariant(memo.status)} 
                      className="absolute top-3 right-3 capitalize shadow-sm"
                    >
                      {memo.status}
                    </Badge>
                    {/* Delete button - internal roles only */}
                    {canDelete && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-3 left-3 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100 z-10"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setPendingDeleteId(memo.id)
                        }}
                        aria-label="Delete memo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Property Info Overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-sm font-medium text-white truncate">{property?.title || memo.propertyTitle}</div>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <span>{property?.area || ""}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm line-clamp-1 group-hover:text-green-600 transition-colors">
                          {memo.title}
                        </CardTitle>
                        {!property && (
                          <CardDescription className="line-clamp-1 text-xs">{memo.propertyTitle}</CardDescription>
                        )}
                      </div>
                    </div>
                    {!property?.imageUrl && (
                      <Badge variant={getStatusVariant(memo.status)} className="shrink-0 capitalize text-xs">
                        {memo.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{memo.investorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(memo.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">View memo details</span>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
              {canDelete && !coverImageUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setPendingDeleteId(memo.id)
                  }}
                  aria-label="Delete memo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {visible.length === 0 && (
        <EmptyState
          title="No memos yet"
          description="Investment committee memos will appear here once created."
          icon={<FileText className="size-5" />}
          action={
            <Button asChild>
              <Link href="/memos/new">Generate memo</Link>
            </Button>
          }
        />
      )}

      {visible.length > 0 && filtered.length === 0 && (
        <EmptyState
          title="No matching memos"
          description="Try adjusting your search or filters."
          icon={<Search className="size-5" />}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("all")
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  )
}
