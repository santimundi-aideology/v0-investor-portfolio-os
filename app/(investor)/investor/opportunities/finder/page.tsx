"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Search,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  Sparkles,
  Plus,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"

type ListingItem = {
  portal?: string
  title?: string
  listing_id?: string
  listing_url?: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  size_sqm?: number | null
  area_name?: string | null
  building_name?: string | null
  asking_price?: number | null
  price_per_sqm?: number | null
  photos?: string[]
}

type SearchResponse = {
  location?: { id: number; name: string; coordinates?: { lat: number; lng: number } }
  total?: number
  page?: number
  listings?: ListingItem[]
  error?: string
}

type AIParseFilters = {
  area?: string
  purpose?: "for-sale" | "for-rent"
  bedrooms?: number
  bathrooms?: number
  priceMin?: number
  priceMax?: number
  areaMin?: number
  areaMax?: number
  propertyType?: string
  sort?: "date_desc" | "price_asc" | "price_desc"
}

const AREA_SUGGESTIONS = [
  "Dubai Marina",
  "Palm Jumeirah",
  "Downtown Dubai",
  "JBR",
  "Business Bay",
  "Arabian Ranches",
  "Dubai Hills",
  "Jumeirah",
]

const PROPERTY_TYPES = [
  { value: "", label: "Any" },
  { value: "Apartment", label: "Apartment" },
  { value: "Villa", label: "Villa" },
  { value: "Townhouse", label: "Townhouse" },
  { value: "Penthouse", label: "Penthouse" },
  { value: "Studio", label: "Studio" },
]

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
]

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M AED`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K AED`
  return `${value} AED`
}

