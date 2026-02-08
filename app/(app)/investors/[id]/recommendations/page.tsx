"use client"

import * as React from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"
import { RoleRedirect } from "@/components/security/role-redirect"

export default function RecommendationsPage({ params }: { params: Promise<{ id: string }> }) {
  const [investorId, setInvestorId] = React.useState<string | null>(null)

  React.useEffect(() => {
    params.then((p) => {
      setInvestorId(p.id)
    })
  }, [params])

  if (!investorId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/investors/${investorId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <PageHeader
            title="AI Property Recommendations"
            subtitle="Review and select properties to recommend to this investor"
          />
        </div>

        {/* Empty State */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Suggestions</CardTitle>
            </div>
            <CardDescription>
              Properties that match the investor&apos;s mandate, budget, and portfolio constraints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">No recommendations yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                AI-powered property recommendations will appear here once listings and investor mandates are configured.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href={`/investors/${investorId}`}>Back to Investor</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

