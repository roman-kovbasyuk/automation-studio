import { ageRangeFromGroups, briefAnswersConfirmedSchema, briefAnswersDraftSchema, normalizeAgeGroups } from '../../../../../shared/briefingContracts.js'
import { classifyBriefChange } from '../../../../../shared/briefingDependencies.js'

// Pure rules for the brief review (docs/specs/brief-review.md).

export const STEP_FIELDS = Object.freeze({
  understanding: ['summary', 'audience'],
  copy: ['copyMode'],
  settings: ['ageGroups', 'gender', 'goal', 'goalCustom', 'reach'],
  visuals: ['visualTags'],
})
export const AGE_LABELS = Object.freeze(['18–24', '25–34', '35–44', '45–54', '55–64', '65+'])
export const COPY_OPTIONS = Object.freeze([{ value: 'keep_original', label: 'No, use this copy' }, { value: 'keep_and_create', label: 'Yes, also write new options' }])
export const GENDER_OPTIONS = Object.freeze([{ value: 'men', label: 'Men' }, { value: 'women', label: 'Women' }, { value: 'all', label: 'Both' }])
export const GOAL_OPTIONS = Object.freeze([{ value: 'awareness', label: 'Brand awareness' }, { value: 'traffic', label: 'Traffic' },
  { value: 'leads', label: 'Lead generation' }, { value: 'signups', label: 'Sign-ups' }, { value: 'sales', label: 'Sales' }, { value: 'other', label: 'Other' }])
export const REACH_OPTIONS = Object.freeze([{ value: 'local', label: 'Local' }, { value: 'national', label: 'National' }, { value: 'global', label: 'Global' }])
// Icons compose onto the plain-text options above in the view layer; the model stays React-free.
export const GENDER_ICONS = Object.freeze({ men: 'Mars', women: 'Venus', all: 'Users' })
export const GOAL_ICONS = Object.freeze({ awareness: 'Eye', traffic: 'TrendingUp', leads: 'UserPlus', signups: 'UserCheck', sales: 'ShoppingCart' })
export const REACH_ICONS = Object.freeze({ local: 'MapPin', national: 'Flag', global: 'Globe' })

const ageBounds = [[18, 24], [25, 34], [35, 44], [45, 54], [55, 64], [65, null]]
const requiredMessages = { summary: 'Enter a summary.', audience: 'Describe the audience.', copyMode: 'Choose whether to also write new copy.',
  goal: 'Choose a goal.', goalCustom: 'Describe the goal.', reach: 'Choose a reach.', ageGroups: 'Choose one continuous age range.' }
const labelOf = (options, value) => options.find(option => option.value === value)?.label
const short = (text, limit) => text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const withAnswers = (brief, answers) => ({ ...brief, briefing: { ...brief.briefing, answers } })

export function visibleSteps(proposal) {
  return proposal?.foundCopy?.length ? ['copy', 'settings', 'visuals'] : ['settings', 'visuals']
}

/** Found copy is always kept, so a proposal with it never starts by dropping it; ages form one range. */
export function initialDraft(answers, proposal) {
  const copyMode = !proposal?.foundCopy?.length ? 'create_new' : answers.copyMode === 'create_new' ? null : answers.copyMode
  return { ...answers, copyMode, ageGroups: normalizeAgeGroups(answers.ageGroups) }
}

/** Every problem that blocks confirmation, as field → plain-language message. */
export function briefIssues(draft) {
  const result = briefAnswersConfirmedSchema.safeParse(draft)
  if (result.success) return {}
  const issues = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    issues[field] ??= issue.code === 'custom' && requiredMessages[field] ? requiredMessages[field] : issue.message
  }
  return issues
}

export function stepIssues(step, draft) {
  return Object.fromEntries(Object.entries(briefIssues(draft)).filter(([field]) => STEP_FIELDS[step].includes(field)))
}

export function ageLabel(groups) {
  const [low, high] = ageRangeFromGroups(groups)
  if (low === 0 && high === ageBounds.length - 1) return 'All ages'
  if (high === ageBounds.length - 1) return `${ageBounds[low][0]}+`
  return `${ageBounds[low][0]}–${ageBounds[high][1]}`
}

export function stepSummary(step, draft, proposal) {
  if (step === 'copy') {
    const [first] = proposal.foundCopy, more = proposal.foundCopy.length - 1
    const lead = ['headline', 'body', 'offer', 'cta'].map(field => first.fields[field].trim()).find(Boolean) ?? ''
    const choice = draft.copyMode === 'keep_original' ? 'Use this copy only' : draft.copyMode === 'keep_and_create' ? 'Also write new copy' : 'Copy choice needed'
    return `“${short(lead, 60)}”${more ? ` +${more} more` : ''} · ${choice}`
  }
  if (step === 'settings') {
    const gender = draft.gender === 'all' ? 'Men and women' : labelOf(GENDER_OPTIONS, draft.gender)
    const goal = draft.goal === 'other' ? (draft.goalCustom.trim() ? short(draft.goalCustom.trim(), 40) : 'Goal needed') : labelOf(GOAL_OPTIONS, draft.goal) ?? 'Goal needed'
    return [ageLabel(draft.ageGroups), gender, goal, labelOf(REACH_OPTIONS, draft.reach) ?? 'Reach needed'].join(' · ')
  }
  if (step === 'visuals') {
    const tags = draft.visualTags
    return tags.length ? `${tags.slice(0, 4).join(', ')}${tags.length > 4 ? ` +${tags.length - 4} more` : ''}` : 'No keywords'
  }
  return ''
}

/** Blocks whose value the analysis filled and nobody has changed yet. Defaults and empty values are never suggestions. */
export function suggestedBlocks(draft, proposal, changedBlocks, confirmed) {
  if (confirmed || !proposal) return new Set()
  const proposed = initialDraft(proposal.answers, proposal)
  const candidates = {
    copyMode: Boolean(proposal.foundCopy.length && proposed.copyMode) && draft.copyMode === proposed.copyMode,
    ageGroups: proposed.ageGroups.length > 0 && same(normalizeAgeGroups(draft.ageGroups), proposed.ageGroups),
    gender: proposed.gender !== 'all' && draft.gender === proposed.gender,
    goal: Boolean(proposed.goal) && draft.goal === proposed.goal && (proposed.goal !== 'other' || draft.goalCustom === proposed.goalCustom),
    reach: Boolean(proposed.reach) && draft.reach === proposed.reach,
    visualTags: proposal.suggestedVisualTags.length > 0 && same(draft.visualTags, proposal.suggestedVisualTags),
  }
  return new Set(Object.keys(candidates).filter(block => candidates[block] && !changedBlocks.has(block)))
}

const trimmed = draft => {
  const parsed = briefAnswersDraftSchema.safeParse(draft)
  return parsed.success ? parsed.data : draft
}

/** Whether confirming the draft may start writing copy; copyMode is not in the copy key, so switching into a writing mode counts on its own. */
export function writesCopy(draft, brief) {
  if (!['create_new', 'keep_and_create'].includes(draft.copyMode)) return false
  if (!brief.briefing?.confirmation) return true
  if (brief.briefing.answers.copyMode !== draft.copyMode) return true
  return classifyBriefChange(brief, withAnswers(brief, trimmed(draft))).copy
}