export default function OpportunityFinderPage() {
  const [area, setArea] = React.useState("Dubai Marina")
  const [purpose, setPurpose] = React.useState<"for-sale" | "for-rent">("for-sale")
  const [bedrooms, setBedrooms] = React.useState("")
  const [priceMin, setPriceMin] = React.useState("")
  const [priceMax, setPriceMax] = React.useState("")
  const [showMoreFilters, setShowMoreFilters] = React.useState(false)
  const [propertyType, setPropertyType] = React.useState("")
  const [bathrooms, setBathrooms] = React.useState("")
  const [areaMin, setAreaMin] = React.useState("")
  const [areaMax, setAreaMax] = React.useState("")
  const [sort, setSort] = React.useState("date_desc")
  const [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<SearchResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)

  const [aiMode, setAiMode] = React.useState(false)
  const [aiQuery, setAiQuery] = React.useState("")
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)

  const applyAIFilters = React.useCallback((f: AIParseFilters) => {
    if (f.area) setArea(f.area)
    if (f.purpose) setPurpose(f.purpose)
    if (f.bedrooms != null) setBedrooms(String(f.bedrooms))
    if (f.bathrooms != null) setBathrooms(String(f.bathrooms))
    if (f.priceMin != null) setPriceMin(String(f.priceMin))
    if (f.priceMax != null) setPriceMax(String(f.priceMax))
    if (f.areaMin != null) setAreaMin(String(f.areaMin))
    if (f.areaMax != null) setAreaMax(String(f.areaMax))
    if (f.propertyType) setPropertyType(f.propertyType)
    if (f.sort) setSort(f.sort)
  }, [])

  const runAIParse = React.useCallback(async () => {
    const q = aiQuery.trim()
    if (!q || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch("/api/investor/opportunity-finder/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAiError(json.error || "Failed to parse")
        return
      }
      const filters = json.filters as AIParseFilters
      applyAIFilters(filters)
      setAiQuery("")
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to parse")
    } finally {
      setAiLoading(false)
    }
  }, [aiQuery, aiLoading, applyAIFilters])

  const search = React.useCallback(async () => {
    setLoading(true)
    setSearched(true)
    setData(null)
    try {
      const params = new URLSearchParams()
      params.set("area", area)
      params.set("purpose", purpose)
      if (bedrooms) params.set("bedrooms", bedrooms)
      if (bathrooms) params.set("bathrooms", bathrooms)
      if (priceMin) params.set("price_min", priceMin)
      if (priceMax) params.set("price_max", priceMax)
      if (areaMin) params.set("area_min", areaMin)
      if (areaMax) params.set("area_max", areaMax)
      if (propertyType) params.set("property_type", propertyType)
      params.set("sort", sort)
      params.set("page", String(page))
      const res = await fetch(`/api/bayut?${params}`)
      const json = await res.json()
      if (!res.ok) {
        setData({ error: json.error || "Search failed" })
        return
      }
      setData(json)
    } catch (err) {
      setData({ error: err instanceof Error ? err.message : "Failed to search" })
    } finally {
      setLoading(false)
    }
  }, [area, purpose, bedrooms, bathrooms, priceMin, priceMax, areaMin, areaMax, propertyType, sort, page])

  React.useEffect(() => {
    if (searched) search()
  }, [searched, page, search])

  const rawListings = data?.listings ?? []
  const listings = React.useMemo(() => {
    if (!bathrooms) return rawListings
    const n = parseInt(bathrooms, 10)
    if (!Number.isFinite(n)) return rawListings
    return rawListings.filter((l) => l.bathrooms != null && l.bathrooms >= n)
  }, [rawListings, bathrooms])

  const total = data?.total ?? 0
  const currentPage = data?.page ?? 1

  const doSearch = () => {
    setPage(1)
    setSearched(true)
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/opportunities">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Search className="size-5 text-primary" />
                Opportunity Finder
              </h1>
              <p className="text-sm text-muted-foreground">
                Search Dubai and UAE property listings. Use filters or AI to find opportunities.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* AI search (optional) */}
        <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-600" />
                <Label htmlFor="ai-mode" className="font-medium">
                  AI search — describe what you want
                </Label>
              </div>
              <Switch id="ai-mode" checked={aiMode} onCheckedChange={setAiMode} />
            </div>
            {aiMode && (
              <div className="mt-4 flex flex-col gap-2">
                <Input
                  placeholder='e.g. "2 bed apartment in Dubai Marina under 2M AED"'
                  value={aiQuery}
                  onChange={(e) => {
                    setAiQuery(e.target.value)
                    setAiError(null)
                  }}
                  onKeyDown={(e) => e.key === "Enter" && runAIParse()}
                  className="bg-white"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={runAIParse}
                    disabled={!aiQuery.trim() || aiLoading}
                    className="gap-1.5"
                  >
                    {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Apply AI filters
                  </Button>
                  {aiError && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">{aiError}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  placeholder="e.g. Dubai Marina"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  list="area-suggestions"
                />
                <datalist id="area-suggestions">
                  {AREA_SUGGESTIONS.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Select value={purpose} onValueChange={(v: "for-sale" | "for-rent") => setPurpose(v)}>
                  <SelectTrigger id="purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for-sale">For sale</SelectItem>
                    <SelectItem value="for-rent">For rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Select value={bedrooms || "any"} onValueChange={(v) => setBedrooms(v === "any" ? "" : v)}>
                  <SelectTrigger id="bedrooms">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} BR
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-min">Min price (AED)</Label>
                <Input
                  id="price-min"
                  type="number"
                  placeholder="e.g. 1000000"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-max">Max price (AED)</Label>
                <Input
                  id="price-max"
                  type="number"
                  placeholder="e.g. 3000000"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* Add more filters (collapsible) */}
            <Collapsible open={showMoreFilters} onOpenChange={setShowMoreFilters}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 gap-2 text-muted-foreground hover:text-foreground"
                >
                  {showMoreFilters ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  <Plus className="size-4" />
                  Add more filters
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="property-type">Property type</Label>
                    <Select value={propertyType || "any"} onValueChange={(v) => setPropertyType(v === "any" ? "" : v)}>
                      <SelectTrigger id="property-type">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((p) => (
                          <SelectItem key={p.value || "any"} value={p.value || "any"}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Select value={bathrooms || "any"} onValueChange={(v) => setBathrooms(v === "any" ? "" : v)}>
                      <SelectTrigger id="bathrooms">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} BA
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area-min">Min size (m²)</Label>
                    <Input
                      id="area-min"
                      type="number"
                      placeholder="e.g. 80"
                      value={areaMin}
                      onChange={(e) => setAreaMin(e.target.value)}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area-max">Max size (m²)</Label>
                    <Input
                      id="area-max"
                      type="number"
                      placeholder="e.g. 200"
                      value={areaMax}
                      onChange={(e) => setAreaMax(e.target.value)}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort">Sort by</Label>
                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger id="sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button onClick={doSearch} disabled={loading} className="mt-4 gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Search
            </Button>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Searching Dubai listings...</p>
          </div>
        )}

        {/* Error */}
        {data?.error && !loading && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="py-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">{data.error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Try a different area or check your connection.
              </p>
            </CardContent>
          </Card>
        )}

        {/* No results */}
        {!loading && searched && !data?.error && listings.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No listings found. Try adjusting filters or add more filters.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!loading && listings.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {total} result{total !== 1 ? "s" : ""} in {data?.location?.name ?? area}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing, idx) => (
                <Card key={listing.listing_id ?? idx} className="overflow-hidden">
                  <div className="relative aspect-[4/3] bg-muted">
                    {listing.photos?.[0] ? (
                      <img
                        src={listing.photos[0]}
                        alt={listing.title ?? listing.property_type ?? "Property"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Maximize2 className="size-12" />
                      </div>
                    )}
                    <Badge className="absolute left-2 top-2">{listing.property_type ?? "Property"}</Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2">
                      {listing.title ??
                        `${listing.property_type ?? "Property"} in ${listing.area_name ?? "Dubai"}`}
                    </h3>
                    {listing.area_name && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {listing.area_name}
                        {listing.building_name ? ` · ${listing.building_name}` : ""}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {listing.bedrooms != null && (
                        <span className="flex items-center gap-1">
                          <BedDouble className="size-3.5" />
                          {listing.bedrooms} BR
                        </span>
                      )}
                      {listing.bathrooms != null && (
                        <span className="flex items-center gap-1">
                          <Bath className="size-3.5" />
                          {listing.bathrooms} BA
                        </span>
                      )}
                      {listing.size_sqm != null && <span>{listing.size_sqm} m²</span>}
                    </div>
                    <p className="mt-2 font-semibold text-primary">
                      {formatPrice(listing.asking_price ?? undefined)}
                    </p>
                    {listing.listing_url && (
                      <a
                        href={listing.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline"
                      >
                        View on Bayut
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {total > listings.length && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={listings.length < 20}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Initial state */}
        {!searched && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Search className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                Set filters and click Search, or use AI search to describe what you want.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
