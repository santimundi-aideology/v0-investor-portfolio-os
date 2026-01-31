"use client"

import * as React from "react"
import { 
  Calculator, 
  Users, 
  Shield, 
  ClipboardCheck, 
  BarChart3, 
  Home, 
  LineChart,
  Search,
  TrendingUp,
  Radar,
  FileText,
  Building2,
  Sparkles,
  type LucideIcon
} from "lucide-react"

import type { AIAgentId } from "@/lib/ai/agents"
import { cn } from "@/lib/utils"
import { AIBankerChatInterface } from "@/components/ai/ai-banker-chat-interface"

// Agent icon and color mapping
const AGENT_STYLES: Record<AIAgentId, {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  accentColor: string
}> = {
  opportunity_finder: {
    icon: Search,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    accentColor: "hover:border-emerald-200",
  },
  portfolio_advisor: {
    icon: TrendingUp,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    accentColor: "hover:border-blue-200",
  },
  market_intelligence: {
    icon: Radar,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    accentColor: "hover:border-violet-200",
  },
  memo_assistant: {
    icon: FileText,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50",
    accentColor: "hover:border-sky-200",
  },
  real_estate_advisor: {
    icon: Building2,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    accentColor: "hover:border-teal-200",
  },
  valuation_sense_check: {
    icon: Calculator,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    accentColor: "hover:border-orange-200",
  },
  investor_matching: {
    icon: Users,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    accentColor: "hover:border-indigo-200",
  },
  risk_assessment: {
    icon: Shield,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    accentColor: "hover:border-red-200",
  },
  due_diligence: {
    icon: ClipboardCheck,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    accentColor: "hover:border-amber-200",
  },
  cma_analyst: {
    icon: BarChart3,
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-50",
    accentColor: "hover:border-cyan-200",
  },
  rental_optimizer: {
    icon: Home,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    accentColor: "hover:border-green-200",
  },
  market_forecaster: {
    icon: LineChart,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    accentColor: "hover:border-purple-200",
  },
}

interface ContextualAICardProps {
  agentId: AIAgentId
  title: string
  description: string
  suggestions: string[]
  /** Optional scoped investor ID for context */
  investorId?: string
  /** Optional property ID for context */
  propertyId?: string
  /** Optional memo ID for context */
  memoId?: string
  /** Additional CSS classes */
  className?: string
}

export function ContextualAICard({
  agentId,
  title,
  description,
  suggestions,
  investorId,
  propertyId,
  memoId,
  className,
}: ContextualAICardProps) {
  const [chatOpen, setChatOpen] = React.useState(false)

  const style = AGENT_STYLES[agentId]
  const Icon = style.icon

  const handleOpenChat = () => {
    setChatOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50/50 to-white p-5 transition-all",
          style.accentColor,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={cn("p-2.5 rounded-xl", style.iconBg)}>
            <Icon className={cn("size-5", style.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
          <button
            onClick={handleOpenChat}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            <Sparkles className="size-3" />
            Ask
          </button>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 3).map((suggestion) => (
            <button
              key={suggestion}
              onClick={handleOpenChat}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all truncate max-w-full"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <AIBankerChatInterface
        open={chatOpen}
        onOpenChange={setChatOpen}
        agentId={agentId}
        title={title}
        description={description}
        suggestedQuestions={suggestions}
        scopedInvestorId={investorId}
        propertyId={propertyId}
      />
    </>
  )
}

export default ContextualAICard
