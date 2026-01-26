"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Minus, Building2, MapPin, Loader2, ExternalLink, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AreaComparison {
  area_name: string
  dld_count: number | null
  dld_avg_price: number | null
  dld_avg_psm: number | null
  portal_count: number | null
  portal_avg_price: number | null
  portal_avg_psm: number | null
  price_premium_pct: number | null
  has_both: number
}

interface PortalListing {
  id: string
  portal: string
  listing_id: string
  property_type: string
  bedrooms: number
  bathrooms: number
  size_sqm: number
  area_name: string
  building_name: string
  project_name: string
  asking_price: number
  price_per_sqm: number
  has_parking: boolean
  furnished: string
  listed_date: string
  agency_name: string
}

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `AED ${(price / 1000000).toFixed(1)}M`
  }
  if (price >= 1000) {
    return `AED ${(price / 1000).toFixed(0)}K`
  }
  return `AED ${price.toFixed(0)}`
}

function PremiumBadge({ premium }: { premium: number | null }) {
  if (premium === null) return <span className="text-muted-foreground">-</span>

  const isPositive = premium > 0
  const isNegative = premium < 0
  const absValue = Math.abs(premium)

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono",
        isPositive && premium > 20 && "border-red-500 text-red-600 bg-red-50",
        isPositive && premium <= 20 && "border-yellow-500 text-yellow-600 bg-yellow-50",
        isNegative && "border-green-500 text-green-600 bg-green-50"
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : isNegative ? <TrendingDown className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
      {isPositive ? "+" : ""}{premium.toFixed(1)}%
    </Badge>
  )
}

export function MarketCompareClient() {
  const [loading, setLoading] = React.useState(true)
  const [comparisons, setComparisons] = React.useState<AreaComparison[]>([])
  const [listings, setListings] = React.useState<PortalListing[]>([])
  const [summary, setSummary] = React.useState({
    total_comparisons: 0,
    total_listings: 0,
    avg_price_gap_pct: 0,
    areas_with_premium: 0,
    areas_with_discount: 0,
  })

  React.useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dld/compare")
        if (res.ok) {
          const data = await res.json()
          setComparisons(data.comparison || [])
          setListings(data.listings || [])
          setSummary(data.summary || summary)
        }
      } catch (err) {
        console.error("Failed to fetch comparison data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Live Bayut Data Connected</p>
              <p className="text-sm text-green-700">
                Comparing {summary.total_listings} real Bayut listings with {summary.total_comparisons} DLD transaction records.
                Green = asking price below market value (opportunity). Red = above market.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardDescription>Areas with Both Sources</CardDescription>
            <CardTitle className="text-2xl">{comparisons.filter(c => c.has_both === 1).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardDescription>Bayut Listings</CardDescription>
            <CardTitle className="text-2xl">{listings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardDescription>Overpriced Areas</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {summary.areas_with_premium}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardDescription>Opportunity Areas</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {summary.areas_with_discount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            DLD vs Bayut Price Comparison
          </CardTitle>
          <CardDescription>
            Comparing actual DLD transaction prices (last 6 months) with current Bayut asking prices. 
            <span className="text-green-600 font-medium"> Green = asking below market (opportunity)</span>, 
            <span className="text-red-600 font-medium"> Red = asking above market</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead className="text-right">DLD Txns</TableHead>
                <TableHead className="text-right">DLD Avg Price</TableHead>
                <TableHead className="text-right">Bayut Listings</TableHead>
                <TableHead className="text-right">Bayut Avg Price</TableHead>
                <TableHead className="text-center">Premium/Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.filter(c => c.has_both === 1).map((row) => (
                <TableRow key={row.area_name}>
                  <TableCell className="font-medium">{row.area_name}</TableCell>
                  <TableCell className="text-right">{row.dld_count?.toLocaleString() || "-"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {row.dld_avg_price ? formatPrice(row.dld_avg_price) : "-"}
                  </TableCell>
                  <TableCell className="text-right">{row.portal_count?.toLocaleString() || "-"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {row.portal_avg_price ? formatPrice(row.portal_avg_price) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <PremiumBadge premium={row.price_premium_pct} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {comparisons.filter(c => c.has_both === 1).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No areas with both DLD and Bayut data available yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portal Listings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Current Portal Listings
          </CardTitle>
          <CardDescription>
            Sample listings from Bayut and Property Finder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.slice(0, 12).map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <CardHeader className="py-3 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <Badge variant={listing.portal === "bayut" ? "default" : "secondary"}>
                      {listing.portal === "bayut" ? "Bayut" : "Property Finder"}
                    </Badge>
                    <span className="text-lg font-bold text-green-600">
                      {formatPrice(listing.asking_price)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="py-3 space-y-2">
                  <div>
                    <p className="font-semibold">{listing.property_type}</p>
                    <p className="text-sm text-muted-foreground">{listing.area_name}</p>
                    {listing.building_name && (
                      <p className="text-xs text-muted-foreground">{listing.building_name}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    {listing.bedrooms && (
                      <Badge variant="outline">{listing.bedrooms} BR</Badge>
                    )}
                    {listing.bathrooms && (
                      <Badge variant="outline">{listing.bathrooms} BA</Badge>
                    )}
                    {listing.size_sqm && (
                      <Badge variant="outline">{listing.size_sqm} sqm</Badge>
                    )}
                    {listing.has_parking && (
                      <Badge variant="outline">Parking</Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>AED {listing.price_per_sqm?.toLocaleString()}/sqm</p>
                    <p>{listing.agency_name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            This comparison uses official and real-time data from multiple sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Bayut API</span>
                <Badge className="bg-green-500">Connected</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Real-time listings from Bayut via RapidAPI. Updated daily.
              </p>
              <p className="text-xs text-muted-foreground">
                Free tier: 750 API calls/month
              </p>
            </div>

            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Dubai Land Department</span>
                <Badge className="bg-blue-500">Connected</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Official transaction data from Dubai Pulse Open Data (50,000+ records).
              </p>
              <p className="text-xs text-muted-foreground">
                Source: dubaipulse.gov.ae
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
