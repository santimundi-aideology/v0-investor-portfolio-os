import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

import type { InvestorRecord, ListingRecord } from "@/lib/data/types"
import type { MemoData } from "@/lib/ai/memo-context"

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 34,
    paddingBottom: 56,
    paddingLeft: 34,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.45,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 18,
    borderBottom: "1 solid #dbe2ea",
    paddingBottom: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 2,
  },
  section: {
    marginBottom: 14,
    padding: 10,
    border: "1 solid #e2e8f0",
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "35%",
    fontWeight: 700,
    color: "#1e293b",
    paddingRight: 8,
  },
  value: {
    width: "65%",
    color: "#0f172a",
  },
  paragraph: {
    marginBottom: 6,
    color: "#0f172a",
  },
  nestedBlock: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeft: "1 solid #cbd5e1",
  },
  bullet: {
    marginBottom: 3,
  },
  keyText: {
    fontWeight: 700,
    color: "#1e293b",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 34,
    right: 34,
    borderTop: "1 solid #dbe2ea",
    paddingTop: 6,
    fontSize: 8,
    textAlign: "center",
    color: "#64748b",
  },
})

interface MemoPDFDocumentProps {
  memo: MemoData
  investor: InvestorRecord
  listing: ListingRecord | null
}

function formatDate(value?: string) {
  if (!value) return "N/A"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function formatLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function renderPrimitive(value: unknown): string {
  if (value === null || value === undefined) return "N/A"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : String(value)
  if (typeof value === "string") return value
  return String(value)
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <Text style={styles.paragraph}>N/A</Text>
  }

  if (typeof value === "string") {
    const lines = value.split("\n").filter((line) => line.trim().length > 0)
    if (lines.length === 0) return <Text style={styles.paragraph}>N/A</Text>
    return (
      <View>
        {lines.map((line, index) => (
          <Text key={`line-${depth}-${index}`} style={styles.paragraph}>
            {line}
          </Text>
        ))}
      </View>
    )
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <Text style={styles.paragraph}>{renderPrimitive(value)}</Text>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={styles.paragraph}>N/A</Text>
    return (
      <View style={styles.nestedBlock}>
        {value.map((item, index) => (
          <View key={`arr-${depth}-${index}`} style={styles.bullet}>
            <Text>• {typeof item === "object" && item !== null ? "" : renderPrimitive(item)}</Text>
            {typeof item === "object" && item !== null ? (
              <View style={{ marginTop: 3 }}>{renderValue(item, depth + 1)}</View>
            ) : null}
          </View>
        ))}
      </View>
    )
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <Text style={styles.paragraph}>N/A</Text>
    return (
      <View style={styles.nestedBlock}>
        {entries.map(([key, nested]) => (
          <View key={`obj-${depth}-${key}`} style={{ marginBottom: 5 }}>
            <Text style={styles.keyText}>{formatLabel(key)}</Text>
            <View style={{ marginTop: 2 }}>{renderValue(nested, depth + 1)}</View>
          </View>
        ))}
      </View>
    )
  }

  return <Text style={styles.paragraph}>{String(value)}</Text>
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

export function MemoPDFDocument({ memo, investor, listing }: MemoPDFDocumentProps) {
  const currentVersion =
    memo.versions.find((v) => v.version === memo.currentVersion) ??
    memo.versions[memo.versions.length - 1]
  const content = currentVersion?.content
  const topLevelEntries =
    content && typeof content === "object" && !Array.isArray(content)
      ? Object.entries(content as Record<string, unknown>)
      : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Investment Committee Memo</Text>
          <Text style={styles.subtitle}>
            Prepared for {investor.name} • Generated {formatDate(new Date().toISOString())}
          </Text>
          <Text style={styles.subtitle}>Memo ID: {memo.id}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Memo Metadata</Text>
          <MetaRow label="Current State" value={memo.state} />
          <MetaRow label="Current Version" value={String(memo.currentVersion)} />
          <MetaRow label="Created At" value={formatDate(memo.createdAt)} />
          <MetaRow label="Updated At" value={formatDate(memo.updatedAt)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investor</Text>
          <MetaRow label="Name" value={investor.name} />
          <MetaRow label="Company" value={investor.company || "N/A"} />
          <MetaRow label="Email" value={investor.email || "N/A"} />
          <MetaRow label="Phone" value={investor.phone || "N/A"} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property</Text>
          <MetaRow label="Title" value={listing?.title || "N/A"} />
          <MetaRow label="Area" value={listing?.area || "N/A"} />
          <MetaRow label="Address" value={listing?.address || "N/A"} />
          <MetaRow label="Type" value={listing?.type || "N/A"} />
          <MetaRow
            label="Price"
            value={typeof listing?.price === "number" ? `AED ${listing.price.toLocaleString()}` : "N/A"}
          />
          <MetaRow
            label="Size"
            value={typeof listing?.size === "number" ? `${listing.size.toLocaleString()} sq ft` : "N/A"}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IC Memo Content (Latest Version)</Text>
          {topLevelEntries.length > 0 ? (
            topLevelEntries.map(([key, value]) => (
              <View key={key} style={{ marginBottom: 8 }}>
                <Text style={styles.keyText}>{formatLabel(key)}</Text>
                <View style={{ marginTop: 2 }}>{renderValue(value)}</View>
              </View>
            ))
          ) : (
            <View>{renderValue(content)}</View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Confidential - For internal IC use only - Version {memo.currentVersion}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
