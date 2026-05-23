'use client'

import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { DocumentList } from '@/components/knowledge-base/document-list'
import { DocumentUploader } from '@/components/knowledge-base/document-uploader'
import { NewSessionDialog } from '@/components/chat/new-session-dialog'
import { getKnowledgeBase, deleteKnowledgeBase } from '@/lib/api/knowledge-bases'

export default function KnowledgeBaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showNewSession, setShowNewSession] = useState(false)
  const [forceOcr, setForceOcr] = useState(false)
  const uploaderRef = useRef<HTMLElement>(null)

  const { data: result, isLoading } = useQuery({
    queryKey: ['knowledge-base', id],
    queryFn: () => getKnowledgeBase(id),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const r = query.state.data
      if (!r?.success) return false
      const kb = r.data
      return kb.documentCount > 0 && kb.readyDocumentCount < kb.documentCount ? 4_000 : false
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteKnowledgeBase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
      router.push('/dashboard/knowledge-bases')
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  if (!result?.success) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Knowledge base not found.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/knowledge-bases')}>
          Back
        </Button>
      </div>
    )
  }

  const kb = result.data
  const isIndexing =
    kb.documentCount > 0 && kb.readyDocumentCount < kb.documentCount

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/knowledge-bases')}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-semibold text-foreground truncate">{kb.name}</h1>
          {isIndexing && <Badge variant="processing">Indexing</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewSession(true)}
            disabled={kb.readyDocumentCount === 0}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            Ask questions
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete "${kb.name}"? This cannot be undone.`)) {
                deleteMutation.mutate()
              }
            }}
            loading={deleteMutation.isPending}
            aria-label="Delete knowledge base"
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
      </header>

      <div className="flex-1 space-y-6 p-6">
        {/* KB metadata */}
        {kb.description && (
          <p className="text-sm text-muted-foreground">{kb.description}</p>
        )}

        {/* Upload */}
        <section ref={uploaderRef}>
          <h2 className="mb-3 text-sm font-medium text-foreground">Upload documents</h2>
          <DocumentUploader
            knowledgeBaseId={id}
            forceOcr={forceOcr}
            onForceOcrChange={setForceOcr}
          />
        </section>

        {/* Documents */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Documents{' '}
              <span className="text-muted-foreground">
                ({kb.readyDocumentCount}/{kb.documentCount} ready)
              </span>
            </h2>
          </div>
          <DocumentList
            knowledgeBaseId={id}
            onForceOcr={() => {
              setForceOcr(true)
              uploaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />
        </section>
      </div>

      <NewSessionDialog
        open={showNewSession}
        onClose={() => setShowNewSession(false)}
        defaultKnowledgeBaseId={id}
      />
    </div>
  )
}
