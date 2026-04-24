import { z } from 'zod'

export const FileTypeSchema = z.enum([
  'PDF',
  'DOC',
  'DOCX',
  'TXT',
  'MD',
  'XLSX',
  'XLS',
  'CSV',
  'JPG',
  'JPEG',
  'PNG',
  'GIF',
  'WEBP',
  'MP4',
  'MOV',
  'AVI',
  'MKV',
])
export type FileType = z.infer<typeof FileTypeSchema>

export const ProcessingStatusSchema = z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED'])
export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>

export const DocumentSchema = z.object({
  id: z.string().cuid(),
  knowledgeBaseId: z.string().cuid(),
  filename: z.string().min(1),
  fileType: FileTypeSchema,
  fileSizeBytes: z.number().int().positive(),
  status: ProcessingStatusSchema,
  pageCount: z.number().int().positive().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
})
export type Document = z.infer<typeof DocumentSchema>

export const DocumentStatusSchema = z.object({
  id: z.string().cuid(),
  status: ProcessingStatusSchema,
  pageCount: z.number().int().positive().nullable(),
  errorMessage: z.string().nullable(),
  progress: z
    .object({
      currentPage: z.number().int().nonnegative().nullable(),
      totalPages: z.number().int().positive().nullable(),
      stage: z.enum(['extracting', 'ocr', 'chunking', 'embedding']).nullable(),
    })
    .nullable(),
})
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>

// Maps MIME types to FileType enum values — single source of truth for upload validation
export const SUPPORTED_MIME_TYPES = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/csv': 'CSV',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'video/mp4': 'MP4',
  'video/quicktime': 'MOV',
  'video/x-msvideo': 'AVI',
  'video/x-matroska': 'MKV',
} as const satisfies Record<string, FileType>

export type SupportedMimeType = keyof typeof SUPPORTED_MIME_TYPES

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB
