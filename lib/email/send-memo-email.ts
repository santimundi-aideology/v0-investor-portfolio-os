import { Resend } from "resend"

interface SendMemoEmailParams {
  to: string
  investorName: string
  memoId: string
  propertyTitle: string
  shareUrl: string
  message?: string
  keyMetrics?: {
    price?: string
    area?: string
    yield?: string
    bedrooms?: number
  }
}

interface SendMemoEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

const BRAND = {
  green: "#1A4D2E",
  greenLight: "#e8f0eb",
  gold: "#D4AF37",
  white: "#ffffff",
  gray: "#6b7280",
  grayLight: "#f3f4f6",
}

function buildEmailHtml(params: SendMemoEmailParams): string {
  const { investorName, propertyTitle, shareUrl, message, keyMetrics } = params

  const metricsRow = keyMetrics
    ? `
      <tr>
        <td style="padding: 0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.grayLight}; border-radius: 8px;">
            <tr>
              ${keyMetrics.price ? `<td style="padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 11px; text-transform: uppercase; color: ${BRAND.gray}; letter-spacing: 0.5px;">Price</div>
                <div style="font-size: 16px; font-weight: 700; color: ${BRAND.green}; margin-top: 4px;">${keyMetrics.price}</div>
              </td>` : ""}
              ${keyMetrics.area ? `<td style="padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 11px; text-transform: uppercase; color: ${BRAND.gray}; letter-spacing: 0.5px;">Area</div>
                <div style="font-size: 16px; font-weight: 700; color: ${BRAND.green}; margin-top: 4px;">${keyMetrics.area}</div>
              </td>` : ""}
              ${keyMetrics.bedrooms != null ? `<td style="padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 11px; text-transform: uppercase; color: ${BRAND.gray}; letter-spacing: 0.5px;">Beds</div>
                <div style="font-size: 16px; font-weight: 700; color: ${BRAND.green}; margin-top: 4px;">${keyMetrics.bedrooms}</div>
              </td>` : ""}
              ${keyMetrics.yield ? `<td style="padding: 16px; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: ${BRAND.gray}; letter-spacing: 0.5px;">Yield</div>
                <div style="font-size: 16px; font-weight: 700; color: ${BRAND.green}; margin-top: 4px;">${keyMetrics.yield}</div>
              </td>` : ""}
            </tr>
          </table>
        </td>
      </tr>`
    : ""

  const messageSection = message
    ? `
      <tr>
        <td style="padding: 0 32px 24px;">
          <div style="background-color: ${BRAND.greenLight}; border-radius: 8px; padding: 16px; border-left: 3px solid ${BRAND.green};">
            <p style="margin: 0; font-size: 13px; color: ${BRAND.gray}; font-style: italic;">"${message}"</p>
          </div>
        </td>
      </tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND.green};padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:22px;font-weight:700;color:${BRAND.white};letter-spacing:-0.3px;">Vantage</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px;">Investment Portfolio OS</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 16px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">New Investment Analysis</h1>
              <p style="margin:0 0 20px;font-size:14px;color:${BRAND.gray};line-height:1.5;">
                Hi ${investorName}, you've received a new investment analysis for your review.
              </p>
              <div style="background-color:${BRAND.grayLight};border-radius:8px;padding:16px;">
                <p style="margin:0;font-size:11px;text-transform:uppercase;color:${BRAND.gray};letter-spacing:0.5px;">Property</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${BRAND.green};">${propertyTitle}</p>
              </div>
            </td>
          </tr>

          ${metricsRow}
          ${messageSection}

          <!-- CTA -->
          <tr>
            <td style="padding:8px 32px 32px;" align="center">
              <a href="${shareUrl}" style="display:inline-block;background-color:${BRAND.green};color:${BRAND.white};font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">
                View Full Analysis
              </a>
            </td>
          </tr>

          <!-- PDF note -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;color:${BRAND.gray};text-align:center;">
                You can download the PDF report from the portal once you open the analysis.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND.grayLight};padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:${BRAND.gray};text-align:center;">
                This email was sent by Vantage Investment Portfolio OS.<br/>
                If you did not expect this email, please ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendMemoEmail(params: SendMemoEmailParams): Promise<SendMemoEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not configured — skipping email send")
    return { success: false, error: "RESEND_API_KEY not configured" }
  }

  const resend = new Resend(apiKey)

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Vantage <onboarding@resend.dev>"

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject: `Investment Analysis: ${params.propertyTitle}`,
      html: buildEmailHtml(params),
    })

    if (error) {
      console.error("[email] Resend error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error("[email] Failed to send:", err)
    return { success: false, error: (err as Error).message }
  }
}
