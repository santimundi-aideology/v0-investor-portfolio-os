import { differenceInDays } from "date-fns"

export type ConfidenceLevel = "Low" | "Medium" | "High"

export function computeConfidence(comps: { observedDate?: string }[], inputs: Record<string, unknown> = {}): ConfidenceLevel {
  const freshComps = comps.filter((c) => {
    if (!c.observedDate) return false
    const days = Math.abs(differenceInDays(new Date(c.observedDate), new Date()))
    return days <= 180
  })
  if (freshComps.length >= 2) return "High"
  if (comps.length >= 1) return "Medium"
  return "Low"
}

export function evidenceWarnings(comps: { observedDate?: string }[]): string[] {
  const warnings: string[] = []
  const stale = comps.filter((c) => {
    if (!c.observedDate) return false
    const days = Math.abs(differenceInDays(new Date(c.observedDate), new Date()))
    return days > 365
  })
  if (comps.length < 2) warnings.push("Fewer than 2 comps")
  if (stale.length > 0) warnings.push("Comps older than 12 months")
  return warnings
}

export function computeScenarios(inputs: { price?: number; rent?: number; fees?: number; vacancy?: number }) {
  const price = Number(inputs.price ?? 0)
  const rent = Number(inputs.rent ?? 0)
  const fees = Number(inputs.fees ?? 0)
  const vacancy = Number(inputs.vacancy ?? 0) // months per year
  const netRent = rent - (fees || 0) - ((vacancy / 12) * rent || 0)

  const base = yieldRow(price, netRent, 0)
  const downside = yieldRow(price, netRent * 0.9, 0)
  const upside = yieldRow(price, netRent * 1.1, 0)
  return { base, downside, upside }
}

function yieldRow(price: number, net: number, extra: number) {
  if (!price || price <= 0) return { yield: null }
  const y = ((net + extra) / price) * 100
  return { yield: Number.isFinite(y) ? Number(y.toFixed(2)) : null }
}

