const BLOCKED_PATHS = ['/api', '/healthz', '/readyz']
const BUNDLED_ASSET_PATHS = ['/assets/', '/fonts/', '/src/', '/@fs/', '/@id/']
const BUNDLED_ASSET_EXTENSIONS = /\.(?:css|js|jsx|mjs|png|jpe?g|gif|svg|webp|woff2?|ttf|ico|mp4)(?:$|\?)/i

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
    const isBundledAsset = BUNDLED_ASSET_PATHS.some(path => url.pathname.startsWith(path)) || BUNDLED_ASSET_EXTENSIONS.test(url.pathname)
    const blocked = url.origin !== origin || BLOCKED_PATHS.some(path => url.pathname === path || url.pathname.startsWith(`${path}/`)) || !isBundledAsset
    if (blocked) return Promise.reject(blockedError(url.href))
    return fetchImpl(input, init)
  }
  globalThis.fetch = guardedFetch
  return () => { if (globalThis.fetch === guardedFetch) globalThis.fetch = originalFetch }
}
