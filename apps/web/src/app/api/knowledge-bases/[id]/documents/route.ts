import type { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@sage/db'
import {
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
  makeInternalError,
  makeNotFoundError,
  makeUnsupportedFileTypeError,
  makeValidationError,
} from '@sage/types'

import { internalFetch } from '@/lib/api/internal'
import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params

    const kb = await prisma.knowledgeBase.findUnique({ where: { id } })
    if (!kb) return jsonError(makeNotFoundError('KnowledgeBase', id))

    const documents = await prisma.document.findMany({
      where: { knowledgeBaseId: id },
      orderBy: { createdAt: 'desc' },
    })

    return jsonSuccess(
      documents.map((doc) => ({
        id: doc.id,
        knowledgeBaseId: doc.knowledgeBaseId,
        filename: doc.filename,
        fileType: doc.fileType,
        fileSizeBytes: doc.fileSizeBytes,
        status: doc.status,
        pageCount: doc.pageCount,
        errorMessage: doc.errorMessage,
        createdAt: doc.createdAt,
      })),
    )
  })
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id } = await params

    const kb = await prisma.knowledgeBase.findUnique({ where: { id } })
    if (!kb) return jsonError(makeNotFoundError('KnowledgeBase', id))

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return jsonError(makeInternalError('Request must be multipart/form-data'))
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return jsonError(makeValidationError([{ field: 'file', message: 'File is required' }]))
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError(
        makeValidationError([{ field: 'file', message: 'File size exceeds the 500 MB limit' }]),
      )
    }

    const fileType = SUPPORTED_MIME_TYPES[file.type as keyof typeof SUPPORTED_MIME_TYPES]
    if (!fileType) {
      return jsonError(makeUnsupportedFileTypeError(file.type, Object.keys(SUPPORTED_MIME_TYPES)))
    }

    const document = await prisma.document.create({
      data: {
        knowledgeBaseId: id,
        filename: file.name,
        fileType,
        fileSizeBytes: file.size,
        status: 'PENDING',
      },
    })

    const forceOcr = formData.get('force_ocr') === 'true'

    // Forward file to FastAPI for background ingestion
    const ingestForm = new FormData()
    ingestForm.append('file', new Blob([await file.arrayBuffer()], { type: file.type }), file.name)
    ingestForm.append('knowledge_base_id', id)
    ingestForm.append('file_type', fileType)
    ingestForm.append('force_ocr', String(forceOcr))

    const ingestResponse = await internalFetch(`/documents/${document.id}/ingest`, {
      method: 'POST',
      body: ingestForm,
    })

    if (!ingestResponse.ok) {
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED', errorMessage: 'Failed to trigger ingestion pipeline' },
      })
      return jsonError(makeInternalError('Failed to start document ingestion'))
    }

    return jsonSuccess(
      {
        id: document.id,
        knowledgeBaseId: document.knowledgeBaseId,
        filename: document.filename,
        fileType: document.fileType,
        fileSizeBytes: document.fileSizeBytes,
        status: document.status,
        pageCount: document.pageCount,
        errorMessage: document.errorMessage,
        createdAt: document.createdAt,
      },
      202,
    )
  })
}
