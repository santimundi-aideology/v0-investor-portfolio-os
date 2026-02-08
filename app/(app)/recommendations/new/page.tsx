"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Filter,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react"

import { RoleRedirect } from "@/components/security/role-redirect"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Investor, Property } from "@/lib/types"
import { useAPI } from "@/lib/hooks/use-api"
import { mapListingToProperty } from "@/lib/utils/map-listing"
import { createRecommendation } from "@/lib/recommendation-store"

/* ───────── helpers ───────── */

function formatPrice(value: number): string {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${Math.round(value).toLocaleString()}`
}

function mandateFitScore(property: Property, mandate: Investor["mandate"]): {
  score: number
  reasons: { label: string; met: boolean }[]
} {
  if (!mandate) return { score: 0, reasons: [] }
  const reasons: { label: string; met: boolean }[] = []

  // Area fit
  const areaMatch =
    mandate.preferredAreas?.length === 0 ||
    mandate.preferredAreas?.some((a) => property.area?.toLowerCase().includes(a.toLowerCase()))
  reasons.push({ label: `Area: ${property.area}`, met: !!areaMatch })

  // Type fit
  const typeMatch =
    mandate.propertyTypes?.length === 0 ||
    mandate.propertyTypes?.some((t) => property.type?.toLowerCase().includes(t.toLowerCase()))
  reasons.push({ label: `Type: ${property.type}`, met: !!typeMatch })

  // Budget fit
  const budgetMin = mandate.minInvestment ?? 0
  const budgetMax = mandate.maxInvestment ?? Infinity
  const inBudget = property.price >= budgetMin && property.price <= budgetMax
  reasons.push({
    label: `Budget: ${formatPrice(property.price)}`,
    met: inBudget,
  })

  const met = reasons.filter((r) => r.met).length
  const score = reasons.length > 0 ? Math.round((met / reasons.length) * 100) : 0
  return { score, reasons }
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200"
  return "text-red-700 bg-red-50 border-red-200"
}

/* ───────── types ───────── */

type AreaFilter = string
type TypeFilter = "residential" | "commercial" | "mixed-use" | "land"

/* ───────── main content ───────── */

function NewRecommendationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const investorId = searchParams.get("investorId")

  // Fetch investor
  const { data: investor, isLoading: investorLoading } = useAPI<Investor>(
    investorId ? `/api/investors/${investorId}` : null
  )

  // Fetch listings
  const { data: listingsData, isLoading: listingsLoading } = useAPI<Record<string, unknown>[]>("/api/listings")

  // Map to Property[]
  const allProperties = React.useMemo(() => {
    if (!listingsData) return []
    const arr = Array.isArray(listingsData) ? listingsData : []
    return arr.map((l) => mapListingToProperty(l as Record<string, unknown>))
  }, [listingsData])

  // Unique areas and types for filters
  const areas = React.useMemo(() => {
    const s = new Set<string>()
    allProperties.forEach((p) => {
      if (p.area) s.add(p.area)
    })
    return Array.from(s).sort()
  }, [allProperties])

  const propertyTypes = React.useMemo(() => {
    const s = new Set<TypeFilter>()
    allProperties.forEach((p) => {
      if (p.type) s.add(p.type as TypeFilter)
    })
    return Array.from(s).sort()
  }, [allProperties])

  // State
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [areaFilters, setAreaFilters] = React.useState<Set<AreaFilter>>(new Set())
  const [typeFilters, setTypeFilters] = React.useState<Set<TypeFilter>>(new Set())
  const [showFilters, setShowFilters] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<"fit" | "price_asc" | "price_desc">("fit")
  const [title, setTitle] = React.useState("")
  const [summary, setSummary] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [showMandatePanel, setShowMandatePanel] = React.useState(true)

  // Pre-populate area/type filters from mandate
  React.useEffect(() => {
    if (investor?.mandate) {
      if (investor.mandate.preferredAreas?.length) {
        setAreaFilters(new Set(investor.mandate.preferredAreas))
      }
      if (investor.mandate.propertyTypes?.length) {
        setTypeFilters(new Set(investor.mandate.propertyTypes as TypeFilter[]))
      }
    }
  }, [investor])

  // Filter & sort
  const filteredProperties = React.useMemo(() => {
    let list = allProperties.filter((p) => p.status === "available")

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.area?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q)
      )
    }
    if (areaFilters.size > 0) {
      list = list.filter((p) => areaFilters.has(p.area))
    }
    if (typeFilters.size > 0) {
      list = list.filter((p) => typeFilters.has(p.type as TypeFilter))
    }

    // Sort
    if (sortBy === "fit" && investor?.mandate) {
      list.sort((a, b) => {
        const sa = mandateFitScore(a, investor.mandate).score
        const sb = mandateFitScore(b, investor.mandate).score
        return sb - sa
      })
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price)
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price)
    }

    return list
  }, [allProperties, searchQuery, areaFilters, typeFilters, sortBy, investor])

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Create recommendation
  const handleCreate = () => {
    if (!investorId || selectedIds.size === 0) return
    setCreating(true)

    try {
      const rec = createRecommendation({
        investorId,
        createdByRole: "realtor",
        trigger: "manual",
        title: title || `Recommendation for ${investor?.name ?? "Investor"}`,
        summary: summary || undefined,
        propertyIds: Array.from(selectedIds),
        counterfactuals: [],
      })

      toast.success("Recommendation created", {
        description: `${selectedIds.size} properties selected. Opening recommendation...`,
      })

      router.push(`/recommendations/${rec.id}`)
    } catch {
      toast.error("Failed to create recommendation")
      setCreating(false)
    }
  }

  const selectedProperties = allProperties.filter((p) => selectedIds.has(p.id))
  const mandate = investor?.mandate

  if (!investorId) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Recommendation" subtitle="Select an investor to get started" />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <p>No investor specified. Please navigate from an investor profile.</p>
              <Button className="mt-4" asChild>
                <Link href="/investors">Go to Investors</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isLoading = investorLoading || listingsLoading

  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />

      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={investorId ? `/investors/${investorId}` : "/investors"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        <PageHeader
          title="New Recommendation"
          subtitle={
            investor ? (
              <span>
                Select properties to recommend to{" "}
                <Link href={`/investors/${investorId}`} className="font-medium underline underline-offset-4">
                  {investor.name}
                </Link>
              </span>
            ) : (
              "Loading investor..."
            )
          }
          primaryAction={
            <Button onClick={handleCreate} disabled={selectedIds.size === 0 || creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Create Recommendation ({selectedIds.size})
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* ─── Left column: Property browser ─── */}
            <div className="space-y-4">
              {/* Investor Mandate Context */}
              {mandate && (
                <Card className="border-primary/20 bg-primary/[0.02]">
                  <CardHeader className="pb-2">
                    <button
                      onClick={() => setShowMandatePanel(!showMandatePanel)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm">Investment Mandate</CardTitle>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          showMandatePanel && "rotate-180"
                        )}
                      />
                    </button>
                  </CardHeader>
                  {showMandatePanel && (
                    <CardContent className="pt-0">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-md border bg-background p-3">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Strategy
                          </div>
                          <div className="mt-1 text-sm font-semibold">{mandate.strategy}</div>
                        </div>
                        <div className="rounded-md border bg-background p-3">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Budget
                          </div>
                          <div className="mt-1 text-sm font-semibold">
                            {formatPrice(mandate.minInvestment)} – {formatPrice(mandate.maxInvestment)}
                          </div>
                        </div>
                        <div className="rounded-md border bg-background p-3">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Target Yield
                          </div>
                          <div className="mt-1 text-sm font-semibold">{mandate.yieldTarget}</div>
                        </div>
                        <div className="rounded-md border bg-background p-3">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Risk / Horizon
                          </div>
                          <div className="mt-1 text-sm font-semibold capitalize">
                            {mandate.riskTolerance} · {mandate.investmentHorizon}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {mandate.preferredAreas?.map((area) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            <MapPin className="mr-1 h-3 w-3" />
                            {area}
                          </Badge>
                        ))}
                        {mandate.propertyTypes?.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs capitalize">
                            <Building2 className="mr-1 h-3 w-3" />
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Search & filter bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {(areaFilters.size > 0 || typeFilters.size > 0) && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-[10px]">
                      {areaFilters.size + typeFilters.size}
                    </Badge>
                  )}
                </Button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="fit">Sort: Best fit</option>
                  <option value="price_asc">Sort: Price low → high</option>
                  <option value="price_desc">Sort: Price high → low</option>
                </select>
              </div>

              {/* Filter chips */}
              {showFilters && (
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Area
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {areas.map((area) => (
                          <button
                            key={area}
                            onClick={() => {
                              setAreaFilters((prev) => {
                                const next = new Set(prev)
                                if (next.has(area)) next.delete(area)
                                else next.add(area)
                                return next
                              })
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                              areaFilters.has(area)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted"
                            )}
                          >
                            {areaFilters.has(area) && <Check className="h-3 w-3" />}
                            {area}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Property Type
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {propertyTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setTypeFilters((prev) => {
                                const next = new Set(prev)
                                if (next.has(type)) next.delete(type)
                                else next.add(type)
                                return next
                              })
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors capitalize",
                              typeFilters.has(type)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted"
                            )}
                          >
                            {typeFilters.has(type) && <Check className="h-3 w-3" />}
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(areaFilters.size > 0 || typeFilters.size > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAreaFilters(new Set())
                          setTypeFilters(new Set())
                        }}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Clear all filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"} found
                {selectedIds.size > 0 && (
                  <span className="ml-2 font-medium text-primary">
                    · {selectedIds.size} selected
                  </span>
                )}
              </div>

              {/* Property list */}
              <div className="space-y-3">
                {filteredProperties.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Search className="mx-auto h-10 w-10 text-muted-foreground/30" />
                      <h3 className="mt-4 text-sm font-semibold">No properties match</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try adjusting your search or filter criteria.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredProperties.map((property) => {
                    const isSelected = selectedIds.has(property.id)
                    const fit = mandate ? mandateFitScore(property, mandate) : null

                    return (
                      <Card
                        key={property.id}
                        className={cn(
                          "transition-all cursor-pointer hover:shadow-md",
                          isSelected && "ring-2 ring-primary shadow-md"
                        )}
                        onClick={() => toggleSelect(property.id)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <div className="pt-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(property.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {/* Property info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm truncate">
                                      {property.title}
                                    </h4>
                                    {property.readinessStatus === "READY_FOR_MEMO" && (
                                      <Badge
                                        variant="outline"
                                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                      >
                                        Ready for memo
                                      </Badge>
                                    )}
                                    {property.readinessStatus === "NEEDS_VERIFICATION" && (
                                      <Badge
                                        variant="outline"
                                        className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                                      >
                                        Needs verification
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {property.area}
                                    </span>
                                    <span>·</span>
                                    <span className="capitalize">{property.type}</span>
                                    {property.bedrooms && (
                                      <>
                                        <span>·</span>
                                        <span>{property.bedrooms} bed</span>
                                      </>
                                    )}
                                    {property.size > 0 && (
                                      <>
                                        <span>·</span>
                                        <span>{property.size.toLocaleString()} sqft</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-sm font-bold">{formatPrice(property.price)}</div>
                                  {property.size > 0 && (
                                    <div className="text-[11px] text-muted-foreground">
                                      {formatPrice(Math.round(property.price / property.size))}/sqft
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Mandate fit */}
                              {fit && (
                                <div className="mt-3 flex items-center gap-3">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs font-semibold", scoreColor(fit.score))}
                                  >
                                    {fit.score}% fit
                                  </Badge>
                                  <div className="flex flex-wrap gap-1.5">
                                    {fit.reasons.map((r) => (
                                      <span
                                        key={r.label}
                                        className={cn(
                                          "inline-flex items-center gap-1 text-[11px]",
                                          r.met ? "text-emerald-600" : "text-red-500"
                                        )}
                                      >
                                        {r.met ? (
                                          <CheckCircle2 className="h-3 w-3" />
                                        ) : (
                                          <Minus className="h-3 w-3" />
                                        )}
                                        {r.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>

            {/* ─── Right column: Selection summary ─── */}
            <div className="space-y-4">
              <div className="sticky top-4 space-y-4">
                {/* Selected properties */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Selected Properties
                      <Badge variant="secondary" className="text-xs">
                        {selectedIds.size}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Click properties in the list to add or remove them.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedProperties.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed p-6 text-center">
                        <Plus className="mx-auto h-6 w-6 text-muted-foreground/40" />
                        <p className="mt-2 text-xs text-muted-foreground">
                          No properties selected yet
                        </p>
                      </div>
                    ) : (
                      <>
                        {selectedProperties.map((p) => {
                          const fit = mandate ? mandateFitScore(p, mandate) : null
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-2 rounded-md border p-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{p.title}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {p.area} · {formatPrice(p.price)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {fit && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] font-semibold",
                                      scoreColor(fit.score)
                                    )}
                                  >
                                    {fit.score}%
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleSelect(p.id)
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span className="sr-only">Remove</span>
                                </Button>
                              </div>
                            </div>
                          )
                        })}

                        {/* Portfolio value summary */}
                        <Separator className="my-2" />
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total value</span>
                          <span className="font-semibold">
                            {formatPrice(selectedProperties.reduce((s, p) => s + p.price, 0))}
                          </span>
                        </div>
                        {mandate && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Avg. mandate fit</span>
                            <span className="font-semibold">
                              {Math.round(
                                selectedProperties.reduce(
                                  (s, p) => s + mandateFitScore(p, mandate).score,
                                  0
                                ) / selectedProperties.length
                              )}
                              %
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Recommendation details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recommendation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <Input
                        placeholder={`Recommendation for ${investor?.name ?? "Investor"}`}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Summary (optional)
                      </label>
                      <Textarea
                        placeholder="Brief narrative explaining why these properties were chosen..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Create button */}
                <Button
                  onClick={handleCreate}
                  disabled={selectedIds.size === 0 || creating}
                  className="w-full"
                  size="lg"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Create Recommendation ({selectedIds.size})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function NewRecommendationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <NewRecommendationContent />
    </Suspense>
  )
}
