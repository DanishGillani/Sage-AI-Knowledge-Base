import { z } from 'zod'

export const KnowledgeBaseSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500).nullable(),
  documentCount: z.number().int().nonnegative(),
  readyDocumentCount: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>

export const CreateKnowledgeBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  description: z.string().max(500, 'Description must be 500 characters or less').trim().optional(),
})
export type CreateKnowledgeBaseRequest = z.infer<typeof CreateKnowledgeBaseSchema>

export const UpdateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().nullable().optional(),
})
export type UpdateKnowledgeBaseRequest = z.infer<typeof UpdateKnowledgeBaseSchema>
