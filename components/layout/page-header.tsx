import * as React from "react"

import { cn } from "@/lib/utils"

export type PageHeaderProps = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  badges?: React.ReactNode
  primaryAction?: React.ReactNode
  secondaryActions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  badges,
  primaryAction,
  secondaryActions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-4", className)}>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">{title}</h1>
          {badges}
        </div>
        {subtitle ? <p className="text-base text-muted-foreground/80 font-medium">{subtitle}</p> : null}
      </div>

      {(primaryAction || secondaryActions) && (
        <div className="flex flex-wrap items-center gap-3 md:justify-end shrink-0">
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </div>
  )
}


