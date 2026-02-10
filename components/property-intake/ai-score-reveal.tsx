"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Target,
  TrendingUp,
  Briefcase,
  Shield,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ScoreFactor {
  key: string
  label: string
  score: number
  maxScore: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  barColor: string
  description: string
}

interface AIScoreRevealProps {
  overallScore: number
  factors: {
    mandateFit: number
    marketTiming: number
    portfolioFit: number
    riskAlignment: number
  }
  recommendation: "strong_buy" | "buy" | "hold" | "pass"
  headline: string
  onComplete?: () => void
}

const REVEAL_DELAY = 600
const INITIAL_DELAY = 300

function getRecommendationStyle(rec: string) {
  switch (rec) {
    case "strong_buy":
      return { bg: "bg-emerald-500", text: "Strong Buy", emoji: "rocket" }
    case "buy":
      return { bg: "bg-green-500", text: "Buy", emoji: "check" }
    case "hold":
      return { bg: "bg-amber-500", text: "Hold", emoji: "pause" }
    case "pass":
      return { bg: "bg-red-500", text: "Pass", emoji: "x" }
    default:
      return { bg: "bg-gray-500", text: rec, emoji: "minus" }
  }
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-emerald-600"
  if (score >= 50) return "text-amber-600"
  return "text-red-600"
}

function getScoreRingColor(score: number) {
  if (score >= 75) return "#10b981"
  if (score >= 50) return "#f59e0b"
  return "#ef4444"
}

function getScoreBarGradient(score: number) {
  if (score >= 75) return "from-emerald-400 to-emerald-500"
  if (score >= 50) return "from-amber-400 to-amber-500"
  return "from-red-400 to-red-500"
}

function CountUp({ target, delay, suffix = "" }: { target: number; delay: number; suffix?: string }) {
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1000
      const steps = 30
      const increment = target / steps
      let current = 0
      const interval = setInterval(() => {
        current += increment
        if (current >= target) {
          setValue(target)
          clearInterval(interval)
        } else {
          setValue(Math.round(current))
        }
      }, duration / steps)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, delay])

  return <span>{value}{suffix}</span>
}

