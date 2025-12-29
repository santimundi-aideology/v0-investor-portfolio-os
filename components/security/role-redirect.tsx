"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { UserRole } from "@/lib/types"
import { useApp } from "@/components/providers/app-provider"

export function RoleRedirect({
  allow,
  redirectTo,
}: {
  allow: UserRole[]
  redirectTo: string
}) {
  const router = useRouter()
  const { role } = useApp()

  React.useEffect(() => {
    if (!allow.includes(role)) router.replace(redirectTo)
  }, [allow, redirectTo, role, router])

  if (!allow.includes(role)) return null
  return null
}


