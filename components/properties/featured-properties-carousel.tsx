"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Bath, BedDouble, MapPin, Ruler, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Property } from "@/lib/types"

interface FeaturedPropertiesCarouselProps {
  properties: Property[]
  title?: string
  className?: string
}

function formatPrice(value: number | undefined): string {
  if (!value) return "Price on request"
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${Math.round(value).toLocaleString()}`
}

export function FeaturedPropertiesCarousel({
  properties,
  title = "Featured Properties",
  className,
}: FeaturedPropertiesCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isHovering, setIsHovering] = React.useState(false)

  const goToPrevious = React.useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? properties.length - 1 : prev - 1))
  }, [properties.length])

  const goToNext = React.useCallback(() => {
    setCurrentIndex((prev) => (prev === properties.length - 1 ? 0 : prev + 1))
  }, [properties.length])

  // Auto-advance every 5 seconds when not hovering
  React.useEffect(() => {
    if (isHovering || properties.length <= 1) return
    const timer = setInterval(goToNext, 5000)
    return () => clearInterval(timer)
  }, [goToNext, isHovering, properties.length])

  if (properties.length === 0) return null

  const property = properties[currentIndex]
  const heroSrc = property.imageUrl || "/placeholder.svg"

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div
        className="relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Main Image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Link href={`/properties/${property.id}`}>
            <Image
              src={heroSrc}
              alt={property.title}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              unoptimized={heroSrc.endsWith(".svg")}
            />
          </Link>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Badges */}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge className="bg-green-500 text-white">Featured</Badge>
            <Badge variant="secondary" className="bg-white/90 text-gray-900">
              {property.type}
            </Badge>
            {property.roi && (
              <Badge className="bg-amber-500 text-white">
                <TrendingUp className="mr-1 h-3 w-3" />
                {property.roi}% ROI
              </Badge>
            )}
          </div>

          {/* Navigation Arrows */}
          {properties.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg"
                onClick={(e) => {
                  e.preventDefault()
                  goToPrevious()
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg"
                onClick={(e) => {
                  e.preventDefault()
                  goToNext()
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Property Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <Link href={`/properties/${property.id}`} className="group">
              <h3 className="text-xl font-bold group-hover:underline">{property.title}</h3>
            </Link>
            <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
              <MapPin className="h-4 w-4" />
              <span>{property.address}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                {property.bedrooms && (
                  <div className="flex items-center gap-1">
                    <BedDouble className="h-4 w-4" />
                    <span>{property.bedrooms} beds</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    <span>{property.bathrooms} baths</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  <span>{property.size.toLocaleString()} sqft</span>
                </div>
              </div>
              <div className="text-xl font-bold">{formatPrice(property.price)}</div>
            </div>
          </div>
        </div>

        {/* Thumbnail Gallery */}
        {properties.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3 bg-gray-50">
            {properties.map((prop, index) => (
              <button
                key={prop.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg transition-all",
                  index === currentIndex
                    ? "ring-2 ring-green-500 ring-offset-2"
                    : "opacity-70 hover:opacity-100"
                )}
              >
                <Image
                  src={prop.imageUrl || "/placeholder.svg"}
                  alt={prop.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized={(prop.imageUrl || "/placeholder.svg").endsWith(".svg")}
                />
              </button>
            ))}
          </div>
        )}

        {/* Dots Indicator */}
        {properties.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
            {properties.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === currentIndex
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/75"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Compact property image card for grids and lists
 */
export function PropertyImageCard({
  property,
  className,
  showDetails = true,
}: {
  property: Property
  className?: string
  showDetails?: boolean
}) {
  const imageSrc = property.imageUrl || "/placeholder.svg"

  return (
    <Link href={`/properties/${property.id}`} className={cn("group block", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        <Image
          src={imageSrc}
          alt={property.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 768px) 50vw, 300px"
          unoptimized={imageSrc.endsWith(".svg")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        
        {/* Quick Info on Hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <div className="text-sm font-semibold truncate">{property.title}</div>
          <div className="text-xs text-white/80">{formatPrice(property.price)}</div>
        </div>
        
        {/* Badge */}
        <div className="absolute left-2 top-2">
          <Badge variant="secondary" className="bg-white/90 text-gray-900 text-[10px]">
            {property.area}
          </Badge>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-2">
          <div className="font-medium text-gray-900 truncate">{property.title}</div>
          <div className="text-sm text-gray-500">{formatPrice(property.price)}</div>
        </div>
      )}
    </Link>
  )
}

/**
 * Horizontal scrolling property gallery
 */
export function PropertyGalleryStrip({
  properties,
  title,
  className,
}: {
  properties: Property[]
  title?: string
  className?: string
}) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -300, behavior: "smooth" })
  }

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 300, behavior: "smooth" })
  }

  if (properties.length === 0) return null

  return (
    <div className={cn("relative", className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={scrollLeft}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={scrollRight}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {properties.map((property) => (
          <div
            key={property.id}
            className="flex-shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            <PropertyImageCard
              property={property}
              className="w-48"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
