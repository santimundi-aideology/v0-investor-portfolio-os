import React from "react"
import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { requireAuthContext } from "@/lib/auth/server"
import { getInvestorById } from "@/lib/db/investors"
import { getHoldingsByInvestor } from "@/lib/db/holdings"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { AccessError } from "@/lib/security/rbac"
import { resolveImageUrl } from "@/lib/pdf/prefetch-images"
import {
  PortfolioPossessionsPdfDocument,
  type HoldingForPdf,
  type PortfolioPossessionsPdfData,
} from "@/components/investor/portfolio-possessions-pdf-document"

async function getHoldingsForPdf(investorId: string): Promise<HoldingForPdf[]> {
  const holdings = await getHoldingsByInvestor(investorId)
  const supabase = getSupabaseAdminClient()
  const result: HoldingForPdf[] = []

  for (const h of holdings) {
    let property: HoldingForPdf["property"] = null
    try {
      const { data: listing } = await supabase
        .from("listings")
        .select("title, area, type, size, bedrooms, bathrooms, attachments")
        .eq("id", h.listingId)
        .maybeSingle()
      if (listing) {
        const attachments = listing.attachments as
          | Array<{ url?: string; type?: string }>
          | null
        const imageUrl =
          attachments?.find((a) => a.type?.startsWith("image"))?.url ?? null
        property = {
          title: listing.title ?? undefined,
          area: listing.area ?? undefined,
          type: listing.type ?? undefined,
          size: listing.size ? Number(listing.size) : undefined,
          bedrooms: listing.bedrooms ? Number(listing.bedrooms) : undefined,
          bathrooms: listing.bathrooms ? Number(listing.bathrooms) : undefined,
          imageUrl: imageUrl ?? undefined,
        }
      }
    } catch {
      // ignore
    }

    const appreciationPct =
      h.purchasePrice > 0
        ? Math.round(((h.currentValue - h.purchasePrice) / h.purchasePrice) * 1000) / 10
        : 0
    const netAnnualRent =
      h.monthlyRent * 12 * h.occupancyRate - h.annualExpenses
    const netYieldPct =
      h.currentValue > 0
        ? Math.round((netAnnualRent / h.currentValue) * 1000) / 10
        : 0

    result.push({
      id: h.id,
      property,
      financials: {
        purchasePrice: h.purchasePrice,
        purchaseDate: h.purchaseDate,
        currentValue: h.currentValue,
        monthlyRent: h.monthlyRent,
        occupancyRate: h.occupancyRate,
        annualExpenses: h.annualExpenses,
        appreciationPct,
        netYieldPct,
        netAnnualRent: Math.round(netAnnualRent),
      },
    })
  }
  return result
}

/**
 * GET /api/investor/portfolio/export-pdf
 * Returns the current investor's portfolio possessions as a PDF (design-focused, with locations and highlights).
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    const investorId = ctx.investorId
    if (!investorId) {
      return NextResponse.json(
        { error: "Only investors can export their portfolio" },
        { status: 403 }
      )
    }

    const investor = await getInvestorById(investorId)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    const holdingsRaw = await getHoldingsForPdf(investorId)
    const holdings: HoldingForPdf[] = await Promise.all(
      holdingsRaw.map(async (h) => {
        const imageUrl = h.property?.imageUrl
        let resolvedUrl: string | undefined
        if (imageUrl) {
          try {
            resolvedUrl = (await resolveImageUrl(imageUrl)) ?? undefined
          } catch {
            resolvedUrl = undefined
          }
        }
        return {
          ...h,
          property: h.property
            ? { ...h.property, imageUrl: resolvedUrl }
            : null,
        }
      })
    )

    const totalValue = holdings.reduce((s, h) => s + h.financials.currentValue, 0)
    const totalCost = holdings.reduce((s, h) => s + h.financials.purchasePrice, 0)
    const appreciationPct =
      totalCost > 0
        ? Math.round(((totalValue - totalCost) / totalCost) * 1000) / 10
        : 0
    const avgYieldPct =
      holdings.length > 0
        ? Math.round(
            (holdings.reduce((s, h) => s + h.financials.netYieldPct, 0) /
              holdings.length) *
              10
          ) / 10
        : 0

    const areas = [...new Set(holdings.map((h) => h.property?.area).filter(Boolean))] as string[]
    const netAnnualIncome = holdings.reduce((s, h) => s + h.financials.netAnnualRent, 0)
    const summaryHighlight =
      holdings.length > 0
        ? `Resumen de tu portfolio: ${holdings.length} inmueble${holdings.length === 1 ? "" : "s"}${areas.length > 0 ? ` en ${areas.length} zona${areas.length === 1 ? "" : "s"}` : ""}. Valor total ${new Intl.NumberFormat("es-ES", { style: "decimal", maximumFractionDigits: 0 }).format(totalValue)} AED. Rentabilidad media ${avgYieldPct}% (neto).${appreciationPct !== 0 ? ` Revalorización desde compra: ${appreciationPct >= 0 ? "+" : ""}${appreciationPct}%.` : ""} Ingresos netos anuales estimados: ${new Intl.NumberFormat("es-ES", { style: "decimal", maximumFractionDigits: 0 }).format(netAnnualIncome)} AED.`
        : undefined

    const data: PortfolioPossessionsPdfData = {
      investorName: investor.name ?? "Investor",
      generatedAt: new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      totalValue,
      totalCost,
      netAnnualIncome,
      propertyCount: holdings.length,
      avgYieldPct,
      appreciationPct,
      holdings,
      summaryHighlight,
    }

    const pdfBuffer = await renderToBuffer(
      <PortfolioPossessionsPdfDocument data={data} />
    )
    const pdfData = new Uint8Array(pdfBuffer)
    const safeName = (investor.name || "Portfolio")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .trim() || "Portfolio_Possessions"

    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}_Possessions.pdf"`,
        "Content-Length": pdfData.byteLength.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[investor/portfolio/export-pdf] Error:", err)
    return NextResponse.json(
      { error: "Failed to generate portfolio PDF" },
      { status: 500 }
    )
  }
}
