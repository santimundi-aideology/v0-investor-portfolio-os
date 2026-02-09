"use client"

import { useState, useEffect } from "react"
import type { PlanTier } from "@/lib/plans/config"

interface UsageCheckResult {
  allowed: boolean
  current: number
  limit: number
  remaining: number
  isUnlimited: boolean
  percentUsed: number
  reason?: string
}

export function usePlanLimits() {
  const [isLoading, setIsLoading] = useState(false)
  
  /**
   * Check if an action is allowed based on plan limits
   */
  const checkLimit = async (
    limitType: "properties" | "investors" | "users" | "memos" | "aiEvaluations"
  ): Promise<UsageCheckResult> => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/plans/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitType }),
      })
      
      if (!res.ok) {
        throw new Error("Failed to check plan limit")
      }
      
      const data = await res.json()
      return data
    } catch (err) {
      console.error("Error checking plan limit:", err)
      // Return a permissive result on error to not block users
      return {
        allowed: true,
        current: 0,
        limit: -1,
        remaining: -1,
        isUnlimited: true,
        percentUsed: 0,
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  return {
    checkLimit,
    isLoading,
  }
}

interface UsageData {
  plan: PlanTier
  planConfig: {
    displayName: string
    limits: Record<string, number>
  }
  usage: {
    properties: number
    investors: number
    users: number
    memosThisMonth: number
    aiEvaluationsThisMonth: number
  }
  limits: {
    maxProperties: number
    maxInvestors: number
    maxUsers: number
    maxMemos: number
    maxAIEvaluations: number
  }
  warnings: string[]
  approaching: string[]
  needsAttention: boolean
}

/**
 * Hook to get current plan usage stats
 */
export function useUsageStats() {
  const [data, setData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetch("/api/plans/usage")
        if (!res.ok) {
          throw new Error("Failed to load usage data")
        }
        const data = await res.json()
        setData(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        setIsLoading(false)
      }
    }
    
    loadUsage()
  }, [])
  
  const refetch = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/plans/usage")
      if (!res.ok) {
        throw new Error("Failed to load usage data")
      }
      const data = await res.json()
      setData(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }
  
  return {
    data,
    isLoading,
    error,
    refetch,
  }
}
