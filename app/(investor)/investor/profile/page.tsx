"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  DollarSign,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Save,
  Target,
  TrendingUp,
  User,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import { mockInvestors } from "@/lib/mock-data"
import { getPortfolioSummary, formatAED } from "@/lib/real-estate"
import type { Investor } from "@/lib/types"

// Mock investor ID - in production this would come from auth
const INVESTOR_ID = "inv-1"

export default function InvestorProfilePage() {
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Get investor data
  const investor = React.useMemo(
    () => mockInvestors.find((i) => i.id === INVESTOR_ID) as Investor | undefined,
    []
  )
  const summary = React.useMemo(() => getPortfolioSummary(INVESTOR_ID), [])

  // Form state
  const [formData, setFormData] = React.useState({
    name: investor?.name ?? "",
    email: investor?.email ?? "",
    phone: investor?.phone ?? "",
    company: investor?.company ?? "",
    preferredContactMethod: investor?.preferredContactMethod ?? "email",
  })

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise((r) => setTimeout(r, 1000))
    setIsSaving(false)
    setIsEditing(false)
  }

  if (!investor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Investor not found</p>
      </div>
    )
  }

  const mandate = investor.mandate

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
              <p className="text-sm text-gray-500">
                View and manage your investor profile
              </p>
            </div>
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
              scopedInvestorId={INVESTOR_ID}
              variant="inline"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {/* Profile Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                    {investor.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{investor.name}</CardTitle>
                    <p className="text-sm text-gray-500">{investor.company}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-1",
                        investor.status === "active"
                          ? "border-green-500/30 bg-green-500/10 text-green-700"
                          : ""
                      )}
                    >
                      {investor.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : isEditing ? (
                    <>
                      <Save className="size-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit2 className="size-4 mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact">Preferred Contact</Label>
                      <Select
                        value={formData.preferredContactMethod}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            preferredContactMethod: v as "email" | "phone" | "whatsapp",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Mail className="size-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium">{investor.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="size-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-medium">{investor.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building2 className="size-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Company</p>
                        <p className="font-medium">{investor.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="size-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Member Since</p>
                        <p className="font-medium">
                          {new Date(investor.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Investment Mandate */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-5 text-primary" />
                  Investment Mandate
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/investor/preferences">Edit Preferences</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mandate ? (
                <div className="space-y-6">
                  {/* Strategy & Horizon */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border bg-gray-50/50 p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Strategy
                      </p>
                      <p className="mt-1 font-semibold">{mandate.strategy}</p>
                    </div>
                    <div className="rounded-lg border bg-gray-50/50 p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Investment Horizon
                      </p>
                      <p className="mt-1 font-semibold">{mandate.investmentHorizon}</p>
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="rounded-lg border bg-gray-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="size-4 text-green-600" />
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Investment Budget
                      </p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {formatAED(mandate.minInvestment)}
                      </span>
                      <span className="text-gray-400">to</span>
                      <span className="text-2xl font-bold">
                        {formatAED(mandate.maxInvestment)}
                      </span>
                    </div>
                  </div>

                  {/* Targets */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border bg-gray-50/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="size-4 text-primary" />
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Yield Target
                        </p>
                      </div>
                      <p className="text-xl font-bold">{mandate.yieldTarget}</p>
                    </div>
                    <div className="rounded-lg border bg-gray-50/50 p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Risk Tolerance
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          mandate.riskTolerance === "low"
                            ? "border-green-500/30 bg-green-500/10 text-green-700"
                            : mandate.riskTolerance === "medium"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-700"
                        )}
                      >
                        {mandate.riskTolerance.charAt(0).toUpperCase() +
                          mandate.riskTolerance.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Preferred Areas */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="size-4 text-primary" />
                      <p className="text-sm font-medium">Preferred Areas</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mandate.preferredAreas.map((area) => (
                        <Badge key={area} variant="outline">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Property Types */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="size-4 text-primary" />
                      <p className="text-sm font-medium">Property Types</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mandate.propertyTypes.map((type) => (
                        <Badge key={type} variant="secondary">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {mandate.notes && (
                    <div className="rounded-lg border bg-gray-50/50 p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Additional Notes
                      </p>
                      <p className="text-sm text-gray-700">{mandate.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="size-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No mandate defined yet</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href="/investor/preferences">Set Up Mandate</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                Portfolio Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="text-center p-4 rounded-lg border bg-gray-50/50">
                  <p className="text-2xl font-bold">{summary.propertyCount}</p>
                  <p className="text-xs text-gray-500">Properties</p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-gray-50/50">
                  <p className="text-2xl font-bold">
                    {formatAED(summary.totalPortfolioValue)}
                  </p>
                  <p className="text-xs text-gray-500">Total Value</p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-gray-50/50">
                  <p className="text-2xl font-bold">{summary.avgYieldPct.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Avg Yield</p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-gray-50/50">
                  <p className="text-2xl font-bold text-green-600">
                    +{summary.appreciationPct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">Appreciation</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href="/investor/portfolio">View Full Portfolio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
