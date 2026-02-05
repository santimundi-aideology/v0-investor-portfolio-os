"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PaymentCashFlow } from "@/lib/types"

interface PaymentPlanChartProps {
  cashFlowSchedule: PaymentCashFlow[]
  totalPrice: number
  completionMonth?: number
  className?: string
}

export function PaymentPlanChart({
  cashFlowSchedule,
  totalPrice,
  completionMonth = 24,
  className,
}: PaymentPlanChartProps) {
  // Format data for chart
  const chartData = React.useMemo(() => {
    return cashFlowSchedule.map((cf, idx) => ({
      ...cf,
      label: cf.milestone.length > 15 ? cf.milestone.slice(0, 15) + "..." : cf.milestone,
      paymentM: cf.payment / 1000000, // Convert to millions
      cumulativeM: cf.cumulative / 1000000,
      isCompletion: cf.milestone.toLowerCase().includes("completion") || cf.milestone.toLowerCase().includes("handover"),
    }))
  }, [cashFlowSchedule])

  const formatCurrency = (value: number) =>
    `AED ${(value * 1000000).toLocaleString()}`

  const formatMillions = (value: number) =>
    `${value.toFixed(1)}M`

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    return (
      <div className="rounded-lg border bg-white p-3 shadow-lg">
        <p className="font-medium text-sm">{data.milestone}</p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Payment:</span>
            <span className="font-medium">{formatCurrency(data.paymentM)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Cumulative:</span>
            <span className="font-medium">{formatCurrency(data.cumulativeM)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Paid:</span>
            <span className="font-medium">{data.percentPaid}%</span>
          </div>
          {data.month > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Month:</span>
              <span className="font-medium">{data.month}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Calculate summary metrics
  const duringConstruction = cashFlowSchedule
    .filter((cf) => !cf.milestone.toLowerCase().includes("completion"))
    .reduce((sum, cf) => sum + cf.payment, 0)
  
  const onCompletion = cashFlowSchedule
    .filter((cf) => cf.milestone.toLowerCase().includes("completion"))
    .reduce((sum, cf) => sum + cf.payment, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Payment Schedule</CardTitle>
        <CardDescription>
          Cash flow timeline • Total: AED {(totalPrice / 1000000).toFixed(2)}M
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                tickFormatter={formatMillions}
                tick={{ fontSize: 11 }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="paymentM"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isCompletion ? "#f59e0b" : "#22c55e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-xs text-green-600">During Construction</p>
            <p className="text-lg font-bold text-green-700">
              AED {(duringConstruction / 1000000).toFixed(2)}M
            </p>
            <p className="text-xs text-green-600">
              {Math.round((duringConstruction / totalPrice) * 100)}%
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center">
            <p className="text-xs text-amber-600">On Completion</p>
            <p className="text-lg font-bold text-amber-700">
              AED {(onCompletion / 1000000).toFixed(2)}M
            </p>
            <p className="text-xs text-amber-600">
              {Math.round((onCompletion / totalPrice) * 100)}%
            </p>
          </div>
          <div className="rounded-lg bg-gray-100 p-3 text-center">
            <p className="text-xs text-gray-600">Total Investment</p>
            <p className="text-lg font-bold text-gray-700">
              AED {(totalPrice / 1000000).toFixed(2)}M
            </p>
            <p className="text-xs text-gray-600">
              {cashFlowSchedule.length} payments
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact version for sidebar/smaller spaces
 */
export function PaymentPlanChartCompact({
  cashFlowSchedule,
  totalPrice,
}: {
  cashFlowSchedule: PaymentCashFlow[]
  totalPrice: number
}) {
  // Calculate percentage from payment and total
  const getPaymentPercentage = (payment: number) => 
    totalPrice > 0 ? Math.round((payment / totalPrice) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Progress bars for each milestone */}
      {cashFlowSchedule.map((cf, idx) => {
        const pct = getPaymentPercentage(cf.payment)
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-gray-600 max-w-[150px]">{cf.milestone}</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  cf.milestone.toLowerCase().includes("completion")
                    ? "bg-amber-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>AED {(cf.payment / 1000000).toFixed(2)}M</span>
              <span>Cumulative: {cf.percentPaid}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
