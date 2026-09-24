import { describe, expect, test } from 'vitest'
import { candidateFontSizes, fitTextToBox, textLineHeight, wrapTextAt } from './textFit.js'

// A monospace stand-in: every character is 0.5em wide.
const mono = (text, fontSize) => text.length * fontSize * 0.5
const slot = (overrides = {}) => ({ id: 'headline', fontSize: 64, minFontSize: 64, maxLines: 2, ...overrides })

describe('shared text fitting', () => {
  test('tries sizes from the design size down to the minimum, and only one size without a minimum', () => {
    expect(candidateFontSizes({ fontSize: 64, minFontSize: 56 })).toEqual([64, 62, 60, 58, 56])
    expect(candidateFontSizes({ fontSize: 63, minFontSize: 58 })).toEqual([63, 61, 59, 58])
    expect(candidateFontSizes({ fontSize: 28, minFontSize: 28 })).toEqual([28])
    expect(candidateFontSizes({ fontSize: 28 })).toEqual([28])
    expect(textLineHeight(64)).toBe(77)
  })

  test('wraps greedily by words, keeps empty paragraphs and flags a word wider than the box', () => {
    const measure = text => mono(text, 10) // 5px per character
    expect(wrapTextAt('aaa bbb ccc', 40, measure).lines).toEqual(['aaa bbb', 'ccc'])
    expect(wrapTextAt('aaa bbb ccc', 30, measure).lines).toEqual(['aaa', 'bbb', 'ccc'])
    expect(wrapTextAt('aa bb cc', 30, measure).lines).toEqual(['aa bb', 'cc'])
    expect(wrapTextAt('aa bb\r\n\ncc', 100, measure).lines).toEqual(['aa bb', '', 'cc'])
    expect(wrapTextAt('tiny unbreakableword', 50, measure)).toEqual({ lines: null, word: 'unbreakableword' })
  })

  test('keeps the design size when the text fits', () => {
    const result = fitTextToBox({ value: 'Short', slot: slot({ minFontSize: 40 }), placement: { width: 400, height: 200 }, measure: mono })
    expect(result).toEqual({ ok: true, fontSize: 64, lines: ['Short'] })
  })

  test('shrinks to the largest size that fits the line limit and height', () => {
    // At 64px each character is 32px: "Quiet mornings everywhere" needs three lines in 400px.
    const result = fitTextToBox({ value: 'Quiet mornings everywhere', slot: slot({ minFontSize: 40 }), placement: { width: 400, height: 200 }, measure: mono })
    expect(result.ok).toBe(true)
    expect(result.lines.length).toBeLessThanOrEqual(2)
    expect(result.fontSize).toBeLessThan(64)
    expect(result.fontSize).toBeGreaterThanOrEqual(40)
    const oneLarger = fitTextToBox({ value: 'Quiet mornings everywhere', slot: slot({ fontSize: result.fontSize + 2, minFontSize: result.fontSize + 2 }), placement: { width: 400, height: 200 }, measure: mono })
    expect(oneLarger.ok).toBe(false)
  })

  test('without a lower minimum it fails exactly as the renderer always has', () => {
    const lines = fitTextToBox({ value: 'Quiet mornings everywhere', slot: slot(), placement: { width: 400, height: 200 }, measure: mono })
    expect(lines).toEqual({ ok: false, code: 'line_overflow', message: 'Slot headline exceeds its line limit' })
    const height = fitTextToBox({ value: 'Quiet', slot: slot({ maxLines: 4 }), placement: { width: 400, height: 50 }, measure: mono })
    expect(height).toEqual({ ok: false, code: 'line_overflow', message: 'Slot headline text exceeds its placement height' })
    const word = fitTextToBox({ value: 'Extraordinarily', slot: slot(), placement: { width: 200, height: 200 }, measure: mono })
    expect(word).toEqual({ ok: false, code: 'unbreakable_overflow', message: 'Slot headline contains a word wider than its placement' })
  })

  test('a caller check can reject a size so a smaller one is tried', () => {
    const verify = (_lines, fontSize) => fontSize > 50 ? { code: 'outline_overflow', message: 'too tall' } : null
    const result = fitTextToBox({ value: 'Fits', slot: slot({ minFontSize: 40 }), placement: { width: 400, height: 200 }, measure: mono, verify })
    expect(result).toEqual({ ok: true, fontSize: 50, lines: ['Fits'] })
  })
})
