/**
 * Next.js instrumentation hook.
 * Runs once when the server starts. Used for:
 * 1. Validating required environment variables
 * 2. Initializing Sentry
 */
export async function register() {
  // Validate environment variables on server startup
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env")
  }

  // Initialize Sentry
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}
