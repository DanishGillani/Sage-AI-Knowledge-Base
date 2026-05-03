'use client'

import { useState } from 'react'

import type { Message } from '@sage/types'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'USER'
  const [showSources, setShowSources] = useState(false)

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>

      {/* Source attribution — only for assistant messages with sources */}
      {!isUser && message.sources.length > 0 && (
        <div className="ml-1 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
            <svg
              className={cn('h-3 w-3 transition-transform', showSources && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSources && (
            <div className="flex flex-col gap-2">
              {message.sources.map((source, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-3 text-xs text-foreground"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{source.filename}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {Math.round(source.similarityScore * 100)}% match
                      {source.pageNumber != null && ` · p.${source.pageNumber}`}
                    </span>
                  </div>
                  <p className="mt-1.5 text-muted-foreground line-clamp-3">{source.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
