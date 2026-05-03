import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Produces a self-contained build under .next/standalone for Docker
  output: 'standalone',
  // Transpile workspace packages so Next.js can process their TypeScript
  transpilePackages: ['@sage/types', '@sage/db'],
  // Typed route handlers
  typedRoutes: false,
  webpack(config) {
    // Workspace packages use TypeScript ESM imports with .js extensions
    // (e.g. `export * from './common.js'` where the file is actually .ts).
    // Tell webpack to try .ts/.tsx when it can't find a .js file.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return config
  },
}

export default nextConfig
