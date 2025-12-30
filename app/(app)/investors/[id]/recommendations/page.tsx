"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react"
import Link from "next/link"
import { buildRecommendationBundle } from "@/lib/real-estate"
import { mockProperties } from "@/lib/mock-data"
import { CounterfactualsPanel } from "@/components/recommendations/counterfactuals-panel"
import { RoleRedirect } from "@/components/security/role-redirect"
import { addToShortlist } from "@/lib/property-store"
import { toast } from "sonner"
import type { PortfolioOpportunity } from "@/lib/real-estate"

export default function RecommendationsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [investorId, setInvestorId] = React.useState<string | null>(null)
  const [selectedProperties, setSelectedProperties] = React.useState<Set<string>>(new Set())
  const [bundle, setBundle] = React.useState<ReturnType<typeof buildRecommendationBundle> | null>(null)

  React.useEffect(() => {
    params.then((p) => {
      setInvestorId(p.id)
      const bundle = buildRecommendationBundle({ investorId: p.id })
      setBundle(bundle)
      // Pre-select all recommended properties
      setSelectedProperties(new Set(bundle.recommended.map((r) => r.propertyId)))
    })
  }, [params])

  const handleToggleProperty = (propertyId: string) => {
    setSelectedProperties((prev) => {
      const next = new Set(prev)
      if (next.has(propertyId)) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
      }
      return next
    })
  }

  const handleAddCounterfactual = (propertyId: string) => {
    setSelectedProperties((prev) => new Set([...prev, propertyId]))
    toast.success("Property added to recommendation", {
      description: "This property was excluded but added manually.",
    })
  }

  const handleSendRecommendation = () => {
    if (!investorId) return

    // Add selected properties to shortlist
    selectedProperties.forEach((propertyId) => {
      addToShortlist(propertyId, investorId)
    })

    toast.success("Recommendation sent", {
      description: `${selectedProperties.size} properties added to investor's shortlist.`,
    })

    router.push(`/investors/${investorId}`)
  }

  if (!bundle || !investorId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading recommendations...</div>
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

        {/* AI Suggestions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Suggestions</CardTitle>
              <Badge variant="secondary">{bundle.recommended.length} recommended</Badge>
            </div>
            <CardDescription>
              Properties that match the investor&apos;s mandate, budget, and portfolio constraints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bundle.recommended.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No properties match the criteria.</p>
              </div>
            ) : (
              bundle.recommended.map((rec) => {
                const property = mockProperties.find((p) => p.id === rec.propertyId)
                if (!property) return null

                return (
                  <RecommendationCard
                    key={rec.propertyId}
                    opportunity={rec}
                    property={property}
                    isSelected={selectedProperties.has(rec.propertyId)}
                    onToggle={() => handleToggleProperty(rec.propertyId)}
                  />
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Counterfactuals Panel */}
        <CounterfactualsPanel bundle={bundle} onAddCounterfactual={handleAddCounterfactual} />

        {/* Actions */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
          <div>
            <p className="font-medium">{selectedProperties.size} properties selected</p>
            <p className="text-sm text-muted-foreground">Ready to send recommendation</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/investors/${investorId}`}>Cancel</Link>
            </Button>
            <Button onClick={handleSendRecommendation} disabled={selectedProperties.size === 0}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Send Recommendation
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function RecommendationCard({
  opportunity,
  property,
  isSelected,
  onToggle,
}: {
  opportunity: PortfolioOpportunity
  property: (typeof mockProperties)[number]
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <Card className={isSelected ? "border-primary bg-primary/5" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold">{property.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {property.area} • {property.type}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="secondary">Score {opportunity.score}</Badge>
                <p className="mt-1 text-sm font-medium">AED {(property.price / 1000000).toFixed(1)}M</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.reasons.map((reason, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/properties/${property.id}`}>View Details</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

