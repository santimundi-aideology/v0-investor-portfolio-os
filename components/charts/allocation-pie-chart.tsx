"use client"

import * as React from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { useIsMobile } from "@/lib/hooks/use-media-query"
import { formatAED } from "@/lib/real-estate"

const COLORS = ["#10b981", "#06b6d4", "#60a5fa", "#a78bfa", "#f59e0b"]

interface AllocationPieChartProps {
  data: { name: string; value: number }[]
  showLegend?: boolean
}

export function AllocationPieChart({
  data,
  showLegend = false,
}: AllocationPieChartProps) {
  const isMobile = useIsMobile()
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  // Responsive sizing
  const innerRadius = isMobile ? 45 : 60
  const outerRadius = isMobile ? 70 : 88

  // Handle touch/click on pie segments
  const handlePieEnter = React.useCallback((_: unknown, index: number) => {
    setActiveIndex(index)
  }, [])

  const handlePieLeave = React.useCallback(() => {
    setActiveIndex(null)
  }, [])

  // Custom tooltip with touch-friendly styling
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0]
      return (
        <div className="bg-background border rounded-lg shadow-lg px-3 py-2 text-xs sm:text-sm">
          <p className="font-medium capitalize">{item.name}</p>
          <p className="text-muted-foreground">{formatAED(item.value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[180px] sm:h-[220px] w-full touch-pan-y">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            onMouseEnter={handlePieEnter}
            onMouseLeave={handlePieLeave}
            // Touch handling for mobile
            onClick={(_, index) => {
              if (isMobile) {
                setActiveIndex(activeIndex === index ? null : index)
              }
            }}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                // Highlight active segment on mobile
                opacity={activeIndex === null || activeIndex === i ? 1 : 0.6}
                style={{
                  cursor: "pointer",
                  transition: "opacity 0.2s ease",
                }}
              />
            ))}
          </Pie>
          {showLegend && (
            <Legend
              wrapperStyle={{
                fontSize: isMobile ? "10px" : "12px",
                paddingTop: "8px",
              }}
              formatter={(value) => (
                <span className="capitalize text-muted-foreground">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {/* Mobile: Show active segment value */}
      {isMobile && activeIndex !== null && data[activeIndex] && (
        <div className="text-center -mt-2 animate-in fade-in duration-200">
          <p className="text-xs font-medium capitalize">{data[activeIndex].name}</p>
          <p className="text-xs text-muted-foreground">{formatAED(data[activeIndex].value)}</p>
        </div>
      )}
    </div>
  )
}
