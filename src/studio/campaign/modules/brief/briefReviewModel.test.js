import { describe, expect, test } from 'vitest'
import { emptyBriefAnswers } from '../../../../../shared/briefingContracts.js'
import {
  ageLabel, briefIssues, initialDraft, outOfDate, stepIssues, stepOfField, stepSummary, suggestedBlocks, visibleSteps, writesCopy,
} from './briefReviewModel.js'

const found = { fields: { headline: 'Spring sale: 20% off', body: '', offer: '', cta: '' }, sourceRefs: [], verification: 'text_verified' }
const proposalWithCopy = (answers = {}) => ({
  foundCopy: [{ ...found, id: 'c1' }, { ...found, id: 'c2' }, { ...found, id: 'c3' }],
  answers: { ...emptyBriefAnswers(), summary: 'Courses', audience: 'Adults', copyMode: 'keep_and_create', ageGroups: ['25_34', '35_44'],
    gender: 'women', reach: 'national', goal: 'signups', visualTags: ['winter light'], ...answers },
  suggestedVisualTags: ['winter light'],
})
const complete = { ...emptyBriefAnswers(), summary: 'Courses', audience: 'Adults', copyMode: 'keep_original', reach: 'local', goal: 'sales' }
const brief = (answers, confirmation = null) => ({ notes: 'Brief', locale: 'en', briefing: { schemaVersion: 2, sourceIds: [], sourceKey: 'a'.repeat(64),
  analysisJobId: 'analysis-1', answers, confirmation } })

describe('brief review model', () => {
  test('shows the copy step only when copy was found', () => {
    expect(visibleSteps(proposalWithCopy())).toEqual(['copy', 'settings', 'visuals'])
    expect(visibleSteps({ ...proposalWithCopy(), foundCopy: [] })).toEqual(['settings', 'visuals'])
  })

  test('starts from normalised answers and an honest copy question', () => {
    const withCopy = proposalWithCopy()
    expect(initialDraft({ ...withCopy.answers, copyMode: 'create_new', ageGroups: ['45_54', '18_24'] }, withCopy))
      .toMatchObject({ copyMode: null, ageGroups: ['18_24', '25_34', '35_44', '45_54'] })
    expect(initialDraft({ ...withCopy.answers, copyMode: 'keep_original' }, withCopy).copyMode).toBe('keep_original')
    expect(initialDraft({ ...complete, copyMode: null }, { ...withCopy, foundCopy: [] }).copyMode).toBe('create_new')
  })

  test('checks only the fields a step owns, in plain language', () => {
    const draft = { ...complete, summary: ' ', copyMode: null, goal: 'other', goalCustom: '', reach: null, ageGroups: ['18_24', '45_54'] }
    expect(stepIssues('understanding', draft)).toEqual({ summary: 'Enter a summary.' })
    expect(stepIssues('copy', draft)).toEqual({ copyMode: 'Choose whether to also write new copy.' })
    expect(stepIssues('settings', draft)).toEqual({ goalCustom: 'Describe the goal.', reach: 'Choose a reach.', ageGroups: 'Choose one continuous age range.' })
    expect(stepIssues('visuals', draft)).toEqual({})
    expect(stepIssues('settings', complete)).toEqual({})
    expect(Object.keys(briefIssues(draft))).toEqual(['summary', 'copyMode', 'reach', 'goalCustom', 'ageGroups'])
    expect(['summary', 'copyMode', 'goalCustom', 'visualTags'].map(stepOfField)).toEqual(['understanding', 'copy', 'settings', 'visuals'])
  })

  test.each([
    [[], 'All ages'], [['18_24'], '18–24'], [['18_24', '25_34', '35_44'], '18–44'], [['45_54', '55_64', '65_plus'], '45+'],
    [['65_plus'], '65+'], [['25_34', '35_44'], '25–44'],
  ])('labels age groups %j as %s', (groups, label) => {
    expect(ageLabel(groups)).toBe(label)
  })

  test('summarises collapsed steps, naming missing answers', () => {
    const proposal = proposalWithCopy()
    expect(stepSummary('copy', { ...complete, copyMode: 'keep_and_create' }, proposal)).toBe('“Spring sale: 20% off” +2 more · Also write new copy')
    expect(stepSummary('copy', { ...complete, copyMode: null }, { ...proposal, foundCopy: [{ ...found, id: 'c1', fields: { ...found.fields, headline: '', cta: 'Book now' } }] }))
      .toBe('“Book now” · Copy choice needed')
    expect(stepSummary('settings', { ...complete, ageGroups: ['25_34', '35_44'], gender: 'women', goal: 'signups', reach: 'national' }, proposal))
      .toBe('25–44 · Women · Sign-ups · National')
    expect(stepSummary('settings', { ...complete, gender: 'all', goal: 'other', goalCustom: 'Fill every seat at the autumn open day in Bergen', reach: null }, proposal))
      .toBe('All ages · Men and women · Fill every seat at the autumn open day… · Reach needed')
    expect(stepSummary('settings', { ...complete, goal: null }, proposal)).toContain('Goal needed')
    expect(stepSummary('visuals', { ...complete, visualTags: ['a', 'b', 'c', 'd', 'e', 'f'] }, proposal)).toBe('a, b, c, d +2 more')
    expect(stepSummary('visuals', complete, proposal)).toBe('No keywords')
  })

  test('marks unchanged values the analysis filled, but not defaults, changed blocks or confirmed briefs', () => {
    const proposal = proposalWithCopy()
    const draft = initialDraft({ ...proposal.answers }, proposal)
    expect([...suggestedBlocks(draft, proposal, new Set(), false)].sort()).toEqual(['ageGroups', 'copyMode', 'gender', 'goal', 'reach', 'visualTags'])
    expect(suggestedBlocks(draft, proposal, new Set(['gender', 'visualTags']), false).has('gender')).toBe(false)
    expect(suggestedBlocks({ ...draft, reach: 'local' }, proposal, new Set(), false).has('reach')).toBe(false)
    expect(suggestedBlocks(draft, proposal, new Set(), true).size).toBe(0)
    const defaults = proposalWithCopy({ copyMode: null, ageGroups: [], gender: 'all', reach: null, goal: null, visualTags: [] })
    expect(suggestedBlocks(initialDraft(defaults.answers, { ...defaults, suggestedVisualTags: [] }), { ...defaults, suggestedVisualTags: [] }, new Set(), false).size).toBe(0)
  })

  test('says when saving writes copy and what goes out of date', () => {
    expect(writesCopy({ ...complete, copyMode: 'keep_original' }, brief(complete))).toBe(false)
    expect(writesCopy({ ...complete, copyMode: 'keep_and_create' }, brief(complete))).toBe(true)
    const confirmed = brief({ ...complete, copyMode: 'create_new' }, { id: 'confirmation-1' })
    expect(writesCopy({ ...complete, copyMode: 'create_new', visualTags: ['Oslo'] }, confirmed)).toBe(false)
    expect(writesCopy({ ...complete, copyMode: 'create_new', goal: 'signups' }, confirmed)).toBe(true)
    expect(outOfDate(confirmed, { ...complete, copyMode: 'create_new', goal: 'signups' })).toBe('copy')
    expect(outOfDate(confirmed, { ...complete, copyMode: 'create_new', visualTags: ['Oslo'] })).toBe('visuals')
    expect(outOfDate(confirmed, { ...complete, copyMode: 'create_new', summary: 'Courses ' })).toBeNull()
  })
})
