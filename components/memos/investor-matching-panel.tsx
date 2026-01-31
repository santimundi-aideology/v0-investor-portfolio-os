"use client"

import * as React from "react"
import { Check, Send, Sparkles, User, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Investor } from "@/lib/types"

interface PropertyData {
  title: string
  price: number
  area: string
  propertyType: string
  bedrooms?: number
  yieldPotential?: number
  size?: number
  furnished?: boolean
  completionStatus?: "ready" | "off_plan" | "unknown"
  view?: string
}

interface InvestorMatch {
  investor: Investor
  matchScore: number
  matchReasons: string[]
  mismatches: string[]
}

interface InvestorMatchingPanelProps {
  property: PropertyData
  investors: Investor[]
  onShare?: (investorIds: string[]) => void
  isSharing?: boolean
}

/**
 * Calculate match score between a property and an investor's mandate
 */
function calculateInvestorMatch(property: PropertyData, investor: Investor): InvestorMatch {
  const mandate = investor.mandate
  if (!mandate) {
    return {
      investor,
      matchScore: 30,
      matchReasons: ["No mandate defined"],
      mismatches: ["Cannot evaluate fit without mandate"],
    }
  }

  let score = 0
  const maxScore = 100
  const matchReasons: string[] = []
  const mismatches: string[] = []

  // Price/Budget fit (25 points)
  if (property.price >= mandate.minInvestment && property.price <= mandate.maxInvestment) {
    score += 25
    matchReasons.push(`Within budget (${formatBudget(mandate.minInvestment)} - ${formatBudget(mandate.maxInvestment)})`)
  } else if (property.price < mandate.minInvestment) {
    score += 8
    mismatches.push(`Below minimum (${formatBudget(mandate.minInvestment)})`)
  } else {
    score += 3
    mismatches.push(`Exceeds maximum (${formatBudget(mandate.maxInvestment)})`)
  }

  // Area preference (20 points)
  const preferredAreas = mandate.preferredAreas.map(a => a.toLowerCase())
  const propertyArea = property.area.toLowerCase()
  if (preferredAreas.some(area => propertyArea.includes(area) || area.includes(propertyArea))) {
    score += 20
    matchReasons.push(`Preferred area: ${property.area}`)
  } else {
    score += 3
    mismatches.push(`Area not in preferences`)
  }

  // Property type (15 points)
  const preferredTypes = mandate.propertyTypes.map(t => t.toLowerCase())
  const propType = property.propertyType.toLowerCase()
  if (preferredTypes.some(type => propType.includes(type) || type.includes(propType))) {
    score += 15
    matchReasons.push(`Preferred property type`)
  } else {
    score += 3
    mismatches.push(`Property type mismatch`)
  }

  // Bedroom fit (10 points)
  if (property.bedrooms !== undefined && mandate.preferredBedrooms?.length) {
    if (mandate.preferredBedrooms.includes(property.bedrooms)) {
      score += 10
      matchReasons.push(`${property.bedrooms}BR matches preference`)
    } else {
      score += 3
      mismatches.push(`${property.bedrooms}BR not preferred`)
    }
  } else {
    score += 5 // Neutral if not specified
  }

  // Size fit (8 points)
  if (property.size && (mandate.minSize || mandate.maxSize)) {
    const minOk = !mandate.minSize || property.size >= mandate.minSize
    const maxOk = !mandate.maxSize || property.size <= mandate.maxSize
    if (minOk && maxOk) {
      score += 8
      matchReasons.push(`Size fits requirements`)
    } else {
      score += 2
      mismatches.push(`Size outside preferred range`)
    }
  } else {
    score += 4
  }

  // Yield/Risk alignment (12 points)
  const yieldPct = property.yieldPotential || 6
  if (mandate.riskTolerance === "high" && yieldPct >= 8) {
    score += 12
    matchReasons.push(`High yield (${yieldPct}%) aligns with risk appetite`)
  } else if (mandate.riskTolerance === "medium" && yieldPct >= 5 && yieldPct <= 10) {
    score += 12
    matchReasons.push(`Yield (${yieldPct}%) within target range`)
  } else if (mandate.riskTolerance === "low" && yieldPct <= 7) {
    score += 12
    matchReasons.push(`Stable yield (${yieldPct}%) profile`)
  } else {
    score += 4
    mismatches.push(`Yield/risk profile mismatch`)
  }

  // Completion status (5 points)
  if (mandate.completionStatus) {
    const propStatus = property.completionStatus || "ready"
    if (mandate.completionStatus === "any" || mandate.completionStatus === propStatus) {
      score += 5
    } else {
      score += 1
      mismatches.push(`Prefers ${mandate.completionStatus} properties`)
    }
  } else {
    score += 3
  }

  // Furnished preference (5 points)
  if (mandate.furnishedPreference && mandate.furnishedPreference !== "any" && property.furnished !== undefined) {
    const wantsFurnished = mandate.furnishedPreference === "furnished"
    if (property.furnished === wantsFurnished) {
      score += 5
      matchReasons.push(wantsFurnished ? "Furnished as preferred" : "Unfurnished as preferred")
    } else {
      score += 1
      mismatches.push(`Prefers ${mandate.furnishedPreference}`)
    }
  } else {
    score += 3
  }

  return {
    investor,
    matchScore: Math.min(score, maxScore),
    matchReasons,
    mismatches,
  }
}

