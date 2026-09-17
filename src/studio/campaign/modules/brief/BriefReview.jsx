import { Alert, Button, Panel, Stack, Text, TextArea, TextField } from 'brutalist-design-system'
import { useEffect, useRef, useState } from 'react'
import { BriefStep } from './BriefStep.jsx'
import { FoundCopyStep } from './FoundCopyStep.jsx'
import { SettingsStep } from './SettingsStep.jsx'
import { VisualContextStep } from './VisualContextStep.jsx'
import { OUT_OF_DATE_MESSAGES, briefIssues, outOfDate, stepIssues, stepSummary, suggestedBlocks, visibleSteps, writesCopy } from './briefReviewModel.js'

const titles = { copy: 'Copy found', settings: 'Settings', visuals: 'Visual context' }
const proceedLabels = { copy: 'Proceed to settings →', settings: 'Proceed to visual context →' }
const stepElement = step => step === 'understanding' ? 'brief-understanding' : `brief-step-${step}`
const addTo = value => current => new Set(current).add(value)

/**
 * Stepwise review of an analysed brief (docs/specs/brief-review.md). The draft and its unsaved
 * state belong to the caller; this component owns which steps are open, reached and changed.
 */
export function BriefReview({ brief, proposal, draft, dirty, readOnly, busy, error, notice, onChange, onConfirm, onDiscard, onOpenSource }) {
  const confirmed = Boolean(brief.briefing.confirmation)
  const steps = visibleSteps(proposal)
  const [openStep, setOpenStep] = useState(confirmed || readOnly ? null : steps[0])
  const [reached, setReached] = useState(() => new Set(confirmed || readOnly ? steps : [steps[0]]))
  const [changed, setChanged] = useState(() => new Set())
  const [attempted, setAttempted] = useState(() => new Set())
  const [submitError, setSubmitError] = useState('')
  const [focus, setFocus] = useState(null)
  const root = useRef(null)

  useEffect(() => {
    if (!focus) return
    const container = root.current?.querySelector(`#${stepElement(focus.step)}`)
    const target = (focus.field ? container?.querySelector(':is(input, textarea, select)[aria-invalid="true"]') : null) ?? container
    target?.focus()
    setFocus(null)
  }, [focus])

  // Confirming collapses every step. Runtime refreshes replace the proposal object, so only the transition counts.
  useEffect(() => {
    if (!confirmed) return
    setOpenStep(null)
    setReached(new Set(steps))
  }, [confirmed])

  const issues = briefIssues(draft)
  const shownIssues = Object.fromEntries(Object.entries(issues).filter(([field]) => attempted.has(field)))
  const suggested = suggestedBlocks(draft, proposal, changed, confirmed)
  const staleness = confirmed && dirty ? outOfDate(brief, draft) : null
  const startsCopy = (!confirmed || dirty) && writesCopy(draft, brief)

  const update = (patch, block) => {
    setChanged(addTo(block))
    setSubmitError('')
    onChange({ ...draft, ...patch })
  }
  const open = (step, { field = false } = {}) => {
    if (step !== 'understanding') {
      setReached(addTo(step))
      setOpenStep(step)
    }
    setFocus({ step, field })
  }
  const proceed = step => {
    const problems = Object.keys(stepIssues(step, draft))
    if (problems.length) {
      setAttempted(current => new Set([...current, ...problems]))
      setFocus({ step, field: true })
      return
    }
    open(steps[steps.indexOf(step) + 1])
  }
  const submit = async () => {
    if (Object.keys(issues).length) {
      setAttempted(new Set(Object.keys(issues)))
      open(['understanding', ...steps].find(step => Object.keys(stepIssues(step, draft)).length), { field: true })
      return
    }
    setSubmitError('')
    const result = await onConfirm(draft)
    if (result?.ok) {
      if (confirmed) setOpenStep(null)
      return
    }
    setSubmitError(result?.message || 'Unable to confirm the brief.')
    if (result?.code === 'copy_capacity_exceeded' && steps.includes('copy')) open('copy')
  }
  const cancel = () => {
    onDiscard()
    setAttempted(new Set())
    setSubmitError('')
    setOpenStep(null)
  }

  const problem = (submitError || error) && <p role="alert" className="bs-brief-error">{submitError || error}</p>
  const copyNote = startsCopy && <Text tone="secondary">Starts writing 5 copy options.</Text>
  const saveActions = <Stack gap={3}>
    {staleness && <Text tone="secondary">{OUT_OF_DATE_MESSAGES[staleness]}</Text>}
    {copyNote}
    <div className="bs-brief-save">
      <Button disabled={busy} onClick={cancel}>Cancel</Button>
      <Button variant="primary" busy={busy} onClick={submit}>Save changes</Button>
    </div>
    {problem}
  </Stack>
  const actionsFor = step => {
    if (confirmed) return saveActions
    if (step !== 'visuals') return <Stack gap={3}>
      <Button variant="primary" disabled={busy} onClick={() => proceed(step)}>{proceedLabels[step]}</Button>
      {problem}
    </Stack>
    return <Stack gap={3}>
      {copyNote}
      <Button variant="primary" busy={busy} onClick={submit}>Finalize brief &amp; proceed to copy →</Button>
      {problem}
    </Stack>
  }
  const content = step => {
    const props = { draft, errors: shownIssues, suggested, disabled: busy, onChange: update }
    if (step === 'copy') return <FoundCopyStep {...props} foundCopy={proposal.foundCopy} onOpenSource={onOpenSource} />
    if (step === 'settings') return <SettingsStep {...props} />
    return <VisualContextStep {...props} />
  }

  return <div className="bs-brief-review" ref={root}>
    {notice && <Alert title={notice} tone="info" announce />}
    <Panel id={stepElement('understanding')} tabIndex={-1} title="What we understood" headingLevel={2}>
      <TextArea label="Summary" value={draft.summary} maxLength={1000} readOnly={readOnly} disabled={busy} error={shownIssues.summary}
        onChange={event => update({ summary: event.target.value }, 'summary')} />
      <TextField label="Audience" value={draft.audience} maxLength={500} readOnly={readOnly} disabled={busy} error={shownIssues.audience}
        onChange={event => update({ audience: event.target.value }, 'audience')} />
      {confirmed && dirty && !openStep && saveActions}
    </Panel>
    {steps.filter(step => reached.has(step)).map(step => <BriefStep key={step} id={step} number={steps.indexOf(step) + 1} total={steps.length}
      title={titles[step]} open={openStep === step} summary={stepSummary(step, draft, proposal)}
      onEdit={readOnly || busy ? undefined : () => open(step)} actions={openStep === step ? actionsFor(step) : undefined}>
      {openStep === step && content(step)}
    </BriefStep>)}
  </div>
}
