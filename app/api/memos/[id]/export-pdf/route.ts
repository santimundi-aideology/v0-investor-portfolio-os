import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { getMemoById } from "@/lib/db/memos"
import { getInvestorById } from "@/lib/db/investors"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertMemoAccess } from "@/lib/security/rbac"
import { MemoPDFDocument } from "@/components/memos/memo-pdf-document"

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

    // Get investor
    const investor = await getInvestorById(memo.investorId)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    // Check access
    try {
      assertMemoAccess(
        { tenantId: memo.tenantId, investorId: memo.investorId },
        ctx,
        investor
      )
    } catch (err) {
      if (err instanceof AccessError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <MemoPDFDocument memo={memo} investor={investor} />
    )

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="IC_Memo_${memo.id.slice(0, 8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
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
