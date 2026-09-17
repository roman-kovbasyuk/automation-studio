import { useEffect, useRef, useState } from 'react'
import { Check, Copy, ImagePlus, Sparkles, Upload, Video } from 'lucide-react'
import { Checkbox, FancyButton, TextAction, TextArea } from 'brutalist-design-system'
import { ActionCard, AppButton } from "../../../../components/design-system/compatibility.jsx"
import { EmptyState } from '../../../../components/design-system/molecules/EmptyState.jsx'
import { PreviewDialog } from '../../../../components/design-system/organisms/PreviewDialog.jsx'
import { AsyncStatus } from '../../../../components/design-system/molecules/AsyncStatus.jsx'
import { SelectMenu } from '../../../../components/design-system/molecules/SelectMenu.jsx'
import { AssetImage, AssetVideo } from '../../../primitives.jsx'
import { VideoControls } from './VideoControls.jsx'
import { selectedCopies, visualStatus } from './visualsModel.js'
import { generationLimitMessage } from '../../../../../shared/generationErrors.js'
import { UnresolvedImageStatus } from './UnresolvedImageStatus.jsx'
import './visuals.css'

const videoPhaseLabels = {
  queued: 'Video queued…', submitting: 'Submitting video…', running: 'Generating video…',
  retrieving: 'Saving and validating video…',
  unknown: 'Submission is unconfirmed. Check this job before trying again.',
  failed: 'Video generation failed. Check the saved job before trying again.',
  blocked: 'Video generation was blocked.', cancelled: 'Video tracking stopped.',
}

function CopyPrompt({ prompt }) {
  const [feedback, setFeedback] = useState('')
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  return <><TextAction disabled={!prompt} onClick={async () => {
    clearTimeout(timer.current)
    try { await navigator.clipboard.writeText(prompt); setFeedback('Copied') }
    catch { setFeedback('Could not copy. Try again.') }
    timer.current = setTimeout(() => setFeedback(''), 2500)
  }}><Copy size={16} aria-hidden="true" />Copy prompt</TextAction>{feedback && <span role="status" className="bs-visual-feedback">{feedback}</span>}</>
}

