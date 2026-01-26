"use client"

import { useMemo, useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Building2, MapPin, TrendingUp, Plus, LayoutGrid, List } from "lucide-react"
import Link from "next/link"
import { mockProperties, currentUser } from "@/lib/mock-data"
import "@/lib/init-property-store"
import { getAllProperties } from "@/lib/property-store"
import type { Property, PropertyReadinessStatus } from "@/lib/types"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { PropertyCard } from "./property-card"
import { PropertyStatsBanner } from "./property-stats-banner"
import { cn } from "@/lib/utils"
import { PropertyShareDialog } from "@/components/properties/property-share-dialog"

const statusColors: Record<Property["status"], string> = {
  available: "bg-green-50 text-green-600 border-green-200",
  "under-offer": "bg-amber-50 text-amber-600 border-amber-200",
  sold: "bg-gray-100 text-gray-500",
  "off-market": "bg-gray-100 text-gray-500",
}

const readinessStatusColors: Record<PropertyReadinessStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  NEEDS_VERIFICATION: "bg-amber-50 text-amber-600 border-amber-200",
  READY_FOR_MEMO: "bg-green-50 text-green-600 border-green-200",
}

const typeLabels: Record<Property["type"], string> = {
  residential: "Residential",
  commercial: "Commercial",
  "mixed-use": "Mixed-Use",
  land: "Land",
}

function formatPrice(price: number, listingType: "sale" | "rent" = "sale"): string {
  const formatted =
    price >= 1000000 ? `AED ${(price / 1000000).toFixed(1)}M` : `AED ${(price / 1000).toFixed(0)}K`
  return listingType === "rent" ? `${formatted}/yr` : formatted
}

function isNewListing(createdAt: string) {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30
  return created >= Date.now() - THIRTY_DAYS
}

type ViewMode = "table" | "grid"

export function PropertiesContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [areaFilter, setAreaFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [listingFilter, setListingFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [shareTarget, setShareTarget] = useState<Property | null>(null)

  // Use property store, fallback to mock data for backward compatibility
  const allProperties = useMemo(() => (getAllProperties().length > 0 ? getAllProperties() : mockProperties), [])
  const areas = [...new Set(allProperties.map((p) => p.area))]

  const filteredProperties = allProperties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesArea = areaFilter === "all" || property.area === areaFilter
    const matchesStatus = statusFilter === "all" || property.status === statusFilter
    const matchesListing =
      listingFilter === "all" || (property.listingType ?? "sale") === listingFilter
    return matchesSearch && matchesArea && matchesStatus && matchesListing
  })

  const handleFavoriteToggle = (propertyId: string) => {
    // TODO: Implement favorite toggle logic
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _property = allProperties.find((item) => item.id === propertyId)
  }

  const handleShare = (propertyId: string) => {
    const property = allProperties.find((item) => item.id === propertyId)
    if (property) setShareTarget(property)
  }

  const handleShareDialogChange = (open: boolean) => {
    if (!open) setShareTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* Visual Stats Banner */}
      <PropertyStatsBanner properties={allProperties} />

      {/* Filters */}
      <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 rounded-lg focus:bg-white"
                />
              </div>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-full sm:w-[180px] border-gray-200 rounded-lg">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] border-gray-200 rounded-lg">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="under-offer">Under Offer</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="off-market">Off Market</SelectItem>
                </SelectContent>
              </Select>
              <Select value={listingFilter} onValueChange={setListingFilter}>
                <SelectTrigger className="w-full sm:w-[180px] border-gray-200 rounded-lg">
                  <SelectValue placeholder="All Listing Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sale">For sale</SelectItem>
                  <SelectItem value="rent">For rent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-gray-500 mr-2">View:</span>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "gap-2",
                  viewMode === "grid" && "bg-primary text-primary-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={cn(
                  "gap-2",
                  viewMode === "table" && "bg-primary text-primary-foreground"
                )}
              >
                <List className="h-4 w-4" />
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "grid" ? (
        filteredProperties.length > 0 ? (
          <section className="space-y-6">
            <div className="rounded-2xl bg-white border border-gray-100 p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Portfolio Spotlight</p>
                  <h2 className="text-2xl font-semibold text-foreground">Explore top opportunities</h2>
                  <p className="text-sm text-gray-500">
                    Curated listings with strong fundamentals and investor-ready documentation.
                  </p>
                </div>
                <Button variant="secondary" className="self-start rounded-lg">
                  See All Properties
                </Button>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  featured={index === 0}
                  isNew={isNewListing(property.createdAt)}
                  agent={{
                    name: currentUser.name,
                    role: "Senior Realtor",
                    avatar: currentUser.avatar || "/professional-woman-avatar.png",
                  }}
                  onFavoriteToggle={handleFavoriteToggle}
                  onShare={handleShare}
                />
              ))}
            </div>
          </section>
        ) : (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="No properties match your filters"
                description="Try clearing filters or add a new property."
                icon={<Building2 className="size-5" />}
                action={
                  <Button asChild>
                    <Link href="/properties/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add property
                    </Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Property Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProperties.length > 0 ? (
              <ScrollArea className="w-full">
                <ScrollAreaViewport>
                  <Table className="[&_th]:text-gray-500 [&_th]:font-medium [&_th]:text-sm [&_td]:text-gray-700">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Size (sqft)</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Readiness</TableHead>
                        <TableHead>Listing</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProperties.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell>
                            <div className="max-w-[280px]">
                              <p className="font-medium truncate">{property.title}</p>
                              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {property.address}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{typeLabels[property.type]}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-500">{property.area}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(property.price, property.listingType ?? "sale")}
                          </TableCell>
                          <TableCell className="text-right text-gray-500">{property.size.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {property.roi ? (
                              <span className="flex items-center justify-end gap-1 text-emerald-600">
                                <TrendingUp className="h-3 w-3" />
                                {property.roi}%
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[property.status]}>
                              {property.status.replace("-", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={readinessStatusColors[property.readinessStatus ?? "DRAFT"]}
                            >
                              {property.readinessStatus?.replace(/_/g, " ") ?? "DRAFT"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {(property.listingType ?? "sale") === "rent" ? "Rent" : "Sale"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {property.source?.type ? (
                              <span className="capitalize">{property.source.type}</span>
                            ) : (
                              <span>-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/properties/${property.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollAreaViewport>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <EmptyState
                title="No properties match your filters"
                description="Try clearing filters or add a new property."
                icon={<Building2 className="size-5" />}
                action={
                  <Button asChild>
                    <Link href="/properties/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add property
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      <PropertyShareDialog property={shareTarget} open={!!shareTarget} onOpenChange={handleShareDialogChange} />
    </div>
  )
}

export default PropertiesContent