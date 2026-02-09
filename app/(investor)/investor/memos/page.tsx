"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { MemoCard } from "@/components/investor/memo-card"
import { EmptyState } from "@/components/layout/empty-state"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import { cn } from "@/lib/utils"

type MemoStatus = "all" | "draft" | "review" | "approved" | "sent"
type SortOption = "date-desc" | "date-asc" | "updated-desc" | "status"

type MemoSummary = {
  id: string
  investorId: string
  state: string
  currentVersion: number
  listingId?: string
  createdAt: string
  updatedAt: string
  trustStatus?: "verified" | "unknown" | "flagged"
  propertyTitle?: string
  title?: string
}

type Property = {
  id: string
  title: string
  area?: string
  price?: number
  imageUrl?: string
  type?: string
}

export default function InvestorMemosPage() {
  const { scopedInvestorId } = useApp()
  const [statusFilter, setStatusFilter] = React.useState<MemoStatus>("all")
  const [sortOption, setSortOption] = React.useState<SortOption>("date-desc")
  const [searchQuery, setSearchQuery] = React.useState("")

  // Fetch memos
  const { data: memos = [], isLoading, error } = useAPI<MemoSummary[]>(
    "/api/investor/memos",
    {
      headers: { "x-role": "investor" },
    }
  )

  // Fetch property details for memos with listingId
  const [propertiesMap, setPropertiesMap] = React.useState<Record<string, Property>>({})
  const [loadingProperties, setLoadingProperties] = React.useState(false)

  React.useEffect(() => {
    async function fetchProperties() {
      if (!memos || memos.length === 0) return

      const listingIds = memos
        .filter((m) => m.listingId)
        .map((m) => m.listingId!)
        .filter((id, index, self) => self.indexOf(id) === index) // unique

      if (listingIds.length === 0) return

      setLoadingProperties(true)
      try {
        const propertyPromises = listingIds.map(async (listingId) => {
          try {
            const res = await fetch(`/api/listings/${listingId}`)
            if (res.ok) {
              const property = await res.json()
              return { listingId, property }
            }
          } catch (err) {
            console.error(`Failed to fetch property ${listingId}:`, err)
          }
          return null
        })

        const results = await Promise.all(propertyPromises)
        const propertiesData: Record<string, Property> = {}
        results.forEach((result) => {
          if (result) {
            propertiesData[result.listingId] = result.property
          }
        })
        setPropertiesMap(propertiesData)
      } finally {
        setLoadingProperties(false)
      }
    }

    fetchProperties()
  }, [memos])

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = memos.length
    const pendingReview = memos.filter((m) => m.state === "review" || m.state === "sent").length
    const approved = memos.filter((m) => m.state === "approved").length
    const draft = memos.filter((m) => m.state === "draft").length

    return { total, pendingReview, approved, draft }
  }, [memos])

  // Filter and sort memos
  const filteredAndSortedMemos = React.useMemo(() => {
    let result = [...memos]

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((m) => m.state === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((m) => {
        const property = m.listingId ? propertiesMap[m.listingId] : null
        return (
          m.title?.toLowerCase().includes(query) ||
          m.propertyTitle?.toLowerCase().includes(query) ||
          property?.title?.toLowerCase().includes(query) ||
          property?.area?.toLowerCase().includes(query)
        )
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "updated-desc":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case "status":
          const statusOrder = { review: 0, sent: 1, approved: 2, draft: 3 }
          return (statusOrder[a.state as keyof typeof statusOrder] ?? 99) - 
                 (statusOrder[b.state as keyof typeof statusOrder] ?? 99)
        default:
          return 0
      }
    })

    return result
  }, [memos, statusFilter, searchQuery, sortOption, propertiesMap])

  function resetFilters() {
    setStatusFilter("all")
    setSortOption("date-desc")
    setSearchQuery("")
  }

  const hasActiveFilters = statusFilter !== "all" || searchQuery.trim() !== "" || sortOption !== "date-desc"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading memos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-sm text-destructive">Failed to load memos</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">Investment Memos</h1>
              <p className="text-sm text-gray-500">
                Review investment opportunities shared with you
              </p>
            </div>
            <AskAIBankerWidget
              agentId="memo_assistant"
              title="Memo Assistant"
              description="Get help reviewing your memos"
              suggestedQuestions={[
                "Which memos require my immediate attention?",
                "What are the key risks in my pending memos?",
                "Compare the properties in my active memos",
              ]}
              pagePath="/investor/memos"
              scopedInvestorId={scopedInvestorId}
              variant="inline"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Memos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10">
                <Eye className="size-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingReview}</p>
                <p className="text-sm text-gray-500">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <Check className="size-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-gray-500/10">
                <Clock className="size-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-sm text-gray-500">Draft</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="size-4 text-gray-500" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by property name or location..."
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as MemoStatus)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="review">Pending Review</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="updated-desc">Recently Updated</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Button */}
              {hasActiveFilters && (
                <Button variant="ghost" onClick={resetFilters} className="gap-2">
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading Properties Indicator */}
        {loadingProperties && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading property details...
          </div>
        )}

        {/* Memos List */}
        {filteredAndSortedMemos.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No memos match your filters" : "No memos yet"}
            description={
              hasActiveFilters
                ? "Try adjusting your filters or search terms."
                : "Investment memos will appear here when your realtor shares opportunities with you."
            }
            icon={<FileText className="size-5" />}
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  <RotateCcw className="mr-2 size-4" />
                  Reset Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4">
            {filteredAndSortedMemos.map((memo) => {
              const property = memo.listingId ? propertiesMap[memo.listingId] : null
              return (
                <MemoCard
                  key={memo.id}
                  memo={{
                    ...memo,
                    title: memo.title || memo.propertyTitle || "Untitled Memo",
                    investorName: "",
                    propertyId: memo.listingId || "",
                    propertyTitle: property?.title || memo.propertyTitle || "Property",
                    status: memo.state as "draft" | "review" | "approved" | "sent",
                  }}
                  property={property}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
