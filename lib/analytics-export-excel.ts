import ExcelJS from "exceljs"

export interface AnalyticsExportSummary {
  totalPortfolioValue: number
  totalPurchaseCost: number
  totalMonthlyRental: number
  avgYieldPct: number
  occupancyPct: number
  appreciationPct: number
  propertyCount: number
}

export interface ValueHistoryRow {
  date: string
  currentValue: number
  purchaseCost: number
  marketIndex?: number
}

export interface RentalHistoryRow {
  month: string
  grossRent: number
  expenses: number
  netRent: number
  occupancyPct: number
}

export interface PropertyComparisonRow {
  name: string
  yield: number
  appreciation: number
  occupancy: number
}

export interface HoldingRow {
  id: string
  propertyName: string
  area: string
  currentValue: number
  purchasePrice: number
  purchaseDate: string
  monthlyRent: number
  occupancyRate: number
  annualExpenses: number
  yieldPct: number
  appreciationPct: number
  monthlyNetRent: number
}

export interface RentalStatsExport {
  totalGross: number
  totalNet: number
  totalExpenses: number
  avgOccupancy: number
  trend: number
}

export interface AnalyticsExportInput {
  summary: AnalyticsExportSummary
  valueHistory: ValueHistoryRow[]
  rentalHistory: RentalHistoryRow[]
  propertyComparison: PropertyComparisonRow[]
  holdings: HoldingRow[]
  rentalStats: RentalStatsExport
  timeRange: string
  formatAED: (value: number) => string
}

const headerStyle = {
  font: { bold: true },
  fill: { type: "pattern" as const, pattern: "solid", fgColor: { argb: "FFE5E7EB" } },
  alignment: { horizontal: "left" as const },
}

function addSummarySheet(wb: ExcelJS.Workbook, input: AnalyticsExportInput) {
  const ws = wb.addWorksheet("Resumen", { views: [{ state: "frozen", ySplit: 1 }] })
  ws.getColumn(1).width = 28
  ws.getColumn(2).width = 22

  const { summary, formatAED } = input
  const rows: [string, string | number][] = [
    ["Informe de Analytics - Portfolio", ""],
    ["Generado", new Date().toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })],
    ["Período", input.timeRange === "all" ? "Todo" : input.timeRange === "1y" ? "1 año" : input.timeRange === "6m" ? "6 meses" : "3 meses"],
    [""],
    ["Resumen KPIs", ""],
    ["Valor total del portfolio", formatAED(summary.totalPortfolioValue)],
    ["Coste total de compra", formatAED(summary.totalPurchaseCost)],
    ["Revalorización", `${summary.appreciationPct >= 0 ? "+" : ""}${summary.appreciationPct.toFixed(1)}%`],
    ["Ingreso mensual por alquileres", formatAED(summary.totalMonthlyRental)],
    ["Rendimiento medio", `${summary.avgYieldPct.toFixed(2)}%`],
    ["Ocupación media", `${summary.occupancyPct.toFixed(0)}%`],
    ["Número de propiedades", summary.propertyCount],
    [""],
    ["Nota", "Las tablas y datos detrás de los gráficos están en las demás hojas. Puedes editarlas y crear gráficos en Excel con Insertar > Gráfico."],
  ]

  rows.forEach(([a, b], i) => {
    ws.getCell(i + 1, 1).value = a
    ws.getCell(i + 1, 2).value = b
    if (i === 4) {
      ws.getCell(i + 1, 1).font = { bold: true }
    }
  })
}

function addValueHistorySheet(wb: ExcelJS.Workbook, input: AnalyticsExportInput) {
  const ws = wb.addWorksheet("Valor en el tiempo", { views: [{ state: "frozen", ySplit: 1 }] })
  const { valueHistory } = input
  const headers = ["Fecha", "Valor actual (AED)", "Coste compra (AED)", "Índice mercado (AED)"]
  headers.forEach((h, c) => {
    ws.getCell(1, c + 1).value = h
    ws.getCell(1, c + 1).font = headerStyle.font
    ws.getCell(1, c + 1).fill = headerStyle.fill
  })
  valueHistory.forEach((row, r) => {
    ws.getCell(r + 2, 1).value = row.date
    ws.getCell(r + 2, 2).value = row.currentValue
    ws.getCell(r + 2, 3).value = row.purchaseCost
    ws.getCell(r + 2, 4).value = row.marketIndex ?? ""
  })
  ws.getColumn(1).width = 14
  ws.getColumn(2).width = 18
  ws.getColumn(3).width = 18
  ws.getColumn(4).width = 18
}

function addRentalHistorySheet(wb: ExcelJS.Workbook, input: AnalyticsExportInput) {
  const ws = wb.addWorksheet("Ingresos por alquiler", { views: [{ state: "frozen", ySplit: 1 }] })
  const { rentalHistory } = input
  const headers = ["Mes", "Ingresos brutos (AED)", "Gastos (AED)", "Ingreso neto (AED)", "Ocupación %"]
  headers.forEach((h, c) => {
    ws.getCell(1, c + 1).value = h
    ws.getCell(1, c + 1).font = headerStyle.font
    ws.getCell(1, c + 1).fill = headerStyle.fill
  })
  rentalHistory.forEach((row, r) => {
    ws.getCell(r + 2, 1).value = row.month
    ws.getCell(r + 2, 2).value = row.grossRent
    ws.getCell(r + 2, 3).value = row.expenses
    ws.getCell(r + 2, 4).value = row.netRent
    ws.getCell(r + 2, 5).value = row.occupancyPct
  })
  ws.getColumn(1).width = 14
  ws.getColumn(2).width = 20
  ws.getColumn(3).width = 16
  ws.getColumn(4).width = 20
  ws.getColumn(5).width = 14
}

