import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingRight: 40,
    paddingBottom: 36,
    paddingLeft: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.45,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  coverPage: {
    paddingTop: 80,
    paddingBottom: 80,
    justifyContent: "space-between",
  },
  coverTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
  },
  coverNote: {
    fontSize: 9,
    color: "#94a3b8",
    marginBottom: 24,
    fontStyle: "italic",
  },
  coverMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 24,
  },
  coverMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coverMetaLabel: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coverMetaValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
  },
  summaryTable: {
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryTableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  summaryTableLabel: {
    width: "45%",
    fontSize: 9,
    color: "#64748b",
  },
  summaryTableValue: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  summaryTableRowLast: {
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: "#059669",
  },
  locationsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  locationChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#86efac",
  },
  locationChipText: {
    fontSize: 10,
    color: "#166534",
    fontFamily: "Helvetica-Bold",
  },
  highlightBox: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
    padding: 12,
    marginBottom: 20,
    borderRadius: 0,
  },
  highlightTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.5,
  },
  propertyCard: {
    marginBottom: 20,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    backgroundColor: "#fafafa",
  },
  propertyImageWrap: {
    width: "100%",
    height: 100,
    marginBottom: 10,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  propertyImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  propertySectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  propertyTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  propertyMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
    gap: 8,
  },
  propertyMetaItem: {
    fontSize: 9,
    color: "#475569",
  },
  financialsLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  propertyFinancials: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
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
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: "center",
    color: "#94a3b8",
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

export type PortfolioPossessionsPdfData = {
  investorName: string
  generatedAt: string
  totalValue: number
  totalCost?: number
  netAnnualIncome?: number
  propertyCount: number
  avgYieldPct: number
  appreciationPct: number
  holdings: HoldingForPdf[]
  /** Resumen en una frase del portfolio */
  summaryHighlight?: string
}

function formatAed(num: number | undefined): string {
  if (num == null || !Number.isFinite(num)) return "—"
  return (
    new Intl.NumberFormat("en-AE", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num) + " AED"
  )
}

