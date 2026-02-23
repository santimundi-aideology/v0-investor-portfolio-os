import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import type { Mandate } from "@/lib/types"

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingRight: 40,
    paddingBottom: 32,
    paddingLeft: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.45,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
  },
  headerLeft: {
    width: 120,
    marginRight: 24,
  },
  photoWrap: {
    width: 100,
    height: 120,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#0f172a",
    letterSpacing: 0.3,
  },
  role: {
    fontSize: 11,
    color: "#475569",
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  contactLabel: {
    width: 52,
    fontSize: 9,
    color: "#64748b",
  },
  contactValue: {
    fontSize: 9,
    color: "#334155",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#334155",
    marginBottom: 4,
    textAlign: "justify",
  },
  table: {
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  label: {
    width: "36%",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: "center",
    color: "#94a3b8",
  },
  /* Portfolio section (page 2+) */
  portfolioSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
    gap: 10,
  },
  portfolioSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
  },
  portfolioSummaryLabel: {
    fontSize: 8,
    color: "#166534",
    marginRight: 6,
    fontFamily: "Helvetica-Bold",
  },
  portfolioSummaryValue: {
    fontSize: 10,
    color: "#14532d",
    fontFamily: "Helvetica-Bold",
  },
  propertyCard: {
    marginBottom: 12,
    padding: 10,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    backgroundColor: "#fafafa",
  },
  propertyTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  propertyMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
    gap: 8,
  },
  propertyMetaItem: {
    fontSize: 9,
    color: "#475569",
  },
  propertyFinancials: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  propertyFinItem: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  propertyFinLabel: {
    fontSize: 8,
    color: "#64748b",
    marginRight: 4,
  },
  propertyFinValue: {
    fontSize: 9,
    color: "#334155",
    fontFamily: "Helvetica-Bold",
  },
})

export type HoldingForPdf = {
  id: string
  property: {
    title?: string
    area?: string
    type?: string
    size?: number
    bedrooms?: number
    bathrooms?: number
    imageUrl?: string
  } | null
  financials: {
    purchasePrice: number
    purchaseDate: string
    currentValue: number
    monthlyRent: number
    occupancyRate: number
    annualExpenses: number
    appreciationPct: number
    netYieldPct: number
    netAnnualRent: number
  }
}

export type InvestorProfilePdfData = {
  name: string
  company?: string
  email?: string
  phone?: string
  description?: string
  mandate?: Mandate
  avatar?: string
  thesisReturnStyle?: "income" | "appreciation" | "balanced"
  thesisHoldPeriod?: string
  thesisPreferredExits?: string[]
  thesisNotes?: string
  holdings?: HoldingForPdf[]
}

function orNa(s: string | undefined): string {
  return s && s.trim() ? s.trim() : "—"
}

function formatAed(num: number | undefined): string {
  if (num == null || !Number.isFinite(num)) return "—"
  return new Intl.NumberFormat("en-AE", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num) + " AED"
}

