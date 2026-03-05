"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  OpportunitiesFavouritesSection,
  getStoredLinkFavourites,
  setStoredLinkFavourites,
  type LinkFavourite,
  type FavouriteStatus,
} from "@/components/investor/opportunities-favourites-section"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"

export default function MyFavouritesPage() {
  const { scopedInvestorId } = useApp()
  const [linkFavourites, setLinkFavourites] = React.useState<LinkFavourite[]>([])

  React.useEffect(() => {
    setLinkFavourites(getStoredLinkFavourites(scopedInvestorId ?? null))
  }, [scopedInvestorId])

  const { data: apiData, mutate } = useAPI<{ opportunities: unknown[] }>("/api/investor/opportunities")
  const opportunities = apiData?.opportunities ?? []
  const favouriteOpps = (opportunities as Array<{
    id: string
    decision: string
    decisionAt: string | null
    status: string
    matchScore: number | null
    matchReasons: string[]
    memoId: string | null
    property: unknown
  }>).filter((o) => o.decision === "interested" || o.decision === "very_interested")

  const handleDecision = async (id: string, decision: string) => {
    try {
      await fetch(`/api/investor/opportunities/${id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: decision === "pass" ? "not_interested" : decision }),
      })
      mutate()
    } catch (err) {
      console.error("Failed to update decision:", err)
    }
  }

  const handleAddLinkFavourite = (item: {
    url: string
    title: string
    pros: string[]
    cons: string[]
  }) => {
    const newItem: LinkFavourite = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...item,
      status: "new",
      addedAt: new Date().toISOString(),
    }
    const next = [...linkFavourites, newItem]
    setLinkFavourites(next)
    setStoredLinkFavourites(scopedInvestorId ?? null, next)
  }

  const handleRemoveLinkFavourite = (id: string) => {
    const next = linkFavourites.filter((f) => f.id !== id)
    setLinkFavourites(next)
    setStoredLinkFavourites(scopedInvestorId ?? null, next)
  }

  const handleLinkFavouriteStatusChange = (id: string, status: FavouriteStatus) => {
    const next = linkFavourites.map((f) =>
      f.id === id ? { ...f, status } : f
    )
    setLinkFavourites(next)
    setStoredLinkFavourites(scopedInvestorId ?? null, next)
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      <header className="border-b border-gray-100 bg-white">
        <div className="w-full py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/opportunities">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">My Favourites</h1>
              <p className="text-sm text-muted-foreground">
                Add by link for AI pros & cons, or from realtor suggestions
              </p>
            </div>
          </div>
        </div>
      </header>
      <div className="w-full py-6">
        <OpportunitiesFavouritesSection
          opportunities={favouriteOpps.map((o) => ({
            id: o.id,
            decision: o.decision,
            decisionAt: o.decisionAt,
            status: o.status,
            matchScore: o.matchScore,
            matchReasons: o.matchReasons ?? [],
            memoId: o.memoId,
            property: o.property,
          }))}
          linkFavourites={linkFavourites}
          onDecision={handleDecision}
          onAddLinkFavourite={handleAddLinkFavourite}
          onRemoveLinkFavourite={handleRemoveLinkFavourite}
          onLinkFavouriteStatusChange={handleLinkFavouriteStatusChange}
          investorId={scopedInvestorId ?? null}
        />
      </div>
    </div>
  )
}
