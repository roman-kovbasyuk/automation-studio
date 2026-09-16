import { describe, expect, test } from 'vitest'
import { createNovartisBrandDraft, NOVARTIS_PALETTE, NOVARTIS_TYPE_SCALE } from './novartisBrand.js'
import { brandDraftSchema } from './contracts.js'

describe('Novartis brand foundation', () => {
  test('creates an Inter cardiovascular campaign draft with semantic roles', () => {
    const draft = createNovartisBrandDraft()
    expect(draft.name).toBe('Novartis')
    expect(draft.typography.heading).toMatchObject({ family: 'Inter', weight: 800, confirmed: true })
    expect(draft.typography.body).toMatchObject({ family: 'Inter', weight: 400, confirmed: true })
    expect(draft.colors.palette).toHaveLength(NOVARTIS_PALETTE.length)
    expect(draft.colors.roles).toMatchObject({ primary: 'novartis-blue', accent: 'novartis-coral', primaryText: 'novartis-deep-blue' })
    expect(draft.typography.scale).toEqual(NOVARTIS_TYPE_SCALE)
    expect(draft.campaignKit).toMatchObject({
      hero: { eyebrow: 'CARDIOVASCULAR', headline: 'Progress in every heartbeat', cta: 'Learn more' },
      templates: expect.arrayContaining([
        expect.objectContaining({ id: 'novartis-banner', formats: expect.arrayContaining(['square', 'horizontal', 'vertical']) }),
      ]),
    })
    expect(() => brandDraftSchema.parse(draft)).not.toThrow()
  })

  test('binds an available logo without inventing one', () => {
    const draft = createNovartisBrandDraft({ assets: [{ id: 'logo-1', kind: 'logo' }] })
    expect(draft.logoRoles.primary).toBe('logo-1')
    expect(createNovartisBrandDraft().logoRoles.primary).toBeNull()
  })
})
