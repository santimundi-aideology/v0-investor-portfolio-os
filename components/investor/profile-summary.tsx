"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_BULLETS = 4
const MIN_SENTENCE_LENGTH = 25

/**
 * Deterministic summarizer: from long description, produce 2–4 bullet points
 * or 2 short sentences. Splits on sentence boundaries and takes first meaningful parts.
 */
export function summarizeDescription(fullText: string): string[] {
  const trimmed = (fullText ?? "").trim()
  if (!trimmed) return []

  // Split into sentences (., !, ? followed by space or end)
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length === 0) {
    // Fallback: split by newlines or long clauses
    const parts = trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    return parts.slice(0, MAX_BULLETS)
  }

  const result: string[] = []
  for (const s of sentences) {
    if (result.length >= MAX_BULLETS) break
    if (s.length >= MIN_SENTENCE_LENGTH) result.push(s)
    else if (result.length > 0) {
      // Append short fragment to last bullet
      const last = result[result.length - 1]
      result[result.length - 1] = last + " " + s
    } else result.push(s)
  }
  return result.slice(0, MAX_BULLETS)
}

export function ProfileSummary({
  fullDescription,
  className,
}: {
  fullDescription: string
  className?: string
}) {
  const [showFull, setShowFull] = React.useState(false)
  const bullets = React.useMemo(
    () => summarizeDescription(fullDescription),
    [fullDescription]
  )
  const hasContent = (fullDescription ?? "").trim().length > 0
  const hasMultipleParts = bullets.length > 1 || (fullDescription ?? "").trim().length > 180

  if (!hasContent) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No description yet. Add one in About me to see a summary here.
      </p>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {!showFull ? (
        <>
          {bullets.length > 0 ? (
            <ul className="list-none space-y-1.5 pl-0">
              {bullets.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {(fullDescription ?? "").trim().slice(0, 200)}
              {(fullDescription ?? "").trim().length > 200 ? "…" : ""}
            </p>
          )}
          {hasMultipleParts && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary hover:bg-primary/10 -ml-1"
              onClick={() => setShowFull(true)}
            >
              <ChevronDown className="size-3.5" />
              Show full description
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {fullDescription.trim()}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-primary hover:bg-primary/10 -ml-1"
            onClick={() => setShowFull(false)}
          >
            <ChevronUp className="size-3.5" />
            Hide
          </Button>
        </>
      )}
    </div>
  )
}
