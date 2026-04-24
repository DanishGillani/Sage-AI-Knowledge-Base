import type { AppError } from './errors.js'

// Discriminated union — callers must check `success` before accessing data or error.
// Named type params tell readers exactly what flows through each branch.
export type ApiResult<TPayload, TFailure extends AppError = AppError> =
  | { success: true; data: TPayload }
  | { success: false; error: TFailure }

// Constructors — named so usage reads like English at the call site
export const success = <TPayload>(data: TPayload): ApiResult<TPayload, never> => ({
  success: true,
  data,
})

export const failure = <TFailure extends AppError>(
  error: TFailure,
): ApiResult<never, TFailure> => ({
  success: false,
  error,
})

// Type guard — narrows to the success branch
export const isSuccess = <TPayload, TFailure extends AppError>(
  result: ApiResult<TPayload, TFailure>,
): result is { success: true; data: TPayload } => result.success

// Type guard — narrows to the failure branch
export const isFailure = <TPayload, TFailure extends AppError>(
  result: ApiResult<TPayload, TFailure>,
): result is { success: false; error: TFailure } => !result.success

// Maps the success branch, passes failures through untouched
export const mapResult = <TPayload, TMapped, TFailure extends AppError>(
  result: ApiResult<TPayload, TFailure>,
  fn: (data: TPayload) => TMapped,
): ApiResult<TMapped, TFailure> => {
  if (!result.success) return result as ApiResult<TMapped, TFailure>
  return success(fn(result.data))
}
