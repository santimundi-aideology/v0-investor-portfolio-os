import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { getMemoById } from "@/lib/db/memos"
import { getInvestorById } from "@/lib/db/investors"
import { getListingById } from "@/lib/db/listings"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertMemoAccess } from "@/lib/security/rbac"
import { MemoPDFDocument } from "@/components/memos/memo-pdf-document"
import { IntakeReportPdfDocument } from "@/components/memos/intake-report-pdf-document"
import type {
  IntakeReportPayload,
  CashFlowTable,
  CashFlowRow,
  OperatingExpenses,
  ScenarioRow,
  ComparableTransaction,
} from "@/lib/pdf/intake-report"
import { prefetchPayloadImages } from "@/lib/pdf/prefetch-images"
import { getHoldingsByInvestor, type PropertyHolding } from "@/lib/db/holdings"

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A"
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A"
  // For stored decimal rates (e.g. 0.12), convert to %
  const pct = value <= 1 ? value * 100 : value
  return `${pct.toFixed(1)}%`
}

function formatCompactPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A"
  return `${(value * 100).toFixed(1)}%`
}

function getCurrentContent(memo: any): Record<string, any> | null {
  const currentVersion =
    memo.versions?.find((v: any) => v.version === memo.currentVersion) ??
    memo.versions?.[memo.versions.length - 1]
  const content = currentVersion?.content
  return content && typeof content === "object" && !Array.isArray(content) ? content : null
}

function buildStaticMapUrl(
  coords?: { lat?: number; lng?: number } | null,
  locationLabel?: string,
) {
  const lat = Number(coords?.lat)
  const lng = Number(coords?.lng)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
  const label = (locationLabel || "Property location").slice(0, 80)
  const coordText = hasCoords ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Coordinates unavailable"

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
  <rect width="800" height="420" fill="#f8fafc"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="0" y1="70" x2="800" y2="70"/><line x1="0" y1="140" x2="800" y2="140"/>
    <line x1="0" y1="210" x2="800" y2="210"/><line x1="0" y1="280" x2="800" y2="280"/>
    <line x1="0" y1="350" x2="800" y2="350"/><line x1="130" y1="0" x2="130" y2="420"/>
    <line x1="260" y1="0" x2="260" y2="420"/><line x1="390" y1="0" x2="390" y2="420"/>
    <line x1="520" y1="0" x2="520" y2="420"/><line x1="650" y1="0" x2="650" y2="420"/>
  </g>
  <path d="M40 300 C170 240, 260 250, 390 200 S620 170, 760 130" stroke="#cbd5e1" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M80 110 C180 130, 270 120, 360 150 S560 230, 720 260" stroke="#dbeafe" stroke-width="10" fill="none" stroke-linecap="round"/>
  <g transform="translate(400,210)">
    <path d="M0 -26 C10 -26 18 -18 18 -8 C18 5 8 17 0 30 C-8 17 -18 5 -18 -8 C-18 -18 -10 -26 0 -26 Z" fill="#ef4444"/>
    <circle cx="0" cy="-8" r="6" fill="#ffffff"/>
  </g>
  <rect x="24" y="24" width="430" height="42" rx="8" fill="#ffffff" opacity="0.96"/>
  <text x="42" y="50" font-size="22" font-family="Helvetica" fill="#0f172a">${label}</text>
  <rect x="24" y="360" width="280" height="34" rx="7" fill="#ffffff" opacity="0.96"/>
  <text x="42" y="383" font-size="16" font-family="Helvetica" fill="#334155">${coordText}</text>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/* ------------------------------------------------------------------ */
/*  Enhanced PDF data helpers (mirrors evaluate route logic)            */
/* ------------------------------------------------------------------ */

function buildMemoOperatingExpenses(params: {
  purchasePrice: number
  annualRent: number
  sizeSqft: number | null
  serviceChargePerSqft: number | null
}): OperatingExpenses {
  const { purchasePrice, annualRent, sizeSqft, serviceChargePerSqft } = params
  const scPerSqft = serviceChargePerSqft ?? 18
  const effectiveSize = sizeSqft ?? Math.round(purchasePrice / 1200)
  const serviceCharge = Math.round(scPerSqft * effectiveSize)
  const managementFee = Math.round(annualRent * 0.05)
  const maintenanceReserve = Math.round(purchasePrice * 0.01)
  const insurance = Math.round(purchasePrice * 0.001)
  const totalAnnual = serviceCharge + managementFee + maintenanceReserve + insurance
  return {
    serviceCharge, managementFee, maintenanceReserve, insurance, totalAnnual,
    grossRent: annualRent, netRent: annualRent - totalAnnual,
    serviceChargePerSqft: scPerSqft,
    notes: serviceChargePerSqft ? "Service charge from listing data" : "Service charge estimated (~AED 18/sqft)",
  }
}

function buildMemoCashFlowTable(params: {
  purchasePrice: number; mortgageAmount: number; mortgageRate: number;
  annualRent: number; annualExpenses: number; appreciationPct: number;
  holdPeriod: number; equityInvested: number;
}): CashFlowTable {
  const { purchasePrice, mortgageAmount, mortgageRate, annualRent, annualExpenses, appreciationPct, holdPeriod, equityInvested } = params
  const monthlyRate = mortgageRate / 100 / 12
  const totalPayments = 25 * 12
  const monthlyPayment = mortgageAmount > 0 && monthlyRate > 0
    ? mortgageAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1)
    : 0
  const annualMortgagePayment = Math.round(monthlyPayment * 12)
  const rows: CashFlowRow[] = []
  let cumulativeReturn = 0
  for (let year = 1; year <= holdPeriod; year++) {
    const grossRent = Math.round(annualRent * Math.pow(1.03, year - 1))
    const expenses = Math.round(annualExpenses * Math.pow(1.02, year - 1))
    const netCashFlow = grossRent - expenses - annualMortgagePayment
    cumulativeReturn += netCashFlow
    rows.push({ year, grossRent, expenses, mortgagePayment: annualMortgagePayment, netCashFlow, propertyValue: Math.round(purchasePrice * Math.pow(1 + appreciationPct / 100, year)), cumulativeReturn })
  }
  const finalValue = rows[rows.length - 1]?.propertyValue ?? purchasePrice
  const remainingPayments = Math.max(0, totalPayments - holdPeriod * 12)
  const outstandingLoan = remainingPayments > 0 && monthlyRate > 0
    ? mortgageAmount * (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, holdPeriod * 12)) / (Math.pow(1 + monthlyRate, totalPayments) - 1)
    : 0
  const exitProceeds = Math.round(finalValue - outstandingLoan)
  const totalProfit = Math.round(exitProceeds + cumulativeReturn - equityInvested)
  return { rows, exitProceeds, totalProfit, holdPeriod }
}

