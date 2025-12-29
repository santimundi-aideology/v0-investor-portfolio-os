"use client"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { ScrollText } from "lucide-react"

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle="Placeholder: activity history for compliance and ops." />
      <EmptyState
        title="No audit entries yet"
        description="Events like exports, role changes, and deal-room actions will appear here."
        icon={<ScrollText className="size-5" />}
        action={<Button type="button">Export log (placeholder)</Button>}
      />
    </div>
  )
}


