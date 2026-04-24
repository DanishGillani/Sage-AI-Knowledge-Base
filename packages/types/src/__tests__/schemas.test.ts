import { describe, expect, it } from 'vitest'

import { CreateKnowledgeBaseSchema, KnowledgeBaseSchema } from '../knowledge-base.js'
import { DocumentSchema, FileTypeSchema, ProcessingStatusSchema } from '../document.js'
import { CreateSessionSchema, ResponseModeSchema, UpdateSessionSchema } from '../session.js'
import { SendMessageSchema, SourceSchema } from '../message.js'

describe('KnowledgeBaseSchema', () => {
  it('parses a valid knowledge base', () => {
    const input = {
      id: 'clxxxxxxxxxxxxxxxxxxxxxx',
      name: 'Engineering Runbooks',
      description: 'Internal ops docs',
      documentCount: 5,
      readyDocumentCount: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const result = KnowledgeBaseSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreateKnowledgeBaseSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 characters', () => {
    const result = CreateKnowledgeBaseSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('allows null description', () => {
    const result = CreateKnowledgeBaseSchema.safeParse({ name: 'Valid Name' })
    expect(result.success).toBe(true)
  })
})

describe('FileTypeSchema', () => {
  it('accepts all supported file types', () => {
    const validTypes = ['PDF', 'DOCX', 'TXT', 'XLSX', 'PNG', 'MP4'] as const
    validTypes.forEach((type) => {
      expect(FileTypeSchema.safeParse(type).success).toBe(true)
    })
  })

  it('rejects unsupported file types', () => {
    expect(FileTypeSchema.safeParse('EXE').success).toBe(false)
    expect(FileTypeSchema.safeParse('ZIP').success).toBe(false)
    expect(FileTypeSchema.safeParse('').success).toBe(false)
  })
})

describe('ProcessingStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses = ['PENDING', 'PROCESSING', 'READY', 'FAILED'] as const
    statuses.forEach((status) => {
      expect(ProcessingStatusSchema.safeParse(status).success).toBe(true)
    })
  })
})

describe('ResponseModeSchema', () => {
  it('accepts all valid modes', () => {
    const modes = ['PROFESSIONAL', 'ACADEMIC', 'CASUAL', 'TECHNICAL', 'SIMPLIFIED'] as const
    modes.forEach((mode) => {
      expect(ResponseModeSchema.safeParse(mode).success).toBe(true)
    })
  })

  it('rejects invalid modes', () => {
    expect(ResponseModeSchema.safeParse('INFORMAL').success).toBe(false)
  })
})

describe('CreateSessionSchema', () => {
  it('defaults mode to PROFESSIONAL when omitted', () => {
    const result = CreateSessionSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.mode).toBe('PROFESSIONAL')
  })
})

describe('UpdateSessionSchema', () => {
  it('rejects empty objects', () => {
    const result = UpdateSessionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts partial updates', () => {
    expect(UpdateSessionSchema.safeParse({ mode: 'CASUAL' }).success).toBe(true)
    expect(UpdateSessionSchema.safeParse({ title: 'New Title' }).success).toBe(true)
  })
})

describe('SendMessageSchema', () => {
  it('rejects empty messages', () => {
    expect(SendMessageSchema.safeParse({ content: '' }).success).toBe(false)
    expect(SendMessageSchema.safeParse({ content: '   ' }).success).toBe(false)
  })

  it('rejects messages over 10,000 characters', () => {
    expect(SendMessageSchema.safeParse({ content: 'a'.repeat(10_001) }).success).toBe(false)
  })

  it('accepts valid messages', () => {
    expect(SendMessageSchema.safeParse({ content: 'What is LangChain?' }).success).toBe(true)
  })
})

describe('SourceSchema', () => {
  it('rejects similarity scores outside 0-1', () => {
    const base = { documentId: 'clxxxxxxxxxxxxxxxxxxxxxx', filename: 'doc.pdf', pageNumber: 1, excerpt: 'text' }
    expect(SourceSchema.safeParse({ ...base, similarityScore: 1.1 }).success).toBe(false)
    expect(SourceSchema.safeParse({ ...base, similarityScore: -0.1 }).success).toBe(false)
    expect(SourceSchema.safeParse({ ...base, similarityScore: 0.85 }).success).toBe(true)
  })
})
