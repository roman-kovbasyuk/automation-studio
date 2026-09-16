import { describe, expect, test } from 'vitest'
import { generateBlobPath } from './novartisGraphics.js'

describe('Novartis graphic generator', () => {
  test('returns a closed, deterministic organic path', () => {
    const options = { seed: 12, lobes: 4, irregularity: 0.22, pointsPerLobe: 8 }
    const first = generateBlobPath(options)
    const second = generateBlobPath(options)

    expect(first).toBe(second)
    expect(first).toMatch(/^M\s[-\d.]+\s[-\d.]+/)
    expect(first.endsWith('Z')).toBe(true)
  })

  test('changes the contour when the seed or lobe count changes', () => {
    const base = generateBlobPath({ seed: 12, lobes: 4 })
    expect(generateBlobPath({ seed: 13, lobes: 4 })).not.toBe(base)
    expect(generateBlobPath({ seed: 12, lobes: 5 })).not.toBe(base)
  })

  test('clamps low point counts to a usable contour', () => {
    const path = generateBlobPath({ pointsPerLobe: 1 })
    expect(path.split('Q').length).toBeGreaterThan(8)
  })
})
