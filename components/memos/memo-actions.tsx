"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Edit, Send, FileText, ChevronDown, Trash2, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MemoShareDialog } from "@/components/memos/memo-share-dialog"
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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleEdit = () => {
    const params = new URLSearchParams({
      memoId: memo.id,
      investorId: memo.investorId,
      propertyId: memo.propertyId,
    })
    router.push(`/memos/new?${params.toString()}`)
  }

  const handleDownloadPDF = () => {
    void (async () => {
      setDownloading(true)
      try {
        const response = await fetch(`/api/memos/${memo.id}/export-pdf`)
        if (!response.ok) {
          throw new Error("Failed to generate PDF")
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${(memo.title || "IC_Memo").replace(/[^a-z0-9]/gi, "_")}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success("PDF downloaded", {
          description: "The IC memo has been exported with full detail.",
        })
      } catch (err) {
        toast.error("Could not download PDF", {
          description: (err as Error)?.message ?? "Please try again.",
        })
      } finally {
        setDownloading(false)
      }
    })()
  }

  const handleDownloadWord = () => {
    setDownloading(true)
    try {
      const safeTitle = memo.title || "IC Memo"
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      const htmlContent = markdownToHtml(memo.content || "")
      const analysisBlocks = buildAnalysisBlocks(memo)
      const photoBlocks = buildPhotoBlocks(property)
      
      // Word-compatible HTML with proper namespaces
      const wordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${safeTitle}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { margin: 1in; }
    body { 
      font-family: Calibri, Arial, sans-serif; 
      line-height: 1.6; 
      color: #0f172a; 
      font-size: 11pt;
    }
    h1 { font-size: 24pt; color: #0ea5e9; margin-bottom: 12pt; }
    h2 { font-size: 18pt; color: #0f172a; margin-top: 18pt; margin-bottom: 10pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 6pt; }
    h3 { font-size: 14pt; color: #0f172a; margin-top: 12pt; margin-bottom: 8pt; }
    .cover { 
      border: 2px solid #0ea5e9; 
      padding: 20pt; 
      margin-bottom: 20pt;
      background-color: #f8fafc;
    }
    .pill { 
      display: inline-block;
      background-color: #e0f2fe; 
      color: #0ea5e9; 
      padding: 6pt 12pt; 
      border-radius: 12pt;
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 8pt;
    }
    .meta { color: #475569; font-size: 10pt; margin: 4pt 0; }
    .section { margin: 16pt 0; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
    td { padding: 8pt; border: 1px solid #e2e8f0; vertical-align: top; }
    ul { margin: 8pt 0; padding-left: 20pt; }
    li { margin: 4pt 0; }
    img { max-width: 100%; height: auto; }
    .photo { margin: 12pt 0; padding: 8pt; border: 1px solid #e2e8f0; }
    .photo-caption { font-size: 9pt; color: #475569; margin-top: 6pt; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="pill">Vantage • IC Memo</div>
    <h1>${safeTitle}</h1>
    <div class="meta">${memo.propertyTitle}</div>
    <div class="meta">Date: ${today}</div>
    <div class="meta">Investor: ${memo.investorName}</div>
    <div class="meta">Status: <strong style="text-transform:capitalize">${memo.status}</strong></div>
  </div>

  <div class="section">
    ${htmlContent}
  </div>
  
  ${analysisBlocks}
  ${photoBlocks}
  
  <div style="margin-top: 40pt; padding-top: 12pt; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9pt; text-align: center;">
    Generated by Vantage • ${today}
  </div>
</body>
</html>`

      // Create blob and download
      const blob = new Blob([wordHtml], { type: "application/msword" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${safeTitle.replace(/[^a-z0-9]/gi, "_")}.doc`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Word document downloaded", {
        description: "The memo has been saved as a Word document.",
      })
    } catch (err) {
      toast.error("Could not download Word document", {
        description: (err as Error)?.message ?? "Please try again.",
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/memos/${memo.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete memo")
      }
      toast.success("IC memo deleted")
      setDeleteOpen(false)
      router.push("/memos")
    } catch (err) {
      toast.error("Could not delete memo", {
        description: (err as Error)?.message ?? "Please try again.",
      })
    } finally {
      setDeleting(false)
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={downloading || sending}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Preparing…" : "Download"}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownloadPDF} disabled={downloading || sending}>
            <FileText className="mr-2 h-4 w-4" />
            Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadWord} disabled={downloading || sending}>
            <FileText className="mr-2 h-4 w-4" />
            Download as Word
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MemoShareDialog
        memoId={memo.id}
        investorEmail={undefined} // Will be fetched from API if needed
        investorPhone={undefined}
        investorWhatsApp={undefined}
        onShare={() => {
          toast.success("Memo shared", {
            description: "Share link created and sent to investor",
          })
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={downloading || sending} aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete memo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IC memo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The memo and its versions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 text-white shadow-sm hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function buildAnalysisBlocks(memo: Memo) {
  const a = memo.analysis
  if (!a) return ""

  const section = (title: string, body: string) =>
    `<div class="content" style="margin-top:20px;"><h2 style="margin-bottom:8px;">${escapeHtml(title)}</h2>${body}</div>`

  const keyPoints = a.keyPoints?.length
    ? `<ul>${a.keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
    : ""
  const execSummary = section("Executive summary", `<p>${escapeHtml(a.summary)}</p>${keyPoints}`)

  const neighborhood = a.neighborhood
    ? section(
        "Neighborhood analysis",
        `<p><strong>${escapeHtml(a.neighborhood.name)}</strong> (Grade ${escapeHtml(a.neighborhood.grade)})</p>
         <p>${escapeHtml(a.neighborhood.profile)}</p>
         ${a.neighborhood.highlights?.length ? `<ul>${a.neighborhood.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>` : ""}
         ${
           a.neighborhood.metrics?.length
             ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">${a.neighborhood.metrics
                 .map((m) => `<div style="padding:8px;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-weight:600;">${escapeHtml(m.label)}</div><div>${escapeHtml(m.value)}</div>${m.trend ? `<div style="color:#475569;font-size:12px;">${escapeHtml(m.trend)}</div>` : ""}</div>`)
                 .join("")}</div>`
             : ""
         }`,
      )
    : ""

  const property = a.property
    ? section(
        "Property description",
        `<p>${escapeHtml(a.property.description)}</p>
         <p class="muted">${escapeHtml(a.property.condition)}</p>
         ${
           a.property.specs?.length
             ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">${a.property.specs
                 .map((s) => `<div style="padding:8px;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-weight:600;">${escapeHtml(s.label)}</div><div>${escapeHtml(s.value)}</div></div>`)
                 .join("")}</div>`
             : ""
         }
         ${a.property.highlights?.length ? `<ul>${a.property.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>` : ""}`,
      )
    : ""

  const market = a.market
    ? section(
        "Market analysis",
        `<p>${escapeHtml(a.market.overview)}</p>
         ${a.market.drivers?.length ? `<ul>${a.market.drivers.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>` : ""}
         ${a.market.supply ? `<p><strong>Supply:</strong> ${escapeHtml(a.market.supply)}</p>` : ""}
         ${a.market.demand ? `<p><strong>Demand:</strong> ${escapeHtml(a.market.demand)}</p>` : ""}
         ${a.market.absorption ? `<p><strong>Absorption:</strong> ${escapeHtml(a.market.absorption)}</p>` : ""}`,
      )
    : ""

  const pricing = a.pricing
    ? section(
        "Pricing & upside",
        `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
          ${pricingRow("Asking price", currency(a.pricing.askingPrice))}
          ${pricingRow("Price / sqft", currency(a.pricing.pricePerSqft))}
          ${pricingRow("Recommended offer", currency(a.pricing.recommendedOffer))}
          ${pricingRow("Value-add budget", a.pricing.valueAddBudget ? currency(a.pricing.valueAddBudget) : "")}
          ${pricingRow("Stabilized value", a.pricing.stabilizedValue ? currency(a.pricing.stabilizedValue) : "")}
          ${pricingRow("Current rent", a.pricing.rentCurrent ? currency(a.pricing.rentCurrent) : "")}
          ${pricingRow("Potential rent", a.pricing.rentPotential ? currency(a.pricing.rentPotential) : "")}
          ${pricingRow("IRR", a.pricing.irr !== undefined ? percent(a.pricing.irr) : "")}
          ${pricingRow("Equity multiple", a.pricing.equityMultiple !== undefined ? a.pricing.equityMultiple.toFixed(2) : "")}
        </div>`,
      )
    : ""

  const comps = a.comparables?.length
    ? section(
        "Comparable sales",
        `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">
          ${a.comparables
            .map(
              (c) => `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
                <div style="font-weight:700;">${escapeHtml(c.name)}</div>
                <div class="muted">${escapeHtml(c.distance)}</div>
                <div>${escapeHtml(c.size)}</div>
                <div>Price: ${currency(c.price)}</div>
                <div>Price/sqft: ${currency(c.pricePerSqft)}</div>
                <div>Closed: ${escapeHtml(c.closingDate)}</div>
                ${c.note ? `<div class="muted" style="margin-top:6px;">${escapeHtml(c.note)}</div>` : ""}
              </div>`,
            )
            .join("")}
        </div>`,
      )
    : ""

  const strategy = a.strategy
    ? section(
        "Strategy & execution",
        `<p>${escapeHtml(a.strategy.plan)}</p>
         <p><strong>Hold period:</strong> ${escapeHtml(a.strategy.holdPeriod)}</p>
         <p><strong>Exit:</strong> ${escapeHtml(a.strategy.exit)}</p>
         ${a.strategy.focusPoints?.length ? `<ul>${a.strategy.focusPoints.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}`,
      )
    : ""

  return [execSummary, neighborhood, property, market, pricing, comps, strategy].filter(Boolean).join("\n")
}

function pricingRow(label: string, value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return ""
  return `<div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:12px;color:#475569;">${escapeHtml(
    label,
  )}</div><div style="font-weight:700;">${typeof value === "number" ? value : value}</div></div>`
}

function currency(v?: number) {
  if (typeof v !== "number") return ""
  try {
    return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(v)
  } catch {
    return v.toString()
  }
}

function percent(v?: number) {
  if (typeof v !== "number") return ""
  return `${(v * 100).toFixed(1)}%`
}