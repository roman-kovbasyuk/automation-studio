import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { createMsdPresentationTemplates, presentationAiContract, validatePresentationValues } from './msdPresentationTemplates.js'
import { templateManifestSchema } from './templateManifest.js'
import { renderComposition } from '../server/rendering/inProcessRenderer.js'

describe('native MSD presentation templates', () => {
  const templates = createMsdPresentationTemplates()
  test('provides five unique renderer-compatible layouts and exact AI contracts', () => {
    expect(new Set(templates.map(template => template.id)).size).toBe(5)
    for (const template of templates) {
      expect(templateManifestSchema.safeParse(template.manifest).success).toBe(true)
      expect(validatePresentationValues(template, template.sampleValues)).toEqual([])
      const contract = presentationAiContract(template)
      expect(contract.outputSchema.additionalProperties).toBe(false)
      expect(contract.outputSchema.required.sort()).toEqual(Object.keys(template.sampleValues).sort())
    }
  })
  test('rejects extra keys, partial responses, long copy, wrong numbering and visual overflow', () => {
    const template = templates[0]
    expect(validatePresentationValues(template, { ...template.sampleValues, invented: 'no' })).toContain('Unknown field: invented.')
    expect(validatePresentationValues(template, {})).toContain('headline: add text.')
    expect(validatePresentationValues(template, { ...template.sampleValues, headline: 'x'.repeat(49) })).toContain('headline: use at most 48 characters.')
    expect(validatePresentationValues(template, { ...template.sampleValues, page: '22' })).toContain('page: keep the fixed sequence number.')
    expect(validatePresentationValues(template, { ...template.sampleValues, headline: 'a\nb\nc\nd' })).toContain('headline: shorten the copy to fit 3 lines.')
    expect(validatePresentationValues(template, template.sampleValues, () => 10000)).toContain('headline: a word is too wide for this layout.')
    expect(validatePresentationValues(template, null)).toEqual(['Content must be a JSON object.'])
  })
  test('keeps the source immutable and maps the brand logo into slide coordinates', () => {
    const source = { presentation: { graphics: [{ id: 'brand-primary-logo', assetId: 'logo', dataUrl: 'data:image/png;base64,AAAA', placements: { square: { x: 1, y: 1, width: 5, height: 5 } } }] } }
    const before = JSON.stringify(source)
    const derived = createMsdPresentationTemplates(source)
    expect(JSON.stringify(source)).toBe(before)
    expect(derived[0].manifest.presentation.graphics[0].placements.widescreen).toEqual({ x: 64, y: 42, width: 128, height: 64 })
  })
  test.each(templates)('renders $id without text clipping through the existing renderer', async template => {
    const bytes = await readFile(`${process.cwd()}/src/studio/assets/msd-glass.png`)
    const slots = { ...template.sampleValues }
    if (template.manifest.slots.some(slot => slot.type === 'image')) slots.artwork = { bytes, mimeType: 'image/png' }
    const result = await renderComposition({ manifest: template.manifest, ratio: 'widescreen', slots })
    expect(result.width).toBe(1280)
    expect(result.height).toBe(720)
    expect(result.byteSize).toBeGreaterThan(1000)
  })
})
