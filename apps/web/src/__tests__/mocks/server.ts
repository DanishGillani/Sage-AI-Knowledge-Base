import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Single msw server instance shared across all unit/component tests
export const server = setupServer(...handlers)
