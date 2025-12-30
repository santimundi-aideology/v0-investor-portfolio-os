import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
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
} from "lucide-react"
import Link from "next/link"
import { getPropertyById } from "@/lib/mock-data"
import { getPropertyById as getPropertyFromStore, getShortlistInvestors, getPropertyMemos } from "@/lib/property-store"
import type { Property, PropertyReadinessStatus } from "@/lib/types"
import { RoleRedirect } from "@/components/security/role-redirect"
import { PropertyImageGallery } from "@/components/properties/property-image-gallery"
import { RentalManagementCard } from "@/components/properties/rental-management-card"
import "@/lib/init-property-store"

interface PropertyPageProps {
  params: Promise<{ id: string }>
}

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
  return `AED ${price.toLocaleString()}`
}

function formatListingPrice(property: Property) {
  const listingType = property.listingType ?? "sale"
  const formatted = formatPrice(property.price)
  return listingType === "rent" ? `${formatted}/yr` : formatted
}

function getTrustScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-amber-600"
  return "text-red-600"
}

function getTrustScoreLabel(score: number): string {
  if (score >= 80) return "High Confidence"
  if (score >= 60) return "Moderate"
  return "Needs Review"
}

const readinessStatusColors: Record<PropertyReadinessStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  NEEDS_VERIFICATION: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  READY_FOR_MEMO: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params
  
  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />
      <PropertyPageContent id={id} />
    </>
  )
}

