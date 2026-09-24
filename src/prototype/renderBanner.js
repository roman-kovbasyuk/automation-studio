// In-browser banner rendering for the offline prototype. It follows the server renderer's order and
// rules (background, shapes, cover-cropped image, fitted text, brand graphics) and fits text with the
// shared rule, so the simulated review package matches what the service would produce. The real
// application always renders on the server.
import { fitTextToBox, textLineHeight } from '../../shared/textFit.js'

const fontFamily = slot => slot.fontFamily === 'Arimo' ? 'Arimo' : 'Studio Banner Inter'

let fontsLoaded = null
function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve()
  fontsLoaded ??= Promise.all([400, 600, 700].flatMap(weight => ['Studio Banner Inter', 'Arimo']
    .map(family => document.fonts.load(`${weight} 32px "${family}"`)))).catch(() => {})
  return fontsLoaded
}

function measurer(context, slot) {
  return (text, fontSize) => {
    context.font = `${slot.fontWeight} ${fontSize}px "${fontFamily(slot)}"`
    return context.measureText(text).width
  }
}

export class BannerFitError extends Error {
  constructor(slotId, failure) {
    super(failure.message)
    this.name = 'BannerFitError'
    this.code = failure.code
    this.slotId = slotId
  }
}

/** Checks that every text slot fits, without drawing. Throws BannerFitError for the first failure. */
export async function checkBannerFit({ manifest, ratioId, slots }) {
  await loadFonts()
  const context = document.createElement('canvas').getContext('2d')
  for (const slot of manifest.slots) {
    if (slot.type === 'image' || !slots[slot.id]?.trim()) continue
    const fit = fitTextToBox({ value: slots[slot.id], slot, placement: slot.placements[ratioId], measure: measurer(context, slot) })
    if (!fit.ok) throw new BannerFitError(slot.id, fit)
  }
}

// The prototype's network guard blocks fetch, so data URLs are decoded directly.
function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0))
  return new Blob([bytes], { type: header.slice(5).split(';')[0] })
}

async function decodeImage(blob) {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    // The decoded image keeps its pixels; the object URL is no longer needed.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

/** Renders one banner to a PNG Blob. `slots.image` is a Blob. */
export async function renderBannerPng({ manifest, ratioId, slots }) {
  await loadFonts()
  const ratio = manifest.ratios.find(item => item.id === ratioId)
  if (!ratio) throw new Error(`${manifest.name} does not support ${ratioId}.`)
  const canvas = document.createElement('canvas')
  canvas.width = ratio.width
  canvas.height = ratio.height
  const context = canvas.getContext('2d')
  const presentation = manifest.presentation
  context.fillStyle = presentation.backgroundColor
  context.fillRect(0, 0, ratio.width, ratio.height)
  for (const shape of presentation.shapes) {
    const p = shape.placements[ratioId]
    context.fillStyle = shape.fill
    if (shape.type === 'ellipse') {
      context.beginPath()
      context.ellipse(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, p.height / 2, 0, 0, Math.PI * 2)
      context.fill()
    } else context.fillRect(p.x, p.y, p.width, p.height)
  }
  for (const slot of manifest.slots) {
    const p = slot.placements[ratioId]
    if (slot.type === 'image') {
      if (!slots.image) continue
      const image = await decodeImage(slots.image)
      const scale = Math.max(p.width / image.naturalWidth, p.height / image.naturalHeight)
      const width = p.width / scale, height = p.height / scale
      context.drawImage(image, (image.naturalWidth - width) / 2, (image.naturalHeight - height) / 2, width, height, p.x, p.y, p.width, p.height)
      continue
    }
    const value = slots[slot.id]
    if (!value?.trim()) {
      if (slot.required) throw new BannerFitError(slot.id, { code: 'missing_slot', message: `Missing required text for ${slot.id}` })
      continue
    }
    const fit = fitTextToBox({ value, slot, placement: p, measure: measurer(context, slot) })
    if (!fit.ok) throw new BannerFitError(slot.id, fit)
    context.fillStyle = presentation.slotColors[slot.id]
    context.font = `${slot.fontWeight} ${fit.fontSize}px "${fontFamily(slot)}"`
    context.textBaseline = 'alphabetic'
    fit.lines.forEach((line, index) => context.fillText(line, p.x, p.y + fit.fontSize + index * textLineHeight(fit.fontSize)))
  }
  for (const graphic of presentation.graphics ?? []) {
    const p = graphic.placements[ratioId]
    context.fillStyle = graphic.backgroundColor
    context.fillRect(p.x, p.y, p.width, p.height)
    const logo = await decodeImage(dataUrlToBlob(graphic.dataUrl))
    const scale = Math.min((p.width - 20) / logo.naturalWidth, (p.height - 20) / logo.naturalHeight)
    const width = logo.naturalWidth * scale, height = logo.naturalHeight * scale
    context.drawImage(logo, p.x + (p.width - width) / 2, p.y + (p.height - height) / 2, width, height)
  }
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The banner could not be rendered.')), 'image/png'))
  return { blob, width: ratio.width, height: ratio.height }
}
