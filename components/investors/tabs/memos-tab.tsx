"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Plus, ExternalLink } from "lucide-react"
import type { Memo } from "@/lib/types"

interface MemosTabProps {
  memos: Memo[]
  investorId: string
}

export function MemosTab({ memos, investorId }: MemosTabProps) {
  const [localMemos, setLocalMemos] = useState(memos)

  const handleGenerateMemo = () => {
    const propertyTitle = "New Property Opportunity"
    const investorName = localMemos[0]?.investorName ?? "Investor"
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      title: "Investment Committee Memo - New Property",
      investorId,
      investorName,
      propertyId: "prop-new",
      propertyTitle,
      status: "draft",
      content: "# Draft Investment Committee Memo\n\nThis memo is being prepared...",
      analysis: buildPlaceholderAnalysis(propertyTitle),
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }
    setLocalMemos([newMemo, ...localMemos])
  }

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  }

  if (localMemos.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">No IC memos created yet</p>
          <Button onClick={handleGenerateMemo}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Memo
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleGenerateMemo}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Memo
        </Button>
      </div>
      <div className="grid gap-4">
        {localMemos.map((memo) => (
          <Card key={memo.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{memo.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{memo.propertyTitle}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusColors[memo.status]}>
                  {memo.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Created: {memo.createdAt}</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/memos/${memo.id}`}>
                    View Memo <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Generates sample analysis data for newly created local memos.
 *  TODO: Replace with AI-generated analysis via the /api/memos/generate endpoint. */
function buildPlaceholderAnalysis(propertyTitle: string): Memo["analysis"] {
  return {
    summary: `${propertyTitle} sits inside a walkable, supply-constrained micro-market where thoughtful upgrades can drive both NOI growth and exit value.`,
    keyPoints: [
      "Corner plot within 500 meters of daily-needs retail and transit keeps vacancy structurally low.",
      "Existing floor plan already meets most tenant briefs; cosmetic upgrades focus on kitchens, bathrooms, and smart-home layers.",
      "Pricing spread of roughly AED 160 per sq ft versus renovated peers allows capital expenditure recovery plus upside at exit.",
    ],
    neighborhood: {
      name: "Urban Village West",
      grade: "A-",
      profile:
        "Low-rise residential streets with pocket parks, schools, and a neighborhood center anchored by specialty grocers and boutique fitness concepts.",
      highlights: [
        "Six-minute walk to Metro Blue Line extension (2026 delivery).",
        "Two IB curriculum schools and a new pediatric clinic within the district.",
        "Retail mix skews toward lifestyle operators that reinforce premium positioning.",
      ],
      metrics: [
        { label: "Vacancy", value: "3.9%", trend: "↓ 0.4% QoQ" },
        { label: "Avg Rent", value: "AED 210 / sq ft", trend: "+6.1% YoY" },
        { label: "Absorption", value: "180 units (2024)", trend: "Best year in cycle" },
        { label: "Pipeline", value: "95 units (2025)", trend: "70% presold" },
      ],
    },
    property: {
      description:
        "Four-bedroom plus study residence with double-height foyer, wraparound garden, and upgraded shell ready for a bespoke interior package.",
      condition: "Structurally pristine with recent MEP servicing; kitchens and bathrooms await modernization.",
      specs: [
        { label: "Bedrooms", value: "4 + Study + Maid" },
        { label: "Built-up Area", value: "5,000 sq ft" },
        { label: "Plot Size", value: "6,200 sq ft" },
        { label: "Parking", value: "2 covered + 2 external" },
        { label: "Exposure", value: "Corner, park-facing" },
        { label: "Ceiling Height", value: "3.2 m" },
      ],
      highlights: [
        "12 m frontage enables pool + cabana addition without special approvals.",
        "North/south cross-ventilation plus mature landscaping keep cooling loads low.",
        "Existing smart-home pre-wiring shortens upgrade timeline.",
      ],
    },
    market: {
      overview:
        "Family villa demand remains resilient as buyers trade up from marina apartments and value proximity to new schools and healthcare.",
      drivers: [
        "Blue Line metro extension compresses CBD commute times below 20 minutes.",
        "Corporate relocation pipeline favors turnkey four-bedroom villas.",
        "Mortgage subsidy programs for nationals sustaining purchasing power despite higher rates.",
      ],
      supply: "Only 95 comparable villas delivering through 2025, predominantly mid-terrace layouts.",
      demand: "Corner or park-facing plots with privacy hedging receive bidding wars from relocation agents.",
      absorption: "Average days on market sits at 32 vs 49 citywide.",
    },
    pricing: {
      askingPrice: 6_100_000,
      pricePerSqft: 1_020,
      marketAvgPricePerSqft: 1_180,
      recommendedOffer: 5_900_000,
      valueAddBudget: 350_000,
      stabilizedValue: 6_600_000,
      rentCurrent: 280_000,
      rentPotential: 340_000,
      irr: 0.165,
      equityMultiple: 1.72,
    },
    comparables: [
      {
        name: "Urban Village West – Park Row",
        distance: "0.3 km",
        size: "4,800 sq ft",
        closingDate: "Oct 2024",
        price: 6_450_000,
        pricePerSqft: 1_344,
        note: "Fully renovated with pool; smaller plot.",
      },
      {
        name: "Hatherley Villas – Corner Type 4",
        distance: "0.6 km",
        size: "5,200 sq ft",
        closingDate: "Jun 2024",
        price: 6_950_000,
        pricePerSqft: 1_337,
        note: "Brand new build with developer warranty.",
      },
      {
        name: "Garden Avenue Residences",
        distance: "0.9 km",
        size: "4,600 sq ft",
        closingDate: "Dec 2024",
        price: 5_600_000,
        pricePerSqft: 1_217,
        note: "Interior plot, dated interiors.",
      },
    ],
    strategy: {
      plan: "Execute 10-week cosmetic + smart-home program, lock a premium rental prior to completion, and refinance to recycle equity.",
      holdPeriod: "4-5 years (value-add).",
      exit: "Refinance at 65% LTV once NOI reflects AED 340k rent, or sell to yield buyer targeting 6.3% net.",
      focusPoints: [
        "Secure contractor bids before closing to keep downtime sub-60 days.",
        "Prioritize kitchen + primary suite upgrades for tenant WOW factor.",
        "Partner with relocation brokers early to pre-lease at target rent.",
      ],
    },
  }
}
