import { describe, expect, test } from 'vitest'
import { createPrototypeSeed } from './fixtures/seed.js'
import { createSessionFixture } from './session.js'
import { studioTemplates } from '../../shared/studioTemplates.js'
import { blobBytes, crc32 } from './zip.js'

const blobText = async blob => new TextDecoder().decode(await blobBytes(blob))

// jsdom has no canvas, so the renderer is replaced with one that returns identifiable bytes.
const stubRenderer = (overrides = {}) => ({
  check: async () => {},
  render: async ({ manifest, ratioId }) => {
    const ratio = manifest.ratios.find(item => item.id === ratioId)
    return { blob: new Blob([`png:${manifest.id}:${ratioId}`], { type: 'image/png' }), width: ratio.width, height: ratio.height }
  },
  ...overrides,
})

const campaignId = 'prototype-campaign-1'
async function readyForBanners(session) {
  await session.store.update(state => {
    const workspace = state.workspaces[campaignId]
    workspace.copies = [{ id: 'set-1', stale: false, selectedCandidateId: 'copy-1', approvedCandidateIds: ['copy-1'],
      candidates: [{ id: 'copy-1', headline: 'Find your quiet', body: 'Made for calm commutes.', cta: 'Shop now', offer: '20% off' }] }]
    workspace.directions = [{ id: 'direction-1', title: 'Soft daylight', status: 'ready', previewAssetId: 'asset-direction-1' }]
    Object.assign(workspace.campaign, { selectedCopyId: 'set-1', selectedDirectionId: 'direction-1', status: 'direction_selected' })
  })
}
const revision = async session => (await session.api.getWorkspace(campaignId)).campaign.revision

function zipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const entries = []
  for (let offset = 0; offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50;) {
    const size = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true)
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength))
    const data = bytes.subarray(offset + 30 + nameLength, offset + 30 + nameLength + size)
    entries.push({ name, data, crcMatches: view.getUint32(offset + 14, true) === crc32(data) })
    offset += 30 + nameLength + size
  }
  return entries
}

describe('prototype banner delivery', () => {
  test('renders every design in every size, records approval and delivers a real ZIP', async () => {
    const session = await createSessionFixture({ bannerRenderer: stubRenderer() })
    await readyForBanners(session)
    const templates = (await session.api.listTemplates()).templates
    expect(templates).toHaveLength(studioTemplates.length)
    const designs = templates.slice(0, 2).map(template => ({ templateId: template.id, templateVersion: template.version,
      copySetId: 'set-1', copyId: 'copy-1', directionId: 'direction-1' }))
    await session.api.saveBannerBatch(campaignId, { designs, ratioIds: ['square', 'story'] }, await revision(session))
    const { version } = await session.api.createVersion(campaignId, {}, await revision(session))
    const renders = version.snapshot.assets.filter(asset => asset.kind === 'review_png')
    expect(renders.map(asset => `${asset.templateId}:${asset.ratioId}:${asset.width}x${asset.height}`)).toEqual([
      `${designs[0].templateId}:square:1080x1080`, `${designs[0].templateId}:story:1080x1920`,
      `${designs[1].templateId}:square:1080x1080`, `${designs[1].templateId}:story:1080x1920`,
    ])
    expect(await blobText(await session.api.getAssetBlob(renders[0].id))).toBe(`png:${designs[0].templateId}:square`)
    expect(renders[0].sha256).toMatch(/^[a-f0-9]{64}$/)

    await session.scenarios.setActor('designer')
    await session.api.review(version.id, 'mark-ready', { figmaUrl: 'https://www.figma.com/design/abc/review',
      checklistAnswers: { copyAccuracy: true, layoutQuality: true, exportReadiness: true } }, await revision(session))
    await session.scenarios.setActor('marketer')
    await session.api.review(version.id, 'approve', {}, await revision(session))
    expect((await session.api.getReview(version.id)).events.map(event => event.eventType)).toEqual(['sent', 'ready', 'approved'])

    const { delivery } = await session.api.deliver(version.id)
    const zip = await blobBytes(await session.api.getAssetBlob(delivery.asset.id))
    const entries = zipEntries(zip)
    expect(entries.map(entry => entry.name)).toEqual(['banners/banner-001.png', 'banners/banner-002.png', 'banners/banner-003.png', 'banners/banner-004.png', 'delivery-manifest.json'])
    expect(entries.every(entry => entry.crcMatches)).toBe(true)
    expect(new TextDecoder().decode(entries[0].data)).toBe(`png:${designs[0].templateId}:square`)
    expect(JSON.parse(new TextDecoder().decode(entries[4].data)).files).toHaveLength(4)
    expect(delivery.byteSize).toBe(zip.length)
    expect((await session.api.getWorkspace(campaignId)).campaign.status).toBe('delivered')
    await session.dispose()
  })

  test('the requester accepts the banners and delivers them without a designer (D1)', async () => {
    const session = await createSessionFixture({ bannerRenderer: stubRenderer() })
    await readyForBanners(session)
    const [template] = (await session.api.listTemplates()).templates
    await session.api.saveBannerBatch(campaignId, { designs: [{ templateId: template.id, templateVersion: template.version,
      copySetId: 'set-1', copyId: 'copy-1', directionId: 'direction-1' }], ratioIds: ['square'] }, await revision(session))
    const { version } = await session.api.createVersion(campaignId, {}, await revision(session))
    await session.api.review(version.id, 'accept', {}, await revision(session))
    expect((await session.api.getReview(version.id)).events.map(event => event.eventType)).toEqual(['sent', 'accepted'])
    expect((await session.api.getWorkspace(campaignId)).campaign).toMatchObject({ status: 'approved', openVersionId: null })
    const { delivery } = await session.api.deliver(version.id)
    expect(zipEntries(await blobBytes(await session.api.getAssetBlob(delivery.asset.id))).map(entry => entry.name))
      .toEqual(['banners/banner-001.png', 'delivery-manifest.json'])
    await session.dispose()
  })

  test('rejects copy that does not fit a size before saving, in the service wording', async () => {
    const tooLong = Object.assign(new Error('Slot headline exceeds its line limit'), { code: 'line_overflow' })
    const session = await createSessionFixture({ bannerRenderer: stubRenderer({ check: async () => { throw tooLong } }) })
    await readyForBanners(session)
    const [template] = (await session.api.listTemplates()).templates
    const before = await session.api.getWorkspace(campaignId)
    await expect(session.api.saveBannerBatch(campaignId, { designs: [{ templateId: template.id, templateVersion: template.version,
      copySetId: 'set-1', copyId: 'copy-1', directionId: 'direction-1' }], ratioIds: ['square'] }, before.campaign.revision))
      .rejects.toMatchObject({ code: 'invalid_composition', status: 400,
        message: `Design 1, ${template.name}, square (1080×1080): Slot headline exceeds its line limit. Use shorter copy, choose a different design, or remove this size.` })
    expect((await session.api.getWorkspace(campaignId)).campaign.revision).toBe(before.campaign.revision)
    await session.dispose()
  })

  test('saved prototype data gains new template versions without a reset', async () => {
    const saved = createPrototypeSeed()
    saved.templates = saved.templates.slice(0, 3)
    const session = await createSessionFixture({ storedValue: saved })
    const templates = (await session.api.listTemplates()).templates
    expect(templates.map(template => template.id).sort()).toEqual(studioTemplates.map(template => template.id).sort())
    await session.dispose()
  })
})
