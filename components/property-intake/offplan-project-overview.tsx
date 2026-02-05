"use client"

import * as React from "react"
import {
  Building2,
  Calendar,
  MapPin,
  Users,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Globe,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { OffPlanProject, OffPlanPaymentPlan } from "@/lib/types"

interface OffPlanProjectOverviewProps {
  project: OffPlanProject
  paymentPlan: OffPlanPaymentPlan
  stats?: {
    totalUnits: number
    availableUnits: number
    soldUnits: number
    reservedUnits: number
    priceRange?: { min: number; max: number } | null
    sizeRange?: { min: number; max: number } | null
    avgPricePerSqft?: number | null
  }
}

export function OffPlanProjectOverview({
  project,
  paymentPlan,
  stats,
}: OffPlanProjectOverviewProps) {
  const formatCurrency = (value: number) =>
    `AED ${value.toLocaleString()}`

  const completionDate = project.completionDate
  const isNearCompletion = completionDate?.toLowerCase().includes("2025") || 
    completionDate?.toLowerCase().includes("q1 2026")

  return (
    <div className="space-y-6">
      {/* Main Project Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{project.projectName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                by {project.developer}
              </CardDescription>
            </div>
            <Badge variant={project.propertyType === "commercial" ? "secondary" : "outline"} className="capitalize">
              {project.propertyType}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-medium">
                  {project.location.area}
                  {project.location.subArea && `, ${project.location.subArea}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Completion</p>
                <p className="font-medium">{project.completionDate || "TBD"}</p>
                {isNearCompletion && (
                  <Badge variant="secondary" className="mt-1 text-xs">Near Handover</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
              <Building2 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Total Levels</p>
                <p className="font-medium">{project.totalLevels || "—"} floors</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
              <Users className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xs text-gray-500">Total Units</p>
                <p className="font-medium">{project.totalUnits || stats?.totalUnits || "—"}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div>
              <p className="text-sm text-gray-600">{project.description}</p>
            </div>
          )}

          {/* Design Team */}
          {(project.architectDesigner || project.interiorDesigner) && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Design Team</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                {project.architectDesigner && (
                  <div>
                    <p className="text-xs text-gray-500">Architecture</p>
                    <p className="font-medium">{project.architectDesigner}</p>
                  </div>
                )}
                {project.interiorDesigner && (
                  <div>
                    <p className="text-xs text-gray-500">Interior Design</p>
                    <p className="font-medium">{project.interiorDesigner}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amenities */}
          {project.amenities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {project.amenities.map((amenity, idx) => (
                  <Badge key={idx} variant="outline" className="bg-white">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats & Payment Plan Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inventory Stats */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory Status</CardTitle>
              <CardDescription>Current availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-2xl font-bold text-green-700">{stats.availableUnits}</p>
                  <p className="text-xs text-green-600">Available</p>
                </div>
                <div className="rounded-lg bg-gray-100 p-3">
                  <p className="text-2xl font-bold text-gray-700">{stats.soldUnits}</p>
                  <p className="text-xs text-gray-600">Sold</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-2xl font-bold text-amber-700">{stats.reservedUnits}</p>
                  <p className="text-xs text-amber-600">Reserved</p>
                </div>
              </div>

              {/* Absorption indicator */}
              {stats.totalUnits > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Absorption</span>
                    <span className="font-medium">
                      {Math.round(((stats.soldUnits + stats.reservedUnits) / stats.totalUnits) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${((stats.soldUnits + stats.reservedUnits) / stats.totalUnits) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <Separator />

              {/* Price & Size ranges */}
              <div className="space-y-2 text-sm">
                {stats.priceRange && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Price Range</span>
                    <span className="font-medium">
                      {formatCurrency(stats.priceRange.min)} - {formatCurrency(stats.priceRange.max)}
                    </span>
                  </div>
                )}
                {stats.sizeRange && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size Range</span>
                    <span className="font-medium">
                      {stats.sizeRange.min.toLocaleString()} - {stats.sizeRange.max.toLocaleString()} sqft
                    </span>
                  </div>
                )}
                {stats.avgPricePerSqft && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Price/sqft</span>
                    <span className="font-medium">AED {stats.avgPricePerSqft.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              Payment Plan
            </CardTitle>
            <CardDescription>
              {paymentPlan.constructionPercent}% during construction, {paymentPlan.postHandoverPercent}% on completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentPlan.milestones.map((milestone, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
                    {milestone.milestone || idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{milestone.description}</p>
                      <Badge variant="secondary" className="ml-2">{milestone.percentage}%</Badge>
                    </div>
                    {milestone.timing && (
                      <p className="text-xs text-gray-500">{milestone.timing}</p>
                    )}
                  </div>
                </div>
              ))}

              {paymentPlan.dldFeePercent > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>DLD Registration Fee</span>
                    <span>{paymentPlan.dldFeePercent}% (on SPA signing)</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Developer Track Record */}
      {project.developerTrackRecord && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600" />
              Developer Track Record
            </CardTitle>
            <CardDescription>{project.developer}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Completed Projects */}
              {project.developerTrackRecord.completedProjects && project.developerTrackRecord.completedProjects.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Completed Projects
                  </h4>
                  <div className="space-y-2">
                    {project.developerTrackRecord.completedProjects.map((proj, idx) => (
                      <div key={idx} className="rounded-lg border bg-gray-50 p-3">
                        <p className="font-medium text-sm">{proj.name}</p>
                        {(proj.location || proj.value) && (
                          <p className="text-xs text-gray-500">
                            {proj.location}{proj.location && proj.value && " • "}{proj.value}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Projects */}
              {project.developerTrackRecord.currentProjects && project.developerTrackRecord.currentProjects.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Current Projects
                  </h4>
                  <div className="space-y-2">
                    {project.developerTrackRecord.currentProjects.map((proj, idx) => (
                      <div key={idx} className="rounded-lg border bg-gray-50 p-3">
                        <p className="font-medium text-sm">{proj.name}</p>
                        {(proj.location || proj.value) && (
                          <p className="text-xs text-gray-500">
                            {proj.location}{proj.location && proj.value && " • "}{proj.value}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {project.developerTrackRecord.totalDevelopmentValue && (
              <div className="mt-4 rounded-lg bg-green-50 p-4 text-center">
                <p className="text-xs text-green-600">Total Development Value</p>
                <p className="text-lg font-bold text-green-700">
                  {project.developerTrackRecord.totalDevelopmentValue}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Info */}
      {project.contactInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {project.contactInfo.phone && (
                <a
                  href={`tel:${project.contactInfo.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600"
                >
                  <Phone className="h-4 w-4" />
                  {project.contactInfo.phone}
                </a>
              )}
              {project.contactInfo.email && (
                <a
                  href={`mailto:${project.contactInfo.email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600"
                >
                  <Mail className="h-4 w-4" />
                  {project.contactInfo.email}
                </a>
              )}
              {project.contactInfo.website && (
                <a
                  href={project.contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600"
                >
                  <Globe className="h-4 w-4" />
                  {project.contactInfo.website}
                </a>
              )}
              {project.contactInfo.salesCenter && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {project.contactInfo.salesCenter}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
