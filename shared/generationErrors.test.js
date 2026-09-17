import { describe, expect, test } from 'vitest'
import { generationLimitMessage, generationReasonCode, generationReasonMessage, GENERATION_REASON_CODES } from './generationErrors.js'

const unexpected = 'Something unexpected went wrong.'

describe('generation reasons', () => {
  test('uncertain jobs explain their unknown reason, failed jobs their error code', () => {
    expect(generationReasonCode({ status: 'unknown', unknownReason: 'provider_timeout', errorCode: null })).toBe('provider_timeout')
    expect(generationReasonCode({ status: 'unknown', unknownReason: null, errorCode: 'outcome_unknown' })).toBe('outcome_unknown')
    // A job marked as failed keeps the reason its outcome was uncertain; a later known result wins otherwise.
    expect(generationReasonCode({ status: 'failed', resolution: 'marked_failed', unknownReason: 'provider_timeout', errorCode: null })).toBe('provider_timeout')
    expect(generationReasonCode({ status: 'failed', resolution: null, unknownReason: 'timeout_recovery', errorCode: 'invalid_output' })).toBe('invalid_output')
    expect(generationReasonCode({ status: 'failed', unknownReason: null, errorCode: 'provider_rejected' })).toBe('provider_rejected')
    expect(generationReasonCode({ status: 'succeeded', unknownReason: null, errorCode: null })).toBeNull()
    expect(generationReasonMessage({ status: 'unknown', unknownReason: 'provider_timeout' }))
      .toBe('The AI service did not answer within the time limit, so we cannot tell whether it finished.')
  })

  test('every stored code has a plain-language message without codes or provider text', () => {
    for (const code of GENERATION_REASON_CODES) {
      const message = generationReasonMessage({ status: 'failed', errorCode: code })
      expect(message, code).not.toBe(unexpected)
      expect(message, code).toMatch(/^[A-Z].*\.$/)
      expect(message, code).not.toMatch(/_/)
    }
  })

  test('limit codes keep their existing guidance', () => {
    for (const code of ['quota_exhausted', 'billing_required', 'rate_limited']) {
      expect(generationReasonMessage({ status: 'failed', errorCode: code })).toBe(generationLimitMessage(code))
    }
  })

  test('unmapped codes fall back to a generic message and jobs without a problem have none', () => {
    expect(generationReasonMessage({ status: 'failed', errorCode: 'something_new' })).toBe(unexpected)
    expect(generationReasonMessage({ status: 'unknown', unknownReason: null, errorCode: null })).toBe(unexpected)
    expect(generationReasonMessage({ status: 'pending' })).toBeNull()
    expect(generationReasonMessage({ status: 'succeeded' })).toBeNull()
    expect(generationReasonMessage(null)).toBeNull()
  })
})
