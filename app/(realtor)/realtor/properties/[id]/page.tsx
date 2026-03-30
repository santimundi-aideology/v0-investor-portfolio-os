import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  MapPin,
  Building2,
  Ruler,
  Calendar,
  TrendingUp,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Bed,
  Bath,
  Calculator,
  Share2,
  Eye,
  Star,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import type { Property, PropertyReadinessStatus } from "@/lib/types"
import { getListingById } from "@/lib/db/listings"
import { mapListingToProperty } from "@/lib/utils/map-listing"
import { RoleRedirect } from "@/components/security/role-redirect"
import { PropertyImageGallery } from "@/components/properties/property-image-gallery"
import { RentalManagementCard } from "@/components/properties/rental-management-card"
import { PropertyCMASection } from "@/components/properties/property-cma-section"

interface PropertyPageProps {
  params: Promise<{ id: string }>
}

const statusConfig: Record<Property["status"], { label: string; className: string }> = {
  available: { label: "Available", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  "under-offer": { label: "Under Offer", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  sold: { label: "Sold", className: "bg-white/10 text-white/60 border-white/20" },
  "off-market": { label: "Off Market", className: "bg-white/10 text-white/60 border-white/20" },
}

const readinessConfig: Record<PropertyReadinessStatus, { label: string; className: string; cardClassName: string }> = {
  DRAFT: { label: "Draft", className: "bg-white/10 text-white/60 border-white/20", cardClassName: "bg-muted text-muted-foreground" },
  NEEDS_VERIFICATION: { label: "Needs Verification", className: "bg-amber-500/15 text-amber-400 border-amber-500/30", cardClassName: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  READY_FOR_MEMO: { label: "Ready for Memo", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", cardClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
}

const typeLabels: Record<Property["type"], string> = {
  residential: "Residential",
  commercial: "Commercial",
  "mixed-use": "Mixed-Use",
  land: "Land",
}

function formatPrice(price: number): string {
  return `AED ${price.toLocaleString()}`
}

function formatCompactPrice(price: number): string {
  if (price >= 1_000_000) return `AED ${(price / 1_000_000).toFixed(1)}M`
  if (price >= 1_000) return `AED ${(price / 1_000).toFixed(0)}K`
  return `AED ${price.toLocaleString()}`
}

function formatListingPrice(property: Property) {
  const listingType = property.listingType ?? "sale"
  const formatted = formatPrice(property.price)
  return listingType === "rent" ? `${formatted}/yr` : formatted
}

function getTrustScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500"
  if (score >= 60) return "text-amber-500"
  return "text-red-500"
}

function getTrustScoreLabel(score: number): string {
  if (score >= 80) return "High Confidence"
  if (score >= 60) return "Moderate"
  return "Needs Review"
}

function getTrustScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500"
  if (score >= 60) return "bg-amber-500"
  return "bg-red-500"
}

export default async function RealtorPropertyPage({ params }: PropertyPageProps) {
  const { id } = await params

  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/realtor/dashboard" />
      <RealtorPropertyContent id={id} />
    </>
  )
}

async function RealtorPropertyContent({ id }: { id: string }) {
  const listing = await getListingById(id)

  if (!listing) {
    notFound()
  }

  const property = mapListingToProperty(listing)
  const pricePerSqft = property.size > 0 ? Math.round(property.price / property.size) : 0

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div
        className="relative -mx-4 -mt-4 overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mt-6"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,35,41,0.92) 0%, rgba(15,35,41,0.88) 50%, rgba(15,35,41,0.95) 100%), url('${property.imageUrl || "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80"}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0f2329",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.10),transparent)]" />
        <div className="relative px-4 py-6 sm:px-6 lg:px-8">
          {/* Back navigation */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-4 text-white/70 hover:text-white hover:bg-white/10 -ml-2"
          >
            <Link href="/realtor/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Link>
          </Button>

          {/* Property title + badges */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {property.title}
                </h1>
                <Badge variant="outline" className={statusConfig[property.status].className}>
                  {statusConfig[property.status].label}
                </Badge>
                <Badge variant="outline" className="border-teal-400/30 bg-teal-500/15 text-teal-300">
                  {(property.listingType ?? "sale") === "rent" ? "For Rent" : "For Sale"}
                </Badge>
                {(property.listingType ?? "sale") === "rent" && property.leaseStatus && (
                  <Badge variant="outline" className="border-white/20 bg-white/10 text-white/70 capitalize">
                    {property.leaseStatus}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-white/60 text-sm">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{property.address}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white/80">
                  {typeLabels[property.type]}
                </Badge>
                {property.readinessStatus && (
                  <Badge variant="outline" className={readinessConfig[property.readinessStatus].className}>
                    {readinessConfig[property.readinessStatus].label}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href={`/realtor/memos/new?propertyId=${property.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Memo
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-teal-500 hover:bg-teal-600 text-white">
                <Link href={`/roi-calculator?propertyId=${property.id}`}>
                  <Calculator className="mr-2 h-4 w-4" />
                  ROI Calculator
                </Link>
              </Button>
            </div>
          </div>

          {/* Key metrics row */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
              <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Price</p>
              <p className="text-sm sm:text-base font-bold text-teal-200 mt-0.5">
                {formatCompactPrice(property.price)}
                {(property.listingType ?? "sale") === "rent" ? "/yr" : ""}
              </p>
            </div>
            <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
              <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Price/sqft</p>
              <p className="text-sm sm:text-base font-bold text-teal-200 mt-0.5">
                AED {pricePerSqft.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
              <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Size</p>
              <p className="text-sm sm:text-base font-bold text-teal-200 mt-0.5">
                {property.size.toLocaleString()} sqft
              </p>
            </div>
            {property.roi && (
              <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Est. ROI</p>
                <p className="text-sm sm:text-base font-bold text-emerald-300 mt-0.5">{property.roi}%</p>
              </div>
            )}
            {property.trustScore && (
              <div className="rounded-md border border-white/20 bg-teal-900/60 backdrop-blur-sm px-3 py-2 min-w-[120px]">
                <p className="text-[9px] sm:text-[10px] font-medium text-white/60 uppercase tracking-wider">Trust Score</p>
                <p className={`text-sm sm:text-base font-bold mt-0.5 ${property.trustScore >= 80 ? "text-emerald-300" : property.trustScore >= 60 ? "text-amber-300" : "text-red-300"}`}>
                  {property.trustScore}/100
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <PropertyImageGallery
        images={property.images ?? []}
        primaryImageUrl={property.imageUrl}
        propertyTitle={property.title}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Rental Management */}
          <RentalManagementCard property={property} />

          {/* Key Facts */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-teal-600" />
                Key Facts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                    <Ruler className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Size</p>
                    <p className="font-semibold">{property.size.toLocaleString()} sqft</p>
                  </div>
                </div>
                {property.bedrooms != null && (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                      <Bed className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bedrooms</p>
                      <p className="font-semibold">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms != null && (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                      <Bath className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bathrooms</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
                {property.yearBuilt && (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                      <Calendar className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Year Built</p>
                      <p className="font-semibold">{property.yearBuilt}</p>
                    </div>
                  </div>
                )}
                {property.roi && (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Est. ROI</p>
                      <p className="font-semibold text-emerald-600">{property.roi}%</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                    <Building2 className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-semibold">{typeLabels[property.type]}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overview */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">
                {property.description || "No description available."}
              </p>
              {property.features && property.features.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="rounded-full bg-teal-50 text-teal-700 border-teal-100">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Snapshot */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                Financial Snapshot
              </CardTitle>
              <CardDescription>Investment analysis based on current market data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Asking Price</p>
                  <p className="mt-1 text-xl font-bold">{formatListingPrice(property)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price per sqft</p>
                  <p className="mt-1 text-xl font-bold">AED {pricePerSqft.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Target ROI</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600">{property.roi || "N/A"}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DLD Market Analysis (CMA) */}
          <PropertyCMASection
            area={property.area}
            propertyType={property.type}
            bedrooms={property.bedrooms ?? 0}
            sizeSqft={property.size}
            askingPrice={property.price}
          />

          {/* Source & Ingestion */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Source & Ingestion</CardTitle>
              <CardDescription>How this property was added to the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {property.source ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-100 p-3">
                      <p className="text-xs text-gray-500 mb-1">Source Type</p>
                      <p className="font-medium text-sm capitalize">{property.source.type}</p>
                    </div>
                    {property.source.name && (
                      <div className="rounded-lg border border-gray-100 p-3">
                        <p className="text-xs text-gray-500 mb-1">Source Name</p>
                        <p className="font-medium text-sm">{property.source.name}</p>
                      </div>
                    )}
                    <div className="rounded-lg border border-gray-100 p-3">
                      <p className="text-xs text-gray-500 mb-1">Intake Method</p>
                      <p className="font-medium text-sm capitalize">{property.source.intakeSource.replace(/_/g, " ")}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 p-3">
                      <p className="text-xs text-gray-500 mb-1">Ingested At</p>
                      <p className="font-medium text-sm">
                        {new Date(property.source.ingestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {property.source.originalFile && (
                      <div className="rounded-lg border border-gray-100 p-3">
                        <p className="text-xs text-gray-500 mb-1">Original File</p>
                        <p className="font-medium text-sm">{property.source.originalFile}</p>
                      </div>
                    )}
                  </div>
                  {property.ingestionHistory && property.ingestionHistory.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold">History</p>
                      <div className="space-y-2">
                        {property.ingestionHistory.map((entry) => (
                          <div key={entry.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="capitalize font-medium">{entry.action.replace(/_/g, " ")}</span>
                              <span className="text-gray-500 text-xs">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {entry.details && (
                              <p className="mt-1 text-xs text-gray-500">{entry.details}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">No source information available</p>
              )}
            </CardContent>
          </Card>

          {/* Risks */}
          {property.risks && property.risks.length > 0 && (
            <Card className="rounded-xl border-amber-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Risks & Considerations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {property.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-gray-600">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Next Actions */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Next Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">Schedule Site Visit</p>
                    <p className="text-xs text-gray-500">Arrange property viewing</p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-lg">
                    Schedule
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">Request Documents</p>
                    <p className="text-xs text-gray-500">Title deed, NOC, floor plans</p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-lg">
                    Request
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">Add to Shortlist</p>
                    <p className="text-xs text-gray-500">Match with investor mandates</p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-lg">
                    Add
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Rail */}
        <div className="space-y-6">
          {/* Trust Score */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-teal-600" />
                Trust Score
              </CardTitle>
              <CardDescription>AI-powered property assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <p className={`text-5xl font-bold ${getTrustScoreColor(property.trustScore || 0)}`}>
                  {property.trustScore || "N/A"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {property.trustScore ? getTrustScoreLabel(property.trustScore) : "Not assessed"}
                </p>
              </div>
              {property.trustScore != null && (
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${getTrustScoreBarColor(property.trustScore)}`}
                    style={{ width: `${property.trustScore}%` }}
                  />
                </div>
              )}
              <Separator />
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Documentation</span>
                  <span className="font-medium text-emerald-600">Complete</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Title Verification</span>
                  <span className="font-medium text-emerald-600">Verified</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Market Analysis</span>
                  <span className="font-medium text-emerald-600">Favorable</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Readiness */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Readiness Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center py-2">
                {property.readinessStatus ? (
                  <Badge
                    variant="outline"
                    className={`text-sm px-4 py-1.5 ${readinessConfig[property.readinessStatus].cardClassName}`}
                  >
                    {readinessConfig[property.readinessStatus].label}
                  </Badge>
                ) : (
                  <p className="text-sm text-gray-500">Not set</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg" asChild>
                <Link href={`/realtor/memos/new?propertyId=${property.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate IC Memo
                </Link>
              </Button>
              <Button variant="outline" className="w-full rounded-lg" asChild>
                <Link href={`/roi-calculator?propertyId=${property.id}`}>
                  <Calculator className="mr-2 h-4 w-4" />
                  ROI Calculator
                </Link>
              </Button>
              <Button variant="outline" className="w-full rounded-lg">
                <Share2 className="mr-2 h-4 w-4" />
                Share Property
              </Button>
              <Button variant="outline" className="w-full rounded-lg">
                <FileText className="mr-2 h-4 w-4" />
                Download Factsheet
              </Button>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-teal-600" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Listed</span>
                <span className="font-medium">{property.createdAt}</span>
              </div>
              <Separator className="my-0" />
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Views</span>
                <span className="font-medium">24</span>
              </div>
              <Separator className="my-0" />
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Shortlisted</span>
                <span className="font-medium">3 times</span>
              </div>
              <Separator className="my-0" />
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Inquiries</span>
                <span className="font-medium">5</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
