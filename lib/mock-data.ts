import type { User, Investor, Property, ShortlistItem, Memo, Task, DealRoom, Activity } from "./types"

export const currentUser: User = {
  id: "user-1",
  name: "Sarah Al-Rashid",
  email: "sarah@investorsos.ae",
  role: "admin",
  avatar: "/professional-woman-avatar.png",
}

export const mockInvestors: Investor[] = [
  {
    id: "inv-1",
    name: "Mohammed Al-Fayed",
    company: "Al-Fayed Investments",
    email: "m.alfayed@investments.ae",
    phone: "+971 50 123 4567",
    status: "active",
    mandate: {
      strategy: "Core Plus",
      investmentHorizon: "5-7 years",
      yieldTarget: "8-12%",
      riskTolerance: "medium",
      preferredAreas: ["Downtown Dubai", "Dubai Marina", "Business Bay"],
      propertyTypes: ["commercial", "mixed-use"],
      minInvestment: 5000000,
      maxInvestment: 25000000,
      notes: "Prefers Grade A office spaces with established tenants",
    },
    createdAt: "2024-01-15",
    lastContact: "2024-12-20",
    totalDeals: 3,
  },
  {
    id: "inv-2",
    name: "Fatima Hassan",
    company: "Hassan Family Office",
    email: "fatima@hassanfo.com",
    phone: "+971 55 987 6543",
    status: "active",
    mandate: {
      strategy: "Value Add",
      investmentHorizon: "3-5 years",
      yieldTarget: "15-20%",
      riskTolerance: "high",
      preferredAreas: ["JVC", "Dubai South", "Al Quoz"],
      propertyTypes: ["residential", "land"],
      minInvestment: 2000000,
      maxInvestment: 10000000,
    },
    createdAt: "2024-02-20",
    lastContact: "2024-12-18",
    totalDeals: 1,
  },
  {
    id: "inv-3",
    name: "Ahmed Khalil",
    company: "Khalil Capital",
    email: "ahmed@khalilcapital.ae",
    phone: "+971 52 555 1234",
    status: "pending",
    mandate: {
      strategy: "Core",
      investmentHorizon: "7-10 years",
      yieldTarget: "6-8%",
      riskTolerance: "low",
      preferredAreas: ["Palm Jumeirah", "Emirates Hills"],
      propertyTypes: ["residential"],
      minInvestment: 10000000,
      maxInvestment: 50000000,
    },
    createdAt: "2024-11-01",
    lastContact: "2024-12-15",
    totalDeals: 0,
  },
  {
    id: "inv-4",
    name: "Layla Mansour",
    company: "Mansour Holdings",
    email: "layla@mansourholdings.ae",
    phone: "+971 54 777 8899",
    status: "active",
    mandate: {
      strategy: "Opportunistic",
      investmentHorizon: "2-3 years",
      yieldTarget: "20%+",
      riskTolerance: "high",
      preferredAreas: ["Dubai Creek Harbour", "MBR City"],
      propertyTypes: ["land", "mixed-use"],
      minInvestment: 15000000,
      maxInvestment: 100000000,
    },
    createdAt: "2024-03-10",
    lastContact: "2024-12-22",
    totalDeals: 2,
  },
]

export const mockProperties: Property[] = [
  {
    id: "prop-1",
    title: "Marina Tower Office Suite",
    address: "Marina Tower, Floor 25, Dubai Marina",
    area: "Dubai Marina",
    type: "commercial",
    status: "available",
    price: 8500000,
    size: 2500,
    roi: 9.5,
    trustScore: 87,
    description: "Premium Grade A office space with panoramic marina views.",
    features: ["Sea view", "Fitted", "Parking included", "Metro access"],
    risks: ["High service charges", "Oversupply in area"],
    createdAt: "2024-10-15",
  },
  {
    id: "prop-2",
    title: "Downtown Boulevard Retail",
    address: "Boulevard Plaza, Downtown Dubai",
    area: "Downtown Dubai",
    type: "commercial",
    status: "available",
    price: 12000000,
    size: 3200,
    roi: 11.2,
    trustScore: 92,
    description: "Prime retail space on the iconic Downtown Boulevard.",
    features: ["High footfall", "Corner unit", "Double height ceiling"],
    risks: ["Retail market volatility"],
    createdAt: "2024-09-20",
  },
  {
    id: "prop-3",
    title: "JVC Villa Compound",
    address: "District 12, Jumeirah Village Circle",
    area: "JVC",
    type: "residential",
    status: "available",
    price: 4500000,
    size: 4800,
    bedrooms: 4,
    bathrooms: 5,
    yearBuilt: 2022,
    roi: 7.8,
    trustScore: 78,
    description: "Modern villa with private pool and garden.",
    features: ["Private pool", "Maid's room", "Smart home", "Landscaped garden"],
    risks: ["Distance from metro", "Community still developing"],
    createdAt: "2024-11-05",
  },
  {
    id: "prop-4",
    title: "Business Bay Mixed-Use Tower",
    address: "Executive Towers, Business Bay",
    area: "Business Bay",
    type: "mixed-use",
    status: "under-offer",
    price: 45000000,
    size: 15000,
    roi: 10.5,
    trustScore: 85,
    description: "Full floor mixed-use development opportunity.",
    features: ["Full floor", "Canal view", "Multiple entry points"],
    risks: ["Large capital requirement", "Management complexity"],
    createdAt: "2024-08-12",
  },
  {
    id: "prop-5",
    title: "Dubai South Land Plot",
    address: "Residential District, Dubai South",
    area: "Dubai South",
    type: "land",
    status: "available",
    price: 18000000,
    size: 50000,
    trustScore: 72,
    description: "Strategic land plot near Expo City and Al Maktoum Airport.",
    features: ["Near Expo", "Airport proximity", "Development potential"],
    risks: ["Long-term play", "Infrastructure timing"],
    createdAt: "2024-07-01",
  },
]

