"use client"

import * as React from "react"
import { ChevronDown, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CounterfactualCard } from "./counterfactual-card"
import type { Counterfactual, RecommendationBundle } from "@/lib/types"
import { mockProperties } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CounterfactualsPanelProps {
  bundle: RecommendationBundle
  onAddCounterfactual?: (propertyId: string) => void
}

export function CounterfactualsPanel({ bundle, onAddCounterfactual }: CounterfactualsPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [pendingAdd, setPendingAdd] = React.useState<string | null>(null)

  const counterfactuals = bundle.counterfactuals || []

  if (counterfactuals.length === 0) {
    return null
  }

  const handleAddAnyway = (propertyId: string) => {
    setPendingAdd(propertyId)
  }

  const confirmAdd = () => {
    if (pendingAdd && onAddCounterfactual) {
      onAddCounterfactual(pendingAdd)
      setPendingAdd(null)
    }
  }

  const cancelAdd = () => {
    setPendingAdd(null)
  }

  const pendingCounterfactual = pendingAdd
    ? counterfactuals.find((c) => c.propertyId === pendingAdd)
    : null

  return (
    <>
      <Card className="border-amber-200">
        <CardHeader>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Considered but not recommended</CardTitle>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">
                {counterfactuals.length}
              </Badge>
            </div>
            <ChevronDown
              className={cn("h-5 w-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
            />
          </button>
          <CardDescription className="pt-1">
            Strong candidates the system evaluated but excluded — with reasons.
          </CardDescription>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-3">
            {counterfactuals.map((counterfactual) => {
              const property = mockProperties.find((p) => p.id === counterfactual.propertyId)
              if (!property) return null

              return (
                <CounterfactualCard
                  key={counterfactual.propertyId}
                  counterfactual={counterfactual}
                  propertyTitle={property.title}
                  propertyPrice={property.price}
                  propertyArea={property.area}
                  propertyType={property.type}
                  readinessStatus={property.readinessStatus}
                  onAddAnyway={onAddCounterfactual ? handleAddAnyway : undefined}
                />
              )
            })}
          </CardContent>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingAdd} onOpenChange={(open) => !open && cancelAdd()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Add excluded property?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCounterfactual && (
                <>
                  <p className="mb-2">
                    This property was excluded because: <strong>{pendingCounterfactual.reasonLabels[0]}</strong>
                  </p>
                  <p>Add to recommendation anyway?</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAdd}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAdd} className="bg-amber-600 hover:bg-amber-700">
              Add anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

