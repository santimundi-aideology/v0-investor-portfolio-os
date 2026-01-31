"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, Clock, Database, RefreshCw, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface DataFreshnessStatus {
  dld: {
    latestDate: string | null
    totalCount: number
    recentCount: number
    daysOld: number | null
    status: "fresh" | "stale"
  }
  portal: {
    latestUpdate: string | null
    activeCount: number
    hoursOld: number | null
    status: "fresh" | "stale"
  }
  signals: {
    latestGenerated: string | null
    newCount: number
    pricingOpportunities: number
    hoursOld: number | null
    status: "fresh" | "stale"
  }
  alerts: string[]
  overallStatus: "healthy" | "warning"
  timestamp: string
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return "Never"
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function DataFreshnessIndicator({ 
  compact = false,
  onRefresh,
}: { 
  compact?: boolean
  onRefresh?: () => void
}) {
  const [status, setStatus] = React.useState<DataFreshnessStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  const fetchStatus = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/dld/freshness")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError("Unable to check data status")
    } finally {
      setLoading(false)
    }
  }, [])
  
  React.useEffect(() => {
    fetchStatus()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStatus])
  
  const handleRefresh = () => {
    fetchStatus()
    onRefresh?.()
  }
  
  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Checking data status...
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <XCircle className="h-4 w-4 text-gray-400" />
        {error}
      </div>
    )
  }
  
  if (!status) return null
  
  // Compact version - just a badge
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "cursor-help",
                status.overallStatus === "healthy"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              {status.overallStatus === "healthy" ? (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              ) : (
                <AlertTriangle className="mr-1 h-3 w-3" />
              )}
              {status.overallStatus === "healthy" ? "Data Fresh" : "Data Stale"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <span>DLD Transactions:</span>
                <span className="font-medium">{formatTimeAgo(status.dld.latestDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Portal Listings:</span>
                <span className="font-medium">{formatTimeAgo(status.portal.latestUpdate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Signals Generated:</span>
                <span className="font-medium">{formatTimeAgo(status.signals.latestGenerated)}</span>
              </div>
              {status.alerts.length > 0 && (
                <div className="border-t pt-2 mt-2">
                  <div className="text-amber-600 font-medium">Alerts:</div>
                  {status.alerts.map((alert, i) => (
                    <div key={i} className="text-amber-600">{alert}</div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  // Full version - detailed card
  return (
    <Card className={cn(
      "border",
      status.overallStatus === "healthy"
        ? "border-green-200 bg-green-50/50"
        : "border-amber-200 bg-amber-50/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "rounded-full p-2",
              status.overallStatus === "healthy"
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-600"
            )}>
              {status.overallStatus === "healthy" ? (
                <Database className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="font-medium text-sm">
                {status.overallStatus === "healthy" ? "Data is Fresh" : "Data Needs Attention"}
              </div>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  DLD: {status.dld.totalCount.toLocaleString()} transactions
                  <span className={cn(
                    status.dld.status === "fresh" ? "text-green-600" : "text-amber-600"
                  )}>
                    ({formatTimeAgo(status.dld.latestDate)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Bayut: {status.portal.activeCount.toLocaleString()} active listings
                  <span className={cn(
                    status.portal.status === "fresh" ? "text-green-600" : "text-amber-600"
                  )}>
                    ({formatTimeAgo(status.portal.latestUpdate)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Signals: {status.signals.newCount} new
                  ({status.signals.pricingOpportunities} opportunities)
                  <span className={cn(
                    status.signals.status === "fresh" ? "text-green-600" : "text-amber-600"
                  )}>
                    ({formatTimeAgo(status.signals.latestGenerated)})
                  </span>
                </div>
              </div>
              {status.alerts.length > 0 && (
                <div className="mt-2 text-xs text-amber-700">
                  {status.alerts.map((alert, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {alert}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
