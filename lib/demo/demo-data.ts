/**
 * Demo Mode Data
 * Comprehensive demo data for customer showcases and presentations
 */

import type { Investor, Property, Memo, DealRoom, Task } from "@/lib/types"

// ============================================
// DEMO IDENTIFIERS (Consistent UUIDs)
// ============================================

export const DEMO_IDS = {
  // Tenant
  TENANT: "demo-0000-0000-0000-000000000001",

  // Users
  REALTOR: "demo-user-0000-0000-000000000001",
  ADMIN: "demo-user-0000-0000-000000000002",

  // Investors
  INVESTOR_PRIMARY: "demo-inv-0000-0000-000000000001", // Mohammed Al-Rashid
  INVESTOR_SECONDARY: "demo-inv-0000-0000-000000000002", // Amira Al-Mansoori

  // Listings
  LISTING_MARINA_PENTHOUSE: "demo-lst-0000-0000-000000000001",
  LISTING_DOWNTOWN_OFFICE: "demo-lst-0000-0000-000000000002",
  LISTING_BUSINESS_BAY_RETAIL: "demo-lst-0000-0000-000000000003",
  LISTING_PALM_VILLA: "demo-lst-0000-0000-000000000004",
  LISTING_JVC_APARTMENT: "demo-lst-0000-0000-000000000005",
  LISTING_CREEK_TOWER: "demo-lst-0000-0000-000000000006",
  LISTING_BLUEWATERS_UNIT: "demo-lst-0000-0000-000000000007",

  // Holdings
  HOLDING_1: "demo-hld-0000-0000-000000000001",
  HOLDING_2: "demo-hld-0000-0000-000000000002",
  HOLDING_3: "demo-hld-0000-0000-000000000003",
  HOLDING_4: "demo-hld-0000-0000-000000000004",
  HOLDING_5: "demo-hld-0000-0000-000000000005",

  // Memos
  MEMO_DRAFT: "demo-mem-0000-0000-000000000001",
  MEMO_SENT: "demo-mem-0000-0000-000000000002",
  MEMO_APPROVED: "demo-mem-0000-0000-000000000003",
  MEMO_PENDING_DECISION: "demo-mem-pending-000000001",

  // Hot Opportunity Listings
  HOT_MARINA_OFFICE: "demo-lst-hot-000000000001",
  HOT_JVC_BLOCK: "demo-lst-hot-000000000002",
  HOT_BB_RETAIL: "demo-lst-hot-000000000003",
  HOT_MARINA_DISTRESSED: "demo-lst-hot-000000000004",

  // Deal Rooms
  DEAL_DUE_DILIGENCE: "demo-deal-0000-0000-000000000001",
  DEAL_CLOSING: "demo-deal-0000-0000-000000000002",

  // Shortlists
  SHORTLIST_1: "demo-shl-0000-0000-000000000001",
  SHORTLIST_2: "demo-shl-0000-0000-000000000002",
} as const

// ============================================
// DEMO INVESTOR PROFILES
// ============================================