function buildMemoScenarios(params: {
  purchasePrice: number; annualRent: number; appreciationPct: number;
  holdPeriod: number; equityInvested: number; mortgageAmount: number;
  mortgageRate: number; totalExpenses: number;
}): ScenarioRow[] {
  const { purchasePrice, annualRent, appreciationPct, holdPeriod, equityInvested, mortgageAmount, mortgageRate, totalExpenses } = params
  const annualInterest = Math.round(mortgageAmount * (mortgageRate / 100))
  function run(label: string, rentMul: number, occ: number, growthDelta: number): ScenarioRow {
    const adjRent = Math.round(annualRent * rentMul * (occ / 100))
    const adjGrowth = appreciationPct + growthDelta
    const exitPrice = Math.round(purchasePrice * Math.pow(1 + adjGrowth / 100, holdPeriod))
    const totalRental = adjRent * holdPeriod
    const totalExp = totalExpenses * holdPeriod
    const totalInt = annualInterest * holdPeriod
    const netSale = exitPrice - mortgageAmount
    const netProfit = Math.round(netSale + totalRental - totalExp - totalInt - equityInvested)
    const totalCashIn = netSale + totalRental - totalExp - totalInt
    const eqMul = equityInvested > 0 ? totalCashIn / equityInvested : 1
    const fiveYearIrr = holdPeriod > 0 ? Math.round((Math.pow(Math.max(eqMul, 0), 1 / holdPeriod) - 1) * 1000) / 10 : 0
    return { label, annualRent: adjRent, occupancy: occ, exitPrice, fiveYearIrr, netProfit }
  }
  return [run("Upside", 1.10, 95, 2), run("Base", 1.00, 90, 0), run("Downside", 0.90, 80, -2)]
}

