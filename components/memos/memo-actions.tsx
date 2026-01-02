"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Edit, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Memo, Property } from "@/lib/types"

interface MemoActionsProps {
  memo: Memo
  property?: Property
}

async function copyToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function MemoActions({ memo, property }: MemoActionsProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState(false)

  const handleEdit = () => {
    const params = new URLSearchParams({
      memoId: memo.id,
      investorId: memo.investorId,
      propertyId: memo.propertyId,
    })
    router.push(`/memos/new?${params.toString()}`)
  }

  const handleDownload = () => {
    setDownloading(true)
    try {
      const printWindow = window.open("", "_blank", "width=900,height=1200")
      if (!printWindow) throw new Error("Pop-up blocked")

      const safeTitle = memo.title || "IC Memo"
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      const htmlContent = markdownToHtml(memo.content || "")
      const photoBlocks = buildPhotoBlocks(property)
      const html = `<html><head><title>${safeTitle}</title>
        <style>
          :root {
            --brand: #0f172a;
            --accent: #0ea5e9;
            --muted: #e2e8f0;
          }
          * { box-sizing: border-box; }
          body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 48px; line-height: 1.6; color: #0f172a; background: #f8fafc; }
          .cover { display: grid; gap: 12px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: linear-gradient(135deg, rgba(14,165,233,0.08), rgba(79,70,229,0.06)); }
          .brand { display:flex; align-items:center; justify-content:space-between; }
          .pill { display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:#0ea5e910; color:#0ea5e9; font-weight:600; }
          h1 { margin: 0; font-size: 26px; }
          h2 { margin: 12px 0 6px; font-size: 18px; }
          h3 { margin: 10px 0 4px; font-size: 16px; }
          .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
          .card { padding:16px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; }
          .muted { color:#475569; font-size: 13px; }
          .content { margin-top:24px; padding:20px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; }
          p { margin: 0 0 10px; }
          ul { margin: 0 0 10px 16px; padding: 0; }
          figure { margin: 18px 0; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
          figure img { max-width: 100%; border-radius: 10px; }
          figure figcaption { margin-top: 6px; font-size: 12px; color: #475569; }
        </style>
        </head><body>
          <div class="cover">
            <div class="brand">
              <div>
                <div class="pill">Investor OS • IC Memo</div>
                <h1>${safeTitle}</h1>
                <div class="muted">${memo.propertyTitle}</div>
              </div>
              <div class="muted">${today}</div>
            </div>
            <div class="grid">
              <div class="card">
                <h3>Investor</h3>
                <div class="muted">${memo.investorName}</div>
              </div>
              <div class="card">
                <h3>Property</h3>
                <div class="muted">${memo.propertyTitle}</div>
              </div>
              <div class="card">
                <h3>Status</h3>
                <div class="muted" style="text-transform:capitalize">${memo.status}</div>
              </div>
            </div>
          </div>

          <div class="content">
            ${htmlContent}
          </div>
          ${photoBlocks}
        </body></html>`

      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()

      toast.success("Print dialog opened", {
        description: "Select “Save as PDF” to download the memo.",
      })
    } catch (err) {
      toast.error("Could not open download dialog", {
        description: (err as Error)?.message ?? "Try allowing pop-ups for this site.",
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const fallbackShareUrl = `${baseUrl}/investor/memos/${memo.id}`
    try {
      const res = await fetch(`/api/memos/${memo.id}/share`, { method: "POST", headers: { "x-role": "agent" } })
      let shareUrl = fallbackShareUrl
      if (res.ok) {
        const data = (await res.json()) as { shareUrl?: string }
        if (data?.shareUrl) {
          shareUrl = `${baseUrl}${data.shareUrl}`
        }
      }

      const copied = await copyToClipboard(shareUrl)
      toast.success("Investor link ready", {
        description: copied ? "Copied share link to clipboard." : `Share link: ${shareUrl}`,
      })
    } catch {
      const copied = await copyToClipboard(fallbackShareUrl)
      toast.error("Using fallback share link", {
        description: copied ? "Copied fallback link to clipboard." : fallbackShareUrl,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleEdit} disabled={downloading || sending}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button variant="outline" onClick={handleDownload} disabled={downloading || sending}>
        <Download className="mr-2 h-4 w-4" />
        {downloading ? "Preparing…" : "Download PDF"}
      </Button>
      <Button onClick={handleSend} disabled={downloading || sending}>
        <Send className="mr-2 h-4 w-4" />
        {sending ? "Sending…" : "Send to Investor"}
      </Button>
    </div>
  )
}

function markdownToHtml(md: string) {
  const lines = md.split("\n")
  const rendered = lines
    .map((line) => {
      const img = line.match(/^!\[(.*?)\]\((.*?)\)/)
      if (img) {
        const [, alt, src] = img
        return `<figure><img src="${src}" alt="${alt || "Memo image"}"/><figcaption>${alt ?? ""}</figcaption></figure>`
      }
      if (line.startsWith("# ")) return `<h2>${escapeHtml(line.slice(2))}</h2>`
      if (line.startsWith("## ")) return `<h3>${escapeHtml(line.slice(3))}</h3>`
      if (line.startsWith("### ")) return `<h4>${escapeHtml(line.slice(4))}</h4>`
      if (line.startsWith("- ")) return `<p>• ${escapeHtml(line.slice(2))}</p>`
      if (line.match(/^\d+\. /)) return `<p>${escapeHtml(line)}</p>`
      if (!line.trim()) return "<br/>"
      return `<p>${escapeHtml(line)}</p>`
    })
    .join("\n")

  return rendered
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function buildPhotoBlocks(property?: Property) {
  if (!property) return ""
  const images = property.images?.length ? property.images : property.imageUrl ? [{ url: property.imageUrl, description: property.title }] : []
  if (!images.length) return ""
  const cards = images
    .filter((img) => img.url)
    .map(
      (img) => {
        const obj = img as { url?: string; description?: string; category?: string }
        const url = obj.url ?? ""
        const caption = obj.description || obj.category || property.title || ""
        const alt = caption || "Property photo"
        return `<figure style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:8px 0;padding:8px;background:#f8fafc;">
        <img src="${url}" alt="${escapeHtml(alt)}" style="width:100%;object-fit:cover;border-radius:10px;"/>
        <figcaption style="font-size:12px;color:#475569;margin-top:6px;">${escapeHtml(caption)}</figcaption>
      </figure>`
      },
    )
    .join("\n")

  return `<div class="content" style="margin-top:20px;">
    <h2 style="margin-bottom:10px;">Property photos</h2>
    ${cards}
  </div>`
}

