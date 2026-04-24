import { z } from 'zod'

export const ResponseModeSchema = z.enum([
  'PROFESSIONAL',
  'ACADEMIC',
  'CASUAL',
  'TECHNICAL',
  'SIMPLIFIED',
])
export type ResponseMode = z.infer<typeof ResponseModeSchema>

// Display labels — colocated with the enum so they stay in sync
export const RESPONSE_MODE_LABELS: Record<ResponseMode, string> = {
  PROFESSIONAL: 'Professional',
  ACADEMIC: 'Academic',
  CASUAL: 'Casual',
  TECHNICAL: 'Technical',
  SIMPLIFIED: 'Simplified',
}

export const RESPONSE_MODE_DESCRIPTIONS: Record<ResponseMode, string> = {
  PROFESSIONAL: 'Concise, business-appropriate responses',
  ACADEMIC: 'Structured, scholarly with cited sources',
  CASUAL: 'Conversational and friendly',
  TECHNICAL: 'Detailed, precise, developer-focused',
  SIMPLIFIED: 'Plain English, easy-to-understand analogies',
}

export const SessionSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(100),
  mode: ResponseModeSchema,
  knowledgeBaseId: z.string().cuid().nullable(),
  knowledgeBaseName: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Session = z.infer<typeof SessionSchema>

export const CreateSessionSchema = z.object({
  knowledgeBaseId: z.string().cuid().optional(),
  mode: ResponseModeSchema.default('PROFESSIONAL'),
})
export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>

export const UpdateSessionSchema = z
  .object({
    title: z.string().min(1).max(100).trim().optional(),
    mode: ResponseModeSchema.optional(),
    knowledgeBaseId: z.string().cuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
export type UpdateSessionRequest = z.infer<typeof UpdateSessionSchema>
