import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Transpile workspace packages so Next.js can process their TypeScript
  transpilePackages: ['@sage/types', '@sage/db'],
  experimental: {
    // Typed route handlers
    typedRoutes: true,
  },
}

export default nextConfig
