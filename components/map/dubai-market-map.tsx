"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Building2, Home, Landmark, MapPin, TrendingUp, DollarSign, Loader2, X, Calendar, Ruler, Car, MapPinned, Filter, ChevronDown, ChevronUp, Search, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollAreaViewport } from "@/components/ui/scroll-area"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Types
interface MapFeature {
  type: "Feature"
  geometry: {
    type: "Point"
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    id?: string
    area_name?: string
    area?: string
    transaction_count?: number
    avg_price?: number
    avg_price_per_sqm?: number
    total_volume?: number
    price_aed?: number
    price_per_sqm?: number
    property_type?: string
    building?: string
    project?: string
    rooms?: string
    size_sqm?: number
    date?: string
    signal_type?: string
    title?: string
    description?: string
    severity?: string
  }
}

interface MapData {
  type: "FeatureCollection"
  features: MapFeature[]
  metadata?: {
    total?: number
    total_areas?: number
  }
}

type ViewMode = "heatmap" | "markers" | "signals"

// Dubai center coordinates
const DUBAI_CENTER: [number, number] = [25.2048, 55.2708] // [lat, lng] for Leaflet

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `AED ${(price / 1000000).toFixed(1)}M`
  }
  if (price >= 1000) {
    return `AED ${(price / 1000).toFixed(0)}K`
  }
  return `AED ${price.toFixed(0)}`
}

function getMarkerColor(avgPrice: number): string {
  if (avgPrice >= 5000000) return "#ef4444" // red - luxury
  if (avgPrice >= 2000000) return "#f97316" // orange - premium
  if (avgPrice >= 1000000) return "#eab308" // yellow - mid-high
  return "#22c55e" // green - affordable
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "alert":
      return "#ef4444"
    case "opportunity":
      return "#22c55e"
    case "warning":
      return "#eab308"
    default:
      return "#3b82f6"
  }
}

