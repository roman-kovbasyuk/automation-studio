const origin = 'https://generativelanguage.googleapis.com'
export const VEO_MODEL = 'veo-3.1-lite-generate-preview'
export const VEO_OUTPUT = Object.freeze({ durationSeconds: 4, resolution: '720p', sampleCount: 1 })
export const MAX_VIDEO_BYTES = 16 * 1024 * 1024

const messages = Object.freeze({
  not_connected: 'Connect video generation before continuing.',
  access_denied: 'This credential cannot access the video model.',
  quota_exhausted: 'Video quota is exhausted. No automatic retry was made.',
  model_unavailable: 'The configured video model is unavailable.',
  invalid_request: 'The video request is not supported.',
  invalid_operation: 'The saved video operation is invalid.',
  invalid_download: 'The video download location is invalid.',
  invalid_output: 'The provider did not return a valid video result.',
  outcome_unknown: 'Video submission is unconfirmed. Check the original job before trying again.',
  provider_unavailable: 'Video status is temporarily unavailable. Check the same job again.',
})
export class VeoProviderError extends Error {
  constructor(code) { super(messages[code]); this.name = 'VeoProviderError'; this.code = code }
}
const fail = code => { throw new VeoProviderError(code) }

async function readBounded(response, maximumBytes) {
  if (Number(response.headers.get('content-length')) > maximumBytes) {
    await response.body?.cancel().catch(() => {})
    fail('invalid_output')
  }
  const parts = []
  let length = 0
  if (!response.body) fail('invalid_output')
  const reader = response.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maximumBytes) fail('invalid_output')
      parts.push(Buffer.from(value))
    }
    return Buffer.concat(parts)
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}

// These methods perform exactly one request per call. Durable job ownership,
// authorization, spending consent and scheduling belong to the service layer.
export function createVeoProvider({ apiKey, model = VEO_MODEL, fetchImpl = fetch, timeoutMs = 60_000, maximumVideoBytes = MAX_VIDEO_BYTES } = {}) {
  if (!apiKey?.trim()) fail('not_connected')
  if (model !== VEO_MODEL) fail('model_unavailable')
  if (typeof fetchImpl !== 'function' || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000
    || !Number.isSafeInteger(maximumVideoBytes) || maximumVideoBytes < 1 || maximumVideoBytes > MAX_VIDEO_BYTES) throw new TypeError('Invalid video transport limits')
  const operationPattern = new RegExp(`^models/${model.replaceAll('.', '\\.')}\\/operations/[A-Za-z0-9_-]{1,200}$`)
  const validateOperation = value => { if (typeof value !== 'string' || !operationPattern.test(value)) fail('invalid_operation'); return value }
  const signalFor = signal => signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs)
  const classifyStatus = (status, submitting) => ({ 400: 'invalid_request', 401: 'not_connected', 403: 'access_denied', 404: 'model_unavailable', 429: 'quota_exhausted' })[status]
    ?? (submitting ? 'outcome_unknown' : 'provider_unavailable')
  async function request(path, body, signal) {
    const submitting = body !== undefined
    try {
      const response = await fetchImpl(`${origin}/v1beta/${path}`, {
        method: submitting ? 'POST' : 'GET', redirect: 'error', signal: signalFor(signal),
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        ...(submitting ? { body: JSON.stringify(body) } : {}),
      })
      if (!response.ok) { await response.body?.cancel().catch(() => {}); fail(classifyStatus(response.status, submitting)) }
      return JSON.parse((await readBounded(response, 512 * 1024)).toString('utf8'))
    } catch (error) {
      if (error instanceof VeoProviderError) throw error
      fail(submitting ? 'outcome_unknown' : 'provider_unavailable')
    }
  }
  function downloadUrl(value, initial = false) {
    let url
    try { url = new URL(value) } catch { fail('invalid_download') }
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || (url.hostname !== 'generativelanguage.googleapis.com' && (initial || url.hostname !== 'storage.googleapis.com'))
      || [...url.searchParams.keys()].some(key => /key|token|authorization/i.test(key))) fail('invalid_download')
    return url
  }
  return Object.freeze({
    model,
    output: VEO_OUTPUT,
    async check({ signal } = {}) {
      const response = await request(`models/${model}`, undefined, signal)
      return { available: response.name === `models/${model}` && response.supportedGenerationMethods?.includes('predictLongRunning') === true, model }
    },
    async submit({ prompt, aspectRatio = '16:9', image }, { signal } = {}) {
      if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000 || !['16:9', '9:16'].includes(aspectRatio)) fail('invalid_request')
      if (image && (!['image/png', 'image/jpeg'].includes(image.mimeType) || !(image.bytes instanceof Uint8Array) || image.bytes.byteLength > 5 * 1024 * 1024)) fail('invalid_request')
      const response = await request(`models/${model}:predictLongRunning`, {
        instances: [{ prompt: prompt.trim(), ...(image ? { image: { bytesBase64Encoded: Buffer.from(image.bytes).toString('base64'), mimeType: image.mimeType } } : {}) }],
        parameters: { ...VEO_OUTPUT, aspectRatio },
      }, signal)
      // A successful HTTP response without a usable operation is ambiguous.
      if (!operationPattern.test(response.name ?? '')) fail('outcome_unknown')
      return { operationName: response.name }
    },
    async poll(operationName, { signal } = {}) {
      validateOperation(operationName)
      const response = await request(operationName, undefined, signal)
      if (response.name !== operationName) fail('invalid_operation')
      if (!response.done) return { state: 'running', operationName }
      if (response.error) return { state: 'failed', operationName, errorCode: 'provider_failed' }
      const result = response.response?.generateVideoResponse
      if (result?.raiMediaFilteredCount > 0) return { state: 'blocked', operationName, errorCode: 'provider_blocked' }
      const videos = result?.generatedSamples
      if (!Array.isArray(videos) || videos.length !== 1 || !videos[0]?.video?.uri) fail('invalid_output')
      const downloadUri = downloadUrl(videos[0].video.uri, true).href
      return { state: 'retrieving', operationName, downloadUri }
    },
    async download(uri, { signal } = {}) {
      let url = downloadUrl(uri, true)
      const requestSignal = signalFor(signal)
      try {
        for (let redirect = 0; redirect <= 3; redirect += 1) {
          const response = await fetchImpl(url.href, { method: 'GET', redirect: 'manual', signal: requestSignal,
            headers: url.hostname === 'generativelanguage.googleapis.com' ? { 'x-goog-api-key': apiKey } : {} })
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            await response.body?.cancel().catch(() => {})
            const location = response.headers.get('location')
            if (!location) fail('invalid_download')
            url = downloadUrl(new URL(location, url).href)
            continue
          }
          if (!response.ok) { await response.body?.cancel().catch(() => {}); fail('provider_unavailable') }
          return await readBounded(response, maximumVideoBytes)
        }
        fail('invalid_download')
      } catch (error) {
        if (error instanceof VeoProviderError) throw error
        fail('provider_unavailable')
      }
    },
  })
}
