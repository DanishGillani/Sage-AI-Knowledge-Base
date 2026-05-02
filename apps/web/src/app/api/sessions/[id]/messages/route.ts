import { type NextRequest, NextResponse } from 'next/server'

import { prisma } from '@sage/db'
import {
  SendMessageSchema,
  makeInternalError,
  makeNotFoundError,
  makeValidationError,
} from '@sage/types'

import { internalFetch } from '@/lib/api/internal'
import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Number of prior messages passed to the LLM as conversation history
const MESSAGE_HISTORY_LIMIT = 10

interface FastApiSource {
  document_id: string
  filename: string
  page_number: number | null
  excerpt: string
  similarity_score: number
}

interface FastApiChatResponse {
  content: string
  sources: FastApiSource[]
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params
    const session = await prisma.session.findUnique({ where: { id } })
    if (!session) return jsonError(makeNotFoundError('Session', id))

    const messages = await prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    })

    return jsonSuccess(
      messages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        role: m.role,
        content: m.content,
        sources: m.sources,
        createdAt: m.createdAt,
      })),
    )
  })
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params

    const session = await prisma.session.findUnique({ where: { id } })
    if (!session) return jsonError(makeNotFoundError('Session', id))
    if (!session.knowledgeBaseId) {
      return jsonError({
        code: 'NO_KNOWLEDGE_BASE',
        message: 'Session has no knowledge base attached',
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError(makeInternalError('Request body must be valid JSON'))
    }

    const parsed = SendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(
        makeValidationError(
          parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        ),
      )
    }

    // Persist user message
    const userMessage = await prisma.message.create({
      data: { sessionId: id, role: 'USER', content: parsed.data.content, sources: [] },
    })

    // Load recent history (excluding the message we just created, chronological order)
    const historyRows = await prisma.message.findMany({
      where: { sessionId: id, id: { not: userMessage.id } },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_HISTORY_LIMIT,
    })
    const messageHistory = historyRows.reverse().map((m) => ({ role: m.role, content: m.content }))

    // Call FastAPI RAG endpoint
    const chatRes = await internalFetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: id,
        message: parsed.data.content,
        knowledge_base_id: session.knowledgeBaseId,
        mode: session.mode,
        message_history: messageHistory,
      }),
    })

    if (!chatRes.ok) {
      // Roll back user message so the client can retry cleanly
      await prisma.message.delete({ where: { id: userMessage.id } })
      const errBody = (await chatRes.json().catch(() => ({}))) as {
        code?: string
        message?: string
      }
      return jsonError({
        code: (errBody.code as 'OLLAMA_UNAVAILABLE' | 'INTERNAL_ERROR') ?? 'INTERNAL_ERROR',
        message: errBody.message ?? 'Failed to generate a response',
      })
    }

    const chatData = (await chatRes.json()) as FastApiChatResponse

    // snake_case → camelCase source mapping
    const sources = chatData.sources.map((s) => ({
      documentId: s.document_id,
      filename: s.filename,
      pageNumber: s.page_number,
      excerpt: s.excerpt,
      similarityScore: s.similarity_score,
    }))

    const assistantMessage = await prisma.message.create({
      data: {
        sessionId: id,
        role: 'ASSISTANT',
        content: chatData.content,
        sources,
      },
    })

    // Touch session updatedAt so recent sessions sort correctly
    await prisma.session.update({ where: { id }, data: {} })

    return jsonSuccess({
      id: assistantMessage.id,
      sessionId: assistantMessage.sessionId,
      role: assistantMessage.role,
      content: assistantMessage.content,
      sources: assistantMessage.sources,
      createdAt: assistantMessage.createdAt,
    })
  })
}
