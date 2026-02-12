import type { IntakeReportPayload } from "./intake-report"

/**
 * Pre-fetch all image URLs in an IntakeReportPayload and convert them to
 * base64 data URIs so @react-pdf/renderer can embed them directly.
 *
 * If a fetch fails, the original URL is preserved so the renderer can
 * still attempt to load it natively.
 */

const FETCH_TIMEOUT_MS = 10_000

/**
 * Fetch a single image URL and return a base64 data URI.
 * Returns `null` on any failure.
 */
async function urlToDataUri(url: string): Promise<string | null> {
  // Already a data URI or inline SVG — nothing to do
  if (url.startsWith("data:")) return url

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    // Determine referer from the URL origin (some CDNs check this)
    let referer: string
    try {
      referer = new URL(url).origin
    } catch {
      referer = "https://www.bayut.com"
    }

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/jpeg,image/png,image/gif,image/*;q=0.9,*/*;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: referer,
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
      },
    })
    clearTimeout(timer)

    if (!res.ok) {
      console.warn(`[prefetch-images] HTTP ${res.status} for ${url.slice(0, 80)}...`)
      return null
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength === 0) return null

    // Determine MIME type from Content-Type header, falling back to
    // extension-based guessing
    let contentType = res.headers.get("content-type")?.split(";")[0]?.trim()
    if (!contentType || contentType === "application/octet-stream") {
      if (url.includes(".png")) contentType = "image/png"
      else if (url.includes(".webp")) contentType = "image/webp"
      else if (url.includes(".gif")) contentType = "image/gif"
      else if (url.includes(".svg")) contentType = "image/svg+xml"
      else contentType = "image/jpeg"
    }

    // react-pdf doesn't support webp — skip those
    if (contentType === "image/webp") {
      console.warn(`[prefetch-images] Skipping webp (not supported by react-pdf): ${url.slice(0, 60)}`)
      return null
    }

    const base64 = Buffer.from(buffer).toString("base64")
    return `data:${contentType};base64,${base64}`
  } catch (err) {
    console.warn(`[prefetch-images] Failed to fetch ${url.slice(0, 80)}: ${err}`)
    return null
  }
}

/**
 * Try to convert a URL to data URI. On failure, return the original URL
 * so @react-pdf/renderer can still attempt to fetch it natively.
 */
async function resolveUrl(
  url: string | undefined | null,
): Promise<string | undefined> {
  if (!url) return undefined
  const dataUri = await urlToDataUri(url)
  // Keep the original URL as fallback — don't drop it
  return dataUri ?? url
}

/**
 * Resolve an array of URLs in parallel.
 * Failed images keep their original URL as fallback.
 */
async function resolveUrls(
  urls: string[] | undefined | null,
): Promise<string[] | undefined> {
  if (!urls || urls.length === 0) return undefined
  const results = await Promise.all(
    urls.map(async (u) => {
      const dataUri = await urlToDataUri(u)
      return dataUri ?? u // keep original on failure
    }),
  )
  return results
}

/**
 * Pre-fetch every image in the payload, converting URLs to data URIs
 * where possible. Returns a new payload (does not mutate the original).
 */
export async function prefetchPayloadImages(
  payload: IntakeReportPayload,
): Promise<IntakeReportPayload> {
  const [coverImageUrl, galleryImageUrls, mapImageUrl, floorPlanImageUrls] =
    await Promise.all([
      resolveUrl(payload.coverImageUrl),
      resolveUrls(payload.galleryImageUrls),
      resolveUrl(payload.mapImageUrl),
      resolveUrls(payload.floorPlanImageUrls),
    ])

  return {
    ...payload,
    coverImageUrl,
    galleryImageUrls,
    mapImageUrl,
    floorPlanImageUrls,
  }
}
