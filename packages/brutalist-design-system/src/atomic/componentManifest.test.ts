import { describe, expect, it } from 'vitest'
import * as publicApi from './index'
import { componentManifest } from './componentManifest'

describe('component manifest', () => {
  it('contains each public component exactly once and points to a documentation id', () => {
    const names = componentManifest.map(entry => entry.name)
    expect(new Set(names).size).toBe(names.length)
    expect(componentManifest.every(entry => entry.id.startsWith('component-'))).toBe(true)
    expect(componentManifest.every(entry => entry.name in publicApi)).toBe(true)
  })
})
