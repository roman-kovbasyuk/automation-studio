import { describe, expect, test } from 'vitest'
import { safeErrorMessage, UNEXPECTED_ERROR_MESSAGE } from './safeErrorMessage.js'

describe('safe error messages', () => {
  test('programming faults are replaced with a generic message', () => {
    expect(safeErrorMessage(new TypeError('api.listVideoJobs is not a function'))).toBe(UNEXPECTED_ERROR_MESSAGE)
    expect(safeErrorMessage(new ReferenceError('draft is not defined'))).toBe(UNEXPECTED_ERROR_MESSAGE)
  })
  test('intentional errors, coded errors and strings keep their wording', () => {
    expect(safeErrorMessage(new Error('The file could not be read. Try attaching it again.'))).toBe('The file could not be read. Try attaching it again.')
    expect(safeErrorMessage(Object.assign(new TypeError('Choose a PNG file.'), { code: 'invalid_image' }))).toBe('Choose a PNG file.')
    expect(safeErrorMessage({ code: 'generation_failed', message: 'Copy generation failed. The AI service rejected the request.' }))
      .toBe('Copy generation failed. The AI service rejected the request.')
    expect(safeErrorMessage('Plain text')).toBe('Plain text')
    expect(safeErrorMessage(null)).toBe(UNEXPECTED_ERROR_MESSAGE)
  })
})
