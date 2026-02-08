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
  ArrowRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ScoreFactor {
  key: string
  label: string
  score: number
  maxScore: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
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

const REVEAL_DELAY = 600 // ms between each factor reveal
const INITIAL_DELAY = 300 // ms before starting

function getRecommendationStyle(rec: string) {
  switch (rec) {
    case "strong_buy":
      return { bg: "bg-green-500", text: "Strong Buy", ring: "ring-green-400", glow: "shadow-green-500/30" }
    case "buy":
      return { bg: "bg-green-400", text: "Buy", ring: "ring-green-300", glow: "shadow-green-400/30" }
    case "hold":
      return { bg: "bg-amber-400", text: "Hold", ring: "ring-amber-300", glow: "shadow-amber-400/30" }
    case "pass":
      return { bg: "bg-red-500", text: "Pass", ring: "ring-red-400", glow: "shadow-red-500/30" }
    default:
      return { bg: "bg-gray-400", text: rec, ring: "ring-gray-300", glow: "shadow-gray-400/30" }
  }
}

function ScoreBar({ score, maxScore, color, delay }: { score: number; maxScore: number; color: string; delay: number }) {
  const pct = (score / maxScore) * 100
  return (
    <div className="relative h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, delay, ease: "easeOut" }}
      />
    </div>
  )
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
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      description: "How well does this property match investor mandates?",
    },
    {
      key: "marketTiming",
      label: "Market Timing",
      score: factors.marketTiming,
      maxScore: 25,
      icon: TrendingUp,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      description: "Is the market timing favorable for this investment?",
    },
    {
      key: "portfolioFit",
      label: "Portfolio Fit",
      score: factors.portfolioFit,
      maxScore: 25,
      icon: Briefcase,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      description: "How does it complement existing portfolio holdings?",
    },
    {
      key: "riskAlignment",
      label: "Risk Alignment",
      score: factors.riskAlignment,
      maxScore: 25,
      icon: Shield,
      color: "bg-amber-500",
      bgColor: "bg-amber-50",
      description: "Does the risk profile match investor tolerance?",
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
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: phase === "analyzing" ? 360 : 0 }}
              transition={{ duration: 2, repeat: phase === "analyzing" ? Infinity : 0, ease: "linear" }}
            >
              <Sparkles className="h-6 w-6 text-green-400" />
            </motion.div>
            <div>
              <h3 className="font-bold text-lg">AI Investment Analysis</h3>
              <p className="text-sm text-gray-400">
                {phase === "analyzing" && "Analyzing property against investment criteria..."}
                {phase === "factors" && "Evaluating investment factors..."}
                {phase === "overall" && "Computing overall score..."}
                {phase === "verdict" && "Analysis complete"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Analyzing Phase */}
          <AnimatePresence>
            {phase === "analyzing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center py-8"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <motion.div
                      className="w-16 h-16 rounded-full border-4 border-green-200"
                      animate={{ borderColor: ["#bbf7d0", "#22c55e", "#bbf7d0"] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-green-500 border-r-transparent border-b-transparent border-l-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Processing with AI</p>
                    <p className="text-sm text-gray-500">Evaluating 4 investment dimensions...</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Factor Cards */}
          {(phase === "factors" || phase === "overall" || phase === "verdict") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scoreFactors.map((factor, i) => {
                const isRevealed = i < revealedCount
                const Icon = factor.icon
                const delayMs = (i * REVEAL_DELAY) / 1000

                return (
                  <motion.div
                    key={factor.key}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={isRevealed ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <div className={cn("p-4 rounded-xl border transition-all", factor.bgColor, "border-gray-100")}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded-lg", factor.color, "bg-opacity-20")}>
                            <Icon className={cn("h-4 w-4", factor.color.replace("bg-", "text-"))} />
                          </div>
                          <span className="font-semibold text-sm text-gray-900">{factor.label}</span>
                        </div>
                        <span className="font-bold text-lg text-gray-900">
                          {isRevealed ? <CountUp target={factor.score} delay={delayMs * 1000} suffix={`/${factor.maxScore}`} /> : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{factor.description}</p>
                      <ScoreBar
                        score={factor.score}
                        maxScore={factor.maxScore}
                        color={factor.color}
                        delay={delayMs + 0.3}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Overall Score */}
          {(phase === "overall" || phase === "verdict") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Overall Investment Score</p>
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        className="text-5xl font-bold text-gray-900"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                      >
                        <CountUp target={overallScore} delay={200} />
                      </motion.span>
                      <span className="text-2xl text-gray-400 font-light">/100</span>
                    </div>
                  </div>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring", bounce: 0.5 }}
                  >
                    <div className="relative">
                      <svg className="w-24 h-24" viewBox="0 0 100 100">
                        <circle
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke="#f0f0f0"
                          strokeWidth="8"
                        />
                        <motion.circle
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - overallScore / 100) }}
                          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                  </motion.div>
                </div>
                {/* Progress bar */}
                <div className="mt-4 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      overallScore >= 75 ? "bg-gradient-to-r from-green-400 to-green-500" :
                      overallScore >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                      "bg-gradient-to-r from-red-400 to-red-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${overallScore}%` }}
                    transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Verdict */}
          {phase === "verdict" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className={cn("rounded-2xl p-5 text-white", recStyle.bg, "shadow-lg", recStyle.glow)}>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-white/20 text-white border-white/30 text-sm font-bold px-3">
                    {recStyle.text}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/80 font-medium">AI Recommendation</span>
                </div>
                <p className="text-white/90 text-sm leading-relaxed">{headline}</p>
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
