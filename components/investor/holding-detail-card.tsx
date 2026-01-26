"use client"

import * as React from "react"
import Image from "next/image"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Home,
  Maximize2,
  Percent,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import type { PropertyHolding } from "@/lib/real-estate"
import type { Property } from "@/lib/types"

interface HoldingDetailCardProps {
  holding: PropertyHolding
  property: Property
  yieldPct: number
  appreciationPct: number
  annualNetRent: number
  incomeToDate: number
  monthsHeld: number
}

export function HoldingDetailCard({
  holding,
  property,
  yieldPct,
  appreciationPct,
  annualNetRent,
  incomeToDate,
  monthsHeld,
}: HoldingDetailCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const images = React.useMemo(() => {
    if (property.images && property.images.length > 0) {
      return property.images.map((img) => ({
        url: img.url,
        title: img.title || img.category,
        category: img.category,
      }))
    }
    if (property.imageUrl) {
      return [{ url: property.imageUrl, title: "Property", category: "exterior" as const }]
    }
    return []
  }, [property])

  const nextImage = React.useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const prevImage = React.useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  // Calculate performance vs mandate (mock)
  const mandateYieldTarget = 8.5 // Would come from investor mandate
  const yieldVsMandate = yieldPct - mandateYieldTarget
  const isAboveTarget = yieldVsMandate >= 0

  return (
    <>
      <Card className="overflow-hidden">
        {/* Image Gallery */}
        <div className="relative h-64 md:h-80 bg-muted">
          {images.length > 0 ? (
            <>
              <Image
                src={images[currentImageIndex].url}
                alt={images[currentImageIndex].title || "Property"}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="size-5" />
                  </Button>

                  {/* Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={cn(
                          "size-2 rounded-full transition-colors",
                          idx === currentImageIndex
                            ? "bg-white"
                            : "bg-white/50 hover:bg-white/75"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Category Badge */}
              <Badge className="absolute top-3 left-3 capitalize bg-black/50 text-white border-none">
                {images[currentImageIndex].category}
              </Badge>

              {/* Fullscreen Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 bg-black/30 hover:bg-black/50 text-white"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="size-4" />
              </Button>

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Building2 className="size-16 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <CardContent className="p-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox
              icon={<DollarSign className="size-4" />}
              label="Current Value"
              value={formatAED(holding.currentValue)}
              subValue={
                <span className={cn(
                  "flex items-center gap-1",
                  appreciationPct >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {appreciationPct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {appreciationPct >= 0 ? "+" : ""}{appreciationPct.toFixed(1)}%
                </span>
              }
            />
            <MetricBox
              icon={<Percent className="size-4" />}
              label="Net Yield"
              value={`${yieldPct.toFixed(2)}%`}
              subValue={
                <span className={cn(
                  "flex items-center gap-1",
                  isAboveTarget ? "text-emerald-600" : "text-amber-600"
                )}>
                  {isAboveTarget ? "+" : ""}{yieldVsMandate.toFixed(1)}% vs target
                </span>
              }
            />
            <MetricBox
              icon={<Home className="size-4" />}
              label="Annual Net Rent"
              value={formatAED(annualNetRent)}
              subValue={`${formatAED(annualNetRent / 12)}/mo`}
            />
            <MetricBox
              icon={<Users className="size-4" />}
              label="Occupancy"
              value={`${(holding.occupancyRate * 100).toFixed(0)}%`}
              subValue={
                holding.occupancyRate >= 0.95
                  ? <span className="text-emerald-600">Excellent</span>
                  : holding.occupancyRate >= 0.85
                    ? <span className="text-amber-600">Good</span>
                    : <span className="text-red-600">Needs attention</span>
              }
            />
          </div>

          <Separator className="my-6" />

          {/* Performance vs Mandate */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="size-4" />
              Performance vs Mandate
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">Income to Date</div>
                <div className="mt-1 text-lg font-semibold">{formatAED(incomeToDate)}</div>
                <div className="text-xs text-muted-foreground">{monthsHeld} months held</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">Total Return</div>
                <div className="mt-1 text-lg font-semibold text-emerald-600">
                  {formatAED(incomeToDate + (holding.currentValue - holding.purchasePrice))}
                </div>
                <div className="text-xs text-muted-foreground">Income + appreciation</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">Annual Expenses</div>
                <div className="mt-1 text-lg font-semibold">{formatAED(holding.annualExpenses)}</div>
                <div className="text-xs text-muted-foreground">
                  {((holding.annualExpenses / (holding.monthlyRent * 12)) * 100).toFixed(0)}% of gross rent
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* AI Insights Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Property Details</h3>
            <p className="text-sm text-muted-foreground">{property.description}</p>

            {property.features && property.features.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Features</h4>
                <div className="flex flex-wrap gap-2">
                  {property.features.map((feature, idx) => (
                    <Badge key={idx} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {property.risks && property.risks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-amber-600">Known Risks</h4>
                <div className="flex flex-wrap gap-2">
                  {property.risks.map((risk, idx) => (
                    <Badge key={idx} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                      {risk}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      {isFullscreen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(false)}
          >
            ×
          </Button>
          <Image
            src={images[currentImageIndex].url}
            alt={images[currentImageIndex].title || "Property"}
            fill
            className="object-contain p-8"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
              >
                <ChevronLeft className="size-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
              >
                <ChevronRight className="size-8" />
              </Button>
            </>
          )}
        </div>
      )}
    </>
  )
}

function MetricBox({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subValue?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
      {subValue && <div className="mt-1 text-xs">{subValue}</div>}
    </div>
  )
}
