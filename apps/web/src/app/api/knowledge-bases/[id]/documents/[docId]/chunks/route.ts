import type { NextRequest, NextResponse } from 'next/server'

import { makeInternalError } from '@sage/types'

import { internalFetch } from '@/lib/api/internal'
import { jsonError, jsonSuccess, withErrorHandling } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string; docId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { docId } = await params
    const res = await internalFetch(`/documents/${docId}/chunks`)
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string }
      return jsonError(makeInternalError(err.message ?? 'Failed to fetch document chunks'))
    }
    const data = await res.json()
    return jsonSuccess(data)
  })
}
