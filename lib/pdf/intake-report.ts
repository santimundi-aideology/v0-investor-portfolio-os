export interface IntakeReportKeyValue {
  label: string
  value: string
}

export interface IntakeReportSection {
  title: string
  body?: string
  bullets?: string[]
  keyValues?: IntakeReportKeyValue[]
}

export interface IntakeReportFactors {
  mandateFit?: number
  marketTiming?: number
  portfolioFit?: number
  riskAlignment?: number
}

export interface IntakeReportPayload {
  title: string
  subtitle?: string
  generatedAt?: string
  score?: string
  recommendation?: string
  summary?: string
  coverImageUrl?: string
  galleryImageUrls?: string[]
  mapImageUrl?: string
  floorPlanImageUrls?: string[]
  factors?: IntakeReportFactors
  sections: IntakeReportSection[]
}
