/**
 * Hot Demo Opportunities
 * Pre-loaded compelling opportunities with clear investment stories
 */

export type HotOpportunity = {
  id: string
  title: string
  area: string
  type: "residential" | "commercial" | "mixed-use"
  price: number
  priceFormatted: string
  yield: number
  bedrooms?: number
  size: number
  // Story elements
  headline: string
  story: string
  whyNow: string
  vsMarket: string
  score: number
  keyStrengths: string[]
  // Visual
  tag: "🔥 Hot Deal" | "💎 Hidden Gem" | "📈 Rising Area"
  tagColor: string
}

export const HOT_OPPORTUNITIES: HotOpportunity[] = [
  {
    id: "demo-lst-hot-000000000004",
    title: "Marina Pinnacle 3BR - Distressed Sale",
    area: "Dubai Marina",
    type: "residential",
    price: 2850000,
    priceFormatted: "AED 2.85M",
    yield: 8.0,
    size: 1850,
    bedrooms: 3,
    headline: "URGENT: 17% below market - 2 week close",
    story: "Distressed sale from relocating owner. High floor 3BR with full marina views. Currently rented at AED 228K/year. Seller needs urgent exit - reduced from AED 3.15M to AED 2.85M yesterday.",
    whyNow: "Seller must close within 2 weeks. Bank financing pre-approved. AED 1,540/sqft vs market AED 1,850.",
    vsMarket: "-17% vs DLD median",
    score: 91,
    keyStrengths: ["17% below market", "Urgent seller", "High floor marina view", "Tenanted"],
    tag: "🔥 Hot Deal",
    tagColor: "bg-red-500",
  },
  {
    id: "demo-lst-hot-000000000001",
    title: "Marina Gate Tower 2 - Full Floor Office",
    area: "Dubai Marina",
    type: "commercial",
    price: 4200000,
    priceFormatted: "AED 4.2M",
    yield: 9.2,
    size: 3500,
    headline: "15% below DLD median with 5-year tenant",
    story: "Full-floor office with blue-chip tenant (remaining 5 years on lease). Seller relocating to Europe - motivated for quick close. Last comparable sold for AED 1,400/sqft; this is AED 1,200/sqft.",
    whyNow: "Seller accepted 10% price cut yesterday. Another buyer fell through - 72hr exclusivity available.",
    vsMarket: "-15% vs DLD median",
    score: 94,
    keyStrengths: ["Blue-chip tenant locked in", "15% below market", "Motivated seller"],
    tag: "🔥 Hot Deal",
    tagColor: "bg-red-500",
  },
  {
    id: "demo-lst-hot-000000000002", 
    title: "JVC District 12 - 8-Unit Residential Block",
    area: "Jumeirah Village Circle",
    type: "residential",
    price: 8500000,
    priceFormatted: "AED 8.5M",
    yield: 11.4,
    size: 8200,
    bedrooms: 8,
    headline: "11.4% yield with 100% occupancy",
    story: "Fully occupied 8-unit block in emerging JVC. All units on 2-year Ejari contracts with 5% annual escalation. Metro Blue Line station opening Q3 2027 (800m away).",
    whyNow: "Metro announcement not yet priced in. Similar blocks near completed stations saw 25% appreciation.",
    vsMarket: "-8% vs portal avg",
    score: 88,
    keyStrengths: ["11.4% current yield", "Metro proximity", "100% occupied"],
    tag: "💎 Hidden Gem",
    tagColor: "bg-purple-500",
  },
  {
    id: "demo-lst-hot-000000000003",
    title: "Business Bay - Retail + Mezzanine",
    area: "Business Bay",
    type: "mixed-use",
    price: 3100000,
    priceFormatted: "AED 3.1M",
    yield: 8.8,
    size: 2100,
    headline: "Double-height retail in new tower",
    story: "Ground floor retail with mezzanine in 2024-completed tower. Current F&B tenant paying AED 275K/year. High footfall location next to Bay Avenue mall entrance.",
    whyNow: "Off-market from developer portfolio clearance. Not listed on any portal.",
    vsMarket: "-12% vs comparable",
    score: 85,
    keyStrengths: ["Off-market exclusive", "Prime footfall", "F&B tenant stable"],
    tag: "📈 Rising Area",
    tagColor: "bg-blue-500",
  },
  {
    id: "demo-lst-hot-000000000005",
    title: "Downtown Dubai 2BR - Burj Khalifa View",
    area: "Downtown Dubai",
    type: "residential",
    price: 3950000,
    priceFormatted: "AED 3.95M",
    yield: 7.2,
    size: 1650,
    bedrooms: 2,
    headline: "Premium 2BR at 12% below market",
    story: "Corner unit with unobstructed Burj Khalifa and Fountain views. Owner upgrading to larger unit in same building - wants quick sale. High-spec finish with smart home automation.",
    whyNow: "Seller closing on new unit in 3 weeks. Bank valuation came in at AED 4.5M - instant equity.",
    vsMarket: "-12% vs DLD median",
    score: 89,
    keyStrengths: ["Burj Khalifa view", "12% below market", "Smart home", "Motivated seller"],
    tag: "💎 Hidden Gem",
    tagColor: "bg-purple-500",
  },
  {
    id: "demo-lst-hot-000000000006",
    title: "Al Barsha South - New Build Studio Pack",
    area: "Al Barsha South",
    type: "residential",
    price: 1750000,
    priceFormatted: "AED 1.75M",
    yield: 10.5,
    size: 1200,
    bedrooms: 3,
    headline: "3 studios - 10.5% yield, 98% occupancy",
    story: "Package of 3 studio apartments in popular worker accommodation area. Strong Ejari rental demand from TECOM employers. All tenanted with 6-month renewals.",
    whyNow: "Bulk discount from investor portfolio exit. Individual studio value AED 650K each.",
    vsMarket: "-10% vs market rate",
    score: 82,
    keyStrengths: ["10.5% yield", "Bulk discount", "Strong rental demand", "Near TECOM"],
    tag: "📈 Rising Area",
    tagColor: "bg-blue-500",
  },
  {
    id: "demo-lst-hot-000000000007",
    title: "Palm Jumeirah - Garden Home Villa",
    area: "Palm Jumeirah",
    type: "residential",
    price: 18500000,
    priceFormatted: "AED 18.5M",
    yield: 5.8,
    size: 6800,
    bedrooms: 5,
    headline: "Rare Garden Home - 18% below last sale",
    story: "5BR Garden Home on the frond with private beach and pool. Previous owner sold for AED 22.5M in 2024. Estate sale - heirs want quick resolution.",
    whyNow: "Estate sale with 30-day closing deadline. Below-market for investor with cash ready.",
    vsMarket: "-18% vs last sale",
    score: 92,
    keyStrengths: ["Private beach", "18% below last sale", "Estate sale urgency", "Trophy asset"],
    tag: "🔥 Hot Deal",
    tagColor: "bg-red-500",
  },
]

/**
 * Get a random hot opportunity for demo purposes
 */
export function getRandomHotOpportunity(): HotOpportunity {
  return HOT_OPPORTUNITIES[Math.floor(Math.random() * HOT_OPPORTUNITIES.length)]
}

/**
 * Format hot opportunity for AI context
 */
export function formatHotOpportunityForAI(opp: HotOpportunity): string {
  return `**${opp.title}** - ${opp.area}
- **Price:** ${opp.priceFormatted} | **Yield:** ${opp.yield}% | **Size:** ${opp.size} sqft
- **vs Market:** ${opp.vsMarket}
- **Score:** ${opp.score}/100

**Investment Story:**
${opp.story}

**Why Now:**
${opp.whyNow}

**Key Strengths:**
${opp.keyStrengths.map(s => `• ${s}`).join('\n')}`
}
