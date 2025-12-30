"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { ArrowLeft, Upload, FileText, Link2, Database, Building2, CheckCircle2, AlertTriangle } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  createProperty,
  calculateReadinessStatus,
  addToShortlist,
  linkPropertyToMemo,
} from "@/lib/property-store"
import type {
  PropertyIntakeSource,
  PropertySourceType,
  PropertyReadinessStatus,
  UnitType,
} from "@/lib/types"
import { useApp } from "@/components/providers/app-provider"

type WizardStep = "source" | "manual" | "upload" | "review"

const unitTypes: UnitType[] = [
  "studio",
  "1BR",
  "2BR",
  "3BR",
  "4BR",
  "5BR+",
  "villa",
  "townhouse",
  "penthouse",
  "office",
  "retail",
  "warehouse",
  "land",
  "other",
]

const sourceTypes: PropertySourceType[] = ["developer", "broker", "portal", "other"]

const propertyFormSchema = z.object({
  // Required
  title: z.string().min(1, "Project/building name is required"),
  area: z.string().min(1, "Area is required"),
  unitType: z.string().min(1, "Unit type is required") as z.ZodType<UnitType>,
  price: z.number().positive("Price must be positive"),
  currency: z.string().default("AED"),
  sourceType: z.string().min(1, "Source type is required") as z.ZodType<PropertySourceType>,
  sourceName: z.string().optional(),
  // Optional
  address: z.string().optional(),
  size: z.number().optional(),
  floor: z.number().optional(),
  view: z.string().optional(),
  parking: z.number().optional(),
  paymentPlan: z.string().optional(),
  notes: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  yearBuilt: z.number().optional(),
  description: z.string().optional(),
})

type PropertyFormData = z.infer<typeof propertyFormSchema>

/**
 * Mock file extraction - simulates parsing PDF/XLSX/CSV
 */
async function mockExtractPropertyData(file: File): Promise<Partial<PropertyFormData>> {
  // Simulate async extraction
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Return best-effort parsed fields based on filename/content type
  const fileName = file.name.toLowerCase()
  const isCSV = fileName.endsWith(".csv") || file.type === "text/csv"
  const isXLSX = fileName.endsWith(".xlsx") || file.type.includes("spreadsheet")
  const isPDF = fileName.endsWith(".pdf") || file.type === "application/pdf"

  // Mock extracted data
  return {
    title: fileName.includes("marina") ? "Marina Tower" : fileName.includes("downtown") ? "Downtown Plaza" : "Property from File",
    area: fileName.includes("marina") ? "Dubai Marina" : fileName.includes("downtown") ? "Downtown Dubai" : "Dubai",
    unitType: fileName.includes("office") ? "office" : fileName.includes("villa") ? "villa" : "2BR",
    price: 5000000,
    currency: "AED",
    sourceType: "broker",
    sourceName: isCSV ? "CSV Import" : isXLSX ? "Excel Import" : isPDF ? "PDF Import" : "File Import",
    size: 2000,
    floor: 10,
    view: "Sea view",
    parking: 2,
  }
}

