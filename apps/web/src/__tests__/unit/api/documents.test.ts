import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  deleteDocument,
  getDocument,
  listDocuments,
  uploadDocument,
} from '@/lib/api/documents'

import { server } from '../../mocks/server'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STUB_DOC = {
  id: 'doc-001',
  knowledgeBaseId: 'kb-001',
  filename: 'spec.pdf',
  fileType: 'PDF',
  fileSizeBytes: 204800,
  status: 'PENDING',
  pageCount: null,
  errorMessage: null,
  createdAt: '2026-04-26T00:00:00.000Z',
}

// ─── listDocuments ────────────────────────────────────────────────────────────

describe('listDocuments()', () => {
  it('returns success with document list on 200', async () => {
    server.use(
      http.get('/api/knowledge-bases/kb-001/documents', () =>
        HttpResponse.json({ data: [STUB_DOC] }),
      ),
    )

    const result = await listDocuments('kb-001')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.filename).toBe('spec.pdf')
    }
  })

  it('returns failure on 404 (unknown KB)', async () => {
    server.use(
      http.get('/api/knowledge-bases/missing/documents', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 }),
      ),
    )

    const result = await listDocuments('missing')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND')
  })
})

// ─── uploadDocument ───────────────────────────────────────────────────────────

describe('uploadDocument()', () => {
  it('returns success with document on 202', async () => {
    server.use(
      http.post('/api/knowledge-bases/kb-001/documents', () =>
        HttpResponse.json({ data: STUB_DOC }, { status: 202 }),
      ),
    )

    const file = new File([new Uint8Array(10)], 'spec.pdf', { type: 'application/pdf' })
    const result = await uploadDocument('kb-001', file)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('PENDING')
      expect(result.data.filename).toBe('spec.pdf')
    }
  })

  it('returns failure with UNSUPPORTED_FILE_TYPE on 415', async () => {
    server.use(
      http.post('/api/knowledge-bases/kb-001/documents', () =>
        HttpResponse.json(
          { code: 'UNSUPPORTED_FILE_TYPE', message: 'Type not supported' },
          { status: 415 },
        ),
      ),
    )

    const file = new File([new Uint8Array(10)], 'virus.exe', { type: 'application/octet-stream' })
    const result = await uploadDocument('kb-001', file)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('UNSUPPORTED_FILE_TYPE')
  })

  it('returns failure with VALIDATION_ERROR when file too large', async () => {
    server.use(
      http.post('/api/knowledge-bases/kb-001/documents', () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'File size exceeds the 500 MB limit' },
          { status: 422 },
        ),
      ),
    )

    const file = new File([new Uint8Array(10)], 'big.pdf', { type: 'application/pdf' })
    const result = await uploadDocument('kb-001', file)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR')
  })
})

// ─── getDocument ──────────────────────────────────────────────────────────────

describe('getDocument()', () => {
  it('returns success with document on 200', async () => {
    server.use(
      http.get('/api/knowledge-bases/kb-001/documents/doc-001', () =>
        HttpResponse.json({ data: { ...STUB_DOC, status: 'READY', pageCount: 12 } }),
      ),
    )

    const result = await getDocument('kb-001', 'doc-001')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('READY')
      expect(result.data.pageCount).toBe(12)
    }
  })

  it('returns failure with NOT_FOUND on 404', async () => {
    server.use(
      http.get('/api/knowledge-bases/kb-001/documents/missing', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 }),
      ),
    )

    const result = await getDocument('kb-001', 'missing')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND')
  })
})

// ─── deleteDocument ───────────────────────────────────────────────────────────

describe('deleteDocument()', () => {
  it('returns success on 204', async () => {
    server.use(
      http.delete('/api/knowledge-bases/kb-001/documents/doc-001', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )

    const result = await deleteDocument('kb-001', 'doc-001')

    expect(result.success).toBe(true)
  })

  it('returns failure with NOT_FOUND on 404', async () => {
    server.use(
      http.delete('/api/knowledge-bases/kb-001/documents/missing', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 }),
      ),
    )

    const result = await deleteDocument('kb-001', 'missing')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND')
  })
})
