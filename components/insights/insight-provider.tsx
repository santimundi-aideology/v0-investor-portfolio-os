"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import type { UserInsight, InsightCategory } from "@/lib/types"
import { useApp } from "@/components/providers/app-provider"

type InsightMode = "off" | "annotate" | "view"

interface InsightContextValue {
  /** Current interaction mode */
  mode: InsightMode
  setMode: (mode: InsightMode) => void
  /** Toggle annotation mode on/off */
  toggleAnnotateMode: () => void
  /** All insights for the current page */
  insights: UserInsight[]
  /** Loading state */
  isLoading: boolean
  /** Create a new insight */
  createInsight: (data: {
    elementSelector?: string
    elementText?: string
    elementRect?: { x: number; y: number; width: number; height: number }
    category: InsightCategory
    title: string
    bodyText?: string
  }) => Promise<UserInsight | null>
  /** Update an insight */
  updateInsight: (id: string, data: Partial<{ status: string; title: string; bodyText: string; category: string }>) => Promise<void>
  /** Delete an insight */
  deleteInsight: (id: string) => Promise<void>
  /** Refresh insights from server */
  refreshInsights: () => void
  /** Currently hovered element info (when in annotate mode) */
  hoveredElement: HTMLElement | null
  setHoveredElement: (el: HTMLElement | null) => void
  /** Total insight count for badge */
  totalCount: number
}

const InsightContext = React.createContext<InsightContextValue | null>(null)

export function InsightProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, tenantId } = useApp()

  const [mode, setMode] = React.useState<InsightMode>("off")
  const [insights, setInsights] = React.useState<UserInsight[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hoveredElement, setHoveredElement] = React.useState<HTMLElement | null>(null)

  // Fetch insights for current page
  const fetchInsights = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (pathname) params.set("pagePath", pathname)
      if (tenantId) params.set("tenantId", tenantId)

      const res = await fetch(`/api/insights?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights || [])
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err)
    } finally {
      setIsLoading(false)
    }
  }, [pathname, tenantId])

  // Fetch on mount and when page changes
  React.useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const createInsight = React.useCallback(
    async (data: {
      elementSelector?: string
      elementText?: string
      elementRect?: { x: number; y: number; width: number; height: number }
      category: InsightCategory
      title: string
      bodyText?: string
    }): Promise<UserInsight | null> => {
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pagePath: pathname,
            elementSelector: data.elementSelector,
            elementText: data.elementText,
            elementRect: data.elementRect,
            category: data.category,
            title: data.title,
            bodyText: data.bodyText,
            metadata: {
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              userAgent: navigator.userAgent,
            },
          }),
        })

        if (res.ok) {
          const result = await res.json()
          const newInsight = result.insight as UserInsight
          setInsights((prev) => [newInsight, ...prev])
          return newInsight
        }
        return null
      } catch (err) {
        console.error("Failed to create insight:", err)
        return null
      }
    },
    [pathname]
  )

  const updateInsight = React.useCallback(
    async (id: string, data: Partial<{ status: string; title: string; bodyText: string; category: string }>) => {
      try {
        const res = await fetch(`/api/insights/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (res.ok) {
          const result = await res.json()
          setInsights((prev) =>
            prev.map((i) => (i.id === id ? { ...i, ...result.insight } : i))
          )
        }
      } catch (err) {
        console.error("Failed to update insight:", err)
      }
    },
    []
  )

  const deleteInsight = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/insights/${id}`, { method: "DELETE" })
      if (res.ok) {
        setInsights((prev) => prev.filter((i) => i.id !== id))
      }
    } catch (err) {
      console.error("Failed to delete insight:", err)
    }
  }, [])

  const toggleAnnotateMode = React.useCallback(() => {
    setMode((prev) => (prev === "annotate" ? "off" : "annotate"))
    setHoveredElement(null)
  }, [])

  const value = React.useMemo<InsightContextValue>(
    () => ({
      mode,
      setMode,
      toggleAnnotateMode,
      insights,
      isLoading,
      createInsight,
      updateInsight,
      deleteInsight,
      refreshInsights: fetchInsights,
      hoveredElement,
      setHoveredElement,
      totalCount: insights.length,
    }),
    [mode, toggleAnnotateMode, insights, isLoading, createInsight, updateInsight, deleteInsight, fetchInsights, hoveredElement]
  )

  return (
    <InsightContext.Provider value={value}>{children}</InsightContext.Provider>
  )
}

export function useInsights() {
  const ctx = React.useContext(InsightContext)
  if (!ctx) throw new Error("useInsights must be used within InsightProvider")
  return ctx
}
