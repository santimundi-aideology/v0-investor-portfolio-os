/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url"

const rootDir = fileURLToPath(new URL(".", import.meta.url))

const nextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: rootDir,
  },
 
}

export default nextConfig
