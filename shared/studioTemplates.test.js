import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import sharp from 'sharp'
import { sizedStudioTemplates, studioTemplates, studioTemplateSamples } from './studioTemplates.js'
import { templateManifestSchema } from './templateManifest.js'
import { createInProcessRenderer } from '../server/rendering/inProcessRenderer.js'

const renderer = createInProcessRenderer()
const image = await readFile('src/studio/assets/headphones.png')

describe('production studio template family', () => {
  test.each(studioTemplates)('$name includes a tag in actual PNG output and omits a blank tag', async manifest => {
    const slots = { ...studioTemplateSamples[manifest.id], image: { bytes: image, mimeType: 'image/png' } }
    for (const ratio of manifest.ratios) {
      const tagged = await renderer.renderComposition({ manifest, ratio: ratio.id, slots: { ...slots, tag: '20% off until Sunday' } })
      const blank = await renderer.renderComposition({ manifest, ratio: ratio.id, slots })
      expect(tagged.renderManifest.slots.find(slot => slot.id === 'tag')?.lines.join(' ')).toBe('20% off until Sunday')
      expect(tagged.sha256).not.toBe(blank.sha256)
      expect(blank.renderManifest.slots.some(slot => slot.id === 'tag')).toBe(false)
    }
  }, 30000)
  test.each(studioTemplates)('$name renders actual PNGs in all four delivery sizes', async (manifest) => {
    expect(templateManifestSchema.parse(manifest)).toEqual(manifest)
    for (const ratio of manifest.ratios) {
      const result = await renderer.renderComposition({ manifest, ratio: ratio.id, slots: {
        ...studioTemplateSamples[manifest.id], image: { bytes: image, mimeType: 'image/png' },
      } })
      const metadata = await sharp(result.bytes).metadata()
      expect(metadata).toMatchObject({ format: 'png', width: ratio.width, height: ratio.height })
      expect(result.renderManifest.slots.map((slot) => slot.id).sort()).toEqual(['body', 'cta', 'headline', 'image'])
      const pixel = await sharp(result.bytes).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer()
      expect([...pixel]).toEqual(manifest.presentation.backgroundColor.slice(1).match(/../g).map((part) => parseInt(part, 16)))
      expect(result.byteSize).toBeGreaterThan(30000)
    }
  }, 30000)

  // Copy at the limits the AI copy schema allows, including long words, must fit every size of every
  // current template: headline, body and tag shrink to fit between fontSize and minFontSize.
  const longestCopy = [
    { headline: 'Quiet mornings, focused afternoons and calmer commutes with Aura headphones now', body: 'Build momentum through short, focused sessions designed for busy commuters who want calm, clear sound all day, plus comfort that lasts from first stop to last.', cta: 'Start listening today', tag: '20% off during launch week, online only' },
    { headline: 'Unforgettable, uncompromising noise-cancellation for extraordinary commutes', body: 'Internationally acclaimed acoustical engineering meets uncompromising all-day wearability.', cta: 'Discover everything', tag: 'Complimentary international shipping' },
    { headline: 'Make progress with Launch Aura noise-cancelling headphones for city commuters w…', body: 'Internationally acclaimed acoustical engineering meets uncompromising all-day wearability for commuters.', cta: 'Start learning' },
  ]
  test.each(studioTemplates.map(manifest => [manifest.name, manifest]))('%s fits the longest allowed copy in every size', async (_name, manifest) => {
    for (const copy of longestCopy) {
      for (const [slotId, value] of Object.entries(copy)) expect(value.length).toBeLessThanOrEqual(manifest.slots.find(slot => slot.id === slotId).maxCharacters)
      for (const ratio of manifest.ratios) {
        const slots = await renderer.compileSlotProvenance({ manifest, ratio: ratio.id, slots: { ...copy, image: { bytes: image, mimeType: 'image/png' } } })
        for (const slot of slots.filter(item => item.font)) {
          const definition = manifest.slots.find(item => item.id === slot.id)
          expect(slot.font.size).toBeGreaterThanOrEqual(definition.minFontSize)
          expect(slot.font.size).toBeLessThanOrEqual(definition.fontSize)
        }
      }
    }
  }, 30000)

  test('fitted text is recorded in the render manifest, and published 1.2.0 manifests keep their fixed size', async () => {
    const copy = { ...longestCopy[0], image: { bytes: image, mimeType: 'image/png' } }
    const current = studioTemplates.find(manifest => manifest.id === 'editorial-split')
    const fitted = await renderer.renderComposition({ manifest: current, ratio: 'square', slots: copy })
    const headline = fitted.renderManifest.slots.find(slot => slot.id === 'headline')
    expect(headline.font.size).toBeLessThan(current.slots.find(slot => slot.id === 'headline').fontSize)
    expect(headline.lines.length).toBeLessThanOrEqual(4)
    const published = sizedStudioTemplates.find(manifest => manifest.id === 'editorial-split')
    expect(published.version).toBe('1.2.0')
    await expect(renderer.renderComposition({ manifest: published, ratio: 'square', slots: copy })).rejects.toMatchObject({ code: 'line_overflow' })
  })

  test.each(['url(https://invalid.test)', '#ffffff" onload="alert(1)', 'red', '#fff'])('rejects unsafe presentation color %s', (fill) => {
    const manifest = structuredClone(studioTemplates[0])
    manifest.presentation.shapes[0].fill = fill
    expect(templateManifestSchema.safeParse(manifest).success).toBe(false)
  })

  test('rejects unknown slots, unknown ratios, missing geometry, and shapes outside the canvas', () => {
    for (const change of [
      (m) => { m.presentation.slotColors.unknown = '#000000' },
      (m) => { m.presentation.shapes[0].placements.extra = { x: 0, y: 0, width: 1, height: 1 } },
      (m) => { delete m.presentation.shapes[0].placements.story },
      (m) => { m.presentation.shapes[0].placements.square.width = 1081 },
    ]) {
      const manifest = structuredClone(studioTemplates[0]); change(manifest)
      expect(templateManifestSchema.safeParse(manifest).success).toBe(false)
    }
  })

  test('preserves malicious-looking copy as glyphs and binds presentation changes to template hash', async () => {
    const manifest = structuredClone(studioTemplates[0])
    const input = { manifest, ratio: 'square', slots: { headline: '<b>Hello</b>', body: 'Sound & space', cta: 'Listen now', image: { bytes: image, mimeType: 'image/png' } } }
    const first = await renderer.renderComposition(input)
    expect(first.renderManifest.slots.find((slot) => slot.id === 'headline').lines.join(' ')).toBe('<b>Hello</b>')
    manifest.presentation.slotColors.headline = '#000000'
    const second = await renderer.renderComposition(input)
    expect(second.sha256).not.toBe(first.sha256)
    expect(second.renderManifest.template.sha256).not.toBe(first.renderManifest.template.sha256)
  })
})
