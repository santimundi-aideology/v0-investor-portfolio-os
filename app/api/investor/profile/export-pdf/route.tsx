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
  InvestorProfilePdfDocument,
  type InvestorProfilePdfData,
  type HoldingForPdf,
} from "@/components/investor/investor-profile-pdf-document"
import type { InvestorRecord } from "@/lib/data/types"
import type { Mandate } from "@/lib/types"

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

function toPdfData(
  record: InvestorRecord,
  holdings: HoldingForPdf[]
): Omit<InvestorProfilePdfData, "avatar"> {
  return {
    name: record.name,
    company: record.company,
    email: record.email,
    phone: record.phone,
    description: record.description,
    mandate: record.mandate as Mandate | undefined,
    thesisReturnStyle: record.thesisReturnStyle,
    thesisHoldPeriod: record.thesisHoldPeriod,
    thesisPreferredExits: record.thesisPreferredExits,
    thesisNotes: record.thesisNotes,
    holdings,
  }
}

/**
 * GET /api/investor/profile/export-pdf
 * Returns the current investor's profile as a PDF (CV-style).
 * Requires auth; uses ctx.investorId for the logged-in investor.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    const investorId = ctx.investorId
    if (!investorId) {
      return NextResponse.json(
        { error: "Only investors can export their profile" },
        { status: 403 }
      )
    }

    const investor = await getInvestorById(investorId)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    const [holdingsRaw, avatarDataUri] = await Promise.all([
      getHoldingsForPdf(investorId),
      resolveImageUrl(investor.avatar ?? undefined),
    ])
    // Resolve property image URLs to data URIs for PDF embedding
    const holdings: HoldingForPdf[] = await Promise.all(
      holdingsRaw.map(async (h) => {
        const imageUrl = h.property?.imageUrl
        const resolvedUrl = imageUrl
          ? await resolveImageUrl(imageUrl)
          : undefined
        return {
          ...h,
          property: h.property
            ? { ...h.property, imageUrl: resolvedUrl }
            : null,
        }
      })
    )
    const baseData = toPdfData(investor, holdings)
    const data: InvestorProfilePdfData = {
      ...baseData,
      avatar: avatarDataUri ?? undefined,
    }
    const pdfBuffer = await renderToBuffer(<InvestorProfilePdfDocument data={data} />)
    const pdfData = new Uint8Array(pdfBuffer)
    const safeName = (investor.name || "Investor").replace(/[^a-zA-Z0-9\s-]/g, "").trim() || "Investor_Profile"

    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}_Profile.pdf"`,
        "Content-Length": pdfData.byteLength.toString(),
      },
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[investor/profile/export-pdf] Error:", err)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
