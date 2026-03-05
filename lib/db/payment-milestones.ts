import "server-only"
import { getSupabaseAdminClient } from "@/lib/db/client"

export interface MilestoneInput {
  holdingId: string
  label: string
  milestoneType: string
  sequenceOrder: number
  amount: number
  percentage: number | null
  dueDate: string | null
  status?: "upcoming" | "due" | "paid" | "overdue"
  notes?: string | null
}

/**
 * Insert a batch of payment milestones for a holding.
 * Skips any that already exist (by holding_id + sequence_order).
 */
export async function createPaymentMilestones(
  milestones: MilestoneInput[],
): Promise<number> {
  if (milestones.length === 0) return 0

  const supabase = getSupabaseAdminClient()
  const now = new Date().toISOString()

  const payload = milestones.map((m) => ({
    holding_id: m.holdingId,
    label: m.label,
    milestone_type: m.milestoneType,
    sequence_order: m.sequenceOrder,
    amount: m.amount,
    percentage: m.percentage,
    due_date: m.dueDate,
    status: m.status ?? "upcoming",
    notes: m.notes ?? null,
    paid_date: null,
    created_at: now,
  }))

  const { data, error } = await supabase
    .from("payment_milestones")
    .insert(payload)
    .select("id")

  if (error) {
    console.error("[payment-milestones] insert error:", error)
    throw error
  }

  return data?.length ?? 0
}

/**
 * Generate milestone rows for an off-plan property using the
 * structured payment plan extracted during intake.
 */
export function generateOffPlanMilestones(
  holdingId: string,
  purchasePrice: number,
  paymentPlan: {
    milestones?: Array<{
      milestone?: number
      description?: string
      percentage?: number
      timing?: string
      amountAed?: number
    }>
  },
): MilestoneInput[] {
  const planMilestones = paymentPlan?.milestones ?? []
  if (planMilestones.length === 0) return generateReadyMilestones(holdingId, purchasePrice)

  return planMilestones.map((m, i) => ({
    holdingId,
    label: m.description ?? `Payment ${i + 1}`,
    milestoneType: inferMilestoneType(m.description ?? "", i, planMilestones.length),
    sequenceOrder: m.milestone ?? i + 1,
    amount: m.amountAed ?? Math.round(purchasePrice * ((m.percentage ?? 0) / 100)),
    percentage: m.percentage ?? null,
    dueDate: null,
    status: "upcoming" as const,
    notes: m.timing ?? null,
  }))
}

/**
 * Generate a standard 3-milestone plan for ready/secondary properties.
 */
export function generateReadyMilestones(
  holdingId: string,
  purchasePrice: number,
): MilestoneInput[] {
  return [
    {
      holdingId,
      label: "Booking Deposit (10%)",
      milestoneType: "booking",
      sequenceOrder: 1,
      amount: Math.round(purchasePrice * 0.1),
      percentage: 10,
      dueDate: null,
      status: "upcoming",
    },
    {
      holdingId,
      label: "Remaining Balance on Transfer",
      milestoneType: "transfer",
      sequenceOrder: 2,
      amount: Math.round(purchasePrice * 0.86),
      percentage: 86,
      dueDate: null,
      status: "upcoming",
    },
    {
      holdingId,
      label: "RERA & DLD Fees (4%)",
      milestoneType: "fees",
      sequenceOrder: 3,
      amount: Math.round(purchasePrice * 0.04),
      percentage: 4,
      dueDate: null,
      status: "upcoming",
    },
  ]
}

function inferMilestoneType(description: string, index: number, total: number): string {
  const d = description.toLowerCase()
  if (d.includes("booking") || d.includes("reservation") || index === 0) return "booking"
  if (d.includes("handover") || d.includes("completion") || index === total - 1) return "handover"
  if (d.includes("post") && d.includes("handover")) return "post_handover"
  if (d.includes("dld") || d.includes("rera") || d.includes("fee")) return "fees"
  return "construction"
}
