import { BriefView } from './BriefView.jsx'
import { useEffect, useRef, useState } from 'react'
import { FactGrid } from "../../../../components/design-system/compatibility.jsx"
import { InlineText } from '../../../../components/design-system/molecules/InlineText.jsx'
import { AsyncStatus } from '../../../../components/design-system/molecules/AsyncStatus.jsx'
import { PromptInputBlock } from '../../../../components/design-system/organisms/PromptInputBlock.jsx'
import { briefAnalysisSchema } from '../../../../../shared/briefAnalysis.js'
import { AnalysisProgress } from './AnalysisProgress.jsx'
import { BriefReview } from './BriefReview.jsx'
import { initialDraft } from './briefReviewModel.js'
import { BriefSourcesView } from './BriefSourcesView.jsx'
import './brief.css'

export default function BriefModule({ port }) {
  const { brief } = port.input
  const briefing = brief.briefing
  const latestAnalysis = useRef(port.input.analysis)
  if (port.input.analysis) latestAnalysis.current = port.input.analysis
  const [rawDirty, setRawDirty] = useState(false), [resultDirty, setResultDirty] = useState(false)
  const analysis = port.input.analysis ?? (resultDirty ? latestAnalysis.current : null)
  const [chat, setChat] = useState(''), [error, setError] = useState(''), [submitting, setSubmitting] = useState(false)
  const source = useRef(port.inputKey), busy = useRef(false), dirtyFields = useRef(new Set())
  const proposal = port.input.analysis?.briefingProposal
  const savedDraft = () => briefing?.answers && proposal ? initialDraft(briefing.answers, proposal) : briefing?.answers ?? null
  const [reviewDraft, setReviewDraft] = useState(savedDraft)
  const [reviewDirty, setReviewDirty] = useState(false), [reviewSaving, setReviewSaving] = useState(false)
  const reviewInputKey = useRef(port.inputKey)
  const sourceControls = useRef(null)
  const analysisJob = useRef(briefing?.analysisJobId ?? null)
  const [reanalysed, setReanalysed] = useState(false)
  useEffect(() => {
    if (!reviewDirty && briefing?.schemaVersion === 2 && reviewInputKey.current !== port.inputKey) {
      setReviewDraft(savedDraft())
      reviewInputKey.current = port.inputKey
    }
  }, [briefing, port.inputKey, reviewDirty])
  useEffect(() => {
    const current = briefing?.analysisJobId ?? null
    if (current && analysisJob.current && current !== analysisJob.current) setReanalysed(true)
    if (current) analysisJob.current = current
  }, [briefing?.analysisJobId])
  function markDirty(field, dirty) {
    dirty ? dirtyFields.current.add(field) : dirtyFields.current.delete(field)
    setResultDirty(dirtyFields.current.size > 0)
    port.setDirty(dirtyFields.current.size > 0)
  }
  const running = port.operation.kind === 'running'
  const locked = !port.access.canEdit || !port.input.analysis || submitting || running
  const reviewedDraft = reviewDraft ?? savedDraft()
  const reviewDisabled = !port.access.canEdit || running || reviewSaving
  const sources = port.input.sources ?? (proposal?.foundCopy ? [...new Map(proposal.foundCopy.flatMap(candidate => candidate.sourceRefs).map(ref => [ref.sourceId, { id: ref.sourceId, name: ref.label, status: 'ready' }])).values()] : [])
  const changeReview = nextDraft => {
    setReviewDraft(nextDraft)
    setReviewDirty(true)
    port.setDirty(true)
  }
  /** Confirms the reviewed draft and returns the result, so the review can place any error. */
  async function confirmReview(nextDraft) {
    if (reviewDisabled || !nextDraft) return { ok: false }
    setReviewSaving(true)
    try {
      const result = await port.actions.confirm({ sourceKey: briefing.sourceKey, analysisJobId: briefing.analysisJobId, answers: nextDraft }, { expectedInputKey: reviewInputKey.current })
      if (result?.ok) {
        setReviewDirty(false)
        port.setDirty(false)
      }
      return result ?? { ok: false }
    } catch (failure) { return { ok: false, message: failure.message } }
    finally { setReviewSaving(false) }
  }
  const discardReview = () => {
    setReviewDraft(savedDraft())
    setReviewDirty(false)
    port.setDirty(false)
  }
  async function refine() {
    if (locked || busy.current || !chat.trim()) return
    busy.current = true; setSubmitting(true); setError('')
    try {
      const result = await port.actions.refine(chat.trim(), { expectedInputKey: source.current })
      if (result?.ok === false) setError(result.message)
      else { setChat(''); markDirty('chat', false) }
    } catch (failure) { setError(failure.message) }
    finally { busy.current = false; setSubmitting(false) }
  }
  const edit = (field, label, { list = false, ...props } = {}) => <InlineText label={label}
    value={list ? (analysis[field] ?? []).join(', ') : analysis[field] ?? brief[field] ?? ''}
    sourceKey={port.inputKey} readOnly={locked} onDirty={dirty => markDirty(field, dirty)} {...props}
    onSave={(value, expectedInputKey) => {
      const result = briefAnalysisSchema.safeParse({ ...analysis, [field]: list ? value.split(',').map(item => item.trim()).filter(Boolean) : value })
      if (!result.success) return { ok: false, message: list ? 'Use up to 20 comma-separated values, at most 100 characters each.' : 'Shorten this value and try again.' }
      return port.actions.save({ brief: { ...brief, analysis: result.data } }, { expectedInputKey })
    }} />
  if (briefing?.schemaVersion === 2 && proposal && running && port.operation.actionId === 'analyze') return <AnalysisProgress />
  if (briefing?.schemaVersion === 2 && proposal && reviewedDraft) return <>
    <BriefReview key={briefing.analysisJobId} brief={brief} proposal={proposal} draft={reviewedDraft} dirty={reviewDirty}
      readOnly={!port.access.canEdit} busy={running || reviewSaving} error={port.operation.error?.message ?? ''}
      notice={reanalysed ? 'Your materials changed, so the settings were suggested again.' : ''}
      onChange={changeReview} onConfirm={confirmReview} onDiscard={discardReview} onOpenSource={sourceId => sourceControls.current?.openSource(sourceId)} />
    <BriefSourcesView ref={sourceControls} sources={sources} disabled={!port.access.canEdit || running || reviewDirty}
      actions={{ getSource: port.actions.getSource, retrySource: port.actions.retrySource, removeSource: port.actions.removeSource }} />
  </>
  if (!analysis || rawDirty) return <><BriefView campaign={{ brief }} inputKey={port.inputKey} heading={false} operationError={port.operation.error}
    api={{ extractBriefFile: port.actions.extractFile }} onGenerate={port.actions.submit}
    onDirty={value => { setRawDirty(value); port.setDirty(value) }} readOnly={!port.access.canEdit} pending={running ? port.operation.actionId : ''} collectSources={Boolean(briefing)} />
    {briefing && <BriefSourcesView ref={sourceControls} sources={sources} disabled={!port.access.canEdit || running}
      actions={{getSource:port.actions.getSource,retrySource:port.actions.retrySource,removeSource:port.actions.removeSource}} />}
  </>
  return <>
    {(running || submitting) && <AsyncStatus>{port.operation.actionId === 'save' ? 'Saving your changes…' : 'Updating the brief from your input…'}</AsyncStatus>}
    <div className="bs-brief-results" aria-label="Analyzed brief" aria-busy={running || submitting || undefined}>
      <div className="bs-brief-results-summary" id="brief-summary">{edit('summary', 'Summary', { maxLength: 1000, multiline: true, required: true, autoSave: true })}</div>
      <FactGrid label="Campaign details" items={[
        { id: 'audience', label: 'Audience', emphasis: true, value: <h2>{edit('audience', 'Audience')}</h2> },
        { id: 'objective', label: 'Objective', value: edit('objective', 'Objective') },
        { id: 'channels', label: 'Channels', value: edit('channels', 'Channels', { list: true, maxLength: 2000 }) },
        { id: 'formats', label: 'Formats', value: edit('formats', 'Formats', { list: true, maxLength: 2000 }) },
      ]} />
      <PromptInputBlock label="Refine brief" formLabel="Brief refinement" rows={3} maxLength={4000} compact iconOnlySubmit
        value={chat} onChange={value => { if (!chat) source.current = port.inputKey; setChat(value); markDirty('chat', Boolean(value)) }}
        onSubmit={refine} canSubmit={Boolean(chat.trim()) && !locked} readOnly={!port.access.canEdit && !running}
        busy={submitting || (running && port.operation.actionId === 'analyze')} disabled={submitting || running}
        submitLabel="Update brief" placeholder="Ask AI to refine the summary or campaign details…" />
      {chat && source.current !== port.inputKey && <p className="bs-note">The brief changed while you were writing. Your message is kept. Clear it to start from the updated brief.</p>}
      {(error || port.operation.error) && <p role="alert" className="bs-brief-error">{error || port.operation.error.message}</p>}
    </div>
  </>
}
