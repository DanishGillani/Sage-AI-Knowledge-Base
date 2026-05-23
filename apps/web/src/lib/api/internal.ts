const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000'
const API_INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? process.env.API_INTERNAL_SECRET ?? 'change-me-in-production'
const FETCH_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes — generous for slow CPU Ollama

export function internalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      ...(init.headers as Record<string, string>),
      'x-internal-secret': API_INTERNAL_SECRET,
    },
  }).finally(() => clearTimeout(timer))
}
