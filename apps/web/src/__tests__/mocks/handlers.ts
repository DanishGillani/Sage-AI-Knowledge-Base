import { http, HttpResponse } from 'msw'

// Minimal default handlers — tests override these per-case with server.use(...)
// Keeping defaults here prevents "unhandled request" errors for background calls
export const handlers = [
  http.get('/api/sessions', () =>
    HttpResponse.json({ data: { items: [], total: 0, page: 1, limit: 20, hasNextPage: false } }),
  ),
  http.get('/api/knowledge-bases', () =>
    HttpResponse.json({ data: { items: [], total: 0, page: 1, limit: 20, hasNextPage: false } }),
  ),
  http.get('/api/knowledge-bases/:id/documents', () =>
    HttpResponse.json({ data: [] }),
  ),
  http.post('/api/knowledge-bases/:id/documents', () =>
    HttpResponse.json({ data: null }, { status: 202 }),
  ),
  http.get('/api/knowledge-bases/:id/documents/:docId', () =>
    HttpResponse.json({ data: null }, { status: 404 }),
  ),
  http.delete('/api/knowledge-bases/:id/documents/:docId', () =>
    new HttpResponse(null, { status: 204 }),
  ),
]
