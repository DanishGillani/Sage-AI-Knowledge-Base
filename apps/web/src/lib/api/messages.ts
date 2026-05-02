import type {
  ApiResult,
  AppError,
  Message,
  NoKnowledgeBaseError,
  NotFoundError,
  OllamaUnavailableError,
  SendMessageRequest,
  ValidationError,
} from '@sage/types'
import { failure, success } from '@sage/types'

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

export async function listMessages(
  sessionId: string,
): Promise<ApiResult<Message[], NotFoundError | AppError>> {
  const response = await fetch(`/api/sessions/${sessionId}/messages`)
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: Message[] }
  return success(data)
}

export async function sendMessage(
  sessionId: string,
  body: SendMessageRequest,
): Promise<
  ApiResult<
    Message,
    | ValidationError
    | NotFoundError
    | NoKnowledgeBaseError
    | OllamaUnavailableError
    | AppError
  >
> {
  const response = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) return failure(await parseErrorResponse(response))
  const { data } = (await response.json()) as { data: Message }
  return success(data)
}