function buildEnhancedFromMemoContent(content: Record<string, any>, listing: any): {
  cashFlowTable?: CashFlowTable; operatingExpenses?: OperatingExpenses; scenarios?: ScenarioRow[]; comparables?: ComparableTransaction[];
} {
  const analysis = content?.analysis
  if (!analysis) return {}

  const rb = analysis.financialAnalysis?.returnBridge
  const growth = analysis.growth
  const pricing = analysis.pricing

  const purchasePrice = Number(pricing?.askingPrice || listing?.price) || 0
  if (purchasePrice <= 0) return {}

  const annualRent = Math.round(Number(pricing?.rentPotential || pricing?.rentCurrent) || purchasePrice * 0.06)
  const mortgageAmount = Number(rb?.mortgageAmount) || Math.round(purchasePrice * 0.7)
  const mortgageRate = Number(rb?.annualInterestRatePct) || 3.5
  const equityInvested = Number(rb?.equityInvested) || Math.round(purchasePrice * 0.36)
  const appreciationPct = Number(growth?.annualGrowthBase) || 4
  const holdPeriod = 5
  const sizeSqft = typeof listing?.size === "number" ? listing.size : null
  const scPerSqft = content?.source?.serviceCharge ?? null

  const opex = buildMemoOperatingExpenses({ purchasePrice, annualRent, sizeSqft, serviceChargePerSqft: scPerSqft })
  const cashFlowTable = buildMemoCashFlowTable({ purchasePrice, mortgageAmount, mortgageRate, annualRent, annualExpenses: opex.totalAnnual, appreciationPct, holdPeriod, equityInvested })
  const scenarios = buildMemoScenarios({ purchasePrice, annualRent, appreciationPct, holdPeriod, equityInvested, mortgageAmount, mortgageRate, totalExpenses: opex.totalAnnual })

  // Map analysis.comparables to structured ComparableTransaction[]
  const comparables: ComparableTransaction[] = Array.isArray(analysis.comparables)
    ? analysis.comparables.map((c: any) => ({
        name: c.name || "Comparable",
        distance: c.distance || "",
        price: Number(c.price) || 0,
        pricePerSqft: Number(c.pricePerSqft) || 0,
        size: c.size,
        date: c.closingDate || "Recent",
        source: "AI" as const,
        type: "sale" as const,
        note: c.note,
      }))
    : []

  return { cashFlowTable, operatingExpenses: opex, scenarios, comparables }
}

