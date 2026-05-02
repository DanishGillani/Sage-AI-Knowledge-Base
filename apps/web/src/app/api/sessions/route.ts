import { type NextRequest, NextResponse } from 'next/server'

import { prisma } from '@sage/db'
import { CreateSessionSchema, makeInternalError, makeValidationError } from '@sage/types'

import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

function serializeSession(
  session: {
    id: string
    title: string
    mode: string
    knowledgeBaseId: string | null
    createdAt: Date
    updatedAt: Date
    knowledgeBase: { name: string } | null
  },
) {
  return {
    id: session.id,
    title: session.title,
    mode: session.mode,
    knowledgeBaseId: session.knowledgeBaseId,
    knowledgeBaseName: session.knowledgeBase?.name ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { searchParams } = request.nextUrl
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const [items, total] = await prisma.$transaction([
      prisma.session.findMany({
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
        include: { knowledgeBase: { select: { name: true } } },
      }),
      prisma.session.count(),
    ])

    return jsonSuccess({
      items: items.map(serializeSession),
      total,
      page,
      limit,
      hasNextPage: offset + limit < total,
    })
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError(makeInternalError('Request body must be valid JSON'))
    }

    const parsed = CreateSessionSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(
        makeValidationError(
          parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        ),
      )
    }

    const session = await prisma.session.create({
      data: {
        mode: parsed.data.mode,
        ...(parsed.data.knowledgeBaseId && { knowledgeBaseId: parsed.data.knowledgeBaseId }),
      },
      include: { knowledgeBase: { select: { name: true } } },
    })

    return jsonSuccess(serializeSession(session), 201)
  })
}