export function PropertyIntakeWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useApp()

  // Context from entry point
  const investorId = searchParams.get("investorId")
  const memoId = searchParams.get("memoId")
  const returnTo = searchParams.get("returnTo") // "investor" | "memo" | null

  const [step, setStep] = React.useState<WizardStep>("source")
  const [intakeSource, setIntakeSource] = React.useState<PropertyIntakeSource | null>(null)
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null)
  const [extractedData, setExtractedData] = React.useState<Partial<PropertyFormData> | null>(null)
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [needsVerification, setNeedsVerification] = React.useState(false)

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      currency: "AED",
    },
  })

  // Prefill form when extracted data is available
  React.useEffect(() => {
    if (extractedData) {
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as keyof PropertyFormData, value as any)
        }
      })
    }
  }, [extractedData, form])

  const handleSourceSelect = (source: PropertyIntakeSource) => {
    setIntakeSource(source)
    if (source === "manual") {
      setStep("manual")
    } else if (source === "upload") {
      setStep("upload")
    } else {
      // Coming soon
      toast.info("This feature is coming soon")
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file)
    setIsExtracting(true)
    try {
      const extracted = await mockExtractPropertyData(file)
      setExtractedData(extracted)
      setIsExtracting(false)
      setStep("review")
    } catch (error) {
      setIsExtracting(false)
      toast.error("Failed to extract property data")
    }
  }

  const handleManualSubmit = (data: PropertyFormData) => {
    setExtractedData(data)
    setStep("review")
  }

  const handleReviewConfirm = () => {
    const formData = form.getValues()
    const readinessStatus = calculateReadinessStatus(
      {
        ...formData,
        source: {
          type: formData.sourceType,
          name: formData.sourceName,
          intakeSource: intakeSource!,
          ingestedAt: new Date().toISOString(),
          ingestedBy: user?.id,
          originalFile: uploadedFile?.name,
        },
      },
      needsVerification
    ) as PropertyReadinessStatus

    try {
      const property = createProperty({
        title: formData.title,
        address: formData.address || `${formData.area}`,
        area: formData.area,
        type: formData.unitType === "office" || formData.unitType === "retail" || formData.unitType === "warehouse" ? "commercial" : formData.unitType === "land" ? "land" : "residential",
        status: "available",
        readinessStatus,
        price: formData.price,
        currency: formData.currency,
        size: formData.size ?? 0,
        unitType: formData.unitType,
        floor: formData.floor,
        view: formData.view,
        parking: formData.parking,
        paymentPlan: formData.paymentPlan,
        notes: formData.notes,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        yearBuilt: formData.yearBuilt,
        description: formData.description,
        source: {
          type: formData.sourceType,
          name: formData.sourceName,
          intakeSource: intakeSource!,
          ingestedAt: new Date().toISOString(),
          ingestedBy: user?.id,
          originalFile: uploadedFile?.name,
        },
      })

      // Handle associations based on entry point
      if (investorId) {
        addToShortlist(property.id, investorId)
      }
      if (memoId) {
        linkPropertyToMemo(property.id, memoId)
      }

      toast.success("Property added successfully")

      // Route based on entry point
      if (returnTo === "investor" && investorId) {
        router.push(`/investors/${investorId}`)
      } else if (returnTo === "memo" && memoId) {
        router.push(`/memos/new?memoId=${memoId}&propertyId=${property.id}`)
      } else {
        router.push(`/properties/${property.id}`)
      }
    } catch (error) {
      toast.error("Failed to create property")
    }
  }

  const progress = step === "source" ? 25 : step === "manual" || step === "upload" ? 50 : step === "review" ? 75 : 100

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <PageHeader
          title="Add Property"
          subtitle="Intake new property into your portfolio"
        />
      </div>

      <Progress value={progress} className="h-2" />

      {step === "source" && <SourceSelectionStep onSelect={handleSourceSelect} />}

      {step === "manual" && (
        <ManualEntryStep
          form={form}
          onSubmit={handleManualSubmit}
          onBack={() => setStep("source")}
        />
      )}

      {step === "upload" && (
        <UploadStep
          onUpload={handleFileUpload}
          onBack={() => setStep("source")}
          isExtracting={isExtracting}
        />
      )}

      {step === "review" && (
        <ReviewStep
          form={form}
          extractedData={extractedData}
          uploadedFile={uploadedFile}
          intakeSource={intakeSource!}
          needsVerification={needsVerification}
          onNeedsVerificationChange={setNeedsVerification}
          onConfirm={handleReviewConfirm}
          onBack={() => {
            if (intakeSource === "manual") setStep("manual")
            else if (intakeSource === "upload") setStep("upload")
            else setStep("source")
          }}
        />
      )}
    </div>
  )
}

