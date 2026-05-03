'use client'

import { useCallback, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@sage/types'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatBytes } from '@/lib/utils'
import { uploadDocument } from '@/lib/api/documents'

const ACCEPTED_TYPES = Object.keys(SUPPORTED_MIME_TYPES).join(',')

interface UploadItem {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface DocumentUploaderProps {
  knowledgeBaseId: string
}

export function DocumentUploader({ knowledgeBaseId }: DocumentUploaderProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [queue, setQueue] = useState<UploadItem[]>([])

  const uploadMutation = useMutation({
    mutationFn: ({ file }: { file: File }) => uploadDocument(knowledgeBaseId, file),
  })

  const processQueue = useCallback(
    async (files: File[]) => {
      const items: UploadItem[] = files.map((f) => ({ file: f, status: 'pending' }))
      setQueue((prev) => [...prev, ...items])

      for (const file of files) {
        setQueue((prev) =>
          prev.map((item) => (item.file === file ? { ...item, status: 'uploading' } : item)),
        )

        const result = await uploadMutation.mutateAsync({ file })

        if (result.success) {
          setQueue((prev) =>
            prev.map((item) => (item.file === file ? { ...item, status: 'done' } : item)),
          )
          void queryClient.invalidateQueries({ queryKey: ['documents', knowledgeBaseId] })
          void queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
        } else {
          setQueue((prev) =>
            prev.map((item) =>
              item.file === file
                ? { ...item, status: 'error', error: result.error.message }
                : item,
            ),
          )
        }
      }

      // Clear done items after a delay
      setTimeout(() => {
        setQueue((prev) => prev.filter((item) => item.status !== 'done'))
      }, 3_000)
    },
    [uploadMutation, queryClient, knowledgeBaseId],
  )

  function validateFiles(files: FileList | null): File[] {
    if (!files) return []
    const valid: File[] = []
    for (const file of Array.from(files)) {
      if (!Object.keys(SUPPORTED_MIME_TYPES).includes(file.type)) continue
      if (file.size > MAX_FILE_SIZE_BYTES) continue
      valid.push(file)
    }
    return valid
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = validateFiles(e.target.files)
    if (files.length) void processQueue(files)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const files = validateFiles(e.dataTransfer.files)
    if (files.length) void processQueue(files)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <svg
          className="h-10 w-10 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <div className="text-center">
          <p className="text-sm text-foreground">
            Drop files here or{' '}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => inputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, DOCX, TXT, MD, XLSX, CSV, images, video · up to {formatBytes(MAX_FILE_SIZE_BYTES)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="sr-only"
          onChange={handleChange}
        />
      </div>

      {queue.length > 0 && (
        <div className="flex flex-col gap-1">
          {queue.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              {item.status === 'uploading' && <Spinner size="sm" className="text-primary" />}
              {item.status === 'done' && (
                <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {item.status === 'error' && (
                <svg className="h-4 w-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {item.status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-foreground">{item.file.name}</p>
                {item.error && <p className="text-xs text-destructive">{item.error}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
