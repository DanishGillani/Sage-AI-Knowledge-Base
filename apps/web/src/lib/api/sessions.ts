import type {
  ApiResult,
  AppError,
  CreateSessionRequest,
  NotFoundError,
  Session,
  UpdateSessionRequest,
  ValidationError,
} from '@sage/types'
import { failure, success } from '@sage/types'

export interface SessionListResult {
  items: Session[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
}

async function parseErrorResponse(response: Response): Promise<AppError> {
  try {
    const body = (await response.json()) as { code?: string; message?: string }
    return {
      code: (body.code as AppError['code']) ?? 'INTERNAL_ERROR',
      message: body.message ?? 'An unexpected error occurred',
    }
  } catch {
    return { code: 'INTERNAL_ERROR', message: 'Failed to parse error response' }
  }
}

export async function listSessions(
  page = 1,
  limit = 20,
): Promise<ApiResult<SessionListResult, AppError>> {
  const response = await fetch(`/api/sessions?page=${page}&limit=${limit}`)
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: SessionListResult }
  return success(data)
}

export async function getSession(
  id: string,
): Promise<ApiResult<Session, NotFoundError | AppError>> {
  const response = await fetch(`/api/sessions/${id}`)
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: Session }
  return success(data)
}

export async function createSession(
  body: CreateSessionRequest,
): Promise<ApiResult<Session, ValidationError | AppError>> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: Session }
  return success(data)
}

export async function updateSession(
  id: string,
  body: UpdateSessionRequest,
): Promise<ApiResult<Session, NotFoundError | ValidationError | AppError>> {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: Session }
  return success(data)
}

export async function deleteSession(
  id: string,
): Promise<ApiResult<void, NotFoundError | AppError>> {
  const response = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
  if (!response.ok) return failure(await parseErrorResponse(response))
  return success(undefined)
}
