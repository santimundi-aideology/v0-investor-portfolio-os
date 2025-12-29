// Domain types for UAE Investor Portfolio OS

// Minimum roles for Investor Portfolio OS
export type UserRole = "owner" | "admin" | "realtor" | "investor"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface Org {
  id: string
  name: string
  logo?: string
}

export interface Mandate {
  strategy: string
  investmentHorizon: string
  yieldTarget: string
  riskTolerance: "low" | "medium" | "high"
  preferredAreas: string[]
  propertyTypes: string[]
  minInvestment: number
  maxInvestment: number
  notes?: string
}

export interface Investor {
  id: string
  name: string
  company: string
  email: string
  phone: string
  status: "active" | "pending" | "inactive"
  mandate?: Mandate
  createdAt: string
  lastContact: string
  totalDeals: number
  avatar?: string
}

export interface Property {
  id: string
  title: string
  address: string
  area: string
  type: "residential" | "commercial" | "mixed-use" | "land"
  status: "available" | "under-offer" | "sold" | "off-market"
  price: number
  size: number
  bedrooms?: number
  bathrooms?: number
  yearBuilt?: number
  roi?: number
  trustScore?: number
  imageUrl?: string
  description?: string
  features?: string[]
  risks?: string[]
  createdAt: string
}

export interface ShortlistItem {
  id: string
  investorId: string
  propertyId: string
  property: Property
  score: number
  status: "pending" | "presented" | "interested" | "rejected" | "under-offer"
  notes?: string
  addedAt: string
}

export interface Memo {
  id: string
  title: string
  investorId: string
  investorName: string
  propertyId: string
  propertyTitle: string
  status: "draft" | "review" | "approved" | "sent"
  content: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: "open" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  dueDate?: string
  assigneeId?: string
  assigneeName?: string
  investorId?: string
  investorName?: string
  propertyId?: string
  propertyTitle?: string
  createdAt: string
}

export interface DealRoom {
  id: string
  title: string
  investorId: string
  investorName: string
  propertyId: string
  propertyTitle: string
  status: "preparation" | "due-diligence" | "negotiation" | "closing" | "completed"
  parties: DealParty[]
  checklist: ChecklistItem[]
  timeline: TimelineEvent[]
  createdAt: string
}

export interface DealParty {
  id: string
  name: string
  role: string
  email: string
  phone?: string
}

export interface ChecklistItem {
  id: string
  title: string
  category: string
  completed: boolean
  dueDate?: string
}

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  date: string
  type: "milestone" | "document" | "meeting" | "update"
}

export interface Activity {
  id: string
  type: "investor_added" | "property_listed" | "memo_created" | "task_completed" | "deal_updated"
  title: string
  description: string
  timestamp: string
  userId?: string
  investorId?: string
  propertyId?: string
}