function SourceSelectionStep({ onSelect }: { onSelect: (source: PropertyIntakeSource) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Intake Source</CardTitle>
        <CardDescription>Choose how you want to add this property to your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => onSelect("manual")}
          >
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Manual Entry</h3>
                    <p className="text-sm text-muted-foreground">Enter property details manually</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fill out a form with property information including project name, area, unit type, price, and source details. Best for properties you have direct information about.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => onSelect("upload")}
          >
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Upload File</h3>
                    <p className="text-sm text-muted-foreground">PDF, XLSX, or CSV</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a property listing document (PDF brochure, Excel spreadsheet, or CSV file). The system will extract property details automatically and let you review/edit before saving.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-not-allowed opacity-50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Link2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Paste Listing Link</h3>
                    <p className="text-sm text-muted-foreground">Portal integration</p>
                    <Badge variant="outline" className="mt-1">
                      Coming soon
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a URL from property portals (Property Finder, Bayut, etc.). The system will automatically fetch and parse listing details including photos, pricing, and specifications.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-not-allowed opacity-50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Database className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Import from CRM</h3>
                    <p className="text-sm text-muted-foreground">Bulk import</p>
                    <Badge variant="outline" className="mt-1">
                      Coming soon
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect your CRM system (Salesforce, HubSpot, etc.) to bulk import property listings. Automatically sync property data, contacts, and deal status.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-not-allowed opacity-50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Developer Feed</h3>
                    <p className="text-sm text-muted-foreground">API integration</p>
                    <Badge variant="outline" className="mt-1">
                      Coming soon
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect to developer APIs (Emaar, DAMAC, etc.) to automatically receive new project launches, unit availability, and pricing updates in real-time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}

