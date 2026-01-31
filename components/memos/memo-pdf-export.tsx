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

interface MemoPdfExportProps {
  memoId?: string
  title: string
  onExport?: () => void
}

export function MemoPdfExport({ memoId, title, onExport }: MemoPdfExportProps) {
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
      // Dynamic import of html2pdf to reduce bundle size
      const html2pdf = (await import("html2pdf.js")).default

      // Find the main content area
      const contentElement = document.querySelector("main") || document.body

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}_IC_Memo.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait" 
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      }

      await html2pdf().set(opt).from(contentElement).save()
      
      onExport?.()
    } catch (error) {
      console.error("PDF export error:", error)
      // Fallback to print
      handlePrint()
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
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
