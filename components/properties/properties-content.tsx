"use client"

import { useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Building2, MapPin, TrendingUp, Plus } from "lucide-react"
import Link from "next/link"
import { mockProperties } from "@/lib/mock-data"
import type { Property } from "@/lib/types"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const statusColors: Record<Property["status"], string> = {
  available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "under-offer": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  sold: "bg-muted text-muted-foreground",
  "off-market": "bg-muted text-muted-foreground",
}

const typeLabels: Record<Property["type"], string> = {
  residential: "Residential",
  commercial: "Commercial",
  "mixed-use": "Mixed-Use",
  land: "Land",
}

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `AED ${(price / 1000000).toFixed(1)}M`
  }
  return `AED ${(price / 1000).toFixed(0)}K`
}

export function PropertiesContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [areaFilter, setAreaFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const areas = [...new Set(mockProperties.map((p) => p.area))]

  const filteredProperties = mockProperties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesArea = areaFilter === "all" || property.area === areaFilter
    const matchesStatus = statusFilter === "all" || property.status === statusFilter
    return matchesSearch && matchesArea && matchesStatus
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle={`${filteredProperties.length} of ${mockProperties.length} properties`}
        primaryAction={<AddPropertyDialog />}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[180px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Properties Table */}
      <Card>
        <CardHeader>
          <CardTitle>Property Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProperties.length > 0 ? (
            <ScrollArea className="w-full">
              <ScrollAreaViewport>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Size (sqft)</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProperties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div className="max-w-[280px]">
                            <p className="font-medium truncate">{property.title}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property.address}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{typeLabels[property.type]}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{property.area}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(property.price)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{property.size.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {property.roi ? (
                            <span className="flex items-center justify-end gap-1 text-emerald-600">
                              <TrendingUp className="h-3 w-3" />
                              {property.roi}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[property.status]}>
                            {property.status.replace("-", " ")}
                          </Badge>
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
              action={<AddPropertyDialog />}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AddPropertyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add property
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add property</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Marina Tower Office Suite" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="Dubai Marina…" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="button">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
