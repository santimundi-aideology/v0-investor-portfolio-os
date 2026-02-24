"use client"

import { MapContainer, TileLayer, Marker } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export type DubaiNeighborhood = {
  name: string
  slug: string
  lat: number
  lng: number
  dataLabel?: string
}

const DUBAI_CENTER: [number, number] = [25.2048, 55.2708]

function createLabelIcon(neighborhood: DubaiNeighborhood): L.DivIcon {
  const html = `
    <div class="dubai-map-label">
      <span class="dubai-map-label-name">${neighborhood.name}</span>
      ${neighborhood.dataLabel ? `<span class="dubai-map-label-data">${neighborhood.dataLabel}</span>` : ""}
    </div>
  `
  return L.divIcon({
    html,
    className: "dubai-map-label-wrapper",
    iconSize: [120, 40],
    iconAnchor: [60, 20],
  })
}

interface DubaiNeighborhoodsMapInnerProps {
  neighborhoods: DubaiNeighborhood[]
  center?: [number, number]
  zoom?: number
  className?: string
}

export function DubaiNeighborhoodsMapInner({
  neighborhoods,
  center = DUBAI_CENTER,
  zoom = 11,
  className = "",
}: DubaiNeighborhoodsMapInnerProps) {
  return (
    <>
      <style>{`
        .dubai-map-label-wrapper {
          background: transparent !important;
          border: none !important;
        }
        .dubai-map-label {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          white-space: nowrap;
          padding: 4px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 0, 0, 0.08);
          font-family: inherit;
          pointer-events: none;
        }
        .dubai-map-label-name {
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.2;
        }
        .dubai-map-label-data {
          font-size: 10px;
          color: #6b7280;
          margin-top: 2px;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className={`z-0 ${className}`}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />
        {neighborhoods.map((n) => (
          <Marker
            key={n.slug}
            position={[n.lat, n.lng]}
            icon={createLabelIcon(n)}
            zIndexOffset={100}
          />
        ))}
      </MapContainer>
    </>
  )
}
