import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { CopyEditor } from './CopyEditor.jsx'
import { DecisionNotice } from '../../../../components/design-system/molecules/DecisionNotice.jsx'
import { AppButton } from "../../../../components/design-system/compatibility.jsx"
import { Button, Heading, Inline, Stack, Surface, Text } from 'brutalist-design-system'
import { EmptyState } from '../../../../components/design-system/molecules/EmptyState.jsx'
import { useExitPresence } from '../../../../components/design-system/molecules/useExitPresence.js'
import { PreviewDialog } from '../../../../components/design-system/organisms/PreviewDialog.jsx'
import { ErrorNotice, SectionHeading, useAssetUrl } from '../../../primitives.jsx'
import { GenerationBlockNotice } from '../../GenerationBlockNotice.jsx'
import './copy-cards.css'

const AnimatedBanner = lazy(() => import('../../../AnimatedBanner.jsx').then(module => ({ default: module.AnimatedBanner })))

function CopyPreview({ copy, input, assets, onClose }) {
  const { url: imageUrl, error: imageError } = useAssetUrl(assets, input.previewAssetId)
  return <PreviewDialog title={`Option ${copy.number} preview`} onClose={onClose}>
    <Suspense fallback={<p role="status">Loading banner preview…</p>}>
      <AnimatedBanner manifest={input.previewManifest} templateId={input.previewTemplateId ?? 'editorial-split'} headline={copy.headline}
        body={copy.body} cta={copy.cta} tag={copy.offer} imageUrl={imageUrl || undefined} playing={false} />
    </Suspense>
    <p className="bs-note">{imageError ? 'Campaign image unavailable; showing an example image.' : imageUrl
      ? 'Using your selected campaign image.' : 'Layout preview with an example image. No image is generated.'}</p>
  </PreviewDialog>
}

