import type { User, UserRole } from "@/lib/types"

export type PersonaId = "realtor-primary" | "investor-external" | "owner-admin"

export type Persona = {
  id: PersonaId
  label: string
  role: UserRole
  summary: string
  capabilities: string[]
  keyScreens: string[]
  permissionNotes: string[]
  // For the Investor persona: scope to a single investorId (external access)
  scopedInvestorId?: string
  user: Omit<User, "role"> & { role: UserRole }
}

export const personas: Persona[] = [
  {
    id: "realtor-primary",
    label: "Investor-focused Realtor (Primary)",
    role: "realtor",
    summary:
      "Owns the end-to-end workflow: mandates, shortlist, property dossiers, IC memos, and next actions (without being an Ops role).",
    capabilities: [
      "Create/manage investors + mandates",
      "Build shortlist + property dossiers",
      "Generate IC memos (AI) + iterate versions",
      "Assign next actions (personal/team tasks)",
      "Drive portfolio loop (alerts, reporting, new opportunities)",
    ],
    keyScreens: [
      "Investors list + detail (mandate/shortlist/memos/tasks/docs)",
      "Properties list + detail (trust score, facts, memo actions)",
      "Tasks (simple personal/team tasks)",
      "Settings (templates/policies for memos)",
    ],
    permissionNotes: ["Internal user. Can access all investors/properties in the org."],
    user: {
      id: "user-realtor-1",
      name: "Sarah Al-Rashid",
      email: "sarah@investorsos.ae",
      role: "realtor",
      avatar: "/professional-woman-avatar.png",
    },
  },
  {
    id: "investor-external",
    label: "Investor / Large Buyer (External)",
    role: "investor",
    summary:
      "Reviews shortlists + IC memos, requests changes, approves/rejects, handles documents/checklists, and receives monitoring alerts & reports.",
    capabilities: [
      "Review shortlist + IC memos",
      "Comment / request changes",
      "Approve / reject decisions",
      "Upload / request documents",
      "Track checklist/timeline (deal room light)",
      "Receive portfolio monitoring alerts + monthly reports",
    ],
    keyScreens: [
      "Investor portal (read-only + approvals/comments)",
      "Deal room view (checklist + doc exchange + status)",
      "Portfolio view (assets + watchlist + alerts)",
    ],
    permissionNotes: ["External access must be scoped to their own data only (single investorId scope)."],
    scopedInvestorId: "a1111111-1111-1111-1111-111111111111",
    user: {
      id: "user-investor-1",
      name: "Mohammed Al-Fayed",
      email: "m.alfayed@investments.ae",
      role: "investor",
      avatar: "/placeholder-user.jpg",
    },
  },
  {
    id: "owner-admin",
    label: "Brokerage Owner/Admin (Org + governance)",
    role: "owner",
    summary:
      "Creates the org, invites realtors, defines templates/policies, manages access/audit/exporting, and configures (optional) trust scoring rules.",
    capabilities: [
      "Create org, invite realtors",
      "Define templates (IC memo sections, default assumptions)",
      "Manage access, audit, export/reporting",
      "Optional: configure trust scoring policy rules",
      "Billing later",
    ],
    keyScreens: ["Team management (users + roles)", "Template settings", "Audit / activity view (light)"],
    permissionNotes: ["Org-wide governance access."],
    user: {
      id: "user-owner-1",
      name: "Omar Al-Nahyan",
      email: "owner@palm-partners.ae",
      role: "owner",
      avatar: "/placeholder-user.jpg",
    },
  },
]

export const defaultPersonaId: PersonaId = "realtor-primary"

export function getPersonaById(id: PersonaId) {
  return personas.find((p) => p.id === id) ?? personas[0]
}
