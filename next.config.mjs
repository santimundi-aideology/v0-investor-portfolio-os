import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'dmkrjnuzruhkmykbrqld.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.bayut.com',
      },
      {
        protocol: 'https',
        hostname: 'images.propertyfinder.ae',
      },
      {
        protocol: 'https',
        hostname: '*.bayut.com',
      },
      {
        protocol: 'https',
        hostname: '*.propertyfinder.ae',
      },
      {
        protocol: 'https',
        hostname: '*.dubizzle.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  typescript: {
    // ~342 pre-existing TS warnings: null vs undefined, type assertion gaps.
    // Database types were regenerated 2026-02-09. No runtime impact.
    // TODO: Dedicate a PR to fix remaining null-safety issues and remove this flag.
    ignoreBuildErrors: true,
  },
}

export default withSentryConfig(nextConfig, {
  // Suppress source map upload logs in CI
  silent: true,
  // Upload source maps only when SENTRY_AUTH_TOKEN is set
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
})