function formatBudget(value: number): string {
  if (value >= 1000000) return `AED ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `AED ${(value / 1000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-amber-600"
  return "text-gray-500"
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500"
  if (score >= 60) return "bg-amber-500"
  return "bg-gray-400"
}

export function InvestorMatchingPanel({
  property,
  investors,
  onShare,
  isSharing = false,
}: InvestorMatchingPanelProps) {
  const [selectedInvestors, setSelectedInvestors] = React.useState<Set<string>>(new Set())
  const [showAll, setShowAll] = React.useState(false)

  // Calculate matches for all investors
  const matches = React.useMemo(() => {
    return investors
      .filter(inv => inv.status === "active" && inv.mandate)
      .map(inv => calculateInvestorMatch(property, inv))
      .sort((a, b) => b.matchScore - a.matchScore)
  }, [property, investors])

  const displayedMatches = showAll ? matches : matches.slice(0, 5)
  const highMatches = matches.filter(m => m.matchScore >= 70)

  const toggleInvestor = (id: string) => {
    setSelectedInvestors(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectTopMatches = () => {
    const topIds = highMatches.map(m => m.investor.id)
    setSelectedInvestors(new Set(topIds))
  }

  const handleShare = () => {
    if (onShare && selectedInvestors.size > 0) {
      onShare(Array.from(selectedInvestors))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-green-600" />
              AI Investor Matching
            </CardTitle>
            <CardDescription>
              Recommended investors based on mandate alignment
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {highMatches.length} high matches
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectTopMatches}
            disabled={highMatches.length === 0}
          >
            <Users className="mr-1 h-3 w-3" />
            Select top matches ({highMatches.length})
          </Button>
          {selectedInvestors.size > 0 && (
            <Badge variant="secondary">{selectedInvestors.size} selected</Badge>
          )}
        </div>

        <Separator />

        {/* Investor list */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {displayedMatches.map((match) => (
            <div
              key={match.investor.id}
              className={cn(
                "rounded-lg border p-3 transition-colors cursor-pointer",
                selectedInvestors.has(match.investor.id)
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => toggleInvestor(match.investor.id)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedInvestors.has(match.investor.id)}
                  onCheckedChange={() => toggleInvestor(match.investor.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{match.investor.name}</div>
                        <div className="text-xs text-gray-500">{match.investor.company}</div>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn("text-lg font-bold", getScoreColor(match.matchScore))}>
                            {match.matchScore}%
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <div className="space-y-2 text-xs">
                            <div className="font-medium">Match Analysis</div>
                            {match.matchReasons.length > 0 && (
                              <div>
                                <div className="text-green-600 font-medium">Matches:</div>
                                {match.matchReasons.map((r, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <Check className="h-3 w-3 text-green-500" />
                                    {r}
                                  </div>
                                ))}
                              </div>
                            )}
                            {match.mismatches.length > 0 && (
                              <div>
                                <div className="text-amber-600 font-medium">Considerations:</div>
                                {match.mismatches.map((m, i) => (
                                  <div key={i} className="text-gray-500">• {m}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="mt-2">
                    <Progress value={match.matchScore} className="h-1.5" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {match.investor.mandate && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {match.investor.mandate.strategy}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {match.investor.mandate.yieldTarget}
                        </Badge>
                      </>
                    )}
                    {match.investor.segment && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {match.investor.segment.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {matches.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full"
          >
            {showAll ? "Show less" : `Show all (${matches.length})`}
          </Button>
        )}

        <Separator />

        {/* Share action */}
        <Button
          onClick={handleShare}
          disabled={selectedInvestors.size === 0 || isSharing}
          className="w-full"
        >
          {isSharing ? (
            <>Sharing...</>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Share IC Memo with {selectedInvestors.size || "Selected"} Investor{selectedInvestors.size !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
