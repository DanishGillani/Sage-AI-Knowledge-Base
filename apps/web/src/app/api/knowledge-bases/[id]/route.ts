import { type NextRequest, NextResponse } from 'next/server'

import { prisma } from '@sage/db'
import {
  UpdateKnowledgeBaseSchema,
  makeInternalError,
  makeNotFoundError,
  makeValidationError,
} from '@sage/types'

import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params

    const kb = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        _count: { select: { documents: true } },
        documents: {
          where: { status: 'READY' },
          select: { id: true },
        },
      },
    })

    if (!kb) return jsonError(makeNotFoundError('KnowledgeBase', id))

    return jsonSuccess({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      documentCount: kb._count.documents,
      readyDocumentCount: kb.documents.length,
      createdAt: kb.createdAt,
      updatedAt: kb.updatedAt,
    })
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError(makeInternalError('Request body must be valid JSON'))
    }

    const parsed = UpdateKnowledgeBaseSchema.safeParse(body)
    if (!parsed.success) {
      const fields = parsed.error.errors.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return jsonError(makeValidationError(fields))
    }

    const existing = await prisma.knowledgeBase.findUnique({ where: { id } })
    if (!existing) return jsonError(makeNotFoundError('KnowledgeBase', id))

    const updated = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      },
      include: {
        _count: { select: { documents: true } },
        documents: { where: { status: 'READY' }, select: { id: true } },
      },
    })

    return jsonSuccess({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      documentCount: updated._count.documents,
      readyDocumentCount: updated.documents.length,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params

    const existing = await prisma.knowledgeBase.findUnique({ where: { id } })
    if (!existing) return jsonError(makeNotFoundError('KnowledgeBase', id))

    // Prisma cascades the delete to documents (via schema onDelete: Cascade)
    // FastAPI chunk cleanup happens separately via document delete webhook in Phase 6
    await prisma.knowledgeBase.delete({ where: { id } })

    return new NextResponse(null, { status: 204 })
  })
}
