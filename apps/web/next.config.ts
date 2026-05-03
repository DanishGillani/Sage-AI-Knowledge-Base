import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Produces a self-contained build under .next/standalone for Docker
  output: 'standalone',
  // Transpile workspace packages so Next.js can process their TypeScript
  transpilePackages: ['@sage/types', '@sage/db'],
  experimental: {
    // Typed route handlers
    typedRoutes: true,
  },
}

export default nextConfig
