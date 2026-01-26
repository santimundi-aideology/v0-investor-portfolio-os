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
        "border-gray-100 bg-white text-gray-900 flex flex-col items-start gap-3 rounded-lg border p-6",
        className,
      )}
    >
      {icon ? (
        <div className="bg-gray-100 text-gray-500 flex size-10 items-center justify-center rounded-lg">{icon}</div>
      ) : null}
      <div>
        <div className="font-medium text-gray-900">{title}</div>
        {description ? <div className="text-gray-500 mt-1 text-sm">{description}</div> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}


