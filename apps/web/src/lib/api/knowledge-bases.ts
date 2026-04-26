import type {
  ApiResult,
  AppError,
  CreateKnowledgeBaseRequest,
  KnowledgeBase,
  NotFoundError,
  UpdateKnowledgeBaseRequest,
  ValidationError,
} from '@sage/types'
import { failure, success } from '@sage/types'

// Paginated list shape returned by GET /api/knowledge-bases
export interface KnowledgeBaseListResult {
  items: KnowledgeBase[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
}

// Parses an error response body from the BFF into a typed AppError
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

export async function listKnowledgeBases(
  page = 1,
  limit = 20,
): Promise<ApiResult<KnowledgeBaseListResult, AppError>> {
  const response = await fetch(`/api/knowledge-bases?page=${page}&limit=${limit}`)
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: KnowledgeBaseListResult }
  return success(data)
}

export async function getKnowledgeBase(
  id: string,
): Promise<ApiResult<KnowledgeBase, NotFoundError | AppError>> {
  const response = await fetch(`/api/knowledge-bases/${id}`)
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: KnowledgeBase }
  return success(data)
}

export async function createKnowledgeBase(
  body: CreateKnowledgeBaseRequest,
): Promise<ApiResult<KnowledgeBase, ValidationError | AppError>> {
  const response = await fetch('/api/knowledge-bases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: KnowledgeBase }
  return success(data)
}

export async function updateKnowledgeBase(
  id: string,
  body: UpdateKnowledgeBaseRequest,
): Promise<ApiResult<KnowledgeBase, NotFoundError | ValidationError | AppError>> {
  const response = await fetch(`/api/knowledge-bases/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: KnowledgeBase }
  return success(data)
}

export async function deleteKnowledgeBase(
  id: string,
): Promise<ApiResult<void, NotFoundError | AppError>> {
  const response = await fetch(`/api/knowledge-bases/${id}`, { method: 'DELETE' })
  if (!response.ok) return failure(await parseErrorResponse(response))
  return success(undefined)
}
