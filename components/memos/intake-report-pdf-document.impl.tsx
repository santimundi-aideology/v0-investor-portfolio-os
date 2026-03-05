import React from "react"
import {
  Circle,
  Defs,
  Document,
  Image,
  Line,
  LinearGradient,
  Page,
  Path,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer"

import type {
  IntakeReportPayload,
  CashFlowTable,
  OperatingExpenses,
  ScenarioRow,
  ComparableTransaction,
  RiskMatrixEntry,
  StressTestScenario,
  NeighborhoodBenchmark,
  DataGap,
  LocationNarrative,
  EnhancedDeveloperProfile,
} from "@/lib/pdf/intake-report"

/* ================================================================== */
/*  Brand                                                              */
/* ================================================================== */

const Brand = {
  green: "#1A4D2E",
  greenLight: "#e8f0eb",
  gold: "#D4AF37",
  goldLight: "#faf5e6",
}

const C = {
  black: "#0a0a0a",
  dark: "#1a1a1a",
  body: "#404040",
  muted: "#737373",
  light: "#a3a3a3",
  rule: "#e5e5e5",
  bg: "#fafafa",
  white: "#ffffff",
  accent: Brand.green,
  red: "#dc2626",
  amber: "#d97706",
}

/* ================================================================== */
/*  Stylesheet                                                         */
/* ================================================================== */

const s = StyleSheet.create({
  /* --- cover --- */
  coverPage: { padding: 0, backgroundColor: C.white },
  coverImageWrap: { height: "65%", width: "100%", backgroundColor: "#f0f0f0", position: "relative" },
  coverImg: { width: "100%", height: "100%", objectFit: "cover" },
  coverGradient: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 120 },
  coverBadge: { position: "absolute", bottom: 14, left: 20, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(26,77,46,0.9)", paddingTop: 5, paddingBottom: 5, paddingLeft: 8, paddingRight: 12, borderRadius: 4 },
  coverBadgeText: { fontSize: 8, color: C.white, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginLeft: 6, textTransform: "uppercase" },
  coverBottom: { height: "35%", paddingTop: 20, paddingRight: 44, paddingBottom: 16, paddingLeft: 44, justifyContent: "space-between" },
  coverTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  coverTitleCol: { flex: 1, marginRight: 16 },
  coverPriceCol: { alignItems: "flex-end", minWidth: 130 },
  coverPriceLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 2 },
  coverPriceValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: Brand.green },
  coverPriceSub: { fontSize: 8, color: C.muted, marginTop: 2 },
  coverDeveloper: { fontSize: 9, color: Brand.green, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  coverLabel: { fontSize: 7, letterSpacing: 3, textTransform: "uppercase", color: C.light, marginBottom: 6 },
  coverTitle: { fontSize: 17, fontFamily: "Helvetica-Bold", color: C.black, lineHeight: 1.2, marginBottom: 2 },
  coverSub: { fontSize: 9.5, color: C.muted, marginBottom: 8 },
  coverInfoRow: { flexDirection: "row", marginBottom: 2 },
  coverInfoLabel: { fontSize: 7.5, color: C.light, width: 85, textTransform: "uppercase", letterSpacing: 0.6 },
  coverInfoValue: { fontSize: 7.5, color: C.dark },
  coverSpecRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, marginBottom: 8 },
  coverSpecPill: { marginRight: 14, marginBottom: 2 },
  coverSpecLabel: { fontSize: 6.5, color: C.light, textTransform: "uppercase", letterSpacing: 0.5 },
  coverSpecValue: { fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold" },
  coverFooter: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 8, justifyContent: "space-between", alignItems: "center" },
  coverFooterCol: {},
  coverFooterLabel: { fontSize: 6.5, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 2 },
  coverFooterValue: { fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold" },

  /* --- inner pages --- */
  page: { paddingTop: 44, paddingRight: 44, paddingBottom: 60, paddingLeft: 44, fontFamily: "Helvetica", fontSize: 9, lineHeight: 1.5, color: C.body, backgroundColor: C.white },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22, borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 7, textTransform: "uppercase", letterSpacing: 2.5, color: C.light, marginLeft: 8 },
  headerRight: { fontSize: 7, color: C.light },

  /* --- footer --- */
  pageFooter: { position: "absolute", bottom: 18, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 6 },
  pageFooterLeft: { flexDirection: "row", alignItems: "center" },
  pageFooterCenter: { fontSize: 6.5, color: C.light, textTransform: "uppercase", letterSpacing: 1.5 },
  pageFooterRight: { fontSize: 6.5, color: C.light },

  /* --- typography --- */
  h1: { fontSize: 21, fontFamily: "Helvetica-Bold", color: C.black, lineHeight: 1.15, marginBottom: 16 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 8, marginTop: 20 },
  h3: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 5, marginTop: 12 },
  h4: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 4, marginTop: 10, textTransform: "uppercase", letterSpacing: 0.8 },
  label: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 6 },
  body: { fontSize: 9.5, lineHeight: 1.65, color: C.body, marginBottom: 12 },
  bodySmall: { fontSize: 8.5, lineHeight: 1.55, color: C.muted },

  /* --- callout --- */
  callout: { borderLeftWidth: 3, borderLeftColor: Brand.green, paddingLeft: 14, paddingTop: 10, paddingBottom: 10, marginBottom: 18 },
  calloutGold: { borderLeftWidth: 3, borderLeftColor: Brand.gold, paddingLeft: 14, paddingTop: 10, paddingBottom: 10, marginBottom: 18, backgroundColor: Brand.goldLight },
  calloutWarn: { borderLeftWidth: 3, borderLeftColor: "#d97706", paddingLeft: 14, paddingTop: 8, paddingBottom: 8, marginBottom: 14, backgroundColor: "#fffbeb" },
  calloutLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 4 },
  calloutText: { fontSize: 10, color: C.dark, lineHeight: 1.55 },
  calloutMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  calloutMetaLabel: { fontSize: 7, color: C.light, textTransform: "uppercase", letterSpacing: 0.4 },
  calloutMetaValue: { fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold", maxWidth: "62%", textAlign: "right" },

  /* --- metrics --- */
  metricsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  metricBox: { width: "33.33%", marginBottom: 14 },
  metricNum: { fontSize: 17, fontFamily: "Helvetica-Bold", color: C.black, lineHeight: 1.1, marginBottom: 2 },
  metricLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: C.light },

  /* --- score ring --- */
  scoreWrap: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  scoreRingSvg: { width: 72, height: 72, marginRight: 16 },
  scoreNumOverlay: { position: "absolute", top: 0, left: 0, width: 72, height: 72, flexDirection: "column", justifyContent: "center", alignItems: "center" },
  scoreNumText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: Brand.green, lineHeight: 1 },
  scoreNumLabel: { fontSize: 5.5, color: C.light, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  scoreRight: { flex: 1 },

  /* --- factor bars --- */
  factorRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  factorLabel: { fontSize: 7, color: C.muted, width: 90 },
  factorBarTrack: { flex: 1, height: 5, backgroundColor: C.bg, borderRadius: 2.5, marginRight: 8 },
  factorBarFill: { height: 5, backgroundColor: Brand.green, borderRadius: 2.5 },
  factorValue: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.dark, width: 24, textAlign: "right" },

  /* --- property snapshot card --- */
  snapshotWrap: { flexDirection: "row", marginBottom: 16, borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 14 },
  snapshotThumb: { width: 110, height: 72, backgroundColor: "#f0f0f0", marginRight: 14 },
  snapshotThumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  snapshotDetails: { flex: 1 },
  snapshotTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 3 },
  snapshotSub: { fontSize: 8.5, color: C.muted, marginBottom: 5 },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap" },
  snapshotPill: { flexDirection: "row", alignItems: "center", marginRight: 14, marginBottom: 4 },
  snapshotPillLabel: { fontSize: 7, color: C.light, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 3 },
  snapshotPillValue: { fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold" },

  /* --- two-column --- */
  twoCols: { flexDirection: "row", justifyContent: "space-between" },
  colL: { width: "47%" },
  colR: { width: "47%" },
  col38: { width: "38%" },
  col58: { width: "58%" },

  /* --- gallery --- */
  galleryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  galleryBig: { width: "100%", height: 180, backgroundColor: "#f0f0f0", marginBottom: 8 },
  gallerySmall: { width: "32%", height: 90, backgroundColor: "#f0f0f0" },
  galleryImg: { width: "100%", height: "100%", objectFit: "cover" },
  galleryCaption: { fontSize: 7, color: C.light, textAlign: "center", marginTop: 2 },

  /* --- floor plan --- */
  floorPlanWrap: { height: 130, width: "100%", backgroundColor: "#f0f0f0", marginBottom: 6 },
  floorPlanImg: { width: "100%", height: "100%", objectFit: "contain" },

  /* --- key-value table --- */
  kvTable: { marginBottom: 12 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  kvRowAlt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg },
  kvRowHighlight: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: Brand.green, backgroundColor: Brand.greenLight, paddingLeft: 6, borderLeftWidth: 3, borderLeftColor: Brand.green },
  kvLabel: { fontSize: 8.5, color: C.body, flex: 1, paddingRight: 8 },
  kvLabelBold: { fontSize: 8.5, color: C.dark, flex: 1, paddingRight: 8, fontFamily: "Helvetica-Bold" },
  kvValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.black, textAlign: "right" },

  /* --- financial headline metrics --- */
  finHeadline: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  finHeadlineBox: { alignItems: "center", flex: 1 },
  finHeadlineNum: { fontSize: 15, fontFamily: "Helvetica-Bold", color: Brand.green, marginBottom: 2 },
  finHeadlineLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: C.light },

  /* --- numbered features / timeline --- */
  featureRow: { flexDirection: "row", marginBottom: 12 },
  featureNum: { fontSize: 20, fontFamily: "Helvetica-Bold", color: Brand.green, width: 34, marginRight: 8 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 2 },
  featureDesc: { fontSize: 8.5, color: C.muted, lineHeight: 1.5 },

  /* --- bullet list --- */
  bulletRow: { flexDirection: "row", marginBottom: 5, paddingLeft: 2 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Brand.green, marginRight: 8, marginTop: 5 },
  bulletText: { flex: 1, fontSize: 9, color: C.body, lineHeight: 1.55 },
  bulletDotRed: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.red, marginRight: 8, marginTop: 5 },
  bulletDotAmber: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.amber, marginRight: 8, marginTop: 5 },

  /* --- map --- */
  mapWrap: { height: 140, backgroundColor: "#f1f5f9", marginBottom: 12, borderRadius: 4, overflow: "hidden", position: "relative" },
  mapImg: { width: "100%", height: "100%", objectFit: "cover" },

  /* --- decorative accent bars --- */
  accentBar: { width: 40, height: 3, backgroundColor: Brand.green, marginBottom: 12 },
  accentBarLight: { width: 30, height: 1.5, backgroundColor: C.rule, marginBottom: 8, marginTop: 3 },

  /* --- table of contents --- */
  tocPage: { paddingTop: 44, paddingRight: 44, paddingBottom: 60, paddingLeft: 44, fontFamily: "Helvetica", backgroundColor: C.white },
  tocLogoWrap: { flexDirection: "row", alignItems: "center", marginBottom: 36 },
  tocBrandText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: Brand.green, marginLeft: 12, letterSpacing: 1 },
  tocTitle: { fontSize: 26, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 5 },
  tocSubtitle: { fontSize: 10, color: C.muted, marginBottom: 28 },
  tocRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 9, paddingBottom: 9, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  tocNum: { fontSize: 9, fontFamily: "Helvetica-Bold", color: Brand.green, width: 24 },
  tocLabel: { fontSize: 10, color: C.dark, flex: 1 },
  tocPage2: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.dark, width: 24, textAlign: "right" },

  /* --- comps table --- */
  compsTable: { marginBottom: 12, borderTopWidth: 0.5, borderTopColor: C.rule },
  compsHeaderRow: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: C.dark, backgroundColor: C.bg },
  compsHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, color: C.dark },
  compsRow: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  compsRowAlt: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg },
  compsRowSubject: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: Brand.green, backgroundColor: Brand.greenLight, paddingLeft: 4, borderLeftWidth: 3, borderLeftColor: Brand.green },
  compsCell: { fontSize: 8.5, color: C.body },

  /* --- cash flow table --- */
  cfTable: { marginBottom: 12, borderTopWidth: 0.5, borderTopColor: C.rule },
  cfHeaderRow: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: C.dark, backgroundColor: C.bg },
  cfHeaderCell: { fontSize: 6.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: C.dark, textAlign: "right", paddingRight: 4 },
  cfRow: { flexDirection: "row", paddingTop: 4, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  cfRowAlt: { flexDirection: "row", paddingTop: 4, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg },
  cfRowTotal: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: Brand.green, backgroundColor: Brand.greenLight },
  cfCell: { fontSize: 8, color: C.body, textAlign: "right", paddingRight: 4 },
  cfCellBold: { fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold", textAlign: "right", paddingRight: 4 },
  cfCellLabel: { fontSize: 8, color: C.body, textAlign: "left", paddingLeft: 4 },

  /* --- scenario table --- */
  scenTable: { marginBottom: 12, borderTopWidth: 0.5, borderTopColor: C.rule },
  scenHeaderRow: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: C.dark, backgroundColor: C.bg },
  scenHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, color: C.dark, textAlign: "right", paddingRight: 6 },
  scenRow: { flexDirection: "row", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  scenRowBase: { flexDirection: "row", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: Brand.green, backgroundColor: Brand.greenLight, paddingLeft: 2, borderLeftWidth: 3, borderLeftColor: Brand.green },
  scenCell: { fontSize: 8.5, color: C.body, textAlign: "right", paddingRight: 6 },
  scenCellBold: { fontSize: 8.5, color: C.dark, fontFamily: "Helvetica-Bold", textAlign: "right", paddingRight: 6 },
  scenCellLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, textAlign: "left", paddingLeft: 6, width: 70 },

  /* --- expense breakdown --- */
  expenseRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  expenseRowTotal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 5, paddingBottom: 5, borderTopWidth: 1, borderTopColor: C.dark, backgroundColor: Brand.greenLight, paddingLeft: 6, borderLeftWidth: 3, borderLeftColor: Brand.green },
  expenseLabel: { fontSize: 9, color: C.body },
  expenseLabelBold: { fontSize: 9, color: C.dark, fontFamily: "Helvetica-Bold" },
  expenseValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black, textAlign: "right" },
  expenseNote: { fontSize: 7.5, color: C.light, marginTop: 4, fontStyle: "italic" },

  /* --- source badge --- */
  sourceBadgeDLD: { fontSize: 6, color: C.white, backgroundColor: Brand.green, borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  sourceBadgeAI: { fontSize: 6, color: C.dark, backgroundColor: Brand.goldLight, borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  sourceBadgeListed: { fontSize: 6, color: C.dark, backgroundColor: "#e0e7ff", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  sourceBadgeUnverified: { fontSize: 6, color: C.white, backgroundColor: C.amber, borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },

  /* --- risk matrix --- */
  riskTable: { marginBottom: 12, borderTopWidth: 0.5, borderTopColor: C.rule },
  riskHeaderRow: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: C.dark, backgroundColor: C.bg },
  riskHeaderCell: { fontSize: 6.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: C.dark },
  riskRow: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule, alignItems: "flex-start" },
  riskRowAlt: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg, alignItems: "flex-start" },
  riskCell: { fontSize: 8, color: C.body },
  riskCellBold: { fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold" },
  riskBandLow: { fontSize: 6.5, color: "#166534", backgroundColor: "#dcfce7", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  riskBandMed: { fontSize: 6.5, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  riskBandHigh: { fontSize: 6.5, color: "#991b1b", backgroundColor: "#fee2e2", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  riskBandCritical: { fontSize: 6.5, color: C.white, backgroundColor: "#7f1d1d", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },

  /* --- stress test --- */
  stressRow: { flexDirection: "row", paddingTop: 8, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: C.rule, alignItems: "flex-start" },
  stressRowAlt: { flexDirection: "row", paddingTop: 8, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg, alignItems: "flex-start" },
  stressRowCombined: { flexDirection: "row", paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#dc2626", backgroundColor: "#fff1f2", alignItems: "flex-start", paddingLeft: 4, borderLeftWidth: 3, borderLeftColor: "#dc2626" },

  /* --- data gap --- */
  gapRow: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule, alignItems: "center" },
  gapRowAlt: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg, alignItems: "center" },
  gapStatusVerified: { fontSize: 6.5, color: "#166534", backgroundColor: "#dcfce7", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  gapStatusAssumed: { fontSize: 6.5, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  gapStatusMissing: { fontSize: 6.5, color: "#991b1b", backgroundColor: "#fee2e2", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },
  gapStatusUnverified: { fontSize: 6.5, color: "#1e3a5f", backgroundColor: "#dbeafe", borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },

  /* --- developer tier badge --- */
  tierBadgeTier1: { fontSize: 6.5, color: "#166534", backgroundColor: "#dcfce7", borderRadius: 2, paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5 },
  tierBadgeTier2: { fontSize: 6.5, color: "#1e3a5f", backgroundColor: "#dbeafe", borderRadius: 2, paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5 },
  tierBadgeTier3: { fontSize: 6.5, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 2, paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5 },
  tierBadgeUnverified: { fontSize: 6.5, color: C.white, backgroundColor: "#991b1b", borderRadius: 2, paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5 },

  /* --- score methodology --- */
  methBox: { backgroundColor: C.bg, borderRadius: 4, padding: 10, marginBottom: 14 },
  methRow: { flexDirection: "row", paddingTop: 4, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  methBandRow: { flexDirection: "row", paddingTop: 3, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: C.rule },

  /* --- timeline execution steps --- */
  timelineWrap: { marginBottom: 12, paddingLeft: 2 },
  timelineStep: { flexDirection: "row", marginBottom: 0 },
  timelineLineCol: { width: 22, alignItems: "center" },
  timelineCircle: { width: 14, height: 14, borderRadius: 7, backgroundColor: Brand.green, justifyContent: "center", alignItems: "center" },
  timelineCircleNum: { fontSize: 6.5, color: C.white, fontFamily: "Helvetica-Bold" },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: C.rule },
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 10 },
  timelineText: { fontSize: 9, color: C.body, lineHeight: 1.5 },

  /* --- amenity category --- */
  amenityCategory: { marginBottom: 8 },
  amenityCatLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: Brand.green, marginBottom: 3 },
  amenityRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  amenityDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  amenityName: { fontSize: 8, color: C.body, flex: 1 },
  amenityStatus: { fontSize: 6.5, borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 3, paddingRight: 3 },

  /* --- connectivity table --- */
  connTable: { marginBottom: 12 },
  connRow: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  connRowAlt: { flexDirection: "row", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg },
  connCell: { fontSize: 8.5, color: C.body },

  /* --- signature block --- */
  sigBlock: { marginTop: 18, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.rule },
  sigRow: { flexDirection: "row", justifyContent: "space-between" },
  sigCol: { width: "45%" },
  sigLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 16 },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: C.dark, marginBottom: 4, height: 1 },
  sigName: { fontSize: 8, color: C.muted },

  /* --- disclaimer --- */
  disclaimer: { marginTop: "auto", paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.rule },
  disclaimerText: { fontSize: 7, color: C.light, lineHeight: 1.5 },
})

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function findSection(payload: IntakeReportPayload, keywords: string[]) {
  const lower = keywords.map((k) => k.toLowerCase())
  return payload.sections.find((sec) => lower.some((kw) => sec.title.toLowerCase().includes(kw)))
}

