/**
 * Demo Mode Utility
 *
 * Controls whether mock/demo data is used throughout the application.
 * When NEXT_PUBLIC_DEMO_MODE is "true", components fall back to mock data
 * for quick demos without a real database connection.
 *
 * When demo mode is OFF, components must rely on real API data and show
 * proper loading/error/empty states instead of silently using fake data.
 */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true"
}
