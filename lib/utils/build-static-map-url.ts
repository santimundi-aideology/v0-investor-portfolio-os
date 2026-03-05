/**
 * Generates a data-URI SVG that acts as a location placeholder card.
 * Works in both server and client components (no browser APIs required).
 */
export function buildStaticMapUrl(
  coords?: { lat: number; lng: number } | null,
  locationLabel?: string,
): string {
  const lat = coords?.lat
  const lng = coords?.lng
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
  const label = (locationLabel || "Property location").slice(0, 80)
  const coordText = hasCoords
    ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
    : "Coordinates unavailable"

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
  <rect width="800" height="420" fill="#f8fafc"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="0" y1="70" x2="800" y2="70"/>
    <line x1="0" y1="140" x2="800" y2="140"/>
    <line x1="0" y1="210" x2="800" y2="210"/>
    <line x1="0" y1="280" x2="800" y2="280"/>
    <line x1="0" y1="350" x2="800" y2="350"/>
    <line x1="130" y1="0" x2="130" y2="420"/>
    <line x1="260" y1="0" x2="260" y2="420"/>
    <line x1="390" y1="0" x2="390" y2="420"/>
    <line x1="520" y1="0" x2="520" y2="420"/>
    <line x1="650" y1="0" x2="650" y2="420"/>
  </g>
  <path d="M40 300 C170 240, 260 250, 390 200 S620 170, 760 130" stroke="#cbd5e1" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M80 110 C180 130, 270 120, 360 150 S560 230, 720 260" stroke="#dbeafe" stroke-width="10" fill="none" stroke-linecap="round"/>
  <g transform="translate(400,210)">
    <path d="M0 -26 C10 -26 18 -18 18 -8 C18 5 8 17 0 30 C-8 17 -18 5 -18 -8 C-18 -18 -10 -26 0 -26 Z" fill="#ef4444"/>
    <circle cx="0" cy="-8" r="6" fill="#ffffff"/>
  </g>
  <rect x="24" y="24" width="430" height="42" rx="8" fill="#ffffff" opacity="0.96"/>
  <text x="42" y="50" font-size="22" font-family="Helvetica" fill="#0f172a">${label}</text>
  <rect x="24" y="360" width="280" height="34" rx="7" fill="#ffffff" opacity="0.96"/>
  <text x="42" y="383" font-size="16" font-family="Helvetica" fill="#334155">${coordText}</text>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
