import useSWR from 'swr'

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
 * Provides automatic caching, revalidation, and error handling.
 * Tenant context is injected by middleware via x-tenant-id header,
 * so no need to add it as a query parameter.
 */
export function useAPI<T = unknown>(endpoint: string | null, options?: {
  refreshInterval?: number
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
}) {
  const { data, error, isLoading, mutate } = useSWR<T>(
    endpoint,
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
