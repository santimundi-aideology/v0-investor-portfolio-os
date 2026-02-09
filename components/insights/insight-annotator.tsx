"use client"

import * as React from "react"
import { MessageSquarePlus, X, Send, Loader2, Lightbulb, PenLine, HelpCircle, ThumbsUp, Bug } from "lucide-react"
import { useInsights } from "./insight-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { InsightCategory } from "@/lib/types"

const CATEGORY_OPTIONS: { id: InsightCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "suggestion", label: "Suggestion", icon: <Lightbulb className="size-3.5" />, color: "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100" },
  { id: "correction", label: "Correction", icon: <PenLine className="size-3.5" />, color: "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { id: "question", label: "Question", icon: <HelpCircle className="size-3.5" />, color: "border-purple-400 bg-purple-50 text-purple-700 hover:bg-purple-100" },
  { id: "praise", label: "Praise", icon: <ThumbsUp className="size-3.5" />, color: "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { id: "bug_report", label: "Bug", icon: <Bug className="size-3.5" />, color: "border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100" },
]

/**
 * Generates a readable CSS selector for an element (simplified).
 */
function getElementSelector(el: HTMLElement): string {
  const parts: string[] = []
  let current: HTMLElement | null = el

  for (let depth = 0; depth < 4 && current && current !== document.body; depth++) {
    let sel = current.tagName.toLowerCase()
    if (current.id) {
      sel += `#${current.id}`
      parts.unshift(sel)
      break
    }
    if (current.className && typeof current.className === "string") {
      const classes = current.className
        .split(/\s+/)
        .filter((c) => c && !c.startsWith("hover") && !c.startsWith("insight-"))
        .slice(0, 2)
      if (classes.length) sel += `.${classes.join(".")}`
    }
    parts.unshift(sel)
    current = current.parentElement
  }
  return parts.join(" > ")
}

/**
 * Get meaningful text from an element (truncated)
 */
function getElementText(el: HTMLElement): string {
  const text = el.textContent?.trim() || ""
  return text.length > 120 ? text.slice(0, 120) + "..." : text
}

/**
 * InsightAnnotator: The main overlay that enables hover-highlight and click-to-comment.
 */
export function InsightAnnotator() {
  const { mode, setMode, hoveredElement, setHoveredElement, createInsight } = useInsights()
  const [selectedElement, setSelectedElement] = React.useState<HTMLElement | null>(null)
  const [popoverPosition, setPopoverPosition] = React.useState<{ x: number; y: number } | null>(null)
  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null)

  // Form state
  const [category, setCategory] = React.useState<InsightCategory>("suggestion")
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const popoverRef = React.useRef<HTMLDivElement>(null)
  const highlightOverlayRef = React.useRef<HTMLDivElement>(null)

  // Reset form when selection changes
  React.useEffect(() => {
    if (!selectedElement) {
      setCategory("suggestion")
      setTitle("")
      setBody("")
      setSubmitting(false)
      setSubmitted(false)
    }
  }, [selectedElement])

  // Update highlight position on scroll/resize
  React.useEffect(() => {
    if (!hoveredElement && !selectedElement) {
      setHighlightRect(null)
      return
    }

    const target = selectedElement || hoveredElement
    if (!target) return

    function updateRect() {
      if (target) {
        setHighlightRect(target.getBoundingClientRect())
      }
    }

    updateRect()
    const interval = setInterval(updateRect, 100)
    return () => clearInterval(interval)
  }, [hoveredElement, selectedElement])

  // Mouse move handler for hover highlighting in annotate mode
  React.useEffect(() => {
    if (mode !== "annotate" || selectedElement) return

    function handleMouseMove(e: MouseEvent) {
      const target = e.target as HTMLElement
      // Skip our own overlay and annotation elements
      if (
        target.closest("[data-insight-overlay]") ||
        target.closest("[data-insight-popover]") ||
        target.closest("[data-insight-toggle]") ||
        target.closest("[data-insight-panel]")
      ) {
        setHoveredElement(null)
        return
      }

      // Find a meaningful parent (not too small, not the root)
      let el: HTMLElement | null = target
      while (el && el !== document.body) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 40 && rect.height > 20) break
        el = el.parentElement
      }

      if (el && el !== document.body && el !== document.documentElement) {
        setHoveredElement(el)
      } else {
        setHoveredElement(null)
      }
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      // Don't capture clicks on our own UI
      if (
        target.closest("[data-insight-overlay]") ||
        target.closest("[data-insight-popover]") ||
        target.closest("[data-insight-toggle]") ||
        target.closest("[data-insight-panel]")
      ) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      if (hoveredElement) {
        setSelectedElement(hoveredElement)
        const rect = hoveredElement.getBoundingClientRect()
        setPopoverPosition({
          x: Math.min(rect.left + rect.width / 2, window.innerWidth - 220),
          y: Math.min(rect.bottom + 12, window.innerHeight - 400),
        })
      }
    }

    document.addEventListener("mousemove", handleMouseMove, true)
    document.addEventListener("click", handleClick, true)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true)
      document.removeEventListener("click", handleClick, true)
    }
  }, [mode, selectedElement, hoveredElement, setHoveredElement])

  // Escape key to cancel
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedElement) {
          setSelectedElement(null)
          setPopoverPosition(null)
        } else if (mode === "annotate") {
          setMode("off")
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [mode, selectedElement, setMode])

  async function handleSubmit() {
    if (!title.trim() || !selectedElement) return

    setSubmitting(true)
    try {
      const rect = selectedElement.getBoundingClientRect()
      await createInsight({
        elementSelector: getElementSelector(selectedElement),
        elementText: getElementText(selectedElement),
        elementRect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        category,
        title: title.trim(),
        bodyText: body.trim() || undefined,
      })
      setSubmitted(true)
      setTimeout(() => {
        setSelectedElement(null)
        setPopoverPosition(null)
        setSubmitted(false)
      }, 1500)
    } finally {
      setSubmitting(false)
    }
  }

  if (mode !== "annotate") return null

  return (
    <>
      {/* Full-screen subtle overlay to indicate annotation mode */}
      <div
        data-insight-overlay
        className="fixed inset-0 z-[9990] pointer-events-none"
        style={{
          background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(59,130,246,0.02) 10px, rgba(59,130,246,0.02) 20px)",
        }}
      />

      {/* Mode indicator banner */}
      <div
        data-insight-overlay
        className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 px-4 py-2 text-white shadow-lg"
      >
        <MessageSquarePlus className="size-4" />
        <span className="text-sm font-medium">
          Annotation Mode — Click on any element to leave feedback
        </span>
        <span className="text-xs opacity-70">(Press Esc to exit)</span>
        <Button
          data-insight-overlay
          size="sm"
          variant="ghost"
          className="ml-2 h-6 text-white/90 hover:text-white hover:bg-white/20"
          onClick={() => {
            setMode("off")
            setSelectedElement(null)
            setPopoverPosition(null)
          }}
        >
          <X className="size-3.5 mr-1" />
          Exit
        </Button>
      </div>

      {/* Highlight overlay around hovered/selected element */}
      {highlightRect && (
        <div
          ref={highlightOverlayRef}
          data-insight-overlay
          className={cn(
            "fixed z-[9995] pointer-events-none rounded-md border-2 transition-all duration-150",
            selectedElement
              ? "border-blue-500 bg-blue-500/10 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
              : "border-blue-400/60 bg-blue-400/5"
          )}
          style={{
            left: highlightRect.left - 3,
            top: highlightRect.top - 3,
            width: highlightRect.width + 6,
            height: highlightRect.height + 6,
          }}
        />
      )}

      {/* Comment popover */}
      {selectedElement && popoverPosition && (
        <div
          ref={popoverRef}
          data-insight-popover
          className="fixed z-[9999] w-[380px] rounded-xl border border-gray-200 bg-white shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            left: Math.max(16, Math.min(popoverPosition.x - 190, window.innerWidth - 396)),
            top: Math.max(60, Math.min(popoverPosition.y, window.innerHeight - 420)),
          }}
        >
          {submitted ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 mb-3">
                <svg className="size-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">Insight Saved</p>
              <p className="mt-1 text-sm text-gray-500">Thank you for your feedback!</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50">
                    <MessageSquarePlus className="size-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Add Insight</h3>
                </div>
                <Button
                  data-insight-popover
                  size="sm"
                  variant="ghost"
                  className="size-7 p-0"
                  onClick={() => {
                    setSelectedElement(null)
                    setPopoverPosition(null)
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Selected element preview */}
              <div className="border-b bg-gray-50 px-4 py-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1">
                  Selected element
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 font-mono">
                  {getElementText(selectedElement) || getElementSelector(selectedElement)}
                </p>
              </div>

              {/* Form */}
              <div className="p-4 space-y-3">
                {/* Category selector */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        data-insight-popover
                        type="button"
                        onClick={() => setCategory(opt.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                          category === opt.id
                            ? opt.color + " ring-1 ring-offset-1"
                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                        )}
                        style={category === opt.id ? { ringColor: "currentColor" } : undefined}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Title *</label>
                  <input
                    data-insight-popover
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of your insight..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && title.trim()) {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                  />
                </div>

                {/* Body (optional) */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Details <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    data-insight-popover
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Describe the change you'd like to see, or explain why this matters..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-4 py-3 rounded-b-xl">
                <Button
                  data-insight-popover
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedElement(null)
                    setPopoverPosition(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  data-insight-popover
                  size="sm"
                  disabled={!title.trim() || submitting}
                  onClick={handleSubmit}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  {submitting ? "Saving..." : "Save Insight"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Custom cursor style when in annotate mode (no selection active) */}
      {!selectedElement && (
        <style>{`
          body { cursor: crosshair !important; }
          body * { cursor: crosshair !important; }
          [data-insight-overlay] { cursor: default !important; }
          [data-insight-overlay] * { cursor: default !important; }
          [data-insight-popover] { cursor: default !important; }
          [data-insight-popover] * { cursor: default !important; }
          [data-insight-toggle] { cursor: pointer !important; }
          [data-insight-toggle] * { cursor: pointer !important; }
          [data-insight-panel] { cursor: default !important; }
          [data-insight-panel] * { cursor: default !important; }
        `}</style>
      )}
    </>
  )
}
