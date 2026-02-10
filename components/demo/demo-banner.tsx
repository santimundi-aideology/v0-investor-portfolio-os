"use client"

import { useState, useCallback } from "react"
import { ChevronDown, ChevronUp, RotateCcw, Eye, LogOut, User, Building2, Shield, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useApp } from "@/components/providers/app-provider"
import type { PersonaId } from "@/lib/personas"

type DemoPersona = {
  id: PersonaId
  label: string
  shortLabel: string
  icon: React.ReactNode
  description: string
  route: string
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "realtor-primary",
    label: "Realtor View",
    shortLabel: "Realtor",
    icon: <Building2 className="size-4" />,
    description: "Full CRM access, manage investors & properties",
    route: "/dashboard",
  },
  {
    id: "investor-external",
    label: "Investor View",
    shortLabel: "Investor",
    icon: <User className="size-4" />,
    description: "External portal, review memos & portfolio",
    route: "/investor/dashboard",
  },
  {
    id: "owner-admin",
    label: "Admin View",
    shortLabel: "Admin",
    icon: <Shield className="size-4" />,
    description: "Organization settings, team & audit",
    route: "/team",
  },
]

export function DemoBanner() {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const router = useRouter()
  const { personaId, setPersonaId, setDemoModeActive } = useApp()

  const handleExitDemo = useCallback(() => {
    setDemoModeActive(false)
    router.push("/dashboard")
  }, [setDemoModeActive, router])

  const currentPersona = DEMO_PERSONAS.find((p) => p.id === personaId) ?? DEMO_PERSONAS[0]

  const handlePersonaChange = useCallback(
    (persona: DemoPersona) => {
      setPersonaId(persona.id)
      router.push(persona.route)
    },
    [setPersonaId, router]
  )

  const handleReset = useCallback(async () => {
    if (isResetting) return
    
    setIsResetting(true)
    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Demo reset failed:", error)
        // Could add toast notification here
      } else {
        // Refresh the page to show reset data
        router.refresh()
      }
    } catch (error) {
      console.error("Demo reset error:", error)
    } finally {
      setIsResetting(false)
    }
  }, [isResetting, router])

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev)
  }, [])

  // Minimized state - just a small floating indicator
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100]">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleMinimize}
          className="gap-2 bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-lg"
        >
          <Eye className="size-4" />
          <span className="text-xs font-semibold">DEMO</span>
          <ChevronUp className="size-3" />
        </Button>
      </div>
    )
  }

  // Full banner
  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-3 py-2 shadow-lg backdrop-blur-sm">
        {/* Demo Mode Indicator */}
        <div className="flex items-center gap-2 pr-2 border-r border-amber-200">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-40" />
            <div className="relative size-2 rounded-full bg-amber-500" />
          </div>
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            Demo Mode
          </span>
        </div>

        {/* Persona Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-amber-900 hover:bg-amber-100/50 h-8"
            >
              {currentPersona.icon}
              <span className="text-xs font-medium">{currentPersona.shortLabel}</span>
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs text-gray-500">
              Switch Persona
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEMO_PERSONAS.map((persona) => (
              <DropdownMenuItem
                key={persona.id}
                onClick={() => handlePersonaChange(persona)}
                className="flex flex-col items-start gap-0.5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  {persona.icon}
                  <span className="font-medium">{persona.label}</span>
                  {persona.id === personaId && (
                    <Badge variant="accent" className="text-[10px] px-1.5 py-0.5">
                      Active
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500 pl-6">
                  {persona.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-4 w-px bg-amber-200" />

        {/* Reset Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
          className="gap-1.5 text-amber-900 hover:bg-amber-100/50 h-8 px-2"
        >
          {isResetting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          <span className="text-xs">Reset</span>
        </Button>

        {/* Exit Demo Mode Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExitDemo}
          className="gap-1.5 text-amber-900 hover:bg-red-100/50 hover:text-red-700 h-8 px-2"
        >
          <LogOut className="size-3.5" />
          <span className="text-xs">Exit</span>
        </Button>

        {/* Minimize Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleMinimize}
          className="size-7 text-amber-700 hover:bg-amber-100/50"
        >
          <ChevronDown className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Wrapper component that renders DemoBanner when demo mode is active.
 * Shows based on either:
 * 1. Environment variable NEXT_PUBLIC_DEMO_MODE=true (static demo deployments)
 * 2. Runtime demoModeActive state (super_admin toggled demo mode)
 */
export function DemoBannerWrapper() {
  const { demoModeActive } = useApp()
  const isEnvDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  
  if (!isEnvDemo && !demoModeActive) {
    return null
  }
  
  return <DemoBanner />
}
