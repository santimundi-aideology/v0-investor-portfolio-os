"use client"

import { useApp } from "@/components/providers/app-provider"
import { PageHeader } from "@/components/layout/page-header"
import { AIUsageDashboard } from "@/components/admin/ai-usage-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminAIUsagePage() {
  const { platformRole } = useApp()

  if (platformRole !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need super admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Usage"
        subtitle="Platform-wide AI token consumption, costs, and trends"
      />
      <AIUsageDashboard />
    </div>
  )
}
