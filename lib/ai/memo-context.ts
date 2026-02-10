import "server-only"

import { getInvestorById } from "@/lib/db/investors"
import { getListingById } from "@/lib/db/listings"
import { getTrustRecord } from "@/lib/db/trust"
import type { InvestorRecord, ListingRecord, TrustRecord } from "@/lib/data/types"

export type MemoContent = {
  execSummary?: string
  scenarios?: Record<string, unknown>
  assumptions?: string[]
  evidence?: {
    comps?: {
      description?: string
      source?: string
      source_detail?: string
      price?: number
      price_per_sqft?: number
      rent_per_year?: number
      observed_date?: string
    }[]
  }
  numbers?: Record<string, unknown>
}

export type MemoVersion = {
  version: number
  content: MemoContent
  createdAt: string
  createdBy: string
}

export type MemoData = {
  id: string
  tenantId: string
  investorId: string | null
  listingId?: string
  state: string
  currentVersion: number
  versions: MemoVersion[]
  createdAt: string
  updatedAt: string
}

export type MemoContextOptions = {
  memo: MemoData
  investorId: string
  tenantId: string
}

export type MemoContext = {
  memo: MemoData
  investor: InvestorRecord | null
  listing: ListingRecord | null
  trustRecord: TrustRecord | null
  currentVersion: MemoVersion | undefined
  contextText: string
}

/**
 * Build AI agent context specific to a memo
 * Fetches investor data, listing data, and trust verification status
 */
export async function buildMemoContext(options: MemoContextOptions): Promise<MemoContext> {
  const { memo, investorId } = options

  // Fetch investor data
  const investor = await getInvestorById(investorId)

  // Fetch listing data if available
  let listing: ListingRecord | null = null
  let trustRecord: TrustRecord | null = null

  if (memo.listingId) {
    listing = await getListingById(memo.listingId)
    if (listing) {
      trustRecord = await getTrustRecord(listing.tenantId, memo.listingId)
    }
  }

  // Get current memo version
  const currentVersion = memo.versions.find((v) => v.version === memo.currentVersion)

  // Build context
  const context: MemoContext = {
    memo,
    investor,
    listing,
    trustRecord,
    currentVersion,
    contextText: "",
  }

  // Build context text for AI
  context.contextText = buildMemoContextText(context)

  return context
}

/**
 * Build formatted context text for the Memo Assistant AI agent
 */
