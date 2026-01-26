"use client"

import * as React from "react"
import { X, Send, Loader2, Sparkles, Search, TrendingUp, Radar, FileText, Building2, Bot } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollAreaViewport } from "@/components/ui/scroll-area"
import type { AIAgentId } from "@/lib/ai/agents"
import { playMessageSound } from "@/lib/sounds"

type Message = { role: "user" | "assistant"; content: string }

const AGENT_CONFIG: Record<AIAgentId, {
  name: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  accentColor: string
  placeholder: string
  suggestions: string[]
}> = {
  opportunity_finder: {
    name: "Opportunity Finder",
    icon: Search,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    accentColor: "bg-emerald-600 hover:bg-emerald-700",
    placeholder: "Find investment opportunities...",
    suggestions: [
      "Find 8%+ yield properties",
      "Show underpriced listings in Marina",
      "What opportunities match my mandate?",
    ],
  },
  portfolio_advisor: {
    name: "Portfolio Advisor",
    icon: TrendingUp,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    accentColor: "bg-blue-600 hover:bg-blue-700",
    placeholder: "Ask about your portfolio...",
    suggestions: [
      "How is my portfolio performing?",
      "Should I rebalance?",
      "What's my concentration risk?",
    ],
  },
  market_intelligence: {
    name: "Market Intelligence",
    icon: Radar,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    accentColor: "bg-violet-600 hover:bg-violet-700",
    placeholder: "Ask about market trends...",
    suggestions: [
      "What are the latest market signals?",
      "How is Marina performing?",
      "Are prices going up or down?",
    ],
  },
  memo_assistant: {
    name: "Memo Assistant",
    icon: FileText,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50",
    accentColor: "bg-sky-600 hover:bg-sky-700",
    placeholder: "Ask about investment memos...",
    suggestions: [
      "Explain the assumptions",
      "What are the risks?",
      "How does this compare to my mandate?",
    ],
  },
  real_estate_advisor: {
    name: "Real Estate Advisor",
    icon: Building2,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    accentColor: "bg-teal-600 hover:bg-teal-700",
    placeholder: "Ask about properties...",
    suggestions: [
      "Analyze this property for me",
      "What's a fair price?",
      "Should I invest here?",
    ],
  },
}

interface AIAgentModalProps {
  isOpen: boolean
  onClose: () => void
  agentId: AIAgentId
  investorId?: string
  memoId?: string
  propertyId?: string
}

export function AIAgentModal({
  isOpen,
  onClose,
  agentId,
  investorId,
  memoId,
  propertyId,
}: AIAgentModalProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  
  const config = AGENT_CONFIG[agentId]
  const Icon = config.icon

  // Reset messages when agent changes
  React.useEffect(() => {
    setMessages([])
  }, [agentId])

  // Auto-scroll
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: [...messages, userMessage],
          scopedInvestorId: investorId,
          memoId,
          propertyId,
        }),
      })

      const data = await response.json()

      if (data.message?.content) {
        playMessageSound()
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message.content },
        ])
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your request." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[480px] sm:h-[580px] z-50"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      config.iconBg
                    )}>
                      <Icon className={cn("size-5", config.iconColor)} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{config.name}</h2>
                      <p className="text-xs text-gray-500">AI Assistant</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 bg-white">
                <ScrollAreaViewport ref={scrollRef} className="h-full p-5">
                  {messages.length === 0 ? (
                    <div className="space-y-6 py-6">
                      <div className="text-center">
                        <div className={cn(
                          "inline-flex p-4 rounded-2xl mb-4",
                          config.iconBg
                        )}>
                          <Icon className={cn("size-8", config.iconColor)} />
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          How can I help you?
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Ask me anything or try a suggestion below
                        </p>
                      </div>

                      <div className="space-y-2">
                        {config.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => sendMessage(suggestion)}
                            className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm text-gray-700 group"
                          >
                            <Sparkles className="size-4 inline mr-2 text-amber-500 group-hover:text-amber-600" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "rounded-2xl px-4 py-3 max-w-[85%]",
                            msg.role === "user"
                              ? "bg-gray-900 text-white ml-auto"
                              : "bg-gray-100 text-gray-800"
                          )}
                        >
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm prose-gray max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </motion.div>
                      ))}
                      {isLoading && (
                        <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-[85%]">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                            </div>
                            <span className="text-sm text-gray-500">
                              Thinking...
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollAreaViewport>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={config.placeholder}
                    disabled={isLoading}
                    className="flex-1 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200"
                  />
                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className={cn(
                      "text-white",
                      config.accentColor
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AIAgentModal
