const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000'
const API_INTERNAL_SECRET = process.env.API_INTERNAL_SECRET ?? 'change-me-in-production'

export function internalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      'x-internal-secret': API_INTERNAL_SECRET,
    },
  })
}
