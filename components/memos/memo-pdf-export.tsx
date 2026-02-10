"use client"

import * as React from "react"
import { Download, Loader2, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { IntakeReportPayload } from "@/lib/pdf/intake-report"

interface MemoPdfExportProps {
  memoId?: string
  title: string
  intakeReportPayload?: IntakeReportPayload
  onExport?: () => void
}

export function MemoPdfExport({ memoId, title, intakeReportPayload, onExport }: MemoPdfExportProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  const handlePrint = () => {
    // Add print-specific styles
    const printStyles = document.createElement("style")
    printStyles.id = "print-styles"
    printStyles.innerHTML = `
      @media print {
        /* Hide navigation, sidebars, buttons */
        nav, aside, header, footer,
        [data-no-print="true"],
        .no-print,
        button:not(.print-include) {
          display: none !important;
        }
        
        /* Reset page margins */
        @page {
          margin: 1cm;
          size: A4;
        }
        
        /* Ensure content fills page */
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        
        /* Keep cards together */
        .card, [class*="Card"] {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        
        /* Charts need explicit sizing */
        .recharts-wrapper {
          max-width: 100% !important;
        }
        
        /* Ensure text is readable */
        * {
          color: #000 !important;
          background: transparent !important;
        }
        
        /* Keep backgrounds for charts */
        .recharts-surface,
        .recharts-layer {
          color: inherit !important;
        }
      }
    `
    document.head.appendChild(printStyles)

    // Trigger print
    window.print()

    // Clean up styles after print dialog closes
    setTimeout(() => {
      const styles = document.getElementById("print-styles")
      if (styles) styles.remove()
    }, 1000)

    onExport?.()
  }

  const handleDownloadPdf = async () => {
    setIsExporting(true)
    
    try {
      const response = memoId
        ? await fetch(`/api/memos/${memoId}/export-pdf`)
        : intakeReportPayload
          ? await fetch("/api/property-intake/export-pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                payload: intakeReportPayload,
                fileName: `${title}_IC_Memo`,
              }),
            })
          : null
      
      if (!response || !response.ok) {
        throw new Error("Failed to generate PDF")
      }

      // Download the PDF blob
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_IC_Memo.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      onExport?.()
    } catch (error) {
      console.error("PDF export error:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </DropdownMenuItem>
        {!intakeReportPayload ? (
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
