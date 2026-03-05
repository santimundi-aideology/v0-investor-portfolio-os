"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Plus, ArrowRight, Clock } from "lucide-react"
import type { Memo } from "@/lib/types"

interface MemosTabProps {
  memos: Memo[]
  investorId: string
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; className: string }> = {
  draft:    { label: "Draft",     dot: "bg-gray-400",   className: "bg-gray-50 text-gray-600 border-gray-200" },
  review:   { label: "In Review", dot: "bg-amber-400",  className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Ready",     dot: "bg-emerald-400",className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sent:     { label: "Sent",      dot: "bg-blue-400",   className: "bg-blue-50 text-blue-700 border-blue-200" },
}

function formatDate(dateStr: string) {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

export function MemosTab({ memos, investorId }: MemosTabProps) {
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/realtor") ? "/realtor" : ""

  if (memos.length === 0) {
    return (
      <Card className="border-gray-100">
        <CardContent className="flex h-44 flex-col items-center justify-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
            <FileText className="h-6 w-6 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">No IC memos yet</p>
            <p className="text-xs text-gray-400 mt-1">Generate an IC Memo to start the investment process</p>
          </div>
          <Button asChild size="sm" className="bg-green-500 hover:bg-green-600 text-white">
            <Link href={`${basePath}/memos/new?investorId=${investorId}`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Generate Memo
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{memos.length} memo{memos.length !== 1 ? "s" : ""}</p>
        <Button asChild size="sm" className="bg-green-500 hover:bg-green-600 text-white">
          <Link href={`${basePath}/memos/new?investorId=${investorId}`}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Generate Memo
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {memos.map((memo) => {
          const config = STATUS_CONFIG[memo.status] ?? STATUS_CONFIG.draft
          return (
            <Link key={memo.id} href={`${basePath}/memos/${memo.id}`} className="group block">
              <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-gray-200 hover:shadow">
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <FileText className="h-5 w-5" />
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-sky-700 transition-colors">
                      {memo.title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                    <span className="truncate">{memo.propertyTitle}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatDate(memo.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Status + arrow */}
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="outline" className={`${config.className} text-xs font-medium gap-1.5`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
                    {config.label}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-sky-500 transition-colors" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
