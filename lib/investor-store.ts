import * as React from "react"

import type { Investor } from "@/lib/types"

type Listener = () => void

let investors: Investor[] = []
let initialized = false
const listeners = new Set<Listener>()

const STORAGE_KEY = "investor-store:v1"

function emit() {
  for (const l of listeners) l()
}

function safeParse(json: string | null): Investor[] | null {
  if (!json) return null
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return null
    return parsed as Investor[]
  } catch {
    return null
  }
}

function persist() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(investors))
  } catch {
    // ignore
  }
}

export function initInvestorStore(seed: Investor[]) {
  if (initialized) return
  initialized = true

  investors = seed

  if (typeof window !== "undefined") {
    const fromStorage = safeParse(window.localStorage.getItem(STORAGE_KEY))
    if (fromStorage && fromStorage.length) investors = fromStorage
    persist()
  }

  emit()
}

export function getAllInvestors() {
  return investors
}

export function getInvestorById(id: string): Investor | undefined {
  const direct = investors.find((inv) => inv.id === id)
  if (direct) return direct
  if (/^\d+$/.test(id)) return investors.find((inv) => inv.id === `inv-${id}`)
  return undefined
}

export function updateInvestor(id: string, updates: Partial<Investor>) {
  const idx = investors.findIndex((inv) => inv.id === id)
  if (idx === -1) return undefined
  investors[idx] = { ...investors[idx], ...updates }
  persist()
  emit()
  return investors[idx]
}

export function replaceAllInvestors(next: Investor[]) {
  investors = next
  persist()
  emit()
}

export function resetInvestorStore(seed: Investor[]) {
  investors = seed
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
  persist()
  emit()
}

export function useInvestors() {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => investors,
    () => investors,
  )
}

export function useInvestor(id: string) {
  useInvestors() // Ensure data is loaded
  return React.useMemo(() => getInvestorById(id), [id])
}


