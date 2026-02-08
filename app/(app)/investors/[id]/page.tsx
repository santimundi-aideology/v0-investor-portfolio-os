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
import type { Memo } from "@/lib/types"
import type { Task } from "@/lib/types"

export default function InvestorDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const canonicalId = React.useMemo(() => {
    if (!id) return ""
    return /^\d+$/.test(id) ? `inv-${id}` : id
  }, [id])

  const investor = useInvestor(canonicalId)

  // Deal rooms and shortlist tables don't exist yet - use empty arrays
  const dealRooms: never[] = []
  const shortlist: never[] = []

  // Fetch memos and tasks from API
  const { data: memos } = useAPI<Memo[]>(canonicalId ? `/api/investor/memos?investorId=${canonicalId}` : null)
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

  return <InvestorDetail investor={investor} shortlist={shortlist} memos={memos ?? []} dealRooms={dealRooms} tasks={tasks ?? []} />
}
