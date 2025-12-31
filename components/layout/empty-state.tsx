import * as React from "react"

import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-border bg-card text-card-foreground flex flex-col items-start gap-3 rounded-lg border p-6",
        className,
      )}
    >
      {icon ? (
        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">{icon}</div>
      ) : null}
      <div>
        <div className="font-medium">{title}</div>
        {description ? <div className="text-muted-foreground mt-1 text-sm">{description}</div> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}


