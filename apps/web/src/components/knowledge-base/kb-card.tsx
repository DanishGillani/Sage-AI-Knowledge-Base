'use client'

import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { KnowledgeBase } from '@sage/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'
import { deleteKnowledgeBase } from '@/lib/api/knowledge-bases'

interface KbCardProps {
  kb: KnowledgeBase
}

export function KbCard({ kb }: KbCardProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteKnowledgeBase(kb.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
    },
  })

  const readyRatio =
    kb.documentCount > 0 ? Math.round((kb.readyDocumentCount / kb.documentCount) * 100) : 0

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/knowledge-bases/${kb.id}`}
          className="flex-1 truncate font-semibold text-foreground hover:underline"
        >
          {kb.name}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (confirm(`Delete "${kb.name}"? This will remove all documents and chunks.`)) {
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

      {kb.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{kb.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={kb.documentCount === 0 ? 'secondary' : 'default'}>
            {kb.documentCount} {kb.documentCount === 1 ? 'doc' : 'docs'}
          </Badge>
          {kb.documentCount > 0 && kb.readyDocumentCount < kb.documentCount && (
            <Badge variant="processing">{readyRatio}% indexed</Badge>
          )}
          {kb.documentCount > 0 && kb.readyDocumentCount === kb.documentCount && (
            <Badge variant="success">Ready</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(kb.updatedAt)}</span>
      </div>
    </div>
  )
}
