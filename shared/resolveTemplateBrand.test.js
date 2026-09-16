import { describe, expect, test } from 'vitest'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
import { createMsdBrandDraft } from './msdBrand.js'
import { resolveTemplateBrand } from './resolveTemplateBrand.js'
import { studioTemplates, studioTemplateSamples } from './studioTemplates.js'
import { templateManifestSchema } from './templateManifest.js'
import { createInProcessRenderer } from '../server/rendering/inProcessRenderer.js'

const snapshot = createMsdBrandDraft({ assets: [{ id: 'logo', name: 'MSD', kind: 'logo', mimeType: 'image/png', approved: true }] })
const version = { id: 'v1', brandId: 'msd', versionNumber: 1, snapshot }
const logoData = `data:image/png;base64,${readFileSync(require.resolve('../scripts/fixtures/msd/logo.png')).toString('base64')}`
describe('brand-owned template parameters', () => {
  test.each(studioTemplates)('$name resolves every ratio without mutating its historical manifest', source => {
    const before = structuredClone(source)
    const result = resolveTemplateBrand(source, version, logoData)
    expect(source).toEqual(before)
    expect(result.brand).toMatchObject({ systemId: 'msd', versionId: 'v1', name: 'MSD' })
    expect(templateManifestSchema.safeParse(result).success).toBe(true)
    expect(result.presentation.backgroundColor).toBe('#FFFFFF')
    expect(result.presentation.slotColors.cta).toBe('#FFFFFF')
    expect(result.slots.find(slot => slot.id === 'headline')).toMatchObject({ fontFamily: 'Arimo', fontWeight: 700 })
    expect(result.slots.map(slot => slot.placements)).toEqual(source.slots.map(slot => slot.placements))
  })
  test('a new brand revision updates assigned colors while the prior result remains reproducible', () => {
    const old = resolveTemplateBrand(studioTemplates[0], version, logoData)
    const next = structuredClone(version)
    next.id = 'v2'; next.versionNumber = 2; next.snapshot.colors.palette[0].value = '#006655'
    const current = resolveTemplateBrand(old, next, logoData)
    expect(current.brand.versionId).toBe('v2')
    expect(current.presentation.shapes.at(-1).fill).toBe('#006655')
    expect(old.presentation.shapes.at(-1).fill).toBe('#008876')
  })
  test('unpublished, unapproved, unavailable and unsupported assets fail before assignment', () => {
    expect(() => resolveTemplateBrand(studioTemplates[0], null, logoData)).toThrow(/published/)
    expect(() => resolveTemplateBrand(studioTemplates[0], version, null)).toThrow(/logo/)
    const unapproved = structuredClone(version); unapproved.snapshot.assets[0].approved = false
    expect(() => resolveTemplateBrand(studioTemplates[0], unapproved, logoData)).toThrow(/approved/)
    const unsupported = structuredClone(version); unsupported.snapshot.typography.heading.family = 'Unknown font'
    expect(() => resolveTemplateBrand(studioTemplates[0], unsupported, logoData)).toThrow(/bundled font/)
    expect(() => resolveTemplateBrand(studioTemplates[0], version, 'https://invalid.test/logo.svg')).toThrow()
  })
  test('graphic bounds and executable URLs are rejected by the manifest contract', () => {
    const manifest = resolveTemplateBrand(studioTemplates[0], version, logoData)
    manifest.presentation.graphics[0].placements.square.x = 0
    expect(templateManifestSchema.safeParse(manifest).success).toBe(false)
    manifest.presentation.graphics[0].dataUrl = 'data:image/svg+xml,<svg onload="alert(1)"/>'
    expect(templateManifestSchema.safeParse(manifest).success).toBe(false)
  })
  test.each(studioTemplates)('$name exports the resolved font and visible logo in all formats', async source => {
    const renderer = createInProcessRenderer()
    const manifest = resolveTemplateBrand(source, version, logoData)
    const image = { mimeType: 'image/png', bytes: await sharp({ create: { width: 1080, height: 1920, channels: 3, background: '#888888' } }).png().toBuffer() }
    for (const ratio of manifest.ratios) {
      const result = await renderer.renderComposition({ manifest, ratio: ratio.id, slots: { ...studioTemplateSamples[source.id], image } })
      expect(result.renderManifest.slots.find(slot => slot.id === 'headline').font.family).toBe('Arimo')
      const p = manifest.presentation.graphics[0].placements[ratio.id]
      const pixels = await sharp(result.bytes).extract({ left: p.x, top: p.y, width: p.width, height: p.height }).removeAlpha().raw().toBuffer()
      let teal = 0
      for (let i = 0; i < pixels.length; i += 3) if (pixels[i] < 40 && pixels[i+1] > 100 && pixels[i+1] < 160 && pixels[i+2] > 80 && pixels[i+2] < 145) teal++
      expect(teal).toBeGreaterThan(30)
    }
  }, 30000)
})
