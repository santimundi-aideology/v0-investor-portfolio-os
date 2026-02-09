"use client"

import { Check, Crown, Sparkles, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getAllPlans, getAnnualSavings, type PlanTier } from "@/lib/plans/config"
import { useState } from "react"
import { PlanBadge } from "./plan-badge"

interface PlanComparisonProps {
  currentPlan?: PlanTier
  onSelectPlan?: (plan: PlanTier) => void
  showCurrentBadge?: boolean
}

export function PlanComparison({ 
  currentPlan, 
  onSelectPlan,
  showCurrentBadge = true 
}: PlanComparisonProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const plans = getAllPlans()
  
  const icons = {
    starter: Zap,
    pro: Sparkles,
    enterprise: Crown,
  }
  
  const handleSelectPlan = (plan: PlanTier) => {
    if (plan === "enterprise") {
      // Open contact sales
      window.location.href = "mailto:sales@yourdomain.com?subject=Enterprise Plan Inquiry"
    } else if (onSelectPlan) {
      onSelectPlan(plan)
    }
  }
  
  const formatPrice = (price: number, plan: PlanTier) => {
    if (price === 0) return "Custom"
    
    if (billingCycle === "annual") {
      const monthlyEquivalent = Math.round(price / 12)
      return `$${monthlyEquivalent}`
    }
    
    return `$${price}`
  }
  
  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-toggle" className={billingCycle === "monthly" ? "font-semibold" : ""}>
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={billingCycle === "annual"}
          onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
        />
        <Label htmlFor="billing-toggle" className={billingCycle === "annual" ? "font-semibold" : ""}>
          Annual
          <span className="ml-2 text-xs text-green-600 font-normal">(Save ~17%)</span>
        </Label>
      </div>
      
      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = icons[plan.id]
          const isCurrent = currentPlan === plan.id
          const price = billingCycle === "monthly" ? plan.price.monthly : plan.price.annual
          const annualSavings = getAnnualSavings(plan.id)
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? "border-blue-500 shadow-lg scale-105" : ""} ${isCurrent ? "border-green-500" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                </div>
              )}
              
              {isCurrent && showCurrentBadge && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-600 text-white">Current Plan</Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${
                    plan.id === "starter" ? "text-slate-600" :
                    plan.id === "pro" ? "text-blue-600" :
                    "text-purple-600"
                  }`} />
                  <CardTitle>{plan.displayName}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="pt-4">
                  <div className="text-4xl font-bold">
                    {formatPrice(price, plan.id)}
                    {price > 0 && <span className="text-lg font-normal text-muted-foreground">/mo</span>}
                  </div>
                  {billingCycle === "annual" && price > 0 && (
                    <div className="text-sm text-green-600 mt-1">
                      Save ${annualSavings}/year
                    </div>
                  )}
                  {billingCycle === "annual" && price > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Billed ${price} annually
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Limits */}
                <div>
                  <div className="text-sm font-semibold mb-2">Plan Limits</div>
                  <ul className="text-sm space-y-1.5">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>
                        {plan.limits.maxProperties === -1 ? "Unlimited" : plan.limits.maxProperties} properties
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>
                        {plan.limits.maxInvestors === -1 ? "Unlimited" : plan.limits.maxInvestors} investors
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>
                        {plan.limits.maxUsers === -1 ? "Unlimited" : `Up to ${plan.limits.maxUsers}`} users
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>
                        {plan.limits.maxMemos === -1 ? "Unlimited" : plan.limits.maxMemos} memos/month
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>
                        {plan.limits.maxAIEvaluations === -1 ? "Unlimited" : plan.limits.maxAIEvaluations} AI evaluations/month
                      </span>
                    </li>
                  </ul>
                </div>
                
                {/* Key Features */}
                <div>
                  <div className="text-sm font-semibold mb-2">Key Features</div>
                  <ul className="text-sm space-y-1.5">
                    {plan.id === "starter" && (
                      <>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Manual property intake</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Basic IC memos</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Market comparables</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          <span className="text-muted-foreground">AI evaluations</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          <span className="text-muted-foreground">Off-plan analysis</span>
                        </li>
                      </>
                    )}
                    
                    {plan.id === "pro" && (
                      <>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>All intake methods</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>AI-powered evaluations</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Off-plan brochure analysis</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Market signals & insights</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Multi-tenant access</span>
                        </li>
                      </>
                    )}
                    
                    {plan.id === "enterprise" && (
                      <>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Everything in Pro</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>API access</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>White-labeling</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Custom integrations</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Dedicated support</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
                
                {/* Support */}
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">{plan.support.description}</div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isCurrent 
                    ? "Current Plan" 
                    : plan.id === "enterprise" 
                    ? "Contact Sales" 
                    : currentPlan && plans.findIndex(p => p.id === currentPlan) < plans.findIndex(p => p.id === plan.id)
                    ? "Upgrade"
                    : "Select Plan"
                  }
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
