'use client'

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Document } from '@sage/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatBytes, formatRelativeTime } from '@/lib/utils'
import { deleteDocument, listDocuments } from '@/lib/api/documents'

const STATUS_BADGE: Record<Document['status'], React.ReactNode> = {
  PENDING: <Badge variant="secondary">Pending</Badge>,
  PROCESSING: <Badge variant="processing">Processing</Badge>,
  READY: <Badge variant="success">Ready</Badge>,
  FAILED: <Badge variant="destructive">Failed</Badge>,
}

interface DocumentListProps {
  knowledgeBaseId: string
}

export function DocumentList({ knowledgeBaseId }: DocumentListProps) {
  const queryClient = useQueryClient()

  const { data: result, isLoading } = useQuery({
    queryKey: ['documents', knowledgeBaseId],
    queryFn: () => listDocuments(knowledgeBaseId),
    refetchInterval: (query) => {
      const r = query.state.data
      const docs: Document[] = r?.success ? r.data : []
      const hasProcessing = docs.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING')
      return hasProcessing ? 3_000 : false
    },
  })

  const documents: Document[] = result?.success ? result.data : []

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => deleteDocument(knowledgeBaseId, docId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', knowledgeBaseId] })
      void queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
    },
  })

  // Invalidate KB list when a doc transitions to READY so counts update
  useEffect(() => {
    if (documents.some((d: Document) => d.status === 'READY')) {
      void queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
    }
  }, [documents, queryClient])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="text-muted-foreground" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No documents yet</p>
        <p className="text-xs text-muted-foreground">Upload a file above to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{doc.filename}</span>
              <span className="shrink-0 text-xs text-muted-foreground uppercase">{doc.fileType}</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{formatBytes(doc.fileSizeBytes)}</span>
              {doc.pageCount != null && (
                <span className="text-xs text-muted-foreground">{doc.pageCount} pages</span>
              )}
              <span className="text-xs text-muted-foreground">{formatRelativeTime(doc.createdAt)}</span>
            </div>
            {doc.status === 'FAILED' && doc.errorMessage && (
              <p className="mt-1 text-xs text-destructive">{doc.errorMessage}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.status === 'PROCESSING' && <Spinner size="sm" className="text-blue-500" />}
            {STATUS_BADGE[doc.status]}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete "${doc.filename}"?`)) {
                  deleteMutation.mutate(doc.id)
                }
              }}
              loading={deleteMutation.isPending}
              aria-label="Delete document"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
