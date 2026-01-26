import type { Investor, Property } from "@/lib/types"

export type InvestorMatch = {
  investor: Investor
  score: number
  reasons: string[]
}

export type PropertyMatch = {
  property: Property
  score: number
  reasons: string[]
}

type PairEvaluation = {
  score: number
  reasons: string[]
}

function normalize(text?: string | null) {
  return text?.toLowerCase().trim() ?? ""
}

function parseRange(value?: string | null): { min?: number; max?: number } {
  if (!value) return {}
  const matches = value.match(/-?\d+(\.\d+)?/g)
  if (!matches?.length) return {}
  const numbers = matches.map((num) => Number(num)).filter((num) => Number.isFinite(num))
  if (!numbers.length) return {}
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] }
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  }
}

function withinBudget(price: number | undefined, min?: number, max?: number) {
  if (!price || !min || !max) return { hit: false, near: false }
  if (price >= min && price <= max) return { hit: true, near: false }
  const threshold = Math.min(Math.abs(price - min) / min, Math.abs(price - max) / max)
  return { hit: false, near: threshold <= 0.15 }
}

export function evaluatePair(property: Property | null, investor: Investor | null): PairEvaluation {
  if (!property || !investor?.mandate) return { score: 0, reasons: [] }
  const mandate = investor.mandate
  let score = 0
  const reasons: string[] = []

  if (mandate.propertyTypes?.includes(property.type)) {
    score += 32
    reasons.push(`Aligned with ${mandate.strategy} focus (${property.type})`)
  }

  const preferredAreas = (mandate.preferredAreas ?? []).map(normalize)
  if (preferredAreas.includes(normalize(property.area))) {
    score += 24
    reasons.push(`Target area: ${property.area}`)
  }

  const { hit: budgetHit, near: budgetNear } = withinBudget(property.price, mandate.minInvestment, mandate.maxInvestment)
  if (budgetHit) {
    score += 24
    reasons.push(
      `Ticket size within AED ${mandate.minInvestment?.toLocaleString()}–${mandate.maxInvestment?.toLocaleString()}`,
    )
  } else if (budgetNear) {
    score += 12
    reasons.push("Slight stretch on ticket size (still close to range)")
  }

  if (property.roi) {
    const { min: yieldMin } = parseRange(mandate.yieldTarget)
    if (yieldMin && property.roi >= yieldMin) {
      score += 10
      reasons.push(`Meets yield target (${property.roi}% ≥ ${yieldMin}%)`)
    }
  }

  const propertyTags = [normalize(property.area), normalize(property.type)]
  if (investor.tags?.some((tag) => propertyTags.includes(normalize(tag)))) {
    score += 6
    reasons.push("Matches investor tags/preferences")
  }

  if (property.readinessStatus === "READY_FOR_MEMO") {
    score += 4
    reasons.push("Ready for memo (low friction send)")
  }

  return {
    score: Math.min(100, Math.round(score)),
    reasons,
  }
}

export function matchInvestorsToProperty(property: Property | null, investors: Investor[]): InvestorMatch[] {
  if (!property) return []
  return investors
    .map((investor) => {
      const result = evaluatePair(property, investor)
      return { investor, ...result }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function matchPropertiesToInvestor(investor: Investor | null, properties: Property[]): PropertyMatch[] {
  if (!investor) return []
  return properties
    .map((property) => {
      const result = evaluatePair(property, investor)
      return { property, ...result }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
}


