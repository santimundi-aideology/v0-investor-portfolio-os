"use client"

import * as React from "react"
import { FileUp, X, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface UploadedFile {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  error?: string
}

interface ExtractionResult {
  project: unknown
  units: unknown[]
  paymentPlan: unknown
  stats: unknown
  confidence: string
  fileCount: number
  model: string
  brochureImages?: string[]
}

interface PdfUploadZoneProps {
  onFilesExtracted: (result: ExtractionResult) => void
  onError: (error: string) => void
  isProcessing?: boolean
  maxFiles?: number
  maxSizeMB?: number
}

export function PdfUploadZone({
  onFilesExtracted,
  onError,
  isProcessing = false,
  maxFiles = 10,
  maxSizeMB = 10,
}: PdfUploadZoneProps) {
  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return `${file.name} is not a PDF file`
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `${file.name} exceeds ${maxSizeMB}MB limit`
    }
    return null
  }

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    
    if (files.length + fileArray.length > maxFiles) {
      onError(`Maximum ${maxFiles} files allowed`)
      return
    }

    const validFiles: UploadedFile[] = []
    
    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        onError(error)
        continue
      }
      
      // Check for duplicates
      if (files.some((f) => f.file.name === file.name)) {
        continue
      }

      validFiles.push({
        file,
        status: "pending",
        progress: 0,
      })
    }

    setFiles((prev) => [...prev, ...validFiles])
  }

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [files, maxFiles, onError])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      onError("Please add at least one PDF file")
      return
    }

    setIsUploading(true)

    try {
      // Update all files to uploading status
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "uploading" as const, progress: 0 }))
      )

      // ── 1. Start rendering PDF pages as images (runs in parallel with extraction) ──
      const renderPromise = (async (): Promise<string[]> => {
        try {
          const { renderBrochurePages } = await import("@/lib/pdf-page-renderer")
          const rawFiles = files.map((f) => f.file)
          const blobs = await renderBrochurePages(rawFiles, { totalMax: 6, scale: 1.5, quality: 0.8 })
          if (blobs.length === 0) return []

          // Upload rendered images to Supabase Storage
          const imgForm = new FormData()
          blobs.forEach((blob) => imgForm.append("images", blob, "page.jpg"))
          const uploadRes = await fetch("/api/property-intake/upload-brochure-images", {
            method: "POST",
            body: imgForm,
          })
          if (!uploadRes.ok) return []
          const { urls } = await uploadRes.json()
          return urls ?? []
        } catch (e) {
          console.warn("[pdf-upload-zone] Brochure image rendering/upload failed (non-fatal):", e)
          return []
        }
      })()

      // ── 2. Text extraction via Claude (existing flow) ──
      // Batch files into chunks to avoid body size limits (~20MB per request)
      const MAX_BATCH_BYTES = 18 * 1024 * 1024 // 18MB per batch
      const batches: File[][] = []
      let currentBatch: File[] = []
      let currentSize = 0

      for (const { file } of files) {
        if (currentBatch.length > 0 && currentSize + file.size > MAX_BATCH_BYTES) {
          batches.push(currentBatch)
          currentBatch = []
          currentSize = 0
        }
        currentBatch.push(file)
        currentSize += file.size
      }
      if (currentBatch.length > 0) batches.push(currentBatch)

      let lastResult: any = null

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx]
        const progressBase = Math.round((batchIdx / batches.length) * 80)

        setFiles((prev) =>
          prev.map((f) => ({ ...f, progress: progressBase }))
        )

        const formData = new FormData()
        for (const file of batch) {
          formData.append("files", file)
        }

        const response = await fetch("/api/property-intake/parse-pdf", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to parse PDFs")
        }

        // Merge results: keep the last batch's result (API merges all files in a batch)
        if (!lastResult) {
          lastResult = data
        } else {
          // Merge units from subsequent batches
          if (data.units && Array.isArray(data.units)) {
            lastResult.units = [...(lastResult.units || []), ...data.units]
          }
          // Update stats if available
          if (data.stats) {
            lastResult.stats = {
              ...lastResult.stats,
              totalUnits: (lastResult.stats?.totalUnits || 0) + (data.stats.totalUnits || 0),
            }
          }
        }
      }

      // ── 3. Wait for image rendering to finish and merge ──
      const brochureImages = await renderPromise

      // Update to success
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "success" as const, progress: 100 }))
      )

      // Return full extraction result from Claude Opus + brochure images
      if (lastResult) {
        onFilesExtracted({ ...lastResult, brochureImages } as ExtractionResult)
      }
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: "error" as const,
          error: error instanceof Error ? error.message : "Upload failed",
        }))
      )
      onError(error instanceof Error ? error.message : "Failed to upload files")
    } finally {
      setIsUploading(false)
    }
  }

  const allFilesReady = files.length > 0 && files.every((f) => f.status === "pending" || f.status === "success")
  const hasSuccessFiles = files.some((f) => f.status === "success")

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`
          relative rounded-lg border-2 border-dashed p-8 transition-colors
          ${isDragging ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"}
          ${isProcessing || isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={isProcessing || isUploading}
        />
        
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <FileUp className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-medium">
              {isDragging ? "Drop files here" : "Drop PDF brochures here"}
            </p>
            <p className="text-sm text-gray-500">
              or click to browse • Max {maxFiles} files, {maxSizeMB}MB each
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Upload developer brochures and availability sheets
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile, index) => (
            <Card key={uploadedFile.file.name} className="overflow-hidden">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{uploadedFile.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {uploadedFile.status === "uploading" && (
                    <Progress value={uploadedFile.progress} className="mt-1 h-1" />
                  )}
                  
                  {uploadedFile.status === "error" && (
                    <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {uploadedFile.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {uploadedFile.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {uploadedFile.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    disabled={isUploading}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && !hasSuccessFiles && (
        <Button
          onClick={handleUpload}
          disabled={!allFilesReady || isUploading || isProcessing}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing PDFs...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Extract Data from {files.length} {files.length === 1 ? "File" : "Files"}
            </>
          )}
        </Button>
      )}
    </div>
  )
}
