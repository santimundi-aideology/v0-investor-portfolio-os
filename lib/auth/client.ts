import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Creates a Supabase client for browser-side operations.
 * Uses the anon key for authenticated user operations.
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in .env.local and restart the dev server."
    )
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return browserClient
}
