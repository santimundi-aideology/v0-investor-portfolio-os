"use client"

import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UsageIndicatorProps {
  label: string
  current: number
  limit: number
  isUnlimited?: boolean
  showUpgrade?: boolean
  onUpgrade?: () => void
}

export function UsageIndicator({
  label,
  current,
  limit,
  isUnlimited = false,
  showUpgrade = false,
  onUpgrade,
}: UsageIndicatorProps) {
  const percentUsed = isUnlimited ? 0 : Math.min(100, (current / limit) * 100)
  const isApproaching = percentUsed >= 80 && percentUsed < 100
  const isAtLimit = percentUsed >= 100
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {isUnlimited ? (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Unlimited
            </span>
          ) : (
            <span className={isAtLimit ? "text-red-600 font-semibold" : ""}>
              {current} / {limit}
            </span>
          )}
        </span>
      </div>
      
      {!isUnlimited && (
        <>
          <Progress 
            value={percentUsed} 
            className="h-2"
            indicatorClassName={
              isAtLimit 
                ? "bg-red-600" 
                : isApproaching 
                ? "bg-amber-600" 
                : "bg-blue-600"
            }
          />
          
          {(isApproaching || isAtLimit) && (
            <Alert variant={isAtLimit ? "destructive" : "default"} className="py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isAtLimit ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  <AlertDescription className="text-xs">
                    {isAtLimit 
                      ? `You've reached your ${label.toLowerCase()} limit`
                      : `You're approaching your ${label.toLowerCase()} limit`
                    }
                  </AlertDescription>
                </div>
                {showUpgrade && onUpgrade && (
                  <Button 
                    size="sm" 
                    variant={isAtLimit ? "default" : "outline"}
                    onClick={onUpgrade}
                    className="h-7 text-xs"
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}