export function PortfolioPossessionsPdfDocument({
  data,
}: {
  data: PortfolioPossessionsPdfData
}) {
  const areas = React.useMemo(() => {
    const set = new Set<string>()
    data.holdings.forEach((h) => {
      if (h.property?.area?.trim()) set.add(h.property.area.trim())
    })
    return Array.from(set).sort()
  }, [data.holdings])

  const HOLDINGS_PER_PAGE = 2
  const propertyPages: HoldingForPdf[][] = []
  for (let i = 0; i < data.holdings.length; i += HOLDINGS_PER_PAGE) {
    propertyPages.push(data.holdings.slice(i, i + HOLDINGS_PER_PAGE))
  }

  return (
    <Document>
      {/* Cover / summary page */}
      <Page size="A4" style={[styles.page, styles.coverPage]}>
        <View>
          <Text style={styles.coverTitle}>Resumen de tu portfolio</Text>
          <Text style={styles.coverSubtitle}>
            {data.investorName} · Generado el {data.generatedAt}
          </Text>
          <Text style={styles.coverNote}>
            Este documento refleja las propiedades de tu portfolio en el momento de la descarga. Genera un nuevo PDF al añadir o quitar propiedades para mantenerlo actualizado.
          </Text>
          {data.summaryHighlight ? (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>Resumen</Text>
              <Text style={styles.highlightText}>{data.summaryHighlight}</Text>
            </View>
          ) : null}
          <View style={styles.summaryTable}>
            <View style={styles.summaryTableRow}>
              <Text style={styles.summaryTableLabel}>Valor total del portfolio</Text>
              <Text style={styles.summaryTableValue}>{formatAed(data.totalValue)}</Text>
            </View>
            {(data.totalCost ?? 0) > 0 && (
              <View style={styles.summaryTableRow}>
                <Text style={styles.summaryTableLabel}>Coste total (inversión)</Text>
                <Text style={styles.summaryTableValue}>{formatAed(data.totalCost)}</Text>
              </View>
            )}
            <View style={styles.summaryTableRow}>
              <Text style={styles.summaryTableLabel}>Revalorización</Text>
              <Text style={styles.summaryTableValue}>
                {data.appreciationPct >= 0 ? "+" : ""}{data.appreciationPct.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.summaryTableRow}>
              <Text style={styles.summaryTableLabel}>Número de propiedades</Text>
              <Text style={styles.summaryTableValue}>{data.propertyCount}</Text>
            </View>
            <View style={[styles.summaryTableRow, (data.netAnnualIncome ?? 0) === 0 ? styles.summaryTableRowLast : {}]}>
              <Text style={styles.summaryTableLabel}>Rentabilidad media (neto)</Text>
              <Text style={styles.summaryTableValue}>{data.avgYieldPct.toFixed(1)}%</Text>
            </View>
            {(data.netAnnualIncome ?? 0) !== 0 && (
              <View style={[styles.summaryTableRow, styles.summaryTableRowLast]}>
                <Text style={styles.summaryTableLabel}>Ingresos netos anuales</Text>
                <Text style={styles.summaryTableValue}>{formatAed(data.netAnnualIncome)}</Text>
              </View>
            )}
          </View>
        </View>

        {areas.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Ubicaciones del portfolio</Text>
            <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 8 }}>
              Zonas en las que se encuentran tus propiedades
            </Text>
            <View style={styles.locationsList}>
              {areas.map((area) => (
                <View key={area} style={styles.locationChip}>
                  <Text style={styles.locationChipText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {data.holdings.length === 0 ? (
          <View style={{ marginTop: 24, padding: 16, backgroundColor: "#f8fafc", borderRadius: 4 }}>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              Aún no tienes propiedades en tu portfolio. Cuando añadas inmuebles, aparecerán aquí con sus características, datos financieros y ubicaciones. Genera un nuevo PDF después de añadir activos.
            </Text>
          </View>
        ) : null}

        <Text style={styles.footer}>Página 1 — Resumen de tu portfolio. Confidencial.</Text>
      </Page>

      {/* Property pages */}
      {propertyPages.map((pageHoldings, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>
            {pageIndex === 0 ? "Detalle de propiedades" : "Propiedades (continuación)"}
          </Text>
          {pageHoldings.map((holding) => (
            <View key={holding.id} style={styles.propertyCard}>
              <Text style={styles.propertySectionLabel}>Características de la propiedad</Text>
              {holding.property?.imageUrl ? (
                <View style={styles.propertyImageWrap}>
                  <Image
                    src={holding.property.imageUrl}
                    style={styles.propertyImage}
                  />
                </View>
              ) : null}
              <Text style={styles.propertyTitle}>
                {holding.property?.title?.trim() ||
                  `Property ${holding.id.slice(0, 8)}`}
              </Text>
              <View style={styles.propertyMeta}>
                {holding.property?.area ? (
                  <Text style={styles.propertyMetaItem}>{holding.property.area}</Text>
                ) : null}
                {holding.property?.type ? (
                  <Text style={styles.propertyMetaItem}>
                    {" · "}
                    {holding.property.type}
                  </Text>
                ) : null}
                {holding.property?.size ? (
                  <Text style={styles.propertyMetaItem}>
                    {" · "}
                    {holding.property.size} sqft
                  </Text>
                ) : null}
                {holding.property?.bedrooms != null ? (
                  <Text style={styles.propertyMetaItem}>
                    {" · "}
                    {holding.property.bedrooms} bed
                  </Text>
                ) : null}
                {holding.property?.bathrooms != null ? (
                  <Text style={styles.propertyMetaItem}>
                    {" · "}
                    {holding.property.bathrooms} bath
                  </Text>
                ) : null}
              </View>
              <Text style={styles.financialsLabel}>Datos financieros</Text>
              <View style={styles.propertyFinancials}>
                <View style={styles.propertyFinItem}>
                  <Text style={styles.propertyFinLabel}>Valor actual</Text>
                  <Text style={styles.propertyFinValue}>
                    {formatAed(holding.financials.currentValue)}
                  </Text>
                </View>
                <View style={styles.propertyFinItem}>
                  <Text style={styles.propertyFinLabel}>Compra</Text>
                  <Text style={styles.propertyFinValue}>
                    {formatAed(holding.financials.purchasePrice)}
                    {holding.financials.purchaseDate
                      ? ` (${holding.financials.purchaseDate.slice(0, 7)})`
                      : ""}
                  </Text>
                </View>
                <View style={styles.propertyFinItem}>
                  <Text style={styles.propertyFinLabel}>Revalorización</Text>
                  <Text style={styles.propertyFinValue}>
                    {holding.financials.appreciationPct >= 0 ? "+" : ""}
                    {holding.financials.appreciationPct}%
                  </Text>
                </View>
                <View style={styles.propertyFinItem}>
                  <Text style={styles.propertyFinLabel}>Renta mensual</Text>
                  <Text style={styles.propertyFinValue}>
                    {formatAed(holding.financials.monthlyRent)}
                  </Text>
                </View>
                <View style={styles.propertyFinItem}>
                  <Text style={styles.propertyFinLabel}>Ocupación</Text>
                  <Text style={styles.propertyFinValue}>
                    {Math.round(holding.financials.occupancyRate * 100)}%
                  </Text>
                </View>
                <View style={styles.propertyFinItem}>
                  <Text style={styles.propertyFinLabel}>Rentabilidad neta</Text>
                  <Text style={styles.propertyFinValue}>
                    {holding.financials.netYieldPct}%
                  </Text>
                </View>
                <View style={styles.propertyFinItem}>
                  <Text style={styles.propertyFinLabel}>Gastos anuales</Text>
                  <Text style={styles.propertyFinValue}>
                    {formatAed(holding.financials.annualExpenses)}
                  </Text>
                </View>
                <View style={styles.propertyFinItem}>
                  <Text style={styles.propertyFinLabel}>Renta neta anual</Text>
                  <Text style={styles.propertyFinValue}>
                    {formatAed(holding.financials.netAnnualRent)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          <Text style={styles.footer}>
            Página {pageIndex + 2} — Portfolio. Confidencial.
          </Text>
        </Page>
      ))}
    </Document>
  )
}
