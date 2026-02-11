"use client"

import * as React from "react"
import Link from "next/link"
import { Shield } from "lucide-react"

import { useApp } from "@/components/providers/app-provider"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"

export function ScopedInvestorGuard({
  investorId,
  children,
}: {
  investorId: string
  children: React.ReactNode
}) {
  const { role, scopedInvestorId } = useApp()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Avoid SSR/client mismatch: app context may differ before hydration.
  if (!isMounted) return null

  // Internal roles are not scoped.
  if (role !== "investor") return <>{children}</>

  // Investor persona must be scoped to their own investorId.
  if (!scopedInvestorId) return <>{children}</>
  if (investorId === scopedInvestorId) return <>{children}</>

  return (
    <EmptyState
      title="Access restricted"
      description="Investor access is scoped only to your own portfolio."
      icon={<Shield className="size-5" />}
      action={
        <Button asChild>
          <Link href="/real-estate">Go to my portfolio</Link>
        </Button>
      }
    />
  )
}


