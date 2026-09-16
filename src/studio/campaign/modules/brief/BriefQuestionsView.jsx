import { Checkbox as CheckboxField, Heading, Stack, Text, RadioGroup, TextField } from 'brutalist-design-system'
import { AppButton, SelectField, TagButton } from "../../../../components/design-system/compatibility.jsx"
import { useState } from 'react'
import { AGE_GROUPS, MAX_VISUAL_TAG_LENGTH, MAX_VISUAL_TAGS, normalizeVisualTag } from '../../../../../shared/briefingContracts.js'
import { FoundCopyDialog } from './FoundCopyDialog.jsx'

function BriefGroup({ title, children }) {
  return <section role="group" aria-label={title}><Stack gap={4}><Heading level={3} variant="h5">{title}</Heading>{children}</Stack></section>
}

const ageLabels = { under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_54': '45–54', '55_64': '55–64', '65_plus': '65+' }
const reachOptions = [{ value: '', label: 'Choose reach' }, { value: 'local', label: 'Local' }, { value: 'national', label: 'National' }, { value: 'global', label: 'Global' }]
const goalOptions = [{ value: '', label: 'Choose goal' }, { value: 'awareness', label: 'Brand awareness' }, { value: 'traffic', label: 'Traffic' }, { value: 'leads', label: 'Lead generation' }, { value: 'signups', label: 'Sign-ups' }, { value: 'sales', label: 'Sales' }, { value: 'other', label: 'Other' }]

/** @typedef {{summary:string,audience:string,copyMode:'keep_original'|'create_new'|null,ageGroups:string[],gender:'all'|'women'|'men',reach:'local'|'national'|'global'|null,goal:'awareness'|'traffic'|'leads'|'signups'|'sales'|'other'|null,goalCustom:string,visualTags:string[]}} BriefDraft */

/** @param {{draft:BriefDraft, foundCopy:Array, sources:Array, disabled:boolean, onChange:(nextDraft:BriefDraft)=>void, onOpenSource:(sourceId:string)=>void}} props */
export function BriefQuestionsView({ draft, foundCopy, sources, disabled, onChange, onOpenSource }) {
  const [foundCopyOpen, setFoundCopyOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagError, setTagError] = useState('')
  const update = patch => onChange({ ...draft, ...patch })
  const addTag = event => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    const normalized = normalizeVisualTag(tagInput)
    if (!normalized.label) return
    if (normalized.label.length > MAX_VISUAL_TAG_LENGTH) {
      setTagError(`Visual keywords must be ${MAX_VISUAL_TAG_LENGTH} characters or fewer.`)
      return
    }
    if (draft.visualTags.length >= MAX_VISUAL_TAGS) {
      setTagError(`You can add up to ${MAX_VISUAL_TAGS} visual keywords.`)
      return
    }
    if (draft.visualTags.some(tag => normalizeVisualTag(tag).key === normalized.key)) return
    setTagError('')
    setTagInput('')
    update({ visualTags: [...draft.visualTags, normalized.label] })
  }
  const removeTag = tag => update({ visualTags: draft.visualTags.filter(item => item !== tag) })
  const hasFoundCopy = foundCopy.length > 0
  const dialogTrigger = <AppButton type="button" disabled={!hasFoundCopy || disabled} onClick={() => setFoundCopyOpen(true)}>View found copy</AppButton>

  return <div className="bs-brief-questions">
    <BriefGroup title="Banner copy">
      {hasFoundCopy && <p>We found wording in your documents that could work on your banners.</p>}
      {!hasFoundCopy && <p>No banner copy found in your materials.</p>}
      <FoundCopyDialog open={foundCopyOpen} foundCopy={foundCopy} onClose={() => setFoundCopyOpen(false)} onOpenSource={onOpenSource}
        trigger={dialogTrigger} />
      <RadioGroup name="copy-mode" label="Copy mode" value={draft.copyMode ?? undefined} disabled={disabled}
        onChange={copyMode => update({ copyMode })}
        options={[{ value: 'keep_original', label: <Stack gap={1}><Text as="span">Keep original copy</Text><Text as="span" variant="small" tone="secondary">Use the wording exactly as shown.</Text></Stack>, disabled: !hasFoundCopy }, { value: 'create_new', label: <Stack gap={1}><Text as="span">Create new copy</Text><Text as="span" variant="small" tone="secondary">Use your materials as a starting point.</Text></Stack> }]} />
    </BriefGroup>
    <BriefGroup title="Campaign">
      <div className="bs-brief-questions__campaign">
        <fieldset><legend>Age groups</legend>{AGE_GROUPS.map(age => <CheckboxField key={age} label={ageLabels[age]} disabled={disabled}
          checked={draft.ageGroups.includes(age)} onChange={event => update({ ageGroups: event.target.checked ? [...draft.ageGroups, age] : draft.ageGroups.filter(value => value !== age) })} />)}</fieldset>
        <RadioGroup name="gender" label="Gender" value={draft.gender} disabled={disabled} onChange={gender => update({ gender })}
          options={[{ value: 'all', label: 'All' }, { value: 'women', label: 'Women' }, { value: 'men', label: 'Men' }]} />
        <SelectField label="Campaign reach" value={draft.reach ?? ''} disabled={disabled} onChange={event => update({ reach: event.target.value || null })} options={reachOptions} />
        <SelectField label="Campaign goal" value={draft.goal ?? ''} disabled={disabled} onChange={event => update({ goal: event.target.value || null, goalCustom: event.target.value === 'other' ? draft.goalCustom : '' })} options={goalOptions} />
        {draft.goal === 'other' && <TextField label="Other campaign goal" value={draft.goalCustom} disabled={disabled} onChange={event => update({ goalCustom: event.target.value })} />}
      </div>
    </BriefGroup>
    <BriefGroup title="Visual context">
      <p>These keywords help AI shape your visuals, including local settings, people and atmosphere. Remove any that don’t fit, or add your own.</p>
      <div className="bs-brief-questions__tags">
        {draft.visualTags.map(tag => <TagButton key={tag} type="button" dismissible disabled={disabled} onClick={() => removeTag(tag)}>{tag}</TagButton>)}
        <TextField label="Add visual keyword" placeholder="Type a keyword and press Enter" value={tagInput} disabled={disabled} onChange={event => { setTagInput(event.target.value); setTagError('') }} onKeyDown={addTag} />
      </div>
      {tagError && <p role="alert">{tagError}</p>}
    </BriefGroup>
  </div>
}
