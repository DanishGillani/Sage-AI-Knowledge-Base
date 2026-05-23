import nextPlugin from '@next/eslint-plugin-next'
import baseConfig from '@sage/config/eslint/next'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: ['playwright/**'],
  },
  ...baseConfig,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
]
