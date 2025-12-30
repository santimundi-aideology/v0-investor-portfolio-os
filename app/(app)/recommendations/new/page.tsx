"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"

import { RoleRedirect } from "@/components/security/role-redirect"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { buildRecommendationBundle } from "@/lib/real-estate"
import { createRecommendation, supersede } from "@/lib/recommendation-store"
import { useApp } from "@/components/providers/app-provider"

export default function NewRecommendationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role } = useApp()

  const investorId = searchParams.get("investorId")
  const supersedeId = searchParams.get("supersede")

  React.useEffect(() => {
    if (!investorId) return

    // Minimal creation flow: take the existing AI bundle output and turn it into a DRAFT recommendation.
    const bundle = buildRecommendationBundle({ investorId })
    const rec = createRecommendation({
      investorId,
      createdByRole: role === "owner" || role === "admin" ? role : "realtor",
      trigger: bundle.source,
      title: "New recommendation (draft)",
      summary: "",
      propertyIds: bundle.recommended.map((r) => r.propertyId).slice(0, 3),
      counterfactuals: bundle.counterfactuals.slice(0, 5),
    })

    if (supersedeId) {
      supersede(supersedeId, rec.id)
    }

    toast.success("Draft created", { description: "Opening recommendation detail…" })
    router.replace(`/recommendations/${rec.id}`)
  }, [investorId, role, router, supersedeId])

  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />
      <div className="space-y-6">
        <PageHeader title="New Recommendation" subtitle="Creating a draft recommendation…" />
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Preparing initial set from mandate + portfolio constraints (demo).
            </div>
            {!investorId ? (
              <div className="rounded-md border p-3 text-sm">
                Missing <code>investorId</code>. Go back to an investor and click “+ New Recommendation”.
                <div className="mt-3">
                  <Button variant="outline" asChild>
                    <Link href="/investors">Back to investors</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Redirecting…</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}


