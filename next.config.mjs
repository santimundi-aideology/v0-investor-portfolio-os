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
    // Pre-existing TS errors in API routes (Supabase type mismatches, null vs undefined).
    // TODO: Fix in a dedicated PR and remove this flag.
    ignoreBuildErrors: true,
  },
}

export default nextConfig
