import { NextResponse } from 'next/server'

import type { AppError, ErrorCode } from '@sage/types'

// Maps our domain error codes to HTTP status codes — one place to change if conventions shift
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  PROCESSING_ERROR: 422,
  UNSUPPORTED_FILE_TYPE: 415,
  STORAGE_ERROR: 500,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  NO_KNOWLEDGE_BASE: 400,
  OLLAMA_UNAVAILABLE: 503,
}

export function jsonSuccess<TData>(data: TData, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function jsonError(error: AppError): NextResponse {
  const status = ERROR_STATUS_MAP[error.code] ?? 500
  return NextResponse.json(
    { code: error.code, message: error.message, details: error.details },
    { status },
  )
}

// Wraps a route handler body in try/catch — all unhandled errors become 500s
export async function withErrorHandling(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.json({ code: 'INTERNAL_ERROR', message }, { status: 500 })
  }
}
