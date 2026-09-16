import { describe, expect, test } from 'vitest'
import { campaignModuleUrl, parseCampaignModule } from './campaignRoutes.js'

describe('campaign module links', () => {
  test.each([[0, 'brief'], [1, 'copy'], [2, 'visuals'], [3, 'banners'],
    [4, 'banners'], [5, 'banners'], [6, 'banners'], [7, 'distribute']])(
    'keeps legacy step %s pointing to %s', (step, expected) => {
      expect(parseCampaignModule(`?step=${step}`)).toBe(expected)
      expect(parseCampaignModule('', `#campaign-step-${step}`)).toBe(expected)
    },
  )
  test.each(['brief', 'copy', 'visuals', 'banners', 'review', 'distribute'])(
    'round-trips a deep link to %s with an encoded campaign ID', moduleId => {
      const url = new URL(campaignModuleUrl('campaign/a b', moduleId), 'https://studio.example')
      expect(url.pathname).toBe('/mvp/campaign/campaign%2Fa%20b')
      expect(parseCampaignModule(url.search, url.hash)).toBe(moduleId === 'review' ? 'banners' : moduleId)
    },
  )
  test('query selection wins over a stale scroll anchor', () => {
    expect(parseCampaignModule('?module=copy&step=7', '#campaign-step-5')).toBe('copy')
    expect(parseCampaignModule('?step=5', '#campaign-module-distribute')).toBe('banners')
  })
  test.each(['?module=__proto__', '?module=approval', '?step=8', '?step=-1', '?step=01', '?step=1.5'])(
    'does not infer a module from invalid input %s', search => {
      expect(parseCampaignModule(search)).toBeNull()
    },
  )
  test('falls back from an unknown module to an explicitly valid legacy link', () => {
    expect(parseCampaignModule('?module=unknown&step=6')).toBe('banners')
    expect(parseCampaignModule('', '#campaign-module-visuals')).toBe('visuals')
    expect(() => campaignModuleUrl('campaign-1', '__proto__')).toThrow(/module/i)
    expect(() => campaignModuleUrl('', 'brief')).toThrow(/campaign/i)
  })
})
