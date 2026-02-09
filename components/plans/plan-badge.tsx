"use client"

import { Badge } from "@/components/ui/badge"
import { getPlanConfig, type PlanTier } from "@/lib/plans/config"
import { Crown, Sparkles, Zap } from "lucide-react"

interface PlanBadgeProps {
  plan: PlanTier
  showIcon?: boolean
  className?: string
}

export function PlanBadge({ plan, showIcon = true, className }: PlanBadgeProps) {
  const config = getPlanConfig(plan)
  
  const variants = {
    starter: "bg-slate-100 text-slate-700 border-slate-300",
    pro: "bg-blue-100 text-blue-700 border-blue-300",
    enterprise: "bg-purple-100 text-purple-700 border-purple-300",
  }
  
  const icons = {
    starter: Zap,
    pro: Sparkles,
    enterprise: Crown,
  }
  
  const Icon = icons[plan]
  
  return (
    <Badge variant="outline" className={`${variants[plan]} ${className}`}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.displayName}
    </Badge>
  )
}