export function InvestorProfilePdfDocument({ data }: { data: InvestorProfilePdfData }) {
  const m = data.mandate
  const preferredAreas = (m?.preferredAreas ?? []).filter(Boolean).join(", ")
  const propertyTypes = (m?.propertyTypes ?? []).filter(Boolean).join(", ")
  const primaryObjectives = (m?.primaryObjectives ?? []).filter(Boolean).join(", ")
  const dealBreakers = (m?.dealBreakers ?? []).filter(Boolean).join(", ")
  const hasPhoto = Boolean(data.avatar && data.avatar.length > 0)
  const thesisReturnLabel =
    data.thesisReturnStyle === "income"
      ? "Income / yield"
      : data.thesisReturnStyle === "appreciation"
        ? "Capital appreciation"
        : data.thesisReturnStyle === "balanced"
          ? "Balanced"
          : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.photoWrap}>
              {hasPhoto ? (
                <Image src={data.avatar!} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={{ fontSize: 8, color: "#64748b" }}>Photo</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.name}>{data.name || "Investor Profile"}</Text>
            {data.company ? (
              <Text style={styles.role}>{data.company}</Text>
            ) : null}
            {data.email ? (
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{data.email}</Text>
              </View>
            ) : null}
            {data.phone ? (
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{data.phone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {data.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About & investment objectives</Text>
            <Text style={styles.paragraph}>{data.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment preferences</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={styles.label}>Strategy</Text>
              <Text style={styles.value}>{orNa(m?.strategy)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Investment horizon</Text>
              <Text style={styles.value}>{orNa(m?.investmentHorizon)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Target yield</Text>
              <Text style={styles.value}>{orNa(m?.yieldTarget)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Return focus (thesis)</Text>
              <Text style={styles.value}>{thesisReturnLabel ?? "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Preferred areas</Text>
              <Text style={styles.value}>{orNa(preferredAreas)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Property types</Text>
              <Text style={styles.value}>{orNa(propertyTypes)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Risk tolerance</Text>
              <Text style={styles.value}>
                {m?.riskTolerance ? String(m.riskTolerance).charAt(0).toUpperCase() + String(m.riskTolerance).slice(1) : "—"}
              </Text>
            </View>
            {((m?.minInvestment ?? 0) > 0 || (m?.maxInvestment ?? 0) > 0) ? (
              <View style={styles.row}>
                <Text style={styles.label}>Investment range</Text>
                <Text style={styles.value}>
                  {(m?.minInvestment ?? 0) > 0 && (m?.maxInvestment ?? 0) > 0
                    ? `${formatAed(m?.minInvestment)} – ${formatAed(m?.maxInvestment)}`
                    : (m?.minInvestment ?? 0) > 0
                      ? formatAed(m?.minInvestment)
                      : formatAed(m?.maxInvestment)}
                </Text>
              </View>
            ) : null}
            {orNa(primaryObjectives) !== "—" ? (
              <View style={styles.row}>
                <Text style={styles.label}>Primary objectives</Text>
                <Text style={styles.value}>{primaryObjectives}</Text>
              </View>
            ) : null}
            {orNa(dealBreakers) !== "—" ? (
              <View style={styles.row}>
                <Text style={styles.label}>Deal breakers</Text>
                <Text style={styles.value}>{dealBreakers}</Text>
              </View>
            ) : null}
            {orNa(m?.notes) !== "—" ? (
              <View style={styles.row}>
                <Text style={styles.label}>Mandate notes</Text>
                <Text style={styles.value}>{m?.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {(data.thesisHoldPeriod || data.thesisNotes) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Investment thesis</Text>
            <View style={styles.table}>
              {data.thesisHoldPeriod ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Hold period</Text>
                  <Text style={styles.value}>{data.thesisHoldPeriod}</Text>
                </View>
              ) : null}
              {data.thesisNotes ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Philosophy / notes</Text>
                  <Text style={styles.value}>{data.thesisNotes}</Text>
                </View>
              ) : null}
              {(data.thesisPreferredExits ?? []).length > 0 ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Preferred exits</Text>
                  <Text style={styles.value}>{(data.thesisPreferredExits ?? []).join(", ")}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {data.holdings && data.holdings.length > 0
            ? "Page 1 — Investor profile. Confidential."
            : "Investor profile — confidential. Generated from your portfolio."}
        </Text>
      </Page>

      {data.holdings && data.holdings.length > 0 ? (
        <>
          {(() => {
            const holdings = data.holdings
            const totalValue = holdings.reduce((s, h) => s + h.financials.currentValue, 0)
            const totalCost = holdings.reduce((s, h) => s + h.financials.purchasePrice, 0)
            const avgYield =
              holdings.length > 0
                ? holdings.reduce((s, h) => s + h.financials.netYieldPct, 0) / holdings.length
                : 0
            const HOLDINGS_PER_PAGE = 3
            const pages: HoldingForPdf[][] = []
            for (let i = 0; i < holdings.length; i += HOLDINGS_PER_PAGE) {
              pages.push(holdings.slice(i, i + HOLDINGS_PER_PAGE))
            }
            return pages.map((pageHoldings, pageIndex) => (
              <Page key={pageIndex} size="A4" style={styles.page}>
                <Text style={styles.sectionTitle}>
                  {pageIndex === 0 ? "Current portfolio — properties" : `Portfolio (continued)`}
                </Text>
                {pageIndex === 0 ? (
                  <View style={styles.portfolioSummary}>
                    <View style={styles.portfolioSummaryItem}>
                      <Text style={styles.portfolioSummaryLabel}>Total value</Text>
                      <Text style={styles.portfolioSummaryValue}>{formatAed(totalValue)}</Text>
                    </View>
                    <View style={styles.portfolioSummaryItem}>
                      <Text style={styles.portfolioSummaryLabel}>Assets</Text>
                      <Text style={styles.portfolioSummaryValue}>{holdings.length}</Text>
                    </View>
                    <View style={styles.portfolioSummaryItem}>
                      <Text style={styles.portfolioSummaryLabel}>Avg. net yield</Text>
                      <Text style={styles.portfolioSummaryValue}>{avgYield.toFixed(1)}%</Text>
                    </View>
                    {totalCost > 0 ? (
                      <View style={styles.portfolioSummaryItem}>
                        <Text style={styles.portfolioSummaryLabel}>Total cost</Text>
                        <Text style={styles.portfolioSummaryValue}>{formatAed(totalCost)}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {pageHoldings.map((holding) => (
                  <View key={holding.id} style={styles.propertyCard}>
                    {holding.property?.imageUrl ? (
                      <View style={{ width: "100%", height: 70, marginBottom: 6, borderRadius: 4, overflow: "hidden", backgroundColor: "#e2e8f0" }}>
                        <Image src={holding.property.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </View>
                    ) : null}
                    <Text style={styles.propertyTitle}>
                      {holding.property?.title?.trim() || `Property ${holding.id.slice(0, 8)}`}
                    </Text>
                    <View style={styles.propertyMeta}>
                      {holding.property?.area ? (
                        <Text style={styles.propertyMetaItem}>{holding.property.area}</Text>
                      ) : null}
                      {holding.property?.type ? (
                        <Text style={styles.propertyMetaItem}> · {holding.property.type}</Text>
                      ) : null}
                      {holding.property?.size ? (
                        <Text style={styles.propertyMetaItem}> · {holding.property.size} sqft</Text>
                      ) : null}
                      {holding.property?.bedrooms != null ? (
                        <Text style={styles.propertyMetaItem}> · {holding.property.bedrooms} bed</Text>
                      ) : null}
                      {holding.property?.bathrooms != null ? (
                        <Text style={styles.propertyMetaItem}> · {holding.property.bathrooms} bath</Text>
                      ) : null}
                    </View>
                    <View style={styles.propertyFinancials}>
                      <View style={styles.propertyFinItem}>
                        <Text style={styles.propertyFinLabel}>Current value</Text>
                        <Text style={styles.propertyFinValue}>
                          {formatAed(holding.financials.currentValue)}
                        </Text>
                      </View>
                      <View style={styles.propertyFinItem}>
                        <Text style={styles.propertyFinLabel}>Purchase</Text>
                        <Text style={styles.propertyFinValue}>
                          {formatAed(holding.financials.purchasePrice)}
                          {holding.financials.purchaseDate
                            ? ` (${holding.financials.purchaseDate.slice(0, 7)})`
                            : ""}
                        </Text>
                      </View>
                      <View style={styles.propertyFinItem}>
                        <Text style={styles.propertyFinLabel}>Appreciation</Text>
                        <Text style={styles.propertyFinValue}>
                          {holding.financials.appreciationPct >= 0 ? "+" : ""}
                          {holding.financials.appreciationPct}%
                        </Text>
                      </View>
                      <View style={styles.propertyFinItem}>
                        <Text style={styles.propertyFinLabel}>Monthly rent</Text>
                        <Text style={styles.propertyFinValue}>
                          {formatAed(holding.financials.monthlyRent)}
                        </Text>
                      </View>
                      <View style={styles.propertyFinItem}>
                        <Text style={styles.propertyFinLabel}>Occupancy</Text>
                        <Text style={styles.propertyFinValue}>
                          {Math.round(holding.financials.occupancyRate * 100)}%
                        </Text>
                      </View>
                      <View style={styles.propertyFinItem}>
                        <Text style={styles.propertyFinLabel}>Net yield</Text>
                        <Text style={styles.propertyFinValue}>
                          {holding.financials.netYieldPct}%
                        </Text>
                      </View>
                      <View style={styles.propertyFinItem}>
                        <Text style={styles.propertyFinLabel}>Annual expenses</Text>
                        <Text style={styles.propertyFinValue}>
                          {formatAed(holding.financials.annualExpenses)}
                        </Text>
                      </View>
                      <View style={styles.propertyFinItem}>
                        <Text style={styles.propertyFinLabel}>Net annual rent</Text>
                        <Text style={styles.propertyFinValue}>
                          {formatAed(holding.financials.netAnnualRent)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                <Text style={styles.footer}>
                  Page {pageIndex + 2} — Portfolio. Confidential.
                </Text>
              </Page>
            ))
          })()}
        </>
      ) : null}
    </Document>
  )
}
