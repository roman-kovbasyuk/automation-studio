// Files chosen on Home upload in the project's Brief stage. The names are kept for this
// browser tab so a reload can say which uploads were interrupted; nothing is re-sent.
const key = campaignId => `automation-studio:pending-uploads:${campaignId}`

export function rememberPendingUploads(campaignId, sources = []) {
  if (!sources.length) return
  try { globalThis.sessionStorage?.setItem(key(campaignId), JSON.stringify(sources.map(source => source.name))) } catch { /* Storage may be unavailable. */ }
}

export function readPendingUploads(campaignId) {
  try {
    const names = JSON.parse(globalThis.sessionStorage?.getItem(key(campaignId)) ?? '[]')
    return Array.isArray(names) ? names.filter(name => typeof name === 'string') : []
  } catch { return [] }
}

export function forgetPendingUploads(campaignId) {
  try { globalThis.sessionStorage?.removeItem(key(campaignId)) } catch { /* Storage may be unavailable. */ }
}
