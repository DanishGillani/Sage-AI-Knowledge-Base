import { type NextRequest, NextResponse } from 'next/server'

import { prisma } from '@sage/db'
import {
  UpdateSessionSchema,
  makeInternalError,
  makeNotFoundError,
  makeValidationError,
} from '@sage/types'

import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

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

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params
    const session = await prisma.session.findUnique({
      where: { id },
      include: { knowledgeBase: { select: { name: true } } },
    })
    if (!session) return jsonError(makeNotFoundError('Session', id))
    return jsonSuccess(serializeSession(session))
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params

    const existing = await prisma.session.findUnique({ where: { id } })
    if (!existing) return jsonError(makeNotFoundError('Session', id))

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError(makeInternalError('Request body must be valid JSON'))
    }

    const parsed = UpdateSessionSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(
        makeValidationError(
          parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        ),
      )
    }

    const updated = await prisma.session.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.mode !== undefined && { mode: parsed.data.mode }),
        ...(parsed.data.knowledgeBaseId !== undefined && {
          knowledgeBaseId: parsed.data.knowledgeBaseId,
        }),
      },
      include: { knowledgeBase: { select: { name: true } } },
    })

    return jsonSuccess(serializeSession(updated))
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params
    const existing = await prisma.session.findUnique({ where: { id } })
    if (!existing) return jsonError(makeNotFoundError('Session', id))
    await prisma.session.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  })
}
