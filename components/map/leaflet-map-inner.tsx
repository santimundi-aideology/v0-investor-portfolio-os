"use client"

import { useEffect, useRef, useCallback } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MapFeature, MapData, ViewMode, OnSignalClick } from "./dubai-market-map"
import { formatPrice, getMarkerColor, getSeverityColor } from "./dubai-market-map"

interface LeafletMapInnerProps {
  data: MapData | null
  viewMode: ViewMode
  center: [number, number]
  zoom: number
  onSignalClick?: OnSignalClick
}

// Component to handle map updates
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

// Button component that uses native DOM events to work inside Leaflet popups
function SignalButton({ signalId, onClick }: { signalId: string; onClick: OnSignalClick }) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  useEffect(() => {
    const button = buttonRef.current
    if (!button) return
    
    const handleClick = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onClick(signalId)
    }
    
    // Use native DOM event listener
    button.addEventListener("click", handleClick)
    
    // Also prevent Leaflet from intercepting
    L.DomEvent.disableClickPropagation(button)
    
    return () => {
      button.removeEventListener("click", handleClick)
    }
  }, [signalId, onClick])
  
  return (
    <button
      ref={buttonRef}
      className="px-3 py-1 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600 transition-colors cursor-pointer"
    >
      View Details
    </button>
  )
}

export function LeafletMapInner({ data, viewMode, center, zoom, onSignalClick }: LeafletMapInnerProps) {
  const features = data?.features || []

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} />

      {/* Render markers based on view mode */}
      {viewMode === "heatmap" &&
        features.map((feature, i) => {
          const [lng, lat] = feature.geometry.coordinates
          const count = feature.properties.transaction_count || 1
          const avgPrice = feature.properties.avg_price || 0
          const radius = Math.min(30, 8 + Math.sqrt(count) * 2)

          return (
            <CircleMarker
              key={i}
              center={[lat, lng]}
              radius={radius}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: getMarkerColor(avgPrice),
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="font-semibold text-base mb-2">
                    {feature.properties.area_name}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Transactions:</span>
                      <span className="font-medium">
                        {feature.properties.transaction_count?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Avg Price:</span>
                      <span className="font-medium">
                        {formatPrice(avgPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Avg/sqm:</span>
                      <span className="font-medium">
                        AED {feature.properties.avg_price_per_sqm?.toLocaleString() || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Volume:</span>
                      <span className="font-medium">
                        {formatPrice(feature.properties.total_volume || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

      {viewMode === "markers" &&
        features.slice(0, 300).map((feature, i) => {
          const [lng, lat] = feature.geometry.coordinates
          const price = feature.properties.price_aed || 0

          return (
            <CircleMarker
              key={i}
              center={[lat, lng]}
              radius={6}
              pathOptions={{
                color: "#fff",
                weight: 1,
                fillColor: getMarkerColor(price),
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="font-semibold text-base">
                    {feature.properties.property_type} - {feature.properties.area}
                  </div>
                  <div className="text-lg font-bold text-green-600 my-1">
                    {formatPrice(price)}
                  </div>
                  <div className="space-y-1 text-sm">
                    {feature.properties.building && (
                      <div className="text-gray-600">{feature.properties.building}</div>
                    )}
                    {feature.properties.rooms && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rooms:</span>
                        <span>{feature.properties.rooms}</span>
                      </div>
                    )}
                    {feature.properties.size_sqm && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Size:</span>
                        <span>{feature.properties.size_sqm?.toLocaleString()} sqm</span>
                      </div>
                    )}
                    {feature.properties.price_per_sqm && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price/sqm:</span>
                        <span>AED {feature.properties.price_per_sqm?.toLocaleString()}</span>
                      </div>
                    )}
                    {feature.properties.date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span>{feature.properties.date}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

      {viewMode === "signals" &&
        features.map((feature, i) => {
          const [lng, lat] = feature.geometry.coordinates
          const severity = feature.properties.severity || "info"
          const signalId = feature.properties.id as string | undefined

          return (
            <CircleMarker
              key={i}
              center={[lat, lng]}
              radius={12}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: getSeverityColor(severity),
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="min-w-[250px]">
                  <div className="font-semibold text-base mb-1">
                    {feature.properties.title}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {feature.properties.description}
                  </div>
                  
                  {/* Metrics if available */}
                  {feature.properties.transaction_count && (
                    <div className="text-xs space-y-1 mb-2 bg-gray-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Transactions:</span>
                        <span className="font-medium">{feature.properties.transaction_count.toLocaleString()}</span>
                      </div>
                      {feature.properties.avg_price && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Avg Price:</span>
                          <span className="font-medium">{formatPrice(feature.properties.avg_price)}</span>
                        </div>
                      )}
                      {feature.properties.avg_price_per_sqm && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Price/sqm:</span>
                          <span className="font-medium">AED {feature.properties.avg_price_per_sqm.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div
                      className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: getSeverityColor(severity) }}
                    >
                      {severity}
                    </div>
                    
                    {signalId && onSignalClick && (
                      <SignalButton signalId={signalId} onClick={onSignalClick} />
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
    </MapContainer>
  )
}
