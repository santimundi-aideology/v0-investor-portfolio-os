/**
 * Investor search: content index and AI-powered search recommendations.
 * Used by the topbar search (Command palette) to match queries and suggest likely searches.
 */

import {
  Briefcase,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Newspaper,
  Sparkles,
  User,
  Heart,
  MessageSquare,
  FileSearch,
  BarChart3,
  TrendingUp,
  Wallet,
  Building2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { investorNavItems } from "./investor-nav"

export type SearchableItem = {
  id: string
  label: string
  href: string
  icon: LucideIcon
  /** Keywords for matching (lowercase), including synonyms and related terms */
  keywords: string[]
}

/** Build searchable items from nav + extra keywords for better discovery */
const navSearchable: SearchableItem[] = investorNavItems.map((item) => {
  const baseKeywords = [
    item.label.toLowerCase(),
    ...(item.alsoMatch ?? []).map((p) => p.replace(/^\/investor\//, "").toLowerCase()),
  ]
  const extra: Record<string, string[]> = {
    overview: ["dashboard", "inicio", "resumen", "home"],
    portfolio: ["cartera", "inversiones", "holdings", "activos", "propiedades"],
    payments: ["pagos", "hitos", "milestones", "pago", "cuotas"],
    analytics: ["analítica", "analytics", "gráficos", "charts", "rendimiento", "performance"],
    "context-activity": ["contexto", "actividad", "activity", "noticias", "news"],
    opportunities: ["oportunidades", "ofertas", "finder", "buscar propiedades", "recomendaciones"],
    profile: ["perfil", "profile", "preferencias", "settings", "ajustes"],
  }
  const pathKey = item.href.replace(/^\/investor\//, "").split("/")[0]
  const more = extra[pathKey] ?? []
  return {
    id: `nav-${item.href}`,
    label: item.label,
    href: item.href,
    icon: item.icon,
    keywords: [...baseKeywords, ...more],
  }
})

/** Additional investor pages not in main nav but searchable */
const extraSearchable: SearchableItem[] = [
  {
    id: "opportunities-finder",
    label: "Opportunity Finder",
    href: "/investor/opportunities/finder",
    icon: FileSearch,
    keywords: ["finder", "buscar", "search", "oportunidades", "propiedades", "dld"],
  },
  {
    id: "opportunities-favourites",
    label: "Favourites",
    href: "/investor/opportunities/favourites",
    icon: Heart,
    keywords: ["favoritos", "favourites", "shortlist", "guardados"],
  },
  {
    id: "opportunities-suggestions",
    label: "Suggestions",
    href: "/investor/opportunities/suggestions",
    icon: Sparkles,
    keywords: ["sugerencias", "suggestions", "recomendaciones", "ai"],
  },
  {
    id: "deal-rooms",
    label: "Deal rooms",
    href: "/investor/deal-rooms",
    icon: Building2,
    keywords: ["deal room", "deal rooms", "deals", "negociaciones"],
  },
  {
    id: "investments",
    label: "Investments",
    href: "/investor/investments",
    icon: TrendingUp,
    keywords: ["inversiones", "investments", "inversión"],
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/investor/notifications",
    icon: MessageSquare,
    keywords: ["notificaciones", "notifications", "alertas"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/investor/settings",
    icon: User,
    keywords: ["settings", "ajustes", "configuración", "preferencias"],
  },
]

export const investorSearchableItems: SearchableItem[] = [...navSearchable, ...extraSearchable]

/** Normalize for matching: lowercase, trim, collapse spaces */
function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

/** Check if item matches query (label or any keyword) */
export function matchSearchableItem(item: SearchableItem, query: string): boolean {
  if (!query) return true
  const nq = normalizeQuery(query)
  const terms = nq.split(" ").filter(Boolean)
  const searchableText = [item.label, ...item.keywords].join(" ").toLowerCase()
  return terms.every((t) => searchableText.includes(t))
}

/** Filter searchable items by query */
export function searchInvestorContent(query: string): SearchableItem[] {
  const nq = normalizeQuery(query)
  if (!nq) return investorSearchableItems
  return investorSearchableItems.filter((item) => matchSearchableItem(item, query))
}

/** AI search recommendations: what the AI thinks the user is most likely to search for */
export type AIRecommendation = {
  id: string
  label: string
  href: string
  description: string
  icon: LucideIcon
}

export const investorSearchAIRecommendations: AIRecommendation[] = [
  {
    id: "rec-portfolio-performance",
    label: "Rendimiento de mi cartera",
    href: "/investor/analytics",
    description: "Ver analítica y rendimiento del portfolio",
    icon: BarChart3,
  },
  {
    id: "rec-upcoming-payments",
    label: "Próximos pagos e hitos",
    href: "/investor/payments",
    description: "Pagos y milestones pendientes",
    icon: Wallet,
  },
  {
    id: "rec-opportunities",
    label: "Oportunidades recomendadas",
    href: "/investor/opportunities",
    description: "Ofertas que encajan con tus criterios",
    icon: Sparkles,
  },
  {
    id: "rec-portfolio-holdings",
    label: "Ver mi cartera",
    href: "/investor/portfolio",
    description: "Holdings y posiciones",
    icon: Briefcase,
  },
  {
    id: "rec-finder",
    label: "Buscar propiedades",
    href: "/investor/opportunities/finder",
    description: "Buscador con IA y datos DLD",
    icon: FileSearch,
  },
  {
    id: "rec-favourites",
    label: "Favoritos y shortlist",
    href: "/investor/opportunities/favourites",
    description: "Propiedades guardadas",
    icon: Heart,
  },
  {
    id: "rec-overview",
    label: "Resumen e overview",
    href: "/investor/dashboard",
    description: "Dashboard general",
    icon: LayoutDashboard,
  },
  {
    id: "rec-activity",
    label: "Actividad y contexto",
    href: "/investor/context-activity",
    description: "Noticias y actividad reciente",
    icon: Newspaper,
  },
  {
    id: "rec-profile",
    label: "Perfil y preferencias",
    href: "/investor/profile",
    description: "Datos e preferencias de inversión",
    icon: User,
  },
]

/** Get AI recommendations, optionally filtered by current query (for “suggested” when typing) */
export function getAIRecommendations(query: string, limit = 5): AIRecommendation[] {
  const nq = normalizeQuery(query)
  const list = investorSearchAIRecommendations
  if (!nq) return list.slice(0, limit)
  const filtered = list.filter(
    (r) =>
      r.label.toLowerCase().includes(nq) ||
      r.description.toLowerCase().includes(nq) ||
      r.href.toLowerCase().includes(nq)
  )
  return (filtered.length ? filtered : list).slice(0, limit)
}
