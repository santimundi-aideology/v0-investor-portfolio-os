import React from "react"
import {
  Circle,
  Defs,
  Document,
  Image,
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

import type { IntakeReportPayload } from "@/lib/pdf/intake-report"

/* ================================================================== */
/*  Brand                                                              */
/* ================================================================== */

const Brand = {
  green: "#1A4D2E",
  greenLight: "#e8f0eb",
  gold: "#D4AF37",
  goldLight: "#faf5e6",
}

/* ================================================================== */
/*  Palette                                                            */
/* ================================================================== */

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
}

/* ================================================================== */
/*  Stylesheet                                                         */
/* ================================================================== */

const s = StyleSheet.create({
  /* --- cover --- */
  coverPage: { padding: 0, backgroundColor: C.white },
  coverImageWrap: { height: "68%", width: "100%", backgroundColor: "#f0f0f0", position: "relative" },
  coverImg: { width: "100%", height: "100%", objectFit: "cover" },
  coverGradient: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 100 },
  coverBadge: { position: "absolute", bottom: 14, left: 20, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(26,77,46,0.85)", paddingTop: 5, paddingBottom: 5, paddingLeft: 8, paddingRight: 12, borderRadius: 4 },
  coverBadgeText: { fontSize: 8, color: C.white, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginLeft: 6, textTransform: "uppercase" },
  coverBottom: {
    height: "32%",
    paddingTop: 22,
    paddingRight: 44,
    paddingBottom: 18,
    paddingLeft: 44,
    justifyContent: "space-between",
  },
  coverTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  coverTitleCol: { flex: 1, marginRight: 16 },
  coverPriceCol: { alignItems: "flex-end" },
  coverPriceLabel: { fontSize: 6.5, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 2 },
  coverPriceValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: Brand.green },
  coverLabel: { fontSize: 7, letterSpacing: 3, textTransform: "uppercase", color: C.light, marginBottom: 8 },
  coverTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.black, lineHeight: 1.2, marginBottom: 3 },
  coverSub: { fontSize: 10, color: C.muted, marginBottom: 10 },
  coverInfoRow: { flexDirection: "row", marginBottom: 2 },
  coverInfoLabel: { fontSize: 7.5, color: C.light, width: 85, textTransform: "uppercase", letterSpacing: 0.6 },
  coverInfoValue: { fontSize: 7.5, color: C.dark },
  coverFooter: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 10, justifyContent: "space-between", alignItems: "center" },
  coverFooterCol: {},
  coverFooterLabel: { fontSize: 6.5, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 2 },
  coverFooterValue: { fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold" },

  /* --- inner pages --- */
  page: { paddingTop: 44, paddingRight: 44, paddingBottom: 56, paddingLeft: 44, fontFamily: "Helvetica", fontSize: 9, lineHeight: 1.5, color: C.body, backgroundColor: C.white },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 7, textTransform: "uppercase", letterSpacing: 2.5, color: C.light, marginLeft: 8 },
  headerRight: { fontSize: 7, color: C.light },

  /* --- footer (fixed on every inner page) --- */
  pageFooter: { position: "absolute", bottom: 18, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 6 },
  pageFooterLeft: { flexDirection: "row", alignItems: "center" },
  pageFooterCenter: { fontSize: 6.5, color: C.light, textTransform: "uppercase", letterSpacing: 1.5 },
  pageFooterRight: { fontSize: 6.5, color: C.light },

  /* --- typography --- */
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.black, lineHeight: 1.15, marginBottom: 18 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 10, marginTop: 22 },
  h3: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 6, marginTop: 14 },
  label: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 6 },
  body: { fontSize: 9.5, lineHeight: 1.65, color: C.body, marginBottom: 14 },
  bodySmall: { fontSize: 8.5, lineHeight: 1.55, color: C.muted },

  /* --- callout --- */
  callout: { borderLeftWidth: 3, borderLeftColor: Brand.green, paddingLeft: 14, paddingTop: 10, paddingBottom: 10, marginBottom: 20 },
  calloutGold: { borderLeftWidth: 3, borderLeftColor: Brand.gold, paddingLeft: 14, paddingTop: 10, paddingBottom: 10, marginBottom: 20, backgroundColor: Brand.goldLight },
  calloutLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 4 },
  calloutText: { fontSize: 10.5, color: C.dark, lineHeight: 1.5 },

  /* --- metrics --- */
  metricsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  metricBox: { width: "33.33%", marginBottom: 16 },
  metricNum: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.black, lineHeight: 1.1, marginBottom: 2 },
  metricLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: C.light },

  /* --- score ring --- */
  scoreWrap: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  scoreRingSvg: { width: 72, height: 72, marginRight: 16 },
  scoreNumOverlay: { position: "absolute", top: 0, left: 0, width: 72, height: 72, justifyContent: "center", alignItems: "center" },
  scoreNumText: { fontSize: 20, fontFamily: "Helvetica-Bold", color: Brand.green },
  scoreNumLabel: { fontSize: 6, color: C.light, textTransform: "uppercase", letterSpacing: 1 },
  scoreRight: { flex: 1 },

  /* --- factor bars --- */
  factorRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  factorLabel: { fontSize: 7, color: C.muted, width: 80 },
  factorBarTrack: { flex: 1, height: 5, backgroundColor: C.bg, borderRadius: 2.5, marginRight: 8 },
  factorBarFill: { height: 5, backgroundColor: Brand.green, borderRadius: 2.5 },
  factorValue: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.dark, width: 24, textAlign: "right" },

  /* --- property snapshot card --- */
  snapshotWrap: { flexDirection: "row", marginBottom: 18, borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 16 },
  snapshotThumb: { width: 120, height: 80, backgroundColor: "#f0f0f0", marginRight: 16 },
  snapshotThumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  snapshotDetails: { flex: 1 },
  snapshotTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 4 },
  snapshotSub: { fontSize: 8.5, color: C.muted, marginBottom: 6 },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap" },
  snapshotPill: { flexDirection: "row", alignItems: "center", marginRight: 16, marginBottom: 4 },
  snapshotPillLabel: { fontSize: 7, color: C.light, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 3 },
  snapshotPillValue: { fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold" },

  /* --- two-column --- */
  twoCols: { flexDirection: "row", justifyContent: "space-between" },
  colL: { width: "47%" },
  colR: { width: "47%" },

  /* --- gallery --- */
  galleryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  galleryBig: { width: "100%", height: 200, backgroundColor: "#f0f0f0", marginBottom: 8 },
  gallerySmall: { width: "32%", height: 100, backgroundColor: "#f0f0f0" },
  galleryImg: { width: "100%", height: "100%", objectFit: "cover" },
  galleryCaption: { fontSize: 7, color: C.light, textAlign: "center", marginTop: 2 },

  /* --- floor plan --- */
  floorPlanWrap: { height: 150, width: "100%", backgroundColor: "#f0f0f0", marginBottom: 6 },
  floorPlanImg: { width: "100%", height: "100%", objectFit: "contain" },

  /* --- key-value table --- */
  kvTable: { marginBottom: 14 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 7, paddingBottom: 7, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  kvRowAlt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 7, paddingBottom: 7, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg },
  kvRowHighlight: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 7, paddingBottom: 7, borderBottomWidth: 0.5, borderBottomColor: Brand.green, backgroundColor: Brand.greenLight, paddingLeft: 6, borderLeftWidth: 3, borderLeftColor: Brand.green },
  kvLabel: { fontSize: 9, color: C.body, flex: 1, paddingRight: 8 },
  kvLabelBold: { fontSize: 9, color: C.dark, flex: 1, paddingRight: 8, fontFamily: "Helvetica-Bold" },
  kvValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black, textAlign: "right" },

  /* --- financial headline metrics --- */
  finHeadline: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  finHeadlineBox: { alignItems: "center", flex: 1 },
  finHeadlineNum: { fontSize: 16, fontFamily: "Helvetica-Bold", color: Brand.green, marginBottom: 2 },
  finHeadlineLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: C.light },

  /* --- numbered features --- */
  featureRow: { flexDirection: "row", marginBottom: 14 },
  featureNum: { fontSize: 22, fontFamily: "Helvetica-Bold", color: Brand.green, width: 36, marginRight: 8 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 2 },
  featureDesc: { fontSize: 8.5, color: C.muted, lineHeight: 1.5 },

  /* --- bullet list --- */
  bulletRow: { flexDirection: "row", marginBottom: 6, paddingLeft: 2 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Brand.green, marginRight: 8, marginTop: 4 },
  bulletText: { flex: 1, fontSize: 9, color: C.body, lineHeight: 1.55 },

  /* --- map --- */
  mapWrap: { height: 170, backgroundColor: "#f0f0f0", marginBottom: 14 },
  mapImg: { width: "100%", height: "100%", objectFit: "cover" },

  /* --- decorative accent bar (now brand green) --- */
  accentBar: { width: 40, height: 3, backgroundColor: Brand.green, marginBottom: 14 },
  accentBarLight: { width: 30, height: 2, backgroundColor: C.rule, marginBottom: 10, marginTop: 4 },

  /* --- zone info cards --- */
  zoneGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14 },
  zoneCard: { width: "48%", borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 8, marginBottom: 10 },
  zoneCardLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: C.light, marginBottom: 3 },
  zoneCardValue: { fontSize: 9, color: C.dark, lineHeight: 1.45 },

  /* --- table of contents --- */
  tocPage: { paddingTop: 44, paddingRight: 44, paddingBottom: 56, paddingLeft: 44, fontFamily: "Helvetica", backgroundColor: C.white },
  tocLogoWrap: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  tocBrandText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: Brand.green, marginLeft: 12, letterSpacing: 1 },
  tocTitle: { fontSize: 28, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 6 },
  tocSubtitle: { fontSize: 10, color: C.muted, marginBottom: 30 },
  tocRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 10, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  tocNum: { fontSize: 9, fontFamily: "Helvetica-Bold", color: Brand.green, width: 24 },
  tocLabel: { fontSize: 10, color: C.dark, flex: 1 },
  tocPage2: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.dark, width: 24, textAlign: "right" },

  /* --- comps table --- */
  compsTable: { marginBottom: 14, borderTopWidth: 0.5, borderTopColor: C.rule },
  compsHeaderRow: { flexDirection: "row", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.dark, backgroundColor: C.bg },
  compsHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, color: C.dark },
  compsRow: { flexDirection: "row", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  compsRowAlt: { flexDirection: "row", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: C.bg },
  compsCell: { fontSize: 8.5, color: C.body },

  /* --- timeline execution steps --- */
  timelineWrap: { marginBottom: 14, paddingLeft: 2 },
  timelineStep: { flexDirection: "row", marginBottom: 0 },
  timelineLineCol: { width: 22, alignItems: "center" },
  timelineCircle: { width: 14, height: 14, borderRadius: 7, backgroundColor: Brand.green, justifyContent: "center", alignItems: "center" },
  timelineCircleNum: { fontSize: 6.5, color: C.white, fontFamily: "Helvetica-Bold" },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: C.rule },
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 10 },
  timelineText: { fontSize: 9, color: C.body, lineHeight: 1.5 },

  /* --- signature block --- */
  sigBlock: { marginTop: 20, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: C.rule },
  sigRow: { flexDirection: "row", justifyContent: "space-between" },
  sigCol: { width: "45%" },
  sigLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1.5, color: C.light, marginBottom: 18 },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: C.dark, marginBottom: 4, height: 1 },
  sigName: { fontSize: 8, color: C.muted },

  /* --- disclaimer --- */
  disclaimer: { marginTop: "auto", paddingTop: 14, borderTopWidth: 0.5, borderTopColor: C.rule },
  disclaimerText: { fontSize: 7, color: C.light, lineHeight: 1.5 },
})

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function findSection(payload: IntakeReportPayload, keywords: string[]) {
  const lower = keywords.map((k) => k.toLowerCase())
  return payload.sections.find((sec) => lower.some((kw) => sec.title.toLowerCase().includes(kw)))
}

