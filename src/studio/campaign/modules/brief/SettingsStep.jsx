import { Inline, RadioGroup, RangeSlider } from 'brutalist-design-system'
import { ageGroupsFromRange, ageRangeFromGroups } from '../../../../../shared/briefingContracts.js'
import { AGE_LABELS, GENDER_OPTIONS, GOAL_OPTIONS, REACH_OPTIONS, ageLabel } from './briefReviewModel.js'
import { SuggestedBadge } from './SuggestedBadge.jsx'

const suggestion = (suggested, block) => suggested.has(block) ? <SuggestedBadge /> : undefined

/** Step 2: who the banners are for and what they should achieve. */
export function SettingsStep({ draft, errors, suggested, disabled, onChange }) {
  return <div className="bs-brief-settings">
    <RangeSlider label="Age range" lowerLabel="From" upperLabel="To" min={0} max={AGE_LABELS.length - 1} value={ageRangeFromGroups(draft.ageGroups)}
      formatValue={index => AGE_LABELS[index]} disabled={disabled}
      instructions={<Inline gap={2}><span>{ageLabel(draft.ageGroups)}</span>{suggestion(suggested, 'ageGroups')}</Inline>}
      onChange={range => onChange({ ageGroups: ageGroupsFromRange(range) }, 'ageGroups')} />
    <RadioGroup variant="tags" name="gender" label="Gender" options={GENDER_OPTIONS} value={draft.gender} disabled={disabled}
      instructions={suggestion(suggested, 'gender')} onChange={gender => onChange({ gender }, 'gender')} />
    <RadioGroup variant="tags" name="goal" label="Goal" options={GOAL_OPTIONS.filter(option => option.value !== 'other')} value={draft.goal ?? undefined} disabled={disabled}
      customOption={{ value: 'other', label: 'Other', text: draft.goalCustom, placeholder: 'Describe the goal', onTextChange: goalCustom => onChange({ goalCustom }, 'goal') }}
      instructions={suggestion(suggested, 'goal')} error={errors.goal ?? errors.goalCustom}
      onChange={goal => onChange({ goal, goalCustom: goal === 'other' ? draft.goalCustom : '' }, 'goal')} />
    <RadioGroup variant="tags" name="reach" label="Reach" options={REACH_OPTIONS} value={draft.reach ?? undefined} disabled={disabled}
      instructions={suggestion(suggested, 'reach')} error={errors.reach} onChange={reach => onChange({ reach }, 'reach')} />
  </div>
}