function buildMemoContextText(context: MemoContext): string {
  const sections: string[] = []
  const { memo, investor, listing, trustRecord, currentVersion } = context
  const content = currentVersion?.content ?? {}

  // Memo metadata section
  sections.push("MEMO INFORMATION:")
  sections.push(`- Memo ID: ${memo.id}`)
  sections.push(`- State: ${memo.state}`)
  sections.push(`- Version: ${memo.currentVersion}`)
  sections.push(`- Created: ${formatDate(memo.createdAt)}`)
  sections.push(`- Last Updated: ${formatDate(memo.updatedAt)}`)
  sections.push("")

  // Trust verification status (important for investor decisions)
  sections.push("TRUST VERIFICATION:")
  if (trustRecord) {
    const statusLabel =
      trustRecord.status === "verified"
        ? "VERIFIED - Data has been independently verified"
        : trustRecord.status === "flagged"
          ? "FLAGGED - Data verification issues identified"
          : "UNKNOWN - Data not yet verified"
    sections.push(`- Status: ${statusLabel}`)
    if (trustRecord.reason) {
      sections.push(`- Details: ${trustRecord.reason}`)
    }
    if (trustRecord.verifiedAt) {
      sections.push(`- Verified At: ${formatDate(trustRecord.verifiedAt)}`)
    }
  } else {
    sections.push("- Status: UNKNOWN - No verification record available")
  }
  sections.push("")

  // Executive summary section
  sections.push("EXECUTIVE SUMMARY:")
  if (content.execSummary) {
    sections.push(content.execSummary)
  } else {
    sections.push("- No executive summary provided in this memo version.")
  }
  sections.push("")

  // Assumptions section
  sections.push("ASSUMPTIONS:")
  const assumptions = content.assumptions ?? []
  if (assumptions.length > 0) {
    assumptions.forEach((assumption, idx) => {
      sections.push(`${idx + 1}. ${assumption}`)
    })
  } else {
    sections.push("- No assumptions explicitly listed in this memo.")
  }
  sections.push("")

  // Scenarios/Numbers section
  sections.push("SCENARIOS & KEY NUMBERS:")
  const scenarios = content.scenarios ?? content.numbers ?? {}
  if (Object.keys(scenarios).length > 0) {
    sections.push(formatObject(scenarios))
  } else {
    sections.push("- No scenarios or key numbers provided in this memo.")
  }
  sections.push("")

  // Comparable evidence section
  sections.push("EVIDENCE (COMPARABLES):")
  const comps = content.evidence?.comps ?? []
  if (comps.length > 0) {
    comps.forEach((comp, idx) => {
      sections.push(`Comp ${idx + 1}:`)
      if (comp.description) sections.push(`  - Description: ${comp.description}`)
      if (comp.source) sections.push(`  - Source: ${comp.source}${comp.source_detail ? ` (${comp.source_detail})` : ""}`)
      if (comp.price) sections.push(`  - Price: ${formatCurrency(comp.price)}`)
      if (comp.price_per_sqft) sections.push(`  - Price per sqft: ${formatCurrency(comp.price_per_sqft)}`)
      if (comp.rent_per_year) sections.push(`  - Rent per year: ${formatCurrency(comp.rent_per_year)}`)
      if (comp.observed_date) sections.push(`  - Observed: ${comp.observed_date}`)
    })
  } else {
    sections.push("- No comparable transactions provided in this memo.")
  }
  sections.push("")

  // Property details if available
  if (listing) {
    sections.push("PROPERTY DETAILS:")
    sections.push(`- Title: ${listing.title}`)
    if (listing.address) sections.push(`- Address: ${listing.address}`)
    if (listing.area) sections.push(`- Area: ${listing.area}`)
    if (listing.type) sections.push(`- Type: ${listing.type}`)
    if (listing.price) sections.push(`- Price: ${formatCurrency(listing.price)}`)
    if (listing.size) sections.push(`- Size: ${listing.size} sq ft`)
    if (listing.bedrooms) sections.push(`- Bedrooms: ${listing.bedrooms}`)
    if (listing.bathrooms) sections.push(`- Bathrooms: ${listing.bathrooms}`)
    if (listing.expectedRent) sections.push(`- Expected Rent: ${formatCurrency(listing.expectedRent)}/month`)
    if (listing.developer) sections.push(`- Developer: ${listing.developer}`)
    if (listing.readiness) sections.push(`- Readiness: ${listing.readiness}`)
    sections.push("")
  }

  // Investor mandate for comparison
  if (investor) {
    sections.push("INVESTOR PROFILE & MANDATE:")
    sections.push(`- Name: ${investor.name}`)
    if (investor.company) sections.push(`- Company: ${investor.company}`)

    if (investor.mandate && typeof investor.mandate === "object") {
      const mandate = investor.mandate as Record<string, unknown>
      sections.push("- Investment Mandate:")
      if (mandate.propertyTypes) {
        sections.push(`  - Property Types: ${(mandate.propertyTypes as string[]).join(", ")}`)
      }
      if (mandate.preferredAreas) {
        sections.push(`  - Preferred Areas: ${(mandate.preferredAreas as string[]).join(", ")}`)
      }
      if (mandate.yieldTarget) {
        sections.push(`  - Yield Target: ${mandate.yieldTarget}`)
      }
      if (mandate.riskTolerance) {
        sections.push(`  - Risk Tolerance: ${mandate.riskTolerance}`)
      }
      if (mandate.investmentHorizon) {
        sections.push(`  - Investment Horizon: ${mandate.investmentHorizon}`)
      }
      if (mandate.minInvestment || mandate.maxInvestment) {
        sections.push(
          `  - Investment Range: ${formatCurrency(mandate.minInvestment as number)} - ${formatCurrency(mandate.maxInvestment as number)}`
        )
      }
      if (mandate.strategy) {
        sections.push(`  - Strategy: ${mandate.strategy}`)
      }
      if (mandate.notes) {
        sections.push(`  - Notes: ${mandate.notes}`)
      }
    }
    sections.push("")
  }

  // Instructions for the AI
  sections.push("INSTRUCTIONS FOR MEMO ASSISTANT:")
  sections.push("- Answer questions based ONLY on the memo content and investor mandate above.")
  sections.push("- When comparing to mandate, highlight alignments and conflicts clearly.")
  sections.push("- If trust status is 'flagged' or 'unknown', remind investor to verify data.")
  sections.push("- Flag any assumptions that seem unusual or lack supporting evidence.")
  sections.push("- If information is not in the memo, say so clearly.")
  sections.push("- Help investor understand risks and opportunities for their decision.")

  return sections.join("\n")
}

/**
 * Generate suggested questions based on memo content
 */
export function generateSuggestedQuestions(context: MemoContext): string[] {
  const questions: string[] = []
  const content = context.currentVersion?.content ?? {}

  // Always include fundamental questions
  questions.push("What are the key risks in this deal?")
  questions.push("Does this investment match my mandate?")

  // Trust-related questions
  if (!context.trustRecord || context.trustRecord.status !== "verified") {
    questions.push("What data in this memo hasn't been verified?")
  }

  // Assumption-related questions
  const assumptions = content.assumptions ?? []
  if (assumptions.length > 0) {
    questions.push("Are these assumptions reasonable for this market?")
  } else {
    questions.push("What assumptions is this analysis based on?")
  }

  // Scenario-related questions
  const scenarios = content.scenarios ?? content.numbers ?? {}
  if (Object.keys(scenarios).length > 0) {
    questions.push("Walk me through the downside scenario.")
    questions.push("What would make this a good deal vs. a bad deal?")
  }

  // Comp-related questions
  const comps = content.evidence?.comps ?? []
  if (comps.length > 0) {
    questions.push("How do these comparables support the valuation?")
  } else {
    questions.push("Why are there no comparables in this memo?")
  }

  // Return first 5 most relevant questions
  return questions.slice(0, 5)
}

/**
 * Format currency (AED)
 */
function formatCurrency(value: number | undefined | null): string {
  if (!value) return "AED 0"
  return `AED ${Math.round(value).toLocaleString()}`
}

/**
 * Format date
 */
function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "Unknown"
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}

/**
 * Format object for display
 */
function formatObject(obj: Record<string, unknown>, indent = 2): string {
  return JSON.stringify(obj, null, indent)
}
