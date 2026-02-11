"use client"

import * as React from "react"
import Link from "next/link"
import {
  Briefcase,
  Building2,
  Calendar,
  Clock3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  DollarSign,
  Edit2,
  FileText,
  Mail,
  Phone,
  Save,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  User,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Loader2 } from "lucide-react"
import type { Investor, Mandate } from "@/lib/types"
import { toast } from "sonner"

type PortfolioSummary = {
  propertyCount: number
  totalValue: number
  totalCost: number
  appreciationPct: number
  totalMonthlyIncome: number
  netAnnualIncome: number
  avgYieldPct: number
  avgOccupancy: number
}

type ActivitySummaryItem = {
  id: string
  type: "decision" | "memo" | "payment"
  title: string
  description: string
  timestamp: string
  href: string
}

type ActivitySummaryResponse = {
  items: ActivitySummaryItem[]
}

function formatActivityTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown time"

  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function ActivitySummaryCard() {
  const { data } = useAPI<ActivitySummaryResponse>("/api/investor/activity-summary", {
    suspense: true,
    revalidateOnFocus: true,
  })
  const items = data?.items ?? []

  const iconByType: Record<ActivitySummaryItem["type"], React.ReactNode> = {
    decision: <Target className="size-3.5 text-blue-600" />,
    memo: <FileText className="size-3.5 text-purple-600" />,
    payment: <Calendar className="size-3.5 text-amber-600" />,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock3 className="size-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40"
              >
                <div className="relative flex w-5 justify-center">
                  <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-muted">
                    {iconByType[item.type]}
                  </span>
                  {index < items.length - 1 && (
                    <span className="absolute top-6 h-[calc(100%+8px)] w-px bg-border" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatActivityTimestamp(item.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivitySummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock3 className="size-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded-md bg-muted/60" />
          <div className="h-12 animate-pulse rounded-md bg-muted/60" />
          <div className="h-12 animate-pulse rounded-md bg-muted/60" />
        </div>
      </CardContent>
    </Card>
  )
}

function InvestorDescription({
  value,
  onChange,
  onSave,
  isSaving,
  investorDescription,
  forceEditToken,
}: {
  value: string
  onChange: (val: string) => void
  onSave: () => Promise<boolean>
  isSaving: boolean
  investorDescription?: string
  forceEditToken?: number
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const hasContent = !!investorDescription?.trim()
  const isDirty = value !== (investorDescription ?? "")

  React.useEffect(() => {
    if (typeof forceEditToken === "number" && forceEditToken > 0) {
      setIsEditing(true)
    }
  }, [forceEditToken])

  if (!isEditing && !hasContent) {
    return (
      <div className="text-center py-6">
        <User className="size-10 mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-3">
          Tell us about yourself and your investment goals
        </p>
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          <Edit2 className="size-4 mr-2" />
          Add Description
        </Button>
      </div>
    )
  }

  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-gray-50/50 p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {investorDescription}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="size-3 mr-2" />
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Example: I'm a family office investor based in Dubai, focused on high-yield residential properties in prime locations. I prefer ready-to-move properties with stable rental demand, targeting 7%+ net yield. I'm interested in 2-3 bedroom apartments in areas like Dubai Marina, Downtown, and JBR. My investment horizon is 5-7 years, and I prioritize capital preservation with moderate growth..."
        className="min-h-[160px] text-sm resize-none"
        rows={7}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={async () => {
            const didSave = await onSave()
            if (didSave) {
              setIsEditing(false)
            }
          }}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-3 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-3 mr-2" />
              Save
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(investorDescription ?? "")
            setIsEditing(false)
          }}
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-gray-400">
        This description is used by the AI advisor to give you more relevant property recommendations and insights.
      </p>
    </div>
  )
}

export default function InvestorProfilePage() {
  const { scopedInvestorId } = useApp()
  const [editingSection, setEditingSection] = React.useState<"identity" | "thesis" | "mandate" | null>(null)
  const [savingSection, setSavingSection] = React.useState<
    "identity" | "thesis" | "mandate" | "description" | null
  >(null)
  const [openSections, setOpenSections] = React.useState({
    identity: true,
    about: true,
    thesis: true,
    mandate: true,
  })
  const identitySectionRef = React.useRef<HTMLDivElement | null>(null)
  const aboutSectionRef = React.useRef<HTMLDivElement | null>(null)
  const thesisSectionRef = React.useRef<HTMLDivElement | null>(null)
  const mandateSectionRef = React.useRef<HTMLDivElement | null>(null)
  const [descriptionEditToken, setDescriptionEditToken] = React.useState(0)

  // Fetch investor data from API
  const { data: investor, isLoading: investorLoading, mutate: mutateInvestor } = useAPI<Investor>(
    scopedInvestorId ? `/api/investors/${scopedInvestorId}` : null
  )

  // Fetch portfolio summary from API
  const { data: portfolioData, isLoading: portfolioLoading } = useAPI<{ summary: PortfolioSummary }>(
    scopedInvestorId ? `/api/portfolio/${scopedInvestorId}` : null
  )
  const summary = React.useMemo(() => portfolioData?.summary ?? {
    propertyCount: 0,
    totalValue: 0,
    totalCost: 0,
    appreciationPct: 0,
    totalMonthlyIncome: 0,
    netAnnualIncome: 0,
    avgYieldPct: 0,
    avgOccupancy: 0,
  }, [portfolioData])

  const [identityForm, setIdentityForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    preferredContactMethod: "email" as "email" | "phone" | "whatsapp",
  })
  const [descriptionValue, setDescriptionValue] = React.useState("")
  const [thesisForm, setThesisForm] = React.useState({
    thesisReturnStyle: "balanced" as "income" | "appreciation" | "balanced",
    thesisHoldPeriod: "",
    thesisPreferredExits: [] as string[],
    thesisNotes: "",
  })
  const [mandateForm, setMandateForm] = React.useState<Mandate | null>(null)

  const cloneMandate = React.useCallback((mandate?: Mandate): Mandate | null => {
    if (!mandate) return null
    return {
      ...mandate,
      preferredAreas: [...mandate.preferredAreas],
      propertyTypes: [...mandate.propertyTypes],
      primaryObjectives: mandate.primaryObjectives ? [...mandate.primaryObjectives] : undefined,
      dealBreakers: mandate.dealBreakers ? [...mandate.dealBreakers] : undefined,
      preferredBedrooms: mandate.preferredBedrooms ? [...mandate.preferredBedrooms] : undefined,
      preferredViews: mandate.preferredViews ? [...mandate.preferredViews] : undefined,
      developerPreferences: mandate.developerPreferences
        ? [...mandate.developerPreferences]
        : undefined,
    }
  }, [])

  const resetIdentityForm = React.useCallback((currentInvestor: Investor) => {
    setIdentityForm({
      name: currentInvestor.name ?? "",
      email: currentInvestor.email ?? "",
      phone: currentInvestor.phone ?? "",
      company: currentInvestor.company ?? "",
      preferredContactMethod: currentInvestor.preferredContactMethod ?? "email",
    })
  }, [])

  const resetThesisForm = React.useCallback((currentInvestor: Investor) => {
    setThesisForm({
      thesisReturnStyle: currentInvestor.thesisReturnStyle ?? "balanced",
      thesisHoldPeriod: currentInvestor.thesisHoldPeriod ?? "",
      thesisPreferredExits: currentInvestor.thesisPreferredExits ?? [],
      thesisNotes: currentInvestor.thesisNotes ?? "",
    })
  }, [])

  // Update form data when investor loads
  React.useEffect(() => {
    if (investor) {
      resetIdentityForm(investor)
      resetThesisForm(investor)
      setDescriptionValue(investor.description ?? "")
      setMandateForm(cloneMandate(investor.mandate))
    }
  }, [cloneMandate, investor, resetIdentityForm, resetThesisForm])

  const patchInvestor = React.useCallback(
    async (payload: Record<string, unknown>) => {
      if (!scopedInvestorId) return { ok: false, message: "Missing investor context" }
      const res = await fetch(`/api/investors/${scopedInvestorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save profile section")
      }
      mutateInvestor()
      return { ok: true }
    },
    [mutateInvestor, scopedInvestorId]
  )

  const handleIdentitySave = async (): Promise<boolean> => {
    if (!scopedInvestorId) return false
    setSavingSection("identity")
    try {
      await patchInvestor({
        name: identityForm.name,
        email: identityForm.email,
        phone: identityForm.phone,
        company: identityForm.company,
        preferredContactMethod: identityForm.preferredContactMethod,
      })
      setEditingSection(null)
      toast.success("Identity updated")
      return true
    } catch (err) {
      console.error("Failed to save identity section:", err)
      const message =
        err instanceof Error && err.message ? err.message : "Failed to save identity section"
      toast.error(message)
      return false
    } finally {
      setSavingSection(null)
    }
  }

  const handleDescriptionSave = async (): Promise<boolean> => {
    if (!scopedInvestorId) return false
    setSavingSection("description")
    try {
      await patchInvestor({
        description: descriptionValue,
      })
      toast.success("About me updated")
      return true
    } catch (err) {
      console.error("Failed to save description section:", err)
      const message =
        err instanceof Error && err.message ? err.message : "Failed to save description section"
      toast.error(message)
      return false
    } finally {
      setSavingSection(null)
    }
  }

  const handleThesisSave = async (): Promise<boolean> => {
    if (!scopedInvestorId) return false
    setSavingSection("thesis")
    try {
      await patchInvestor({
        thesisReturnStyle: thesisForm.thesisReturnStyle,
        thesisHoldPeriod: thesisForm.thesisHoldPeriod,
        thesisPreferredExits: thesisForm.thesisPreferredExits,
        thesisNotes: thesisForm.thesisNotes,
      })
      setEditingSection(null)
      toast.success("Investment thesis updated")
      return true
    } catch (err) {
      console.error("Failed to save thesis section:", err)
      const message =
        err instanceof Error && err.message ? err.message : "Failed to save thesis section"
      toast.error(message)
      return false
    } finally {
      setSavingSection(null)
    }
  }

  const parseList = React.useCallback((value: string) => {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }, [])

  const parseNumberList = React.useCallback((value: string) => {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((num) => Number.isFinite(num))
  }, [])

  const parseOptionalNumber = React.useCallback((value: string): number | undefined => {
    if (!value.trim()) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }, [])

  const createDefaultMandate = React.useCallback((): Mandate => {
    return {
      strategy: "",
      investmentHorizon: "",
      yieldTarget: "",
      riskTolerance: "medium",
      preferredAreas: [],
      propertyTypes: [],
      minInvestment: 0,
      maxInvestment: 0,
      notes: "",
    }
  }, [])

  const handleMandateSave = async (): Promise<boolean> => {
    if (!scopedInvestorId || !mandateForm) return false
    setSavingSection("mandate")
    try {
      await patchInvestor({
        mandate: mandateForm,
      })
      setEditingSection(null)
      toast.success("Investment mandate updated")
      return true
    } catch (err) {
      console.error("Failed to save mandate section:", err)
      const message =
        err instanceof Error && err.message ? err.message : "Failed to save mandate section"
      toast.error(message)
      return false
    } finally {
      setSavingSection(null)
    }
  }

  const isIdentityEditing = editingSection === "identity"
  const isThesisEditing = editingSection === "thesis"
  const isMandateEditing = editingSection === "mandate"
  const isIdentitySaving = savingSection === "identity"
  const isThesisSaving = savingSection === "thesis"
  const isMandateSaving = savingSection === "mandate"

  const identityDirty =
    identityForm.name !== (investor?.name ?? "") ||
    identityForm.email !== (investor?.email ?? "") ||
    identityForm.phone !== (investor?.phone ?? "") ||
    identityForm.company !== (investor?.company ?? "") ||
    identityForm.preferredContactMethod !== (investor?.preferredContactMethod ?? "email")

  const mandateDirty = React.useMemo(() => {
    const currentMandate = cloneMandate(investor?.mandate)
    return JSON.stringify(mandateForm ?? null) !== JSON.stringify(currentMandate)
  }, [cloneMandate, investor?.mandate, mandateForm])

  const thesisDirty =
    thesisForm.thesisReturnStyle !== (investor?.thesisReturnStyle ?? "balanced") ||
    thesisForm.thesisHoldPeriod !== (investor?.thesisHoldPeriod ?? "") ||
    JSON.stringify(thesisForm.thesisPreferredExits) !==
      JSON.stringify(investor?.thesisPreferredExits ?? []) ||
    thesisForm.thesisNotes !== (investor?.thesisNotes ?? "")

  const activeMandate = mandateForm ?? cloneMandate(investor?.mandate)

  const aiContextChecks = React.useMemo(() => {
    return [
      {
        key: "description",
        label: "Description",
        weight: 15,
        complete: descriptionValue.trim().length > 0,
        actionLabel: "Add your investment description",
        section: "about" as const,
      },
      {
        key: "strategy",
        label: "Mandate strategy",
        weight: 10,
        complete: !!activeMandate?.strategy?.trim(),
        actionLabel: "Add strategy to mandate",
        section: "mandate" as const,
      },
      {
        key: "preferredAreas",
        label: "Preferred areas",
        weight: 10,
        complete: (activeMandate?.preferredAreas?.length ?? 0) > 0,
        actionLabel: "Add preferred areas",
        section: "mandate" as const,
      },
      {
        key: "propertyTypes",
        label: "Property types",
        weight: 10,
        complete: (activeMandate?.propertyTypes?.length ?? 0) > 0,
        actionLabel: "Add property types",
        section: "mandate" as const,
      },
      {
        key: "yieldTarget",
        label: "Yield target",
        weight: 10,
        complete: !!activeMandate?.yieldTarget?.trim(),
        actionLabel: "Add a yield target",
        section: "mandate" as const,
      },
      {
        key: "riskTolerance",
        label: "Risk tolerance",
        weight: 5,
        complete: !!activeMandate?.riskTolerance,
        actionLabel: "Set risk tolerance",
        section: "mandate" as const,
      },
      {
        key: "budget",
        label: "Investment budget range",
        weight: 10,
        complete:
          typeof activeMandate?.minInvestment === "number" &&
          activeMandate.minInvestment > 0 &&
          typeof activeMandate?.maxInvestment === "number" &&
          activeMandate.maxInvestment > 0,
        actionLabel: "Set min and max budget",
        section: "mandate" as const,
      },
      {
        key: "dealBreakers",
        label: "Deal breakers",
        weight: 10,
        complete: (activeMandate?.dealBreakers?.length ?? 0) > 0,
        actionLabel: "Add deal breakers",
        section: "mandate" as const,
      },
      {
        key: "preferredBedrooms",
        label: "Preferred bedrooms",
        weight: 5,
        complete: (activeMandate?.preferredBedrooms?.length ?? 0) > 0,
        actionLabel: "Add preferred bedrooms",
        section: "mandate" as const,
      },
      {
        key: "primaryObjectives",
        label: "Primary objectives",
        weight: 10,
        complete: (activeMandate?.primaryObjectives?.length ?? 0) > 0,
        actionLabel: "Add primary objectives",
        section: "mandate" as const,
      },
      {
        key: "decisionTimeline",
        label: "Decision timeline",
        weight: 5,
        complete: !!activeMandate?.decisionTimeline,
        actionLabel: "Set decision timeline",
        section: "mandate" as const,
      },
    ]
  }, [activeMandate, descriptionValue])

  const aiContextCompletion = React.useMemo(() => {
    const score = aiContextChecks.reduce((total, check) => {
      return total + (check.complete ? check.weight : 0)
    }, 0)
    return Math.min(100, Math.max(0, score))
  }, [aiContextChecks])

  const topMissingAiFields = React.useMemo(() => {
    return aiContextChecks.filter((check) => !check.complete).slice(0, 3)
  }, [aiContextChecks])

  const handleAiContextAction = React.useCallback(
    (section: "identity" | "about" | "thesis" | "mandate") => {
      const nextOpen = { identity: true, about: true, thesis: true, mandate: true }
      if (section === "identity") {
        setOpenSections((prev) => ({ ...prev, ...nextOpen, identity: true }))
        setEditingSection("identity")
        identitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      if (section === "about") {
        setOpenSections((prev) => ({ ...prev, ...nextOpen, about: true }))
        setDescriptionEditToken((prev) => prev + 1)
        aboutSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      if (section === "thesis") {
        setOpenSections((prev) => ({ ...prev, ...nextOpen, thesis: true }))
        setEditingSection("thesis")
        thesisSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      setOpenSections((prev) => ({ ...prev, ...nextOpen, mandate: true }))
      setEditingSection("mandate")
      if (!mandateForm) setMandateForm(createDefaultMandate())
      mandateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    [createDefaultMandate, mandateForm]
  )

  if (investorLoading || portfolioLoading || !scopedInvestorId || !investor) {
    // Still resolving auth / investor context, or loading data
    if (!investor && scopedInvestorId && !investorLoading) {
      // We have an ID, finished loading, but nothing came back → truly not found
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">Investor not found</p>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  const formatTitleCase = (value: string) =>
    value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")

  const formatFurnishedPreference = (value?: "furnished" | "unfurnished" | "any") => {
    if (!value) return "Not set"
    if (value === "any") return "Any"
    return value === "furnished" ? "Furnished" : "Unfurnished"
  }

  const formatCompletionStatus = (value?: "ready" | "off_plan" | "any") => {
    if (!value) return "Not set"
    if (value === "any") return "Any"
    return value === "ready" ? "Ready" : "Off-plan"
  }

  const formatDecisionTimeline = (
    value?: "immediate" | "1-2_weeks" | "1_month" | "flexible"
  ) => {
    if (!value) return "Not set"
    if (value === "immediate") return "Immediate"
    if (value === "1-2_weeks") return "1-2 weeks"
    if (value === "1_month") return "1 month"
    return "Flexible"
  }

  const formatDueDiligenceLevel = (value?: "light" | "standard" | "extensive") => {
    if (!value) return "Not set"
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  const formatLeverageAppetite = (value?: "none" | "low" | "moderate" | "high") => {
    if (!value) return "Not set"
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  const formatPaymentPlan = (value?: boolean) => {
    if (value === true) return "Required"
    if (value === false) return "Not required"
    return "Any"
  }

  const formatSizeRange = (minSize?: number, maxSize?: number) => {
    if (typeof minSize === "number" && typeof maxSize === "number") {
      return `${minSize.toLocaleString()} - ${maxSize.toLocaleString()} sqft`
    }
    if (typeof minSize === "number") {
      return `${minSize.toLocaleString()}+ sqft`
    }
    if (typeof maxSize === "number") {
      return `Up to ${maxSize.toLocaleString()} sqft`
    }
    return "Not set"
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* ── Identity ───────────────────────────────────────────── */}
      <div ref={identitySectionRef}>
      <Card>
        <Collapsible
          open={openSections.identity}
          onOpenChange={(isOpen) =>
            setOpenSections((prev) => ({
              ...prev,
              identity: isOpen,
            }))
          }
        >
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="-ml-2 mt-0.5 size-8">
                    {openSections.identity ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-4 text-primary" />
                    Identity
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Basic profile and preferred contact details.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AskAIBankerWidget
                  agentId="portfolio_advisor"
                  title="Profile Advisor"
                  description="Get help with your profile and mandate"
                  suggestedQuestions={[
                    "Is my mandate well-defined?",
                    "What areas should I consider?",
                    "How does my portfolio align with my goals?",
                  ]}
                  pagePath="/investor/profile"
                  scopedInvestorId={scopedInvestorId}
                  variant="inline"
                />
                <Button
                  variant={isIdentityEditing ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOpenSections((prev) => ({ ...prev, identity: true }))
                    setEditingSection("identity")
                  }}
                  disabled={editingSection !== null && !isIdentityEditing}
                >
                  <Edit2 className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                  {investor.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{investor.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{investor.company}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        investor.status === "active"
                          ? "border-green-500/30 bg-green-500/10 text-green-700"
                          : ""
                      )}
                    >
                      {investor.status}
                    </Badge>
                  </div>
                </div>
              </div>
              {isIdentityEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="identity-name" className="text-xs">
                        Full Name
                      </Label>
                      <Input
                        id="identity-name"
                        value={identityForm.name}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="identity-company" className="text-xs">
                        Company
                      </Label>
                      <Input
                        id="identity-company"
                        value={identityForm.company}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({ ...prev, company: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="identity-email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="identity-email"
                        type="email"
                        value={identityForm.email}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="identity-phone" className="text-xs">
                        Phone
                      </Label>
                      <Input
                        id="identity-phone"
                        value={identityForm.phone}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="identity-contact-method" className="text-xs">
                        Preferred Contact Method
                      </Label>
                      <Select
                        value={identityForm.preferredContactMethod}
                        onValueChange={(value) =>
                          setIdentityForm((prev) => ({
                            ...prev,
                            preferredContactMethod: value as "email" | "phone" | "whatsapp",
                          }))
                        }
                      >
                        <SelectTrigger id="identity-contact-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t pt-4">
                    <Button variant="ghost" onClick={() => {
                      setEditingSection(null)
                      resetIdentityForm(investor)
                    }}>
                      <X className="size-3.5 mr-1.5" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleIdentitySave}
                      disabled={!identityDirty || isIdentitySaving}
                    >
                      {isIdentitySaving ? (
                        <>
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5 mr-1.5" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Mail className="size-3.5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Email
                      </p>
                      <p className="text-sm font-medium truncate">{investor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Phone className="size-3.5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Phone
                      </p>
                      <p className="text-sm font-medium truncate">{investor.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Building2 className="size-3.5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Company
                      </p>
                      <p className="text-sm font-medium truncate">{investor.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Calendar className="size-3.5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Member Since
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(investor.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      </div>

      {/* ── AI Context Health ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            AI Context Health
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            More complete profile context improves recommendation quality.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completeness</span>
                <span className="font-semibold">{aiContextCompletion}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${aiContextCompletion}%` }}
                />
              </div>
            </div>
          </div>
          {topMissingAiFields.length > 0 ? (
            <div className="space-y-2">
              {topMissingAiFields.map((missing) => (
                <Button
                  key={missing.key}
                  variant="ghost"
                  className="h-auto w-full justify-between p-2 text-left"
                  onClick={() => handleAiContextAction(missing.section)}
                >
                  <span className="text-sm">
                    Add {missing.label} to improve recommendations
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-700">
              Great job - your AI context is fully complete.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Portfolio Summary (compact KPI strip) ─────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.propertyCount}</p>
            <p className="text-[11px] text-muted-foreground">Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatAED(summary.totalValue)}</p>
            <p className="text-[11px] text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.avgYieldPct.toFixed(1)}%</p>
            <p className="text-[11px] text-muted-foreground">Avg Yield</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">+{summary.appreciationPct.toFixed(1)}%</p>
            <p className="text-[11px] text-muted-foreground">Appreciation</p>
          </CardContent>
        </Card>
      </div>

      {/* ── About Me & Investment Goals ───────────────────────── */}
      <div ref={aboutSectionRef}>
      <Card>
        <Collapsible
          open={openSections.about}
          onOpenChange={(isOpen) =>
            setOpenSections((prev) => ({
              ...prev,
              about: isOpen,
            }))
          }
        >
          <CardHeader>
            <div className="flex items-start gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 mt-0.5 size-8">
                  {openSections.about ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="size-4 text-primary" />
                  About Me & Investment Goals
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe yourself and what you&apos;re looking for. This helps your AI advisor
                  give you better, more personalized recommendations.
                </p>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <InvestorDescription
                value={descriptionValue}
                onChange={setDescriptionValue}
                onSave={handleDescriptionSave}
                isSaving={savingSection === "description"}
                investorDescription={investor?.description}
                forceEditToken={descriptionEditToken}
              />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      </div>

      {/* ── Investment Thesis ─────────────────────────────────── */}
      <div ref={thesisSectionRef}>
      <Card>
        <Collapsible
          open={openSections.thesis}
          onOpenChange={(isOpen) =>
            setOpenSections((prev) => ({
              ...prev,
              thesis: isOpen,
            }))
          }
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="-ml-2 mt-0.5 size-8">
                    {openSections.thesis ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-primary" />
                    Investment Thesis
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    High-level philosophy: why you invest and how you think about exits.
                  </p>
                </div>
              </div>
              <Button
                variant={isThesisEditing ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setOpenSections((prev) => ({ ...prev, thesis: true }))
                  setEditingSection("thesis")
                }}
                disabled={editingSection !== null && !isThesisEditing}
              >
                <Edit2 className="size-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {isThesisEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Return Style</Label>
                      <Select
                        value={thesisForm.thesisReturnStyle}
                        onValueChange={(value) =>
                          setThesisForm((prev) => ({
                            ...prev,
                            thesisReturnStyle: value as "income" | "appreciation" | "balanced",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="appreciation">Appreciation</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Hold Period</Label>
                      <Input
                        value={thesisForm.thesisHoldPeriod}
                        placeholder="e.g. 5-7 years"
                        onChange={(e) =>
                          setThesisForm((prev) => ({ ...prev, thesisHoldPeriod: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Preferred Exits (comma separated)</Label>
                      <Input
                        value={thesisForm.thesisPreferredExits.join(", ")}
                        placeholder="secondary sale, refinance, hold indefinitely"
                        onChange={(e) =>
                          setThesisForm((prev) => ({
                            ...prev,
                            thesisPreferredExits: parseList(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Thesis Notes</Label>
                      <Textarea
                        value={thesisForm.thesisNotes}
                        onChange={(e) =>
                          setThesisForm((prev) => ({ ...prev, thesisNotes: e.target.value }))
                        }
                        rows={4}
                        placeholder="Any additional principles, constraints, or exit logic..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingSection(null)
                        resetThesisForm(investor)
                      }}
                    >
                      <X className="size-3.5 mr-1.5" />
                      Cancel
                    </Button>
                    <Button onClick={handleThesisSave} disabled={isThesisSaving || !thesisDirty}>
                      {isThesisSaving ? (
                        <>
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5 mr-1.5" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Return Style
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatTitleCase(thesisForm.thesisReturnStyle)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Hold Period
                      </p>
                      <p className="mt-1 font-semibold">{thesisForm.thesisHoldPeriod || "Not set"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Preferred Exits
                    </p>
                    {thesisForm.thesisPreferredExits.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {thesisForm.thesisPreferredExits.map((item) => (
                          <Badge key={item} variant="outline" className="text-[11px]">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not set</p>
                    )}
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Thesis Notes
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {thesisForm.thesisNotes.trim() || "Not set"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      </div>

      {/* ── Investment Mandate ────────────────────────────────── */}
      <div ref={mandateSectionRef}>
      <Card>
        <Collapsible
          open={openSections.mandate}
          onOpenChange={(isOpen) =>
            setOpenSections((prev) => ({
              ...prev,
              mandate: isOpen,
            }))
          }
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="-ml-2 mt-0.5 size-8">
                    {openSections.mandate ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="size-4 text-primary" />
                    Investment Mandate
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Strategy, preferences, and execution constraints.
                  </p>
                </div>
              </div>
              <Button
                variant={isMandateEditing ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setOpenSections((prev) => ({ ...prev, mandate: true }))
                  if (!mandateForm) setMandateForm(createDefaultMandate())
                  setEditingSection("mandate")
                }}
                disabled={editingSection !== null && !isMandateEditing}
              >
                <Edit2 className="size-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {!mandateForm && !isMandateEditing ? (
                <div className="text-center py-8">
                  <Target className="size-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No mandate defined yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setMandateForm(createDefaultMandate())
                      setEditingSection("mandate")
                    }}
                  >
                    Add Mandate
                  </Button>
                </div>
              ) : isMandateEditing && mandateForm ? (
                <div className="space-y-6">
                  <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Strategy & Budget</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Strategy</Label>
                        <Input
                          value={mandateForm.strategy}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, strategy: e.target.value } : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Investment Horizon</Label>
                        <Input
                          value={mandateForm.investmentHorizon}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, investmentHorizon: e.target.value } : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Yield Target</Label>
                        <Input
                          value={mandateForm.yieldTarget}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, yieldTarget: e.target.value } : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Risk Tolerance</Label>
                        <Select
                          value={mandateForm.riskTolerance}
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? { ...prev, riskTolerance: value as "low" | "medium" | "high" }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Min Investment (AED)</Label>
                        <Input
                          type="number"
                          value={mandateForm.minInvestment}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, minInvestment: Number(e.target.value) || 0 } : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max Investment (AED)</Label>
                        <Input
                          type="number"
                          value={mandateForm.maxInvestment}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, maxInvestment: Number(e.target.value) || 0 } : prev
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Property Preferences</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Preferred Areas (comma separated)</Label>
                        <Input
                          value={mandateForm.preferredAreas.join(", ")}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, preferredAreas: parseList(e.target.value) } : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Property Types (comma separated)</Label>
                        <Input
                          value={mandateForm.propertyTypes.join(", ")}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, propertyTypes: parseList(e.target.value) } : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Preferred Bedrooms (e.g. 1,2,3)</Label>
                        <Input
                          value={(mandateForm.preferredBedrooms ?? []).join(", ")}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    preferredBedrooms: parseNumberList(e.target.value),
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Preferred Views (comma separated)</Label>
                        <Input
                          value={(mandateForm.preferredViews ?? []).join(", ")}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, preferredViews: parseList(e.target.value) } : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Furnished Preference</Label>
                        <Select
                          value={mandateForm.furnishedPreference ?? "any"}
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    furnishedPreference: value as
                                      | "furnished"
                                      | "unfurnished"
                                      | "any",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="furnished">Furnished</SelectItem>
                            <SelectItem value="unfurnished">Unfurnished</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Completion Status</Label>
                        <Select
                          value={mandateForm.completionStatus ?? "any"}
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    completionStatus: value as "ready" | "off_plan" | "any",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="off_plan">Off-plan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Developer Preferences (comma separated)</Label>
                        <Input
                          value={(mandateForm.developerPreferences ?? []).join(", ")}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    developerPreferences: parseList(e.target.value),
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tenant Requirements</Label>
                        <Select
                          value={mandateForm.tenantRequirements ?? "any"}
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    tenantRequirements: value as "vacant" | "tenanted" | "any",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="tenanted">Tenanted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Min Size (sqft)</Label>
                        <Input
                          type="number"
                          value={mandateForm.minSize ?? ""}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    minSize: parseOptionalNumber(e.target.value),
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max Size (sqft)</Label>
                        <Input
                          type="number"
                          value={mandateForm.maxSize ?? ""}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    maxSize: parseOptionalNumber(e.target.value),
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max Service Charge (AED/sqft)</Label>
                        <Input
                          type="number"
                          value={mandateForm.maxServiceCharge ?? ""}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    maxServiceCharge: parseOptionalNumber(e.target.value),
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Deal Preferences</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Primary Objectives (comma separated)</Label>
                        <Input
                          value={(mandateForm.primaryObjectives ?? []).join(", ")}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    primaryObjectives: parseList(e.target.value),
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Deal Breakers (comma separated)</Label>
                        <Input
                          value={(mandateForm.dealBreakers ?? []).join(", ")}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    dealBreakers: parseList(e.target.value),
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Payment Plan Required</Label>
                        <Select
                          value={
                            mandateForm.paymentPlanRequired === undefined
                              ? "unset"
                              : mandateForm.paymentPlanRequired
                                ? "true"
                                : "false"
                          }
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    paymentPlanRequired:
                                      value === "unset" ? undefined : value === "true",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">Any</SelectItem>
                            <SelectItem value="true">Required</SelectItem>
                            <SelectItem value="false">Not required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Leverage Appetite</Label>
                        <Select
                          value={mandateForm.leverageAppetite ?? "none"}
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    leverageAppetite: value as
                                      | "none"
                                      | "low"
                                      | "moderate"
                                      | "high",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Open to Co-Investment</Label>
                        <Select
                          value={
                            mandateForm.coInvestmentOpen === undefined
                              ? "unset"
                              : mandateForm.coInvestmentOpen
                                ? "true"
                                : "false"
                          }
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    coInvestmentOpen:
                                      value === "unset" ? undefined : value === "true",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">Any</SelectItem>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Exclusive Deals Only</Label>
                        <Select
                          value={
                            mandateForm.exclusiveDeals === undefined
                              ? "unset"
                              : mandateForm.exclusiveDeals
                                ? "true"
                                : "false"
                          }
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    exclusiveDeals:
                                      value === "unset" ? undefined : value === "true",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">Any</SelectItem>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Decision Timeline</Label>
                        <Select
                          value={mandateForm.decisionTimeline ?? "flexible"}
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    decisionTimeline: value as
                                      | "immediate"
                                      | "1-2_weeks"
                                      | "1_month"
                                      | "flexible",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="1-2_weeks">1-2 weeks</SelectItem>
                            <SelectItem value="1_month">1 month</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Due Diligence Level</Label>
                        <Select
                          value={mandateForm.dueDiligenceLevel ?? "standard"}
                          onValueChange={(value) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    dueDiligenceLevel: value as
                                      | "light"
                                      | "standard"
                                      | "extensive",
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="extensive">Extensive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Communication</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Communication Expectations</Label>
                        <Textarea
                          value={mandateForm.communicationExpectations ?? ""}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    communicationExpectations: e.target.value,
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Additional Notes</Label>
                        <Textarea
                          value={mandateForm.notes ?? ""}
                          onChange={(e) =>
                            setMandateForm((prev) =>
                              prev ? { ...prev, notes: e.target.value } : prev
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingSection(null)
                        setMandateForm(cloneMandate(investor.mandate))
                      }}
                    >
                      <X className="size-3.5 mr-1.5" />
                      Cancel
                    </Button>
                    <Button onClick={handleMandateSave} disabled={isMandateSaving || !mandateDirty}>
                      {isMandateSaving ? (
                        <>
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5 mr-1.5" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : mandateForm ? (
                <div className="space-y-5">
                  <div className="space-y-3 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Strategy & Budget</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Strategy
                        </p>
                        <p className="mt-1 font-semibold">{mandateForm.strategy || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Investment Horizon
                        </p>
                        <p className="mt-1 font-semibold">
                          {mandateForm.investmentHorizon || "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Yield Target
                        </p>
                        <p className="mt-1 font-semibold">{mandateForm.yieldTarget || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Risk Tolerance
                        </p>
                        <p className="mt-1 font-semibold">{formatTitleCase(mandateForm.riskTolerance)}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="size-4 text-green-600" />
                        <p className="text-sm font-medium">
                          {formatAED(mandateForm.minInvestment)} to {formatAED(mandateForm.maxInvestment)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Property Preferences</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium mb-1">Preferred Areas</p>
                        <p className="text-sm text-muted-foreground">
                          {mandateForm.preferredAreas.length
                            ? mandateForm.preferredAreas.join(", ")
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Property Types</p>
                        <p className="text-sm text-muted-foreground">
                          {mandateForm.propertyTypes.length
                            ? mandateForm.propertyTypes.join(", ")
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Bedrooms</p>
                        <p className="text-sm text-muted-foreground">
                          {mandateForm.preferredBedrooms?.length
                            ? mandateForm.preferredBedrooms.join(", ")
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Views</p>
                        <p className="text-sm text-muted-foreground">
                          {mandateForm.preferredViews?.length
                            ? mandateForm.preferredViews.join(", ")
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Furnished</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFurnishedPreference(mandateForm.furnishedPreference)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Completion</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCompletionStatus(mandateForm.completionStatus)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Developer Preferences</p>
                        <p className="text-sm text-muted-foreground">
                          {mandateForm.developerPreferences?.length
                            ? mandateForm.developerPreferences.join(", ")
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Tenant Requirements</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTitleCase(mandateForm.tenantRequirements ?? "any")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Deal Preferences</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <p className="text-sm text-muted-foreground">
                        Objectives:{" "}
                        {(mandateForm.primaryObjectives ?? []).length
                          ? mandateForm.primaryObjectives?.join(", ")
                          : "Not set"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Deal breakers:{" "}
                        {(mandateForm.dealBreakers ?? []).length
                          ? mandateForm.dealBreakers?.join(", ")
                          : "Not set"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Payment plan: {formatPaymentPlan(mandateForm.paymentPlanRequired)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Leverage: {formatLeverageAppetite(mandateForm.leverageAppetite)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Co-investment:{" "}
                        {mandateForm.coInvestmentOpen === undefined
                          ? "Any"
                          : mandateForm.coInvestmentOpen
                            ? "Yes"
                            : "No"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Exclusive deals:{" "}
                        {mandateForm.exclusiveDeals === undefined
                          ? "Any"
                          : mandateForm.exclusiveDeals
                            ? "Yes"
                            : "No"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Decision timeline: {formatDecisionTimeline(mandateForm.decisionTimeline)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Due diligence: {formatDueDiligenceLevel(mandateForm.dueDiligenceLevel)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Communication</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {mandateForm.communicationExpectations?.trim() || "Not set"}
                    </p>
                    {mandateForm.notes?.trim() && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        Notes: {mandateForm.notes}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      </div>

      {/* ── Quick Links ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="group hover:shadow-sm transition-shadow">
          <CardContent className="p-0">
            <Link
              href="/investor/portfolio"
              className="flex items-center gap-3 p-4 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">My Portfolio</p>
                <p className="text-xs text-muted-foreground">
                  Holdings, analytics & performance
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-sm transition-shadow">
          <CardContent className="p-0">
            <Link
              href="/investor/opportunities"
              className="flex items-center gap-3 p-4 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <Target className="size-5 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Opportunities</p>
                <p className="text-xs text-muted-foreground">
                  Properties recommended for you
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-sm transition-shadow">
          <CardContent className="p-0">
            <Link
              href="/investor/payments"
              className="flex items-center gap-3 p-4 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <DollarSign className="size-5 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Payments</p>
                <p className="text-xs text-muted-foreground">
                  Milestones & payment schedule
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-sm transition-shadow">
          <CardContent className="p-0">
            <Link
              href="/investor/settings"
              className="flex items-center gap-3 p-4 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Settings className="size-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Settings</p>
                <p className="text-xs text-muted-foreground">
                  Notifications & preferences
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <React.Suspense fallback={<ActivitySummaryCardSkeleton />}>
        <ActivitySummaryCard />
      </React.Suspense>
    </div>
  )
}
