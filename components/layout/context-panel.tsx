import * as React from "react"

import { cn } from "@/lib/utils"

export function ContextPanel({
  title,
  children,
  className,
}: {
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <aside className={cn("hidden lg:block", className)}>
      <div className="sticky top-24 space-y-6 bg-secondary/30 rounded-2xl p-5 border border-border/40 backdrop-blur-md shadow-sm">
        {title ? <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-1">{title}</div> : null}
        <div className="space-y-4">{children}</div>
      </div>
    </aside>
  )
}


