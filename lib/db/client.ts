// NOTE: This file can only work on the server (requires SUPABASE_SERVICE_ROLE_KEY)
// We don't use "server-only" here because some lib files that import this
// are also imported by client components for type exports.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    // Throw INSIDE function so routes can catch and return JSON
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local and restart pnpm dev."
    );
  }

  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  return _client;
}

