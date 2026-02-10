"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { useApp } from "@/components/providers/app-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default function AdminDashboardPage() {
  const { platformRole } = useApp()
  const router = useRouter()

  const handleAddCompany = useCallback(() => {
    router.push("/admin/organizations")
  }, [router])

  const handleInviteUser = useCallback(() => {
    router.push("/admin/users")
  }, [router])

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
        title="Admin Dashboard"
        subtitle="Platform overview and key metrics"
      />
      <AdminDashboard
        onAddCompany={handleAddCompany}
        onInviteUser={handleInviteUser}
      />
    </div>
  )
}
