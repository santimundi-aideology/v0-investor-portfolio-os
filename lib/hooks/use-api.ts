import useSWR from 'swr'
import { useApp } from '@/components/providers/app-provider'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    // @ts-expect-error - attaching error info
    error.info = await res.json()
    // @ts-expect-error - attaching status
    error.status = res.status
    throw error
  }
  return res.json()
}

/**
 * Custom hook for API data fetching with SWR
 * Provides automatic caching, revalidation, and error handling
 */
export function useAPI<T = unknown>(endpoint: string | null, options?: {
  refreshInterval?: number
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  suspense?: boolean
}) {
  const { tenantId } = useApp()
  
  // Add tenant context to endpoint if available and not already present
  const url = (() => {
    if (!endpoint) return null
    if (!tenantId || endpoint.includes('tenantId=')) return endpoint
    const separator = endpoint.includes('?') ? '&' : '?'
    return `${endpoint}${separator}tenantId=${tenantId}`
  })()

  const { data, error, isLoading, mutate } = useSWR<T>(
    url,
    fetcher,
    {
      refreshInterval: options?.refreshInterval || 0,
      revalidateOnFocus: options?.revalidateOnFocus !== false,
      revalidateOnReconnect: options?.revalidateOnReconnect !== false,
      ...options,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate, // For manual revalidation
  }
}
