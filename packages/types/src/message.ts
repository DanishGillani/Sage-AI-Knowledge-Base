import { z } from 'zod'

export const MessageRoleSchema = z.enum(['USER', 'ASSISTANT'])
export type MessageRole = z.infer<typeof MessageRoleSchema>

export const SourceSchema = z.object({
  documentId: z.string().cuid(),
  filename: z.string(),
  pageNumber: z.number().int().positive().nullable(),
  excerpt: z.string(),
  similarityScore: z.number().min(0).max(1),
})
export type Source = z.infer<typeof SourceSchema>

export const MessageSchema = z.object({
  id: z.string().cuid(),
  sessionId: z.string().cuid(),
  role: MessageRoleSchema,
  content: z.string().min(1),
  sources: z.array(SourceSchema),
  createdAt: z.coerce.date(),
})
export type Message = z.infer<typeof MessageSchema>

export const SendMessageSchema = z.object({
  // trim() must precede min() so whitespace-only strings are rejected
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(10_000, 'Message must be 10,000 characters or less'),
})
export type SendMessageRequest = z.infer<typeof SendMessageSchema>

// Shape sent from the BFF to FastAPI — includes resolved context
export const ChatRequestSchema = z.object({
  sessionId: z.string().cuid(),
  message: z.string().min(1).max(10_000),
  knowledgeBaseId: z.string().cuid(),
  mode: z.enum(['PROFESSIONAL', 'ACADEMIC', 'CASUAL', 'TECHNICAL', 'SIMPLIFIED']),
  messageHistory: z.array(
    z.object({
      role: MessageRoleSchema,
      content: z.string(),
    }),
  ),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>
