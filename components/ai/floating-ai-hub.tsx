"use client"

import * as React from "react"
import { 
  Bot, 
  X, 
  Search, 
  TrendingUp, 
  FileText, 
  Radar, 
  Building2,
  Sparkles,
  ChevronRight,
  Zap,
  Bell,
  Calculator,
  Users,
  Shield,
  ClipboardCheck,
  BarChart3,
  Home,
  LineChart
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { AIAgentId } from "@/lib/ai/agents"

// Agent configurations with cleaner color scheme
const AI_AGENTS = [
  {
    id: "opportunity_finder" as AIAgentId,
    name: "Opportunity Finder",
    description: "Find investment opportunities with AI",
    icon: Search,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    category: "core",
  },
  {
    id: "portfolio_advisor" as AIAgentId,
    name: "Portfolio Advisor",
    description: "Optimize your investment portfolio",
    icon: TrendingUp,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    category: "core",
  },
  {
    id: "market_intelligence" as AIAgentId,
    name: "Market Intelligence",
    description: "Analyze market signals & trends",
    icon: Radar,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    category: "core",
  },
  {
    id: "valuation_sense_check" as AIAgentId,
    name: "Valuation Check",
    description: "Quick pricing sanity checks",
    icon: Calculator,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    category: "deal",
  },
  {
    id: "investor_matching" as AIAgentId,
    name: "Investor Matching",
    description: "Match properties to investors",
    icon: Users,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    category: "deal",
  },
  {
    id: "risk_assessment" as AIAgentId,
    name: "Risk Assessment",
    description: "Comprehensive risk analysis",
    icon: Shield,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    category: "deal",
  },
  {
    id: "cma_analyst" as AIAgentId,
    name: "CMA Analyst",
    description: "Comparative market analysis",
    icon: BarChart3,
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-50",
    category: "analysis",
  },
  {
    id: "due_diligence" as AIAgentId,
    name: "Due Diligence",
    description: "DD checklists & verification",
    icon: ClipboardCheck,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    category: "deal",
  },
  {
    id: "rental_optimizer" as AIAgentId,
    name: "Rental Optimizer",
    description: "Maximize rental income",
    icon: Home,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    category: "portfolio",
  },
  {
    id: "market_forecaster" as AIAgentId,
    name: "Market Forecaster",
    description: "Price predictions & trends",
    icon: LineChart,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    category: "analysis",
  },
  {
    id: "memo_assistant" as AIAgentId,
    name: "Memo Assistant",
    description: "Understand investment memos",
    icon: FileText,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50",
    category: "core",
  },
  {
    id: "real_estate_advisor" as AIAgentId,
    name: "Real Estate Advisor",
    description: "General property advice & analysis",
    icon: Building2,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    category: "core",
  },
]

interface FloatingAIHubProps {
  defaultOpen?: boolean
  position?: "bottom-right" | "bottom-left"
  onAgentSelect?: (agentId: AIAgentId) => void
  notificationCount?: number
  className?: string
}

export function FloatingAIHub({
  defaultOpen = false,
  position = "bottom-right",
  onAgentSelect,
  notificationCount = 0,
  className,
}: FloatingAIHubProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const [selectedAgent, setSelectedAgent] = React.useState<AIAgentId | null>(null)

  const handleAgentClick = (agentId: AIAgentId) => {
    setSelectedAgent(agentId)
    setIsOpen(false)
    onAgentSelect?.(agentId)
    // Dispatch custom event for global listeners
    window.dispatchEvent(new CustomEvent("open-ai-agent", { detail: { agentId } }))
  }

  const positionClasses = position === "bottom-right" 
    ? "right-6 bottom-6" 
    : "left-6 bottom-6"

  return (
    <div className={cn("fixed z-50", positionClasses, className)}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-20 right-0 w-80"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50">
                      <Sparkles className="size-4 text-emerald-600" />
                    </div>
                    <span className="font-semibold text-gray-900">AI Assistants</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  Choose an AI to help you
                </p>
              </div>

              {/* Agent List */}
              <div className="p-2 max-h-[360px] overflow-y-auto">
                {AI_AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentClick(agent.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                      "hover:bg-gray-50 group text-left",
                      selectedAgent === agent.id && "bg-gray-50"
                    )}
                  >
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      agent.iconBg
                    )}>
                      <agent.icon className={cn("size-5", agent.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {agent.description}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="border-t border-gray-100 p-3 bg-gray-50/50">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => handleAgentClick("opportunity_finder")}
                  >
                    <Zap className="size-3 mr-1 text-amber-500" />
                    Find Deals
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => handleAgentClick("market_intelligence")}
                  >
                    <Bell className="size-3 mr-1 text-violet-500" />
                    Market Alerts
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-gray-900 text-white",
          "shadow-lg shadow-gray-900/20",
          "transition-all hover:bg-gray-800",
          "hover:shadow-xl hover:shadow-gray-900/25"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="size-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Bot className="size-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Badge */}
        {notificationCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}

        {/* Subtle pulse ring */}
        <span className="absolute inset-0 rounded-full bg-gray-600 animate-ping opacity-10" />
      </motion.button>
    </div>
  )
}

export default FloatingAIHub
