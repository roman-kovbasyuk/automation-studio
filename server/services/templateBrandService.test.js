import { describe, expect, test, vi } from 'vitest'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createTemplateBrandService } from './templateBrandService.js'
import { createMsdBrandDraft } from '../../shared/msdBrand.js'
import { studioTemplates } from '../../shared/studioTemplates.js'
import { hashCanonical } from '../../shared/canonicalJson.js'

const require = createRequire(import.meta.url)
const bytes = readFileSync(require.resolve('../../scripts/fixtures/msd/logo.png'))
const actor = { id: 'admin', role: 'admin', workspaceId: 'default' }
function harness() {
  let rows = studioTemplates.map(manifest => ({ id: manifest.id, version: manifest.version, name: manifest.name, manifest: structuredClone(manifest) }))
  const snapshot = createMsdBrandDraft({ assets: [{ id: 'logo', name: 'Logo', kind: 'logo', mimeType: 'image/png', approved: true }] })
  const brand = { id: 'msd', workspaceId: 'default', state: 'published', activeVersion: { id: 'v1', brandId: 'msd', versionNumber: 1, snapshot } }
  const client = { query: vi.fn(async () => ({ rows: [] })) }
  const templateRepo = {
    listLatest: vi.fn(async () => [...new Map(rows.map(row => [row.id, row])).values()]),
    createVersion: vi.fn(async input => { rows.push(structuredClone(input)); return input }),
  }
  const brandRepo = {
    getForUpdate: vi.fn(async () => brand), get: vi.fn(async () => brand),
    getAsset: vi.fn(async () => ({ id: 'logo', brandId: 'msd', objectKey: 'logo', byteSize: bytes.length, checksum: createHash('sha256').update(bytes).digest('hex') })),
  }
  const store = { get: vi.fn(async () => bytes) }
  const service = createTemplateBrandService({ pool: client, assetStore: store, brandRepository: () => brandRepo,
    templateRepository: () => templateRepo, transaction: async (_, operation) => {
      const before = structuredClone(rows)
      try { return await operation(client) } catch (error) { rows = before; throw error }
    } })
  return { service, brand, brandRepo, templateRepo, store, client, rows: () => rows }
}
describe('template brand assignment', () => {
  test('publishes new immutable manifests, retains originals and treats repeat assignment as a no-op', async () => {
    const h = harness()
    const originals = structuredClone(h.rows())
    const ids = originals.map(row => row.id)
    const result = await h.service.assign({ actor, brandId: 'msd', templateIds: ids })
    expect(result).toHaveLength(studioTemplates.length)
    for (const row of result) {
      expect(row.manifest.brand).toMatchObject({ systemId: 'msd', versionId: 'v1' })
      expect(row.manifestHash).toBe(hashCanonical(row.manifest))
      expect(row.version).not.toBe(originals[0].version)
    }
    expect(h.rows().slice(0, studioTemplates.length)).toEqual(originals)
    await h.service.assign({ actor, brandId: 'msd', templateIds: ids })
    expect(h.templateRepo.createVersion).toHaveBeenCalledTimes(studioTemplates.length)
    expect(h.store.get).toHaveBeenCalledTimes(1)
  })
  test('publishing a new brand version refreshes all assigned layouts, without touching another brand', async () => {
    const h = harness()
    await h.service.assign({ actor, brandId: 'msd', templateIds: ['editorial-split', 'product-spotlight'] })
    const historical = structuredClone(h.rows())
    h.brand.activeVersion = { ...h.brand.activeVersion, id: 'v2', versionNumber: 2, snapshot: structuredClone(h.brand.activeVersion.snapshot) }
    h.brand.activeVersion.snapshot.colors.palette[0].value = '#006655'
    const result = await h.service.refresh({ client: h.client, actor, brand: h.brand })
    expect(result).toHaveLength(2)
    expect(result.every(row => row.manifest.brand.versionId === 'v2')).toBe(true)
    expect(result[0].manifest.presentation.shapes.at(-1).fill).toBe('#006655')
    expect(h.rows().slice(0, historical.length)).toEqual(historical)
  })
  test('rejects inaccessible and unpublished brands, invalid selections, and non-admin writes', async () => {
    const h = harness()
    await expect(h.service.assign({ actor: { ...actor, role: 'designer' }, brandId: 'msd', templateIds: ['editorial-split'] })).rejects.toMatchObject({ statusCode: 403 })
    await expect(h.service.assign({ actor, brandId: 'msd', templateIds: ['missing'] })).rejects.toMatchObject({ statusCode: 404 })
    await expect(h.service.assign({ actor, brandId: 'msd', templateIds: ['editorial-split', 'editorial-split'] })).rejects.toMatchObject({ statusCode: 400 })
    h.brand.state = 'draft'
    await expect(h.service.assign({ actor, brandId: 'msd', templateIds: ['editorial-split'] })).rejects.toMatchObject({ code: 'brand_not_published' })
    expect(h.templateRepo.createVersion).not.toHaveBeenCalled()
  })
  test('does not publish a partial or falsely branded assignment when asset integrity fails', async () => {
    const h = harness()
    h.store.get.mockResolvedValue(Buffer.from('corrupt image'))
    await expect(h.service.assign({ actor, brandId: 'msd', templateIds: ['editorial-split'] })).rejects.toMatchObject({ code: 'brand_asset_unavailable' })
    expect(h.rows()).toHaveLength(studioTemplates.length)
    expect(h.templateRepo.createVersion).not.toHaveBeenCalled()
  })
})