function ManualEntryStep({
  form,
  onSubmit,
  onBack,
}: {
  form: ReturnType<typeof useForm<PropertyFormData>>
  onSubmit: (data: PropertyFormData) => void
  onBack: () => void
}) {
  const [showOptional, setShowOptional] = React.useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
        <CardDescription>Enter the required information about the property</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Project/Building Name <span className="text-destructive">*</span>
              </Label>
              <Input id="title" {...form.register("title")} placeholder="Marina Tower" />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="area">
                Area <span className="text-destructive">*</span>
              </Label>
              <Input id="area" {...form.register("area")} placeholder="Dubai Marina" />
              {form.formState.errors.area && (
                <p className="text-sm text-destructive">{form.formState.errors.area.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unitType">
                Unit Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("unitType")}
                onValueChange={(value) => form.setValue("unitType", value as UnitType)}
              >
                <SelectTrigger id="unitType">
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  {unitTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.unitType && (
                <p className="text-sm text-destructive">{form.formState.errors.unitType.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">
                  Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  {...form.register("price", { valueAsNumber: true })}
                  placeholder="5000000"
                />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.watch("currency")}
                  onValueChange={(value) => form.setValue("currency", value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sourceType">
                Source Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("sourceType")}
                onValueChange={(value) => form.setValue("sourceType", value as PropertySourceType)}
              >
                <SelectTrigger id="sourceType">
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  {sourceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.sourceType && (
                <p className="text-sm text-destructive">{form.formState.errors.sourceType.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sourceName">Source Name (optional)</Label>
              <Input id="sourceName" {...form.register("sourceName")} placeholder="Emaar Properties" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input id="address" {...form.register("address")} placeholder="Full address" />
            </div>
          </div>

          <Separator />

          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full"
            >
              {showOptional ? "Hide" : "Show"} Optional Fields
            </Button>

            {showOptional && (
              <div className="mt-4 grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="size">Size (sqft)</Label>
                    <Input
                      id="size"
                      type="number"
                      {...form.register("size", { valueAsNumber: true })}
                      placeholder="2000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="floor">Floor</Label>
                    <Input
                      id="floor"
                      type="number"
                      {...form.register("floor", { valueAsNumber: true })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="view">View</Label>
                    <Input id="view" {...form.register("view")} placeholder="Sea view" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parking">Parking Spaces</Label>
                    <Input
                      id="parking"
                      type="number"
                      {...form.register("parking", { valueAsNumber: true })}
                      placeholder="2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      {...form.register("bedrooms", { valueAsNumber: true })}
                      placeholder="2"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      {...form.register("bathrooms", { valueAsNumber: true })}
                      placeholder="2"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    {...form.register("yearBuilt", { valueAsNumber: true })}
                    placeholder="2020"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="paymentPlan">Payment Plan</Label>
                  <Textarea
                    id="paymentPlan"
                    {...form.register("paymentPlan")}
                    placeholder="10% down, 90% on handover"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...form.register("description")} placeholder="Property description" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" {...form.register("notes")} placeholder="Internal notes" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Continue to Review</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function UploadStep({
  onUpload,
  onBack,
  isExtracting,
}: {
  onUpload: (file: File) => void
  onBack: () => void
  isExtracting: boolean
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = React.useState(false)

  const handleFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ]
    const validExtensions = [".pdf", ".xlsx", ".csv"]

    const isValidType = validTypes.includes(file.type)
    const isValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))

    if (!isValidType && !isValidExtension) {
      toast.error("Please upload a PDF, XLSX, or CSV file")
      return
    }

    onUpload(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Property File</CardTitle>
        <CardDescription>Upload a PDF, XLSX, or CSV file containing property information</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragActive(false)
          }}
          onDragOver={(e) => {
            e.preventDefault()
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
        >
          {isExtracting ? (
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Extracting property data...</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="mt-4">
                <p className="text-sm font-medium">Drag and drop your file here</p>
                <p className="mt-1 text-xs text-muted-foreground">or</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Supports PDF, XLSX, and CSV files</p>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isExtracting}>
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewStep({
  form,
  extractedData,
  uploadedFile,
  intakeSource,
  needsVerification,
  onNeedsVerificationChange,
  onConfirm,
  onBack,
}: {
  form: ReturnType<typeof useForm<PropertyFormData>>
  extractedData: Partial<PropertyFormData> | null
  uploadedFile: File | null
  intakeSource: PropertyIntakeSource
  needsVerification: boolean
  onNeedsVerificationChange: (value: boolean) => void
  onConfirm: () => void
  onBack: () => void
}) {
  const formData = form.watch()
  const readinessStatus = calculateReadinessStatus(
    {
      ...formData,
      source: {
        type: formData.sourceType!,
        name: formData.sourceName,
        intakeSource,
        ingestedAt: new Date().toISOString(),
        originalFile: uploadedFile?.name,
      },
    },
    needsVerification
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review & Confirm</CardTitle>
          <CardDescription>Review the property information before saving</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {uploadedFile && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Uploaded:</span>
                <span className="text-muted-foreground">{uploadedFile.name}</span>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Project/Building</Label>
                <p className="font-medium">{formData.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Area</Label>
                <p className="font-medium">{formData.area}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Unit Type</Label>
                <p className="font-medium">{formData.unitType}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Price</Label>
                <p className="font-medium">
                  {formData.currency} {formData.price?.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Source Type</Label>
                <p className="font-medium">{formData.sourceType}</p>
              </div>
              {formData.sourceName && (
                <div>
                  <Label className="text-muted-foreground">Source Name</Label>
                  <p className="font-medium">{formData.sourceName}</p>
                </div>
              )}
            </div>

            {formData.size && (
              <div>
                <Label className="text-muted-foreground">Size</Label>
                <p className="font-medium">{formData.size} sqft</p>
              </div>
            )}

            {formData.address && (
              <div>
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">{formData.address}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* AI Suggestions Placeholder */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">AI Suggestions</p>
                <p className="mt-1 text-xs text-blue-700">
                  All required fields are present. Property appears ready for memo generation.
                </p>
              </div>
            </div>
          </div>

          {/* Uncertainty Warnings Placeholder */}
          {needsVerification && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Needs Verification</p>
                  <p className="mt-1 text-xs text-amber-700">
                    This property has been marked as requiring manual verification before use.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="needsVerification"
              checked={needsVerification}
              onChange={(e) => onNeedsVerificationChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="needsVerification" className="cursor-pointer text-sm">
              Mark as needing verification
            </Label>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground">Readiness Status</Label>
                <p className="mt-1 font-medium">
                  <Badge
                    variant={
                      readinessStatus === "READY_FOR_MEMO"
                        ? "default"
                        : readinessStatus === "NEEDS_VERIFICATION"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {readinessStatus.replace(/_/g, " ")}
                  </Badge>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onConfirm}>
          Confirm & Save
        </Button>
      </div>
    </div>
  )
}

