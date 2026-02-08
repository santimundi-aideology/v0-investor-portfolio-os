import React from "react"
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import type { Memo, Investor } from "@/lib/types"

// Register fonts if needed (optional)
// Font.register({ family: 'Inter', src: '/fonts/Inter-Regular.ttf' })

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 30,
    borderBottom: "2 solid #000",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  },
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontWeight: "bold",
  },
  value: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#666",
    borderTop: "1 solid #ccc",
    paddingTop: 10,
  },
})

interface MemoPDFDocumentProps {
  memo: Memo
  investor: Investor
}

export function MemoPDFDocument({ memo, investor }: MemoPDFDocumentProps) {
  const propertyData = memo.propertyData as Record<string, unknown> | undefined
  const evaluation = memo.evaluation as Record<string, unknown> | undefined

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Investment Committee Memo</Text>
          <Text style={styles.subtitle}>
            Prepared for {investor.name} • {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Property Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          {propertyData && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Title:</Text>
                <Text style={styles.value}>{propertyData.title as string || "N/A"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Location:</Text>
                <Text style={styles.value}>
                  {[propertyData.area, propertyData.subArea].filter(Boolean).join(", ") || "N/A"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Price:</Text>
                <Text style={styles.value}>
                  AED {Number(propertyData.price || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Type:</Text>
                <Text style={styles.value}>{propertyData.propertyType as string || "N/A"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Bedrooms:</Text>
                <Text style={styles.value}>{propertyData.bedrooms as number || "N/A"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Size:</Text>
                <Text style={styles.value}>
                  {propertyData.size ? `${propertyData.size} sqft` : "N/A"}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Executive Summary */}
        {memo.executiveSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            <Text style={styles.paragraph}>{memo.executiveSummary}</Text>
          </View>
        )}

        {/* Investment Analysis */}
        {evaluation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Investment Analysis</Text>
            {evaluation.score && (
              <View style={styles.row}>
                <Text style={styles.label}>Investment Score:</Text>
                <Text style={styles.value}>{evaluation.score as number}/100</Text>
              </View>
            )}
            {evaluation.recommendation && (
              <View style={styles.row}>
                <Text style={styles.label}>Recommendation:</Text>
                <Text style={styles.value}>
                  {(evaluation.recommendation as string).toUpperCase()}
                </Text>
              </View>
            )}
            {evaluation.keyHighlights && (
              <Text style={styles.paragraph}>
                {(evaluation.keyHighlights as string[]).join(" • ")}
              </Text>
            )}
          </View>
        )}

        {/* Risk Assessment */}
        {memo.riskAssessment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk Assessment</Text>
            <Text style={styles.paragraph}>{memo.riskAssessment}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This document is confidential and intended solely for {investor.name}. 
            Generated on {new Date().toLocaleString()}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
