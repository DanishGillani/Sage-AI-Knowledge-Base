export const dynamic = 'force-dynamic'

import type { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@sage/db'
import { SendMessageSchema, makeInternalError, makeNotFoundError, makeValidationError } from '@sage/types'

import { internalFetch } from '@/lib/api/internal'
import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

const MESSAGE_HISTORY_LIMIT = 10

interface FastApiSource {
  document_id: string
  filename: string
  page_number: number | null
  excerpt: string
  similarity_score: number
}

function generateTitle(content: string): string {
  const cleaned = content.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= 60) return cleaned
  const cut = cleaned.slice(0, 60)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + '…'
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

export async function POST(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params

  const session = await prisma.session.findUnique({ where: { id } })
  if (!session) {
    return Response.json({ code: 'NOT_FOUND', message: 'Session not found' }, { status: 404 })
  }
  if (!session.knowledgeBaseId) {
    return Response.json(
      { code: 'NO_KNOWLEDGE_BASE', message: 'Session has no knowledge base attached' },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(makeInternalError('Request body must be valid JSON'), { status: 400 })
  }

  const parsed = SendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      makeValidationError(
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      ),
      { status: 422 },
    )
  }

  // Count before creating so we know if this is the first message
  const existingCount = await prisma.message.count({ where: { sessionId: id } })

  const userMessage = await prisma.message.create({
    data: { sessionId: id, role: 'USER', content: parsed.data.content, sources: [] },
  })

  // Auto-generate title from the first message
  if (existingCount === 0) {
    await prisma.session.update({
      where: { id },
      data: { title: generateTitle(parsed.data.content) },
    })
  }

  const historyRows = await prisma.message.findMany({
    where: { sessionId: id, id: { not: userMessage.id } },
    orderBy: { createdAt: 'desc' },
    take: MESSAGE_HISTORY_LIMIT,
  })
  const messageHistory = historyRows
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }))

  // Call FastAPI SSE streaming endpoint
  let chatRes: Response
  try {
    chatRes = await internalFetch('/chat/stream/', {
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
  } catch {
    await prisma.message.delete({ where: { id: userMessage.id } })
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'AI service is unreachable' },
      { status: 503 },
    )
  }

  if (!chatRes.ok || !chatRes.body) {
    await prisma.message.delete({ where: { id: userMessage.id } })
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to connect to AI service' },
      { status: 502 },
    )
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const upstreamReader = chatRes.body.getReader()

  let fullContent = ''
  let sources: FastApiSource[] = []

  const readable = new ReadableStream({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await upstreamReader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data) continue

            try {
              const event = JSON.parse(data) as {
                type: string
                data?: unknown
                message?: string
              }

              if (event.type === 'sources') {
                sources = event.data as FastApiSource[]
              } else if (event.type === 'token') {
                fullContent += event.data as string
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'token', data: event.data })}\n\n`,
                  ),
                )
              } else if (event.type === 'error') {
                await prisma.message.delete({ where: { id: userMessage.id } })
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'error', message: event.message })}\n\n`,
                  ),
                )
                return
              }
            } catch {
              // skip malformed SSE line
            }
          }
        }

        const mappedSources = sources.map((s) => ({
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
            content: fullContent,
            sources: mappedSources,
          },
        })

        await prisma.session.update({ where: { id }, data: {} })

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', messageId: assistantMessage.id })}\n\n`,
          ),
        )
      } catch {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'Stream interrupted' })}\n\n`,
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
