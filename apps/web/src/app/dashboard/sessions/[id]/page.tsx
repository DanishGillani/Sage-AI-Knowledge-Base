'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { RESPONSE_MODE_LABELS } from '@sage/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { MessageBubble } from '@/components/chat/message-bubble'
import { ChatInput } from '@/components/chat/chat-input'
import { getSession, deleteSession } from '@/lib/api/sessions'
import { listMessages, sendMessage } from '@/lib/api/messages'

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [errorBanner, setErrorBanner] = useState('')

  const { data: sessionResult, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id),
    staleTime: 60_000,
  })

  const { data: messagesResult, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => listMessages(id),
    staleTime: 0,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(id, { content }),
    onSuccess: (result) => {
      if (!result.success) {
        const code = result.error.code
        if (code === 'OLLAMA_UNAVAILABLE') {
          setErrorBanner('AI model is unavailable. Make sure Ollama is running.')
        } else if (code === 'NO_KNOWLEDGE_BASE') {
          setErrorBanner('No knowledge base attached to this session.')
        } else {
          setErrorBanner(result.error.message)
        }
        return
      }
      setErrorBanner('')
      void queryClient.invalidateQueries({ queryKey: ['messages', id] })
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      router.push('/dashboard/knowledge-bases')
    },
  })

  const messages = messagesResult?.success ? messagesResult.data : []
  const session = sessionResult?.success ? sessionResult.data : null

  // Scroll to bottom whenever messages change or a send completes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sendMutation.isPending])

  if (sessionLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Session not found.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/knowledge-bases')}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="truncate font-semibold text-foreground">{session.title}</h1>
          <Badge variant="secondary">{RESPONSE_MODE_LABELS[session.mode]}</Badge>
          {session.knowledgeBaseName && (
            <Badge variant="outline" className="hidden sm:inline-flex truncate max-w-[160px]">
              {session.knowledgeBaseName}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (confirm('Delete this session and all its messages?')) {
              deleteMutation.mutate()
            }
          }}
          loading={deleteMutation.isPending}
          aria-label="Delete session"
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
      </header>

      {/* Error banner */}
      {errorBanner && (
        <div className="flex items-center justify-between gap-3 bg-destructive/10 px-6 py-2 text-sm text-destructive">
          <span>{errorBanner}</span>
          <button onClick={() => setErrorBanner('')} aria-label="Dismiss">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-7 w-7 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Start the conversation</p>
              {session.knowledgeBaseName ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask anything about <strong>{session.knowledgeBaseName}</strong>.
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Ask anything.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {sendMutation.isPending && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
                  <Spinner size="sm" className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-6 py-4">
        {!session.knowledgeBaseId && (
          <p className="mb-2 text-center text-xs text-muted-foreground">
            No knowledge base attached — responses will not reference documents.
          </p>
        )}
        <ChatInput
          onSend={(content) => sendMutation.mutate(content)}
          loading={sendMutation.isPending}
          placeholder={
            session.knowledgeBaseId
              ? `Ask about ${session.knowledgeBaseName ?? 'the knowledge base'}…`
              : 'Type a message…'
          }
        />
      </div>
    </div>
  )
}