export const demoInvestors: Investor[] = [
  {
    id: DEMO_IDS.INVESTOR_PRIMARY,
    name: "Mohammed Al-Rashid",
    company: "Al-Rashid Investments LLC",
    email: "m.alrashid@alrashid-inv.ae",
    phone: "+971 50 123 4567",
    status: "active",
    mandate: {
      strategy: "Core Plus",
      investmentHorizon: "5-7 years",
      yieldTarget: "8-12%",
      riskTolerance: "medium",
      preferredAreas: ["Dubai Marina", "Downtown Dubai", "Business Bay", "Palm Jumeirah"],
      propertyTypes: ["residential", "commercial", "mixed-use"],
      minInvestment: 5000000,
      maxInvestment: 30000000,
      notes: "Focus on premium Grade A assets with established tenant base. Prefers turnkey investments with minimal capex requirements.",
    },
    createdAt: "2024-06-15T10:00:00Z",
    lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    totalDeals: 4,
    avatar: "/placeholder-user.jpg",
    location: "Dubai, UAE",
    timezone: "Asia/Dubai",
    preferredContactMethod: "whatsapp",
    segment: "family_office",
    aumAed: 85000000,
    liquidityWindow: "30-90d",
    leadSource: "Referral - Al Mansour Group",
    tags: ["tier-1", "commercial", "marina-expert"],
    notes: "Decision-maker with quick turnaround. Prefers site visits on weekends.",
  },
  {
    id: DEMO_IDS.INVESTOR_SECONDARY,
    name: "Amira Al-Mansoori",
    company: "Mansoori Capital Partners",
    email: "amira@mansoori-capital.com",
    phone: "+971 55 987 6543",
    status: "active",
    mandate: {
      strategy: "Value Add",
      investmentHorizon: "3-5 years",
      yieldTarget: "15-20%",
      riskTolerance: "high",
      preferredAreas: ["JVC", "Dubai South", "Al Quoz", "Dubai Creek Harbour"],
      propertyTypes: ["residential", "land"],
      minInvestment: 3000000,
      maxInvestment: 15000000,
      notes: "Seeks undervalued assets with renovation or repositioning potential. Comfortable with construction risk.",
    },
    createdAt: "2024-09-01T14:30:00Z",
    lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    totalDeals: 2,
    avatar: "/placeholder-user.jpg",
    location: "Abu Dhabi, UAE",
    timezone: "Asia/Dubai",
    preferredContactMethod: "email",
    segment: "hnwi",
    aumAed: 42000000,
    liquidityWindow: "90-180d",
    leadSource: "Property Show 2024",
    tags: ["value-add", "developer-relations"],
  },
]

// ============================================
// DEMO PROPERTIES
// ============================================

