import { type NextRequest, NextResponse } from 'next/server'

import { prisma } from '@sage/db'
import { makeNotFoundError } from '@sage/types'

import { internalFetch } from '@/lib/api/internal'
import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string; docId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { docId } = await params

    const doc = await prisma.document.findUnique({ where: { id: docId } })
    if (!doc) return jsonError(makeNotFoundError('Document', docId))

    return jsonSuccess({
      id: doc.id,
      knowledgeBaseId: doc.knowledgeBaseId,
      filename: doc.filename,
      fileType: doc.fileType,
      fileSizeBytes: doc.fileSizeBytes,
      status: doc.status,
      pageCount: doc.pageCount,
      errorMessage: doc.errorMessage,
      createdAt: doc.createdAt,
    })
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { docId } = await params

    const doc = await prisma.document.findUnique({ where: { id: docId } })
    if (!doc) return jsonError(makeNotFoundError('Document', docId))

    // Delete chunks from the SQLAlchemy-managed table before removing the Prisma row
    await internalFetch(`/documents/${docId}`, { method: 'DELETE' })

    await prisma.document.delete({ where: { id: docId } })

    return new NextResponse(null, { status: 204 })
  })
}
