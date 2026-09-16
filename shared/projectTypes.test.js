import { describe, expect, test } from 'vitest'
import { projectTypes } from './projectTypes.js'
import { createCampaignRequestSchema } from './contracts.js'
import { assetTemplateSections } from '../src/studio/NewAssetScreen.jsx'

describe('project categories', () => {
  test('uses the same types as the template catalog', () => {
    expect(projectTypes).toEqual(assetTemplateSections.flatMap(section => section.items.filter(item => !item.uiOnly).map(item => item.id)))
  })
  test.each(['banners', 'reels', 'landing-page', 'website-page', 'presentations', 'business-cards', 'email-signature'])('preserves %s on creation', projectType => {
    expect(createCampaignRequestSchema.parse({title:'Example', brief:{notes:'Example brief'}, projectType}).projectType).toBe(projectType)
  })
  test('defaults existing banner clients and rejects unsupported categories', () => {
    expect(createCampaignRequestSchema.parse({title:'Example', brief:{notes:'Example brief'}}).projectType).toBe('banners')
    expect(createCampaignRequestSchema.safeParse({title:'Example', brief:{notes:'Example brief'}, projectType:'unknown'}).success).toBe(false)
  })
})
