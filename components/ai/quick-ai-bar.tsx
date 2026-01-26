"use client"

import * as React from "react"
import { Search, TrendingUp, Radar, FileText, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AIAgentId } from "@/lib/ai/agents"
import { useAIWidget } from "./ai-widget-provider"

const QUICK_AGENTS = [
  { id: "opportunity_finder" as AIAgentId, icon: Search, label: "Find Deals", iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
  { id: "portfolio_advisor" as AIAgentId, icon: TrendingUp, label: "Portfolio", iconColor: "text-blue-600", iconBg: "bg-blue-50" },
  { id: "market_intelligence" as AIAgentId, icon: Radar, label: "Market", iconColor: "text-violet-600", iconBg: "bg-violet-50" },
  { id: "memo_assistant" as AIAgentId, icon: FileText, label: "Memos", iconColor: "text-sky-600", iconBg: "bg-sky-50" },
]

interface QuickAIBarProps {
  className?: string
  variant?: "compact" | "full"
}

export function QuickAIBar({ className, variant = "full" }: QuickAIBarProps) {
  const { openAgent } = useAIWidget()
  const [query, setQuery] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      openAgent("opportunity_finder")
    }
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {QUICK_AGENTS.map((agent) => (
          <Button
            key={agent.id}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => openAgent(agent.id)}
          >
            <agent.icon className={cn("size-4", agent.iconColor)} />
            <span className="hidden sm:inline text-sm">{agent.label}</span>
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-sm p-4",
      className
    )}>
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-amber-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask AI anything about your investments..."
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-gray-300"
            />
          </div>
          <Button 
            type="submit"
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Search className="size-4 mr-2" />
            Search
          </Button>
        </form>

        {/* Quick Agent Buttons */}
        <div className="hidden lg:flex items-center gap-1 border-l border-gray-200 pl-4">
          {QUICK_AGENTS.map((agent) => (
            <motion.button
              key={agent.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openAgent(agent.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors",
                "min-w-[56px]"
              )}
            >
              <div className={cn("p-1.5 rounded-lg", agent.iconBg)}>
                <agent.icon className={cn("size-4", agent.iconColor)} />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{agent.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default QuickAIBar
