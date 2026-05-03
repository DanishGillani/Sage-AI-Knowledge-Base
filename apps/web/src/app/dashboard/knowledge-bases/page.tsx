'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { KbCard } from '@/components/knowledge-base/kb-card'
import { CreateKbDialog } from '@/components/knowledge-base/create-kb-dialog'
import type { KnowledgeBase } from '@sage/types'
import { listKnowledgeBases } from '@/lib/api/knowledge-bases'

export default function KnowledgeBasesPage() {
  const [showCreate, setShowCreate] = useState(false)

  const { data: result, isLoading } = useQuery({
    queryKey: ['knowledge-bases', 1, 20],
    queryFn: () => listKnowledgeBases(1, 20),
    staleTime: 30_000,
  })

  const knowledgeBases = result?.success ? result.data.items : []

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <h1 className="font-semibold text-foreground">Knowledge Bases</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </Button>
      </header>

      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" className="text-muted-foreground" />
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">No knowledge bases yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create one to start uploading documents.
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)}>Create knowledge base</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {knowledgeBases.map((kb: KnowledgeBase) => (
              <KbCard key={kb.id} kb={kb} />
            ))}
          </div>
        )}
      </div>

      <CreateKbDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