function buildIntakePayloadFromMemo(
  memo: any,
  investor: any,
  listing: any,
  holdings: PropertyHolding[],
): IntakeReportPayload | null {
  const content = getCurrentContent(memo)
  const analysis = content?.analysis
  if (!analysis || typeof analysis !== "object") return null

  const score = typeof content?.evaluation?.score === "number"
    ? `${content.evaluation.score}/100`
    : undefined
  const recommendation =
    (typeof analysis?.finalRecommendation?.decision === "string"
      ? analysis.finalRecommendation.decision
      : undefined) ||
    (typeof content?.evaluation?.recommendation === "string"
      ? content.evaluation.recommendation
      : undefined)

  const rb = analysis?.financialAnalysis?.returnBridge
  const growth = analysis?.growth
  const mapCoords = content?.source?.coordinates as { lat?: number; lng?: number } | undefined
  const isCurrentListingOwned = Boolean(listing?.id && holdings.some((holding) => holding.listingId === listing.id))
  const ownedHolding = isCurrentListingOwned
    ? holdings.find((holding) => holding.listingId === listing.id)
    : null
  const portfolioCount = holdings.length
  const totalPurchaseCost = holdings.reduce((sum, holding) => sum + holding.purchasePrice, 0)
  const totalCurrentValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0)
  const averageOccupancyRate =
    holdings.length > 0
      ? holdings.reduce((sum, holding) => sum + holding.occupancyRate, 0) / holdings.length
      : null
  const topHoldings = holdings
    .slice()
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 3)
    .map((holding) => {
      const holdingLabel = holding.listingId ? `Listing ${holding.listingId.slice(0, 8)}` : "Unknown listing"
      return `${holdingLabel} • Cost ${formatCurrency(holding.purchasePrice)} • Value ${formatCurrency(holding.currentValue)}`
    })

  const sections: IntakeReportPayload["sections"] = [
    {
      title: "Property Snapshot",
      keyValues: [
        { label: "Property", value: listing?.title || memo?.title || "N/A" },
        { label: "Location", value: listing?.area || "N/A" },
        ...(content?.source?.agentName ? [{ label: "Realtor", value: content.source.agentName }] : []),
        ...(content?.source?.agencyName ? [{ label: "Agency", value: content.source.agencyName }] : []),
        ...(content?.source?.buildingName ? [{ label: "Building", value: content.source.buildingName }] : []),
        { label: "Type", value: listing?.type || "N/A" },
        { label: "Asking Price", value: formatCurrency(analysis?.pricing?.askingPrice ?? listing?.price) },
        {
          label: "Size",
          value:
            typeof listing?.size === "number" ? `${listing.size.toLocaleString()} sq ft` : "N/A",
        },
        { label: "Bedrooms / Bathrooms", value: `${listing?.bedrooms ?? "N/A"} / ${listing?.bathrooms ?? "N/A"}` },
        ...(content?.source?.furnished ? [{ label: "Furnished", value: "Yes" }] : []),
        ...(content?.source?.developer ? [{ label: "Developer", value: content.source.developer }] : []),
        ...(content?.source?.completionStatus && content.source.completionStatus !== "unknown"
          ? [{ label: "Status", value: String(content.source.completionStatus).replace(/_/g, " ") }]
          : []),
        ...(content?.source?.handoverDate ? [{ label: "Handover", value: content.source.handoverDate }] : []),
        ...(content?.source?.parking ? [{ label: "Parking", value: `${content.source.totalParkingSpaces ?? content.source.parking} space(s)` }] : []),
        { label: "Investor", value: investor?.name || "N/A" },
      ],
    },
    {
      title: "Executive Summary",
      body: typeof analysis?.summary === "string" ? analysis.summary : undefined,
      bullets: Array.isArray(analysis?.keyPoints) ? analysis.keyPoints : undefined,
    },
    {
      title: "Recommended Candidate Status",
      body: isCurrentListingOwned
        ? "This opportunity is now classified as an acquired holding and should be managed in Portfolio surfaces."
        : "This opportunity is currently a recommended candidate and has not been acquired into Portfolio.",
      keyValues: [
        {
          label: "Recommendation Lane",
          value: isCurrentListingOwned ? "In Portfolio (Acquired)" : "Recommended Candidate",
        },
        {
          label: "Portfolio Overlap",
          value: isCurrentListingOwned ? "Yes - already owned" : "No - candidate only",
        },
        ...(ownedHolding
          ? [
              { label: "Purchase Date", value: ownedHolding.purchaseDate || "N/A" },
              { label: "Purchase Cost", value: formatCurrency(ownedHolding.purchasePrice) },
              { label: "Current Value", value: formatCurrency(ownedHolding.currentValue) },
            ]
          : []),
      ],
    },
    {
      title: "Portfolio Holdings Snapshot",
      keyValues: [
        { label: "Total Holdings", value: String(portfolioCount) },
        { label: "Total Purchase Cost", value: formatCurrency(totalPurchaseCost) },
        { label: "Current Portfolio Value", value: formatCurrency(totalCurrentValue) },
        {
          label: "Average Occupancy",
          value: averageOccupancyRate === null ? "N/A" : formatCompactPercent(averageOccupancyRate),
        },
      ],
      bullets: topHoldings,
    },
    {
      title: "Market Analysis",
      body: typeof analysis?.market?.overview === "string" ? analysis.market.overview : undefined,
      keyValues: [
        { label: "Supply", value: analysis?.market?.supply || "N/A" },
        { label: "Demand", value: analysis?.market?.demand || "N/A" },
        { label: "Absorption", value: analysis?.market?.absorption || "N/A" },
      ],
      bullets: Array.isArray(analysis?.market?.drivers) ? analysis.market.drivers : undefined,
    },
    {
      title: "Pricing and Return Profile",
      keyValues: [
        { label: "Asking Price", value: formatCurrency(analysis?.pricing?.askingPrice) },
        { label: "Recommended Offer", value: formatCurrency(analysis?.pricing?.recommendedOffer) },
        { label: "Stabilized Value", value: formatCurrency(analysis?.pricing?.stabilizedValue) },
        { label: "Current Rent", value: formatCurrency(analysis?.pricing?.rentCurrent) },
        { label: "Potential Rent", value: formatCurrency(analysis?.pricing?.rentPotential) },
        { label: "IRR", value: formatPercent(analysis?.pricing?.irr) },
        {
          label: "Equity Multiple",
          value:
            typeof analysis?.pricing?.equityMultiple === "number"
              ? `${analysis.pricing.equityMultiple.toFixed(2)}x`
              : "N/A",
        },
      ],
    },
    {
      title: "Future Value Outlook",
      body:
        typeof growth?.narrative === "string"
          ? growth.narrative
          : "Future value outlook is based on neighborhood trajectory, liquidity, and demand resilience.",
      keyValues: [
        { label: "1Y Projected Value", value: formatCurrency(growth?.projectedValue1Y) },
        { label: "3Y Projected Value", value: formatCurrency(growth?.projectedValue3Y) },
        { label: "5Y Projected Value", value: formatCurrency(growth?.projectedValue5Y) },
        { label: "Base Growth", value: formatPercent(growth?.annualGrowthBase) + " / year" },
        { label: "Conservative Case", value: formatPercent(growth?.annualGrowthConservative) + " / year" },
        { label: "Upside Case", value: formatPercent(growth?.annualGrowthUpside) + " / year" },
      ],
      bullets: [
        ...(Array.isArray(growth?.drivers) ? growth.drivers : []),
        ...((Array.isArray(growth?.sensitivities) ? growth.sensitivities : []).map((s: string) => `Sensitivity: ${s}`)),
      ],
    },
    {
      title: "ROI on Equity Bridge",
      keyValues: [
        { label: "Purchase price", value: formatCurrency(rb?.purchasePrice) },
          { label: "DLD fee", value: formatCurrency(rb?.dldFee) },
          { label: "DLD fee rate", value: `${Number(rb?.dldRatePct ?? 4).toFixed(1)}%` },
          { label: "Broker fee", value: formatCurrency(rb?.brokerFee) },
          { label: "Broker fee rate", value: `${Number(rb?.brokerFeePct ?? 2).toFixed(1)}%` },
        { label: "Renovation", value: formatCurrency(rb?.renovation) },
        { label: "Total project cost", value: formatCurrency(rb?.totalProjectCost) },
          { label: "Mortgage amount", value: formatCurrency(rb?.mortgageAmount) },
          { label: "Mortgage LTV", value: `${Number(rb?.mortgageLtvPct ?? 70).toFixed(1)}%` },
        { label: "Equity invested", value: formatCurrency(rb?.equityInvested) },
          { label: "Annual interest", value: formatCurrency(rb?.annualInterest) },
          { label: "Interest rate", value: `${Number(rb?.annualInterestRatePct ?? 3.5).toFixed(1)}%` },
        { label: "Resale price", value: formatCurrency(rb?.resalePrice) },
        {
          label: "Net sale proceeds after mortgage repayment",
          value: formatCurrency(rb?.netSaleProceedsAfterMortgage),
        },
        { label: "Net profit (after interest)", value: formatCurrency(rb?.netProfitAfterInterest) },
        {
          label: "ROI on equity",
          value: typeof rb?.roiOnEquityPct === "number" ? `${rb.roiOnEquityPct.toFixed(1)}%` : "N/A",
        },
      ],
      bullets: rb?.assumptions ? [rb.assumptions] : undefined,
    },
    {
      title: "Strategy and Execution",
      body: typeof analysis?.strategy?.plan === "string" ? analysis.strategy.plan : undefined,
      keyValues: [
        { label: "Hold Period", value: analysis?.strategy?.holdPeriod || "N/A" },
        { label: "Exit Strategy", value: analysis?.strategy?.exit || "N/A" },
      ],
      bullets: Array.isArray(analysis?.strategy?.focusPoints) ? analysis.strategy.focusPoints : undefined,
    },
    {
      title: "Risk Assessment",
      bullets: Array.isArray(analysis?.risks)
        ? analysis.risks.map((risk: any, index: number) =>
            `${index + 1}. ${risk?.risk || "Risk"} - Mitigation: ${risk?.mitigation || "N/A"}`,
          )
        : undefined,
    },
    {
      title: "Final Recommendation",
      body:
        typeof analysis?.finalRecommendation?.decision === "string"
          ? `${analysis.finalRecommendation.decision}: ${analysis.finalRecommendation.condition || "Proceed with standard due diligence."}`
          : undefined,
      bullets: [
        ...(Array.isArray(content?.evaluation?.keyStrengths)
          ? content.evaluation.keyStrengths.map((s: string) => `Strength: ${s}`)
          : []),
        ...(Array.isArray(content?.evaluation?.considerations)
          ? content.evaluation.considerations.map((c: string) => `Consideration: ${c}`)
          : []),
      ],
    },
  ]

  // Build enhanced financial data for the PDF
  const enhanced = buildEnhancedFromMemoContent(content, listing)

  return {
    title: `IC Opportunity Report - ${listing?.title || memo?.title || "Property"}`,
    subtitle: listing?.area || "Dubai, UAE",
    generatedAt: memo?.updatedAt || memo?.createdAt || new Date().toISOString(),
    score,
    recommendation,
    summary:
      (typeof content?.evaluation?.headline === "string" ? content.evaluation.headline : undefined) ||
      (typeof analysis?.summary === "string" ? analysis.summary : undefined),
    mapImageUrl: buildStaticMapUrl(
      mapCoords,
      [listing?.area, listing?.address].filter(Boolean).join(", ") || listing?.title || "Property location",
    ),
    coverImageUrl: listing?.images?.[0]?.url || undefined,
    galleryImageUrls: Array.isArray(listing?.images)
      ? listing.images.slice(1, 5).map((img: any) => img?.url).filter(Boolean)
      : [],
    floorPlanImageUrls: Array.isArray(content?.source?.floorPlanImages)
      ? content.source.floorPlanImages.filter(Boolean)
      : undefined,
    factors: content?.evaluation?.factors ? {
      mandateFit: content.evaluation.factors.mandateFit,
      marketTiming: content.evaluation.factors.marketTiming,
      portfolioFit: content.evaluation.factors.portfolioFit,
      riskAlignment: content.evaluation.factors.riskAlignment,
    } : undefined,
    cashFlowTable: enhanced.cashFlowTable,
    operatingExpenses: enhanced.operatingExpenses,
    scenarios: enhanced.scenarios,
    comparables: enhanced.comparables,
    sections,
  }
}

