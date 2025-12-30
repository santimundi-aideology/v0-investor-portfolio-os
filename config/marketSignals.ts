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
  },
} as const


