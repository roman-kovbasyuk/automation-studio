import { afterEach, describe, expect, test, vi } from 'vitest'
import { installPrototypeNetworkGuard } from './networkGuard.js'

describe('prototype network guard', () => {
  afterEach(() => vi.restoreAllMocks())

  test('rejects API requests without calling the network', async () => {
    const fetchImpl = vi.fn()
    const restore = installPrototypeNetworkGuard({ origin: location.origin, fetchImpl })
    try {
      await expect(fetch('/api/v1/session')).rejects.toMatchObject({ code: 'prototype_network_blocked' })
      expect(fetchImpl).not.toHaveBeenCalled()
    } finally {
      restore()
    }
  })

  test('rejects service probes and external URLs while preserving allowed requests', async () => {
    const response = new Response('asset', { status: 200 })
    const fetchImpl = vi.fn(async () => response)
    const restore = installPrototypeNetworkGuard({ origin: location.origin, fetchImpl })
    try {
      await expect(fetch('/healthz')).rejects.toMatchObject({ code: 'prototype_network_blocked' })
      await expect(fetch('/readyz')).rejects.toMatchObject({ code: 'prototype_network_blocked' })
      await expect(fetch('https://example.test/image.png')).rejects.toMatchObject({ code: 'prototype_network_blocked' })
      await expect(fetch('/assets/sample.png', { signal: new AbortController().signal })).resolves.toBe(response)
      expect(fetchImpl).toHaveBeenCalledWith('/assets/sample.png', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    } finally {
      restore()
    }
  })
})