export const demoProperties: Property[] = [
  {
    id: DEMO_IDS.LISTING_MARINA_PENTHOUSE,
    title: "Marina View Penthouse",
    address: "Marina Heights Tower, Floor 45, Dubai Marina",
    area: "Dubai Marina",
    type: "residential",
    status: "sold", // Owned by investor
    readinessStatus: "READY_FOR_MEMO",
    price: 12500000,
    size: 3200,
    bedrooms: 4,
    bathrooms: 5,
    currency: "AED",
    roi: 9.2,
    trustScore: 94,
    imageUrl: "/placeholder.jpg",
    description: "Stunning full-floor penthouse with panoramic marina views. Premium finishes throughout with private elevator access.",
    features: ["Private Pool", "Smart Home", "Marina View", "Private Elevator", "Concierge"],
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.LISTING_DOWNTOWN_OFFICE,
    title: "Downtown Boulevard Office Tower",
    address: "Boulevard Plaza, Tower 1, Downtown Dubai",
    area: "Downtown Dubai",
    type: "commercial",
    status: "sold", // Owned by investor
    readinessStatus: "READY_FOR_MEMO",
    price: 18500000,
    size: 4500,
    currency: "AED",
    roi: 10.5,
    trustScore: 97,
    imageUrl: "/placeholder.jpg",
    description: "Grade A office space with Burj Khalifa views. Currently leased to a Fortune 500 tenant on a 5-year NNN lease.",
    features: ["Burj View", "NNN Lease", "Fortune 500 Tenant", "24/7 Access", "Underground Parking"],
    createdAt: "2023-11-20T08:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.LISTING_BUSINESS_BAY_RETAIL,
    title: "Bay Square Retail Podium",
    address: "Bay Square, Building 7, Business Bay",
    area: "Business Bay",
    type: "commercial",
    status: "sold", // Owned by investor
    readinessStatus: "READY_FOR_MEMO",
    price: 8200000,
    size: 2100,
    currency: "AED",
    roi: 8.8,
    trustScore: 91,
    imageUrl: "/placeholder.jpg",
    description: "Prime F&B retail unit in high-footfall location. Currently tenanted by established restaurant chain.",
    features: ["High Footfall", "F&B Approved", "Outdoor Seating", "Canal View"],
    createdAt: "2024-01-10T12:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.LISTING_PALM_VILLA,
    title: "Palm Jumeirah Signature Villa",
    address: "Frond L, Palm Jumeirah",
    area: "Palm Jumeirah",
    type: "residential",
    status: "available",
    readinessStatus: "READY_FOR_MEMO",
    price: 42000000,
    size: 8500,
    bedrooms: 6,
    bathrooms: 7,
    currency: "AED",
    roi: 5.2,
    trustScore: 98,
    imageUrl: "/placeholder.jpg",
    description: "Exclusive beachfront villa with private beach access. Recently renovated with luxury finishes and smart home integration.",
    features: ["Private Beach", "Swimming Pool", "Staff Quarters", "Home Cinema", "Boat Dock"],
    createdAt: "2025-01-05T09:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.LISTING_JVC_APARTMENT,
    title: "JVC Community Residence",
    address: "District 12, Jumeirah Village Circle",
    area: "JVC",
    type: "residential",
    status: "sold", // Owned by investor
    readinessStatus: "READY_FOR_MEMO",
    price: 1850000,
    size: 1200,
    bedrooms: 2,
    bathrooms: 3,
    currency: "AED",
    roi: 7.8,
    trustScore: 85,
    imageUrl: "/placeholder.jpg",
    description: "Modern apartment in family-friendly community. Strong rental demand from young professionals.",
    features: ["Pool Access", "Gym", "Community Park", "Pet Friendly"],
    createdAt: "2024-06-01T14:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.LISTING_CREEK_TOWER,
    title: "Dubai Creek Harbour Residence",
    address: "Creek Gate Tower 2, Dubai Creek Harbour",
    area: "Dubai Creek Harbour",
    type: "residential",
    status: "available",
    readinessStatus: "NEEDS_VERIFICATION",
    price: 6800000,
    size: 2400,
    bedrooms: 3,
    bathrooms: 4,
    currency: "AED",
    roi: 7.2,
    trustScore: 88,
    imageUrl: "/placeholder.jpg",
    description: "New development with creek and downtown skyline views. Premium amenities and proximity to future metro link.",
    features: ["Creek View", "Downtown View", "Infinity Pool", "Future Metro"],
    createdAt: "2025-01-15T11:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.LISTING_BLUEWATERS_UNIT,
    title: "Bluewaters Island 2BR",
    address: "Bluewaters Residences, Building 8",
    area: "Bluewaters Island",
    type: "residential",
    status: "under-offer",
    readinessStatus: "READY_FOR_MEMO",
    price: 5200000,
    size: 1650,
    bedrooms: 2,
    bathrooms: 3,
    currency: "AED",
    roi: 6.5,
    trustScore: 92,
    imageUrl: "/placeholder.jpg",
    description: "Premium island living with Ain Dubai views. Furnished unit with hotel-managed rental pool option.",
    features: ["Ain Dubai View", "Furnished", "Rental Pool", "Beach Access", "Resort Amenities"],
    createdAt: "2025-01-10T16:00:00Z",
    updatedAt: new Date().toISOString(),
  },
  // HOT OPPORTUNITIES
  {
    id: DEMO_IDS.HOT_MARINA_DISTRESSED,
    title: "Marina Pinnacle 3BR - Distressed Sale",
    address: "Marina Pinnacle Tower, Floor 32, Dubai Marina",
    area: "Dubai Marina",
    type: "residential",
    status: "available",
    readinessStatus: "READY_FOR_MEMO",
    price: 2850000,
    size: 1850,
    bedrooms: 3,
    bathrooms: 4,
    currency: "AED",
    roi: 8.0,
    trustScore: 91,
    imageUrl: "/placeholder.jpg",
    description: "URGENT: Distressed sale from relocating owner. High floor 3BR with full marina views. Currently rented at AED 228K/year. 17% below market.",
    features: ["Marina View", "High Floor", "Tenanted", "Motivated Seller", "Quick Close"],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.HOT_MARINA_OFFICE,
    title: "Marina Gate Tower 2 - Full Floor Office",
    address: "Marina Gate, Tower 2, Floor 18, Dubai Marina",
    area: "Dubai Marina",
    type: "commercial",
    status: "available",
    readinessStatus: "READY_FOR_MEMO",
    price: 4200000,
    size: 3500,
    currency: "AED",
    roi: 9.2,
    trustScore: 94,
    imageUrl: "/placeholder.jpg",
    description: "Full-floor office with blue-chip tenant (5 years remaining). 15% below DLD median at AED 1,200/sqft vs market AED 1,400. Motivated seller.",
    features: ["Full Floor", "Blue-chip Tenant", "5yr Lease", "Below Market", "Motivated Seller"],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.HOT_JVC_BLOCK,
    title: "JVC District 12 - 8-Unit Residential Block",
    address: "District 12, Plot 45, Jumeirah Village Circle",
    area: "JVC",
    type: "residential",
    status: "available",
    readinessStatus: "NEEDS_VERIFICATION",
    price: 8500000,
    size: 8200,
    bedrooms: 8,
    bathrooms: 8,
    currency: "AED",
    roi: 11.4,
    trustScore: 88,
    imageUrl: "/placeholder.jpg",
    description: "Fully occupied 8-unit block with 11.4% yield. All units on 2-year Ejari contracts. Metro Blue Line station opening Q3 2027 (800m away).",
    features: ["100% Occupied", "High Yield", "Metro Proximity", "Ejari Contracts", "Upside Potential"],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.HOT_BB_RETAIL,
    title: "Business Bay Retail + Mezzanine",
    address: "Bay Avenue, Retail Unit G-12, Business Bay",
    area: "Business Bay",
    type: "commercial",
    status: "available",
    readinessStatus: "READY_FOR_MEMO",
    price: 3100000,
    size: 2100,
    currency: "AED",
    roi: 8.8,
    trustScore: 85,
    imageUrl: "/placeholder.jpg",
    description: "Off-market opportunity. Double-height retail with mezzanine. F&B tenant paying AED 275K/year. Prime footfall location.",
    features: ["Off-Market", "Double Height", "F&B Tenant", "High Footfall", "Prime Location"],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ============================================
// DEMO HOLDINGS (Portfolio Data)
// ============================================

export const demoHoldings = [
  {
    id: DEMO_IDS.HOLDING_1,
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    listingId: DEMO_IDS.LISTING_MARINA_PENTHOUSE,
    purchasePrice: 11800000,
    purchaseDate: "2024-03-15",
    currentValue: 12500000,
    monthlyRent: 85000,
    occupancyRate: 0.96,
    annualExpenses: 180000,
  },
  {
    id: DEMO_IDS.HOLDING_2,
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    listingId: DEMO_IDS.LISTING_DOWNTOWN_OFFICE,
    purchasePrice: 17200000,
    purchaseDate: "2023-11-20",
    currentValue: 18500000,
    monthlyRent: 162000,
    occupancyRate: 1.0,
    annualExpenses: 285000,
  },
  {
    id: DEMO_IDS.HOLDING_3,
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    listingId: DEMO_IDS.LISTING_BUSINESS_BAY_RETAIL,
    purchasePrice: 7800000,
    purchaseDate: "2024-01-10",
    currentValue: 8200000,
    monthlyRent: 60000,
    occupancyRate: 0.92,
    annualExpenses: 95000,
  },
  {
    id: DEMO_IDS.HOLDING_4,
    investorId: DEMO_IDS.INVESTOR_SECONDARY,
    listingId: DEMO_IDS.LISTING_JVC_APARTMENT,
    purchasePrice: 1650000,
    purchaseDate: "2024-06-01",
    currentValue: 1850000,
    monthlyRent: 12000,
    occupancyRate: 0.88,
    annualExpenses: 32000,
  },
  {
    id: DEMO_IDS.HOLDING_5,
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    listingId: DEMO_IDS.LISTING_BLUEWATERS_UNIT,
    purchasePrice: 4900000,
    purchaseDate: "2024-08-15",
    currentValue: 5200000,
    monthlyRent: 28000,
    occupancyRate: 0.85,
    annualExpenses: 72000,
  },
]

// ============================================
// DEMO MEMOS
// ============================================

export const demoMemos: Memo[] = [
  {
    id: DEMO_IDS.MEMO_DRAFT,
    title: "Investment Memo - Palm Jumeirah Signature Villa",
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    investorName: "Mohammed Al-Rashid",
    propertyId: DEMO_IDS.LISTING_PALM_VILLA,
    propertyTitle: "Palm Jumeirah Signature Villa",
    status: "draft",
    content: "This investment memorandum evaluates the acquisition of a prime beachfront villa on Palm Jumeirah...",
    analysis: {
      summary: "Premium beachfront asset with strong capital appreciation potential and lifestyle rental appeal.",
      keyPoints: [
        "Rare beachfront position on Palm Jumeirah",
        "Recently renovated to highest standards",
        "Strong demand from UHNW tenant pool",
        "Limited comparable supply constrains pricing pressure",
      ],
      pricing: {
        askingPrice: 42000000,
        pricePerSqft: 4941,
        recommendedOffer: 40000000,
        rentCurrent: 0,
        rentPotential: 2400000,
        irr: 12.5,
        equityMultiple: 1.8,
      },
      strategy: {
        plan: "Acquire, light refresh, and lease to premium tenant",
        holdPeriod: "5-7 years",
        exit: "Private sale or auction",
        focusPoints: ["Secure long-term lease", "Smart home upgrades", "Landscape enhancement"],
      },
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: DEMO_IDS.MEMO_SENT,
    title: "Investment Memo - Dubai Creek Harbour Residence",
    investorId: DEMO_IDS.INVESTOR_SECONDARY,
    investorName: "Amira Al-Mansoori",
    propertyId: DEMO_IDS.LISTING_CREEK_TOWER,
    propertyTitle: "Dubai Creek Harbour Residence",
    status: "sent",
    content: "This investment memorandum presents a value-add opportunity in Dubai Creek Harbour...",
    analysis: {
      summary: "Emerging area with significant infrastructure investment and appreciation potential.",
      keyPoints: [
        "Metro connection expected 2026",
        "Below-market pricing vs comparable areas",
        "Developer payment plan available",
        "Strong rental fundamentals",
      ],
      pricing: {
        askingPrice: 6800000,
        pricePerSqft: 2833,
        recommendedOffer: 6500000,
        rentCurrent: 380000,
        rentPotential: 450000,
        irr: 18.2,
        equityMultiple: 2.1,
      },
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: DEMO_IDS.MEMO_APPROVED,
    title: "Investment Memo - Bluewaters Island 2BR",
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    investorName: "Mohammed Al-Rashid",
    propertyId: DEMO_IDS.LISTING_BLUEWATERS_UNIT,
    propertyTitle: "Bluewaters Island 2BR",
    status: "approved",
    content: "This investment memorandum details the completed acquisition of a premium 2BR unit on Bluewaters Island...",
    analysis: {
      summary: "Trophy asset in iconic location with strong tourism-driven rental demand.",
      keyPoints: [
        "Ain Dubai proximity drives premium rents",
        "Hotel-managed rental pool reduces vacancy risk",
        "Furnished unit ready for immediate rental",
        "Limited supply on island supports pricing",
      ],
      pricing: {
        askingPrice: 5200000,
        pricePerSqft: 3152,
        recommendedOffer: 4900000,
        rentCurrent: 336000,
        rentPotential: 400000,
        irr: 14.8,
        equityMultiple: 1.65,
      },
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================
// DEMO DEAL ROOMS
// ============================================

export const demoDealRooms: DealRoom[] = [
  {
    id: DEMO_IDS.DEAL_DUE_DILIGENCE,
    title: "Palm Jumeirah Villa Acquisition",
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    investorName: "Mohammed Al-Rashid",
    propertyId: DEMO_IDS.LISTING_PALM_VILLA,
    propertyTitle: "Palm Jumeirah Signature Villa",
    status: "due-diligence",
    parties: [
      { id: "p1", name: "Mohammed Al-Rashid", role: "Buyer", email: "m.alrashid@alrashid-inv.ae", avatar: "/placeholder-user.jpg" },
      { id: "p2", name: "Sarah Al-Rashid", role: "Agent", email: "sarah@investorsos.ae", avatar: "/professional-woman-avatar.png" },
      { id: "p3", name: "Dubai Land Department", role: "Authority", email: "contact@dld.gov.ae" },
      { id: "p4", name: "Emirates NBD", role: "Escrow Bank", email: "corporate@emiratesnbd.com" },
    ],
    checklist: [
      { id: "c1", title: "Title deed verification", category: "Legal", completed: true },
      { id: "c2", title: "NOC from developer", category: "Legal", completed: true },
      { id: "c3", title: "Property inspection report", category: "Technical", completed: true },
      { id: "c4", title: "Snagging list resolution", category: "Technical", completed: false, dueDate: "2025-02-01" },
      { id: "c5", title: "Escrow account setup", category: "Financial", completed: false, dueDate: "2025-02-05" },
      { id: "c6", title: "Transfer fee payment", category: "Financial", completed: false, dueDate: "2025-02-10" },
    ],
    timeline: [
      { id: "t1", title: "Offer accepted", date: "2025-01-10", type: "milestone" },
      { id: "t2", title: "Deposit transferred", date: "2025-01-12", type: "milestone" },
      { id: "t3", title: "Site inspection", date: "2025-01-18", type: "meeting" },
      { id: "t4", title: "Inspection report received", date: "2025-01-20", type: "document" },
    ],
    createdAt: "2025-01-10T10:00:00Z",
    lastUpdatedAt: new Date().toISOString(),
    ticketSizeAed: 42000000,
    offerPriceAed: 40000000,
    targetCloseDate: "2025-02-28",
    probability: 75,
    nextStep: "Complete snagging resolution",
    summary: "Premium villa acquisition proceeding smoothly. Minor snagging items identified during inspection.",
  },
  {
    id: DEMO_IDS.DEAL_CLOSING,
    title: "Creek Harbour Investment",
    investorId: DEMO_IDS.INVESTOR_SECONDARY,
    investorName: "Amira Al-Mansoori",
    propertyId: DEMO_IDS.LISTING_CREEK_TOWER,
    propertyTitle: "Dubai Creek Harbour Residence",
    status: "closing",
    parties: [
      { id: "p1", name: "Amira Al-Mansoori", role: "Buyer", email: "amira@mansoori-capital.com", avatar: "/placeholder-user.jpg" },
      { id: "p2", name: "Sarah Al-Rashid", role: "Agent", email: "sarah@investorsos.ae", avatar: "/professional-woman-avatar.png" },
      { id: "p3", name: "Emaar Properties", role: "Seller", email: "sales@emaar.ae" },
    ],
    checklist: [
      { id: "c1", title: "Title deed verification", category: "Legal", completed: true },
      { id: "c2", title: "NOC from developer", category: "Legal", completed: true },
      { id: "c3", title: "Payment plan approval", category: "Financial", completed: true },
      { id: "c4", title: "Bank transfer initiated", category: "Financial", completed: true },
      { id: "c5", title: "DLD registration", category: "Legal", completed: false, dueDate: "2025-01-28" },
      { id: "c6", title: "Key handover", category: "Completion", completed: false, dueDate: "2025-01-30" },
    ],
    timeline: [
      { id: "t1", title: "Offer submitted", date: "2025-01-05", type: "milestone" },
      { id: "t2", title: "Counteroffer negotiation", date: "2025-01-08", type: "update" },
      { id: "t3", title: "Final agreement signed", date: "2025-01-15", type: "document" },
      { id: "t4", title: "Funds transferred", date: "2025-01-22", type: "milestone" },
    ],
    createdAt: "2025-01-05T09:00:00Z",
    lastUpdatedAt: new Date().toISOString(),
    ticketSizeAed: 6800000,
    offerPriceAed: 6500000,
    targetCloseDate: "2025-01-30",
    probability: 95,
    nextStep: "Complete DLD registration",
    summary: "Deal in final closing stage. Funds transferred, awaiting DLD registration.",
  },
]

// ============================================
// DEMO TASKS
// ============================================

export const demoTasks: Task[] = [
  {
    id: "demo-task-001",
    title: "Complete snagging list for Palm Villa",
    description: "Review and resolve 3 minor items identified in inspection report",
    status: "in-progress",
    priority: "high",
    dueDate: "2025-02-01",
    assigneeId: DEMO_IDS.REALTOR,
    assigneeName: "Sarah Al-Rashid",
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    investorName: "Mohammed Al-Rashid",
    propertyId: DEMO_IDS.LISTING_PALM_VILLA,
    propertyTitle: "Palm Jumeirah Signature Villa",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-task-002",
    title: "Schedule DLD appointment",
    description: "Book slot for title transfer at Dubai Land Department",
    status: "open",
    priority: "high",
    dueDate: "2025-01-27",
    assigneeId: DEMO_IDS.REALTOR,
    assigneeName: "Sarah Al-Rashid",
    investorId: DEMO_IDS.INVESTOR_SECONDARY,
    investorName: "Amira Al-Mansoori",
    propertyId: DEMO_IDS.LISTING_CREEK_TOWER,
    propertyTitle: "Dubai Creek Harbour Residence",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-task-003",
    title: "Prepare Q4 portfolio report",
    description: "Compile quarterly performance report for Al-Rashid portfolio",
    status: "open",
    priority: "medium",
    dueDate: "2025-02-05",
    assigneeId: DEMO_IDS.REALTOR,
    assigneeName: "Sarah Al-Rashid",
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    investorName: "Mohammed Al-Rashid",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-task-004",
    title: "Review new Dubai Marina listings",
    description: "Screen 5 new listings matching Al-Rashid mandate criteria",
    status: "done",
    priority: "medium",
    assigneeId: DEMO_IDS.REALTOR,
    assigneeName: "Sarah Al-Rashid",
    investorId: DEMO_IDS.INVESTOR_PRIMARY,
    investorName: "Mohammed Al-Rashid",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================
// DEMO MARKET SIGNALS
// ============================================

export const demoMarketSignals = [
  {
    id: "demo-sig-001",
    area: "Dubai Marina",
    signalType: "price_increase",
    headline: "Dubai Marina prices up 8.2% YoY",
    summary: "Average transaction prices in Dubai Marina increased 8.2% year-over-year, driven by waterfront property demand.",
    severity: "positive",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-002",
    area: "Downtown Dubai",
    signalType: "new_supply",
    headline: "3 new towers launching in Downtown",
    summary: "Emaar announces 3 new residential towers with completion in 2027. May impact short-term rental yields.",
    severity: "neutral",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-003",
    area: "Palm Jumeirah",
    signalType: "transaction_record",
    headline: "Record villa sale at AED 500M",
    summary: "New record set for Palm Jumeirah villa sale, signaling continued ultra-prime demand.",
    severity: "positive",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-004",
    area: "Business Bay",
    signalType: "rental_growth",
    headline: "Office rents up 12% in Business Bay",
    summary: "Strong corporate demand drives office rental growth. Vacancy rates at 5-year low.",
    severity: "positive",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-005",
    area: "JVC",
    signalType: "infrastructure",
    headline: "New metro extension announced for JVC",
    summary: "RTA confirms metro extension to JVC with completion by 2028. Expected to boost property values 15-20%.",
    severity: "positive",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-006",
    area: "Dubai Creek Harbour",
    signalType: "development_update",
    headline: "Dubai Creek Tower on track for 2027",
    summary: "Emaar confirms Dubai Creek Tower construction progressing on schedule for 2027 completion.",
    severity: "neutral",
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-007",
    area: "Bluewaters Island",
    signalType: "tourism_boost",
    headline: "Ain Dubai visitors up 40%",
    summary: "Tourist footfall to Bluewaters Island up 40% following new attractions. Strong impact on short-term rentals.",
    severity: "positive",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-008",
    area: "Dubai Marina",
    signalType: "regulatory",
    headline: "New short-term rental regulations",
    summary: "DTCM introduces updated holiday home regulations. May affect rental pool operators.",
    severity: "neutral",
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-009",
    area: "Downtown Dubai",
    signalType: "price_increase",
    headline: "Boulevard units premium at 15%",
    summary: "Boulevard-facing units command 15% premium over comparable non-boulevard properties.",
    severity: "positive",
    timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-sig-010",
    area: "Palm Jumeirah",
    signalType: "rental_growth",
    headline: "Villa rents reach new high",
    summary: "Average Palm Jumeirah villa rents now at AED 1.2M annually, up 18% from 2024.",
    severity: "positive",
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================
// DEMO HELPER FUNCTIONS
// ============================================

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true"
}

/**
 * Get all demo data in a single bundle
 */
export function getDemoDataBundle() {
  return {
    investors: demoInvestors,
    properties: demoProperties,
    holdings: demoHoldings,
    memos: demoMemos,
    dealRooms: demoDealRooms,
    tasks: demoTasks,
    marketSignals: demoMarketSignals,
    ids: DEMO_IDS,
  }
}
