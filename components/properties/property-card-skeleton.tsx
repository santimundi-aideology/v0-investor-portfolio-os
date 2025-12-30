export function PropertyCardSkeleton() {
  return (
    <div className="property-card animate-pulse">
      {/* Image Skeleton */}
      <div className="property-card__image-container bg-muted" />

      {/* Content Skeleton */}
      <div className="property-card__content">
        {/* Property Type */}
        <div className="h-4 w-24 bg-muted rounded" />

        {/* Title */}
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded w-full" />
          <div className="h-6 bg-muted rounded w-3/4" />
        </div>

        {/* Location */}
        <div className="h-4 bg-muted rounded w-2/3" />

        {/* Features */}
        <div className="property-card__features">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>

        {/* Footer */}
        <div className="property-card__footer">
          <div className="space-y-1">
            <div className="h-7 w-28 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
          <div className="h-10 w-28 bg-muted rounded-xl" />
        </div>

        {/* Agent Info */}
        <div className="property-card__agent">
          <div className="w-9 h-9 rounded-full bg-muted" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

