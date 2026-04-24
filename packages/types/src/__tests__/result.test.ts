import { describe, expect, it } from 'vitest'

import type { AppError } from '../errors.js'
import type { ApiResult } from '../result.js'
import { failure, isFailure, isSuccess, mapResult, success } from '../result.js'

const stubError: AppError = { code: 'INTERNAL_ERROR', message: 'something broke' }

describe('success()', () => {
  it('sets success to true and wraps data', () => {
    const result: ApiResult<{ id: string; name: string }, AppError> = success({
      id: '1',
      name: 'test',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ id: '1', name: 'test' })
  })
})

describe('failure()', () => {
  it('sets success to false and wraps error', () => {
    const result: ApiResult<string, AppError> = failure(stubError)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toEqual(stubError)
  })
})

describe('isSuccess()', () => {
  it('returns true for success results', () => {
    expect(isSuccess(success('value'))).toBe(true)
  })

  it('returns false for failure results', () => {
    expect(isSuccess(failure(stubError))).toBe(false)
  })
})

describe('isFailure()', () => {
  it('returns true for failure results', () => {
    expect(isFailure(failure(stubError))).toBe(true)
  })

  it('returns false for success results', () => {
    expect(isFailure(success('value'))).toBe(false)
  })
})

describe('mapResult()', () => {
  it('transforms the data when success', () => {
    const result = mapResult(success(5), (n) => n * 2)
    expect(result).toEqual(success(10))
  })

  it('passes failures through without calling the mapping function', () => {
    const result = mapResult(failure(stubError), (n: number) => n * 2)
    expect(result).toEqual(failure(stubError))
  })
})
