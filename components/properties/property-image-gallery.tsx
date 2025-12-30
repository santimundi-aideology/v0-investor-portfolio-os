"use client"

import * as React from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { PropertyImage } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PropertyImageGalleryProps {
  images: PropertyImage[]
  primaryImageUrl?: string
  propertyTitle: string
}

const categoryLabels: Record<PropertyImage["category"], string> = {
  exterior: "Exterior",
  interior: "Interior",
  amenities: "Amenities",
  "floor-plan": "Floor Plan",
  other: "Other",
}

const categoryColors: Record<PropertyImage["category"], string> = {
  exterior: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  interior: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  amenities: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "floor-plan": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  other: "bg-muted text-muted-foreground",
}

export function PropertyImageGallery({ images, primaryImageUrl, propertyTitle }: PropertyImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false)

  // Combine primary image (if exists) with image array
  const allImages = React.useMemo(() => {
    const result: PropertyImage[] = []
    
    // Add primary image as exterior if no images exist
    if (primaryImageUrl && images.length === 0) {
      result.push({
        id: "primary",
        url: primaryImageUrl,
        category: "exterior",
        title: "Main view",
        order: 0,
      })
    }
    
    // Add all images from array
    const sortedImages = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    result.push(...sortedImages)
    
    return result
  }, [images, primaryImageUrl])

  if (allImages.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border bg-muted">
        <p className="text-muted-foreground">No images available</p>
      </div>
    )
  }

  const currentImage = allImages[selectedIndex]
  const interiorImages = allImages.filter((img) => img.category === "interior")
  const exteriorImages = allImages.filter((img) => img.category === "exterior")
  const otherImages = allImages.filter((img) => img.category !== "interior" && img.category !== "exterior")

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
    setIsLightboxOpen(true)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Main Image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <Image
            src={currentImage.url}
            alt={currentImage.title || `${propertyTitle} - ${categoryLabels[currentImage.category]}`}
            fill
            className="object-cover"
            priority={selectedIndex === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <Badge variant="outline" className={categoryColors[currentImage.category]}>
              {categoryLabels[currentImage.category]}
            </Badge>
          </div>

          {/* Image Counter */}
          {allImages.length > 1 && (
            <div className="absolute top-4 right-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {selectedIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Navigation Arrows */}
          {allImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  goToPrevious()
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  goToNext()
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-4 right-4 bg-black/50 text-white hover:bg-black/70"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openLightbox(selectedIndex)
            }}
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Thumbnail Grid */}
        {allImages.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {allImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative aspect-video overflow-hidden rounded-lg border-2 transition-all",
                  selectedIndex === index
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-transparent hover:border-primary/50"
                )}
              >
                <Image
                  src={image.url}
                  alt={image.title || `${propertyTitle} - ${categoryLabels[image.category]}`}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/10" />
              </button>
            ))}
          </div>
        )}

        {/* Category Sections */}
        {interiorImages.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Interior Photos ({interiorImages.length})</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {interiorImages.map((image, index) => {
                const globalIndex = allImages.findIndex((img) => img.id === image.id)
                return (
                  <button
                    key={image.id}
                    onClick={() => {
                      setSelectedIndex(globalIndex)
                      openLightbox(globalIndex)
                    }}
                    className="group relative aspect-video overflow-hidden rounded-lg border"
                  >
                    <Image
                      src={image.url}
                      alt={image.title || `${propertyTitle} - Interior ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                    {image.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-xs text-white">{image.title}</p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Exterior Photos */}
        {exteriorImages.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Exterior Photos ({exteriorImages.length})</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {exteriorImages.map((image, index) => {
                const globalIndex = allImages.findIndex((img) => img.id === image.id)
                return (
                  <button
                    key={image.id}
                    onClick={() => {
                      setSelectedIndex(globalIndex)
                      openLightbox(globalIndex)
                    }}
                    className="group relative aspect-video overflow-hidden rounded-lg border"
                  >
                    <Image
                      src={image.url}
                      alt={image.title || `${propertyTitle} - Exterior ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Other Categories */}
        {otherImages.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Additional Photos ({otherImages.length})</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {otherImages.map((image, index) => {
                const globalIndex = allImages.findIndex((img) => img.id === image.id)
                return (
                  <button
                    key={image.id}
                    onClick={() => {
                      setSelectedIndex(globalIndex)
                      openLightbox(globalIndex)
                    }}
                    className="group relative aspect-video overflow-hidden rounded-lg border"
                  >
                    <Image
                      src={image.url}
                      alt={image.title || `${propertyTitle} - ${categoryLabels[image.category]} ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                    <div className="absolute top-2 left-2">
                      <Badge variant="outline" className={cn("text-xs", categoryColors[image.category])}>
                        {categoryLabels[image.category]}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-7xl p-0">
          <div className="relative aspect-video w-full">
            <Image
              src={currentImage.url}
              alt={currentImage.title || `${propertyTitle} - ${categoryLabels[currentImage.category]}`}
              fill
              className="object-contain"
            />
            <div className="absolute inset-0 bg-black/90" />
            <div className="relative z-10 flex h-full items-center justify-center">
              <Image
                src={currentImage.url}
                alt={currentImage.title || `${propertyTitle} - ${categoryLabels[currentImage.category]}`}
                width={1920}
                height={1080}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-20 bg-black/50 text-white hover:bg-black/70"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation */}
            {allImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 z-20 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 z-20 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>

                {/* Image Info */}
                <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-white">
                  <p className="text-sm">
                    {currentImage.title && `${currentImage.title} • `}
                    {selectedIndex + 1} / {allImages.length}
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