export const mockShortlistItems: ShortlistItem[] = [
  {
    id: "sl-1",
    investorId: "inv-1",
    propertyId: "prop-1",
    property: mockProperties[0],
    score: 92,
    status: "interested",
    notes: "Client very interested, scheduling site visit",
    addedAt: "2024-12-10",
  },
  {
    id: "sl-2",
    investorId: "inv-1",
    propertyId: "prop-2",
    property: mockProperties[1],
    score: 88,
    status: "presented",
    addedAt: "2024-12-15",
  },
  {
    id: "sl-3",
    investorId: "inv-2",
    propertyId: "prop-3",
    property: mockProperties[2],
    score: 85,
    status: "under-offer",
    notes: "Offer submitted, awaiting response",
    addedAt: "2024-12-01",
  },
  {
    id: "sl-4",
    investorId: "inv-4",
    propertyId: "prop-5",
    property: mockProperties[4],
    score: 79,
    status: "pending",
    addedAt: "2024-12-20",
  },
]

export const mockMemos: Memo[] = [
  {
    id: "memo-1",
    title: "Investment Committee Memo - Marina Tower Office Suite",
    investorId: "inv-1",
    investorName: "Mohammed Al-Fayed",
    propertyId: "prop-1",
    propertyTitle: "Marina Tower Office Suite",
    status: "approved",
    content: `# Investment Committee Memo

## Executive Summary
This memo presents Marina Tower Office Suite for consideration by Al-Fayed Investments.

## Property Overview
- **Location:** Dubai Marina, Premium waterfront location
- **Asset Type:** Grade A Commercial Office
- **Size:** 2,500 sq ft
- **Asking Price:** AED 8,500,000

## Investment Thesis
The property aligns with the investor's Core Plus strategy, offering stable income with upside potential through asset enhancement.

## Financial Analysis
- Current NOI: AED 765,000
- Cap Rate: 9.0%
- Target IRR: 12.5%
- Hold Period: 5 years

## Risks & Mitigations
1. High service charges - Negotiate with building management
2. Market oversupply - Focus on premium tenant retention

## Recommendation
**PROCEED** - Subject to site inspection and final due diligence.`,
    createdAt: "2024-12-15",
    updatedAt: "2024-12-18",
  },
  {
    id: "memo-2",
    title: "Investment Committee Memo - JVC Villa Compound",
    investorId: "inv-2",
    investorName: "Fatima Hassan",
    propertyId: "prop-3",
    propertyTitle: "JVC Villa Compound",
    status: "review",
    content: `# Investment Committee Memo

## Executive Summary
This memo presents JVC Villa Compound for Hassan Family Office consideration.

## Property Overview
- **Location:** JVC District 12
- **Asset Type:** Residential Villa
- **Size:** 4,800 sq ft (4BR + Maid)
- **Asking Price:** AED 4,500,000

## Investment Thesis
Value-add opportunity through interior upgrades and smart home integration to capture premium rental market.

## Financial Analysis
- Projected NOI: AED 351,000
- Target Cap Rate: 7.8%
- Renovation Budget: AED 300,000
- Target IRR: 18%

## Recommendation
**PROCEED WITH CAUTION** - Requires detailed renovation scope.`,
    createdAt: "2024-12-20",
    updatedAt: "2024-12-20",
  },
]

export const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Schedule site visit for Marina Tower",
    description: "Coordinate with building management for viewing",
    status: "open",
    priority: "high",
    dueDate: "2024-12-28",
    assigneeName: "Sarah Al-Rashid",
    investorId: "inv-1",
    investorName: "Mohammed Al-Fayed",
    propertyId: "prop-1",
    propertyTitle: "Marina Tower Office Suite",
    createdAt: "2024-12-20",
  },
  {
    id: "task-2",
    title: "Update mandate for Khalil Capital",
    description: "Capture updated investment criteria from recent call",
    status: "in-progress",
    priority: "medium",
    dueDate: "2024-12-26",
    investorId: "inv-3",
    investorName: "Ahmed Khalil",
    createdAt: "2024-12-18",
  },
  {
    id: "task-3",
    title: "Prepare IC memo for Dubai South land",
    status: "open",
    priority: "medium",
    dueDate: "2024-12-30",
    investorId: "inv-4",
    investorName: "Layla Mansour",
    propertyId: "prop-5",
    propertyTitle: "Dubai South Land Plot",
    createdAt: "2024-12-21",
  },
  {
    id: "task-4",
    title: "Follow up on JVC offer",
    description: "Check status with seller's agent",
    status: "open",
    priority: "high",
    dueDate: "2024-12-24",
    investorId: "inv-2",
    investorName: "Fatima Hassan",
    propertyId: "prop-3",
    propertyTitle: "JVC Villa Compound",
    createdAt: "2024-12-19",
  },
  {
    id: "task-5",
    title: "Quarterly portfolio review call",
    description: "Review all active deals and pipeline",
    status: "done",
    priority: "low",
    investorId: "inv-1",
    investorName: "Mohammed Al-Fayed",
    createdAt: "2024-12-10",
  },
]

