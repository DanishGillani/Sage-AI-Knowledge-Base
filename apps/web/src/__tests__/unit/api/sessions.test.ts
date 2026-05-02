import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from '@/lib/api/sessions'

import { server } from '../../mocks/server'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STUB_SESSION = {
  id: 'sess-001',
  title: 'New Session',
  mode: 'PROFESSIONAL',
  knowledgeBaseId: 'kb-001',
  knowledgeBaseName: 'Engineering Runbooks',
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
}

const STUB_LIST = {
  items: [STUB_SESSION],
  total: 1,
  page: 1,
  limit: 20,
  hasNextPage: false,
}

// ─── listSessions ─────────────────────────────────────────────────────────────

describe('listSessions()', () => {
  it('returns success with list on 200', async () => {
    server.use(http.get('/api/sessions', () => HttpResponse.json({ data: STUB_LIST })))

    const result = await listSessions()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.total).toBe(1)
      expect(result.data.items[0]?.mode).toBe('PROFESSIONAL')
    }
  })

  it('returns failure on 500', async () => {
    server.use(
      http.get('/api/sessions', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'DB down' }, { status: 500 }),
      ),
    )
    const result = await listSessions()
    expect(result.success).toBe(false)
  })
})

// ─── getSession ───────────────────────────────────────────────────────────────

describe('getSession()', () => {
  it('returns success on 200', async () => {
    server.use(
      http.get('/api/sessions/sess-001', () => HttpResponse.json({ data: STUB_SESSION })),
    )
    const result = await getSession('sess-001')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe('sess-001')
  })

  it('returns failure with NOT_FOUND on 404', async () => {
    server.use(
      http.get('/api/sessions/missing', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 }),
      ),
    )
    const result = await getSession('missing')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND')
  })
})

// ─── createSession ────────────────────────────────────────────────────────────

describe('createSession()', () => {
  it('returns success with created session on 201', async () => {
    server.use(
      http.post('/api/sessions', () =>
        HttpResponse.json({ data: STUB_SESSION }, { status: 201 }),
      ),
    )
    const result = await createSession({ mode: 'PROFESSIONAL' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.mode).toBe('PROFESSIONAL')
  })
})

// ─── updateSession ────────────────────────────────────────────────────────────

describe('updateSession()', () => {
  it('returns success with updated session on 200', async () => {
    const updated = { ...STUB_SESSION, title: 'Renamed Session' }
    server.use(
      http.patch('/api/sessions/sess-001', () => HttpResponse.json({ data: updated })),
    )
    const result = await updateSession('sess-001', { title: 'Renamed Session' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.title).toBe('Renamed Session')
  })
})

// ─── deleteSession ────────────────────────────────────────────────────────────

describe('deleteSession()', () => {
  it('returns success on 204', async () => {
    server.use(
      http.delete('/api/sessions/sess-001', () => new HttpResponse(null, { status: 204 })),
    )
    const result = await deleteSession('sess-001')
    expect(result.success).toBe(true)
  })
})
