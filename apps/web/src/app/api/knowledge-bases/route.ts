import type { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@sage/db'
import { CreateKnowledgeBaseSchema, makeInternalError, makeValidationError } from '@sage/types'

import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { searchParams } = request.nextUrl
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const [items, total] = await prisma.$transaction([
      prisma.knowledgeBase.findMany({
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          _count: { select: { documents: true } },
          documents: {
            where: { status: 'READY' },
            select: { id: true },
          },
        },
      }),
      prisma.knowledgeBase.count(),
    ])

    return jsonSuccess({
      items: items.map((kb) => ({
        id: kb.id,
        name: kb.name,
        description: kb.description,
        documentCount: kb._count.documents,
        readyDocumentCount: kb.documents.length,
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
      })),
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

    const parsed = CreateKnowledgeBaseSchema.safeParse(body)
    if (!parsed.success) {
      const fields = parsed.error.errors.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return jsonError(makeValidationError(fields))
    }

    const kb = await prisma.knowledgeBase.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
      include: {
        _count: { select: { documents: true } },
      },
    })

    return jsonSuccess(
      {
        id: kb.id,
        name: kb.name,
        description: kb.description,
        documentCount: kb._count.documents,
        readyDocumentCount: 0,
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
      },
      201,
    )
  })
}
