"use client"

import { AlertTriangle, ArrowRight, Crown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getPlanConfig, getUpgradePath, type PlanTier } from "@/lib/plans/config"
import { PlanBadge } from "./plan-badge"

interface UpgradePromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: PlanTier
  reason: string
  feature?: string
  onUpgrade?: () => void
}

export function UpgradePrompt({
  open,
  onOpenChange,
  currentPlan,
  reason,
  feature,
  onUpgrade,
}: UpgradePromptProps) {
  const upgradePath = getUpgradePath(currentPlan)
  const currentConfig = getPlanConfig(currentPlan)
  const upgradeConfig = upgradePath ? getPlanConfig(upgradePath) : null
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      // Default: navigate to settings/billing page
      window.location.href = "/settings/billing"
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Upgrade Required
          </DialogTitle>
          <DialogDescription>
            {feature 
              ? `To access ${feature}, you need to upgrade your plan.`
              : "You've reached a limit on your current plan."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTitle className="text-sm">Current Plan Limit</AlertTitle>
            <AlertDescription className="text-sm">
              {reason}
            </AlertDescription>
          </Alert>
          
          {upgradeConfig && (
            <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-lg">{upgradeConfig.displayName}</h4>
                    <PlanBadge plan={upgradePath!} showIcon={false} />
                  </div>
                  <p className="text-sm text-muted-foreground">{upgradeConfig.description}</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium">What you'll get:</div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {upgradePath === "pro" && (
                    <>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-blue-600" />
                        Unlimited properties & investors
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-blue-600" />
                        AI-powered property evaluation
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-blue-600" />
                        Off-plan brochure analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-blue-600" />
                        Market signals & insights
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-blue-600" />
                        Up to 10 team members
                      </li>
                    </>
                  )}
                  {upgradePath === "enterprise" && (
                    <>
                      <li className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-purple-600" />
                        Unlimited everything
                      </li>
                      <li className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-purple-600" />
                        API access & custom integrations
                      </li>
                      <li className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-purple-600" />
                        White-labeling & custom branding
                      </li>
                      <li className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-purple-600" />
                        Dedicated account manager
                      </li>
                      <li className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-purple-600" />
                        24/7 priority support
                      </li>
                    </>
                  )}
                </ul>
              </div>
              
              {upgradeConfig.price.monthly > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-sm text-muted-foreground">Starting at</div>
                  <div className="text-2xl font-bold text-blue-700">
                    ${upgradeConfig.price.monthly}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="bg-blue-600 hover:bg-blue-700">
            {upgradePath === "enterprise" ? "Contact Sales" : "Upgrade Now"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
