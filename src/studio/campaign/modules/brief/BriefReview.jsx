import { Alert, Button, Text, TextAction } from 'brutalist-design-system'
import { useEffect, useRef, useState } from 'react'
import { InlineText } from '../../../../components/design-system/molecules/InlineText.jsx'
import { BriefStep } from './BriefStep.jsx'
import { FoundCopyStep } from './FoundCopyStep.jsx'
import { SettingsStep } from './SettingsStep.jsx'
import { VisualContextStep } from './VisualContextStep.jsx'
import { briefIssues, stepIssues, stepSummary, suggestedBlocks, visibleSteps, writesCopy } from './briefReviewModel.js'

const titles = { copy: 'Copy found', settings: 'Settings', visuals: 'Visual context' }
const icons = { settings: 'Settings', visuals: 'Image' }
const stepElement = step => step === 'understanding' ? 'brief-understanding' : `brief-step-${step}`
const addTo = value => current => new Set(current).add(value)
export const AUTOSAVE_DELAY_MS = 900

/** Brief review (docs/specs/brief-review.md): all open until confirmed; then collapsed, autosaving unless a change would write copy. */
export function BriefReview({ brief, proposal, draft, dirty, inputKey, readOnly, busy, saving = false, error, notice, onChange, onEditDirty, onConfirm, onDiscard, onOpenSource, sourcesSlot }) {
  const confirmed = Boolean(brief.briefing.confirmation)
  const steps = visibleSteps(proposal)
  const [openSteps, setOpenSteps] = useState(() => new Set(confirmed ? [] : steps))
  const [changed, setChanged] = useState(() => new Set())
  const [attempted, setAttempted] = useState(() => new Set())
  const [submitError, setSubmitError] = useState('')
  const [focus, setFocus] = useState(null)
  const [failedAutosave, setFailedAutosave] = useState(null)
  const root = useRef(null)
  const draftRef = useRef(draft), confirmRef = useRef(onConfirm)
  draftRef.current = draft
  confirmRef.current = onConfirm

  useEffect(() => {
    if (!focus) return
    const container = root.current?.querySelector(`#${stepElement(focus.step)}`)
    const target = (focus.field ? container?.querySelector(':is(input, textarea, select)[aria-invalid="true"]') : null) ?? container
    target?.focus()
    setFocus(null)
  }, [focus])

  // Stages stay mounted across navigation, so confirming never remounts this: collapse on the transition.
  useEffect(() => {
    if (confirmed) setOpenSteps(new Set())
  }, [confirmed])

  const issues = briefIssues(draft)
  const shownIssues = Object.fromEntries(Object.entries(issues).filter(([field]) => attempted.has(field)))
  const suggested = suggestedBlocks(draft, proposal, changed, confirmed)
  const pendingCopyWrite = confirmed && dirty && writesCopy(draft, brief)

  // Copy generation only ever starts from an explicit click; every other change on a confirmed brief autosaves.
  // A failed autosave waits for the next change instead of retrying on its own.
  useEffect(() => {
    if (!confirmed || !dirty || busy || saving || pendingCopyWrite || draft === failedAutosave) return
    const timer = setTimeout(() => {
      const attempt = draftRef.current
      confirmRef.current(attempt).then(result => {
        if (result?.ok) return
        setFailedAutosave(attempt)
        setSubmitError(result?.message || 'Unable to save your changes.')
      })
    }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [confirmed, dirty, busy, saving, pendingCopyWrite, draft, failedAutosave])

  const update = (patch, block, sourceKey) => {
    setChanged(addTo(block))
    setSubmitError('')
    onChange({ ...draft, ...patch }, sourceKey)
  }
  const toggle = step => setOpenSteps(current => {
    const next = new Set(current)
    next.has(step) ? next.delete(step) : next.add(step)
    return next
  })
  const proceedToCopy = async () => {
    if (Object.keys(issues).length) {
      const firstInvalid = ['understanding', ...steps].find(step => Object.keys(stepIssues(step, draft)).length)
      setAttempted(new Set(Object.keys(issues)))
      setOpenSteps(current => new Set([...current, firstInvalid]))
      setFocus({ step: firstInvalid, field: true })
      return
    }
    setSubmitError('')
    const result = await onConfirm(draft)
    if (result?.ok) return
    setSubmitError(result?.message || 'Unable to confirm the brief.')
    if (result?.code === 'copy_capacity_exceeded' && steps.includes('copy')) setFocus({ step: 'copy' })
  }
  const discard = () => {
    onDiscard()
    setSubmitError('')
    setOpenSteps(new Set())
  }

  const fieldError = field => shownIssues[field] ? <span className="bs-inline-field-error"><Text variant="small" role="alert">{shownIssues[field]}</Text></span> : null
  const problem = (submitError || error) && <p role="alert" className="bs-brief-error">{submitError || error}</p>
  const showBottomAction = !readOnly && (!confirmed || pendingCopyWrite)
  const content = step => {
    const props = { draft, errors: shownIssues, suggested, disabled: busy, onChange: update }
    if (step === 'copy') return <FoundCopyStep {...props} foundCopy={proposal.foundCopy} onOpenSource={onOpenSource} />
    if (step === 'settings') return <SettingsStep {...props} />
    return <VisualContextStep {...props} />
  }

  return <div className="bs-brief-review" ref={root}>
    {notice && <Alert title={notice} tone="info" announce />}
    <div id={stepElement('understanding')} tabIndex={-1} className="bs-brief-understanding">
      <InlineText label="Summary" variant="leadMedium" value={draft.summary} sourceKey={inputKey} maxLength={1000} required readOnly={readOnly || busy}
        onDirty={dirty => onEditDirty?.('summary', dirty)} onSave={(value, sourceKey) => { update({ summary: value }, 'summary', sourceKey); return { ok: true } }} />
      {fieldError('summary')}
      <InlineText label="Audience" variant="h5" value={draft.audience} sourceKey={inputKey} maxLength={500} required readOnly={readOnly || busy}
        onDirty={dirty => onEditDirty?.('audience', dirty)} onSave={(value, sourceKey) => { update({ audience: value }, 'audience', sourceKey); return { ok: true } }} />
      {fieldError('audience')}
    </div>
    {sourcesSlot}
    {steps.map(step => {
      const open = !confirmed || openSteps.has(step)
      return <BriefStep key={step} id={step} title={titles[step]} icon={icons[step]} open={open} summary={stepSummary(step, draft, proposal)}
        onEdit={confirmed && !readOnly && !busy ? () => toggle(step) : undefined}>
        {open && content(step)}
      </BriefStep>
    })}
    {showBottomAction && <div className="bs-brief-review__cta">
      {pendingCopyWrite && <TextAction disabled={saving} onClick={discard}>Discard changes</TextAction>}
      <Button variant="primary" size="medium" busy={saving} onClick={proceedToCopy}>Proceed to copy →</Button>
    </div>}
    {problem}
  </div>
}
