export type ManagerTimeframe = "7d" | "30d" | "90d"

const VALID_TIMEFRAMES: ManagerTimeframe[] = ["7d", "30d", "90d"]

export function parseTimeframe(raw: string | null): ManagerTimeframe {
  if (raw && VALID_TIMEFRAMES.includes(raw as ManagerTimeframe)) {
    return raw as ManagerTimeframe
  }
  return "30d"
}

export function timeframeStartDate(timeframe: ManagerTimeframe): Date {
  const now = new Date()
  const days = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30
  now.setDate(now.getDate() - days)
  return now
}

export function hoursAgo(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null
  const parsed = new Date(timestamp).getTime()
  if (Number.isNaN(parsed)) return null
  return Math.floor((Date.now() - parsed) / (1000 * 60 * 60))
}

