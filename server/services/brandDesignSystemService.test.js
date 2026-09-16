import { describe, expect, test, vi } from 'vitest'
import { createBrandDesignSystemService, createEmptyBrandDraft } from './brandDesignSystemService.js'

const designer = { id: 'designer-1', role: 'designer', workspaceId: 'default' }
const admin = { id: 'admin-1', role: 'admin', workspaceId: 'default' }
const marketer = { id: 'marketer-1', role: 'marketer', workspaceId: 'default' }

function completeDraft() {
  const draft = createEmptyBrandDraft('Northstar')
  draft.assets = [{ id: 'logo-1', name: 'Primary logo', kind: 'logo', mimeType: 'image/svg+xml', approved: true }]
  draft.logoRoles = { primary: 'logo-1', secondary: 'not_applicable', symbol: 'not_applicable', light: 'not_applicable', dark: 'not_applicable' }
  draft.colors = {
    palette: [
      { id: 'ink', name: 'Ink', value: '#101820', confirmed: true, evidence: { method: 'manual' } },
      { id: 'paper', name: 'Paper', value: '#FFFFFF', confirmed: true, evidence: { method: 'manual' } },
    ],
    roles: { primary: 'ink', accent: 'ink', canvas: 'paper', surface: 'paper', primaryText: 'ink', inverseText: 'paper' },
  }
  draft.typography.heading = { family: 'Avenir Next', weight: 600, fallbacks: ['Arial', 'sans-serif'], confirmed: true }
  draft.typography.body = { family: 'Avenir Next', weight: 400, fallbacks: ['Arial', 'sans-serif'], confirmed: true }
  draft.typography.licenseConfirmed = true
  return draft
}

function harness({ brand, provider, assetStore, onPublish } = {}) {
  let current = brand ?? { id: 'brand-1', workspaceId: 'default', ownerId: designer.id, state: 'draft', revision: 0,
    activeVersionId: null, activeVersion: null, draft: createEmptyBrandDraft('Northstar'),
    createdAt: new Date('2026-09-07T09:00:00.000Z'), updatedAt: new Date('2026-09-07T09:00:00.000Z') }
  const repository = {
    list: vi.fn(async () => [current]),
    listForMember: vi.fn(async () => [current]),
    get: vi.fn(async () => current),
    getForMember: vi.fn(async () => current),
    grantMember: vi.fn(async () => {}),
    getForUpdate: vi.fn(async () => current),
    create: vi.fn(async ({ id, workspaceId, ownerId, draft }) => (current = { ...current, id, workspaceId, ownerId, draft })),
    patchDraft: vi.fn(async ({ draft, expectedRevision }) => (current = { ...current, draft, revision: expectedRevision + 1 })),
    findPublication: vi.fn(async () => null),
    publish: vi.fn(async ({ versionId, versionNumber, snapshot, publishedBy, expectedRevision }) => (current = {
      ...current, state: 'published', revision: expectedRevision + 1, draft: snapshot, activeVersionId: versionId,
      activeVersion: { id: versionId, brandId: current.id, versionNumber, snapshot, publishedBy, publishedAt: new Date('2026-09-07T10:00:00.000Z'), schemaVersion: 1 },
    })),
    recordPublication: vi.fn(async () => {}),
    listVersions: vi.fn(async () => current.activeVersion ? [current.activeVersion] : []),
    createProposal: vi.fn(async (input) => ({ ...input, brandId: current.id, state: 'proposed', createdAt: new Date('2026-09-07T10:00:00.000Z') })),
    getProposal: vi.fn(async () => null),
    resolveProposal: vi.fn(async () => null),
    recordSource: vi.fn(async () => {}),
    recordAsset: vi.fn(async () => {}),
    listAssets: vi.fn(async () => current.draft.assets.map((asset) => ({ ...asset, brandId: current.id }))),
    listSources: vi.fn(async () => current.draft.sources.map((source) => ({ ...source, brandId: current.id }))),
    getAsset: vi.fn(async () => null),
    createAIJob: vi.fn(async () => {}),
    resolveAIJob: vi.fn(async () => {}),
  }
  const service = createBrandDesignSystemService({
    pool: { query: vi.fn() }, repositoryFactory: () => repository,
    transaction: async (_pool, operation) => operation({ query: vi.fn() }),
    idGenerator: vi.fn((kind) => ({ brand: 'brand-new', version: 'version-1', proposal: 'proposal-1', source: 'source-1', asset: 'asset-1', job: 'job-1' }[kind])),
    provider, assetStore, onPublish,
  })
  return { service, repository, get current() { return current } }
}

