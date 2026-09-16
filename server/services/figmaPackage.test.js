import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { describe, expect, test } from 'vitest'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { pilotCampaignFixture as campaign } from '../../shared/fixtures/pilotCampaign.js'
import { pilotTemplateFixture } from '../../shared/fixtures/pilotTemplate.js'
import { buildFigmaPackage } from './figmaPackage.js'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
async function fixture({ batch = false } = {}) {
  const bytes = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#36aabb' } }).png().toBuffer()
  const manifest = structuredClone(pilotTemplateFixture)
  if (batch) {
    for (const [id, width, height] of [['portrait', 1080, 1440], ['story', 1080, 1920]]) {
      manifest.ratios.push({ ...manifest.ratios[0], id, width, height })
      for (const slot of manifest.slots) slot.placements[id] = { ...slot.placements.square }
    }
  }
  const composition = { ...campaign.composition, ratioIds: manifest.ratios.map(r => r.id) }
  const contexts = batch ? ['a', 'b', 'c'].map(id => ({ id, selectedCopy: campaign.selectedCopy,
    selectedDirection: campaign.selectedDirection, templateManifest: manifest, templateManifestHash: hashCanonical(manifest) })) : null
  if (batch) composition.designs = contexts.map(c => ({ id: c.id, templateId: manifest.id, templateVersion: manifest.version,
    copySetId: 'copies', copyId: campaign.selectedCopy.id, directionId: campaign.selectedDirection.id,
    slotValues: composition.slotValues, validation: composition.validation }))
  const renders = (contexts ?? [{ id: undefined }]).flatMap(c => composition.ratioIds.map(ratioId => ({
    ...(c.id ? { designId: c.id } : {}), ratioId, asset: { id: `review-${c.id ?? 'single'}-${ratioId}`, kind: 'review_png', sha256: 'b'.repeat(64) },
  })))
  const renderBytes = Buffer.from(JSON.stringify({ versionId: 'version-1', renders }))
  const snapshot = { selectedCopy: campaign.selectedCopy, selectedDirection: campaign.selectedDirection, composition,
    assets: [{ id: campaign.selectedDirection.previewAssetId, kind: 'direction', sha256: hash(bytes) },
      ...renders.map(r => r.asset), { id: 'manifest', kind: 'manifest', sha256: hash(renderBytes) }],
    templateManifest: manifest, templateManifestHash: hashCanonical(manifest), ...(contexts ? { designs: contexts } : {}) }
  const version = { id: 'version-1', campaignId: campaign.id, versionNumber: 1, snapshot,
    contentHash: hashCanonical(snapshot), createdBy: 'marketer', createdAt: '2026-09-09T00:00:00.000Z' }
  const assets = new Map([[campaign.selectedDirection.previewAssetId, { bytes, mimeType: 'image/png' }], ['manifest', { bytes: renderBytes, mimeType: 'application/json' }]])
  return { version, campaignTitle: 'Launch', readAsset: async id => assets.get(id), assets }
}

describe('editable Figma package', () => {
  test('compiles all nine native outputs with stable identities and immutable references', async () => {
    const input = await fixture({ batch: true })
    const pkg = await buildFigmaPackage(input)
    expect(pkg.outputs).toHaveLength(9)
    expect(new Set(pkg.outputs.map(o => o.outputId)).size).toBe(9)
    expect(pkg.outputs.map(o => o.height)).toEqual([1080,1440,1920,1080,1440,1920,1080,1440,1920])
    expect(pkg.outputs.every(o => o.referenceAssetId.startsWith('review-'))).toBe(true)
    expect(pkg.sourceHash).toBe(input.version.contentHash)
    const renamed = await buildFigmaPackage({ ...input, campaignTitle: 'Renamed' })
    expect(renamed.packageHash).toBe(pkg.packageHash)
    expect(renamed.pageName).toBe('Renamed')
    expect(pkg.sourceAssets).toHaveLength(1)
  })
  test('preserves editable wrapped text, actual font family and center crop', async () => {
    const pkg = await buildFigmaPackage(await fixture())
    const nodes = pkg.outputs[0].scene.nodes
    expect(nodes.find(n => n.id === 'headline')).toMatchObject({ type: 'text', characters: campaign.composition.slotValues.headline,
      font: { family: 'Inter Display', style: 'Bold', size: 64 }, lineHeight: 77 })
    expect(nodes.find(n => n.id === 'headline').lines.join(' ')).toBe(campaign.composition.slotValues.headline)
    expect(nodes.find(n => n.id === 'image')).toMatchObject({ type: 'image', placement: { x: 576, y: 0, width: 504, height: 1080 },
      crop: { x: 390, y: 0, width: 420, height: 900 } })
  })
  test('rejects altered snapshots and corrupt source bytes', async () => {
    const input = await fixture()
    await expect(buildFigmaPackage({ ...input, version: { ...input.version, contentHash: '0'.repeat(64) } })).rejects.toThrow()
    input.assets.get(campaign.selectedDirection.previewAssetId).bytes = Buffer.from('corrupt')
    await expect(buildFigmaPackage(input)).rejects.toMatchObject({ code: 'figma_asset_mismatch' })
  })
  test('rejects missing assets and incomplete render pair coverage', async () => {
    const input = await fixture()
    input.assets.delete('manifest')
    await expect(buildFigmaPackage(input)).rejects.toMatchObject({ code: 'figma_asset_missing' })
    const other = await fixture()
    const bytes = Buffer.from(JSON.stringify({ versionId: 'version-1', renders: [] }))
    other.assets.set('manifest', { bytes, mimeType: 'application/json' })
    other.version.snapshot.assets.find(a => a.id === 'manifest').sha256 = hash(bytes)
    other.version.contentHash = hashCanonical(other.version.snapshot)
    await expect(buildFigmaPackage(other)).rejects.toMatchObject({ code: 'figma_output_mismatch' })
  })
})
