import { useRef, useState } from 'react'
import { Checkbox as CheckboxField, RadioGroup, TextArea, TextField } from 'brutalist-design-system'
import { AppButton, SelectField, TagButton } from '../../../../components/design-system/compatibility.jsx'
import { AGE_GROUPS, MAX_VISUAL_TAG_LENGTH, MAX_VISUAL_TAGS, briefAnswersConfirmedSchema, normalizeVisualTag } from '../../../../../shared/briefingContracts.js'
import { FoundCopyDialog } from './FoundCopyDialog.jsx'

const ageLabels = { under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_54': '45–54', '55_64': '55–64', '65_plus': '65+' }
const reachOptions = [{ value: '', label: 'Choose reach' }, { value: 'local', label: 'Local' }, { value: 'national', label: 'National' }, { value: 'global', label: 'Global' }]
const goalOptions = [{ value: '', label: 'Choose goal' }, { value: 'awareness', label: 'Brand awareness' }, { value: 'traffic', label: 'Traffic' }, { value: 'leads', label: 'Lead generation' }, { value: 'signups', label: 'Sign-ups' }, { value: 'sales', label: 'Sales' }, { value: 'other', label: 'Other' }]

const steps = [
  { id: 'copy', number: '01', title: 'Banner copy', description: 'Choose how the wording should be handled.' },
  { id: 'campaign', number: '02', title: 'Campaign', description: 'Set the audience and outcome for this campaign.' },
  { id: 'visuals', number: '03', title: 'Visual content', description: 'Give the visual generator a clear creative direction.' },
]

function campaignComplete(draft) {
  return Boolean(draft.summary?.trim() && draft.audience?.trim() && draft.reach && draft.goal && draft.copyMode)
}

function StepCard({ step, active, complete, onEdit, children }) {
  return <section className={`bs-briefing-card${active ? ' is-active' : ''}${complete ? ' is-complete' : ''}`} aria-labelledby={`briefing-step-${step.id}`}>
    <header className="bs-briefing-card__header">
      <span className="bs-briefing-card__number">{step.number}</span>
      <div><h2 id={`briefing-step-${step.id}`}>{step.title}</h2><p>{step.description}</p></div>
      {complete && <AppButton type="button" variant="secondary" onClick={onEdit}>Change</AppButton>}
    </header>
    {children}
  </section>
}

/** The prototype keeps briefing clarification focused before the full campaign page unlocks. */
export function BriefingClarificationWizard({ draft, proposal, disabled, error, onChange, onConfirm, onOpenSource }) {
  const [step, setStep] = useState(0)
  const [tagInput, setTagInput] = useState('')
  const [tagError, setTagError] = useState('')
  const [foundCopyOpen, setFoundCopyOpen] = useState(false)
  const confirming = useRef(false)
  const foundCopy = proposal?.foundCopy ?? []
  const suggestions = proposal?.suggestedVisualTags ?? []
  const complete = [Boolean(draft.copyMode), campaignComplete(draft), draft.visualTags?.length > 0].map(Boolean)
  const update = patch => {
    const next = { ...draft, ...patch }
    onChange(next)
    if (patch.copyMode && step === 0) setStep(1)
    if (step <= 1 && campaignComplete(next)) setStep(2)
    if (step === 2 && next.visualTags?.length && campaignComplete(next)
      && briefAnswersConfirmedSchema.safeParse(next).success && !confirming.current) {
      confirming.current = true
      Promise.resolve(onConfirm(next)).finally(() => { confirming.current = false })
    }
  }
  const addTag = tag => {
    const normalized = normalizeVisualTag(tag)
    if (!normalized.label) return
    if (normalized.label.length > MAX_VISUAL_TAG_LENGTH) { setTagError(`Visual keywords must be ${MAX_VISUAL_TAG_LENGTH} characters or fewer.`); return }
    if ((draft.visualTags ?? []).length >= MAX_VISUAL_TAGS) { setTagError(`You can add up to ${MAX_VISUAL_TAGS} visual keywords.`); return }
    if ((draft.visualTags ?? []).some(item => normalizeVisualTag(item).key === normalized.key)) return
    setTagError(''); setTagInput(''); update({ visualTags: [...(draft.visualTags ?? []), normalized.label] })
  }
  return <section className="bs-briefing-wizard" aria-label="Brief clarification" aria-busy={disabled || undefined}>
    <div className="bs-briefing-wizard__intro">
      <span className="bs-tag">AI analysis ready</span>
      <h2>Let’s clarify the brief</h2>
      <p>Three quick choices shape the copy and visuals. Each answer unlocks the next block; once the last choice is made, the campaign workspace opens automatically.</p>
    </div>
    <div className="bs-briefing-wizard__stack">
      {step >= 0 && <StepCard step={steps[0]} active={step === 0} complete={complete[0]} onEdit={() => setStep(0)}>
        <div className="bs-briefing-card__body">
          <TextArea label="Campaign summary" value={draft.summary ?? ''} disabled={disabled} onChange={event => update({ summary: event.target.value })} />
          <TextField label="Audience" value={draft.audience ?? ''} disabled={disabled} onChange={event => update({ audience: event.target.value })} />
          <div className="bs-briefing-card__choice-row">
            {foundCopy.length > 0 && <><p>We found wording in your materials that could work on your banners.</p><FoundCopyDialog open={foundCopyOpen} foundCopy={foundCopy} onClose={() => setFoundCopyOpen(false)} onOpenSource={onOpenSource} trigger={<AppButton type="button" variant="secondary" onClick={() => setFoundCopyOpen(true)}>View found copy</AppButton>} /></>}
            <RadioGroup name="prototype-copy-mode" label="Copy mode" value={draft.copyMode ?? undefined} disabled={disabled} onChange={copyMode => update({ copyMode })}
              options={[{ value: 'keep_original', label: <><span>Keep original copy</span><span>Use the wording exactly as shown.</span></>, disabled: foundCopy.length === 0 }, { value: 'create_new', label: <><span>Create new copy</span><span>Use your materials as a starting point.</span></> }]} />
          </div>
        </div>
      </StepCard>}
      {step >= 1 && <StepCard step={steps[1]} active={step === 1} complete={complete[1]} onEdit={() => setStep(1)}>
        <div className="bs-briefing-card__body">
          <div className="bs-briefing-grid">
            <fieldset><legend>Age groups</legend>{AGE_GROUPS.map(age => <CheckboxField key={age} label={ageLabels[age]} disabled={disabled} checked={(draft.ageGroups ?? []).includes(age)} onChange={event => update({ ageGroups: event.target.checked ? [...(draft.ageGroups ?? []), age] : (draft.ageGroups ?? []).filter(value => value !== age) })} />)}</fieldset>
            <RadioGroup name="prototype-gender" label="Gender" value={draft.gender ?? 'all'} disabled={disabled} onChange={gender => update({ gender })} options={[{ value: 'all', label: 'All' }, { value: 'women', label: 'Women' }, { value: 'men', label: 'Men' }]} />
            <SelectField label="Campaign reach" value={draft.reach ?? ''} disabled={disabled} onChange={event => update({ reach: event.target.value || null })} options={reachOptions} />
            <SelectField label="Campaign goal" value={draft.goal ?? ''} disabled={disabled} onChange={event => update({ goal: event.target.value || null, goalCustom: event.target.value === 'other' ? draft.goalCustom : '' })} options={goalOptions} />
            {draft.goal === 'other' && <TextField label="Other campaign goal" value={draft.goalCustom ?? ''} disabled={disabled} onChange={event => update({ goalCustom: event.target.value })} />}
          </div>
          {!complete[1] && <p className="bs-note">Choose a reach and goal to continue.</p>}
        </div>
      </StepCard>}
      {step >= 2 && <StepCard step={steps[2]} active={step === 2} complete={complete[2]} onEdit={() => setStep(2)}>
        <div className="bs-briefing-card__body">
          <p>Pick at least one keyword. These guide the atmosphere, setting and visual treatment.</p>
          <div className="bs-briefing-tags" aria-label="Visual keywords">
            {(draft.visualTags ?? []).map(tag => <TagButton key={tag} type="button" dismissible disabled={disabled} onClick={() => update({ visualTags: draft.visualTags.filter(item => item !== tag) })}>{tag}</TagButton>)}
            {suggestions.filter(tag => !(draft.visualTags ?? []).includes(tag)).map(tag => <AppButton key={tag} type="button" variant="secondary" disabled={disabled} onClick={() => addTag(tag)}>+ {tag}</AppButton>)}
            <input aria-label="Add visual keyword" placeholder="+ Add keyword" value={tagInput} disabled={disabled} onChange={event => { setTagInput(event.target.value); setTagError('') }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addTag(tagInput) } }} />
          </div>
          {tagError && <p role="alert">{tagError}</p>}
          {complete[2] && <p className="bs-briefing-autoadvance" role="status">All choices are set. Opening your campaign workspace…</p>}
        </div>
      </StepCard>}
    </div>
    {error && <p className="bs-brief-error" role="alert">{error}</p>}
  </section>
}