export function VisualsView({ input, assets, videoJobs = [], videoActions = {}, canManageVideo = false, pending, progress, batchIds = [], feedback, readOnly, onGenerate, onImage, onUpload, onSelect, onNext, onReconcile, onResolve, onClearFeedback = () => {}, heading = false }) {
  const fileInput = useRef(null), uploadTarget = useRef(null)
  const [uploadOpen, setUploadOpen] = useState(false), [uploadCopyId, setUploadCopyId] = useState('')
  const [contextOpen, setContextOpen] = useState(false)
  const [visualContext, setVisualContext] = useState({ tags: [], note: '' })
  const [draftContext, setDraftContext] = useState({ tags: [], note: '' })
  const [videoDirectionId, setVideoDirectionId] = useState(null)
  const copies = selectedCopies(input), directions = input.directions
  const ready = Boolean(input.analysis || input.copies?.length)
  const disabled = readOnly || Boolean(pending || progress)
  const uploadFeedback = feedback?.kind === 'upload' ? feedback : null
  const copyLabel = id => {
    const index = (input.copies ?? []).findIndex(copy => copy.id === id)
    return index < 0 ? 'Earlier option' : `Option ${index + 1}`
  }
  const uploadOptions = ['Campaign-wide', ...copies.map(copy => `${copyLabel(copy.id)} — ${copy.headline}`)]
  const activeIds = progress?.directionIds ?? batchIds
  const visible = directions.filter(direction => direction.previewAssetId || direction.generation
    || activeIds.includes(direction.id) || feedback?.target?.directionId === direction.id
    || videoJobs.some(job => job.directionId === direction.id) || ['failed','blocked'].includes(direction.status))
  const prompt = directions.filter(direction => !direction.stale && direction.prompt).map(direction => direction.prompt).join('\n\n')
  const videoDirection = directions.find(direction => direction.id === videoDirectionId)
  const latestVideo = directionId => videoJobs.filter(job => job.directionId === directionId)
    .sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
  function chooseFile(target) {
    uploadTarget.current = target; onClearFeedback(); fileInput.current?.click()
  }
  function openContext() {
    setDraftContext({ tags: [...visualContext.tags], note: visualContext.note })
    setContextOpen(true)
  }
  function applyContext() {
    setVisualContext({ tags: [...draftContext.tags], note: draftContext.note.trim() })
    setContextOpen(false)
  }
  const uploadInput = <input ref={fileInput} className="bs-visual-file-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload image file" onChange={async event => {
      const file = event.target.files?.[0], target = uploadTarget.current
      event.target.value = ''
      if (!file || !target) return
      setUploadOpen(false); await onUpload(target, file)
    }} />
  return <div className="bs-visuals-module">
    {heading && <h2>Visuals</h2>}
    {!ready && <EmptyState title="Visual prompts are not ready" description="Analyze your brief to prepare visual prompts." />}
    {ready && <div className="bs-visual-create">
      <h3>Generate visuals</h3>
      <p className="bs-visual-create__intro">Create visuals for each selected copy or universal campaign visuals.</p>
      <div className="bs-visual-create__buttons bs-visual-create__buttons--two-columns" role="group" aria-label="Generate visuals">
        <FancyButton variant="primary" icon="image" iconPosition="start" subtitle={copies.length ? 'One visual tailored to each copy option' : 'Select copy options above to get started'} aria-label={`Generate visuals for selected copy (${copies.length})`} disabled={disabled || !copies.length} onClick={() => onGenerate('selected_copy', { context: visualContext })}>
          Generate visuals for selected copy ({copies.length})
        </FancyButton>
        <FancyButton icon="folder" iconPosition="start" subtitle="Five directions for the whole campaign" aria-label="Generate campaign-wide visuals" disabled={disabled} onClick={() => onGenerate('campaign', { context: visualContext })}>
          Generate campaign-wide visuals
        </FancyButton>
      </div>
      <div className="bs-visual-create__actions">
        <TextAction disabled={disabled} onClick={openContext}><Sparkles size={16} aria-hidden="true" />Add context</TextAction>
        <CopyPrompt prompt={prompt} />
        <TextAction disabled={disabled} onClick={() => {
          uploadTarget.current = { mode:'campaign' }; setUploadCopyId('')
          if (copies.length) setUploadOpen(true); else chooseFile({mode:'campaign'})
        }}><Upload size={16} aria-hidden="true" />Upload visual</TextAction>
      </div>
      {(visualContext.tags.length > 0 || visualContext.note) && <div className="bs-visual-context" aria-label="Visual context">
        {visualContext.tags.map(tag => <span key={tag} className="bs-visual-context__tag">{tag}</span>)}
        {visualContext.note && <span className="bs-visual-context__note">{visualContext.note}</span>}
      </div>}
      {uploadFeedback && !uploadFeedback.target.directionId && <p role="alert">{uploadFeedback.error.message}</p>}
    </div>}
    {!uploadOpen && uploadInput}
    {(progress || visible.length > 0 || videoJobs.length > 0 || pending) && <section className="bs-visual-results" aria-label="Visual results">
      {(progress || pending) && <div className="bs-visual-results__status"><AsyncStatus>{progress
        ? progress.stage === 'prompts' ? `Creating prompts for ${progress.total} visuals…` : `Generating visual ${progress.current} of ${progress.total}…`
        : 'Working on visuals…'}</AsyncStatus></div>}
      {progress?.stage === 'prompts' && Array.from({length:progress.total}, (_,index) => <ActionCard key={`pending-${index}`} aria-label={`Generating visual ${index+1}`} label={`Visual ${index+1}`}>
        <div className="bs-visual-placeholder" aria-hidden="true"><ImagePlus size={32}/></div>
      </ActionCard>)}
      {visible.map(direction => {
        const selected = !direction.stale && input.selectedDirectionId === direction.id
        const linked = direction.scope === 'selected_copy' && direction.copy
        const state = visualStatus(direction)
        const imageError = feedback?.kind === 'image' && feedback.target.directionId === direction.id ? feedback.error : null
        const generating = pending === `image:${direction.id}` || direction.generation?.status === 'pending'
        const unresolved = direction.generation?.status === 'unknown'
        const job = latestVideo(direction.id)
        const blocked = state === 'blocked'
        const quotaError = generationLimitMessage(direction.generation?.errorCode)
        const selectionAction = direction.previewAssetId && <AppButton variant={selected ? 'secondary':'primary'} disabled={disabled || selected || direction.stale || (!input.selectedCopy && !linked)} onClick={() => onSelect(direction.id)}>{selected && <Check size={16} aria-hidden="true"/>}{selected ? 'Selected':'Use this image'}</AppButton>
        const utilityActions = <div className="bs-visual-tile-actions">
          {direction.prompt && <CopyPrompt prompt={direction.prompt}/>}
          <TextAction disabled={disabled} onClick={() => chooseFile({directionId:direction.id})}><Upload size={16} aria-hidden="true"/>Upload visual</TextAction>
          {(direction.prompt || job) && <TextAction onClick={() => setVideoDirectionId(direction.id)}><Video size={16} aria-hidden="true"/>Video options</TextAction>}
        </div>
        return <ActionCard key={direction.id} aria-label={direction.title} label={direction.title} highlighted={selected}
          status={direction.stale ? 'Source changed' : direction.source === 'upload' ? 'Uploaded' : selected ? 'Selected' : null}
          persistentAction={selectionAction} actions={direction.previewAssetId ? utilityActions : undefined}>
          {direction.previewAssetId ? <div className="bs-visual-image"><AssetImage api={assets} assetId={direction.previewAssetId} alt={direction.title}/></div>
            : <div className="bs-visual-placeholder"><ImagePlus size={32} aria-hidden="true" />
              {generating ? <span>Generating image…</span> : imageError ? <p role="alert">{imageError.message}</p>
                : state === 'failed' ? <p role="alert">{quotaError ?? 'Image generation failed. Retry this image or upload your own.'}</p>
                : unresolved ? <UnresolvedImageStatus generation={direction.generation} onCheck={onReconcile} onResolve={onResolve} disabled={disabled} />
                : blocked ? <p>Generation was blocked.</p> : <span>Not generated yet</span>}
              {!generating && !blocked && !unresolved && !direction.stale && <AppButton disabled={disabled || Boolean(quotaError)} onClick={() => onImage(direction.id)}>{state === 'failed' ? 'Retry image' : 'Generate image'}</AppButton>}
            </div>}
          {linked && <div className="bs-visual-copy"><span>Linked copy · {copyLabel(direction.copy.id)}</span><p>{direction.copy.headline}</p></div>}
          {!direction.previewAssetId && utilityActions}
          {uploadFeedback?.target.directionId === direction.id && <p role="alert">{uploadFeedback.error.message}</p>}
        </ActionCard>
      })}
      {videoJobs.filter(job => job.asset || latestVideo(job.directionId)?.id === job.id).map(job => <ActionCard key={job.id} aria-label={`${directions.find(item => item.id === job.directionId)?.title ?? 'Saved'} video`} label="Video">
        {job.asset ? <AssetVideo assets={assets} asset={job.asset} label="Generated video"/>
          : <div className="bs-visual-placeholder"><Video size={32} aria-hidden="true"/>
            <p role={['failed','blocked'].includes(job.phase) ? 'alert' : 'status'}>{videoPhaseLabels[job.phase] ?? 'Check video status.'}</p>
          </div>}
        <TextAction onClick={() => setVideoDirectionId(job.directionId)}>Video options</TextAction>
      </ActionCard>)}
    </section>}
    {input.selectedDirectionId && <AppButton onClick={onNext}>Continue to banners</AppButton>}
    {contextOpen && <PreviewDialog title="Add visual context" onClose={() => setContextOpen(false)}>
      <p className="bs-visual-context__help">Add a few words to steer the visual mood, setting, and people.</p>
      <div className="bs-visual-context__tags" aria-label="Suggested visual context">
        {['Norwegian', 'mountains', 'excited', 'calm', 'two people'].map(tag => {
          const selected = draftContext.tags.includes(tag)
          return <Checkbox key={tag} label={tag} checked={selected}
            onChange={() => setDraftContext(current => ({ ...current, tags: selected ? current.tags.filter(item => item !== tag) : [...current.tags, tag] }))} />
        })}
      </div>
      <TextArea label="More detail" id="visual-context-notes" aria-label="Visual notes" rows={4}
        value={draftContext.note} maxLength={1000} placeholder="Describe the feeling, composition, or details you want…"
        onChange={event => setDraftContext(current => ({ ...current, note: event.target.value }))} />
      <div className="bs-visual-context__dialog-actions">
        <AppButton onClick={() => setContextOpen(false)}>Cancel</AppButton>
        <AppButton variant="primary" onClick={applyContext}>Apply context</AppButton>
      </div>
    </PreviewDialog>}
    {uploadOpen && <PreviewDialog title="Upload visual" onClose={() => setUploadOpen(false)}>
      {uploadInput}
      <SelectMenu label="Upload destination" value={uploadCopyId ? uploadOptions[copies.findIndex(copy=>copy.id===uploadCopyId)+1] : 'Campaign-wide'} options={uploadOptions}
        onChange={label => setUploadCopyId(copies[uploadOptions.indexOf(label)-1]?.id ?? '')}/>
      <AppButton disabled={disabled} onClick={() => chooseFile(uploadCopyId ? {mode:'selected_copy',copyId:uploadCopyId}:{mode:'campaign'})}>Choose file</AppButton>
    </PreviewDialog>}
    {videoDirection && <PreviewDialog title={`${videoDirection.title} · Video`} onClose={() => setVideoDirectionId(null)}>
      <VideoControls direction={videoDirection} job={latestVideo(videoDirection.id)} assets={assets} readOnly={readOnly} canManage={canManageVideo}
        onPlan={videoActions.plan} onSubmit={videoActions.submit} onRefresh={videoActions.refresh} onCancel={videoActions.cancel}/>
    </PreviewDialog>}
  </div>
}
