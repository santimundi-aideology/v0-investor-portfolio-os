/**
 * Environment variable validation.
 * Import this module at app startup to ensure all required vars are set.
 * Throws at build/startup time if any critical variable is missing.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `See .env.local.example for the full list.`
    )
  }
  return value
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined
}

// Validate on import (server-side only)
// Client-side vars (NEXT_PUBLIC_*) are inlined at build time, so we check
// them separately with a runtime guard.

export const env = {
  // Supabase (required)
  SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),

  // App URL (required for auth redirects)
  APP_URL: requireEnv("NEXT_PUBLIC_APP_URL"),

  // OpenAI (required for AI features)
  OPENAI_API_KEY: requireEnv("OPENAI_API_KEY"),

  // Job secret (required for cron endpoints)
  JOB_SECRET: requireEnv("JOB_SECRET"),

  // Optional
  SENTRY_DSN: optionalEnv("NEXT_PUBLIC_SENTRY_DSN"),
  DEMO_TENANT_ID: optionalEnv("DEMO_TENANT_ID"),
} as const
