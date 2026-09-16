import { describe, expect, test, vi } from 'vitest'
import { createStudioApi, StudioApiError } from './api.js'

describe('Studio HTTP client', () => {
  test('reads generation readiness through the authenticated endpoint', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ state: 'paused', spendingControl: 'external' })))
    const api = createStudioApi({ fetchImpl })

    await expect(api.getGenerationReadiness()).resolves.toMatchObject({ state: 'paused', spendingControl: 'external' })
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/me/ai/readiness', expect.objectContaining({ method: 'GET' }))
  })

  test('reads and updates only the authenticated personal profile', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ profile: { firstName: 'Roman' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ firstName: 'Romy', lastName: 'Kovbasyuk' })))
    const api = createStudioApi({ fetchImpl })

    await api.getPersonalSettings()
    await api.updatePersonalProfile({ firstName: 'Romy', lastName: 'Kovbasyuk' })

    expect(fetchImpl.mock.calls[0][0]).toBe('/api/v1/me/settings')
    expect(fetchImpl.mock.calls[0][1].method).toBe('GET')
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/v1/me/profile')
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ firstName: 'Romy', lastName: 'Kovbasyuk' }) })
  })
  test('approves the exact encoded candidate with a revision-protected PUT', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: 'campaign/1' })))
    const api = createStudioApi({ fetchImpl })
    await api.approveCopy('campaign/1', 'job:copy/2', 7)
    const [url, request] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/v1/campaigns/campaign%2F1/copies/job%3Acopy%2F2/approval')
    expect(request.method).toBe('PUT')
    expect(request.body).toBe('{}')
    expect(request.headers.get('if-match')).toBe('"7"')
  })
  test.each(['getWorkspace', 'getJob', 'getReview', 'getDelivery', 'getAssetBlob'])(
    '%s forwards cancellation to the authenticated read', async method => {
      const controller = new AbortController()
      const fetchImpl = vi.fn(async (_url, options) => {
        expect(options.signal).toBe(controller.signal)
        throw controller.signal.reason
      })
      const api = createStudioApi({ fetchImpl })
      controller.abort()
      await expect(api[method]('resource-1', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    },
  )
  test('posts brief files to the authenticated extraction endpoint', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ text: 'Extracted copy' })))
    const api = createStudioApi({ fetchImpl, getToken: () => 'token' })

    await expect(api.extractBriefFile({ name: 'brief.md', mimeType: 'text/markdown', data: 'IyBMYXVuY2g=' }))
      .resolves.toEqual({ text: 'Extracted copy' })
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/brief-files/extract', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'brief.md', mimeType: 'text/markdown', data: 'IyBMYXVuY2g=' }),
    }))
  })
  test('uses dedicated campaign duplicate and revision-protected delete endpoints', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'copy', title: 'Autumn copy' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const api = createStudioApi({ fetchImpl })

    await api.duplicateCampaign('campaign/1')
    await api.deleteCampaign('campaign/1', 4)

    expect(fetchImpl.mock.calls[0][0]).toBe('/api/v1/campaigns/campaign%2F1/duplicate')
    expect(fetchImpl.mock.calls[0][1].method).toBe('POST')
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/v1/campaigns/campaign%2F1')
    expect(fetchImpl.mock.calls[1][1].method).toBe('DELETE')
    expect(fetchImpl.mock.calls[1][1].headers.get('if-match')).toBe('"4"')
  })
  test('sends token, local headers, exact revision and retry identity', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ campaign: { revision: 8 } })))
    const api = createStudioApi({ fetchImpl, getToken: () => 'token', getHeaders: () => ({ 'X-Studio-Demo-Role': 'marketer' }), baseUrl: 'http://localhost:3010/' })
    await api.createVersion('campaign/a', {}, 7, 'same-retry-key')
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://localhost:3010/api/v1/campaigns/campaign%2Fa/versions')
    expect(Object.fromEntries(options.headers)).toMatchObject({ authorization: 'Bearer token', 'if-match': '"7"', 'idempotency-key': 'same-retry-key', 'x-studio-demo-role': 'marketer' })
    expect(options.body).toBe('{}')
  })
  test('preserves actionable conflict details and request id', async () => {
    const api = createStudioApi({ fetchImpl: async () => new Response(JSON.stringify({ code: 'revision_conflict', message: 'Reload this campaign', details: { revision: 3 }, requestId: 'trace-1' }), { status: 409 }) })
    await expect(api.patchCampaign('c', { title: 'New' }, 2)).rejects.toMatchObject({ name: 'StudioApiError', status: 409, code: 'revision_conflict', details: { revision: 3 }, requestId: 'trace-1' })
  })
  test('handles non-JSON upstream failure without masking status', async () => {
    const api = createStudioApi({ fetchImpl: async () => new Response('Bad gateway', { status: 502 }) })
    await expect(api.getSession()).rejects.toBeInstanceOf(StudioApiError)
  })
  test('passes cancellation and never retries a mutation automatically', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchImpl = vi.fn(async (_url, { signal }) => { throw signal.reason })
    const api = createStudioApi({ fetchImpl })
    await expect(api.request('POST', '/api/v1/campaigns', { body: {}, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  test('downloads a ZIP with authentication through the asset endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ asset: { id: 'zip-1' } }))).mockResolvedValueOnce(new Response('zip', { headers: { 'Content-Type': 'application/zip' } }))
    const api = createStudioApi({ fetchImpl, getToken: async () => 'private' })
    const blob = await api.downloadDelivery('v1')
    expect(blob.size).toBe(3)
    expect(blob.type).toBe('application/zip')
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/v1/assets/zip-1')
    expect(fetchImpl.mock.calls[1][1].headers.get('authorization')).toBe('Bearer private')
  })
  test('rejects unknown commands and invalid revisions before HTTP', async () => {
    const fetchImpl = vi.fn()
    const api = createStudioApi({ fetchImpl })
    expect(() => api.generate('c', '__proto__')).toThrow('Unknown generation step')
    expect(() => api.review('v', 'delete')).toThrow('Unknown review action')
    await expect(api.patchCampaign('c', {}, -1)).rejects.toThrow('revision')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  test('uses revision-safe brand design system endpoints', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: 'brand-1', revision: 3 })))
    const api = createStudioApi({ fetchImpl })
    await api.getBrandSystemConfig()
    await api.listBrandSystems()
    await api.createBrandSystem({ name: 'Northstar' })
    await api.getBrandSystem('brand/1')
    await api.inspectBrandSources('brand/1')
    await api.patchBrandDraft('brand/1', { name: 'Northstar' }, 2)
    await api.addBrandSource('brand/1', { kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/a' }, 3)
    await api.addBrandAsset('brand/1', { name: 'logo.png', kind: 'logo', mimeType: 'image/png', data: 'iVBORwE=' }, 4)
    await api.getBrandAssetBlob('brand/1', 'asset/1')
    await api.analyseBrandSources('brand/1', 4)
    await api.listBrandVersions('brand/1')
    await api.restoreBrandVersion('brand/1', 'version/1', 5)
    await api.publishBrandSystem('brand/1', 3, 'publish-1')
    await api.proposeBrandChange('brand/1', 'Make type smaller')
    await api.applyBrandProposal('brand/1', 'proposal/1', 3)
    await api.discardBrandProposal('brand/1', 'proposal/1')

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/brand-design-systems/config', '/api/v1/brand-design-systems', '/api/v1/brand-design-systems',
      '/api/v1/brand-design-systems/brand%2F1', '/api/v1/brand-design-systems/brand%2F1/sources/inspect', '/api/v1/brand-design-systems/brand%2F1/draft',
      '/api/v1/brand-design-systems/brand%2F1/sources', '/api/v1/brand-design-systems/brand%2F1/assets', '/api/v1/brand-design-systems/brand%2F1/assets/asset%2F1', '/api/v1/brand-design-systems/brand%2F1/analyse',
      '/api/v1/brand-design-systems/brand%2F1/versions', '/api/v1/brand-design-systems/brand%2F1/versions/version%2F1/restore',
      '/api/v1/brand-design-systems/brand%2F1/publish', '/api/v1/brand-design-systems/brand%2F1/proposals',
      '/api/v1/brand-design-systems/brand%2F1/proposals/proposal%2F1/apply',
      '/api/v1/brand-design-systems/brand%2F1/proposals/proposal%2F1/discard',
    ])
    expect(fetchImpl.mock.calls[5][1].headers.get('if-match')).toBe('"2"')
    expect(fetchImpl.mock.calls[6][1].headers.get('if-match')).toBe('"3"')
    expect(fetchImpl.mock.calls[7][1].headers.get('if-match')).toBe('"4"')
    expect(fetchImpl.mock.calls[9][1].headers.get('if-match')).toBe('"4"')
    expect(fetchImpl.mock.calls[11][1].headers.get('if-match')).toBe('"5"')
    expect(fetchImpl.mock.calls[12][1].headers.get('idempotency-key')).toBe('publish-1')
  })
})
