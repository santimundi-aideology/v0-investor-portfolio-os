"use client"

import * as React from "react"
import type { AIAgentId } from "@/lib/ai/agents"
import { FloatingAIHub } from "./floating-ai-hub"
import { AIAgentModal } from "./ai-agent-modal"
import { LiveMarketAlert } from "@/components/demo/live-market-alert"

interface AIWidgetContextValue {
  openAgent: (agentId: AIAgentId) => void
  closeAgent: () => void
  currentAgent: AIAgentId | null
  isOpen: boolean
}

const AIWidgetContext = React.createContext<AIWidgetContextValue | null>(null)

export function useAIWidget() {
  const context = React.useContext(AIWidgetContext)
  if (!context) {
    throw new Error("useAIWidget must be used within AIWidgetProvider")
  }
  return context
}

interface AIWidgetProviderProps {
  children: React.ReactNode
  investorId?: string
  showFloatingHub?: boolean
  showLiveAlerts?: boolean
  alertDelaySeconds?: number
}

export function AIWidgetProvider({
  children,
  investorId,
  showFloatingHub = true,
  showLiveAlerts = true,
  alertDelaySeconds = 60,
}: AIWidgetProviderProps) {
  const [currentAgent, setCurrentAgent] = React.useState<AIAgentId | null>(null)
  const [isOpen, setIsOpen] = React.useState(false)
  const [notificationCount, setNotificationCount] = React.useState(0)

  // Handle custom event from floating hub
  React.useEffect(() => {
    const handleOpenAgent = (e: CustomEvent<{ agentId: AIAgentId }>) => {
      setCurrentAgent(e.detail.agentId)
      setIsOpen(true)
    }

    window.addEventListener("open-ai-agent", handleOpenAgent as EventListener)
    return () => {
      window.removeEventListener("open-ai-agent", handleOpenAgent as EventListener)
    }
  }, [])

  // Simulate notifications for demo
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setNotificationCount(2)
    }, 30000) // Show notification badge after 30s

    return () => clearTimeout(timer)
  }, [])

  const openAgent = React.useCallback((agentId: AIAgentId) => {
    setCurrentAgent(agentId)
    setIsOpen(true)
    setNotificationCount(0) // Clear notifications when opening
  }, [])

  const closeAgent = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = React.useMemo(
    () => ({
      openAgent,
      closeAgent,
      currentAgent,
      isOpen,
    }),
    [openAgent, closeAgent, currentAgent, isOpen]
  )

  return (
    <AIWidgetContext.Provider value={value}>
      {children}

      {/* Floating AI Hub */}
      {showFloatingHub && (
        <FloatingAIHub
          notificationCount={notificationCount}
          onAgentSelect={openAgent}
        />
      )}

      {/* AI Agent Modal */}
      {currentAgent && (
        <AIAgentModal
          isOpen={isOpen}
          onClose={closeAgent}
          agentId={currentAgent}
          investorId={investorId}
        />
      )}

      {/* Live Market Alerts */}
      {showLiveAlerts && (
        <LiveMarketAlert autoShowAfterSeconds={alertDelaySeconds} />
      )}
    </AIWidgetContext.Provider>
  )
}

export default AIWidgetProvider
