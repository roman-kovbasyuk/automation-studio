import { expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { studioTemplates, studioTemplateSamples } from './studioTemplates.js'
import * as catalog from './bannerFormats.js'
import { templateManifestSchema } from './templateManifest.js'
import { createInProcessRenderer } from '../server/rendering/inProcessRenderer.js'

// One renderer for the file: loading fonts per render made this suite slow enough to time out.
const renderer = createInProcessRenderer()
const image = { bytes: await readFile('src/studio/assets/headphones.png'), mimeType: 'image/png' }

test('the format catalog advertises every delivery size and channel', () => {
  expect(catalog.bannerFormats.map(format => [format.width, format.height])).toEqual(expect.arrayContaining([[1080, 1080], [1080, 1350], [1080, 1920], [1200, 628], [1920, 1080], [1200, 1200], [1080, 1440]]))
  expect(new Set(catalog.bannerFormats.flatMap(format => format.categories))).toEqual(new Set(['social', 'google-ads', 'stories', 'video']))
})

test.each(studioTemplates.map(manifest => [manifest.name, manifest]))('%s renders every advertised format at its exact dimensions', async (_name, manifest) => {
  expect(templateManifestSchema.safeParse(manifest).success).toBe(true)
  for (const format of catalog.bannerFormats) {
    const result = await renderer.renderComposition({ manifest, ratio: format.id, slots: { ...studioTemplateSamples[manifest.id], tag: '20% off until Sunday', image } })
    expect([result.width, result.height]).toEqual([format.width, format.height])
  }
}, 30000)
