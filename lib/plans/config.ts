/**
 * Subscription Plan Configuration
 * Defines plan capabilities, limits, and features
 */

export type PlanTier = "starter" | "pro" | "enterprise"

export interface PlanLimits {
  maxProperties: number // -1 = unlimited
  maxInvestors: number // -1 = unlimited
  maxUsers: number // -1 = unlimited
  maxMemos: number // per month, -1 = unlimited
  maxAIEvaluations: number // per month, -1 = unlimited
}

export interface PlanFeatures {
  // Property Intake Methods
  manualPropertyIntake: boolean
  portalPropertyIntake: boolean
  offPlanBrochureAnalysis: boolean
  developerFeedIntegration: boolean
  
  // Analysis & Intelligence
  basicMemos: boolean
  aiEvaluatedMemos: boolean
  marketSignals: boolean
  marketComparables: boolean
  financialProjections: boolean
  
  // Collaboration
  multiUserAccess: boolean
  multiTenantAccess: boolean
  dealRoom: boolean
  
  // Integrations
  apiAccess: boolean
  crmIntegration: boolean
  customIntegrations: boolean
  
  // Branding & Customization
  whiteLabeling: boolean
  customBranding: boolean
}

export interface PlanConfig {
  id: PlanTier
  name: string
  displayName: string
  description: string
  price: {
    monthly: number
    annual: number // with discount
  }
  limits: PlanLimits
  features: PlanFeatures
  support: {
    type: "email" | "priority" | "dedicated"
    description: string
  }
  popular?: boolean
}

/**
 * Plan configurations
 */
export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  starter: {
    id: "starter",
    name: "starter",
    displayName: "Essential",
    description: "Perfect for small teams and individual agents getting started",
    price: {
      monthly: 149,
      annual: 1490, // ~17% discount (2 months free)
    },
    limits: {
      maxProperties: 25,
      maxInvestors: 50,
      maxUsers: 2,
      maxMemos: 10, // per month
      maxAIEvaluations: 5, // per month
    },
    features: {
      manualPropertyIntake: true,
      portalPropertyIntake: false,
      offPlanBrochureAnalysis: false,
      developerFeedIntegration: false,
      basicMemos: true,
      aiEvaluatedMemos: false,
      marketSignals: false,
      marketComparables: true,
      financialProjections: true,
      multiUserAccess: true,
      multiTenantAccess: false,
      dealRoom: false,
      apiAccess: false,
      crmIntegration: false,
      customIntegrations: false,
      whiteLabeling: false,
      customBranding: false,
    },
    support: {
      type: "email",
      description: "Email support (48h response time)",
    },
  },
  pro: {
    id: "pro",
    name: "pro",
    displayName: "Professional",
    description: "For growing brokerages and boutique investment firms",
    price: {
      monthly: 599,
      annual: 5990, // ~17% discount
    },
    limits: {
      maxProperties: -1, // unlimited
      maxInvestors: -1,
      maxUsers: 10,
      maxMemos: 50, // per month
      maxAIEvaluations: 50, // per month
    },
    features: {
      manualPropertyIntake: true,
      portalPropertyIntake: true,
      offPlanBrochureAnalysis: true,
      developerFeedIntegration: false,
      basicMemos: true,
      aiEvaluatedMemos: true,
      marketSignals: true,
      marketComparables: true,
      financialProjections: true,
      multiUserAccess: true,
      multiTenantAccess: true,
      dealRoom: true,
      apiAccess: false,
      crmIntegration: true,
      customIntegrations: false,
      whiteLabeling: false,
      customBranding: false,
    },
    support: {
      type: "priority",
      description: "Priority email & chat support (12h response time)",
    },
    popular: true,
  },
  enterprise: {
    id: "enterprise",
    name: "enterprise",
    displayName: "Enterprise",
    description: "For large brokerages, developers, and family offices",
    price: {
      monthly: 0, // Custom pricing
      annual: 0,
    },
    limits: {
      maxProperties: -1,
      maxInvestors: -1,
      maxUsers: -1,
      maxMemos: -1,
      maxAIEvaluations: -1,
    },
    features: {
      manualPropertyIntake: true,
      portalPropertyIntake: true,
      offPlanBrochureAnalysis: true,
      developerFeedIntegration: true,
      basicMemos: true,
      aiEvaluatedMemos: true,
      marketSignals: true,
      marketComparables: true,
      financialProjections: true,
      multiUserAccess: true,
      multiTenantAccess: true,
      dealRoom: true,
      apiAccess: true,
      crmIntegration: true,
      customIntegrations: true,
      whiteLabeling: true,
      customBranding: true,
    },
    support: {
      type: "dedicated",
      description: "Dedicated account manager & 24/7 support",
    },
  },
}

/**
 * Get plan configuration
 */
export function getPlanConfig(plan: PlanTier): PlanConfig {
  return PLAN_CONFIGS[plan]
}

/**
 * Check if a feature is available for a plan
 */
export function isPlanFeatureEnabled(plan: PlanTier, feature: keyof PlanFeatures): boolean {
  const config = getPlanConfig(plan)
  return config.features[feature]
}

/**
 * Get the upgrade path for a plan
 */
export function getUpgradePath(currentPlan: PlanTier): PlanTier | null {
  if (currentPlan === "starter") return "pro"
  if (currentPlan === "pro") return "enterprise"
  return null
}

/**
 * Format plan price
 */
export function formatPlanPrice(plan: PlanTier, billing: "monthly" | "annual" = "monthly"): string {
  const config = getPlanConfig(plan)
  const price = config.price[billing]
  
  if (price === 0) return "Custom"
  
  if (billing === "annual") {
    const monthlyEquivalent = Math.round(price / 12)
    return `$${monthlyEquivalent}/mo`
  }
  
  return `$${price}/mo`
}

/**
 * Calculate savings for annual billing
 */
export function getAnnualSavings(plan: PlanTier): number {
  const config = getPlanConfig(plan)
  if (config.price.monthly === 0) return 0
  
  const annualCost = config.price.monthly * 12
  return annualCost - config.price.annual
}

/**
 * Check if plan can access a feature
 */
export function canAccessFeature(plan: PlanTier, feature: keyof PlanFeatures): boolean {
  return isPlanFeatureEnabled(plan, feature)
}

/**
 * Get all plans in order
 */
export function getAllPlans(): PlanConfig[] {
  return [PLAN_CONFIGS.starter, PLAN_CONFIGS.pro, PLAN_CONFIGS.enterprise]
}
