// Safe guidance shared by provider normalization and persisted-job views.
// Provider messages and details must never be displayed directly.
const limitMessages = Object.freeze({
  quota_exhausted: 'Google generation quota is exhausted or unavailable for this model. Check your project limits before trying again.',
  billing_required: 'This model requires billing-enabled Google access. Check your project billing before trying again.',
  rate_limited: 'Google is temporarily rate limiting generation. Wait before trying again.',
})

export function generationLimitMessage(code) {
  return Object.hasOwn(limitMessages, code) ? limitMessages[code] : null
}

const timedOut = 'The AI service did not answer within the time limit, so we cannot tell whether it finished.'
const interrupted = 'The connection to the AI service was interrupted after the request was sent, so we cannot tell whether it finished.'
const restarted = 'The server restarted while waiting for the result.'
const notSaved = 'The result arrived but could not be saved.'
const notConfigured = 'Generation is not set up, or its AI connection changed before the request was sent.'
const notConnected = 'Video generation is not connected.'
const wrongFormat = 'The request or the AI result was not in the expected format.'

// Every code stored as a job's unknown reason or error code (image, text and video jobs).
const reasonMessages = Object.freeze({
  ...limitMessages,
  provider_timeout: timedOut,
  operation_timeout: timedOut,
  provider_call_ambiguous: interrupted,
  outcome_unknown: interrupted,
  timeout_recovery: restarted,
  ownership_recovery_timeout: restarted,
  asset_object_exists: notSaved,
  asset_upload_timeout: notSaved,
  asset_upload_ambiguous: notSaved,
  asset_readback_failed: notSaved,
  asset_persistence_declined: notSaved,
  asset_persistence_timeout: notSaved,
  asset_persistence_ambiguous: notSaved,
  legacy_image_dimensions_unavailable: notSaved,
  legacy_image_provenance_unresolved: notSaved,
  provider_identity_mismatch: 'The answer came from a different AI model or account than expected, so it was not used.',
  provider_configuration: notConfigured,
  provider_configuration_missing: notConfigured,
  credential_version_changed: notConfigured,
  invalid_key: 'The saved AI credential was rejected.',
  provider_unavailable: 'The AI service is temporarily unavailable.',
  provider_rejected: 'The AI service rejected the request.',
  access_denied: 'The AI service denied access to this request.',
  model_unavailable: 'The requested AI model is not available.',
  invalid_request: wrongFormat,
  invalid_output: wrongFormat,
  invalid_copy_evidence: 'The analysis quoted wording that is not in the materials, so it was not used.',
  provider_blocked: 'The AI service blocked this request for safety reasons.',
  provider_failed: 'The video service reported an error.',
  not_connected: notConnected,
  video_not_connected: notConnected,
  dispatch_unavailable: 'Video generation was unavailable when the job was ready to start.',
  over_budget: 'The daily generation budget would have been exceeded.',
  source_changed: 'The source changed before generation started, so nothing was generated.',
  cancelled: 'The job was cancelled.',
  brief_source_changed: 'The brief changed during generation, so the result was not used.',
  brief_preparation_failed: 'The brief could not be prepared for generation.',
})

export const GENERATION_REASON_CODES = Object.freeze(Object.keys(reasonMessages))

const unexpected = 'Something unexpected went wrong.'

/** The code that explains a job's problem, or null when it has none. */
export function generationReasonCode(job) {
  if (job?.status === 'unknown' || (job?.status === 'failed' && job.resolution === 'marked_failed')) {
    return job.unknownReason ?? job.errorCode ?? null
  }
  if (job?.status === 'failed' || job?.status === 'blocked') return job.errorCode ?? job.unknownReason ?? null
  return null
}

/** Plain-language reason for a failed, blocked or uncertain job; never a raw code or provider text. */
export function generationReasonMessage(job) {
  if (!['unknown', 'failed', 'blocked'].includes(job?.status)) return null
  const code = generationReasonCode(job)
  return code && Object.hasOwn(reasonMessages, code) ? reasonMessages[code] : unexpected
}
