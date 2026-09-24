import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { create as createFont } from 'fontkit'
import { fitTextToBox, textLineHeight } from '../../shared/textFit.js'
import sharp from 'sharp'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { templateManifestSchema } from '../../shared/templateManifest.js'
import { decodeGeneratedImage } from '../images/imageDecoder.js'

const require = createRequire(import.meta.url)
const fontFiles = Object.freeze({
  400: require.resolve('inter-ui/display/InterDisplay-Regular.woff2'),
  600: require.resolve('inter-ui/display/InterDisplay-SemiBold.woff2'),
  700: require.resolve('inter-ui/display/InterDisplay-Bold.woff2'),
})
const expectedPostscriptNames = Object.freeze({
  400: 'InterDisplay-Regular',
  600: 'InterDisplay-SemiBold',
  700: 'InterDisplay-Bold',
})
const supportedWeights = new Set(Object.keys(fontFiles).map(Number))

export class RendererError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'RendererError'
    this.code = code
  }
}

function fail(code, message) {
  throw new RendererError(code, message)
}

function roundCoordinate(value) {
  return Math.round(value * 1_000_000) / 1_000_000
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function loadFonts(paths) {
  try {
    if (!paths || typeof paths !== 'object'
      || Object.keys(paths).length !== supportedWeights.size
      || [...supportedWeights].some((weight) => typeof paths[weight] !== 'string')) {
      fail('invalid_font', 'Bundled Inter font set is incomplete')
    }
    return Object.fromEntries(Object.entries(paths).map(([weight, path]) => {
      const font = createFont(readFileSync(path))
      if (font.postscriptName !== expectedPostscriptNames[weight]
        || font['OS/2']?.usWeightClass !== Number(weight)
        || !Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0) {
        fail('invalid_font', `Bundled Inter ${weight} font is invalid`)
      }
      return [weight, font]
    }))
  } catch (error) {
    if (error instanceof RendererError) throw error
    fail('invalid_font', 'Bundled Inter fonts could not be loaded')
  }
}

function shapeLine(font, value, fontSize) {
  if (value.length === 0) return { width: 0, minY: 0, maxY: 0, glyphs: [] }
  const scale = fontSize / font.unitsPerEm
  const run = font.layout(value)
  let cursor = 0
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  const positioned = run.glyphs.map((glyph, index) => {
    const position = run.positions[index]
    const x = cursor + position.xOffset
    const box = glyph.bbox
    minX = Math.min(minX, x + box.minX)
    maxX = Math.max(maxX, x + box.maxX)
    minY = Math.min(minY, position.yOffset + box.minY)
    maxY = Math.max(maxY, position.yOffset + box.maxY)
    cursor += position.xAdvance
    return { path: glyph.path.toSVG(), x, yOffset: position.yOffset }
  })
  if (![minX, maxX, minY, maxY].every(Number.isFinite)) return { width: 0, minY: 0, maxY: 0, glyphs: [] }
  return {
    width: (maxX - minX) * scale,
    minY: minY * scale,
    maxY: maxY * scale,
    glyphs: positioned.map((glyph) => ({
      path: glyph.path,
      x: (glyph.x - minX) * scale,
      yOffset: glyph.yOffset * scale,
      scale,
    })),
  }
}

export function svgGlyphLayer({ width, height, lines, fill = '#111827' }) {
  const paths = lines.flatMap((line) => line.glyphs.map((glyph) => (
    `<path d="${glyph.path}" fill="${fill}" transform="translate(${roundCoordinate(glyph.x)} ${roundCoordinate(line.baseline - glyph.yOffset)}) scale(${roundCoordinate(glyph.scale)} ${roundCoordinate(-glyph.scale)})"/>`
  ))).join('')
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`)
}

function textLayer({ lines, placement, fontSize, font, fill = '#111827' }) {
  const lineHeight = textLineHeight(fontSize)
  const shapedLines = lines.map((line, index) => ({
    ...shapeLine(font, line, fontSize),
    baseline: fontSize + index * lineHeight,
  }))
  return svgGlyphLayer({ width: placement.width, height: placement.height, lines: shapedLines, fill })
}

export function createInProcessRenderer({ resolvedFontFiles = fontFiles } = {}) {
  const fonts = loadFonts(resolvedFontFiles)
  const arimo = createFont(readFileSync(require.resolve('../../shared/fonts/Arimo.ttf')))
  const families = { Inter: fonts, Arimo: Object.fromEntries([400, 600, 700].map(weight => [weight, arimo.getVariation({ wght: weight })])) }
  const measurements = new Map()

  function measure(value, fontSize, fontWeight, fontFamily) {
    if (value.length === 0) return 0
    const key = `${fontFamily}:${fontWeight}:${fontSize}:${value}`
    if (measurements.has(key)) return measurements.get(key)
    const width = shapeLine(families[fontFamily][fontWeight], value, fontSize).width
    measurements.set(key, width)
    return width
  }

  // Fits a text slot with the shared rule the browser preview also uses: the largest size between
  // fontSize and minFontSize whose lines fit. Glyph outlines are verified at the chosen size.
  function fitSlot(value, slot, placement) {
    const font = families[slot.fontFamily][slot.fontWeight]
    const result = fitTextToBox({
      value, slot, placement,
      measure: (text, fontSize) => measure(text, fontSize, slot.fontWeight, slot.fontFamily),
      verify: (lines, fontSize) => {
        const lineHeight = textLineHeight(fontSize)
        for (const [index, line] of lines.entries()) {
          const shaped = shapeLine(font, line, fontSize)
          const baseline = fontSize + index * lineHeight
          if (baseline - shaped.maxY < 0 || baseline - shaped.minY > placement.height) {
            return { code: 'outline_overflow', message: `Slot ${slot.id} glyph outline exceeds its placement height` }
          }
        }
        return null
      },
    })
    if (!result.ok) fail(result.code, result.message)
    return result
  }

  async function compileInput(input, { createComposites }) {
      if (!plainObject(input) || Object.keys(input).some((key) => !['manifest', 'slots', 'ratio'].includes(key))) {
        fail('invalid_input', 'Renderer input is invalid')
      }
      const parsed = templateManifestSchema.safeParse(input.manifest)
      if (!parsed.success) fail('invalid_manifest', 'Template manifest is invalid')
      const manifest = parsed.data
      if (typeof input.ratio !== 'string') fail('unsupported_ratio', 'Render ratio is unsupported')
      const ratio = manifest.ratios.find((candidate) => candidate.id === input.ratio)
      if (!ratio) fail('unsupported_ratio', `Render ratio ${input.ratio} is unsupported`)
      if (!plainObject(input.slots)) fail('invalid_input', 'Render slots are invalid')

      const slotDefinitions = new Map(manifest.slots.map((slot) => [slot.id, slot]))
      for (const slotId of Object.keys(input.slots)) {
        if (!slotDefinitions.has(slotId)) fail('unknown_slot', `Unknown render slot ${slotId}`)
      }

      const compiledSlots = []
      const composites = []
      if (createComposites && manifest.presentation) {
        const shapes = manifest.presentation.shapes.map((shape) => {
          const { x, y, width, height } = shape.placements[ratio.id]
          return shape.type === 'ellipse'
            ? `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${shape.fill}"/>`
            : `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${shape.fill}"/>`
        }).join('')
        composites.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ratio.width}" height="${ratio.height}">${shapes}</svg>`), left: 0, top: 0 })
      }
      for (const slot of manifest.slots) {
        const value = input.slots[slot.id]
        if (slot.required && (value == null || typeof value === 'string' && value.trim().length === 0)) {
          fail('missing_slot', `Missing required render slot ${slot.id}`)
        }
        if (value == null) continue
        const placement = slot.placements[ratio.id]

        if (slot.type === 'image') {
          if (!plainObject(value) || Object.keys(value).some((key) => !['bytes', 'mimeType'].includes(key))) {
            fail('unsupported_image', `Image slot ${slot.id} is invalid`)
          }
          if (!slot.acceptedMimeTypes.includes(value.mimeType)) fail('unsupported_image', `Image slot ${slot.id} MIME type is unsupported`)
          const decoded = await decodeGeneratedImage(value.bytes, value.mimeType)
          if (!decoded || decoded.width < slot.minWidth || decoded.height < slot.minHeight) {
            fail('unsupported_image', `Image slot ${slot.id} bytes or dimensions are invalid`)
          }
          const sourceBytes = Buffer.from(decoded.bytes)
          const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex')
          const scale = Math.max(placement.width / decoded.width, placement.height / decoded.height)
          const crop = {
            x: roundCoordinate((decoded.width - placement.width / scale) / 2),
            y: roundCoordinate((decoded.height - placement.height / scale) / 2),
            width: roundCoordinate(placement.width / scale),
            height: roundCoordinate(placement.height / scale),
          }
          if (createComposites) {
            const image = await sharp(sourceBytes).resize(placement.width, placement.height, {
              fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3,
            }).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, progressive: false }).toBuffer()
            composites.push({ input: image, left: placement.x, top: placement.y })
          }
          compiledSlots.push({
            id: slot.id, type: 'image', placement,
            source: { mimeType: decoded.mimeType, width: decoded.width, height: decoded.height, sha256: sourceSha256 },
            crop,
          })
          continue
        }

        if (typeof value !== 'string') fail('invalid_input', `Text slot ${slot.id} must be a string`)
        if (value.length > slot.maxCharacters) fail('character_limit', `Slot ${slot.id} exceeds its character limit`)
        if (!families[slot.fontFamily] || !supportedWeights.has(slot.fontWeight) || !families[slot.fontFamily][slot.fontWeight]) {
          fail('unsupported_font', `Slot ${slot.id} font is unsupported`)
        }
        if (slot.fontSize < slot.minFontSize) fail('minimum_font_size', `Slot ${slot.id} is below its minimum font size`)
        const { lines, fontSize } = fitSlot(value, slot, placement)
        if (createComposites) {
          composites.push({
            input: textLayer({ lines, placement, fontSize, font: families[slot.fontFamily][slot.fontWeight], fill: manifest.presentation?.slotColors[slot.id] }),
            left: placement.x,
            top: placement.y,
          })
        }
        compiledSlots.push({
          id: slot.id, type: slot.type, lines, placement,
          font: { family: slot.fontFamily, weight: slot.fontWeight, size: fontSize },
        })
      }

      for (const graphic of manifest.presentation?.graphics ?? []) {
        const bytes = Buffer.from(graphic.dataUrl.split(',')[1], 'base64')
        const decoded = await decodeGeneratedImage(bytes, 'image/png')
        if (!decoded) fail('unsupported_image', 'Brand logo PNG is invalid')
        const p = graphic.placements[ratio.id]
        if (p.width <= 20 || p.height <= 20) fail('invalid_manifest', 'Brand logo placement is too small')
        if (createComposites) {
          const logo = await sharp(decoded.bytes).resize(p.width - 20, p.height - 20, { fit: 'contain', background: graphic.backgroundColor })
            .extend({ top: 10, bottom: 10, left: 10, right: 10, background: graphic.backgroundColor }).flatten({ background: graphic.backgroundColor }).png().toBuffer()
          composites.push({ input: logo, left: p.x, top: p.y })
        }
      }
      return { manifest, ratio, compiledSlots, composites }
  }

  return Object.freeze({
    async compileSlotProvenance(input) {
      return (await compileInput(input, { createComposites: false })).compiledSlots
    },
    async renderComposition(input) {
      const { manifest, ratio, compiledSlots, composites } = await compileInput(input, { createComposites: true })
      const output = await sharp({ create: { width: ratio.width, height: ratio.height, channels: 4, background: manifest.presentation?.backgroundColor ?? '#ffffff' } })
        .composite(composites)
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, progressive: false })
        .toBuffer()
      const sha256 = createHash('sha256').update(output).digest('hex')
      const renderManifest = {
        schemaVersion: 1,
        template: { id: manifest.id, version: manifest.version, sha256: hashCanonical(manifest) },
        ratio: ratio.id,
        canvas: { width: ratio.width, height: ratio.height },
        slots: compiledSlots,
        output: { mimeType: 'image/png', width: ratio.width, height: ratio.height, byteSize: output.length, sha256 },
      }
      return {
        bytes: Buffer.from(output), mimeType: 'image/png', width: ratio.width, height: ratio.height,
        byteSize: output.length, sha256, renderManifest,
      }
    },
  })
}

const defaultRenderer = createInProcessRenderer()
export const renderComposition = (input) => defaultRenderer.renderComposition(input)
export const compileRenderSlotProvenance = (input) => defaultRenderer.compileSlotProvenance(input)