/** Domain-only view: no workspace, HTTP client, revision, or sibling state. */
export function CopyView({ input, inputKey, setDirty = () => {}, access, operation, actions, assets, onNext, reconcile, resolveGeneration, navigate,
  nextLabel = 'Continue to visuals', heading = true }) {
  const [actionError, setActionError] = useState(null)
  const [localAction, setLocalAction] = useState(null)
  const [optimisticRemoved, setOptimisticRemoved] = useState(() => new Set())
  const [previewId, setPreviewId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const inFlight = useRef(false)
  const pending = operation.kind === 'running' || !!localAction
  const uncertain = operation.kind === 'uncertain'
  const readOnly = !access.canEdit
  const generationBlock = access.generationBlock
  const visibleError = operation.error ?? actionError
  const canCheck = !!reconcile && (!!generationBlock || uncertain || !!visibleError)
  const sets = useMemo(() => input.copies.filter(set => !set.stale), [input.copies])
  const previousSets = useMemo(() => {
    const stale = input.copies.filter(set => set.stale && set.candidates.length)
    const latest = stale.at(-1)
    return latest ? stale.filter(set => (set.sourceBriefKey ?? set.id) === (latest.sourceBriefKey ?? latest.id)) : []
  }, [input.copies])
  const needsDecision = sets.length === 0 && previousSets.length > 0
  const visibleSets = needsDecision ? previousSets : sets
  const currentSet = sets.find(set => set.id === input.selectedCopyId)
  const options = useMemo(() => visibleSets.flatMap(set => set.candidates.map(copy => ({ ...copy, origin: set.origin,
    approved: !needsDecision && (set.approvedCandidateIds?.includes(copy.id)
      || (!set.approvedCandidateIds && set.id === currentSet?.id && set.selectedCandidateId === copy.id)),
    selected: !needsDecision && (set.approvedCandidateIds?.includes(copy.id) || (set.id === currentSet?.id && set.selectedCandidateId === copy.id)),
  }))).map((copy, index) => ({ ...copy, number: index + 1 })), [visibleSets, currentSet, needsDecision])
  const copyLocked = readOnly && !generationBlock && !needsDecision
  const approvedOnly = copyLocked
  const lockedOptions = useMemo(() => approvedOnly ? options.filter(copy => copy.approved) : options, [approvedOnly, options])
  const visibleOptions = useMemo(() => lockedOptions.filter(copy => !optimisticRemoved.has(copy.id)), [lockedOptions, optimisticRemoved])
  const displayed = useExitPresence(visibleOptions)
  const selectedCount = options.filter(copy => copy.approved || copy.selected).length
  // Selection is multi-select (approved candidates). Select and deselect use the same command so a
  // second card can be chosen after the first; the single-selection command is only a fallback.
  const selectCopy = actions.approve ?? actions.select
  const deselectCopy = actions.approve ? id => actions.approve(id, { revoke: true }) : actions.deselect
  const preview = options.find(copy => copy.id === previewId)
  const atLimit = options.length >= 30
  const hasAnalysis = !!input.analysis || sets.length > 0
  const closeEditor = () => { setEditingId(null); setDirty(false) }

  async function attempt(kind, action, id) {
    if (inFlight.current || !action) return
    inFlight.current = true
    setActionError(null)
    setLocalAction({ kind, id })
    const removedOptimistically = kind === 'remove' && id
    if (removedOptimistically) setOptimisticRemoved(current => new Set(current).add(id))
    try {
      const result = await action(...(id ? [id] : []))
      if (result?.ok === false) {
        setActionError(result)
        if (removedOptimistically) setOptimisticRemoved(current => { const next = new Set(current); next.delete(id); return next })
      }
    } catch (error) {
      setActionError(error)
      if (removedOptimistically) setOptimisticRemoved(current => { const next = new Set(current); next.delete(id); return next })
    }
    finally { inFlight.current = false; setLocalAction(null) }
  }

  const checkControl = canCheck && <AppButton disabled={pending} busy={localAction?.kind === 'reconcile'}
    onClick={() => attempt('reconcile', reconcile)}>Check latest state</AppButton>

  return <section aria-label="Copy module" aria-busy={pending || undefined}>
    {heading && <SectionHeading title="Copy" />}
    <ErrorNotice error={visibleError} />
    {!readOnly && input.staleVisualCopyIds?.length > 0 && <DecisionNotice label="Copy changed"
      actions={<AppButton disabled={pending || !!editingId || uncertain || !actions.regenerateVisuals}
        onClick={() => attempt('regenerate-visuals', () => actions.regenerateVisuals(input.staleVisualCopyIds))}>
        Regenerate visuals for changed copy
      </AppButton>}>Visuals linked to the changed copy need updating.</DecisionNotice>}
    {readOnly && !generationBlock && !needsDecision && options.length > 0 && <DecisionNotice label="Copy is locked"
      actions={access.editDestination && navigate && <AppButton onClick={() => navigate(access.editDestination)}>Go to Review</AppButton>}>
      {access.reason || 'This copy is read-only.'}
    </DecisionNotice>}
    <GenerationBlockNotice block={generationBlock} onCheck={reconcile} onResolve={resolveGeneration} disabled={pending} />
    {!generationBlock && checkControl}
    {needsDecision && <DecisionNotice label="Brief changed" busy={pending} actions={<>
      <AppButton disabled={readOnly || pending || uncertain || !actions.retain} onClick={() => attempt('retain', actions.retain)} busy={localAction?.kind === 'retain'}>Keep old copy</AppButton>
      <AppButton variant="primary" disabled={readOnly || pending || uncertain || !actions.regenerate} onClick={() => attempt('generate', actions.regenerate)} busy={localAction?.kind === 'generate'}>Create new</AppButton>
    </>}>Brief has changed. Create new copy?</DecisionNotice>}
    {displayed.length === 0 ? <EmptyState
      title={pending ? 'Updating copy…' : access.stale ? 'Copy needs updating' : hasAnalysis ? 'No copies yet' : 'Add a brief to generate banner copy.'}
      description={access.stale ? 'The brief has changed. Previous copy is kept in history. Generate updated options after analyzing the new brief.' : undefined}
      action={hasAnalysis && !readOnly && !needsDecision ? <AppButton onClick={() => attempt('generate', actions.generate)}
        disabled={pending || atLimit || !actions.generate || uncertain} busy={localAction?.kind === 'generate'}>
        <Sparkles size={16} aria-hidden="true" />Generate new copies
      </AppButton> : undefined}
    /> : <div className="bs-copy-worklist">
      {displayed.map(({ item: copy, exiting }) => <div key={copy.id} hidden={exiting}>
        <Surface as="article" aria-label={`Copy option ${copy.number}`} padding={6} radius="small">
          <Stack gap={4}>
            <Inline gap={3}><Text variant="small" tone="secondary">Option {copy.number}</Text><Text variant="small" tone="secondary">{copy.origin === 'supplied' ? 'From your materials' : copy.origin === 'manual' ? 'Written by you' : 'AI suggestion'}</Text></Inline>
            {editingId === copy.id ? <CopyEditor copy={copy} inputKey={inputKey} onSave={actions.edit} onClose={closeEditor} readOnly={readOnly} /> : <Stack gap={3}>
              <Heading level={3} variant="h4">{copy.headline}</Heading>
              <Text>{copy.body}</Text>
              <Text variant="small"><strong>Call to action:</strong> {copy.cta || 'Not provided'}</Text>
              {copy.offer && <Text variant="small"><strong>Tag:</strong> {copy.offer}</Text>}
            </Stack>}
            {!copyLocked && editingId !== copy.id && <Inline gap={2} role="group" aria-label={`Actions for option ${copy.number}`}>
              <Button size="small" aria-label={copy.selected ? `Deselect option ${copy.number}` : `Select option ${copy.number}`}
                aria-pressed={copy.selected} variant={copy.selected ? 'primary' : 'secondary'} icon={copy.selected ? 'check' : 'plus'}
                disabled={readOnly || needsDecision || pending || uncertain || !!editingId || !(copy.selected ? deselectCopy : selectCopy)}
                onClick={() => attempt(copy.selected ? 'deselect' : 'select', copy.selected ? deselectCopy : selectCopy, copy.id)}>{copy.selected ? 'Selected' : 'Select copy'}</Button>
              <Button size="small" variant="quiet" aria-label={`Edit option ${copy.number}`} icon="edit" disabled={readOnly || pending || uncertain || !!editingId || !actions.edit}
                onClick={() => { setEditingId(copy.id); setDirty(true) }}>Edit</Button>
              <Button size="small" variant="quiet" aria-label={`Preview option ${copy.number}`} icon="eye" onClick={() => setPreviewId(copy.id)}>Preview</Button>
              <Button size="small" variant="quiet" iconOnly icon="Trash" aria-label={`Delete option ${copy.number}`}
                disabled={readOnly || needsDecision || pending || uncertain || !!editingId || !actions.remove}
                onClick={() => attempt('remove', actions.remove, copy.id)} />
            </Inline>}
          </Stack>
        </Surface>
      </div>)}
    </div>}
    {!needsDecision && options.length > 0 && <div className="bs-copy-next">
      <Text variant="small" tone="secondary">{selectedCount ? `${selectedCount} selected. Continue to choose imagery for your banners.` : 'Select copy for tailored visuals, or explore universal campaign visuals.'}</Text>
      <Inline gap={3}>
        <Button onClick={() => attempt('generate', actions.generate)} icon="Sparkles"
          disabled={readOnly || pending || atLimit || !actions.generate || uncertain || !!editingId}
          busy={pending && (localAction?.kind === 'generate' || operation.actionId === 'generate')}>
          Generate more options
        </Button>
        {onNext && <Button variant="primary" icon="arrowRight" disabled={!selectedCount || pending || uncertain || !!editingId} onClick={onNext}>{nextLabel}</Button>}
        {onNext && !selectedCount && <Button variant="quiet" disabled={pending || uncertain || !!editingId} onClick={onNext}>Explore universal visuals</Button>}
      </Inline>
    </div>}
    {!reconcile && uncertain && operation.actionId === 'generate' && <AppButton onClick={() => attempt('generate', actions.generate)} disabled={pending}>
      Check generation result
    </AppButton>}
    {preview && <CopyPreview copy={preview} input={input} assets={assets} onClose={() => setPreviewId(null)} />}
  </section>
}
