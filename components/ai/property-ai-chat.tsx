"use client"

import * as React from "react"
import { Send, Loader2, Sparkles, MessageSquare, Building2, X, Maximize2, Minimize2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { playMessageSound } from "@/lib/sounds"

type Message = { role: "user" | "assistant"; content: string }

interface PropertyContext {
  title: string
  area: string
  price: number
  pricePerSqft?: number | null
  size?: number | null
  bedrooms?: number
  propertyType: string
  description?: string | null
}

interface EvaluationContext {
  overallScore: number
  recommendation: string
  headline: string
  reasoning: string
  keyStrengths: string[]
  considerations: string[]
}

interface PropertyAIChatProps {
  property: PropertyContext
  evaluation?: EvaluationContext | null
  className?: string
  variant?: "compact" | "expanded"
  onExpandChange?: (expanded: boolean) => void
}

const QUICK_QUESTIONS = [
  "What are the main risks?",
  "Why this price vs market?",
  "What's the exit strategy?",
  "Is this a good investment?",
]

export function PropertyAIChat({
  property,
  evaluation,
  className,
  variant = "compact",
  onExpandChange,
}: PropertyAIChatProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isExpanded, setIsExpanded] = React.useState(variant === "expanded")
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onExpandChange?.(newState)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Build context for the AI
      const propertyContext = `
Property: ${property.title}
Area: ${property.area}
Type: ${property.propertyType}
Price: AED ${property.price.toLocaleString()}
${property.size ? `Size: ${property.size} sqft` : ""}
${property.pricePerSqft ? `Price/sqft: AED ${property.pricePerSqft.toLocaleString()}` : ""}
${property.bedrooms ? `Bedrooms: ${property.bedrooms}` : ""}
${property.description ? `Description: ${property.description.slice(0, 200)}` : ""}
`.trim()

      const evaluationContext = evaluation ? `
AI Evaluation Score: ${evaluation.overallScore}/100
Recommendation: ${evaluation.recommendation}
Headline: ${evaluation.headline}
Reasoning: ${evaluation.reasoning}
Strengths: ${evaluation.keyStrengths.join(", ")}
Considerations: ${evaluation.considerations.join(", ")}
`.trim() : ""

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "real_estate_advisor",
          messages: [
            {
              role: "user",
              content: `Context about the property I'm analyzing:\n\n${propertyContext}\n\n${evaluationContext}\n\nMy question: ${text}`,
            },
          ],
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
        { role: "assistant", content: "Sorry, I couldn't process your request. Please try again." },
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

  // Compact collapsed state
  if (!isExpanded) {
    return (
      <Card className={cn("border-emerald-100 bg-emerald-50/50", className)}>
        <CardContent className="p-4">
          <button
            onClick={toggleExpanded}
            className="w-full flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <MessageSquare className="size-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm text-gray-900">Ask AI about this property</p>
                <p className="text-xs text-gray-500">Get instant answers and insights</p>
              </div>
            </div>
            <Maximize2 className="size-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-emerald-100 overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-emerald-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100">
              <Building2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-sm">Property AI Assistant</CardTitle>
              <CardDescription className="text-xs">Ask questions about this property</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-600"
            onClick={toggleExpanded}
          >
            <Minimize2 className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages */}
        <ScrollArea className="h-[280px]">
          <ScrollAreaViewport className="h-full p-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="text-center py-4">
                  <Sparkles className="size-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">
                    Ask me anything about<br />
                    <span className="font-medium text-gray-700">{property.title}</span>
                  </p>
                </div>

                {/* Quick questions */}
                <div className="space-y-1.5">
                  {QUICK_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      onClick={() => sendMessage(question)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-gray-600"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs",
                      msg.role === "user"
                        ? "bg-gray-900 text-white ml-6"
                        : "bg-gray-100 text-gray-800 mr-4"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-xs prose-gray max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="bg-gray-100 rounded-lg px-3 py-2 mr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-xs text-gray-500">Analyzing...</span>
                    </div>
                  </div>
                )}
                {/* Invisible element at the end for scrolling */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 bg-gray-50/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this property..."
              disabled={isLoading}
              className="flex-1 h-8 text-xs bg-white border-gray-200"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              size="sm"
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PropertyAIChat
