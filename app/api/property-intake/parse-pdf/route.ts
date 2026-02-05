import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

// Lazy load pdf-parse to avoid the test file issue
async function loadPdfParse() {
  // pdf-parse has a bug where it tries to load a test file on require
  // We work around this by using dynamic import
  const mod = await import("pdf-parse")
  return mod.default
}

/**
 * POST /api/property-intake/parse-pdf
 * 
 * Accepts multipart/form-data with PDF files and extracts text content.
 * Supports multiple files (e.g., brochure + availability sheet).
 * 
 * Request: FormData with files under key "files" or "file"
 * Response: { texts: string[], combined: string, fileCount: number }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    // Get all files from the form data
    const files: File[] = []
    
    // Check for "files" (multiple) or "file" (single)
    const multipleFiles = formData.getAll("files")
    const singleFile = formData.get("file")
    
    if (multipleFiles.length > 0) {
      for (const f of multipleFiles) {
        if (f instanceof File) {
          files.push(f)
        }
      }
    } else if (singleFile instanceof File) {
      files.push(singleFile)
    }
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No PDF files provided. Please upload at least one PDF file." },
        { status: 400 }
      )
    }
    
    // Validate files
    const maxFileSize = 10 * 1024 * 1024 // 10MB per file
    const maxFiles = 5
    
    if (files.length > maxFiles) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${maxFiles} files allowed.` },
        { status: 400 }
      )
    }
    
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only PDF files are accepted.` },
          { status: 400 }
        )
      }
      
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 10MB per file.` },
          { status: 400 }
        )
      }
    }

    // Load pdf-parse dynamically
    const pdfParse = await loadPdfParse()
    
    // Extract text from each PDF
    const extractedTexts: { fileName: string; text: string; pageCount: number }[] = []
    
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // pdf-parse v1.x simple API
        const pdfData = await pdfParse(buffer, {
          // Limit pages for performance
          max: 50,
        })
        
        // Clean up the extracted text
        const cleanedText = cleanPdfText(pdfData.text)
        
        extractedTexts.push({
          fileName: file.name,
          text: cleanedText,
          pageCount: pdfData.numpages,
        })
      } catch (pdfError) {
        console.error(`Error parsing PDF ${file.name}:`, pdfError)
        return NextResponse.json(
          { error: `Failed to parse PDF: ${file.name}. The file may be corrupted or password-protected.` },
          { status: 400 }
        )
      }
    }
    
    // Combine all texts with file markers
    const combinedText = extractedTexts
      .map((et, idx) => {
        return `=== FILE ${idx + 1}: ${et.fileName} (${et.pageCount} pages) ===\n\n${et.text}`
      })
      .join("\n\n" + "=".repeat(80) + "\n\n")
    
    return NextResponse.json({
      texts: extractedTexts,
      combined: combinedText,
      fileCount: files.length,
      totalPages: extractedTexts.reduce((sum, et) => sum + et.pageCount, 0),
    })
  } catch (error) {
    console.error("PDF parsing error:", error)
    return NextResponse.json(
      { error: "Failed to process PDF files. Please try again." },
      { status: 500 }
    )
  }
}

/**
 * Clean up extracted PDF text for better AI processing
 */
function cleanPdfText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Fix common PDF extraction issues
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase
    .replace(/(\d)([A-Za-z])/g, "$1 $2") // Add space between number and letter
    .replace(/([A-Za-z])(\d)/g, "$1 $2") // Add space between letter and number
    // Remove excessive line breaks
    .replace(/\n{3,}/g, "\n\n")
    // Trim
    .trim()
}