export function AIScoreReveal({
  overallScore,
  factors,
  recommendation,
  headline,
  onComplete,
}: AIScoreRevealProps) {
  const [phase, setPhase] = React.useState<"analyzing" | "factors" | "overall" | "verdict">("analyzing")
  const [revealedCount, setRevealedCount] = React.useState(0)

  const scoreFactors: ScoreFactor[] = [
    {
      key: "mandateFit",
      label: "Mandate Fit",
      score: factors.mandateFit,
      maxScore: 25,
      icon: Target,
      color: "text-blue-600",
      barColor: "bg-blue-500",
      description: "Investor mandate alignment",
    },
    {
      key: "marketTiming",
      label: "Market Timing",
      score: factors.marketTiming,
      maxScore: 25,
      icon: TrendingUp,
      color: "text-emerald-600",
      barColor: "bg-emerald-500",
      description: "Market conditions favorability",
    },
    {
      key: "portfolioFit",
      label: "Portfolio Fit",
      score: factors.portfolioFit,
      maxScore: 25,
      icon: Briefcase,
      color: "text-violet-600",
      barColor: "bg-violet-500",
      description: "Portfolio complementarity",
    },
    {
      key: "riskAlignment",
      label: "Risk Alignment",
      score: factors.riskAlignment,
      maxScore: 25,
      icon: Shield,
      color: "text-amber-600",
      barColor: "bg-amber-500",
      description: "Risk-return profile match",
    },
  ]

  // Phase transitions
  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase("factors"), INITIAL_DELAY + 1500)
    return () => clearTimeout(t1)
  }, [])

  React.useEffect(() => {
    if (phase !== "factors") return
    const timers: NodeJS.Timeout[] = []
    for (let i = 0; i < scoreFactors.length; i++) {
      timers.push(setTimeout(() => setRevealedCount(i + 1), (i + 1) * REVEAL_DELAY))
    }
    timers.push(setTimeout(() => setPhase("overall"), (scoreFactors.length + 1) * REVEAL_DELAY + 500))
    return () => timers.forEach(clearTimeout)
  }, [phase])

  React.useEffect(() => {
    if (phase !== "overall") return
    const t = setTimeout(() => {
      setPhase("verdict")
      onComplete?.()
    }, 2000)
    return () => clearTimeout(t)
  }, [phase, onComplete])

  const recStyle = getRecommendationStyle(recommendation)

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: phase === "analyzing" ? 360 : 0 }}
              transition={{ duration: 2, repeat: phase === "analyzing" ? Infinity : 0, ease: "linear" }}
            >
              <Sparkles className="h-5 w-5 text-green-400" />
            </motion.div>
            <div>
              <h3 className="font-semibold text-white">AI Investment Analysis</h3>
              <p className="text-xs text-gray-400">
                {phase === "analyzing" && "Analyzing property against investment criteria..."}
                {phase === "factors" && "Evaluating investment factors..."}
                {phase === "overall" && "Computing overall score..."}
                {phase === "verdict" && "Analysis complete"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Analyzing Phase */}
          <AnimatePresence>
            {phase === "analyzing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center py-10"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <motion.div
                      className="w-14 h-14 rounded-full border-[3px] border-green-200"
                      animate={{ borderColor: ["#bbf7d0", "#22c55e", "#bbf7d0"] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 w-14 h-14 rounded-full border-[3px] border-t-green-500 border-r-transparent border-b-transparent border-l-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-900 text-sm">Processing with AI</p>
                    <p className="text-xs text-gray-500 mt-0.5">Evaluating 4 investment dimensions...</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Factor Rows */}
          {(phase === "factors" || phase === "overall" || phase === "verdict") && (
            <div className="space-y-3">
              {scoreFactors.map((factor, i) => {
                const isRevealed = i < revealedCount
                const Icon = factor.icon
                const delayMs = (i * REVEAL_DELAY) / 1000
                const pct = (factor.score / factor.maxScore) * 100

                return (
                  <motion.div
                    key={factor.key}
                    initial={{ opacity: 0, x: -12 }}
                    animate={isRevealed ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
                          factor.barColor, "bg-opacity-10"
                        )}>
                          <Icon className={cn("h-4 w-4", factor.color)} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-gray-900">{factor.label}</span>
                            <span className="font-bold text-sm text-gray-900 tabular-nums ml-2 shrink-0">
                              {isRevealed ? (
                                <><CountUp target={factor.score} delay={delayMs * 1000} /><span className="text-gray-400 font-normal">/{factor.maxScore}</span></>
                              ) : (
                                <span className="text-gray-300">&mdash;</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div
                                className={cn("h-full rounded-full", factor.barColor)}
                                initial={{ width: 0 }}
                                animate={isRevealed ? { width: `${pct}%` } : { width: 0 }}
                                transition={{ duration: 0.8, delay: delayMs + 0.2, ease: "easeOut" }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium tabular-nums w-7 text-right shrink-0">
                              {isRevealed ? `${Math.round(pct)}%` : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Overall Score */}
          {(phase === "overall" || phase === "verdict") && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Overall Investment Score</p>
                <div className="flex items-center gap-5">
                  {/* Score number */}
                  <div className="flex items-baseline">
                    <motion.span
                      className={cn("text-5xl font-bold tabular-nums", getScoreColor(overallScore))}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                    >
                      <CountUp target={overallScore} delay={200} />
                    </motion.span>
                    <span className="text-xl text-gray-300 font-light ml-1">/100</span>
                  </div>
                  {/* Ring */}
                  <motion.div
                    className="ml-auto shrink-0"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}
                  >
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                        <motion.circle
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke={getScoreRingColor(overallScore)}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - overallScore / 100) }}
                          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className={cn("h-6 w-6", getScoreColor(overallScore))} />
                      </div>
                    </div>
                  </motion.div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", getScoreBarGradient(overallScore))}
                    initial={{ width: 0 }}
                    animate={{ width: `${overallScore}%` }}
                    transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Verdict */}
          {phase === "verdict" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className={cn("rounded-2xl p-4", recStyle.bg)}>
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1 shrink-0">
                    <span className="text-white font-bold text-sm">{recStyle.text}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/60 text-[10px] font-medium uppercase tracking-wider mb-0.5">AI Recommendation</p>
                    <p className="text-white text-sm leading-relaxed">{headline}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
