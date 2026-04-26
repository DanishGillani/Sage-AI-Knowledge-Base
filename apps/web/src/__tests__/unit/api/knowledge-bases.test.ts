import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
  updateKnowledgeBase,
} from '@/lib/api/knowledge-bases'

import { server } from '../../mocks/server'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STUB_KB = {
  id: 'kb-001',
  name: 'Engineering Runbooks',
  description: null,
  documentCount: 3,
  readyDocumentCount: 2,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
}

const STUB_LIST = {
  items: [STUB_KB],
  total: 1,
  page: 1,
  limit: 20,
  hasNextPage: false,
}

// ─── listKnowledgeBases ────────────────────────────────────────────────────────

describe('listKnowledgeBases()', () => {
  it('returns success with list on 200', async () => {
    server.use(
      http.get('/api/knowledge-bases', () => HttpResponse.json({ data: STUB_LIST })),
    )

    const result = await listKnowledgeBases()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.total).toBe(1)
      expect(result.data.items[0]?.name).toBe('Engineering Runbooks')
    }
  })

  it('returns failure on 500', async () => {
    server.use(
      http.get('/api/knowledge-bases', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'DB down' }, { status: 500 }),
      ),
    )

    const result = await listKnowledgeBases()

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('INTERNAL_ERROR')
  })

  it('passes page and limit as query params', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/knowledge-bases', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ data: STUB_LIST })
      }),
    )

    await listKnowledgeBases(2, 5)

    expect(capturedUrl).toContain('page=2')
    expect(capturedUrl).toContain('limit=5')
  })
})

// ─── getKnowledgeBase ─────────────────────────────────────────────────────────

describe('getKnowledgeBase()', () => {
  it('returns success with knowledge base on 200', async () => {
    server.use(
      http.get('/api/knowledge-bases/kb-001', () => HttpResponse.json({ data: STUB_KB })),
    )

    const result = await getKnowledgeBase('kb-001')

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe('kb-001')
  })

  it('returns failure with NOT_FOUND on 404', async () => {
    server.use(
      http.get('/api/knowledge-bases/missing', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 }),
      ),
    )

    const result = await getKnowledgeBase('missing')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND')
  })
})

// ─── createKnowledgeBase ──────────────────────────────────────────────────────

describe('createKnowledgeBase()', () => {
  it('returns success with created KB on 201', async () => {
    server.use(
      http.post('/api/knowledge-bases', () =>
        HttpResponse.json({ data: STUB_KB }, { status: 201 }),
      ),
    )

    const result = await createKnowledgeBase({ name: 'Engineering Runbooks' })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Engineering Runbooks')
  })

  it('returns failure with VALIDATION_ERROR on 422', async () => {
    server.use(
      http.post('/api/knowledge-bases', () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Name is required' },
          { status: 422 },
        ),
      ),
    )

    const result = await createKnowledgeBase({ name: '' })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR')
  })
})

// ─── updateKnowledgeBase ──────────────────────────────────────────────────────

describe('updateKnowledgeBase()', () => {
  it('returns success with updated KB on 200', async () => {
    const updated = { ...STUB_KB, name: 'Renamed KB' }
    server.use(
      http.patch('/api/knowledge-bases/kb-001', () => HttpResponse.json({ data: updated })),
    )

    const result = await updateKnowledgeBase('kb-001', { name: 'Renamed KB' })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Renamed KB')
  })
})

// ─── deleteKnowledgeBase ──────────────────────────────────────────────────────

describe('deleteKnowledgeBase()', () => {
  it('returns success on 204', async () => {
    server.use(
      http.delete('/api/knowledge-bases/kb-001', () => new HttpResponse(null, { status: 204 })),
    )

    const result = await deleteKnowledgeBase('kb-001')

    expect(result.success).toBe(true)
  })

  it('returns failure with NOT_FOUND on 404', async () => {
    server.use(
      http.delete('/api/knowledge-bases/missing', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 }),
      ),
    )

    const result = await deleteKnowledgeBase('missing')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND')
  })
})