async function PropertyPageContent({ id }: { id: string }) {
  // Try store first, fallback to mock data
  let property = getPropertyFromStore(id)
  if (!property) {
    property = getPropertyById(id)
  }

  if (!property) {
    notFound()
  }

  // Get associations
  const shortlistInvestors = getShortlistInvestors(id)
  const linkedMemos = getPropertyMemos(id)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/properties">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Link>
      </Button>

      {/* Property Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{property.title}</h1>
            <Badge variant="outline" className={statusColors[property.status]}>
              {property.status.replace("-", " ")}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {(property.listingType ?? "sale") === "rent" ? "For rent" : "For sale"}
            </Badge>
            {(property.listingType ?? "sale") === "rent" && property.leaseStatus ? (
              <Badge variant="outline" className="capitalize">
                {property.leaseStatus}
              </Badge>
            ) : null}
            {property.readinessStatus && (
              <Badge
                variant="outline"
                className={readinessStatusColors[property.readinessStatus]}
              >
                {property.readinessStatus.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{property.address}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Badge variant="outline">{typeLabels[property.type]}</Badge>
            <span className="text-2xl font-bold">{formatListingPrice(property)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/memos/new?propertyId=${property.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              Generate IC Memo
            </Link>
          </Button>
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
          {/* Rental management */}
          <RentalManagementCard property={property} />

          {/* Key Facts */}
          <Card>
            <CardHeader>
              <CardTitle>Key Facts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Ruler className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="font-medium">{property.size.toLocaleString()} sqft</p>
                  </div>
                </div>
                {property.bedrooms && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-medium">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-medium">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
                {property.yearBuilt && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Year Built</p>
                      <p className="font-medium">{property.yearBuilt}</p>
                    </div>
                  </div>
                )}
                {property.roi && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Est. ROI</p>
                      <p className="font-medium text-emerald-600">{property.roi}%</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{typeLabels[property.type]}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{property.description || "No description available."}</p>
              {property.features && property.features.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 font-medium">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((feature, index) => (
                      <Badge key={index} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Snapshot</CardTitle>
              <CardDescription>Investment analysis based on current market data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Asking Price</p>
                  <p className="text-xl font-bold">{formatPrice(property.price)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Price per sqft</p>
                  <p className="text-xl font-bold">AED {Math.round(property.price / property.size).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Target ROI</p>
                  <p className="text-xl font-bold text-emerald-600">{property.roi || "N/A"}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Source & Ingestion History */}
          <Card>
            <CardHeader>
              <CardTitle>Source & Ingestion</CardTitle>
              <CardDescription>How this property was added to the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {property.source ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Source Type</p>
                      <p className="font-medium capitalize">{property.source.type}</p>
                    </div>
                    {property.source.name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Source Name</p>
                        <p className="font-medium">{property.source.name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Intake Method</p>
                      <p className="font-medium capitalize">{property.source.intakeSource.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ingested At</p>
                      <p className="font-medium">
                        {new Date(property.source.ingestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {property.source.originalFile && (
                      <div>
                        <p className="text-sm text-muted-foreground">Original File</p>
                        <p className="font-medium">{property.source.originalFile}</p>
                      </div>
                    )}
                  </div>
                  {property.ingestionHistory && property.ingestionHistory.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium">History</p>
                      <div className="space-y-2">
                        {property.ingestionHistory.map((entry) => (
                          <div key={entry.id} className="rounded-lg border p-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="capitalize">{entry.action.replace(/_/g, " ")}</span>
                              <span className="text-muted-foreground text-xs">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {entry.details && (
                              <p className="mt-1 text-xs text-muted-foreground">{entry.details}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No source information available</p>
              )}
            </CardContent>
          </Card>

          {/* Trust & Readiness */}
          <Card>
            <CardHeader>
              <CardTitle>Trust & Readiness</CardTitle>
              <CardDescription>Property verification and readiness status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Readiness Status</p>
                  {property.readinessStatus ? (
                    <Badge
                      variant="outline"
                      className={readinessStatusColors[property.readinessStatus]}
                    >
                      {property.readinessStatus.replace(/_/g, " ")}
                    </Badge>
                  ) : (
                    <p className="font-medium">Not set</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trust Score</p>
                  {property.trustScore ? (
                    <p className="font-medium">{property.trustScore}/100</p>
                  ) : (
                    <p className="font-medium text-muted-foreground">Not verified yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Objects */}
          {(shortlistInvestors.length > 0 || linkedMemos.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Linked Objects</CardTitle>
                <CardDescription>Investors and memos associated with this property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {shortlistInvestors.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Investors ({shortlistInvestors.length})</p>
                    <div className="space-y-1">
                      {shortlistInvestors.map((invId) => (
                        <Link
                          key={invId}
                          href={`/investors/${invId}`}
                          className="block text-sm text-primary hover:underline"
                        >
                          {invId}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {linkedMemos.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Memos ({linkedMemos.length})</p>
                    <div className="space-y-1">
                      {linkedMemos.map((memoId) => (
                        <Link
                          key={memoId}
                          href={`/memos/${memoId}`}
                          className="block text-sm text-primary hover:underline"
                        >
                          {memoId}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Risks */}
          {property.risks && property.risks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Risks & Considerations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {property.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-muted-foreground">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Next Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Schedule Site Visit</p>
                    <p className="text-sm text-muted-foreground">Arrange property viewing</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Schedule
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Request Documents</p>
                    <p className="text-sm text-muted-foreground">Title deed, NOC, floor plans</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Request
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Add to Shortlist</p>
                    <p className="text-sm text-muted-foreground">Match with investor mandates</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Rail */}
        <div className="space-y-6">
          {/* Trust Score Widget */}
          <Card>
            <CardHeader>
              <CardTitle>Trust Score</CardTitle>
              <CardDescription>AI-powered property assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className={`text-4xl font-bold ${getTrustScoreColor(property.trustScore || 0)}`}>
                  {property.trustScore || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {property.trustScore ? getTrustScoreLabel(property.trustScore) : "Not assessed"}
                </p>
              </div>
              {property.trustScore && <Progress value={property.trustScore} className="h-2" />}
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documentation</span>
                  <span className="font-medium">Complete</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title Verification</span>
                  <span className="font-medium">Verified</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Analysis</span>
                  <span className="font-medium">Favorable</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/memos/new?propertyId=${property.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate IC Memo
                </Link>
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                Share Property
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                Download Factsheet
              </Button>
            </CardContent>
          </Card>

          {/* Property Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Listed</span>
                <span>{property.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Views</span>
                <span>24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shortlisted</span>
                <span>3 times</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inquiries</span>
                <span>5</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
