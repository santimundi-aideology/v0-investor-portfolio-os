"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { getDealRoomsByInvestorId, getMemosByInvestorId, getShortlistByInvestorId, getTasksByInvestorId } from "@/lib/mock-data"
import { InvestorDetail } from "@/components/investors/investor-detail"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"
import "@/lib/init-investor-store"
import { useInvestor } from "@/lib/investor-store"

export default function InvestorDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const canonicalId = React.useMemo(() => {
    if (!id) return ""
    return /^\d+$/.test(id) ? `inv-${id}` : id
  }, [id])

  const investor = useInvestor(canonicalId)

  const shortlist = React.useMemo(() => getShortlistByInvestorId(canonicalId), [canonicalId])
  const memos = React.useMemo(() => getMemosByInvestorId(canonicalId), [canonicalId])
  const tasks = React.useMemo(() => getTasksByInvestorId(canonicalId), [canonicalId])
  const dealRooms = React.useMemo(() => getDealRoomsByInvestorId(canonicalId), [canonicalId])

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

  return <InvestorDetail investor={investor} shortlist={shortlist} memos={memos} dealRooms={dealRooms} tasks={tasks} />
}
