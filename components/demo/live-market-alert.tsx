"use client"

import * as React from "react"
import { AlertTriangle, TrendingUp, X, Zap, Building2, Bell } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createBrowserClient } from "@supabase/ssr"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type AlertType = "price_drop" | "new_listing" | "market_signal" | "opportunity" | "memo_pending"

type MarketAlert = {
  id: string
  type: AlertType
  title: string
  message: string
  area?: string
  urgency: "urgent" | "high" | "medium" | "low"
  actionLabel?: string
  actionHref?: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

// Fallback demo alerts when no real notifications
const FALLBACK_ALERTS: MarketAlert[] = [
  {
    id: "fallback-1",
    type: "price_drop",
    title: "🔥 Price Drop Alert",
    message: "Marina Pinnacle 3BR just reduced by 10%! Now AED 2.85M",
    area: "Dubai Marina",
    urgency: "high",
    actionLabel: "View Deal",
  },
  {
    id: "fallback-2",
    type: "new_listing",
    title: "💎 New Off-Market Listing",
    message: "Exclusive: 11.4% yield property in JVC - not on any portal",
    area: "JVC",
    urgency: "high",
    actionLabel: "See Details",
  },
  {
    id: "fallback-3",
    type: "market_signal",
    title: "📈 Market Signal",
    message: "Marina office prices up 5% this month. Your portfolio +AED 420K",
    area: "Dubai Marina",
    urgency: "medium",
  },
]

interface LiveMarketAlertProps {
  /** Auto-show after this many seconds (0 = manual only) */
  autoShowAfterSeconds?: number
  /** Enable real-time notifications from Supabase */
  useRealNotifications?: boolean
  /** Tenant ID for fetching notifications */
  tenantId?: string
  className?: string
}

/**
 * Transform database notification to MarketAlert format
 */
function transformNotification(notification: {
  id: string
  title: string
  body: string
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, unknown>
}): MarketAlert {
  const metadata = notification.metadata || {}
  const urgency = (metadata.urgency as MarketAlert["urgency"]) || "medium"
  
  // Determine type from entity_type or metadata
  let type: AlertType = "market_signal"
  if (notification.entity_type === "listing" || metadata.type === "opportunity") {
    type = notification.title?.toLowerCase().includes("price") ? "price_drop" : "new_listing"
  } else if (notification.entity_type === "market_signal") {
    type = "market_signal"
  } else if (notification.entity_type === "memo") {
    type = "memo_pending"
  }

  return {
    id: notification.id,
    type,
    title: notification.title,
    message: notification.body,
    urgency,
    entityType: notification.entity_type,
    entityId: notification.entity_id,
    metadata,
    actionLabel: type === "market_signal" ? undefined : "View",
  }
}

export function LiveMarketAlert({
  autoShowAfterSeconds = 45,
  useRealNotifications = true,
  tenantId,
  className,
}: LiveMarketAlertProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [currentAlert, setCurrentAlert] = React.useState<MarketAlert | null>(null)
  const [alertQueue, setAlertQueue] = React.useState<MarketAlert[]>([])
  const [hasShown, setHasShown] = React.useState(false)
  const supabaseRef = React.useRef<ReturnType<typeof createBrowserClient> | null>(null)

  // Initialize Supabase client for realtime
  React.useEffect(() => {
    if (!useRealNotifications) return

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[LiveMarketAlert] Supabase env vars not configured")
      return
    }

    supabaseRef.current = createBrowserClient(supabaseUrl, supabaseKey)
  }, [useRealNotifications])

  // Fetch initial notifications
  React.useEffect(() => {
    if (!useRealNotifications) return

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications?limit=10")
        const data = await res.json()

        if (data.ok && data.notifications?.length > 0) {
          // Filter unread notifications (no read_at)
          const unread = data.notifications.filter(
            (n: { read_at: string | null }) => !n.read_at
          )
          if (unread.length > 0) {
            const alerts = unread.map(transformNotification)
            setAlertQueue(alerts)
          }
        }
      } catch (error) {
        console.warn("[LiveMarketAlert] Failed to fetch notifications:", error)
      }
    }

    fetchNotifications()
  }, [useRealNotifications])

  // Subscribe to realtime notifications
  React.useEffect(() => {
    if (!useRealNotifications || !supabaseRef.current) return

    const supabase = supabaseRef.current

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          console.log("[LiveMarketAlert] New notification:", payload.new)
          const newNotification = payload.new as {
            id: string
            title: string
            body: string
            entity_type?: string
            entity_id?: string
            metadata?: Record<string, unknown>
          }
          
          const alert = transformNotification(newNotification)
          
          // Add to queue and show immediately if not already showing
          setAlertQueue((prev) => [alert, ...prev])
          
          if (!isVisible) {
            setCurrentAlert(alert)
            setIsVisible(true)
            playNotificationSound()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [useRealNotifications, isVisible])

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/sounds/notification.mp3")
      audio.volume = 0.3
      audio.play().catch(() => {})
    } catch {}
  }

  // Auto-show after delay (only once)
  React.useEffect(() => {
    if (autoShowAfterSeconds > 0 && !hasShown) {
      const timer = setTimeout(() => {
        // Use queued alert if available, otherwise fallback
        const alertToShow = alertQueue[0] || FALLBACK_ALERTS[Math.floor(Math.random() * FALLBACK_ALERTS.length)]
        
        setCurrentAlert(alertToShow)
        setIsVisible(true)
        setHasShown(true)
        playNotificationSound()
      }, autoShowAfterSeconds * 1000)
      
      return () => clearTimeout(timer)
    }
  }, [autoShowAfterSeconds, hasShown, alertQueue])

  // Auto-hide after 10 seconds
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        
        // Show next alert in queue after a delay
        if (alertQueue.length > 1) {
          setTimeout(() => {
            setAlertQueue((prev) => prev.slice(1))
            setCurrentAlert(alertQueue[1])
            setIsVisible(true)
            playNotificationSound()
          }, 3000)
        }
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, alertQueue])

  const handleDismiss = () => {
    setIsVisible(false)
  }

  const handleAction = () => {
    if (currentAlert?.entityType && currentAlert?.entityId) {
      // Navigate based on entity type
      if (currentAlert.entityType === "listing") {
        window.location.href = `/properties/${currentAlert.entityId}`
      } else if (currentAlert.entityType === "memo") {
        window.location.href = `/memos/${currentAlert.entityId}`
      } else if (currentAlert.entityType === "market_signal") {
        window.location.href = `/market-signals`
      }
    }
    setIsVisible(false)
  }

  const getAlertIcon = () => {
    if (!currentAlert) return null
    
    switch (currentAlert.type) {
      case "price_drop":
        return <TrendingUp className="h-5 w-5 text-red-600 rotate-180" />
      case "new_listing":
      case "opportunity":
        return <Zap className="h-5 w-5 text-purple-600" />
      case "memo_pending":
        return <Building2 className="h-5 w-5 text-amber-600" />
      case "market_signal":
      default:
        return <TrendingUp className="h-5 w-5 text-blue-600" />
    }
  }

  const getUrgencyStyles = () => {
    if (!currentAlert) return ""
    
    switch (currentAlert.urgency) {
      case "urgent":
        return "bg-gradient-to-br from-red-50 to-orange-50 border-red-300"
      case "high":
        return "bg-gradient-to-br from-red-50 to-orange-50 border-red-200"
      case "medium":
        return "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200"
      case "low":
      default:
        return "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
    }
  }

  const getPulseColor = () => {
    if (!currentAlert) return "bg-blue-400"
    
    switch (currentAlert.urgency) {
      case "urgent":
      case "high":
        return "bg-red-400"
      default:
        return "bg-blue-400"
    }
  }

  return (
    <AnimatePresence>
      {isVisible && currentAlert && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn(
            "fixed top-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]",
            className
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border shadow-2xl",
              getUrgencyStyles()
            )}
          >
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            
            {/* Pulse indicator */}
            <div className="absolute top-3 left-3">
              <span className="relative flex h-3 w-3">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  getPulseColor()
                )} />
                <span className={cn(
                  "relative inline-flex rounded-full h-3 w-3",
                  getPulseColor().replace("-400", "-500")
                )} />
              </span>
            </div>

            {/* Queue indicator */}
            {alertQueue.length > 1 && (
              <div className="absolute top-3 right-10 flex items-center gap-1">
                <Bell className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">{alertQueue.length}</span>
              </div>
            )}

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-60 hover:opacity-100"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Content */}
            <div className="p-4 pl-8">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  currentAlert.urgency === "high" || currentAlert.urgency === "urgent"
                    ? "bg-red-100" 
                    : "bg-blue-100"
                )}>
                  {getAlertIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{currentAlert.title}</p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {currentAlert.message}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-gray-500">
                      {currentAlert.area ? `${currentAlert.area} • ` : ""}Just now
                    </span>
                    {currentAlert.actionLabel && (
                      <Button
                        size="sm"
                        className={cn(
                          "h-7 text-xs",
                          currentAlert.urgency === "high" || currentAlert.urgency === "urgent"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={handleAction}
                      >
                        {currentAlert.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Trigger function for manual demo control
export function useLiveAlert() {
  const [trigger, setTrigger] = React.useState(0)
  
  const showAlert = React.useCallback((index?: number) => {
    setTrigger(prev => prev + 1)
  }, [])
  
  return { trigger, showAlert }
}

export default LiveMarketAlert
