"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { useAPI } from "@/lib/hooks/use-api"
import { InvestorDetail } from "@/components/investors/investor-detail"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"
import "@/lib/init-investor-store"
import { useInvestor } from "@/lib/investor-store"
import type { DealRoom, Memo, ShortlistItem, Task } from "@/lib/types"

// Raw DB memo shape from /api/memos
type RawMemo = {
  id: string
  investor_id: string
  listing_id: string | null
  state: string
  current_version: number
  created_at: string
  updated_at: string
}

// Raw shortlist item from /api/investors/[id]/shortlist
type RawShortlistItem = {
  id: string
  listingId: string
  matchScore: number | null
  matchExplanation: string | null
  agentNotes: string | null
  rank: number
  addedAt: string
  property: {
    title: string | null
    area: string | null
    type: string | null
    price: number | null
    size: number | null
    bedrooms: number | null
    status: string | null
  } | null
}

export default function InvestorDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const canonicalId = React.useMemo(() => {
    if (!id) return ""
    return /^\d+$/.test(id) ? `inv-${id}` : id
  }, [id])

  const investor = useInvestor(canonicalId)

  // Fetch deal rooms from the CRM API
  const { data: dealRoomsData } = useAPI<DealRoom[]>(
    canonicalId ? `/api/deal-rooms?investorId=${canonicalId}` : null
  )
  const dealRooms = dealRoomsData ?? []

  // Fetch shortlist items from API
  const { data: shortlistData } = useAPI<{ items: RawShortlistItem[] }>(
    canonicalId ? `/api/investors/${canonicalId}/shortlist` : null
  )
  const shortlist: ShortlistItem[] = React.useMemo(() => {
    return (shortlistData?.items ?? []).map((item) => ({
      id: item.id,
      investorId: canonicalId,
      propertyId: item.listingId,
      property: {
        id: item.listingId,
        title: item.property?.title ?? "Unknown",
        area: item.property?.area ?? "",
        type: (item.property?.type ?? "property") as "villa" | "apartment" | "townhouse" | "penthouse" | "plot" | "commercial",
        price: item.property?.price ?? 0,
        size: item.property?.size ?? 0,
        bedrooms: item.property?.bedrooms ?? 0,
        bathrooms: 0,
        roi: 0,
        imageUrl: "",
        status: (item.property?.status ?? "draft") as "draft" | "underwriting" | "ready" | "archived",
        features: [],
      },
      score: item.matchScore ?? 0,
      status: "pending" as const,
      notes: item.agentNotes ?? undefined,
      addedAt: item.addedAt,
    }))
  }, [shortlistData, canonicalId])

  // Fetch memos from CRM API (works for all internal roles)
  const { data: rawMemos } = useAPI<RawMemo[]>(
    canonicalId ? `/api/memos` : null
  )
  const memos: Memo[] = React.useMemo(() => {
    // Filter to just this investor's memos and transform to Memo type
    const investorMemos = (rawMemos ?? []).filter((m) => m.investor_id === canonicalId)
    return investorMemos.map((m) => ({
      id: m.id,
      title: `IC Memo`,
      investorId: m.investor_id,
      investorName: investor?.name ?? "",
      propertyId: m.listing_id ?? "",
      propertyTitle: m.listing_id ? `Property ${m.listing_id.slice(0, 8)}` : "General",
      status: (m.state === "sent" || m.state === "opened" ? "sent" : m.state) as Memo["status"],
      content: "",
      createdAt: m.created_at?.split("T")[0] ?? "",
      updatedAt: m.updated_at?.split("T")[0] ?? "",
    }))
  }, [rawMemos, canonicalId, investor?.name])

  // Fetch tasks from API
  const { data: tasks } = useAPI<Task[]>(canonicalId ? `/api/tasks?investorId=${canonicalId}` : null)

  if (!investor) {
    return (
      <EmptyState
        title="Investor not found"
        description="This investor may have been deleted or the link is incorrect."
        icon={<Shield className="size-5" />}
        action={
          <Button asChild>
            <Link href="/investors">Back to investors</Link>
          </Button>
        }
      />
    )
  }

  return (
    <InvestorDetail
      investor={investor}
      shortlist={shortlist}
      memos={memos}
      dealRooms={dealRooms}
      tasks={tasks ?? []}
    />
  )
}
