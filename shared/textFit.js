// Text fitting shared by the PNG renderer and the browser preview, so both choose the same font
// size and line breaks for a slot. Each caller supplies its own measurement: the renderer shapes
// glyphs with fontkit, the preview measures with canvas, both from the same Inter Display files.
//
// A slot fits at the largest size between fontSize and minFontSize (the template model's textFits
// rule) where the text wraps into at most maxLines, the lines fit the placement height and no single
// word is wider than the placement. When minFontSize equals fontSize only one size is tried, so
// templates that do not opt in render exactly as before.

export const FIT_STEP = 2

export const textLineHeight = fontSize => Math.ceil(fontSize * 1.2)

/** Font sizes to try, largest first, ending at minFontSize. */
export function candidateFontSizes({ fontSize, minFontSize = fontSize }) {
  const floor = Math.min(fontSize, minFontSize)
  const sizes = []
  for (let size = fontSize; size > floor; size -= FIT_STEP) sizes.push(size)
  sizes.push(floor)
  return sizes
}

/**
 * Greedy word wrap, identical to the renderer's historical rule: paragraphs split on newlines,
 * words on spaces and tabs, an empty paragraph keeps an empty line.
 * Returns { lines } or { lines: null, word } when a single word is wider than the width.
 */
export function wrapTextAt(value, width, measure) {
  const lines = []
  const normalized = String(value).replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  for (const paragraph of normalized.split('\n')) {
    const words = paragraph.trim().split(/[\t\f\v ]+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      if (measure(word) > width) return { lines: null, word }
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate) <= width) line = candidate
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return { lines }
}

/**
 * Finds the largest candidate size at which `value` fits the slot's placement.
 * `measure(text, fontSize)` returns the rendered width. `verify(lines, fontSize)` may add a caller
 * check (the renderer verifies glyph outlines) and returns a failure or null.
 * Returns { ok: true, fontSize, lines } or { ok: false, code, message } for the smallest size.
 */
export function fitTextToBox({ value, slot, placement, measure, verify }) {
  let failure = null
  for (const fontSize of candidateFontSizes(slot)) {
    const wrapped = wrapTextAt(value, placement.width, text => measure(text, fontSize))
    if (!wrapped.lines) {
      failure = { code: 'unbreakable_overflow', message: `Slot ${slot.id} contains a word wider than its placement` }
      continue
    }
    const { lines } = wrapped
    if (lines.length > slot.maxLines) {
      failure = { code: 'line_overflow', message: `Slot ${slot.id} exceeds its line limit` }
      continue
    }
    if (lines.length * textLineHeight(fontSize) > placement.height) {
      failure = { code: 'line_overflow', message: `Slot ${slot.id} text exceeds its placement height` }
      continue
    }
    const rejected = verify?.(lines, fontSize)
    if (rejected) {
      failure = rejected
      continue
    }
    return { ok: true, fontSize, lines }
  }
  return { ok: false, ...failure }
}
