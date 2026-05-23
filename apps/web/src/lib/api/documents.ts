import type {
  ApiResult,
  AppError,
  Document,
  NotFoundError,
  UnsupportedFileTypeError,
  ValidationError,
} from '@sage/types'
import { failure, success } from '@sage/types'

export interface DocumentChunk {
  chunk_index: number
  page_number: number | null
  content: string
}

export interface DocumentChunksData {
  document_id: string
  chunks: DocumentChunk[]
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

export async function listDocuments(
  knowledgeBaseId: string,
): Promise<ApiResult<Document[], AppError>> {
  const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents`)
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: Document[] }
  return success(data)
}

export async function uploadDocument(
  knowledgeBaseId: string,
  file: File,
  forceOcr = false,
): Promise<ApiResult<Document, ValidationError | UnsupportedFileTypeError | AppError>> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('force_ocr', String(forceOcr))
  const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: Document }
  return success(data)
}

export async function getDocument(
  knowledgeBaseId: string,
  docId: string,
): Promise<ApiResult<Document, NotFoundError | AppError>> {
  const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents/${docId}`)
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: Document }
  return success(data)
}

export async function listDocumentChunks(
  knowledgeBaseId: string,
  docId: string,
): Promise<ApiResult<DocumentChunksData, AppError>> {
  const response = await fetch(
    `/api/knowledge-bases/${knowledgeBaseId}/documents/${docId}/chunks`,
  )
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: DocumentChunksData }
  return success(data)
}

export async function deleteDocument(
  knowledgeBaseId: string,
  docId: string,
): Promise<ApiResult<void, NotFoundError | AppError>> {
  const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents/${docId}`, {
    method: 'DELETE',
  })
  if (!response.ok) return failure(await parseErrorResponse(response))
  return success(undefined)
}
