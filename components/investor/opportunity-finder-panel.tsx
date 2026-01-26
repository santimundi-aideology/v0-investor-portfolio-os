"use client"

import * as React from "react"
import { Search, Sparkles, TrendingUp, MapPin, Building2, Send, Loader2, Volume2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollAreaViewport } from "@/components/ui/scroll-area"
import { playMessageSound } from "@/lib/sounds"

type Message = { role: "user" | "assistant"; content: string; isTyping?: boolean }

// Typing animation component for markdown
function TypingMarkdown({ content }: { content: string }) {
  const [displayedContent, setDisplayedContent] = React.useState("")
  const [isComplete, setIsComplete] = React.useState(false)

  React.useEffect(() => {
    setDisplayedContent("")
    setIsComplete(false)
    
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        // Add characters in chunks for faster rendering
        const chunkSize = Math.min(5, content.length - currentIndex)
        setDisplayedContent(content.slice(0, currentIndex + chunkSize))
        currentIndex += chunkSize
      } else {
        clearInterval(interval)
        setIsComplete(true)
      }
    }, 8)

    return () => clearInterval(interval)
  }, [content])

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {displayedContent}
      </ReactMarkdown>
      {!isComplete && (
        <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-0.5 rounded-sm" />
      )}
    </>
  )
}

const SUGGESTED_QUERIES = [
  { text: "Find 8%+ yield properties", icon: TrendingUp },
  { text: "What opportunities match my mandate?", icon: Sparkles },
  { text: "Show underpriced properties in Marina", icon: MapPin },
  { text: "Compare new listings to market prices", icon: Building2 },
]

const QUICK_FILTERS = [
  { label: "High Yield (8%+)", query: "Find properties with 8% or higher yield" },
  { label: "Below Market", query: "Show me underpriced properties compared to DLD data" },
  { label: "Marina", query: "Find opportunities in Dubai Marina" },
  { label: "Commercial", query: "Show commercial property opportunities" },
]

interface OpportunityFinderPanelProps {
  investorId?: string
  className?: string
  defaultExpanded?: boolean
}

export function OpportunityFinderPanel({
  investorId,
  className,
  defaultExpanded = true,
}: OpportunityFinderPanelProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
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
          agentId: "opportunity_finder",
          messages: [...messages, userMessage],
          scopedInvestorId: investorId,
        }),
      })

      const data = await response.json()

      if (data.message?.content) {
        // Play sound effect
        playMessageSound()
        
        // Add message with typing flag
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message.content,
            isTyping: true,
          },
        ])
        
        // Remove typing flag after animation
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, isTyping: false } : m
            )
          )
        }, Math.min(data.message.content.length * 10, 3000))
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I encountered an error: ${data.error}`,
          },
        ])
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process your request. Please try again.",
        },
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
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-950/30 dark:to-amber-950/30 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-600 to-amber-500 shadow-md">
              <Search className="size-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Opportunity Finder</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                AI-powered search with DLD prices & market news
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            AI Beta
          </Badge>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <ScrollAreaViewport ref={scrollRef} className="h-[400px] p-4">
          {messages.length === 0 ? (
            <div className="space-y-6">
              {/* Welcome message */}
              <div className="text-center space-y-2 py-4">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-green-100 to-amber-100 dark:from-green-900/30 dark:to-amber-900/30">
                  <Sparkles className="size-6 text-amber-600" />
                </div>
                <h3 className="font-medium">Find Your Next Investment</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  Ask me to find opportunities using natural language. I&apos;ll search with DLD data, market news, and AI scoring.
                </p>
              </div>

              {/* Quick filters */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quick Filters
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FILTERS.map((filter) => (
                    <Button
                      key={filter.label}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => sendMessage(filter.query)}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Suggested queries */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Try Asking
                </p>
                <div className="grid gap-2">
                  {SUGGESTED_QUERIES.map((query) => (
                    <Button
                      key={query.text}
                      variant="ghost"
                      className="justify-start text-left h-auto py-2.5 px-3 hover:bg-green-50 dark:hover:bg-green-950/30"
                      onClick={() => sendMessage(query.text)}
                    >
                      <query.icon className="size-4 mr-2.5 text-green-600 shrink-0" />
                      <span className="text-sm">{query.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl p-3 transition-all duration-300",
                    msg.role === "user"
                      ? "bg-green-500 text-white ml-8"
                      : "bg-gray-100 mr-4",
                    msg.isTyping && "animate-fade-in"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-base prose-headings:font-semibold prose-p:text-sm prose-li:text-sm prose-strong:text-foreground">
                      {msg.isTyping ? (
                        <TypingMarkdown content={msg.content} />
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="bg-gray-100 rounded-xl p-4 mr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-sm text-gray-500">
                      Searching opportunities...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollAreaViewport>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find opportunities..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-green-600 to-amber-500 hover:from-green-700 hover:to-amber-600"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        {messages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-gray-500 hover:text-gray-900"
              onClick={() => sendMessage("Show more details")}
            >
              More details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-gray-500 hover:text-gray-900"
              onClick={() => sendMessage("What's the market news?")}
            >
              Market news
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-gray-500 hover:text-gray-900"
              onClick={() => {
                setMessages([])
              }}
            >
              Clear chat
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

export default OpportunityFinderPanel