function addPropertyComparisonSheet(wb: ExcelJS.Workbook, input: AnalyticsExportInput) {
  const ws = wb.addWorksheet("Comparación propiedades", { views: [{ state: "frozen", ySplit: 1 }] })
  const { propertyComparison } = input
  const headers = ["Propiedad", "Rendimiento %", "Revalorización %", "Ocupación %"]
  headers.forEach((h, c) => {
    ws.getCell(1, c + 1).value = h
    ws.getCell(1, c + 1).font = headerStyle.font
    ws.getCell(1, c + 1).fill = headerStyle.fill
  })
  propertyComparison.forEach((row, r) => {
    ws.getCell(r + 2, 1).value = row.name
    ws.getCell(r + 2, 2).value = Number(row.yield.toFixed(2))
    ws.getCell(r + 2, 3).value = Number(row.appreciation.toFixed(2))
    ws.getCell(r + 2, 4).value = Number(row.occupancy.toFixed(0))
  })
  ws.getColumn(1).width = 32
  ws.getColumn(2).width = 16
  ws.getColumn(3).width = 18
  ws.getColumn(4).width = 14
}

function addDetailedPerformanceSheet(wb: ExcelJS.Workbook, input: AnalyticsExportInput) {
  const ws = wb.addWorksheet("Rendimiento detallado", { views: [{ state: "frozen", ySplit: 1 }] })
  const { holdings, formatAED } = input
  const headers = [
    "Propiedad",
    "Área",
    "Valor actual (AED)",
    "Precio compra (AED)",
    "Fecha compra",
    "Alquiler mensual (AED)",
    "Ocupación %",
    "Gastos anuales (AED)",
    "Rendimiento %",
    "Revalorización %",
    "Ingreso neto/mes (AED)",
  ]
  headers.forEach((h, c) => {
    ws.getCell(1, c + 1).value = h
    ws.getCell(1, c + 1).font = headerStyle.font
    ws.getCell(1, c + 1).fill = headerStyle.fill
  })
  holdings.forEach((row, r) => {
    ws.getCell(r + 2, 1).value = row.propertyName
    ws.getCell(r + 2, 2).value = row.area
    ws.getCell(r + 2, 3).value = row.currentValue
    ws.getCell(r + 2, 4).value = row.purchasePrice
    ws.getCell(r + 2, 5).value = row.purchaseDate
    ws.getCell(r + 2, 6).value = row.monthlyRent
    ws.getCell(r + 2, 7).value = Number((row.occupancyRate * 100).toFixed(0))
    ws.getCell(r + 2, 8).value = row.annualExpenses
    ws.getCell(r + 2, 9).value = Number(row.yieldPct.toFixed(2))
    ws.getCell(r + 2, 10).value = Number(row.appreciationPct.toFixed(2))
    ws.getCell(r + 2, 11).value = row.monthlyNetRent
  })
  ws.getColumn(1).width = 28
  ws.getColumn(2).width = 18
  ws.getColumn(3).width = 18
  ws.getColumn(4).width = 18
  ws.getColumn(5).width = 12
  ws.getColumn(6).width = 18
  ws.getColumn(7).width = 12
  ws.getColumn(8).width = 16
  ws.getColumn(9).width = 14
  ws.getColumn(10).width = 16
  ws.getColumn(11).width = 18
}

function addRentalByPropertySheet(wb: ExcelJS.Workbook, input: AnalyticsExportInput) {
  const ws = wb.addWorksheet("Alquiler por propiedad", { views: [{ state: "frozen", ySplit: 1 }] })
  const { holdings, formatAED } = input
  const headers = ["Propiedad", "Área", "Ingreso neto mensual (AED)", "Ocupación %"]
  headers.forEach((h, c) => {
    ws.getCell(1, c + 1).value = h
    ws.getCell(1, c + 1).font = headerStyle.font
    ws.getCell(1, c + 1).fill = headerStyle.fill
  })
  holdings.forEach((row, r) => {
    ws.getCell(r + 2, 1).value = row.propertyName
    ws.getCell(r + 2, 2).value = row.area
    ws.getCell(r + 2, 3).value = row.monthlyNetRent
    ws.getCell(r + 2, 4).value = Number((row.occupancyRate * 100).toFixed(0))
  })
  ws.getColumn(1).width = 28
  ws.getColumn(2).width = 18
  ws.getColumn(3).width = 24
  ws.getColumn(4).width = 14
}

/**
 * Builds an Excel workbook with all analytics data: summary, value history,
 * rental history, property comparison, detailed performance, and rental by property.
 * Each sheet contains the same data as the charts and tables on the analytics page,
 * so the file is fully editable and you can create or edit charts in Excel.
 */
export async function buildAnalyticsExcelReport(input: AnalyticsExportInput): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Investor Portfolio OS"
  wb.created = new Date()

  addSummarySheet(wb, input)
  addValueHistorySheet(wb, input)
  addRentalHistorySheet(wb, input)
  addPropertyComparisonSheet(wb, input)
  addDetailedPerformanceSheet(wb, input)
  addRentalByPropertySheet(wb, input)

  const buffer = await wb.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}

/**
 * Triggers download of the analytics Excel report in the browser.
 */
export async function downloadAnalyticsExcelReport(input: AnalyticsExportInput): Promise<void> {
  const buffer = await buildAnalyticsExcelReport(input)
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `informe-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