function trim(text: string | undefined, max = 600) {
  if (!text) return ""
  const t = text.trim().replace(/\s+/g, " ")
  return t.length <= max ? t : `${t.slice(0, max).trim()}...`
}

function bullets(...sets: Array<string[] | undefined>) {
  const out: string[] = []
  for (const set of sets) {
    if (!set) continue
    for (const item of set) {
      const clean = item.trim()
      if (clean && !out.includes(clean)) out.push(clean)
    }
  }
  return out
}

function fmtAED(v: number) {
  return `AED ${v.toLocaleString("en-AE")}`
}

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`
}

function fmtDate(v: string | undefined) {
  if (!v) return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  const d = new Date(v)
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

function getCoverInfo(payload: IntakeReportPayload) {
  const pairs = payload.sections.flatMap((sec) => sec.keyValues ?? [])
  const read = (kws: string[]) => pairs.find((p) => kws.some((k) => p.label.toLowerCase().includes(k)))?.value
  return {
    company: read(["agency", "brokerage", "company"]) || read(["developer"]) || "Private Advisory Desk",
    realtor: read(["realtor", "agent"]) || "Advisory Team",
    investor: read(["investor"]) || "Investment Committee",
  }
}

function getPropertySnapshot(payload: IntakeReportPayload) {
  const pairs = payload.sections.flatMap((sec) => sec.keyValues ?? [])
  const read = (kws: string[]) => pairs.find((p) => kws.some((k) => p.label.toLowerCase().includes(k)))?.value
  return {
    type: read(["type"]) || "",
    bedrooms: read(["bedroom"]) || "",
    size: read(["size", "area sq"]) || "",
    location: read(["location", "area"]) || "",
    building: read(["building"]) || "",
    status: read(["status", "completion"]) || "",
    furnished: read(["furnished"]) || "",
    parking: read(["parking"]) || "",
    developer: read(["developer"]) || payload.developerProfileEnhanced?.name || "",
    totalPrice: read(["unit price", "asking price", "purchase price"]) || "",
    pricePerSqft: read(["price / sq", "price per sq"]) || "",
    handover: read(["handover", "completion date"]) || "",
  }
}

/** Build SVG arc path for score ring */
function scoreArcPath(score: number, cx: number, cy: number, r: number): string {
  const pct = Math.min(Math.max(score, 0), 100) / 100
  if (pct <= 0) return ""
  if (pct >= 1) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`
  const angle = pct * 360
  const rad = (angle - 90) * (Math.PI / 180)
  const x = cx + r * Math.cos(rad)
  const y = cy + r * Math.sin(rad)
  const large = angle > 180 ? 1 : 0
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y}`
}

const HIGHLIGHT_LABELS = new Set([
  "recommended offer", "roi on equity", "net profit (after interest)", "irr",
  "total project cost", "stabilized value", "equity invested",
  "net sale proceeds after mortgage repayment",
])

function isHighlightRow(label: string) {
  return HIGHLIGHT_LABELS.has(label.toLowerCase())
}

function getSourceBadgeStyle(source: string | undefined) {
  const s_lc = (source || "").toLowerCase()
  if (s_lc === "dld" || s_lc.includes("registry") || s_lc.includes("verified")) return "dld"
  if (s_lc === "listed" || s_lc.includes("list")) return "listed"
  if (s_lc.includes("ai") || s_lc.includes("estimate")) return "ai"
  return "unverified"
}

function getProvenanceLabel(source: string | undefined, provenanceLabel?: string): string {
  if (provenanceLabel) return provenanceLabel
  const s_lc = (source || "").toLowerCase()
  if (s_lc === "dld") return "DLD Verified"
  if (s_lc === "listed") return "Listed"
  if (s_lc === "developer") return "Developer Price"
  if (s_lc === "ai") return "AI Estimate"
  return "AI Estimate"
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function VantageLogo({ size = 22 }: { size?: number }) {
  const scale = size / 40
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width="40" height="40" rx="10" fill={Brand.green} />
      <Path d="M10 10L20 30L30 10H24L20 20L16 10H10Z" fill="white" />
      <Path d="M20 20L17 25H23L20 20Z" fill={Brand.gold} />
      <Rect x="19.5" y="10" width="1" height="6" rx="0.5" fill={Brand.gold} />
    </Svg>
  )
}

function ScoreRing({ score, recommendation }: { score: string; recommendation?: string }) {
  const numericScore = parseInt(score, 10)
  if (!Number.isFinite(numericScore)) return null
  const cx = 36, cy = 36, r = 28
  const arcPath = scoreArcPath(numericScore, cx, cy, r)
  return (
    <View style={s.scoreWrap} wrap={false}>
      <View style={{ width: 72, height: 72, position: "relative" }}>
        <Svg style={s.scoreRingSvg} viewBox="0 0 72 72">
          <Circle cx={cx} cy={cy} r={r} stroke={C.rule} strokeWidth={5} fill="none" />
          {arcPath ? <Path d={arcPath} stroke={Brand.green} strokeWidth={5} fill="none" strokeLinecap="round" /> : null}
        </Svg>
        <View style={s.scoreNumOverlay}>
          <Text style={s.scoreNumText}>{numericScore}</Text>
          <Text style={s.scoreNumLabel}>Score</Text>
        </View>
      </View>
      {recommendation ? (
        <View style={s.scoreRight}>
          <Text style={s.calloutLabel}>IC Recommendation</Text>
          <Text style={[s.calloutText, { fontSize: 9.5 }]}>{recommendation}</Text>
        </View>
      ) : null}
    </View>
  )
}

function FactorBar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100
  return (
    <View style={s.factorRow}>
      <Text style={s.factorLabel}>{label}</Text>
      <View style={s.factorBarTrack}>
        <View style={[s.factorBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.factorValue}>{value}/{max}</Text>
    </View>
  )
}

function Bullet({ text, dotColor = "green" }: { text: string; dotColor?: "green" | "red" | "amber" }) {
  const dotStyle = dotColor === "red" ? s.bulletDotRed : dotColor === "amber" ? s.bulletDotAmber : s.bulletDot
  return (
    <View style={s.bulletRow}>
      <View style={dotStyle} />
      <Text style={s.bulletText}>{text}</Text>
    </View>
  )
}

function KVTable({ items, highlight = false }: { items: { label: string; value: string }[]; highlight?: boolean }) {
  return (
    <View style={s.kvTable}>
      {items.map((item, i) => {
        const isHL = highlight && isHighlightRow(item.label)
        const rowStyle = isHL ? s.kvRowHighlight : (i % 2 === 1 ? s.kvRowAlt : s.kvRow)
        return (
          <View key={i} style={rowStyle}>
            <Text style={isHL ? s.kvLabelBold : s.kvLabel}>{item.label}</Text>
            <Text style={s.kvValue}>{item.value}</Text>
          </View>
        )
      })}
    </View>
  )
}

function SnapshotPill({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <View style={s.snapshotPill}>
      <Text style={s.snapshotPillLabel}>{label}</Text>
      <Text style={s.snapshotPillValue}>{value}</Text>
    </View>
  )
}

function TimelineStep({ num, text, isLast }: { num: number; text: string; isLast: boolean }) {
  return (
    <View style={s.timelineStep} wrap={false}>
      <View style={s.timelineLineCol}>
        <View style={s.timelineCircle}>
          <Text style={s.timelineCircleNum}>{num}</Text>
        </View>
        {!isLast ? <View style={s.timelineLine} /> : null}
      </View>
      <View style={s.timelineContent}>
        <Text style={s.timelineText}>{text}</Text>
      </View>
    </View>
  )
}

/* ---- Cash Flow Table ---- */
function CashFlowTableView({ table }: { table: CashFlowTable }) {
  return (
    <View style={s.cfTable}>
      <View style={s.cfHeaderRow}>
        <Text style={[s.cfHeaderCell, { flex: 0.6, textAlign: "left", paddingLeft: 4 }]}>Year</Text>
        <Text style={[s.cfHeaderCell, { flex: 1.2 }]}>Gross Rent</Text>
        <Text style={[s.cfHeaderCell, { flex: 1 }]}>Expenses</Text>
        <Text style={[s.cfHeaderCell, { flex: 1 }]}>Mortgage</Text>
        <Text style={[s.cfHeaderCell, { flex: 1 }]}>Net Cash</Text>
        <Text style={[s.cfHeaderCell, { flex: 1.2 }]}>Property Value</Text>
        <Text style={[s.cfHeaderCell, { flex: 1 }]}>Cumulative</Text>
      </View>
      {table.rows.map((row, i) => (
        <View key={i} style={i % 2 === 1 ? s.cfRowAlt : s.cfRow}>
          <Text style={[s.cfCellLabel, { flex: 0.6 }]}>Y{row.year}</Text>
          <Text style={[s.cfCell, { flex: 1.2 }]}>{fmtAED(row.grossRent)}</Text>
          <Text style={[s.cfCell, { flex: 1 }]}>{fmtAED(row.expenses)}</Text>
          <Text style={[s.cfCell, { flex: 1 }]}>{fmtAED(row.mortgagePayment)}</Text>
          <Text style={[row.netCashFlow >= 0 ? s.cfCell : { ...s.cfCell, color: C.red }, { flex: 1 }]}>{fmtAED(row.netCashFlow)}</Text>
          <Text style={[s.cfCell, { flex: 1.2 }]}>{fmtAED(row.propertyValue)}</Text>
          <Text style={[s.cfCell, { flex: 1 }]}>{fmtAED(row.cumulativeReturn)}</Text>
        </View>
      ))}
      <View style={s.cfRowTotal}>
        <Text style={[s.cfCellBold, { flex: 0.6, textAlign: "left", paddingLeft: 4 }]}>Exit</Text>
        <Text style={[s.cfCellBold, { flex: 1.2 }]}>—</Text>
        <Text style={[s.cfCellBold, { flex: 1 }]}>—</Text>
        <Text style={[s.cfCellBold, { flex: 1 }]}>—</Text>
        <Text style={[s.cfCellBold, { flex: 1 }]}>{fmtAED(table.exitProceeds)}</Text>
        <Text style={[s.cfCellBold, { flex: 1.2 }]}>—</Text>
        <Text style={[s.cfCellBold, { flex: 1 }]}>{fmtAED(table.totalProfit)}</Text>
      </View>
    </View>
  )
}

/* ---- Operating Expenses ---- */
function OperatingExpensesView({ opex }: { opex: OperatingExpenses }) {
  return (
    <View style={s.kvTable}>
      {[
        { label: "Service Charge", value: opex.serviceCharge, detail: opex.serviceChargePerSqft ? `AED ${opex.serviceChargePerSqft}/sqft` : undefined },
        { label: "Property Management (5%)", value: opex.managementFee },
        { label: "Maintenance Reserve (1%)", value: opex.maintenanceReserve },
        { label: "Insurance (0.1%)", value: opex.insurance },
      ].map((item, i) => (
        <View key={i} style={s.expenseRow}>
          <Text style={s.expenseLabel}>{item.label}{(item as any).detail ? ` (${(item as any).detail})` : ""}</Text>
          <Text style={s.expenseValue}>{fmtAED(item.value)}</Text>
        </View>
      ))}
      <View style={s.expenseRowTotal}>
        <Text style={s.expenseLabelBold}>Total Annual Expenses</Text>
        <Text style={s.expenseValue}>{fmtAED(opex.totalAnnual)}</Text>
      </View>
      <View style={s.expenseRow}>
        <Text style={s.expenseLabelBold}>Gross Rental Income</Text>
        <Text style={s.expenseValue}>{fmtAED(opex.grossRent)}</Text>
      </View>
      <View style={s.expenseRowTotal}>
        <Text style={s.expenseLabelBold}>Net Rental Income</Text>
        <Text style={s.expenseValue}>{fmtAED(opex.netRent)}</Text>
      </View>
      {opex.notes ? <Text style={s.expenseNote}>{opex.notes}</Text> : null}
    </View>
  )
}

/* ---- Scenario Table ---- */
function ScenarioTableView({ scenarios }: { scenarios: ScenarioRow[] }) {
  return (
    <View style={s.scenTable}>
      <View style={s.scenHeaderRow}>
        <Text style={[s.scenHeaderCell, { flex: 1, textAlign: "left", paddingLeft: 6 }]}>Scenario</Text>
        <Text style={[s.scenHeaderCell, { flex: 1.2 }]}>Annual Rent</Text>
        <Text style={[s.scenHeaderCell, { flex: 0.8 }]}>Occupancy</Text>
        <Text style={[s.scenHeaderCell, { flex: 1.2 }]}>Exit Price</Text>
        <Text style={[s.scenHeaderCell, { flex: 0.8 }]}>5Y IRR</Text>
        <Text style={[s.scenHeaderCell, { flex: 1.2 }]}>Net Profit</Text>
      </View>
      {scenarios.map((row, i) => {
        const isBase = row.label === "Base"
        return (
          <View key={i} style={isBase ? s.scenRowBase : s.scenRow}>
            <Text style={[s.scenCellLabel, { flex: 1 }]}>{row.label}</Text>
            <Text style={[s.scenCell, { flex: 1.2 }]}>{fmtAED(row.annualRent)}</Text>
            <Text style={[s.scenCell, { flex: 0.8 }]}>{fmtPct(row.occupancy)}</Text>
            <Text style={[s.scenCell, { flex: 1.2 }]}>{fmtAED(row.exitPrice)}</Text>
            <Text style={[s.scenCellBold, { flex: 0.8 }]}>{fmtPct(row.fiveYearIrr)}</Text>
            <Text style={[row.netProfit >= 0 ? s.scenCellBold : { ...s.scenCellBold, color: C.red }, { flex: 1.2 }]}>{fmtAED(row.netProfit)}</Text>
          </View>
        )
      })}
    </View>
  )
}

/* ---- Source badge ---- */
function SourceBadge({ source, provenanceLabel }: { source?: string; provenanceLabel?: string }) {
  const label = getProvenanceLabel(source, provenanceLabel)
  const type = getSourceBadgeStyle(source)
  const badgeStyle = type === "dld" ? s.sourceBadgeDLD : type === "listed" ? s.sourceBadgeListed : type === "ai" ? s.sourceBadgeAI : s.sourceBadgeUnverified
  return <Text style={badgeStyle}>{label}</Text>
}

/* ---- Comparable Transactions with provenance ---- */
function EnhancedCompsTable({ comps }: { comps: ComparableTransaction[] }) {
  const hasNoVerified = comps.every(c => !c.source || c.source.toUpperCase() !== "DLD")
  return (
    <View>
      {hasNoVerified ? (
        <View style={[s.calloutWarn, { marginBottom: 8 }]}>
          <Text style={[s.bodySmall, { fontFamily: "Helvetica-Bold" }]}>⚠ No registry-verified transactions found.</Text>
          <Text style={s.bodySmall}>All comparables below are AI-estimated or from listing data. Treat as indicative only. Pull DLD records for verified evidence before SPA.</Text>
        </View>
      ) : null}
      <View style={s.compsTable}>
        <View style={s.compsHeaderRow}>
          <Text style={[s.compsHeaderCell, { flex: 2.5, paddingLeft: 4 }]}>Property</Text>
          <Text style={[s.compsHeaderCell, { flex: 0.7 }]}>Dist.</Text>
          <Text style={[s.compsHeaderCell, { flex: 1.2 }]}>Price</Text>
          <Text style={[s.compsHeaderCell, { flex: 1 }]}>Per sqft</Text>
          <Text style={[s.compsHeaderCell, { flex: 0.8 }]}>Date</Text>
          <Text style={[s.compsHeaderCell, { flex: 1 }]}>Source</Text>
        </View>
        {comps.map((comp, i) => (
          <View key={i} style={i % 2 === 1 ? s.compsRowAlt : s.compsRow}>
            <Text style={[s.compsCell, { flex: 2.5, paddingLeft: 4, fontFamily: "Helvetica-Bold" }]}>{comp.name}</Text>
            <Text style={[s.compsCell, { flex: 0.7 }]}>{comp.distance}</Text>
            <Text style={[s.compsCell, { flex: 1.2 }]}>{fmtAED(comp.price)}</Text>
            <Text style={[s.compsCell, { flex: 1 }]}>{comp.pricePerSqft > 0 ? fmtAED(comp.pricePerSqft) : "—"}</Text>
            <Text style={[s.compsCell, { flex: 0.8 }]}>{comp.date}</Text>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <SourceBadge source={comp.source} provenanceLabel={comp.provenanceLabel} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

/* ---- Neighborhood Benchmark Table ---- */
function NeighborhoodBenchmarkTable({ benchmarks }: { benchmarks: NeighborhoodBenchmark[] }) {
  return (
    <View style={s.compsTable}>
      <View style={s.compsHeaderRow}>
        <Text style={[s.compsHeaderCell, { flex: 2, paddingLeft: 4 }]}>Community</Text>
        <Text style={[s.compsHeaderCell, { flex: 1.4 }]}>Price Range</Text>
        <Text style={[s.compsHeaderCell, { flex: 1.2 }]}>Maturity</Text>
        <Text style={[s.compsHeaderCell, { flex: 0.6 }]}>Metro</Text>
        <Text style={[s.compsHeaderCell, { flex: 2 }]}>Character</Text>
      </View>
      {benchmarks.map((row, i) => {
        const rowStyle = row.isSubject ? s.compsRowSubject : (i % 2 === 1 ? s.compsRowAlt : s.compsRow)
        return (
          <View key={i} style={rowStyle}>
            <Text style={[s.compsCell, { flex: 2, paddingLeft: row.isSubject ? 0 : 4, fontFamily: row.isSubject ? "Helvetica-Bold" : "Helvetica" }]}>{row.community}{row.isSubject ? " ★" : ""}</Text>
            <Text style={[s.compsCell, { flex: 1.4, fontFamily: row.isSubject ? "Helvetica-Bold" : "Helvetica" }]}>{row.priceRange}</Text>
            <Text style={[s.compsCell, { flex: 1.2 }]}>{row.maturity}</Text>
            <Text style={[s.compsCell, { flex: 0.6, textAlign: "center" }]}>{row.hasMetro ? "✓" : "—"}</Text>
            <Text style={[s.compsCell, { flex: 2 }]}>{row.character}</Text>
          </View>
        )
      })}
    </View>
  )
}

/* ---- Risk Matrix Table ---- */
function RiskMatrixTable({ risks }: { risks: RiskMatrixEntry[] }) {
  function getBandStyle(band: string) {
    if (band === "Low") return s.riskBandLow
    if (band === "High") return s.riskBandHigh
    if (band === "Critical") return s.riskBandCritical
    return s.riskBandMed
  }
  const sorted = [...risks].sort((a, b) => b.score - a.score)
  return (
    <View style={s.riskTable}>
      <View style={s.riskHeaderRow}>
        <Text style={[s.riskHeaderCell, { flex: 2, paddingLeft: 4 }]}>Risk</Text>
        <Text style={[s.riskHeaderCell, { flex: 1 }]}>Category</Text>
        <Text style={[s.riskHeaderCell, { flex: 0.5, textAlign: "center" }]}>L</Text>
        <Text style={[s.riskHeaderCell, { flex: 0.5, textAlign: "center" }]}>I</Text>
        <Text style={[s.riskHeaderCell, { flex: 0.6, textAlign: "center" }]}>Score</Text>
        <Text style={[s.riskHeaderCell, { flex: 0.8 }]}>Band</Text>
        <Text style={[s.riskHeaderCell, { flex: 2.5 }]}>Mitigation</Text>
      </View>
      {sorted.map((risk, i) => (
        <View key={i} style={i % 2 === 1 ? s.riskRowAlt : s.riskRow}>
          <Text style={[s.riskCellBold, { flex: 2, paddingLeft: 4 }]}>{risk.name || "—"}</Text>
          <Text style={[s.riskCell, { flex: 1 }]}>{risk.category || "—"}</Text>
          <Text style={[s.riskCell, { flex: 0.5, textAlign: "center" }]}>{risk.likelihood ?? "—"}</Text>
          <Text style={[s.riskCell, { flex: 0.5, textAlign: "center" }]}>{risk.impact ?? "—"}</Text>
          <Text style={[s.riskCellBold, { flex: 0.6, textAlign: "center" }]}>{risk.score ?? "—"}</Text>
          <View style={{ flex: 0.8, alignItems: "flex-start" }}>
            <Text style={getBandStyle(risk.scoreBand)}>{risk.scoreBand}</Text>
          </View>
          <Text style={[s.riskCell, { flex: 2.5 }]}>{risk.mitigation || "Data not available — flagged for manual assessment"}</Text>
        </View>
      ))}
    </View>
  )
}

/* ---- Stress Test Table ---- */
function StressTestTable({ tests }: { tests: StressTestScenario[] }) {
  return (
    <View>
      {tests.map((test, i) => {
        const isCombined = test.label.toLowerCase().includes("combined")
        const rowStyle = isCombined ? s.stressRowCombined : (i % 2 === 1 ? s.stressRowAlt : s.stressRow)
        return (
          <View key={i} style={rowStyle} wrap={false}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: isCombined ? C.red : C.dark, marginBottom: 2 }}>{test.label}</Text>
              <Text style={[s.bodySmall, { marginBottom: 2 }]}>{test.description}</Text>
              <Text style={{ fontSize: 8, color: C.muted, fontStyle: "italic" }}>{test.impact}</Text>
            </View>
            <View style={{ width: "42%", paddingLeft: 10 }}>
              <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: isCombined ? C.red : C.dark }}>{test.quantifiedEffect}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

/* ---- Data Gaps ---- */
function DataGapsTable({ gaps }: { gaps: DataGap[] }) {
  function getStatusStyle(status: string) {
    if (status === "verified") return s.gapStatusVerified
    if (status === "assumed") return s.gapStatusAssumed
    if (status === "missing") return s.gapStatusMissing
    return s.gapStatusUnverified
  }
  function getStatusLabel(status: string) {
    if (status === "verified") return "Verified"
    if (status === "assumed") return "Assumed"
    if (status === "missing") return "Missing"
    if (status === "not_applicable") return "N/A"
    return "Unverified"
  }
  return (
    <View>
      <View style={s.compsHeaderRow}>
        <Text style={[s.riskHeaderCell, { flex: 1.8, paddingLeft: 4 }]}>Data Point</Text>
        <Text style={[s.riskHeaderCell, { flex: 0.9 }]}>Status</Text>
        <Text style={[s.riskHeaderCell, { flex: 3 }]}>Detail</Text>
      </View>
      {gaps.map((gap, i) => (
        <View key={i} style={i % 2 === 1 ? s.gapRowAlt : s.gapRow}>
          <Text style={[s.riskCellBold, { flex: 1.8, paddingLeft: 4 }]}>{gap.field}</Text>
          <View style={{ flex: 0.9, alignItems: "flex-start" }}>
            <Text style={getStatusStyle(gap.status)}>{getStatusLabel(gap.status)}</Text>
          </View>
          <Text style={[s.riskCell, { flex: 3 }]}>{gap.detail || "—"}</Text>
        </View>
      ))}
    </View>
  )
}

/* ---- Location Map Placeholder (inline SVG) ---- */
function LocationMapCard({ locationLabel, coords }: { locationLabel?: string; coords?: { lat: number; lng: number } | null }) {
  const label = locationLabel || "Property Location"
  const hasCoords = coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
  const coordText = hasCoords ? `${coords!.lat.toFixed(4)}°N, ${coords!.lng.toFixed(4)}°E` : ""
  const W = 500, H = 140
  return (
    <View style={s.mapWrap} wrap={false}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Rect x={0} y={0} width={W} height={H} fill="#f1f5f9" />
        {[35, 70, 105].map(y => <Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />)}
        {[100, 200, 300, 400].map(x => <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#e2e8f0" strokeWidth={0.5} />)}
        <Path d={`M30 120 C100 90 180 100 250 70 S380 50 470 40`} stroke="#cbd5e1" strokeWidth={4} fill="none" strokeLinecap="round" />
        <Path d={`M40 40 C120 50 200 45 280 65 S400 90 460 110`} stroke="#dbeafe" strokeWidth={5} fill="none" strokeLinecap="round" />
        {/* Pin */}
        <Circle cx={250} cy={68} r={10} fill={Brand.green} opacity={0.15} />
        <Path d="M250 55 C255 55 259 59 259 64 C259 70 255 76 250 82 C245 76 241 70 241 64 C241 59 245 55 250 55 Z" fill={Brand.green} />
        <Circle cx={250} cy={63} r={3} fill="#ffffff" />
      </Svg>
      <View style={{ position: "absolute", top: 10, left: 16 }}>
        <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black }}>{label}</Text>
        {coordText ? <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>{coordText}</Text> : null}
      </View>
    </View>
  )
}

/* ---- Developer Tier Badge ---- */
function TierBadge({ tier, tierLabel }: { tier: string; tierLabel: string }) {
  const badgeStyle = tier === "tier_1" ? s.tierBadgeTier1
    : tier === "tier_2" ? s.tierBadgeTier2
    : tier === "tier_3" ? s.tierBadgeTier3
    : s.tierBadgeUnverified
  return <Text style={badgeStyle}>{tierLabel}</Text>
}

/* ---- Location Amenity List ---- */
function AmenityList({ narrative }: { narrative: LocationNarrative }) {
  const statusColor = (status: string) =>
    status === "operational" ? "#166534" : status === "under_construction" ? "#92400e" : "#1e3a5f"
  const statusBg = (status: string) =>
    status === "operational" ? "#dcfce7" : status === "under_construction" ? "#fef3c7" : "#dbeafe"
  const statusLabel = (status: string) =>
    status === "operational" ? "Open" : status === "under_construction" ? "U/C" : "Planned"

  return (
    <View>
      {(narrative.amenities ?? []).map((cat, ci) => (
        <View key={ci} style={s.amenityCategory}>
          <Text style={s.amenityCatLabel}>{cat.category}</Text>
          {(cat.items ?? []).map((item, ii) => (
            <View key={ii} style={s.amenityRow}>
              <View style={[s.amenityDot, { backgroundColor: statusColor(item.status) }]} />
              <Text style={s.amenityName}>{item.name}</Text>
              <Text style={[s.amenityStatus, { color: statusColor(item.status), backgroundColor: statusBg(item.status) }]}>{statusLabel(item.status)}</Text>
            </View>
          ))}
        </View>
      ))}
      {narrative.missingAmenities?.length ? (
        <View style={{ marginTop: 6 }}>
          <Text style={[s.amenityCatLabel, { color: C.red }]}>What&apos;s Missing</Text>
          {(narrative.missingAmenities ?? []).map((item, i) => (
            <Bullet key={i} text={item} dotColor="red" />
          ))}
        </View>
      ) : null}
    </View>
  )
}

/* ---- Connectivity Table ---- */
function ConnectivityTable({ narrative }: { narrative: LocationNarrative }) {
  return (
    <View style={s.connTable}>
      <View style={s.compsHeaderRow}>
        <Text style={[s.riskHeaderCell, { flex: 2, paddingLeft: 4 }]}>Destination</Text>
        <Text style={[s.riskHeaderCell, { flex: 1 }]}>Distance</Text>
        <Text style={[s.riskHeaderCell, { flex: 1 }]}>Drive Time</Text>
      </View>
      {(narrative.connectivity ?? []).map((row, i) => (
        <View key={i} style={i % 2 === 1 ? s.connRowAlt : s.connRow}>
          <Text style={[s.connCell, { flex: 2, paddingLeft: 4 }]}>{row.destination}</Text>
          <Text style={[s.connCell, { flex: 1 }]}>{row.distance}</Text>
          <Text style={[s.connCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{row.driveTime}</Text>
        </View>
      ))}
    </View>
  )
}

/* ---- Section Divider (visual break between flowing sections) ---- */
function SectionDivider({ title }: { title: string }) {
  return (
    <View style={{ marginTop: 28, marginBottom: 4, borderTopWidth: 1.5, borderTopColor: Brand.green, paddingTop: 14 }} wrap={false}>
      <Text style={s.h1}>{title}</Text>
    </View>
  )
}

/* ---- Scoring Methodology Box ---- */
function ScoringMethodologyBox({ methodology }: { methodology: NonNullable<IntakeReportPayload["scoringMethodology"]> }) {
  return (
    <View style={s.methBox}>
      <Text style={s.h4}>Scoring Methodology</Text>
      <View style={{ marginBottom: 8 }}>
        {methodology.dimensions.map((dim, i) => (
          <View key={i} style={s.methRow}>
            <Text style={[s.riskCellBold, { flex: 1.2 }]}>{dim.name}</Text>
            <Text style={[s.riskCell, { flex: 0.8, color: Brand.green, fontFamily: "Helvetica-Bold" }]}>{dim.weight}</Text>
            <Text style={[s.riskCell, { flex: 3 }]}>{dim.description}</Text>
          </View>
        ))}
      </View>
      <Text style={[s.h4, { marginTop: 8 }]}>Score Bands</Text>
      {methodology.bands.map((band, i) => (
        <View key={i} style={s.methBandRow}>
          <Text style={[s.riskCellBold, { flex: 0.8 }]}>{band.range}</Text>
          <Text style={[s.riskCellBold, { flex: 0.8, color: Brand.green }]}>{band.label}</Text>
          <Text style={[s.riskCell, { flex: 2.5 }]}>{band.action}</Text>
        </View>
      ))}
      {(methodology.keyFactorsUp?.length > 0 || methodology.keyFactorsDown?.length > 0) ? (
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          {methodology.keyFactorsUp?.length > 0 ? (
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[s.h4, { marginTop: 0 }]}>Factors Pulling Score Up</Text>
              {methodology.keyFactorsUp.map((f, i) => <Bullet key={i} text={f} />)}
            </View>
          ) : null}
          {methodology.keyFactorsDown?.length > 0 ? (
            <View style={{ flex: 1 }}>
              <Text style={[s.h4, { marginTop: 0 }]}>Factors Pulling Score Down</Text>
              {methodology.keyFactorsDown.map((f, i) => <Bullet key={i} text={f} dotColor="red" />)}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/* ================================================================== */
/*  Main export                                                        */
/* ================================================================== */

interface Props { payload: IntakeReportPayload }

export function IntakeReportPdfDocument({ payload }: Props) {
  const gen = payload.generatedAt || new Date().toISOString()
  const ref = `IC-${new Date(gen).getTime().toString().slice(-6)}`
  const parts = payload.title.split(" - ")
  const title = parts.length > 1 ? parts[1] : payload.title
  const location = payload.subtitle || (parts.length > 1 ? parts[0] : "")
  const gallery = payload.galleryImageUrls?.slice(0, 4) || []
  const floorPlan = payload.floorPlanImageUrls?.[0]
  const { company, realtor, investor } = getCoverInfo(payload)
  const snap = getPropertySnapshot(payload)

  const locNarr = payload.locationNarrative
  const devProfile = payload.developerProfileEnhanced
  const riskMatrix = payload.riskMatrix ?? []
  const stressTests = payload.stressTests ?? []
  const benchmarks = payload.neighborhoodBenchmarks ?? []
  const dataGaps = payload.dataGaps ?? []
  const exSteps = payload.executionSteps ?? []
  const methodology = payload.scoringMethodology

  const hasCashFlow = Boolean(payload.cashFlowTable?.rows?.length)
  const hasOpex = Boolean(payload.operatingExpenses)
  const hasScenarios = Boolean(payload.scenarios?.length)
  const hasComps = Boolean(payload.comparables?.length)
  const hasCashFlowPage = hasCashFlow || hasScenarios

  const execSec = findSection(payload, ["executive", "summary", "thesis", "project summary"]) || payload.sections[0]
  const propSec = findSection(payload, ["property snapshot", "project snapshot"])
  const locSec = findSection(payload, ["location", "neighborhood"])
  const finSec = findSection(payload, ["pricing", "financial", "return"])
  const roiSec = findSection(payload, ["roi on equity", "equity bridge", "mortgage"])
  const grwSec = findSection(payload, ["future value", "growth", "appreciation", "outlook"])
  const cmpSec = findSection(payload, ["comparable", "market comp"])
  const strSec = findSection(payload, ["strategy", "execution"])
  const rskSec = findSection(payload, ["risk"])

  const summaryBody = trim(execSec?.body || payload.summary, 1000)
  const locationBody = trim(locSec?.body, 800)

  const propFacts = (propSec?.keyValues ?? []).filter((x) => x.value && x.value !== "N/A").slice(0, 16)
  const finFacts = (finSec?.keyValues ?? []).filter((x) => x.value && x.value !== "N/A").slice(0, 14)
  const roiFacts = (roiSec?.keyValues ?? []).filter((x) => x.value && x.value !== "N/A").slice(0, 16)
  const grwFacts = (grwSec?.keyValues ?? []).filter((x) => x.value && x.value !== "N/A").slice(0, 8)

  const hlBullets = bullets(execSec?.bullets).slice(0, 5)
  const findFinVal = (kws: string[]) => finFacts.find((f) => kws.some((k) => f.label.toLowerCase().includes(k)))?.value
  const findRoiVal = (kws: string[]) => roiFacts.find((f) => kws.some((k) => f.label.toLowerCase().includes(k)))?.value
  const finHeadlinePrice = findFinVal(["asking price", "unit price", "purchase price"]) || snap.totalPrice
  const finHeadlineIRR = findFinVal(["irr"])
  const finHeadlineYield = findFinVal(["net yield", "gross yield"])
  const roiHeadlineROI = findRoiVal(["roi on equity"])
  const roiHeadlineEquity = findRoiVal(["equity invested"])
  const roiHeadlineProfit = findRoiVal(["net profit"])

  const growthBody = trim(grwSec?.body, 500)
  const strBullets = bullets(strSec?.bullets).slice(0, 10)
  const grwBullets = bullets(grwSec?.bullets).slice(0, 6)
  const rskBullets = bullets(rskSec?.bullets).slice(0, 6)

  const tocLabels = [
    "Executive Summary",
    "The Location — Area, Catalyst & Community",
    "Property & Developer",
    "Financial Profile & Returns",
    ...(hasCashFlowPage ? ["Cash Flow & Scenarios"] : []),
    "Price Context & Comparables",
    "Risk Assessment",
    "What We Don't Know — Data Gaps",
    "Execution Steps & Next Actions",
  ]

  const FixedHeader = ({ title }: { title: string }) => (
    <View style={s.header} fixed>
      <View style={s.headerLeft}>
        <VantageLogo size={16} />
        <Text style={s.headerTitle}>{title}</Text>
      </View>
    </View>
  )

  const FixedFooter = () => (
    <View style={s.pageFooter} fixed>
      <View style={s.pageFooterLeft}><VantageLogo size={10} /></View>
      <Text style={s.pageFooterCenter}>Confidential</Text>
      <Text style={s.pageFooterRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )

  return (
    <Document>
      {/* ============================================================ */}
      {/*  COVER                                                        */}
      {/* ============================================================ */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverImageWrap}>
          {payload.coverImageUrl ? (
            <Image src={payload.coverImageUrl} style={s.coverImg} />
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#e8e8e8" }}>
              <Svg width={48} height={48} viewBox="0 0 24 24">
                <Path d="M3 21h18M5 21V7l8-4 8 4v14M13 10v4" stroke="#b0b0b0" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          )}
          <View style={s.coverGradient}>
            <Svg width="595" height="120" viewBox="0 0 595 120">
              <Defs>
                <LinearGradient id="coverGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#000000" stopOpacity={0} />
                  <Stop offset="100%" stopColor="#000000" stopOpacity={0.55} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="595" height="120" fill="url(#coverGrad)" />
            </Svg>
          </View>
          <View style={s.coverBadge}>
            <VantageLogo size={14} />
            <Text style={s.coverBadgeText}>Investment Committee Memorandum</Text>
          </View>
        </View>
        <View style={s.coverBottom}>
          <View>
            <Text style={s.coverLabel}>IC Memo — Confidential</Text>
            <View style={s.coverTitleRow}>
              <View style={s.coverTitleCol}>
                {(devProfile?.name || snap.developer) ? (
                  <Text style={s.coverDeveloper}>{devProfile?.name || snap.developer}</Text>
                ) : null}
                <Text style={s.coverTitle}>{title}</Text>
                {location ? <Text style={s.coverSub}>{location}</Text> : null}
              </View>
              <View style={s.coverPriceCol}>
                <Text style={s.coverPriceLabel}>Unit Price</Text>
                <Text style={s.coverPriceValue}>{snap.totalPrice || finHeadlinePrice || "—"}</Text>
                {snap.pricePerSqft ? <Text style={s.coverPriceSub}>{snap.pricePerSqft}/sqft</Text> : null}
              </View>
            </View>
            <View style={s.coverSpecRow}>
              {snap.bedrooms ? <View style={s.coverSpecPill}><Text style={s.coverSpecLabel}>Config</Text><Text style={s.coverSpecValue}>{snap.bedrooms} BR</Text></View> : null}
              {snap.size ? <View style={s.coverSpecPill}><Text style={s.coverSpecLabel}>Size</Text><Text style={s.coverSpecValue}>{snap.size}</Text></View> : null}
              {snap.status ? <View style={s.coverSpecPill}><Text style={s.coverSpecLabel}>Status</Text><Text style={s.coverSpecValue}>{snap.status}</Text></View> : null}
              {snap.handover ? <View style={s.coverSpecPill}><Text style={s.coverSpecLabel}>Handover</Text><Text style={s.coverSpecValue}>{snap.handover}</Text></View> : null}
              {snap.parking ? <View style={s.coverSpecPill}><Text style={s.coverSpecLabel}>Parking</Text><Text style={s.coverSpecValue}>{snap.parking}</Text></View> : null}
            </View>
            <View style={{ marginTop: 2 }}>
              <View style={s.coverInfoRow}><Text style={s.coverInfoLabel}>Advisor</Text><Text style={s.coverInfoValue}>{realtor}</Text></View>
              <View style={s.coverInfoRow}><Text style={s.coverInfoLabel}>Prepared For</Text><Text style={s.coverInfoValue}>{investor}</Text></View>
            </View>
          </View>
          <View style={s.coverFooter}>
            <View style={{ flexDirection: "row", alignItems: "center" }}><VantageLogo size={12} /></View>
            <View style={s.coverFooterCol}><Text style={s.coverFooterLabel}>Date</Text><Text style={s.coverFooterValue}>{fmtDate(gen)}</Text></View>
            <View style={s.coverFooterCol}><Text style={s.coverFooterLabel}>Reference</Text><Text style={s.coverFooterValue}>{ref}</Text></View>
            <View style={s.coverFooterCol}><Text style={s.coverFooterLabel}>Classification</Text><Text style={s.coverFooterValue}>Confidential</Text></View>
          </View>
        </View>
      </Page>

      {/* ============================================================ */}
      {/*  TABLE OF CONTENTS                                            */}
      {/* ============================================================ */}
      <Page size="A4" style={s.tocPage}>
        <View style={s.tocLogoWrap}>
          <VantageLogo size={32} />
          <Text style={s.tocBrandText}>Vantage</Text>
        </View>
        <Text style={s.tocTitle}>Contents</Text>
        <Text style={s.tocSubtitle}>{title} — {location}</Text>
        <View style={s.accentBar} />
        {tocLabels.map((label, i) => (
          <View key={i} style={s.tocRow}>
            <Text style={s.tocNum}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={s.tocLabel}>{label}</Text>
          </View>
        ))}
        <FixedFooter />
      </Page>

      {/* ============================================================ */}
      {/*  EXECUTIVE SUMMARY (overflows naturally)                      */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <FixedHeader title="Executive Summary" />
        <FixedFooter />
        <Text style={s.h1}>Investment Overview</Text>

        <View style={s.snapshotWrap} wrap={false}>
          <View style={s.snapshotThumb}>
            {payload.coverImageUrl ? (
              <Image src={payload.coverImageUrl} style={s.snapshotThumbImg} />
            ) : (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#ebebeb" }}>
                <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M3 21h18M5 21V7l8-4 8 4v14M13 10v4" stroke="#b0b0b0" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              </View>
            )}
          </View>
          <View style={s.snapshotDetails}>
            <Text style={s.snapshotTitle}>{title}</Text>
            <Text style={s.snapshotSub}>{[location, snap.type, snap.building].filter(Boolean).join("  ·  ")}</Text>
            <View style={s.snapshotGrid}>
              <SnapshotPill label="Unit Price" value={snap.totalPrice || finHeadlinePrice || ""} />
              <SnapshotPill label="Per Sqft" value={snap.pricePerSqft} />
              <SnapshotPill label="Beds" value={snap.bedrooms} />
              <SnapshotPill label="Size" value={snap.size} />
              <SnapshotPill label="Status" value={snap.status} />
              <SnapshotPill label="Developer" value={devProfile?.name || snap.developer} />
              <SnapshotPill label="Handover" value={snap.handover} />
            </View>
          </View>
        </View>

        {payload.score ? (
          <ScoreRing score={payload.score} recommendation={payload.recommendation} />
        ) : payload.recommendation ? (
          <View style={s.calloutGold} wrap={false}>
            <Text style={s.calloutLabel}>IC Recommendation</Text>
            <Text style={s.calloutText}>{payload.recommendation}</Text>
          </View>
        ) : null}

        {payload.factors ? (
          <View style={{ marginBottom: 12 }} wrap={false}>
            <Text style={s.label}>Score Breakdown</Text>
            <FactorBar label="Mandate Fit" value={payload.factors.mandateFit ?? 0} />
            <FactorBar label="Market Timing" value={payload.factors.marketTiming ?? 0} />
            <FactorBar label="Portfolio Fit" value={payload.factors.portfolioFit ?? 0} />
            <FactorBar label="Risk Alignment" value={payload.factors.riskAlignment ?? 0} />
          </View>
        ) : null}

        {methodology ? <ScoringMethodologyBox methodology={methodology} /> : null}

        {payload.plainEnglishThesis ? (
          <>
            <Text style={s.h3}>Investment Thesis — Plain English</Text>
            <Text style={s.body}>{payload.plainEnglishThesis}</Text>
          </>
        ) : summaryBody ? (
          <Text style={s.body}>{summaryBody}</Text>
        ) : null}

        {hlBullets.length > 0 ? (
          <View wrap={false}>
            <View style={s.accentBarLight} />
            <Text style={s.label}>Key Highlights</Text>
            {hlBullets.map((b, i) => <Bullet key={i} text={b} />)}
          </View>
        ) : null}
      </Page>

      {/* ============================================================ */}
      {/*  LOCATION (overflows naturally)                               */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <FixedHeader title="Location — Area, Catalyst & Community" />
        <FixedFooter />
        <Text style={s.h1}>The Location</Text>

        <LocationMapCard locationLabel={location || title} />

        {locNarr ? (
          <>
            <Text style={s.h2}>The Area — What Is This Place?</Text>
            <Text style={s.body}>{locNarr.areaOverview}</Text>

            <Text style={s.h2}>The Growth Catalyst</Text>
            <Text style={s.body}>{locNarr.growthCatalyst}</Text>

            <View style={s.twoCols}>
              <View style={s.col38}>
                <Text style={s.h3}>Community Amenities</Text>
                {locNarr.amenities?.length ? (
                  <AmenityList narrative={locNarr} />
                ) : (
                  <Text style={s.bodySmall}>Amenity data not available.</Text>
                )}
              </View>
              <View style={s.col58}>
                <Text style={s.h3}>Connectivity</Text>
                {locNarr.connectivity?.length ? (
                  <ConnectivityTable narrative={locNarr} />
                ) : (
                  <Text style={s.bodySmall}>Connectivity data not available.</Text>
                )}
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={s.accentBar} />
            <Text style={s.body}>{locationBody || "The subject property is situated in a well-established zone with strong connectivity, diverse amenities, and proven demand drivers supporting both rental and capital appreciation strategies."}</Text>
          </>
        )}
      </Page>

      {/* ============================================================ */}
      {/*  PROPERTY & DEVELOPER (overflows naturally)                   */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <FixedHeader title="Property & Developer" />
        <FixedFooter />
        <Text style={s.h1}>The Property & Developer</Text>

        {gallery.length > 0 ? (
          <>
            <View style={s.galleryBig} wrap={false}>
              <Image src={gallery[0]} style={s.galleryImg} />
            </View>
            {gallery.length > 1 ? (
              <View style={s.galleryRow} wrap={false}>
                {gallery.slice(1, 4).map((url, i) => (
                  <View key={i} style={s.gallerySmall}>
                    <Image src={url} style={s.galleryImg} />
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {floorPlan ? (
          <View wrap={false} style={{ marginTop: 8 }}>
            <Text style={s.label}>Floor Plan</Text>
            <View style={s.floorPlanWrap}>
              <Image src={floorPlan} style={s.floorPlanImg} />
            </View>
          </View>
        ) : null}

        <Text style={s.h3}>Unit Specifications</Text>
        <KVTable items={(propFacts.length ? propFacts : []).slice(0, 14)} />

        <SectionDivider title="Developer Profile" />
        {devProfile ? (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, flexWrap: "wrap" }} wrap={false}>
              <Text style={[s.riskCellBold, { fontSize: 10, marginRight: 6 }]}>{devProfile.name}</Text>
              <TierBadge tier={devProfile.tier} tierLabel={devProfile.tierLabel} />
            </View>
            {devProfile.name === "Unverified Developer" ? (
              <View style={s.calloutWarn}>
                <Text style={[s.bodySmall, { fontFamily: "Helvetica-Bold" }]}>⚠ Developer not confirmed</Text>
                <Text style={s.bodySmall}>Verify against RERA/DLD registry before proceeding.</Text>
              </View>
            ) : null}
            <View style={s.twoCols}>
              <View style={s.colL}>
                <KVTable items={[
                  { label: "Legal Name", value: devProfile.legalName || devProfile.name },
                  { label: "Founded", value: devProfile.founded || "Not confirmed" },
                  { label: "Status", value: devProfile.listingStatus === "public" ? `Public${devProfile.exchange ? ` — ${devProfile.exchange}` : ""}` : devProfile.listingStatus === "private" ? "Private" : "Not confirmed" },
                  ...(devProfile.marketCap ? [{ label: "Market Cap", value: devProfile.marketCap }] : []),
                  { label: "Units Delivered", value: devProfile.unitsDelivered || "Not confirmed" },
                  { label: "Delivery Track Record", value: (devProfile.deliveryTrackRecord ?? "N/A").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) },
                  { label: "Build Quality", value: (devProfile.buildQuality ?? "N/A").replace(/\b\w/g, c => c.toUpperCase()) },
                  { label: "Escrow Status", value: devProfile.escrowStatus },
                ]} />
              </View>
              <View style={s.colR}>
                {devProfile.notableProjects?.length ? (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={s.label}>Notable Projects</Text>
                    {devProfile.notableProjects.slice(0, 4).map((p, i) => <Bullet key={i} text={p} />)}
                  </View>
                ) : null}
                {devProfile.concerns?.length ? (
                  <View>
                    <Text style={[s.label, { color: C.amber }]}>Concerns</Text>
                    {devProfile.concerns.map((c, i) => <Bullet key={i} text={c} dotColor="amber" />)}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
          <Text style={s.bodySmall}>Developer profile not available. Verify with RERA/DLD.</Text>
        )}

        {devProfile?.riskAssessment ? (
          <View style={[s.callout, { marginTop: 10 }]} wrap={false}>
            <Text style={s.calloutLabel}>Developer Risk Assessment</Text>
            <Text style={s.calloutText}>{devProfile.riskAssessment}</Text>
          </View>
        ) : null}

        {devProfile?.overview ? (
          <>
            <View style={s.accentBarLight} />
            <Text style={s.h3}>Developer Background</Text>
            <Text style={s.body}>{trim(devProfile.overview, 700)}</Text>
          </>
        ) : null}
      </Page>

      {/* ============================================================ */}
      {/*  FINANCIAL PROFILE & RETURNS (overflows naturally)            */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <FixedHeader title="Financial Profile & Returns" />
        <FixedFooter />
        <Text style={s.h1}>Financial Profile</Text>
        <View style={s.accentBar} />

        <View style={s.calloutWarn} wrap={false}>
          <Text style={s.bodySmall}>
            All rental projections are modeled estimates — no operating history exists for this property. Labels: [Assumed] = modeled assumption; [AI Est.] = AI-generated estimate; [Verified] = confirmed from listing/registry data.
          </Text>
        </View>

        {(finHeadlinePrice || finHeadlineIRR || finHeadlineYield) ? (
          <View style={s.finHeadline} wrap={false}>
            {finHeadlinePrice ? <View style={s.finHeadlineBox}><Text style={s.finHeadlineNum}>{finHeadlinePrice}</Text><Text style={s.finHeadlineLabel}>Unit Price</Text></View> : null}
            {finHeadlineIRR ? <View style={s.finHeadlineBox}><Text style={s.finHeadlineNum}>{finHeadlineIRR}</Text><Text style={s.finHeadlineLabel}>IRR</Text></View> : null}
            {finHeadlineYield ? <View style={s.finHeadlineBox}><Text style={s.finHeadlineNum}>{finHeadlineYield}</Text><Text style={s.finHeadlineLabel}>Yield</Text></View> : null}
          </View>
        ) : null}

        <View style={s.twoCols}>
          <View style={s.colL}>
            <Text style={s.h3}>Pricing & Return Profile</Text>
            {finFacts.length > 0 ? <KVTable items={finFacts} highlight /> : <Text style={s.bodySmall}>Financial data pending.</Text>}
          </View>
          <View style={s.colR}>
            <Text style={s.h3}>Capital Structure (ROI Bridge)</Text>
            {(roiHeadlineROI || roiHeadlineEquity || roiHeadlineProfit) ? (
              <View style={s.finHeadline} wrap={false}>
                {roiHeadlineEquity ? <View style={s.finHeadlineBox}><Text style={[s.finHeadlineNum, { fontSize: 11 }]}>{roiHeadlineEquity}</Text><Text style={s.finHeadlineLabel}>Equity In</Text></View> : null}
                {roiHeadlineProfit ? <View style={s.finHeadlineBox}><Text style={[s.finHeadlineNum, { fontSize: 11 }]}>{roiHeadlineProfit}</Text><Text style={s.finHeadlineLabel}>Net Profit</Text></View> : null}
                {roiHeadlineROI ? <View style={s.finHeadlineBox}><Text style={[s.finHeadlineNum, { fontSize: 11 }]}>{roiHeadlineROI}</Text><Text style={s.finHeadlineLabel}>ROI Equity</Text></View> : null}
              </View>
            ) : null}
            {roiFacts.length > 0 ? <KVTable items={roiFacts} highlight /> : <Text style={s.bodySmall}>ROI bridge pending.</Text>}
          </View>
        </View>

        {hasOpex ? (
          <View wrap={false}>
            <View style={s.accentBarLight} />
            <Text style={s.h3}>Annual Operating Expenses</Text>
            <Text style={s.bodySmall}>Deducted from gross rent to arrive at net income. [Assumed] unless noted.</Text>
            <OperatingExpensesView opex={payload.operatingExpenses!} />
          </View>
        ) : null}

        {(growthBody || grwFacts.length > 0) ? (
          <View wrap={false}>
            <View style={s.accentBarLight} />
            <Text style={s.h3}>Future Value Outlook</Text>
            {growthBody ? <Text style={s.body}>{growthBody}</Text> : null}
            {grwFacts.length > 0 ? <KVTable items={grwFacts} /> : null}
            {grwBullets.slice(0, 3).map((b, i) => <Bullet key={i} text={b} />)}
          </View>
        ) : null}

        {/* Cash Flow & Scenarios appended to financial page */}
        {hasCashFlowPage ? (
          <>
            <SectionDivider title="Cash Flow Projection" />
            {hasCashFlow ? (
              <>
                <Text style={s.body}>Year-by-year breakdown showing gross rental income, operating expenses, mortgage payments, and net cash flow.</Text>
                <CashFlowTableView table={payload.cashFlowTable!} />
              </>
            ) : null}
            {hasScenarios ? (
              <>
                <Text style={s.h2}>Scenario Analysis</Text>
                <Text style={s.body}>Three scenarios varying rent, occupancy, and exit price. Base case highlighted.</Text>
                <ScenarioTableView scenarios={payload.scenarios!} />
              </>
            ) : null}
          </>
        ) : null}
      </Page>

      {/* ============================================================ */}
      {/*  PRICE CONTEXT & COMPARABLES (overflows naturally)            */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <FixedHeader title="Price Context & Comparables" />
        <FixedFooter />
        <Text style={s.h1}>Price Context & Comparables</Text>
        <View style={s.accentBar} />

        {benchmarks.length > 0 ? (
          <>
            <Text style={s.h2}>Neighborhood Benchmarking</Text>
            <Text style={s.bodySmall}>
              Price/sqft calibration table — subject property highlighted (★). Maturity: Fully mature = 10+ yrs built out | Maturing = 3–10 yrs | Early stage &lt;3 yrs | Pre-launch = announced.
            </Text>
            <NeighborhoodBenchmarkTable benchmarks={benchmarks} />
          </>
        ) : null}

        <Text style={s.h2}>Comparable Transactions</Text>
        <Text style={s.bodySmall}>
          Source quality: [DLD Verified] = government registry | [Listed] = current asking price, not transacted | [AI Estimate] = model-generated.
        </Text>
        {hasComps ? (
          <EnhancedCompsTable comps={payload.comparables!} />
        ) : (
          <View style={s.calloutWarn}>
            <Text style={s.bodySmall}>No comparable transaction data available. Pull DLD records before investment decision.</Text>
          </View>
        )}

        {grwFacts.length > 0 && !growthBody ? (
          <View wrap={false} style={{ marginTop: 10 }}>
            <Text style={s.h3}>Growth Projections</Text>
            <KVTable items={grwFacts} />
          </View>
        ) : null}
      </Page>

      {/* ============================================================ */}
      {/*  RISK ASSESSMENT + DATA GAPS (combined, overflows naturally)  */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <FixedHeader title="Risk Assessment" />
        <FixedFooter />
        <Text style={s.h1}>Risk Assessment</Text>
        <View style={s.accentBar} />

        <Text style={s.bodySmall}>
          Risk matrix sorted by score (highest first). L = Likelihood (1–5), I = Impact (1–5), Score = L × I. Bands: Low ≤6 | Medium 7–12 | High 13–20 | Critical 21–25.
        </Text>

        {riskMatrix.length > 0 ? (
          <RiskMatrixTable risks={riskMatrix} />
        ) : rskBullets.length > 0 ? (
          <>
            {rskBullets.map((b, i) => <Bullet key={i} text={b} />)}
          </>
        ) : (
          <View style={s.calloutWarn}>
            <Text style={s.bodySmall}>Risk matrix not available. Standard investment risks apply.</Text>
          </View>
        )}

        {stressTests.length > 0 ? (
          <>
            <View style={s.accentBarLight} />
            <Text style={s.h2}>Stress Test Scenarios</Text>
            <Text style={s.bodySmall}>Adverse scenarios with quantified impact. Combined scenario represents all three adverse events occurring simultaneously.</Text>
            <StressTestTable tests={stressTests} />
          </>
        ) : null}

        {/* Data Gaps appended to risk page */}
        <SectionDivider title="What We Don't Know" />

        <View style={s.calloutWarn} wrap={false}>
          <Text style={s.bodySmall}>
            Honest inventory of every assumption, missing data point, and unverified claim. Items marked Missing or Unverified must be resolved before capital deployment.
          </Text>
        </View>

        {dataGaps.length > 0 ? (
          <DataGapsTable gaps={dataGaps} />
        ) : (
          <>
            <Text style={s.h3}>Standard Verification Checklist</Text>
            {[
              "Transaction data: verify whether comparables are DLD-recorded or AI-estimated",
              "Handover date: is it guaranteed by developer or an estimate?",
              "Service charges: confirmed in RERA filing or assumed per sqft average?",
              "Rental projections: based on actual signed leases or modeled from area yield?",
              "Site visit: has an independent site visit been conducted?",
              "Floor plan: has the specific unit floor plan been reviewed?",
              "View permanence: is the stated view permanent or subject to obstruction?",
              "Parking/storage: confirmed in SPA or assumed from listing?",
              "Developer verification: confirmed against RERA/DLD registry?",
            ].map((item, i) => <Bullet key={i} text={item} dotColor="amber" />)}
          </>
        )}
      </Page>

      {/* ============================================================ */}
      {/*  EXECUTION STEPS & CLOSING (overflows naturally)              */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <FixedHeader title="Execution Steps & Next Actions" />
        <FixedFooter />
        <Text style={s.h1}>Execution Steps</Text>
        <View style={s.accentBar} />

        <Text style={s.body}>Specific, sequenced actions required before capital commitment. Do not skip steps — each is designed to prevent a known failure mode.</Text>

        <View style={s.timelineWrap}>
          {(exSteps.length > 0 ? exSteps : strBullets).map((step, i, arr) => (
            <TimelineStep key={i} num={i + 1} text={step} isLast={i === arr.length - 1} />
          ))}
        </View>

        <View style={s.sigBlock} wrap={false}>
          <View style={s.sigRow}>
            <View style={s.sigCol}>
              <Text style={s.sigLabel}>Prepared By</Text>
              <View style={s.sigLine} />
              <Text style={s.sigName}>{realtor} — {company}</Text>
            </View>
            <View style={s.sigCol}>
              <Text style={s.sigLabel}>Reviewed By</Text>
              <View style={s.sigLine} />
              <Text style={s.sigName}>Investment Committee</Text>
            </View>
          </View>
        </View>

        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>
            DISCLAIMER — This memorandum is prepared for internal Investment Committee discussion only. It does not constitute investment advice and does not replace independent legal, technical, financial, or tax due diligence. All rental projections, growth assumptions, comparable values, and financial outcomes are estimates only — actual results may differ materially. Data marked [AI Estimate] or [Assumed] has not been independently verified. The score and recommendation reflect a proprietary analytical model and do not guarantee investment returns. This document is confidential and intended solely for the named recipient.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