function trim(text: string | undefined, max = 500) {
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

function getKeyFacts(payload: IntakeReportPayload) {
  const preferred = ["Asking Price", "Recommended Offer", "Stabilized Value", "IRR", "Gross Yield", "Net Yield", "Unit Price", "Price / sq ft", "Size", "Bedrooms / Bathrooms"]
  const all = payload.sections
    .flatMap((sec) => sec.keyValues ?? [])
    .filter((r) => r.value && r.value !== "N/A" && r.label.trim().toLowerCase() !== "property" && r.value.trim().length <= 80)
  const unique = new Map<string, { label: string; value: string }>()
  all.forEach((f) => unique.set(f.label, f))
  const ordered = preferred.map((l) => { const k = Array.from(unique.keys()).find((x) => x.toLowerCase() === l.toLowerCase()); return k ? unique.get(k) : null }).filter((r): r is { label: string; value: string } => Boolean(r))
  if (ordered.length < 6) { for (const r of Array.from(unique.values())) { if (!ordered.some((o) => o.label === r.label)) ordered.push(r); if (ordered.length >= 12) break } }
  return ordered.slice(0, 12)
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
    size: read(["size", "area"]) || "",
    location: read(["location", "area"]) || "",
    building: read(["building"]) || "",
    status: read(["status", "completion"]) || "",
    furnished: read(["furnished"]) || "",
    parking: read(["parking"]) || "",
    developer: read(["developer"]) || "",
    price: read(["asking price", "unit price", "price"]) || "",
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

/** Labels that should be highlighted in financial KV tables */
const HIGHLIGHT_LABELS = new Set([
  "recommended offer",
  "roi on equity",
  "net profit (after interest)",
  "irr",
  "total project cost",
  "stabilized value",
  "equity invested",
  "net sale proceeds after mortgage repayment",
])

function isHighlightRow(label: string) {
  return HIGHLIGHT_LABELS.has(label.toLowerCase())
}

/** Parse comparable bullet into structured data */
function parseComp(bullet: string) {
  // Format: "Name (distance) - Price | PricePerSqft | ClosingDate - Note"
  const mainMatch = bullet.match(/^(.+?)\s*\((.+?)\)\s*-\s*(.+)$/)
  if (!mainMatch) return { name: bullet, distance: "", price: "", pricePerSqft: "", date: "" }
  const name = mainMatch[1].trim()
  const distance = mainMatch[2].trim()
  const rest = mainMatch[3]
  const parts = rest.split("|").map((p) => p.trim())
  return {
    name,
    distance,
    price: parts[0] || "",
    pricePerSqft: parts[1] || "",
    date: (parts[2] || "").split(" - ")[0].trim(),
  }
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

/** Vantage logo for react-pdf (SVG recreation) */
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

/** Page header with logo */
function Header({ title, page }: { title: string; page: string }) {
  return (
    <View style={s.header} fixed>
      <View style={s.headerLeft}>
        <VantageLogo size={16} />
        <Text style={s.headerTitle}>{title}</Text>
      </View>
      <Text style={s.headerRight}>{page}</Text>
    </View>
  )
}

/** Persistent page footer */
function PageFooter({ pageNum, totalPages }: { pageNum: string; totalPages: string }) {
  return (
    <View style={s.pageFooter} fixed>
      <View style={s.pageFooterLeft}>
        <VantageLogo size={10} />
      </View>
      <Text style={s.pageFooterCenter}>Confidential</Text>
      <Text style={s.pageFooterRight}>Page {pageNum} of {totalPages}</Text>
    </View>
  )
}

/** AI Score ring with circular progress */
function ScoreRing({ score, recommendation }: { score: string; recommendation?: string }) {
  const numericScore = parseInt(score, 10)
  if (!Number.isFinite(numericScore)) return null
  const cx = 36
  const cy = 36
  const r = 28
  const arcPath = scoreArcPath(numericScore, cx, cy, r)

  return (
    <View style={s.scoreWrap} wrap={false}>
      <View style={{ width: 72, height: 72, position: "relative" }}>
        <Svg style={s.scoreRingSvg} viewBox="0 0 72 72">
          <Circle cx={cx} cy={cy} r={r} stroke={C.rule} strokeWidth={5} fill="none" />
          {arcPath ? (
            <Path d={arcPath} stroke={Brand.green} strokeWidth={5} fill="none" strokeLinecap="round" />
          ) : null}
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

/** Factor horizontal bar */
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

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <View style={s.bulletDot} />
      <Text style={s.bulletText}>{text}</Text>
    </View>
  )
}

/** KV Table with optional highlighted rows for important financial items */
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

/** Comps table with columns */
function CompsTable({ comps }: { comps: ReturnType<typeof parseComp>[] }) {
  return (
    <View style={s.compsTable}>
      <View style={s.compsHeaderRow}>
        <Text style={[s.compsHeaderCell, { flex: 2, paddingLeft: 4 }]}>Property</Text>
        <Text style={[s.compsHeaderCell, { flex: 1 }]}>Distance</Text>
        <Text style={[s.compsHeaderCell, { flex: 1.2 }]}>Price</Text>
        <Text style={[s.compsHeaderCell, { flex: 1 }]}>Per sqft</Text>
        <Text style={[s.compsHeaderCell, { flex: 0.8 }]}>Date</Text>
      </View>
      {comps.map((comp, i) => (
        <View key={i} style={i % 2 === 1 ? s.compsRowAlt : s.compsRow}>
          <Text style={[s.compsCell, { flex: 2, paddingLeft: 4, fontFamily: "Helvetica-Bold" }]}>{comp.name}</Text>
          <Text style={[s.compsCell, { flex: 1 }]}>{comp.distance}</Text>
          <Text style={[s.compsCell, { flex: 1.2 }]}>{comp.price}</Text>
          <Text style={[s.compsCell, { flex: 1 }]}>{comp.pricePerSqft}</Text>
          <Text style={[s.compsCell, { flex: 0.8 }]}>{comp.date}</Text>
        </View>
      ))}
    </View>
  )
}

/** Timeline step */
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
  const facts = getKeyFacts(payload)
  const gallery = payload.galleryImageUrls?.slice(0, 4) || []
  const floorPlan = payload.floorPlanImageUrls?.[0]
  const { company, realtor, investor } = getCoverInfo(payload)
  const snap = getPropertySnapshot(payload)
  const totalPages = "9"

  const execSec = findSection(payload, ["executive", "summary", "thesis", "project summary"]) || payload.sections[0]
  const propSec = findSection(payload, ["property snapshot", "project snapshot"])
  const locSec = findSection(payload, ["location", "neighborhood"])
  const mktSec = findSection(payload, ["market"])
  const finSec = findSection(payload, ["pricing", "financial", "return"])
  const roiSec = findSection(payload, ["roi on equity", "equity bridge", "mortgage"])
  const grwSec = findSection(payload, ["future value", "growth", "appreciation", "outlook"])
  const cmpSec = findSection(payload, ["comparable"])
  const strSec = findSection(payload, ["strategy", "execution"])
  const rskSec = findSection(payload, ["risk"])
  const finRec = findSection(payload, ["final recommendation"])

  const hlBullets = bullets(execSec?.bullets).slice(0, 6)
  const locBullets = bullets(locSec?.bullets).slice(0, 6)
  const mktBullets = bullets(mktSec?.bullets).slice(0, 6)
  const grwBullets = bullets(grwSec?.bullets).slice(0, 6)
  const rskBullets = bullets(rskSec?.bullets).slice(0, 7)
  const strBullets = bullets(strSec?.bullets, finRec?.bullets).slice(0, 7)
  const cmpBullets = bullets(cmpSec?.bullets).slice(0, 7)

  const propFacts = (propSec?.keyValues ?? []).filter((x) => x.value && x.value !== "N/A").slice(0, 14)
  const finFacts = (finSec?.keyValues ?? []).filter((x) => x.value && x.value !== "N/A").slice(0, 14)
  const roiFacts = (roiSec?.keyValues ?? []).filter((x) => x.value && x.value !== "N/A").slice(0, 16)
  const grwFacts = (grwSec?.keyValues ?? []).filter((x) => x.value && x.value !== "N/A").slice(0, 8)

  const summaryBody = trim(execSec?.body || payload.summary, 900)
  const locationBody = trim(locSec?.body, 600)
  const marketBody = trim(mktSec?.body, 500)
  const growthBody = trim(grwSec?.body, 500)
  const strategyBody = trim(strSec?.body, 500)
  const finalBody = trim(finRec?.body, 500)

  const topMetrics = facts.slice(0, 6)

  // Extract financial headline numbers for pages 5-6
  const findFinVal = (kws: string[]) => finFacts.find((f) => kws.some((k) => f.label.toLowerCase().includes(k)))?.value
  const findRoiVal = (kws: string[]) => roiFacts.find((f) => kws.some((k) => f.label.toLowerCase().includes(k)))?.value
  const finHeadlinePrice = findFinVal(["asking price"]) || snap.price
  const finHeadlineIRR = findFinVal(["irr"])
  const finHeadlineYield = findFinVal(["net yield", "gross yield"])
  const roiHeadlineROI = findRoiVal(["roi on equity"])
  const roiHeadlineEquity = findRoiVal(["equity invested"])
  const roiHeadlineProfit = findRoiVal(["net profit"])

  // Parse comps for table
  const parsedComps = cmpBullets.map(parseComp)
  const hasStructuredComps = parsedComps.some((c) => c.price !== "")

  // ToC entries
  const tocEntries = [
    { num: "01", label: "Cover", page: "01" },
    { num: "02", label: "Table of Contents", page: "02" },
    { num: "03", label: "Executive Summary", page: "03" },
    { num: "04", label: "Property Details", page: "04" },
    { num: "05", label: "Location & Zone Analysis", page: "05" },
    { num: "06", label: "Financial Profile", page: "06" },
    { num: "07", label: "Capital Structure & ROI", page: "07" },
    { num: "08", label: "Growth & Comparables", page: "08" },
    { num: "09", label: "Risk, Execution & Closing", page: "09" },
  ]

  return (
    <Document>
      {/* ============================================================ */}
      {/*  PAGE 1 — COVER                                               */}
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
          {/* Gradient overlay at bottom of image */}
          <View style={s.coverGradient}>
            <Svg width="595" height="100" viewBox="0 0 595 100">
              <Defs>
                <LinearGradient id="coverGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#000000" stopOpacity={0} />
                  <Stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="595" height="100" fill="url(#coverGrad)" />
            </Svg>
          </View>
          {/* Brand badge */}
          <View style={s.coverBadge}>
            <VantageLogo size={14} />
            <Text style={s.coverBadgeText}>Vantage</Text>
          </View>
        </View>
        <View style={s.coverBottom}>
          <View>
            <Text style={s.coverLabel}>Investment Committee Memorandum</Text>
            <View style={s.coverTitleRow}>
              <View style={s.coverTitleCol}>
                <Text style={s.coverTitle}>{title}</Text>
                {location ? <Text style={s.coverSub}>{location}</Text> : null}
              </View>
              {snap.price ? (
                <View style={s.coverPriceCol}>
                  <Text style={s.coverPriceLabel}>Asking Price</Text>
                  <Text style={s.coverPriceValue}>{snap.price}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ marginTop: 4 }}>
              <View style={s.coverInfoRow}><Text style={s.coverInfoLabel}>Company</Text><Text style={s.coverInfoValue}>{company}</Text></View>
              <View style={s.coverInfoRow}><Text style={s.coverInfoLabel}>Advisor</Text><Text style={s.coverInfoValue}>{realtor}</Text></View>
              <View style={s.coverInfoRow}><Text style={s.coverInfoLabel}>Prepared For</Text><Text style={s.coverInfoValue}>{investor}</Text></View>
            </View>
          </View>
          <View style={s.coverFooter}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <VantageLogo size={12} />
            </View>
            <View style={s.coverFooterCol}><Text style={s.coverFooterLabel}>Date</Text><Text style={s.coverFooterValue}>{fmtDate(gen)}</Text></View>
            <View style={s.coverFooterCol}><Text style={s.coverFooterLabel}>Reference</Text><Text style={s.coverFooterValue}>{ref}</Text></View>
            <View style={s.coverFooterCol}><Text style={s.coverFooterLabel}>Classification</Text><Text style={s.coverFooterValue}>Confidential</Text></View>
          </View>
        </View>
      </Page>

      {/* ============================================================ */}
      {/*  PAGE 2 — TABLE OF CONTENTS                                   */}
      {/* ============================================================ */}
      <Page size="A4" style={s.tocPage}>
        <View style={s.tocLogoWrap}>
          <VantageLogo size={32} />
          <Text style={s.tocBrandText}>Vantage</Text>
        </View>
        <Text style={s.tocTitle}>Contents</Text>
        <Text style={s.tocSubtitle}>{title} — {location}</Text>
        <View style={s.accentBar} />
        {tocEntries.map((entry, i) => (
          <View key={i} style={s.tocRow}>
            <Text style={s.tocNum}>{entry.num}</Text>
            <Text style={s.tocLabel}>{entry.label}</Text>
            <Text style={s.tocPage2}>{entry.page}</Text>
          </View>
        ))}
        <PageFooter pageNum="02" totalPages={totalPages} />
      </Page>

      {/* ============================================================ */}
      {/*  PAGE 3 — EXECUTIVE SUMMARY + PROPERTY CONTEXT                */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <Header title="Executive Summary" page="03" />
        <Text style={s.h1}>Investment Overview</Text>

        {/* Property snapshot card */}
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
              <SnapshotPill label="Price" value={snap.price} />
              <SnapshotPill label="Beds" value={snap.bedrooms} />
              <SnapshotPill label="Size" value={snap.size} />
              <SnapshotPill label="Status" value={snap.status} />
              <SnapshotPill label="Furnished" value={snap.furnished} />
              <SnapshotPill label="Parking" value={snap.parking} />
              <SnapshotPill label="Developer" value={snap.developer} />
            </View>
          </View>
        </View>

        {/* Score ring + recommendation */}
        {payload.score ? (
          <ScoreRing score={payload.score} recommendation={payload.recommendation} />
        ) : payload.recommendation ? (
          <View style={s.calloutGold}>
            <Text style={s.calloutLabel}>IC Recommendation</Text>
            <Text style={s.calloutText}>{payload.recommendation}</Text>
          </View>
        ) : null}

        {/* Factor breakdown */}
        {payload.factors ? (
          <View style={{ marginBottom: 14 }} wrap={false}>
            <Text style={s.label}>Score Breakdown</Text>
            <FactorBar label="Mandate Fit" value={payload.factors.mandateFit ?? 0} />
            <FactorBar label="Market Timing" value={payload.factors.marketTiming ?? 0} />
            <FactorBar label="Portfolio Fit" value={payload.factors.portfolioFit ?? 0} />
            <FactorBar label="Risk Alignment" value={payload.factors.riskAlignment ?? 0} />
          </View>
        ) : null}

        <Text style={s.body}>{summaryBody || "This memorandum presents a disciplined assessment of the opportunity based on pricing, location quality, projected returns, and execution feasibility."}</Text>

        <View style={s.accentBar} />
        <Text style={s.label}>Key Metrics</Text>
        <View style={s.metricsRow}>
          {topMetrics.map((m, i) => (
            <View key={i} style={s.metricBox}>
              <Text style={s.metricNum}>{m.value}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {hlBullets.length > 0 ? (
          <>
            <Text style={s.label}>Key Highlights</Text>
            {hlBullets.map((b, i) => <Bullet key={i} text={b} />)}
          </>
        ) : null}

        <PageFooter pageNum="03" totalPages={totalPages} />
      </Page>

      {/* ============================================================ */}
      {/*  PAGE 4 — PROPERTY DETAILS                                    */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <Header title="Property & Location" page="04" />
        <Text style={s.h1}>Property Details</Text>

        {/* Gallery: hero + 3 thumbnails */}
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
            <Text style={s.galleryCaption}>
              {gallery.length === 1 ? "Property exterior" : `Property images (${gallery.length} of ${(payload.galleryImageUrls?.length ?? 0) + 1})`}
            </Text>
          </>
        ) : null}

        {/* Floor plan */}
        {floorPlan ? (
          <View wrap={false} style={{ marginTop: 10 }}>
            <Text style={s.label}>Floor Plan</Text>
            <View style={s.floorPlanWrap}>
              <Image src={floorPlan} style={s.floorPlanImg} />
            </View>
          </View>
        ) : null}

        {/* Full-width specifications table */}
        <View style={s.accentBar} />
        <Text style={s.label}>Property Specifications</Text>
        <KVTable items={(propFacts.length ? propFacts : facts).slice(0, 14)} />

        <PageFooter pageNum="04" totalPages={totalPages} />
      </Page>

      {/* ============================================================ */}
      {/*  PAGE 5 — LOCATION & ZONE DEEP DIVE                          */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <Header title="Location Analysis" page="05" />
        <Text style={s.h1}>Neighborhood & Zone</Text>

        {/* Map full-width */}
        {payload.mapImageUrl ? (
          <View style={s.mapWrap}><Image src={payload.mapImageUrl} style={s.mapImg} /></View>
        ) : (
          <View style={[s.mapWrap, { justifyContent: "center", alignItems: "center" }]}>
            <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6" stroke={C.light} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            <Text style={{ marginTop: 6, fontSize: 8, color: C.light }}>Map data unavailable</Text>
          </View>
        )}

        <View style={s.accentBar} />
        <Text style={s.body}>{locationBody || "The subject property is situated in a well-established zone with strong connectivity, diverse amenities, and proven demand drivers supporting both rental and capital appreciation strategies."}</Text>

        {locBullets.length > 0 ? (
          <>
            <Text style={s.label}>Area Highlights</Text>
            <View style={s.zoneGrid}>
              {locBullets.map((b, i) => (
                <View key={i} style={s.zoneCard}>
                  <Text style={s.zoneCardLabel}>Highlight {String(i + 1).padStart(2, "0")}</Text>
                  <Text style={s.zoneCardValue}>{b}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {marketBody ? (
          <>
            <View style={s.accentBarLight} />
            <Text style={s.h3}>Market Context</Text>
            <Text style={s.body}>{marketBody}</Text>
          </>
        ) : null}

        {mktBullets.length > 0 ? (
          <>
            <Text style={s.label}>Market Drivers</Text>
            {mktBullets.slice(0, 4).map((b, i) => <Bullet key={i} text={b} />)}
          </>
        ) : null}

        <PageFooter pageNum="05" totalPages={totalPages} />
      </Page>

      {/* ============================================================ */}
      {/*  PAGE 6 — PRICING & RETURNS                                   */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <Header title="Pricing & Returns" page="06" />
        <Text style={s.h1}>Financial Profile</Text>
        <View style={s.accentBar} />

        {/* Headline metrics */}
        {(finHeadlinePrice || finHeadlineIRR || finHeadlineYield) ? (
          <View style={s.finHeadline} wrap={false}>
            {finHeadlinePrice ? (
              <View style={s.finHeadlineBox}>
                <Text style={s.finHeadlineNum}>{finHeadlinePrice}</Text>
                <Text style={s.finHeadlineLabel}>Asking Price</Text>
              </View>
            ) : null}
            {finHeadlineIRR ? (
              <View style={s.finHeadlineBox}>
                <Text style={s.finHeadlineNum}>{finHeadlineIRR}</Text>
                <Text style={s.finHeadlineLabel}>IRR</Text>
              </View>
            ) : null}
            {finHeadlineYield ? (
              <View style={s.finHeadlineBox}>
                <Text style={s.finHeadlineNum}>{finHeadlineYield}</Text>
                <Text style={s.finHeadlineLabel}>Yield</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={s.body}>The following return metrics consolidate acquisition pricing, income assumptions, and expected performance parameters under the current underwriting base case.</Text>
        {finFacts.length > 0 ? <KVTable items={finFacts} highlight /> : <Text style={s.bodySmall}>Detailed financial breakdown pending final data.</Text>}

        <PageFooter pageNum="06" totalPages={totalPages} />
      </Page>

      {/* ============================================================ */}
      {/*  PAGE 7 — ROI BRIDGE                                          */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <Header title="Capital Structure" page="07" />
        <Text style={s.h1}>ROI on Equity Bridge</Text>
        <View style={s.accentBar} />

        {/* Headline metrics */}
        {(roiHeadlineROI || roiHeadlineEquity || roiHeadlineProfit) ? (
          <View style={s.finHeadline} wrap={false}>
            {roiHeadlineEquity ? (
              <View style={s.finHeadlineBox}>
                <Text style={s.finHeadlineNum}>{roiHeadlineEquity}</Text>
                <Text style={s.finHeadlineLabel}>Equity Invested</Text>
              </View>
            ) : null}
            {roiHeadlineProfit ? (
              <View style={s.finHeadlineBox}>
                <Text style={s.finHeadlineNum}>{roiHeadlineProfit}</Text>
                <Text style={s.finHeadlineLabel}>Net Profit</Text>
              </View>
            ) : null}
            {roiHeadlineROI ? (
              <View style={s.finHeadlineBox}>
                <Text style={s.finHeadlineNum}>{roiHeadlineROI}</Text>
                <Text style={s.finHeadlineLabel}>ROI on Equity</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={s.body}>This bridge outlines total project cost, leverage assumptions, and disposition outcomes — supporting a transparent view of equity-at-risk and expected net proceeds.</Text>
        {roiFacts.length > 0 ? <KVTable items={roiFacts} highlight /> : <Text style={s.bodySmall}>ROI bridge data not available for this opportunity.</Text>}

        <PageFooter pageNum="07" totalPages={totalPages} />
      </Page>

      {/* ============================================================ */}
      {/*  PAGE 8 — GROWTH & COMPARABLES                                */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <Header title="Growth & Comparables" page="08" />
        <Text style={s.h1}>Future Value Outlook</Text>
        <View style={s.accentBar} />
        <Text style={s.body}>{growthBody || "Projected value trajectory reflects neighborhood evolution, expected demand inflow, and sensitivity considerations around supply timing."}</Text>

        <View style={s.twoCols} wrap={false}>
          <View style={s.colL}>
            {grwFacts.length > 0 ? (
              <>
                <Text style={s.label}>Projections</Text>
                <KVTable items={grwFacts} />
              </>
            ) : null}
            {grwBullets.length > 0 ? (
              <>
                <Text style={s.label}>Growth Drivers</Text>
                {grwBullets.map((b, i) => <Bullet key={i} text={b} />)}
              </>
            ) : null}
          </View>
          <View style={s.colR}>
            <Text style={s.label}>Comparable Transactions</Text>
            {hasStructuredComps ? (
              <CompsTable comps={parsedComps} />
            ) : cmpBullets.length > 0 ? (
              cmpBullets.map((b, i) => <Bullet key={i} text={b} />)
            ) : (
              <Text style={s.bodySmall}>Comparable evidence to be confirmed at committee circulation stage.</Text>
            )}
          </View>
        </View>

        <PageFooter pageNum="08" totalPages={totalPages} />
      </Page>

      {/* ============================================================ */}
      {/*  PAGE 9 — RISK, STRATEGY & CLOSING                           */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <Header title="Risk & Execution" page="09" />
        <Text style={s.h1}>Risk Assessment & Execution</Text>
        <View style={s.accentBar} />

        <View style={s.twoCols} wrap={false}>
          <View style={s.colL}>
            <Text style={s.label}>Risk Factors</Text>
            {rskBullets.length > 0 ? (
              rskBullets.map((b, i) => <Bullet key={i} text={b} />)
            ) : (
              <Text style={s.bodySmall}>No material risks flagged in preliminary review.</Text>
            )}
          </View>
          <View style={s.colR}>
            <Text style={s.label}>Execution Steps</Text>
            {strBullets.length > 0 ? (
              <View style={s.timelineWrap}>
                {strBullets.map((b, i) => (
                  <TimelineStep key={i} num={i + 1} text={b} isLast={i === strBullets.length - 1} />
                ))}
              </View>
            ) : (
              <Text style={s.bodySmall}>Standard due diligence workflow applies.</Text>
            )}
          </View>
        </View>

        {strategyBody ? (
          <>
            <Text style={s.h2}>Strategy</Text>
            <Text style={s.body}>{strategyBody}</Text>
          </>
        ) : null}

        {finalBody ? (
          <View style={s.callout}>
            <Text style={s.calloutLabel}>Final Committee Positioning</Text>
            <Text style={s.calloutText}>{finalBody}</Text>
          </View>
        ) : null}

        {/* Signature block */}
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
            This memorandum is prepared for internal investment committee discussion only. It does not constitute investment advice and does not replace independent legal, technical, or tax due diligence. All assumptions, projected values, and outcomes should be independently validated before any commitment. The information herein is confidential and intended solely for the named recipient.
          </Text>
        </View>

        <PageFooter pageNum="09" totalPages={totalPages} />
      </Page>
    </Document>
  )
}
