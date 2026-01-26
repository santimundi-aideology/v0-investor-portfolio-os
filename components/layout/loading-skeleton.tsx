import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"

export function LoadingSkeleton({
  title = true,
  rows = 6,
}: {
  title?: boolean
  rows?: number
}) {
  return (
    <div className="space-y-6">
      {title ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      ) : null}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
