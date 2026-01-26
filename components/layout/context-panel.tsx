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
      <div className="sticky top-24 space-y-6 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        {title ? <div className="text-xs font-bold uppercase tracking-widest text-gray-500 px-1">{title}</div> : null}
        <div className="space-y-4">{children}</div>
      </div>
    </aside>
  )
}
