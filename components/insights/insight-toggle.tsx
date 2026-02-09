"use client"

import * as React from "react"
import {
  MessageSquarePlus,
  MessageSquare,
  Eye,
  X,
  ChevronDown,
  Lightbulb,
  PenLine,
  HelpCircle,
  ThumbsUp,
  Bug,
  Clock,
  Trash2,
  CheckCircle2,
} from "lucide-react"
import { useInsights } from "./insight-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  INSIGHT_CATEGORY_CONFIG,
  INSIGHT_STATUS_CONFIG,
  type InsightCategory,
  type UserInsight,
} from "@/lib/types"

const CATEGORY_ICONS: Record<InsightCategory, React.ReactNode> = {
  suggestion: <Lightbulb className="size-3.5" />,
  correction: <PenLine className="size-3.5" />,
  question: <HelpCircle className="size-3.5" />,
  praise: <ThumbsUp className="size-3.5" />,
  bug_report: <Bug className="size-3.5" />,
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - Date.parse(iso)
  const minutes = Math.round(diff / (1000 * 60))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}

/**
 * InsightToggle: Floating button + side panel to toggle annotation mode and view insights.
 */
export function InsightToggle() {
  const { mode, toggleAnnotateMode, setMode, insights, totalCount, deleteInsight, updateInsight } =
    useInsights()
  const [panelOpen, setPanelOpen] = React.useState(false)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  // Close panel when entering annotate mode
  React.useEffect(() => {
    if (mode === "annotate") setPanelOpen(false)
  }, [mode])

  return (
    <>
      {/* Floating action button group */}
      <div
        data-insight-toggle
        className={cn(
          "fixed bottom-6 right-6 z-[9980] flex flex-col items-end gap-2",
          mode === "annotate" && "bottom-20"
        )}
      >
        {/* View insights button (if any exist) */}
        {totalCount > 0 && mode !== "annotate" && (
          <Button
            data-insight-toggle
            size="sm"
            variant="outline"
            className="gap-2 rounded-full border-gray-200 bg-white/90 shadow-lg backdrop-blur-sm hover:bg-white"
            onClick={() => setPanelOpen((prev) => !prev)}
          >
            <Eye className="size-4 text-gray-600" />
            <span className="text-gray-700">View Insights</span>
            <Badge variant="secondary" className="ml-1 size-5 items-center justify-center rounded-full p-0 text-[10px]">
              {totalCount}
            </Badge>
          </Button>
        )}

        {/* Main annotate toggle button */}
        <button
          data-insight-toggle
          type="button"
          onClick={toggleAnnotateMode}
          className={cn(
            "group flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-xl transition-all duration-300",
            mode === "annotate"
              ? "bg-blue-600 text-white hover:bg-blue-700 ring-4 ring-blue-200"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow-2xl"
          )}
        >
          {mode === "annotate" ? (
            <>
              <X className="size-5" />
              Exit Annotation
            </>
          ) : (
            <>
              <MessageSquarePlus className="size-5 text-blue-600 group-hover:scale-110 transition-transform" />
              Annotate
              {totalCount > 0 && (
                <Badge
                  className="ml-1 size-5 items-center justify-center rounded-full bg-blue-100 p-0 text-[10px] text-blue-700"
                >
                  {totalCount}
                </Badge>
              )}
            </>
          )}
        </button>
      </div>

      {/* Insights side panel */}
      {panelOpen && mode !== "annotate" && (
        <>
          {/* Backdrop */}
          <div
            data-insight-panel
            className="fixed inset-0 z-[9984] bg-black/20 backdrop-blur-[2px] animate-in fade-in-0 duration-200"
            onClick={() => setPanelOpen(false)}
          />

          {/* Panel */}
          <div
            data-insight-panel
            className="fixed right-0 top-0 bottom-0 z-[9985] w-[420px] max-w-[90vw] bg-white shadow-2xl border-l border-gray-200 animate-in slide-in-from-right duration-300 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50">
                  <MessageSquare className="size-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Insights</h2>
                  <p className="text-xs text-gray-500">{totalCount} annotation{totalCount !== 1 ? "s" : ""} on this page</p>
                </div>
              </div>
              <Button
                data-insight-panel
                size="sm"
                variant="ghost"
                className="size-8 p-0"
                onClick={() => setPanelOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Insights list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-gray-100 mb-3">
                    <MessageSquare className="size-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No insights yet</p>
                  <p className="mt-1 text-xs text-gray-400">Click "Annotate" to start leaving feedback</p>
                </div>
              ) : (
                insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    expanded={expandedId === insight.id}
                    onToggle={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                    onDelete={() => deleteInsight(insight.id)}
                    onStatusChange={(status) => updateInsight(insight.id, { status })}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-5 py-3">
              <Button
                data-insight-panel
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  setPanelOpen(false)
                  toggleAnnotateMode()
                }}
              >
                <MessageSquarePlus className="size-4" />
                Add New Annotation
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function InsightCard({
  insight,
  expanded,
  onToggle,
  onDelete,
  onStatusChange,
}: {
  insight: UserInsight
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
}) {
  const catConfig = INSIGHT_CATEGORY_CONFIG[insight.category]
  const statusConfig = INSIGHT_STATUS_CONFIG[insight.status]

  return (
    <div
      data-insight-panel
      className={cn(
        "rounded-lg border bg-white transition-all overflow-hidden",
        expanded ? "shadow-md border-blue-200" : "hover:shadow-sm border-gray-150"
      )}
    >
      {/* Card header */}
      <button
        data-insight-panel
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left"
        onClick={onToggle}
      >
        <div className={cn("mt-0.5 flex size-7 items-center justify-center rounded-lg border", catConfig.color)}>
          {CATEGORY_ICONS[insight.category]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-gray-900">{insight.title}</p>
            <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1.5 py-0", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
            <span>{insight.userName || "User"}</span>
            <span>&middot;</span>
            <Clock className="size-3" />
            <span>{formatTimeAgo(insight.createdAt)}</span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-gray-400 transition-transform shrink-0 mt-1",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div data-insight-panel className="border-t bg-gray-50/50 px-3 pb-3 pt-2 space-y-2">
          {insight.body && (
            <p className="text-sm text-gray-600 leading-relaxed">{insight.body}</p>
          )}

          {insight.elementText && (
            <div className="rounded-md bg-gray-100 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">
                Referenced element
              </p>
              <p className="text-xs text-gray-600 font-mono line-clamp-2">{insight.elementText}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              {insight.status === "open" && (
                <Button
                  data-insight-panel
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => onStatusChange("resolved")}
                >
                  <CheckCircle2 className="size-3" />
                  Resolve
                </Button>
              )}
              {insight.status === "resolved" && (
                <Button
                  data-insight-panel
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => onStatusChange("open")}
                >
                  Reopen
                </Button>
              )}
            </div>
            <Button
              data-insight-panel
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50"
              onClick={onDelete}
            >
              <Trash2 className="size-3" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
