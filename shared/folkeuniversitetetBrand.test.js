import { describe, expect, test } from 'vitest'
import { getBrandReadiness } from './brandDesignSystem.js'
import { createFolkeuniversitetetBrandDraft, folkeuniversitetetFigma } from './folkeuniversitetetBrand.js'

describe('Folkeuniversitetet brand foundation', () => {
  test('captures the Figma palette and semantic roles', () => {
    const draft = createFolkeuniversitetetBrandDraft()
    expect(draft.name).toBe('Folkeuniversitetet')
    expect(draft.colors.palette.map(token => token.value)).toEqual([
      '#FF3F2E', '#FFC6B6', '#BA0C2F', '#00205B', '#FFE2D9', '#273659', '#941962', '#FF285C',
    ])
    expect(draft.colors.roles).toEqual({
      primary: 'primary-red', accent: 'accent-red', canvas: 'paper', surface: 'accent-light',
      primaryText: 'accent-blue', inverseText: 'paper',
    })
  })

  test('keeps the unlicensed display face draft-only while using Inter for body copy', () => {
    const draft = createFolkeuniversitetetBrandDraft()
    expect(draft.typography.heading).toMatchObject({ family: 'Matter', weight: 600, confirmed: false })
    expect(draft.typography.body).toMatchObject({ family: 'Inter', weight: 400, confirmed: true })
    expect(draft.typography.licenseConfirmed).toBe(false)
    expect(getBrandReadiness(draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'logoRoles.primary' }),
      expect.objectContaining({ field: 'typography.heading.confirmed' }),
      expect.objectContaining({ field: 'typography.licenseConfirmed' }),
    ]))
  })

  test('selects the supplied logo and preserves source provenance', () => {
    const draft = createFolkeuniversitetetBrandDraft({
      assets: [{ id: 'fu-logo', name: 'Folkeuniversitetet logo', kind: 'logo', mimeType: 'image/svg+xml', approved: true }],
      sources: [{ id: 'fu-figma', kind: 'figma', label: 'Folkeuniversitetet Brand', url: folkeuniversitetetFigma, status: 'ready' }],
    })
    expect(draft.logoRoles.primary).toBe('fu-logo')
    expect(draft.sources[0].url).toBe(folkeuniversitetetFigma)
  })
})
