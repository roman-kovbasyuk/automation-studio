import { describe, expect, test } from 'vitest'
import { briefAnswersDraftSchema, briefAnswersConfirmedSchema, authoredCopyFieldsSchema, authoredCopyVariantSchema,
  briefingStateSchema } from './briefingContracts.js'
import { briefSchema, campaignPatchRequestSchema, createCampaignRequestSchema, generatedBannerCopySchema } from './contracts.js'

const answers = { summary: 'Norwegian courses', audience: 'Adult learners', copyMode: 'keep_original',
  ageGroups: [], gender: 'all', reach: 'local', goal: 'signups', goalCustom: '', visualTags: ['Oslo streets'] }
const briefing = { schemaVersion: 2, sourceIds: [], sourceKey: 'a'.repeat(64), analysisJobId: null,
  answers, confirmation: null }

describe('briefing command boundaries', () => {
  test('permits unanswered drafts, but requires explicit choices to confirm', () => {
    const draft = { ...answers, copyMode: null, reach: null, goal: null }
    expect(briefAnswersDraftSchema.safeParse(draft).success).toBe(true)
    expect(briefAnswersConfirmedSchema.safeParse(draft).success).toBe(false)
    expect(briefAnswersConfirmedSchema.safeParse(answers).success).toBe(true)
  })
  test('requires a custom goal only for Other and unique known age bands', () => {
    expect(briefAnswersConfirmedSchema.safeParse({ ...answers, goal: 'other' }).success).toBe(false)
    expect(briefAnswersConfirmedSchema.safeParse({ ...answers, goal: 'other', goalCustom: 'Event attendance' }).success).toBe(true)
    for (const ageGroups of [['unknown'], ['18_24', '18_24']]) expect(briefAnswersDraftSchema.safeParse({ ...answers, ageGroups }).success).toBe(false)
  })
  test('allows no tags or more than seven, but rejects duplicates and unsafe budgets', () => {
    for (const visualTags of [[], Array.from({length: 12}, (_, i) => `Tag ${i}`)]) expect(briefAnswersDraftSchema.safeParse({ ...answers, visualTags }).success).toBe(true)
    for (const visualTags of [['rain', ' RAIN '], [' '], ['x'.repeat(61)], Array.from({length: 13}, (_, i) => `Tag ${i}`)])
      expect(briefAnswersDraftSchema.safeParse({ ...answers, visualTags }).success).toBe(false)
  })
  test('preserves authored wording exactly and does not invent required creative fields', () => {
    const fields = { headline: '  Learn Norwegian — together.\n', body: '', offer: '', cta: '' }
    expect(authoredCopyFieldsSchema.parse(fields)).toEqual(fields)
    expect(authoredCopyFieldsSchema.safeParse({ ...fields, headline: ' ' }).success).toBe(false)
    expect(authoredCopyFieldsSchema.safeParse({ ...fields, headline: 'x'.repeat(20_001) }).success).toBe(false)
    expect(generatedBannerCopySchema.safeParse({ id:'copy', ...fields, visualPrompt:'' }).success).toBe(false)
  })
  test('reads v2 state but rejects client-written server receipts and source hashes', () => {
    expect(briefingStateSchema.safeParse(briefing).success).toBe(true)
    expect(briefSchema.safeParse({ briefing }).success).toBe(true)
    expect(campaignPatchRequestSchema.safeParse({ brief: { notes:'Campaign', briefing } }).success).toBe(false)
    expect(createCampaignRequestSchema.safeParse({ title:'Campaign', brief: { briefing } }).success).toBe(false)
    expect(createCampaignRequestSchema.safeParse({ title:'Campaign', brief: { briefing:{schemaVersion:2} } }).success).toBe(true)
    expect(briefSchema.safeParse({ notes:'Legacy campaign' }).success).toBe(true)
  })
  test('noncreative metadata cannot make an empty authored card valid', () => {
    expect(authoredCopyVariantSchema.safeParse({id:'candidate',headline:'',body:'',offer:'',cta:'',visualPrompt:'A city'}).success).toBe(false)
  })
})
