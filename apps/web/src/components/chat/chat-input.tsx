'use client'

import { useRef } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  loading?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled = false,
  loading = false,
  placeholder = 'Ask a question…',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const value = textareaRef.current?.value.trim()
    if (!value || disabled || loading) return
    onSend(value)
    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div
      className={cn(
        'flex items-end gap-2 rounded-2xl border border-border bg-background px-4 py-2 shadow-sm',
        'focus-within:ring-2 focus-within:ring-ring',
      )}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder={placeholder}
        disabled={disabled || loading}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        className={cn(
          'flex-1 resize-none bg-transparent text-sm text-foreground outline-none',
          'placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'max-h-40',
        )}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || loading}
        className={cn(
          'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
        aria-label="Send message"
      >
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