/**
 * GET /api/memos/[id]/export-pdf
 * Generate and download a PDF version of an IC memo
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const memoId = (await params).id

    const memo = await getMemoById(memoId)
    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 })
    }

    if (!memo.investorId) {
      return NextResponse.json({ error: "Memo has no investor assigned" }, { status: 400 })
    }

    const memoInvestorId = memo.investorId

    // Get investor
    const investor = await getInvestorById(memoInvestorId)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    // Check access
    try {
      assertMemoAccess(
        { tenantId: memo.tenantId, investorId: memoInvestorId },
        ctx,
        investor
      )
    } catch (err) {
      if (err instanceof AccessError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
    }

    const [listing, holdings] = await Promise.all([
      memo.listingId ? getListingById(memo.listingId) : Promise.resolve(null),
      getHoldingsByInvestor(memoInvestorId),
    ])

    // Use the premium intake-style PDF whenever structured analysis exists.
    const intakePayload = buildIntakePayloadFromMemo(memo, investor, listing, holdings)

    // Pre-fetch external images → base64 data URIs so the PDF renderer
    // doesn't fail on CDN / CORS restrictions.
    const resolvedPayload = intakePayload
      ? await prefetchPayloadImages(intakePayload)
      : null

    const pdfBuffer = resolvedPayload
      ? await renderToBuffer(<IntakeReportPdfDocument payload={resolvedPayload} />)
      : await renderToBuffer(
          <MemoPDFDocument memo={memo} investor={investor} listing={listing} />
        )

    // Return PDF as download
    const pdfData = new Uint8Array(pdfBuffer)

    return new NextResponse(pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="IC_Memo_${memo.id.slice(0, 8)}.pdf"`,
        "Content-Length": pdfData.byteLength.toString(),
      },
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[export-pdf] Error:", err)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