describe('brand design system service', () => {
  test('uses production-safe UUID generation when no test generator is injected', async () => {
    const repository = { create: vi.fn(async (input) => input) }
    const service = createBrandDesignSystemService({ pool: { query: vi.fn() }, repositoryFactory: () => repository })
    const created = await service.create({ actor: designer, input: { name: 'Northstar' } })
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('allows only designers and admins to create or edit brands', async () => {
    const { service } = harness()
    await expect(service.create({ actor: marketer, input: { name: 'Northstar' } })).rejects.toMatchObject({ statusCode: 403, code: 'forbidden' })
    await expect(service.create({ actor: designer, input: { name: 'Northstar' } })).resolves.toMatchObject({ id: 'brand-new', ownerId: designer.id })
    await expect(service.patchDraft({ actor: marketer, id: 'brand-1', expectedRevision: 0, draft: createEmptyBrandDraft('Northstar') }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  test('shows marketers only published systems while designers can resume drafts', async () => {
    const draftBrand = harness()
    await expect(draftBrand.service.get({ actor: marketer, id: 'brand-1' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(draftBrand.service.get({ actor: designer, id: 'brand-1' })).resolves.toMatchObject({ state: 'draft' })
    const snapshot = { ...completeDraft(), sources: [{ id: 'private-source', kind: 'figma', label: 'Private Figma', url: 'https://www.figma.com/design/private', status: 'ready' }] }
    const unpublished = { ...snapshot, context: 'Unpublished strategy' }
    const published = harness({ brand: { ...draftBrand.current, state: 'published', draft: unpublished, activeVersionId: 'version-1',
      activeVersion: { id: 'version-1', brandId: 'brand-1', versionNumber: 1, snapshot, publishedBy: designer.id,
        publishedAt: new Date('2026-09-07T10:00:00.000Z'), schemaVersion: 1 } } })
    const visible = await published.service.get({ actor: marketer, id: 'brand-1' })
    expect(visible.draft.context).not.toBe('Unpublished strategy')
    expect(visible.draft.sources).toEqual([])
    published.repository.getForMember.mockResolvedValueOnce(null)
    await expect(published.service.get({ actor: marketer, id: 'brand-1' })).rejects.toMatchObject({ statusCode: 404 })
  })

  test('requires an explicit workspace scope for all brand operations', async () => {
    const { service } = harness()
    await expect(service.list({ actor: { id: 'designer-1', role: 'designer' } }))
      .rejects.toMatchObject({ statusCode: 403, code: 'workspace_required' })
  })

  test('grants published-view access through an explicit brand membership', async () => {
    const { service, repository } = harness()
    await service.grantViewer({ actor: designer, id: 'brand-1', userId: 'marketer-1' })
    expect(repository.grantMember).toHaveBeenCalledWith({ brandId: 'brand-1', userId: 'marketer-1' })
    await expect(service.grantViewer({ actor: marketer, id: 'brand-1', userId: 'other' }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  test('rejects forged asset and source registry entries during draft save', async () => {
    const { service } = harness()
    const forgedAsset = createEmptyBrandDraft('Northstar')
    forgedAsset.assets = [{ id: 'forged', name: 'Fake', kind: 'logo', mimeType: 'image/svg+xml', approved: true }]
    await expect(service.patchDraft({ actor: designer, id: 'brand-1', expectedRevision: 0, draft: forgedAsset }))
      .rejects.toMatchObject({ statusCode: 422, code: 'invalid_brand_registry' })
    const forgedSource = createEmptyBrandDraft('Northstar')
    forgedSource.sources = [{ id: 'forged', kind: 'figma', label: 'Fake', url: 'https://www.figma.com/design/fake', status: 'ready' }]
    await expect(service.patchDraft({ actor: designer, id: 'brand-1', expectedRevision: 0, draft: forgedSource }))
      .rejects.toMatchObject({ statusCode: 422, code: 'invalid_brand_registry' })
  })

  test('returns field-specific readiness errors instead of publishing an incomplete draft', async () => {
    const { service, repository } = harness()
    await expect(service.publish({ actor: designer, id: 'brand-1', expectedRevision: 0, idempotencyKey: 'publish-1' }))
      .rejects.toMatchObject({ statusCode: 422, code: 'brand_not_ready', details: expect.arrayContaining([
        expect.objectContaining({ field: 'logoRoles.primary' }), expect.objectContaining({ field: 'colors.roles.primary' }),
      ]) })
    expect(repository.publish).not.toHaveBeenCalled()
  })

  test('publishes a complete system atomically and replays the same idempotency key', async () => {
    const brand = { id: 'brand-1', workspaceId: 'default', ownerId: designer.id, state: 'draft', revision: 2,
      activeVersionId: null, activeVersion: null, draft: completeDraft(), createdAt: new Date(), updatedAt: new Date() }
    const { service, repository } = harness({ brand })
    const published = await service.publish({ actor: admin, id: 'brand-1', expectedRevision: 2, idempotencyKey: 'publish-1' })
    repository.findPublication.mockResolvedValueOnce(published)
    const replay = await service.publish({ actor: admin, id: 'brand-1', expectedRevision: 2, idempotencyKey: 'publish-1' })
    expect(replay.activeVersionId).toBe('version-1')
    expect(repository.publish).toHaveBeenCalledTimes(1)
  })

  test('rejects proposal application after the draft revision changes', async () => {
    const { service, repository } = harness({ provider: { estimateWorkload: vi.fn(() => ({ available: true, estimatedUsd: 0, thresholdUsd: 2, requiresApproval: false })), proposeChanges: vi.fn(async () => ({
      operations: [{ operation: 'scale_typography', factor: 0.9 }], unchanged: ['colors', 'logos', 'assets'],
    })) } })
    const proposal = await service.proposeChange({ actor: designer, id: 'brand-1', prompt: 'Make typography 10% smaller' })
    repository.getProposal.mockResolvedValueOnce(proposal)
    repository.getForUpdate.mockResolvedValueOnce({ ...harness().current, revision: proposal.baseRevision + 1 })
    await expect(service.applyProposal({ actor: designer, id: 'brand-1', proposalId: proposal.id, expectedRevision: proposal.baseRevision + 1 }))
      .rejects.toMatchObject({ statusCode: 409, code: 'proposal_stale' })
  })

  test('applies the estimate approval gate to change proposals before dispatch', async () => {
    const provider = { provider: 'external', model: 'brand-v1',
      estimateWorkload: vi.fn(() => ({ available: true, estimatedUsd: 2.5, thresholdUsd: 2, requiresApproval: true })),
      proposeChanges: vi.fn(async () => ({ operations: [{ operation: 'scale_typography', factor: 0.9 }], unchanged: ['colors'] })) }
    const { service } = harness({ provider })
    let gate
    try { await service.proposeChange({ actor: designer, id: 'brand-1', prompt: 'Make type smaller' }) } catch (error) { gate = error }
    expect(gate).toMatchObject({ statusCode: 402, code: 'brand_cost_approval_required', details: {
      provider: 'external', model: 'brand-v1', approvalFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    } })
    expect(provider.proposeChanges).not.toHaveBeenCalled()
    await service.proposeChange({ actor: designer, id: 'brand-1', prompt: 'Make type smaller', approvalFingerprint: gate.details.approvalFingerprint })
    expect(provider.proposeChanges).toHaveBeenCalledOnce()
  })

  test('validates and stores source bytes before adding safe metadata to the draft', async () => {
    const assetStore = { put: vi.fn(async () => ({ sha256: 'a'.repeat(64) })), delete: vi.fn() }
    const { service, repository } = harness({ assetStore })
    const data = Buffer.from('{"brand":"Northstar"}').toString('base64')
    const result = await service.addSource({ actor: designer, id: 'brand-1', expectedRevision: 0,
      input: { kind: 'file', name: 'brand.json', mimeType: 'application/json', data } })
    expect(result.draft.sources[0]).toMatchObject({ kind: 'file', label: 'brand.json', status: 'ready' })
    expect(assetStore.put).toHaveBeenCalledOnce()
    expect(repository.recordSource).toHaveBeenCalledOnce()
  })

  test('keeps an inaccessible Figma source with an explicit export fallback', async () => {
    const { service, repository } = harness()
    const result = await service.addSource({ actor: designer, id: 'brand-1', expectedRevision: 0,
      input: { kind: 'figma', label: 'Private library', url: 'https://www.figma.com/design/private' } })
    expect(result.draft.sources[0]).toMatchObject({ kind: 'figma', status: 'failed', error: expect.stringContaining('Export') })
    expect(repository.recordSource).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', error: expect.stringContaining('Export') }))
  })

  test('rejects active content in SVG materials before storage', async () => {
    const assetStore = { put: vi.fn(), delete: vi.fn() }
    const { service } = harness({ assetStore })
    await expect(service.addSource({ actor: designer, id: 'brand-1', expectedRevision: 0, input: {
      kind: 'file', name: 'logo.svg', mimeType: 'image/svg+xml', data: Buffer.from('<svg><script>alert(1)</script></svg>').toString('base64'),
    } })).rejects.toMatchObject({ statusCode: 400, code: 'unsafe_brand_file' })
    expect(assetStore.put).not.toHaveBeenCalled()
  })

  test('rejects files whose bytes do not match their declared type', async () => {
    const assetStore = { put: vi.fn(), delete: vi.fn() }
    const { service } = harness({ assetStore })
    await expect(service.addAsset({ actor: designer, id: 'brand-1', expectedRevision: 0, input: {
      name: 'not-an-image.webp', kind: 'reference', mimeType: 'image/webp', data: Buffer.from('plain text').toString('base64'),
    } })).rejects.toMatchObject({ statusCode: 400, code: 'invalid_brand_file' })
    expect(assetStore.put).not.toHaveBeenCalled()
  })

  test('rejects a font binary mislabeled as a logo asset', async () => {
    const assetStore = { put: vi.fn(), delete: vi.fn() }
    const { service } = harness({ assetStore })
    await expect(service.addAsset({ actor: designer, id: 'brand-1', expectedRevision: 0, input: {
      name: 'fake-logo.woff2', kind: 'logo', mimeType: 'font/woff2', data: Buffer.from('wOF2font').toString('base64'),
    } })).rejects.toMatchObject({ statusCode: 422, code: 'invalid_brand_asset_kind' })
    expect(assetStore.put).not.toHaveBeenCalled()
  })

  test('analyses saved sources through the server-owned brand policy and advances to review', async () => {
    const source = { id: 'source-1', kind: 'file', label: 'brand.pdf', mimeType: 'application/pdf', byteSize: 1200, status: 'ready' }
    const brand = { ...harness().current, draft: { ...createEmptyBrandDraft('Northstar'), sources: [source] } }
    const analysed = { ...brand.draft, currentStep: 'review' }
    const provider = {
      estimateWorkload: vi.fn(() => ({ available: true, estimatedUsd: 0, thresholdUsd: 2, requiresApproval: false })),
      inspectMaterials: vi.fn(async () => ({ draft: analysed })),
    }
    const { service, repository } = harness({ brand, provider })
    const result = await service.analyseSources({ actor: designer, id: 'brand-1', expectedRevision: 0, input: {} })
    expect(result.draft.currentStep).toBe('review')
    expect(provider.inspectMaterials).toHaveBeenCalledWith(expect.objectContaining({ policyVersion: 'brand-system-v1', draft: brand.draft }), expect.any(AbortSignal))
    expect(repository.createAIJob).toHaveBeenCalledWith(expect.objectContaining({ operation: 'analyse_materials', inputRevision: 0,
      policyVersion: 'brand-system-v1' }))
    expect(repository.resolveAIJob).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1', status: 'succeeded' }))
  })

  test('offers manual setup when source-analysis pricing is unavailable', async () => {
    const brand = { ...harness().current, draft: { ...createEmptyBrandDraft('Northstar'), sources: [
      { id: 'source-1', kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/a', status: 'added' },
    ] } }
    const provider = { estimateWorkload: vi.fn(() => ({ available: false, reason: 'pricing_unavailable' })), inspectMaterials: vi.fn() }
    const { service } = harness({ brand, provider })
    await expect(service.analyseSources({ actor: designer, id: 'brand-1', expectedRevision: 0, input: {} }))
      .rejects.toMatchObject({ statusCode: 503, code: 'brand_ai_pricing_unavailable' })
    expect(provider.inspectMaterials).not.toHaveBeenCalled()
  })

  test('returns a source inspection fingerprint that can authorize the matching analysis estimate', async () => {
    const source = { id: 'source-1', kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/a', status: 'added' }
    const brand = { ...harness().current, draft: { ...createEmptyBrandDraft('Northstar'), sources: [source] } }
    const provider = { provider: 'external', model: 'brand-v1', estimateWorkload: vi.fn(() => ({ available: true, estimatedUsd: 2.75, thresholdUsd: 2, requiresApproval: true })) }
    const { service } = harness({ brand, provider })
    const inspection = await service.inspectSources({ actor: designer, id: 'brand-1' })
    expect(inspection).toMatchObject({ brandId: 'brand-1', revision: 0, requiresApproval: true, pricingAvailable: true, approvalFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/) })
    expect(inspection.sources).toEqual([source])
  })

  test('retains source metadata and marks every source failed when analysis dispatch fails', async () => {
    const source = { id: 'source-1', kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/a', status: 'added' }
    const brand = { ...harness().current, draft: { ...createEmptyBrandDraft('Northstar'), sources: [source] } }
    const provider = { estimateWorkload: vi.fn(() => ({ available: true, estimatedUsd: 0, thresholdUsd: 2, requiresApproval: false })), inspectMaterials: vi.fn(async () => { throw new Error('provider unavailable') }) }
    const { service, repository } = harness({ brand, provider })
    await expect(service.analyseSources({ actor: designer, id: 'brand-1', expectedRevision: 0, input: {} })).rejects.toThrow('provider unavailable')
    expect(repository.patchDraft).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 0, draft: expect.objectContaining({ sources: [expect.objectContaining({ id: 'source-1', status: 'failed', error: 'provider unavailable' })] }) }))
  })

  test('binds cost approval to the provider, model, sources, and draft revision before dispatch', async () => {
    const source = { id: 'source-1', kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/a', status: 'added' }
    const brand = { ...harness().current, draft: { ...createEmptyBrandDraft('Northstar'), sources: [source] } }
    const provider = { provider: 'external', model: 'brand-v1',
      estimateWorkload: vi.fn(() => ({ available: true, estimatedUsd: 2.75, thresholdUsd: 2, requiresApproval: true })),
      inspectMaterials: vi.fn(async ({ draft }) => ({ draft: { ...draft, currentStep: 'review' } })) }
    const { service, repository } = harness({ brand, provider })
    let gate
    try { await service.analyseSources({ actor: designer, id: 'brand-1', expectedRevision: 0, input: {} }) } catch (error) { gate = error }
    expect(gate).toMatchObject({ statusCode: 402, code: 'brand_cost_approval_required', details: {
      estimatedUsd: 2.75, provider: 'external', model: 'brand-v1', approvalFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    } })
    expect(provider.inspectMaterials).not.toHaveBeenCalled()
    await service.analyseSources({ actor: designer, id: 'brand-1', expectedRevision: 0,
      input: { approvalFingerprint: gate.details.approvalFingerprint } })
    expect(provider.inspectMaterials).toHaveBeenCalledOnce()
    expect(repository.createAIJob).toHaveBeenCalledWith(expect.objectContaining({ estimatedUsd: 2.75,
      approvalFingerprint: gate.details.approvalFingerprint }))
  })

  test('restores history by publishing a new immutable version', async () => {
    const snapshot = completeDraft()
    const brand = { ...harness().current, state: 'published', revision: 4, activeVersionId: 'version-2',
      activeVersion: { id: 'version-2', brandId: 'brand-1', versionNumber: 2, snapshot, publishedBy: designer.id, publishedAt: new Date(), schemaVersion: 1 } }
    const { service, repository } = harness({ brand })
    repository.getVersion = vi.fn(async () => ({ ...brand.activeVersion, id: 'version-1', versionNumber: 1, snapshot: { ...snapshot, context: 'Earlier direction' } }))
    repository.listAssets.mockResolvedValue(snapshot.assets.map((asset) => ({ ...asset, brandId: brand.id })))
    const restored = await service.restoreVersion({ actor: designer, id: 'brand-1', versionId: 'version-1', expectedRevision: 4 })
    expect(restored.activeVersion.snapshot.context).toBe('Earlier direction')
    expect(repository.publish).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 4, versionNumber: 3,
      snapshot: expect.objectContaining({ context: 'Earlier direction' }) }))
  })

  test('stores review assets before exposing their safe metadata in the draft', async () => {
    const assetStore = { put: vi.fn(async () => ({})), delete: vi.fn(async () => {}) }
    const { service, repository } = harness({ assetStore })
    const result = await service.addAsset({ actor: designer, id: 'brand-1', expectedRevision: 0, input: {
      name: 'logo.png', kind: 'logo', mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAE/wH+F7pXAAAAAElFTkSuQmCC',
    } })
    expect(result.draft.assets[0]).toMatchObject({ id: 'asset-1', name: 'logo.png', kind: 'logo', approved: false,
      downloadPath: '/api/v1/brand-design-systems/brand-1/assets/asset-1' })
    expect(repository.recordAsset).toHaveBeenCalledOnce()
  })

  test('serves verified published assets to marketers without exposing draft-only assets', async () => {
    const bytes = Buffer.from('verified logo')
    const assetStore = { get: vi.fn(async () => bytes), put: vi.fn(), delete: vi.fn() }
    const { service, repository } = harness({ assetStore })
    repository.getAsset.mockResolvedValue({ id: 'asset-1', brandId: 'brand-1', workspaceId: 'default', ownerId: designer.id,
      brandState: 'published', activeSnapshot: { assets: [{ id: 'asset-1', approved: true }] }, name: 'logo.svg', kind: 'logo',
      mimeType: 'image/svg+xml', objectKey: 'brands/one/assets/asset-1', byteSize: bytes.length,
      checksum: Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex') })
    await expect(service.readAsset({ actor: marketer, id: 'brand-1', assetId: 'asset-1' }))
      .resolves.toMatchObject({ id: 'asset-1', bytes })
    repository.getAsset.mockResolvedValue({ ...await repository.getAsset(), id: 'draft-asset', activeSnapshot: { assets: [] } })
    await expect(service.readAsset({ actor: marketer, id: 'brand-1', assetId: 'draft-asset' }))
      .rejects.toMatchObject({ statusCode: 404 })
    repository.getAsset.mockResolvedValue({ ...await repository.getAsset(), id: 'asset-1', activeSnapshot: { assets: [{ id: 'asset-1', approved: false }] } })
    await expect(service.readAsset({ actor: marketer, id: 'brand-1', assetId: 'asset-1' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})


test('brand publication refreshes assigned templates before recording success', async () => {
  const onPublish = vi.fn(async () => {})
  const h = harness({ onPublish })
  h.current.draft = completeDraft()
  await h.service.patchDraft({ actor: designer, id: 'brand-1', expectedRevision: 0, draft: completeDraft() })
  const published = await h.service.publish({ actor: designer, id: 'brand-1', expectedRevision: 1, idempotencyKey: 'publish-with-templates' })
  expect(onPublish).toHaveBeenCalledWith(expect.objectContaining({ actor: designer, brand: published, client: expect.any(Object) }))
  expect(onPublish.mock.invocationCallOrder[0]).toBeLessThan(h.repository.recordPublication.mock.invocationCallOrder[0])
})

test('failed template compilation rejects brand publication instead of claiming success', async () => {
  const h = harness({ onPublish: vi.fn(async () => { throw new Error('Unsupported template font') }) })
  h.current.draft = completeDraft()
  await h.service.patchDraft({ actor: designer, id: 'brand-1', expectedRevision: 0, draft: completeDraft() })
  await expect(h.service.publish({ actor: designer, id: 'brand-1', expectedRevision: 1, idempotencyKey: 'invalid-template-brand' })).rejects.toThrow('Unsupported template font')
  expect(h.repository.recordPublication).not.toHaveBeenCalled()
})
