import { describe, expect, test, vi } from 'vitest'
import { buildApp } from '../app.js'
import { createEmptyBrandDraft } from '../services/brandDesignSystemService.js'

const actor = { id: 'designer-1', role: 'designer', workspaceId: 'default', displayName: 'Dina Designer', email: 'dina@example.com' }
const brand = {
  id: 'brand-1', workspaceId: 'default', ownerId: actor.id, state: 'draft', revision: 2,
  activeVersionId: null, activeVersion: null, draft: createEmptyBrandDraft('Northstar'),
  createdAt: new Date('2026-09-07T09:00:00.000Z'), updatedAt: new Date('2026-09-07T09:30:00.000Z'),
}

function harness(role = 'designer') {
  const brandDesignSystemService = {
    getConfig: vi.fn(() => ({ limits: { maxFileBytes: 5_242_880, maxSources: 30, maxAssets: 100, maxPdfPages: 200,
      maxImagePixels: 40_000_000, maxImageDimension: 8_192 }, provider: 'mock', model: 'mock-v1' })),
    list: vi.fn(async () => [brand]), get: vi.fn(async () => brand), create: vi.fn(async () => brand),
    grantViewer: vi.fn(async () => {}),
    inspectSources: vi.fn(async () => ({ brandId: brand.id, revision: brand.revision, sources: brand.draft.sources,
      provider: 'mock', model: 'mock-v1', estimatedUsd: 0, thresholdUsd: 2, requiresApproval: false,
      approvalFingerprint: 'a'.repeat(64), pricingAvailable: true })),
    patchDraft: vi.fn(async () => ({ ...brand, revision: 3 })), publish: vi.fn(async () => ({ ...brand, state: 'published', revision: 3 })),
    addSource: vi.fn(async () => ({ ...brand, revision: 3, draft: { ...brand.draft, sources: [{ id: 'source-1', kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/abc', status: 'added' }] } })),
    addAsset: vi.fn(async () => ({ ...brand, revision: 3, draft: { ...brand.draft, assets: [{ id: 'asset-1', name: 'logo.png', kind: 'logo', mimeType: 'image/png', approved: false }] } })),
    analyseSources: vi.fn(async () => ({ ...brand, revision: 3, draft: { ...brand.draft, currentStep: 'review' } })),
    proposeChange: vi.fn(async () => ({ id: 'proposal-1', brandId: brand.id, baseRevision: 2, prompt: 'Warmer',
      operations: [{ operation: 'set_color', tokenId: 'ink', value: '#202830' }], unchanged: ['typography'], state: 'proposed', createdAt: new Date('2026-09-07T10:00:00.000Z') })),
    applyProposal: vi.fn(async () => ({ ...brand, revision: 3 })),
    discardProposal: vi.fn(async () => ({ id: 'proposal-1', brandId: brand.id, baseRevision: 2, prompt: 'Warmer',
      operations: [{ operation: 'set_color', tokenId: 'ink', value: '#202830' }], unchanged: ['typography'], state: 'discarded', createdAt: new Date('2026-09-07T10:00:00.000Z') })),
    listVersions: vi.fn(async () => [{ id: 'version-1', brandId: brand.id, versionNumber: 1, snapshot: brand.draft, publishedBy: actor.id, publishedAt: new Date('2026-09-07T10:00:00.000Z'), schemaVersion: 1 }]),
    restoreVersion: vi.fn(async () => ({ ...brand, revision: 3 })),
    readAsset: vi.fn(async () => ({ id: 'asset-1', name: 'logo.svg', mimeType: 'image/svg+xml', byteSize: 11,
      checksum: 'a'.repeat(64), bytes: Buffer.from('verifiedsvg') })),
  }
  const templateBrandService = { assign: vi.fn(async () => []) }
  const workflowService = { getSession: vi.fn(async () => actor) }
  const app = buildApp({
    resolveActor: vi.fn(async () => ({ ...actor, role })), workflowService, brandDesignSystemService, templateBrandService,
  })
  return { app, brandDesignSystemService, templateBrandService }
}

describe('brand design system routes', () => {
  test.each(['marketer', 'designer', 'admin'])('allows only admin to assign a brand to templates: %s', async role => {
    const { app, templateBrandService } = harness(role)
    try {
      const response = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems/brand-1/templates',
        headers: { authorization: 'Bearer test' }, payload: { templateIds: ['editorial-split'] } })
      expect(response.statusCode).toBe(role === 'admin' ? 200 : 403)
      if (role === 'admin') expect(templateBrandService.assign).toHaveBeenCalledWith({ actor: expect.objectContaining({ role }), brandId: 'brand-1', templateIds: ['editorial-split'] })
      else expect(templateBrandService.assign).not.toHaveBeenCalled()
    } finally { await app.close() }
  })
  test('returns the server-enforced upload limits and selected analysis provider', async () => {
    const { app } = harness()
    const response = await app.inject({ method: 'GET', url: '/api/v1/brand-design-systems/config', headers: { authorization: 'Bearer test' } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ limits: { maxSources: 30, maxPdfPages: 200 }, provider: 'mock', model: 'mock-v1' })
    await app.close()
  })

  test('lists, creates, and loads brand systems with strict response contracts', async () => {
    const { app, brandDesignSystemService } = harness()
    const headers = { authorization: 'Bearer test' }
    const list = await app.inject({ method: 'GET', url: '/api/v1/brand-design-systems', headers })
    const created = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems', headers, payload: { name: 'Northstar' } })
    const loaded = await app.inject({ method: 'GET', url: '/api/v1/brand-design-systems/brand-1', headers })
    expect(list.statusCode).toBe(200)
    expect(created.statusCode).toBe(201)
    expect(loaded.headers.etag).toBe('"2"')
    expect(brandDesignSystemService.create).toHaveBeenCalledWith({ actor: expect.objectContaining({ role: 'designer' }), input: { name: 'Northstar' } })
    await app.close()
  })

  test('inspects saved source metadata and returns the approval fingerprint without mutating the draft', async () => {
    const { app, brandDesignSystemService } = harness()
    const response = await app.inject({ method: 'GET', url: '/api/v1/brand-design-systems/brand-1/sources/inspect', headers: { authorization: 'Bearer test' } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ brandId: 'brand-1', revision: 2, pricingAvailable: true, approvalFingerprint: 'a'.repeat(64) })
    expect(brandDesignSystemService.inspectSources).toHaveBeenCalledWith({ actor: expect.objectContaining({ role: 'designer' }), id: 'brand-1' })
    await app.close()
  })

  test('requires a revision for autosave and an idempotency key for publication', async () => {
    const { app, brandDesignSystemService } = harness()
    const headers = { authorization: 'Bearer test' }
    const noRevision = await app.inject({ method: 'PATCH', url: '/api/v1/brand-design-systems/brand-1/draft', headers, payload: { draft: brand.draft } })
    const saved = await app.inject({ method: 'PATCH', url: '/api/v1/brand-design-systems/brand-1/draft', headers: { ...headers, 'if-match': '"2"' }, payload: { draft: brand.draft } })
    const noKey = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems/brand-1/publish', headers: { ...headers, 'if-match': '"2"' }, payload: {} })
    const published = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems/brand-1/publish', headers: { ...headers, 'if-match': '"2"', 'idempotency-key': 'publish-1' }, payload: {} })
    expect(noRevision.statusCode).toBe(428)
    expect(saved.statusCode).toBe(200)
    expect(noKey.statusCode).toBe(428)
    expect(published.statusCode).toBe(200)
    expect(brandDesignSystemService.publish).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 2, idempotencyKey: 'publish-1' }))
    await app.close()
  })

  test('blocks marketers from mutating brand systems at the route boundary', async () => {
    const { app } = harness('marketer')
    const response = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems', headers: { authorization: 'Bearer test' }, payload: { name: 'Nope' } })
    expect(response.statusCode).toBe(403)
    await app.close()
  })

  test('grants explicit view access without returning draft data', async () => {
    const { app, brandDesignSystemService } = harness()
    const response = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems/brand-1/viewers',
      headers: { authorization: 'Bearer test' }, payload: { userId: 'marketer-1' } })
    expect(response.statusCode).toBe(204)
    expect(brandDesignSystemService.grantViewer).toHaveBeenCalledWith(expect.objectContaining({ id: 'brand-1', userId: 'marketer-1' }))
    await app.close()
  })

  test('adds a validated source with optimistic concurrency', async () => {
    const { app, brandDesignSystemService } = harness()
    const response = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems/brand-1/sources',
      headers: { authorization: 'Bearer test', 'if-match': '"2"' },
      payload: { kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/abc' } })
    expect(response.statusCode).toBe(200)
    expect(response.headers.etag).toBe('"3"')
    expect(brandDesignSystemService.addSource).toHaveBeenCalledWith(expect.objectContaining({ id: 'brand-1', expectedRevision: 2,
      input: { kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/abc' } }))
    await app.close()
  })

  test('adds a validated review asset with optimistic concurrency', async () => {
    const { app, brandDesignSystemService } = harness()
    const response = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems/brand-1/assets',
      headers: { authorization: 'Bearer test', 'if-match': '"2"' },
      payload: { name: 'logo.png', kind: 'logo', mimeType: 'image/png', data: 'iVBORwE=' } })
    expect(response.statusCode).toBe(200)
    expect(brandDesignSystemService.addAsset).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 2, input: expect.objectContaining({ kind: 'logo' }) }))
    await app.close()
  })

  test('streams a private brand asset with immutable integrity headers', async () => {
    const { app, brandDesignSystemService } = harness('marketer')
    const response = await app.inject({ method: 'GET', url: '/api/v1/brand-design-systems/brand-1/assets/asset-1',
      headers: { authorization: 'Bearer test' } })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('image/svg+xml')
    expect(response.headers.etag).toBe(`"${'a'.repeat(64)}"`)
    expect(brandDesignSystemService.readAsset).toHaveBeenCalledWith(expect.objectContaining({ id: 'brand-1', assetId: 'asset-1' }))
    await app.close()
  })

  test('analyses material sources with a revision-protected command', async () => {
    const { app, brandDesignSystemService } = harness()
    const response = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems/brand-1/analyse',
      headers: { authorization: 'Bearer test', 'if-match': '"2"' }, payload: {} })
    expect(response.statusCode).toBe(200)
    expect(brandDesignSystemService.analyseSources).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 2, input: {} }))
    await app.close()
  })

  test('lists immutable versions and restores one as a draft', async () => {
    const { app, brandDesignSystemService } = harness()
    const headers = { authorization: 'Bearer test' }
    const list = await app.inject({ method: 'GET', url: '/api/v1/brand-design-systems/brand-1/versions', headers })
    const restore = await app.inject({ method: 'POST', url: '/api/v1/brand-design-systems/brand-1/versions/version-1/restore',
      headers: { ...headers, 'if-match': '"2"' }, payload: {} })
    expect(list.statusCode).toBe(200)
    expect(restore.statusCode).toBe(200)
    expect(brandDesignSystemService.restoreVersion).toHaveBeenCalledWith(expect.objectContaining({ versionId: 'version-1', expectedRevision: 2 }))
    await app.close()
  })
})
