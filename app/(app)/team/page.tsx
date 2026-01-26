"use client"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { UsersRound } from "lucide-react"

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Team" subtitle="Placeholder admin area for seats & permissions." />
      <EmptyState
        title="Invite your team"
        description="Add advisors, analysts, and ops users to collaborate inside your org."
        icon={<UsersRound className="size-5" />}
        action={<Button type="button">Invite member (placeholder)</Button>}
      />
    </div>
  )
}
