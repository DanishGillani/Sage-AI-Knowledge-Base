// Error code discriminator — every error in the system maps to one of these
export type ErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'PROCESSING_ERROR'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'STORAGE_ERROR'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'NO_KNOWLEDGE_BASE'
  | 'OLLAMA_UNAVAILABLE'

// Base — all app errors carry a code and human-readable message
// details is typed as unknown so specific error shapes can use any structure
export interface AppError {
  code: ErrorCode
  message: string
  details?: unknown
}

// Specific error shapes — named so callers know exactly what they're handling
export interface NotFoundError extends AppError {
  code: 'NOT_FOUND'
  details: { resource: string; id: string }
}

export interface ValidationError extends AppError {
  code: 'VALIDATION_ERROR'
  details: { field: string; message: string }[]
}

export interface ProcessingError extends AppError {
  code: 'PROCESSING_ERROR'
  details: { documentId: string; reason: string }
}

export interface UnsupportedFileTypeError extends AppError {
  code: 'UNSUPPORTED_FILE_TYPE'
  details: { received: string; supported: string[] }
}

export interface StorageError extends AppError {
  code: 'STORAGE_ERROR'
}

export interface UnauthorizedError extends AppError {
  code: 'UNAUTHORIZED'
}

export interface RateLimitedError extends AppError {
  code: 'RATE_LIMITED'
  details: { retryAfterMs: number }
}

export interface InternalError extends AppError {
  code: 'INTERNAL_ERROR'
}

export interface NoKnowledgeBaseError extends AppError {
  code: 'NO_KNOWLEDGE_BASE'
}

export interface OllamaUnavailableError extends AppError {
  code: 'OLLAMA_UNAVAILABLE'
}

// Convenience constructors — keeps error creation consistent across the codebase
export const makeNotFoundError = (resource: string, id: string): NotFoundError => ({
  code: 'NOT_FOUND',
  message: `${resource} with id "${id}" was not found`,
  details: { resource, id },
})

export const makeValidationError = (
  fields: { field: string; message: string }[],
): ValidationError => ({
  code: 'VALIDATION_ERROR',
  message: 'One or more fields failed validation',
  details: fields,
})

export const makeUnsupportedFileTypeError = (
  received: string,
  supported: string[],
): UnsupportedFileTypeError => ({
  code: 'UNSUPPORTED_FILE_TYPE',
  message: `File type "${received}" is not supported`,
  details: { received, supported },
})

export const makeInternalError = (message: string): InternalError => ({
  code: 'INTERNAL_ERROR',
  message,
})
