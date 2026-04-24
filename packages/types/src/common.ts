import { z } from 'zod'

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

export const PaginatedResponseSchema = <TItemSchema extends z.ZodTypeAny>(
  itemSchema: TItemSchema,
) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    hasNextPage: z.boolean(),
  })

export const CuidSchema = z.string().cuid()
