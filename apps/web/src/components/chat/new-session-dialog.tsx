'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { RESPONSE_MODE_LABELS, RESPONSE_MODE_DESCRIPTIONS, type ResponseMode } from '@sage/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { listKnowledgeBases } from '@/lib/api/knowledge-bases'
import { createSession } from '@/lib/api/sessions'

const MODES = Object.keys(RESPONSE_MODE_LABELS) as ResponseMode[]

interface NewSessionDialogProps {
  open: boolean
  onClose: () => void
  defaultKnowledgeBaseId?: string
}

export function NewSessionDialog({ open, onClose, defaultKnowledgeBaseId }: NewSessionDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [kbId, setKbId] = useState(defaultKnowledgeBaseId ?? '')
  const [mode, setMode] = useState<ResponseMode>('PROFESSIONAL')

  const { data: kbResult } = useQuery({
    queryKey: ['knowledge-bases', 1, 50],
    queryFn: () => listKnowledgeBases(1, 50),
    staleTime: 30_000,
    enabled: open,
  })

  const knowledgeBases = kbResult?.success
    ? kbResult.data.items.filter((kb) => kb.readyDocumentCount > 0)
    : []

  const mutation = useMutation({
    mutationFn: () =>
      createSession({ knowledgeBaseId: kbId || undefined, mode }),
    onSuccess: (result) => {
      if (!result.success) return
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onClose()
      router.push(`/dashboard/sessions/${result.data.id}`)
    },
  })

  function handleClose() {
    setKbId(defaultKnowledgeBaseId ?? '')
    setMode('PROFESSIONAL')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New chat session"
      description="Choose a knowledge base and response style."
    >
      <div className="flex flex-col gap-4">
        {/* Knowledge base selector */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Knowledge base</label>
          <select
            value={kbId}
            onChange={(e) => setKbId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">None (general chat)</option>
            {knowledgeBases.map((kb) => (
              <option key={kb.id} value={kb.id}>
                {kb.name} ({kb.readyDocumentCount} docs)
              </option>
            ))}
          </select>
        </div>

        {/* Response mode */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Response style</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
                  mode === m
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                }`}
              >
                <span className="text-sm font-medium">{RESPONSE_MODE_LABELS[m]}</span>
                <span className="mt-0.5 text-xs">{RESPONSE_MODE_DESCRIPTIONS[m]}</span>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Start chat
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  )
}