export const mockDealRooms: DealRoom[] = [
  {
    id: "deal-1",
    title: "JVC Villa Acquisition",
    investorId: "inv-2",
    investorName: "Fatima Hassan",
    propertyId: "prop-3",
    propertyTitle: "JVC Villa Compound",
    status: "due-diligence",
    parties: [
      { id: "p1", name: "Fatima Hassan", role: "Buyer", email: "fatima@hassanfo.com", phone: "+971 55 987 6543" },
      { id: "p2", name: "Ahmad Seller", role: "Seller", email: "ahmad@seller.ae" },
      { id: "p3", name: "Law & Partners", role: "Legal Counsel", email: "deals@lawpartners.ae" },
      { id: "p4", name: "Sarah Al-Rashid", role: "Agent", email: "sarah@investorsos.ae" },
    ],
    checklist: [
      { id: "c1", title: "Title Deed Verification", category: "Legal", completed: true },
      { id: "c2", title: "NOC from Developer", category: "Legal", completed: true },
      { id: "c3", title: "Technical Inspection", category: "Technical", completed: false, dueDate: "2024-12-28" },
      { id: "c4", title: "Valuation Report", category: "Financial", completed: false, dueDate: "2024-12-30" },
      { id: "c5", title: "MOU Signing", category: "Legal", completed: false },
      { id: "c6", title: "Deposit Transfer", category: "Financial", completed: false },
    ],
    timeline: [
      { id: "t1", title: "Offer Submitted", date: "2024-12-15", type: "milestone" },
      { id: "t2", title: "Offer Accepted", date: "2024-12-18", type: "milestone" },
      { id: "t3", title: "Title Deed Verified", date: "2024-12-20", type: "document" },
      { id: "t4", title: "Technical Inspection", date: "2024-12-28", type: "meeting", description: "Scheduled" },
    ],
    createdAt: "2024-12-15",
  },
]

export const mockActivities: Activity[] = [
  {
    id: "act-1",
    type: "memo_created",
    title: "IC Memo Created",
    description: "Investment memo created for Marina Tower Office Suite",
    timestamp: "2024-12-22T10:30:00Z",
    investorId: "inv-1",
    propertyId: "prop-1",
  },
  {
    id: "act-2",
    type: "deal_updated",
    title: "Deal Status Updated",
    description: "JVC Villa moved to due diligence phase",
    timestamp: "2024-12-21T15:45:00Z",
    investorId: "inv-2",
    propertyId: "prop-3",
  },
  {
    id: "act-3",
    type: "investor_added",
    title: "New Investor Onboarded",
    description: "Ahmed Khalil from Khalil Capital added to database",
    timestamp: "2024-12-20T09:00:00Z",
    investorId: "inv-3",
  },
  {
    id: "act-4",
    type: "task_completed",
    title: "Task Completed",
    description: "Quarterly portfolio review call with Mohammed Al-Fayed",
    timestamp: "2024-12-19T16:00:00Z",
    investorId: "inv-1",
  },
  {
    id: "act-5",
    type: "property_listed",
    title: "Property Added",
    description: "Dubai South Land Plot added to inventory",
    timestamp: "2024-12-18T11:20:00Z",
    propertyId: "prop-5",
  },
]

// Helper functions for data access (ready to swap with Supabase)
export function getInvestorById(id: string): Investor | undefined {
  return mockInvestors.find((inv) => inv.id === id)
}

export function getPropertyById(id: string): Property | undefined {
  return mockProperties.find((prop) => prop.id === id)
}

export function getMemoById(id: string): Memo | undefined {
  return mockMemos.find((memo) => memo.id === id)
}

export function getDealRoomById(id: string): DealRoom | undefined {
  return mockDealRooms.find((deal) => deal.id === id)
}

export function getShortlistByInvestorId(investorId: string): ShortlistItem[] {
  return mockShortlistItems.filter((item) => item.investorId === investorId)
}

export function getTasksByInvestorId(investorId: string): Task[] {
  return mockTasks.filter((task) => task.investorId === investorId)
}

export function getMemosByInvestorId(investorId: string): Memo[] {
  return mockMemos.filter((memo) => memo.investorId === investorId)
}
