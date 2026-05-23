'use client'

import { useQuery } from '@tanstack/react-query'

import { listDocumentChunks } from '@/lib/api/documents'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface DocumentPreviewProps {
  knowledgeBaseId: string
  docId: string
  onReprocessWithOcr?: (() => void) | undefined
}

export function DocumentPreview({ knowledgeBaseId, docId, onReprocessWithOcr }: DocumentPreviewProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['document-chunks', docId],
    queryFn: () => listDocumentChunks(knowledgeBaseId, docId),
    staleTime: Infinity,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" className="text-muted-foreground" />
      </div>
    )
  }

  const chunks = result?.success ? result.data.chunks : []

  return (
    <div className="space-y-2">
      {chunks.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">No extracted text found.</p>
      ) : (
        <>
          {chunks.map((chunk) => (
            <div key={chunk.chunk_index} className="rounded-md border border-border bg-muted/50 p-3">
              {chunk.page_number != null && (
                <p className="mb-1 text-xs font-medium text-muted-foreground">Page {chunk.page_number}</p>
              )}
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                {chunk.content}
              </p>
            </div>
          ))}
          <p className="text-xs italic text-muted-foreground">
            {chunks.length} chunk{chunks.length !== 1 ? 's' : ''} extracted
          </p>
        </>
      )}

      {onReprocessWithOcr && (
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <p className="flex-1 text-xs text-muted-foreground">
            Text looks wrong or missing? Re-extract using OCR (for locked or scanned PDFs).
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs"
            onClick={onReprocessWithOcr}
          >
            Extract with OCR
          </Button>
        </div>
      )}
    </div>
  )
}
