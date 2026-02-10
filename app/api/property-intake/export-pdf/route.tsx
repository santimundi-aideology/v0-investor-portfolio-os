import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"

import { requireAuthContext } from "@/lib/auth/server"
import { IntakeReportPdfDocument } from "@/components/memos/intake-report-pdf-document"
import type { IntakeReportPayload } from "@/lib/pdf/intake-report"

export async function POST(req: Request) {
  try {
    await requireAuthContext(req)
    const body = (await req.json()) as { payload?: IntakeReportPayload; fileName?: string }
    const payload = body.payload

    if (!payload || typeof payload.title !== "string" || !Array.isArray(payload.sections)) {
      return NextResponse.json({ error: "Invalid report payload" }, { status: 400 })
    }

    const pdfBuffer = await renderToBuffer(<IntakeReportPdfDocument payload={payload} />)
    const pdfData = new Uint8Array(pdfBuffer)
    const safeFileName = (body.fileName || payload.title || "property_intake_report")
      .replace(/[^a-z0-9_\-]/gi, "_")
      .toLowerCase()

    return new NextResponse(pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFileName}.pdf"`,
        "Content-Length": pdfData.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("[property-intake/export-pdf] Error:", error)
    return NextResponse.json({ error: "Failed to generate report PDF" }, { status: 500 })
  }
}
