import { http, HttpResponse } from 'msw'

// Default happy-path handlers — override per test with server.use(...)
export const handlers = [
  http.get('/api/sessions', () => {
    return HttpResponse.json({ items: [], total: 0, page: 1, limit: 20, hasNextPage: false })
  }),

  http.get('/api/knowledge-bases', () => {
    return HttpResponse.json({ items: [], total: 0, page: 1, limit: 20, hasNextPage: false })
  }),
]