// Dynamically import the Leaflet map to avoid SSR issues
const LeafletMap = dynamic(
  () => import("./leaflet-map-inner").then((mod) => mod.LeafletMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface SignalDetail {
  signal: MapFeature["properties"] & { id?: string }
  area_statistics: {
    total_transactions: number
    property_types: Record<string, number>
    room_distribution: Record<string, number>
    price_range: { min: number; max: number }
    avg_price: number
    avg_price_per_sqm: number
  }
  recent_transactions: Array<{
    transaction_id: string
    instance_date: string
    property_type_en: string
    property_sub_type_en?: string
    building_name_en?: string
    project_name_en?: string
    master_project_en?: string
    rooms_en?: string
    has_parking: boolean
    procedure_area?: number
    actual_worth: number
    meter_sale_price?: number
    nearest_landmark_en?: string
    nearest_metro_en?: string
    nearest_mall_en?: string
  }>
}

// Filter types
interface Filters {
  // Common filters
  propertyType: string
  priceRange: string
  areaSearch: string
  // Date filters
  fromDate: string
  toDate: string
  // Transaction-specific
  rooms: string
  // Signal-specific
  signalType: string
  severity: string
}

const defaultFilters: Filters = {
  propertyType: "all",
  priceRange: "all",
  areaSearch: "",
  fromDate: "",
  toDate: "",
  rooms: "all",
  signalType: "all",
  severity: "all",
}

export function DubaiMarketMap() {
  const [viewMode, setViewMode] = React.useState<ViewMode>("heatmap")
  const [filters, setFilters] = React.useState<Filters>(defaultFilters)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [data, setData] = React.useState<MapData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedSignalId, setSelectedSignalId] = React.useState<string | null>(null)
  const [signalDetail, setSignalDetail] = React.useState<SignalDetail | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (filters.propertyType !== "all") count++
    if (filters.priceRange !== "all") count++
    if (filters.areaSearch) count++
    if (filters.fromDate) count++
    if (filters.toDate) count++
    if (filters.rooms !== "all") count++
    if (filters.signalType !== "all") count++
    if (filters.severity !== "all") count++
    return count
  }, [filters])

  // Update a single filter
  const updateFilter = React.useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Reset all filters
  const resetFilters = React.useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  // Fetch data based on view mode and filters
  React.useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        let url: string
        const params = new URLSearchParams()

        if (viewMode === "signals") {
          // Signal filters
          if (filters.signalType !== "all") {
            params.set("type", filters.signalType)
          }
          if (filters.severity !== "all") {
            params.set("severity", filters.severity)
          }
          if (filters.areaSearch) {
            params.set("area", filters.areaSearch)
          }
          params.set("limit", "100")
          url = `/api/dld/signals?${params.toString()}`
        } else if (viewMode === "heatmap") {
          // Heatmap (aggregated) filters
          params.set("aggregate", "true")
          if (filters.propertyType !== "all") {
            params.set("property_type", filters.propertyType)
          }
          if (filters.priceRange !== "all") {
            const [min, max] = filters.priceRange.split("-")
            if (min) params.set("min_price", min)
            if (max) params.set("max_price", max)
          }
          if (filters.fromDate) {
            params.set("from_date", filters.fromDate)
          }
          if (filters.toDate) {
            params.set("to_date", filters.toDate)
          }
          if (filters.areaSearch) {
            params.set("area", filters.areaSearch)
          }
          url = `/api/dld/map?${params.toString()}`
        } else {
          // Transaction markers filters
          params.set("limit", "500")
          if (filters.propertyType !== "all") {
            params.set("property_type", filters.propertyType)
          }
          if (filters.priceRange !== "all") {
            const [min, max] = filters.priceRange.split("-")
            if (min) params.set("min_price", min)
            if (max) params.set("max_price", max)
          }
          if (filters.fromDate) {
            params.set("from_date", filters.fromDate)
          }
          if (filters.toDate) {
            params.set("to_date", filters.toDate)
          }
          if (filters.areaSearch) {
            params.set("area", filters.areaSearch)
          }
          url = `/api/dld/map?${params.toString()}`
        }

        const res = await fetch(url)
        if (!res.ok) throw new Error("Failed to fetch map data")

        const json = await res.json()

        // Transform signals data to GeoJSON if needed
        if (viewMode === "signals" && json.signals) {
          const features = json.signals
            .filter((s: Record<string, unknown>) => s.latitude && s.longitude)
            .map((s: Record<string, unknown>) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [parseFloat(s.longitude as string), parseFloat(s.latitude as string)],
              },
              properties: {
                id: s.id,
                signal_type: s.signal_type,
                title: s.title,
                description: s.description,
                severity: s.severity,
                area_name: s.area_name_en,
                ...(s.metrics as object || {}),
              },
            }))

          setData({
            type: "FeatureCollection",
            features,
            metadata: { total: features.length },
          })
        } else {
          // Apply client-side room filter for transactions (API doesn't support room filtering)
          if (viewMode === "markers" && filters.rooms !== "all" && json.features) {
            json.features = json.features.filter((f: MapFeature) => {
              const rooms = f.properties.rooms?.toLowerCase() || ""
              if (filters.rooms === "studio") return rooms.includes("studio")
              if (filters.rooms === "1br") return rooms.includes("1 b/r") || rooms.includes("1br")
              if (filters.rooms === "2br") return rooms.includes("2 b/r") || rooms.includes("2br")
              if (filters.rooms === "3br") return rooms.includes("3 b/r") || rooms.includes("3br")
              if (filters.rooms === "4plus") {
                return rooms.includes("4 b/r") || rooms.includes("5 b/r") || 
                       rooms.includes("4br") || rooms.includes("5br") ||
                       rooms.includes("6") || rooms.includes("7")
              }
              return true
            })
            json.metadata = { ...json.metadata, total: json.features.length }
          }
          
          setData(json)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [viewMode, filters])

  // Fetch signal detail when selected
  React.useEffect(() => {
    if (!selectedSignalId) {
      setSignalDetail(null)
      return
    }

    async function fetchDetail() {
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/dld/signals/${selectedSignalId}`)
        if (res.ok) {
          const detail = await res.json()
          setSignalDetail(detail)
        }
      } catch (err) {
        console.error("Failed to fetch signal detail:", err)
      } finally {
        setDetailLoading(false)
      }
    }

    fetchDetail()
  }, [selectedSignalId])

  // Handler for signal click from map
  const handleSignalClick = React.useCallback((signalId: string) => {
    setSelectedSignalId(signalId)
  }, [])

  return (
    <div className="space-y-4">
      {/* View Mode Toggle & Filter Button */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "heatmap" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("heatmap")}
            className={cn(viewMode === "heatmap" && "bg-green-500 hover:bg-green-600 text-white")}
          >
            <MapPin className="h-4 w-4 mr-1" />
            Areas
          </Button>
          <Button
            variant={viewMode === "markers" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("markers")}
            className={cn(viewMode === "markers" && "bg-green-500 hover:bg-green-600 text-white")}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Transactions
          </Button>
          <Button
            variant={viewMode === "signals" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("signals")}
            className={cn(viewMode === "signals" && "bg-green-500 hover:bg-green-600 text-white")}
          >
            <Landmark className="h-4 w-4 mr-1" />
            Signals
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}

        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

        {data?.metadata && (
          <Badge variant="outline" className="ml-auto">
            {data.metadata.total_areas || data.metadata.total || data.features?.length || 0}{" "}
            {viewMode === "heatmap" ? "areas" : viewMode === "signals" ? "signals" : "transactions"}
          </Badge>
        )}
      </div>

      {/* Collapsible Filter Panel */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Area Search - Available for all modes */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Area Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search area..."
                      value={filters.areaSearch}
                      onChange={(e) => updateFilter("areaSearch", e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>

                {/* Property Type - For heatmap & markers */}
                {(viewMode === "heatmap" || viewMode === "markers") && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Property Type</Label>
                    <Select value={filters.propertyType} onValueChange={(v) => updateFilter("propertyType", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Unit">Unit</SelectItem>
                        <SelectItem value="Villa">Villa</SelectItem>
                        <SelectItem value="Building">Building</SelectItem>
                        <SelectItem value="Land">Land</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Price Range - For heatmap & markers */}
                {(viewMode === "heatmap" || viewMode === "markers") && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Price Range</Label>
                    <Select value={filters.priceRange} onValueChange={(v) => updateFilter("priceRange", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Prices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="0-1000000">Under AED 1M</SelectItem>
                        <SelectItem value="1000000-3000000">AED 1M - 3M</SelectItem>
                        <SelectItem value="3000000-5000000">AED 3M - 5M</SelectItem>
                        <SelectItem value="5000000-10000000">AED 5M - 10M</SelectItem>
                        <SelectItem value="10000000-">Above AED 10M</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Rooms - For markers only */}
                {viewMode === "markers" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                    <Select value={filters.rooms} onValueChange={(v) => updateFilter("rooms", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Rooms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Rooms</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="1br">1 Bedroom</SelectItem>
                        <SelectItem value="2br">2 Bedrooms</SelectItem>
                        <SelectItem value="3br">3 Bedrooms</SelectItem>
                        <SelectItem value="4plus">4+ Bedrooms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date From - For heatmap & markers */}
                {(viewMode === "heatmap" || viewMode === "markers") && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">From Date</Label>
                    <Input
                      type="date"
                      value={filters.fromDate}
                      onChange={(e) => updateFilter("fromDate", e.target.value)}
                      className="h-9"
                    />
                  </div>
                )}

                {/* Date To - For heatmap & markers */}
                {(viewMode === "heatmap" || viewMode === "markers") && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">To Date</Label>
                    <Input
                      type="date"
                      value={filters.toDate}
                      onChange={(e) => updateFilter("toDate", e.target.value)}
                      className="h-9"
                    />
                  </div>
                )}

                {/* Signal Type - For signals only */}
                {viewMode === "signals" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Signal Type</Label>
                    <Select value={filters.signalType} onValueChange={(v) => updateFilter("signalType", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="area_hot">Hot Area</SelectItem>
                        <SelectItem value="premium_area">Premium Area</SelectItem>
                        <SelectItem value="high_value_sale">High Value Sale</SelectItem>
                        <SelectItem value="value_opportunity">Value Opportunity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Severity - For signals only */}
                {viewMode === "signals" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Severity</Label>
                    <Select value={filters.severity} onValueChange={(v) => updateFilter("severity", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="opportunity">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Opportunity
                          </span>
                        </SelectItem>
                        <SelectItem value="alert">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Alert
                          </span>
                        </SelectItem>
                        <SelectItem value="warning">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            Warning
                          </span>
                        </SelectItem>
                        <SelectItem value="info">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Info
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Active Filters Summary */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">Active filters:</span>
                  {filters.areaSearch && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Area: {filters.areaSearch}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("areaSearch", "")} />
                    </Badge>
                  )}
                  {filters.propertyType !== "all" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Type: {filters.propertyType}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("propertyType", "all")} />
                    </Badge>
                  )}
                  {filters.priceRange !== "all" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Price: {filters.priceRange.replace("-", " - ")}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("priceRange", "all")} />
                    </Badge>
                  )}
                  {filters.rooms !== "all" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Rooms: {filters.rooms}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("rooms", "all")} />
                    </Badge>
                  )}
                  {filters.fromDate && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      From: {filters.fromDate}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("fromDate", "")} />
                    </Badge>
                  )}
                  {filters.toDate && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      To: {filters.toDate}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("toDate", "")} />
                    </Badge>
                  )}
                  {filters.signalType !== "all" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Signal: {filters.signalType.replace("_", " ")}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("signalType", "all")} />
                    </Badge>
                  )}
                  {filters.severity !== "all" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Severity: {filters.severity}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("severity", "all")} />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="h-[600px] relative">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            <LeafletMap
              data={data}
              viewMode={viewMode}
              center={DUBAI_CENTER}
              zoom={11}
              onSignalClick={handleSignalClick}
            />
          )}
        </div>
      </Card>

      {/* Signal Detail Sheet */}
      <Sheet open={!!selectedSignalId} onOpenChange={(open) => !open && setSelectedSignalId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden p-0 h-[100dvh] max-h-[100dvh] flex flex-col">
          <div className="border-b bg-background/95 backdrop-blur px-6 py-4">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <MapPinned className="h-5 w-5 text-green-500" />
                {signalDetail?.signal?.area_name_en || "Signal Details"}
              </SheetTitle>
            </SheetHeader>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : signalDetail?.signal ? (
            <ScrollArea className="flex-1">
              <ScrollAreaViewport className="px-6 py-4">
                <div className="space-y-6">
                {/* Signal Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{signalDetail.signal.title || "Signal Details"}</h3>
                  {signalDetail.signal.description && (
                    <p className="text-sm text-muted-foreground">{signalDetail.signal.description}</p>
                  )}
                  {signalDetail.signal.area_name_en && (
                    <p className="text-sm font-medium">{signalDetail.signal.area_name_en}</p>
                  )}
                  <Badge className={cn(
                    "mt-2",
                    signalDetail.signal.severity === "opportunity" && "bg-green-500",
                    signalDetail.signal.severity === "alert" && "bg-red-500",
                    signalDetail.signal.severity === "warning" && "bg-yellow-500",
                    signalDetail.signal.severity === "info" && "bg-blue-500"
                  )}>
                    {signalDetail.signal.severity || "info"}
                  </Badge>
                </div>

                {/* Area Statistics - only show if we have data */}
                {signalDetail.area_statistics && signalDetail.area_statistics.total_transactions > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Area Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Transactions</p>
                          <p className="font-semibold text-lg">
                            {signalDetail.area_statistics.total_transactions?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Price</p>
                          <p className="font-semibold text-lg text-green-600">
                            {formatPrice(signalDetail.area_statistics.avg_price || 0)}
                          </p>
                        </div>
                        {signalDetail.area_statistics.avg_price_per_sqm > 0 && (
                          <div>
                            <p className="text-muted-foreground">Price/sqm</p>
                            <p className="font-semibold">
                              AED {signalDetail.area_statistics.avg_price_per_sqm?.toLocaleString() || 0}
                            </p>
                          </div>
                        )}
                        {signalDetail.area_statistics.price_range && signalDetail.area_statistics.price_range.max > 0 && (
                          <div>
                            <p className="text-muted-foreground">Price Range</p>
                            <p className="font-semibold text-xs">
                              {formatPrice(signalDetail.area_statistics.price_range.min || 0)} - {formatPrice(signalDetail.area_statistics.price_range.max || 0)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Property Types */}
                      {signalDetail.area_statistics.property_types && Object.keys(signalDetail.area_statistics.property_types).length > 0 && (
                        <div>
                          <p className="text-muted-foreground text-sm mb-2">Property Types</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(signalDetail.area_statistics.property_types)
                              .sort((a, b) => (b[1] as number) - (a[1] as number))
                              .slice(0, 4)
                              .map(([type, count]) => (
                                <Badge key={type} variant="outline">
                                  {type}: {count as number}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Room Distribution */}
                      {signalDetail.area_statistics.room_distribution && Object.keys(signalDetail.area_statistics.room_distribution).length > 0 && (
                        <div>
                          <p className="text-muted-foreground text-sm mb-2">Room Distribution</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(signalDetail.area_statistics.room_distribution)
                              .sort((a, b) => (b[1] as number) - (a[1] as number))
                              .slice(0, 5)
                              .map(([rooms, count]) => (
                                <Badge key={rooms} variant="secondary">
                                  {rooms}: {count as number}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* No statistics available message */}
                {(!signalDetail.area_statistics || signalDetail.area_statistics.total_transactions === 0) && (
                  <Card>
                    <CardContent className="py-6">
                      <p className="text-sm text-muted-foreground text-center">
                        No transaction statistics available for this area.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Transactions */}
                {signalDetail.recent_transactions && signalDetail.recent_transactions.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-3">
                        {signalDetail.recent_transactions.map((tx) => (
                          <div key={tx.transaction_id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">
                                  {tx.property_type_en || "Property"}
                                  {tx.property_sub_type_en && ` - ${tx.property_sub_type_en}`}
                                </p>
                                {tx.building_name_en && (
                                  <p className="text-sm text-muted-foreground">{tx.building_name_en}</p>
                                )}
                                {tx.project_name_en && (
                                  <p className="text-xs text-muted-foreground">{tx.project_name_en}</p>
                                )}
                              </div>
                              <p className="font-bold text-green-600">{formatPrice(tx.actual_worth || 0)}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {tx.instance_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {tx.instance_date}
                                </span>
                              )}
                              {tx.procedure_area && (
                                <span className="flex items-center gap-1">
                                  <Ruler className="h-3 w-3" />
                                  {Math.round(tx.procedure_area)} sqm
                                </span>
                              )}
                              {tx.rooms_en && (
                                <span className="flex items-center gap-1">
                                  <Home className="h-3 w-3" />
                                  {tx.rooms_en}
                                </span>
                              )}
                              {tx.has_parking && (
                                <span className="flex items-center gap-1">
                                  <Car className="h-3 w-3" />
                                  Parking
                                </span>
                              )}
                            </div>

                            {tx.meter_sale_price && (
                              <p className="text-xs">
                                <span className="text-muted-foreground">Price/sqm:</span>{" "}
                                <span className="font-medium">AED {Math.round(tx.meter_sale_price).toLocaleString()}</span>
                              </p>
                            )}

                            {(tx.nearest_metro_en || tx.nearest_mall_en) && (
                              <div className="text-xs text-muted-foreground">
                                {tx.nearest_metro_en && <p>Near: {tx.nearest_metro_en}</p>}
                                {tx.nearest_mall_en && <p>Mall: {tx.nearest_mall_en}</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* No transactions message */}
                {(!signalDetail.recent_transactions || signalDetail.recent_transactions.length === 0) && (
                  <Card>
                    <CardContent className="py-6">
                      <p className="text-sm text-muted-foreground text-center">
                        No recent transactions found for this area.
                      </p>
                    </CardContent>
                  </Card>
                )}
                </div>
              </ScrollAreaViewport>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No details available</p>
              <p className="text-xs text-muted-foreground mt-2">The signal data could not be loaded.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Legend */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Legend</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-4 text-sm">
            {viewMode === "signals" ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>High Value Sale</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Opportunity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Premium Area</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Value Opportunity</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Under AED 1M</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>AED 1M - 2M</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>AED 2M - 5M</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Above AED 5M</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Export helpers for the inner component
export { formatPrice, getMarkerColor, getSeverityColor }
export type { MapFeature, MapData, ViewMode }

// Export handler type
export type OnSignalClick = (signalId: string) => void
