import type React from "react"

import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  badges?: React.ReactNode
  primaryAction?: React.ReactNode
  secondaryActions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, badges, primaryAction, secondaryActions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-4", className)}>
      <div className="min-w-0">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <div className="text-3xl font-bold tracking-tight text-foreground">{title}</div>
              {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
            </div>
            {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
          </div>
        </div>
      </div>

      {primaryAction || secondaryActions ? (
        <div className="flex flex-wrap items-center gap-3 md:justify-end shrink-0">
          {secondaryActions}
          {primaryAction}
        </div>
      ) : null}
    </div>
  )
}

 