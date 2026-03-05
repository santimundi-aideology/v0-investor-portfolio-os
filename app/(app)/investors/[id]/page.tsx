"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Shield } from "lucide-react"

import { useAPI } from "@/lib/hooks/use-api"
import { InvestorDetail } from "@/components/investors/investor-detail"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import type { DealRoom, Investor, Memo, ShortlistItem, Task } from "@/lib/types"

type RawMemo = {
  id: string
  investor_id: string
  listing_id: string | null
  state: string
  current_version: number
  created_at: string
  updated_at: string
  title?: string
  propertyTitle?: string
  score?: number | null
  recommendation?: string | null
}

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

type InvestorAPIResponse = {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  avatar?: string
  status: "active" | "pending" | "inactive"
  mandate?: Investor["mandate"]
  description?: string
  createdAt: string
  lastContact?: string
  totalDeals: number
  thesisReturnStyle?: Investor["thesisReturnStyle"]
  thesisHoldPeriod?: string
  thesisPreferredExits?: string[]
  thesisNotes?: string
}

function mapToInvestor(raw: InvestorAPIResponse): Investor {
  return {
    id: raw.id,
    name: raw.name,
    company: raw.company ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    avatar: raw.avatar ?? "/placeholder-user.jpg",
    status: raw.status,
    mandate: raw.mandate ?? undefined,
    description: raw.description,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    lastContact: raw.lastContact ?? new Date().toISOString(),
    totalDeals: raw.totalDeals ?? 0,
    thesisReturnStyle: raw.thesisReturnStyle,
    thesisHoldPeriod: raw.thesisHoldPeriod,
    thesisPreferredExits: raw.thesisPreferredExits,
    thesisNotes: raw.thesisNotes,
  }
}

export default function InvestorDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const router = useRouter()

  // This page exists at /investors/[id] — redirect realtor/manager users to
  // the canonical /realtor/investors/[id] path which has the correct layout.
  React.useEffect(() => {
    router.replace(`/realtor/investors/${id}`)
  }, [id, router])

  const { data: investorRaw, isLoading: investorLoading } =
    useAPI<InvestorAPIResponse>(id ? `/api/investors/${id}` : null)

  const investor: Investor | null = React.useMemo(
    () => (investorRaw ? mapToInvestor(investorRaw) : null),
    [investorRaw]
  )

  const { data: dealRoomsData } = useAPI<DealRoom[]>(
    id ? `/api/deal-rooms?investorId=${id}` : null
  )
  const dealRooms = dealRoomsData ?? []

  const { data: shortlistData } = useAPI<{ items: RawShortlistItem[] }>(
    id ? `/api/investors/${id}/shortlist` : null
  )
  const shortlist: ShortlistItem[] = React.useMemo(() => {
    return (shortlistData?.items ?? []).map((item) => ({
      id: item.id,
      investorId: id,
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
  }, [shortlistData, id])

  const { data: rawMemos } = useAPI<RawMemo[]>(id ? `/api/memos` : null)
  const memos: Memo[] = React.useMemo(() => {
    const stateToStatus: Record<string, Memo["status"]> = {
      draft: "draft",
      pending_review: "review",
      ready: "approved",
      sent: "sent",
      opened: "sent",
      decided: "sent",
    }

    const investorMemos = (rawMemos ?? []).filter((m) => m.investor_id === id)
    return investorMemos
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map((m) => ({
        id: m.id,
        title: m.title || "IC Memo",
        investorId: m.investor_id,
        investorName: investor?.name ?? "",
        propertyId: m.listing_id ?? "",
        propertyTitle: m.propertyTitle || "Property",
        status: stateToStatus[m.state] ?? "draft",
        content: "",
        createdAt: m.created_at?.split("T")[0] ?? "",
        updatedAt: m.updated_at?.split("T")[0] ?? "",
      }))
  }, [rawMemos, id, investor?.name])

  const { data: tasks } = useAPI<Task[]>(id ? `/api/tasks?investorId=${id}` : null)

  if (investorLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

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
