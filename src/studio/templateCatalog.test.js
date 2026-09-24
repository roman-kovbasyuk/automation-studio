import { describe, expect, test } from 'vitest'
import { normalizeCatalog } from './templateCatalog.js'

const template = (id, brand) => ({ id, name: id, version: '1.0.0', manifest: { id, version: '1.0.0', ratios: [{ id: 'square', width: 1080, height: 1080 }], ...(brand ? { brand } : {}) } })

describe('template catalog and published brand systems', () => {
  test('a published brand shows unbranded layouts and its own branded versions, not other brands', () => {
    const catalog = normalizeCatalog({ systemId: 'brand:aura', templates: [
      template('editorial-split'),
      template('postcard', { systemId: 'aura', name: 'Aura Audio' }),
      template('side-story', { systemId: 'other', name: 'Other brand' }),
    ] })
    expect(catalog.entries.map(entry => entry.templateId).sort()).toEqual(['editorial-split', 'postcard'])
    expect(catalog.entries.every(entry => entry.source === 'published')).toBe(true)
  })

  test('a published brand with nothing available shows no reference placeholders', () => {
    const catalog = normalizeCatalog({ systemId: 'brand:aura', templates: [template('side-story', { systemId: 'other', name: 'Other' })] })
    expect(catalog.entries).toEqual([])
  })

  test('client reference kits keep their placeholder cards when no templates match', () => {
    const catalog = normalizeCatalog({ systemId: 'novartis', templates: [] })
    expect(catalog.entries.some(entry => entry.source === 'reference')).toBe(true)
  })
})
