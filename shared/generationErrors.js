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
