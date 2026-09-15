const BLOCKED_PATHS = ['/api', '/healthz', '/readyz']

function blockedError(url) {
  const error = new Error(`Prototype network access blocked: ${url}`)
  error.code = 'prototype_network_blocked'
  return error
}

export function installPrototypeNetworkGuard({ origin = globalThis.location?.origin, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.')
  const originalFetch = globalThis.fetch
  const guardedFetch = (input, init) => {
    const rawUrl = typeof input === 'string' || input instanceof URL ? input.toString() : input?.url
    let url
    try { url = new URL(rawUrl, origin) } catch { return Promise.reject(blockedError(rawUrl || 'unknown URL')) }
    const blocked = url.origin !== origin || BLOCKED_PATHS.some(path => url.pathname === path || url.pathname.startsWith(`${path}/`))
    if (blocked) return Promise.reject(blockedError(url.href))
    return fetchImpl(input, init)
  }
  globalThis.fetch = guardedFetch
  return () => { if (globalThis.fetch === guardedFetch) globalThis.fetch = originalFetch }
}
