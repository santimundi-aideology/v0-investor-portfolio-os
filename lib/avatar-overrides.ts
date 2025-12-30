"use client"

import * as React from "react"

const STORAGE_PREFIX = "ip:avatar:"

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`
}

export function getAvatarOverride(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(storageKey(key))
  } catch {
    return null
  }
}

export function setAvatarOverride(key: string, value: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey(key), value)
  } catch {
    // ignore (storage disabled / quota / etc)
  }
}

export function removeAvatarOverride(key: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(storageKey(key))
  } catch {
    // ignore
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export function useAvatarOverride(key: string, baseSrc?: string) {
  const [override, setOverrideState] = React.useState<string | null>(null)

  React.useEffect(() => {
    setOverrideState(getAvatarOverride(key))
  }, [key])

  const resolved = override ?? baseSrc

  const set = React.useCallback(
    (value: string) => {
      setAvatarOverride(key, value)
      setOverrideState(value)
    },
    [key],
  )

  const clear = React.useCallback(() => {
    removeAvatarOverride(key)
    setOverrideState(null)
  }, [key])

  return {
    src: resolved,
    override,
    set,
    clear,
    isOverridden: override != null && override.length > 0,
  }
}


