export const SIGNAL_THRESHOLDS = {
  truth: {
    priceChangeQoQPct: 0.05, // 5%
    rentChangeQoQPct: 0.05,
    minSampleSize: 25,
    yieldOpportunityMin: 0.065, // 6.5% gross yield
  },
  portal: {
    supplySpikeWoWPct: 0.15, // +15% active listings
    discountingSpikeWoWPct: 0.2, // +20% price cuts
    stalenessRiseWoWPct: 0.15, // +15% stale listings
    minActiveListings: 30,
    staleDaysThreshold: 60, // Days on market to be considered stale
  },
  priceContrast: {
    underpricedPct: -0.10, // 10% below DLD market = underpriced
    overpricedPct: 0.15, // 15% above DLD market = overpriced
    minDldSampleSize: 10, // Minimum DLD transactions for confidence
  },
  aiContext: {
    maxContextChars: 16000, // ~4000 tokens
    maxHoldings: 10,
    maxListings: 20,
    maxMarketSummaries: 15,
  },
} as const

export type SignalThresholds = typeof SIGNAL_THRESHOLDS


