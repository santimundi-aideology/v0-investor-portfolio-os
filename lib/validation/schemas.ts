import { z } from "zod"

/**
 * Shared Zod validation schemas for API routes
 */

// CMA Request Schema
export const cmaRequestSchema = z.object({
  area: z.string().min(1, "Area is required"),
  propertyType: z.string().min(1, "Property type is required"),
  bedrooms: z.number().int().min(0).max(10),
  sizeSqft: z.number().positive().nullable(),
  askingPrice: z.number().positive("Asking price must be positive"),
  buildingName: z.string().nullable().optional(),
})

// Property Evaluation Request Schema
export const propertyEvaluationSchema = z.object({
  property: z.object({
    source: z.string(),
    listingId: z.string().nullable(),
    title: z.string().min(1),
    price: z.number().positive(),
    pricePerSqft: z.number().positive().nullable(),
    size: z.number().positive().nullable(),
    bedrooms: z.number().int().min(0),
    bathrooms: z.number().int().min(0),
    propertyType: z.string().min(1),
    area: z.string().min(1),
    subArea: z.string().nullable(),
    furnished: z.boolean(),
    parking: z.number().int().min(0).nullable(),
    amenities: z.array(z.string()),
    description: z.string().nullable(),
    listingUrl: z.string().url(),
    listedDate: z.string().nullable(),
    completionStatus: z.enum(["ready", "off_plan", "unknown"]).optional(),
    developer: z.string().nullable().optional(),
    handoverDate: z.string().nullable().optional(),
    serviceCharge: z.number().positive().nullable().optional(),
    rentalPotential: z.number().positive().nullable().optional(),
  }),
})

// Alert Rule Create/Update Schema
export const alertRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required").max(200),
  description: z.string().max(1000).nullable().optional(),
  enabled: z.boolean().optional(),
  areas: z.array(z.string()).default([]),
  propertyTypes: z.array(z.string()).default([]),
  minPrice: z.number().positive().nullable().optional(),
  maxPrice: z.number().positive().nullable().optional(),
  minSize: z.number().positive().nullable().optional(),
  maxSize: z.number().positive().nullable().optional(),
  minBedrooms: z.number().int().min(0).max(10).nullable().optional(),
  maxBedrooms: z.number().int().min(0).max(10).nullable().optional(),
  minYieldPct: z.number().min(0).max(100).nullable().optional(),
  minDiscountPct: z.number().min(0).max(100).nullable().optional(),
  priceChangePct: z.number().min(0).max(100).nullable().optional(),
  priceChangeDirection: z.enum(["up", "down", "both"]).nullable().optional(),
  minTransactionVolume: z.number().int().min(0).nullable().optional(),
  notifyWhatsapp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifyInApp: z.boolean().optional(),
  frequency: z.enum(["realtime", "daily", "weekly"]).default("daily"),
})

// Alert Rule Update Schema (includes ruleId)
export const alertRuleUpdateSchema = alertRuleSchema.extend({
  ruleId: z.string().uuid("Rule ID must be a valid UUID"),
})

// Memo Share Request Schema
export const memoShareSchema = z.object({
  method: z.enum(["whatsapp", "email", "link"]),
  recipientContact: z.string().optional(),
  message: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.method === "whatsapp" || data.method === "email") {
      return !!data.recipientContact && data.recipientContact.trim().length > 0
    }
    return true
  },
  {
    message: "recipientContact is required when sharing via whatsapp or email",
    path: ["recipientContact"],
  }
)

// Portfolio Request Schema (for future POST/PUT if needed)
export const portfolioRequestSchema = z.object({
  investorId: z.string().uuid(),
})
