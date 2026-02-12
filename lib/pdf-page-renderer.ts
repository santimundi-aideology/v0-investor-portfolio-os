"use client"

/**
 * Client-side utility to render PDF pages as JPEG images using pdfjs-dist.
 * This runs in the browser where Canvas is natively available.
 */

import * as pdfjsLib from "pdfjs-dist"

// Dynamically set the worker source to the CDN build for the installed version.
// This avoids Next.js/Turbopack worker bundling issues.
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

interface RenderOptions {
  /** Maximum number of pages to render per PDF (default: 3) */
  maxPages?: number
  /** Scale factor for rendering (default: 1.5 — good balance of quality vs size) */
  scale?: number
  /** JPEG quality 0-1 (default: 0.80) */
  quality?: number
}

/**
 * Render the first N pages of a PDF file as JPEG Blobs.
 */
export async function renderPdfPagesAsImages(
  file: File,
  options: RenderOptions = {},
): Promise<Blob[]> {
  const { maxPages = 3, scale = 1.5, quality = 0.8 } = options

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise

  const pagesToRender = Math.min(pdf.numPages, maxPages)
  const blobs: Blob[] = []

  for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext("2d")
    if (!ctx) continue

    await page.render({ canvasContext: ctx, viewport }).promise

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality)
    })

    if (blob) blobs.push(blob)

    // Clean up
    page.cleanup()
  }

  pdf.destroy()
  return blobs
}

/**
 * Render cover pages (page 1) of multiple PDF files as JPEG Blobs.
 * Returns a flat array of blobs — one per file.
 */
export async function renderCoverPages(
  files: File[],
  options: Omit<RenderOptions, "maxPages"> = {},
): Promise<Blob[]> {
  const results = await Promise.allSettled(
    files.map((file) => renderPdfPagesAsImages(file, { ...options, maxPages: 1 })),
  )

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []))
}

/**
 * Render the first N pages of multiple PDF files, returning all page blobs.
 * Limits total images to `totalMax` across all files.
 */
export async function renderBrochurePages(
  files: File[],
  options: RenderOptions & { totalMax?: number } = {},
): Promise<Blob[]> {
  const { totalMax = 6, ...renderOpts } = options
  const perFile = Math.max(1, Math.ceil(totalMax / files.length))

  const results = await Promise.allSettled(
    files.map((file) =>
      renderPdfPagesAsImages(file, { ...renderOpts, maxPages: perFile }),
    ),
  )

  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []))
  return all.slice(0, totalMax)
}
