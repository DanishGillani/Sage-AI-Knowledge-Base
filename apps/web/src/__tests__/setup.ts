import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { server } from './mocks/server'

// Start msw server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers between tests so they don't bleed across tests
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Stop msw server after all tests
afterAll(() => server.close())
