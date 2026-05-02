import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { listMessages, sendMessage } from '@/lib/api/messages'

import { server } from '../../mocks/server'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STUB_SOURCE = {
  documentId: 'doc-001',
  filename: 'runbook.pdf',
  pageNumber: 3,
  excerpt: 'Deploy using blue-green deployment.',
  similarityScore: 0.92,
}

const STUB_USER_MSG = {
  id: 'msg-001',
  sessionId: 'sess-001',
  role: 'USER',
  content: 'What is the deployment process?',
  sources: [],
  createdAt: '2026-04-26T00:00:00.000Z',
}

const STUB_ASSISTANT_MSG = {
  id: 'msg-002',
  sessionId: 'sess-001',
  role: 'ASSISTANT',
  content: 'Deploy via the CI/CD pipeline using blue-green deployment.',
  sources: [STUB_SOURCE],
  createdAt: '2026-04-26T00:00:00.000Z',
}

// ─── listMessages ─────────────────────────────────────────────────────────────

describe('listMessages()', () => {
  it('returns success with message list on 200', async () => {
    server.use(
      http.get('/api/sessions/sess-001/messages', () =>
        HttpResponse.json({ data: [STUB_USER_MSG, STUB_ASSISTANT_MSG] }),
      ),
    )

    const result = await listMessages('sess-001')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0]?.role).toBe('USER')
      expect(result.data[1]?.role).toBe('ASSISTANT')
    }
  })

  it('returns failure on 404', async () => {
    server.use(
      http.get('/api/sessions/missing/messages', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 }),
      ),
    )
    const result = await listMessages('missing')
    expect(result.success).toBe(false)
  })
})

// ─── sendMessage ──────────────────────────────────────────────────────────────

describe('sendMessage()', () => {
  it('returns success with assistant message and sources on 200', async () => {
    server.use(
      http.post('/api/sessions/sess-001/messages', () =>
        HttpResponse.json({ data: STUB_ASSISTANT_MSG }),
      ),
    )

    const result = await sendMessage('sess-001', {
      content: 'What is the deployment process?',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('ASSISTANT')
      expect(result.data.sources).toHaveLength(1)
      expect(result.data.sources[0]?.filename).toBe('runbook.pdf')
      expect(result.data.sources[0]?.similarityScore).toBe(0.92)
    }
  })

  it('returns failure with VALIDATION_ERROR on empty message', async () => {
    server.use(
      http.post('/api/sessions/sess-001/messages', () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Message cannot be empty' },
          { status: 422 },
        ),
      ),
    )

    const result = await sendMessage('sess-001', { content: '' })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns failure with NO_KNOWLEDGE_BASE when session has no KB', async () => {
    server.use(
      http.post('/api/sessions/sess-001/messages', () =>
        HttpResponse.json(
          { code: 'NO_KNOWLEDGE_BASE', message: 'Session has no knowledge base attached' },
          { status: 400 },
        ),
      ),
    )

    const result = await sendMessage('sess-001', { content: 'hello' })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('NO_KNOWLEDGE_BASE')
  })

  it('returns failure with OLLAMA_UNAVAILABLE when model is offline', async () => {
    server.use(
      http.post('/api/sessions/sess-001/messages', () =>
        HttpResponse.json(
          { code: 'OLLAMA_UNAVAILABLE', message: 'Ollama is not running' },
          { status: 503 },
        ),
      ),
    )

    const result = await sendMessage('sess-001', { content: 'hello' })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('OLLAMA_UNAVAILABLE')
  })
})
