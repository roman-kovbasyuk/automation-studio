import { describe, expect, test } from 'vitest'
import { generationBlockFor, generationProblemMessage, generationResolvableAt, generationStepName } from './generationStatus.js'

const unknownCopy = { id: 'job-1', step: 'copy', status: 'unknown', unknownReason: 'provider_timeout', errorCode: null, timeoutAt: '2026-09-17T10:00:00.000Z' }

describe('generation status for the interface', () => {
  test('names steps and falls back for unknown ones', () => {
    expect(generationStepName('directions')).toBe('Visual prompt generation')
    expect(generationStepName('something')).toBe('Generation')
  })

  test('an unknown outcome can be marked as failed 40 seconds after its timeout', () => {
    expect(generationResolvableAt(unknownCopy)).toBe(Date.parse('2026-09-17T10:00:40.000Z'))
    expect(generationResolvableAt({ ...unknownCopy, status: 'pending' })).toBeNull()
    expect(generationResolvableAt({ ...unknownCopy, timeoutAt: undefined })).toBeNull()
  })

  test('problem messages give the reason, never a code', () => {
    expect(generationProblemMessage(unknownCopy))
      .toBe('We could not confirm the result. The AI service did not answer within the time limit, so we cannot tell whether it finished.')
    expect(generationProblemMessage({ step: 'copy', status: 'failed', errorCode: 'provider_rejected' }))
      .toBe('Copy generation failed. The AI service rejected the request.')
    expect(generationProblemMessage({ step: 'image', status: 'blocked', errorCode: 'provider_blocked' }))
      .toBe('Image generation was blocked. The AI service blocked this request for safety reasons.')
    expect(generationProblemMessage({ step: 'image', status: 'failed', errorCode: 'something_new' }))
      .toBe('Image generation failed. Something unexpected went wrong.')
  })

  test('only pending and unknown jobs block editing', () => {
    expect(generationBlockFor(unknownCopy)).toEqual({ jobId: 'job-1', status: 'unknown', step: 'copy', name: 'Copy generation',
      reason: 'The AI service did not answer within the time limit, so we cannot tell whether it finished.', resolvableAt: Date.parse('2026-09-17T10:00:40.000Z') })
    expect(generationBlockFor({ ...unknownCopy, status: 'pending' })).toMatchObject({ status: 'pending', reason: null, resolvableAt: null })
    expect(generationBlockFor({ ...unknownCopy, status: 'failed' })).toBeNull()
    expect(generationBlockFor(null)).toBeNull()
  })
})
