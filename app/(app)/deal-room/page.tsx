"use client"

import * as React from "react"
import { FolderKanban, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DealPipelineKanban } from "@/components/deals/deal-pipeline-kanban"
import { useAPI } from "@/lib/hooks/use-api"
import type { DealRoom } from "@/lib/types"

export default function DealRoomsIndexPage() {
  const { data: deals, error, isLoading, mutate } = useAPI<DealRoom[]>("/api/deal-rooms")

  const handleMoveStage = React.useCallback(
    async (dealId: string, newStage: DealRoom["status"]) => {
      try {
        const res = await fetch(`/api/deal-rooms/${dealId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStage }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to update stage")
        }
        toast.success("Deal stage updated")
        mutate()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update deal stage")
      }
    },
    [mutate],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <FolderKanban className="size-5" />
            </span>
            <span>Deal Pipeline</span>
          </span>
        }
        subtitle="All deals across investors — drag to progress."
      />

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading deal pipeline...</span>
          </CardContent>
        </Card>
      )}

      {error && !isLoading && (
        <Card>
          <CardContent className="py-16">
            <EmptyState
              title="Failed to load deals"
              description="There was a problem fetching your deal rooms. Please try again."
              icon={<FolderKanban className="size-5" />}
              action={
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  Retry
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && deals && deals.length === 0 && (
        <Card>
          <CardContent className="py-16">
            <EmptyState
              title="No deal rooms yet"
              description="Deal rooms will appear here once created. Start by matching an investor with a property to open a new deal."
              icon={<FolderKanban className="size-5" />}
            />
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && deals && deals.length > 0 && (
        <DealPipelineKanban
          deals={deals}
          onMoveStage={handleMoveStage}
        />
      )}
    </div>
  )
}
