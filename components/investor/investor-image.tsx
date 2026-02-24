"use client"

import * as React from "react"
import Image from "next/image"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Investor image component for Core Web Vitals (LCP, CLS).
 * - Uses next/image (WebP/AVIF via config), fixed aspect ratio to prevent CLS.
 * - priority for above-the-fold hero; lazy for below-the-fold.
 * - Reserve space via aspect ratio; optional skeleton when no src.
 */
export interface InvestorImageProps {
  src: string | null | undefined
  alt: string
  /** Use for LCP/hero images only (e.g. first carousel image). */
  priority?: boolean
  /** Default true for below-fold; false when priority=true. */
  lazy?: boolean
  /** Aspect ratio class, e.g. aspect-[4/3]. Default aspect-[4/3]. */
  aspectRatio?: "4/3" | "16/9" | "1/1"
  className?: string
  imageClassName?: string
  /** Responsive sizes for next/image. */
  sizes?: string
  /** Optional fallback icon size. */
  fallbackIconSize?: "sm" | "md" | "lg"
}

const aspectMap = {
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-[16/9]",
  "1/1": "aspect-square",
}

const iconSizeMap = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
}

export function InvestorImage({
  src,
  alt,
  priority = false,
  lazy = !priority,
  aspectRatio = "4/3",
  className,
  imageClassName,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  fallbackIconSize = "md",
}: InvestorImageProps) {
  const [error, setError] = React.useState(false)
  const aspectClass = aspectMap[aspectRatio]
  const iconClass = iconSizeMap[fallbackIconSize]

  if (!src || error) {
    return (
      <div
        className={cn(
          aspectClass,
          "flex w-full items-center justify-center bg-muted",
          className
        )}
        aria-hidden
      >
        <Building2 className={cn(iconClass, "text-muted-foreground/50")} />
      </div>
    )
  }

  return (
    <div className={cn("relative w-full overflow-hidden bg-muted", aspectClass, className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className={cn("object-cover", imageClassName)}
        sizes={sizes}
        priority={priority}
        loading={lazy ? "lazy" : undefined}
        onError={() => setError(true)}
        unoptimized={false}
      />
    </div>
  )
}
