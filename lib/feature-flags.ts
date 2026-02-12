// Feature flags for gating deferred features.
// In production (main): leave env vars unset → all flags default to false.
// In preview/local dev: set env vars to "true" → all flags enabled.

export const features = {
  executiveSummary: process.env.NEXT_PUBLIC_FF_EXECUTIVE_SUMMARY === "true",
  managerCockpit: process.env.NEXT_PUBLIC_FF_MANAGER_COCKPIT === "true",
  marketReport: process.env.NEXT_PUBLIC_FF_MARKET_REPORT === "true",
  roiCalculator: process.env.NEXT_PUBLIC_FF_ROI_CALCULATOR === "true",
  dealRoom: process.env.NEXT_PUBLIC_FF_DEAL_ROOM === "true",
  marketSignals: process.env.NEXT_PUBLIC_FF_MARKET_SIGNALS === "true",
  marketMap: process.env.NEXT_PUBLIC_FF_MARKET_MAP === "true",
  marketCompare: process.env.NEXT_PUBLIC_FF_MARKET_COMPARE === "true",
  realtorOps: process.env.NEXT_PUBLIC_FF_REALTOR_OPS === "true",
  realEstate: process.env.NEXT_PUBLIC_FF_REAL_ESTATE === "true",
  adminPanel: process.env.NEXT_PUBLIC_FF_ADMIN_PANEL === "true",
  tasks: process.env.NEXT_PUBLIC_FF_TASKS === "true",
  dataIngestion: process.env.NEXT_PUBLIC_FF_DATA_INGESTION === "true",
} as const

export type FeatureFlag = keyof typeof features

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return features[flag]
}
