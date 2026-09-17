import { describe, expect, test } from 'vitest'
import { AGE_GROUPS, ageGroupsFromRange, ageRangeFromGroups, briefAnswersDraftSchema, briefAnswersConfirmedSchema,
  authoredCopyFieldsSchema, authoredCopyVariantSchema, briefingStateSchema, normalizeAgeGroups } from './briefingContracts.js'
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

describe('copy choice and age range', () => {
  test('found copy can be kept alone or together with new copy', () => {
    for (const copyMode of ['keep_original', 'keep_and_create', 'create_new'])
      expect(briefAnswersConfirmedSchema.safeParse({ ...answers, copyMode }).success).toBe(true)
    expect(briefAnswersDraftSchema.safeParse({ ...answers, copyMode: 'keep_everything' }).success).toBe(false)
  })
  test('converts between slider ranges and age groups, storing the full range as no limit', () => {
    expect(ageRangeFromGroups([])).toEqual([0, 6])
    expect(ageGroupsFromRange([0, 6])).toEqual([])
    expect(ageGroupsFromRange([2, 3])).toEqual(['25_34', '35_44'])
    for (let low = 0; low < AGE_GROUPS.length; low++) for (let high = low; high < AGE_GROUPS.length; high++)
      expect(ageRangeFromGroups(ageGroupsFromRange([low, high]))).toEqual([low, high])
  })
  test('normalises older age selections to the range that covers them', () => {
    expect(normalizeAgeGroups(['45_54', '18_24'])).toEqual(['18_24', '25_34', '35_44', '45_54'])
    expect(normalizeAgeGroups([...AGE_GROUPS])).toEqual([])
    expect(normalizeAgeGroups([])).toEqual([])
    expect(normalizeAgeGroups(['65_plus'])).toEqual(['65_plus'])
  })
  test('confirms no age limit or one continuous range, while drafts keep older selections', () => {
    for (const ageGroups of [[], ['65_plus'], ['25_34', '35_44'], ['35_44', '25_34']])
      expect(briefAnswersConfirmedSchema.safeParse({ ...answers, ageGroups }).success).toBe(true)
    for (const ageGroups of [['18_24', '35_44'], [...AGE_GROUPS]]) {
      const result = briefAnswersConfirmedSchema.safeParse({ ...answers, ageGroups })
      expect(result.success).toBe(false)
      expect(result.error.issues).toEqual([expect.objectContaining({ path: ['ageGroups'], message: 'Choose one continuous age range.' })])
      expect(briefAnswersDraftSchema.safeParse({ ...answers, ageGroups }).success).toBe(true)
    }
  })
})
