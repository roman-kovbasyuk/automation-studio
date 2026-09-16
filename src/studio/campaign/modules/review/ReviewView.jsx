import { Surface } from 'brutalist-design-system'
import { StatusBadge, Alert } from "../../../../components/design-system/compatibility.jsx"
import { FigmaHandoffPanel } from './FigmaHandoffPanel.jsx'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, ExternalLink, FileCheck2 } from 'lucide-react'
import { TextField, TextArea, Checkbox as CheckboxField } from 'brutalist-design-system'
import { AppButton } from "../../../../components/design-system/compatibility.jsx"
import { AssetImage, AssetVideo, ErrorNotice, saveBlob } from '../../../primitives.jsx'

const blankDraft = () => ({ figmaUrl: '', comment: '', checks: { copyAccuracy: false, layoutQuality: false, exportReadiness: false } })
const checkLabels = { copyAccuracy: 'Copy is accurate and readable', layoutQuality: 'Layout, image and spacing are correct', exportReadiness: 'All selected formats are ready to export' }
const labels = { in_review: 'In review', changes_requested: 'Changes requested', ready: 'Ready for approval', approved: 'Approved', delivered: 'Delivered' }

export function ReviewView({ input = {}, access = {}, operation = {}, actions = {}, assets, setDirty = () => {}, expectedInputKey }) {
  const [drafts, setDrafts] = useState({})
  const [videoAssetIds, setVideoAssetIds] = useState([])
  const [actionError, setActionError] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const versionKey = input.version?.id ?? 'prepare'
  const contextKey = `${versionKey}:${input.phase}`
  const contextRef = useRef(contextKey)
  const previousContext = contextRef.current
  contextRef.current = contextKey
  const draft = drafts[versionKey] ?? blankDraft()
  const pending = operation.kind === 'running'
  const readyEvent = input.history?.events?.find(event => event.eventType === 'ready')
  const changeEvents = input.history?.events?.filter(event => ['changes_requested'].includes(event.eventType)) ?? []
  const originalAssets = input.version?.snapshot?.assets?.filter(asset => asset.kind === 'review_png') ?? []
  const returned=input.figma?.submission
  const reviewAssets=returned?returned.manifest.frames.map(frame=>({id:`figma:${returned.id}:${frame.outputId}`})):originalAssets
  useEffect(() => {
    if (previousContext === contextKey) return
    setActionError(null)
    setDownloading(null)
    setDirty(false)
  }, [contextKey, previousContext, setDirty])
  const update = patch => {
    setDrafts(current => ({ ...current, [versionKey]: { ...(current[versionKey] ?? blankDraft()), ...patch } }))
    setDirty(true)
  }
  async function attempt(action, ...args) {
    const startedIn = contextKey
    setActionError(null)
    try {
      const result = await action?.(...args)
      if (contextRef.current !== startedIn) return
      if (result?.ok === false) setActionError(result)
      else setDirty(false)
    } catch (error) { if (contextRef.current === startedIn) setActionError(error) }
  }
  async function download(asset, index) {
    const startedIn = contextKey
    setDownloading(asset.id); setActionError(null)
    try {
      const blob = await assets.getAssetBlob(asset.id)
      if (contextRef.current === startedIn) saveBlob(blob, `review-v${input.version.versionNumber}-${index + 1}.png`)
    } catch (error) { if (contextRef.current === startedIn) setActionError(error) }
    finally { if (contextRef.current === startedIn) setDownloading(null) }
  }

  if (input.phase === 'prepare') return <section aria-label="Review module">
    <ErrorNotice error={operation.error ?? actionError} />
    <Surface><div className="bs-review-intro"><FileCheck2 size={36} aria-hidden="true"/><div><h3>One version. One clear handoff.</h3>
      <p>Freeze the current copy, image and layout into a version the team can review.</p>
      <dl className="bs-facts"><div><dt>Formats</dt><dd>{input.composition?.ratioIds?.join(', ') || 'None'}</dd></div><div><dt>Next version</dt><dd>{input.nextVersionNumber}</dd></div></dl>
      {Boolean(input.availableVideos?.length) && <fieldset disabled={!access.canEdit || pending}>
        <legend>Include source video</legend><p>Select footage to freeze and review with this version. Play each selected clip, including its audio.</p>
        {input.availableVideos.map((video,index) => <div key={video.id}>
          <AssetVideo assets={assets} asset={video} label={`Video ${index+1} preview`} />
          <CheckboxField label={`Include video ${index+1} in review`} checked={videoAssetIds.includes(video.id)} onChange={event => {
            setVideoAssetIds(ids => event.target.checked ? [...ids,video.id] : ids.filter(id => id !== video.id)); setDirty(true)
          }} disabled={pending || !access.canEdit || (!videoAssetIds.includes(video.id) && videoAssetIds.length >= 3)}/>
        </div>)}
      </fieldset>}
      <AppButton variant="primary" onClick={() => attempt(actions.createVersion, { expectedInputKey, ...(videoAssetIds.length ? { videoAssetIds } : {}) })} disabled={!access.canEdit || pending} busy={pending && operation.actionId === 'createVersion'}>Create version and send to review</AppButton>
    </div></div></Surface>
  </section>

  if (!input.version) return <section aria-label="Review module"><p className="bs-note">The current review version is unavailable. Reload the campaign.</p></section>
  return <section aria-label="Review module" aria-busy={pending || undefined}>
    <ErrorNotice error={operation.error ?? actionError} />
    <div className="bs-review-summary"><div><StatusBadge>Version {input.version.versionNumber}</StatusBadge><h3>{labels[input.phase] ?? 'Review'}</h3></div>
      <span className="bs-metadata">Created {new Date(input.version.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span></div>
    {input.figma && <FigmaHandoffPanel figma={input.figma} phase={input.phase} canSend={access.canSendToFigma} pending={pending}
      send={input=>actions.sendToFigma(input,{expectedInputKey})} refresh={actions.refreshFigma}/>}
    {returned&&<h3>Returned from Figma</h3>}
    <div className="bs-review-previews">{reviewAssets.map((asset, index) => <figure key={asset.id}><AssetImage assets={assets} assetId={asset.id} alt={`Review version ${input.version.versionNumber}, format ${index + 1}`}/><figcaption><span>Format {index + 1}</span><AppButton onClick={() => download(asset, index)} disabled={Boolean(downloading)} busy={downloading === asset.id}><Download size={15} aria-hidden="true"/>PNG</AppButton></figcaption></figure>)}</div>

    {returned&&<details><summary>Compare original version</summary><div className="bs-review-previews">{originalAssets.map((asset,index)=><figure key={asset.id}><AssetImage assets={assets} assetId={asset.id} alt={`Original format ${index+1}`}/></figure>)}</div></details>}
    {input.version.snapshot.videos?.map((video,index) => <AssetVideo key={video.id} assets={assets} asset={video} label={`Review video ${index+1}`} />)}
    {Boolean(input.version.snapshot.videos?.length) && <p>Check the full duration and audio of each video before marking this version ready.</p>}

    {input.phase === 'in_review' && (!input.figma || (input.figma.loaded && !input.figma.handoff)) && (access.canEdit ? <Surface><form className="bs-review-form" onSubmit={event => { event.preventDefault(); attempt(actions.markReady, { figmaUrl: draft.figmaUrl.trim(), checklistAnswers: draft.checks }, { expectedInputKey }) }}><fieldset disabled={pending}>
      <h3>Designer checklist</h3><TextField label="Figma review link" type="url" required value={draft.figmaUrl} onChange={event => update({ figmaUrl: event.target.value })}/>
      {Object.entries(checkLabels).map(([key, label]) => <CheckboxField key={key} label={label} checked={draft.checks[key]} onChange={event => update({ checks: { ...draft.checks, [key]: event.target.checked } })}/>)}
      <AppButton type="submit" variant="primary" disabled={pending || !draft.figmaUrl.trim() || !Object.values(draft.checks).every(Boolean)}>Mark ready for approval</AppButton>
      <div className="bs-review-reject"><TextArea label="Request a change" maxLength={2000} value={draft.comment} onChange={event => update({ comment: event.target.value })}/>
        <AppButton disabled={pending || !draft.comment.trim()} onClick={() => attempt(actions.requestChanges, draft.comment.trim(), { expectedInputKey })}>Request changes</AppButton></div>
    </fieldset></form></Surface> : <Alert tone="info"><div className="bs-info"><FileCheck2 size={23} aria-hidden="true"/><p>Waiting for the designer to check this version.</p></div></Alert>)}
    {input.phase === 'in_review' && input.figma?.handoff && access.canEdit && <div className="bs-review-reject">
      <TextArea label="Request a change" maxLength={2000} value={draft.comment} onChange={event => update({ comment: event.target.value })}/>
      <AppButton disabled={pending || !draft.comment.trim()} onClick={() => attempt(actions.requestChanges, draft.comment.trim(), { expectedInputKey })}>Request changes</AppButton>
    </div>}

    {readyEvent && <Alert tone="info"><div className="bs-info"><CheckCircle2 size={22} aria-hidden="true"/><div><strong>Designer checks completed</strong><p>Copy accuracy · Layout quality · Export readiness</p>{readyEvent.payload?.figmaUrl && <a href={readyEvent.payload.figmaUrl} target="_blank" rel="noreferrer">Open Figma review <ExternalLink size={14} aria-hidden="true"/></a>}</div></div></Alert>}

    {input.phase === 'ready' && (access.canEdit ? <div className="bs-approval"><AppButton variant="primary" disabled={pending || !readyEvent || (input.figma && (!input.figma.loaded || (input.figma.handoff && !returned)))} onClick={() => attempt(actions.approve, { expectedInputKey, ...(returned ? {submissionId:returned.id,submissionHash:returned.submissionHash} : {}) })}>Approve version {input.version.versionNumber}</AppButton>
      <TextArea label="Or request another round" maxLength={2000} value={draft.comment} onChange={event => update({ comment: event.target.value })}/>
      <AppButton disabled={pending || !draft.comment.trim()} onClick={() => attempt(actions.reject, draft.comment.trim(), { expectedInputKey })}>Return for changes</AppButton></div>
      : <p className="bs-note">A permitted editor who did not mark this version ready must approve it.</p>)}

    {input.phase === 'changes_requested' && <Alert tone="info"><div className="bs-info"><div><strong>Changes requested</strong>{changeEvents.map(event => <p key={event.id}>{event.payload.comment}</p>)}
      {access.canEdit && <AppButton variant="primary" disabled={pending} onClick={() => attempt(actions.reopen, { expectedInputKey })}>Reopen to edit</AppButton>}</div></div></Alert>}

    {input.phase === 'delivered' && <Alert tone="info"><div className="bs-info"><CheckCircle2 size={22} aria-hidden="true"/><p>This approved version has been packaged for distribution.</p></div></Alert>}

    {input.history && <details className="bs-history"><summary>Version activity <span>{input.history.events.length} events</span></summary><ol>{input.history.events.map(event => <li key={event.id}><strong>{event.eventType.replaceAll('_', ' ')}</strong><span>{event.actorRole} · {new Date(event.createdAt).toLocaleString()}</span>{event.payload?.comment && <p>{event.payload.comment}</p>}</li>)}</ol></details>}
  </section>
}
