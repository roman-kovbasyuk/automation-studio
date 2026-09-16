import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Dialog, Divider, EmptyState, Grid, Heading, Inline, Panel, Select, Spinner, Stack, Surface, Tabs, Text } from 'brutalist-design-system'
import { useAssetUrl } from '../../../primitives.jsx'
import { designKey, designIdentity, addDesigns, toggleDesign, resolvePair, selectionFromComposition, availableFormats, previewRatioFor } from './bannerSelection.js'
import { bannerFormats } from '../../../../../shared/bannerFormats.js'
import { AnimatedBanner } from '../../../AnimatedBanner.jsx'
const renderBanner = props => <AnimatedBanner {...props} />
const tabs = ['design', 'sizes']
const categories = { 'All formats': null, 'Social media': 'social', 'Google Ads': 'google-ads', Stories: 'stories', Video: 'video' }
const plural = (count, word) => `${count} ${count === 1 ? word : word === 'copy' ? 'copies' : `${word}s`}`
const sizeLabel = size => `${size.name} · ${size.width} × ${size.height}`
const noop = () => {}
function Filter({ label, value, options, onChange, disabled }) { return <Select label={label} value={value} placeholder={`Choose ${label.toLowerCase()}`} options={options.map(value=>({value,label:value}))} onValueChange={onChange} disabled={disabled} /> }
function SelectionTotal({designs,sizes}) {
  const copies=new Set(designs.map(design=>design.copyId)).size
  const templates=new Set(designs.map(design=>`${design.templateId}@${design.templateVersion}`)).size
  return <Surface padding={4} radius="small"><Inline gap={4} role="status" aria-label="Banner selection total"><Text as="span" variant="h2">{designs.length*sizes.length}</Text><Stack gap={1}><Text variant="h7">{plural(designs.length,'design')} × {plural(sizes.length,'size')}</Text><Text variant="small" tone="secondary">Banners to prepare · {plural(copies,'copy')}, {plural(templates,'template')}</Text></Stack></Inline></Surface>
}
export function BannersView({ input, inputKey, assets, pending, readOnly, accessReason, onSave, onPrepareReview, onLoadTemplate, onNext, onChooseVisuals, onDirty = noop, heading = false, requestedTemplate, renderPreview = renderBanner }) {
  const { composition, copies = [], directions = [] } = input
  // A library choice leads the gallery without changing an existing selection.
  const templates = useMemo(() => [...input.templates].sort((a, b) => Number(b.id === requestedTemplate) - Number(a.id === requestedTemplate)), [input.templates, requestedTemplate])
  const [tab, setTab] = useState(tabs[0])
  const [copyId, setCopyId] = useState(input.selectedCopy?.id ?? copies[0]?.id ?? '')
  const [directionId, setDirectionId] = useState(input.selectedDirection?.id ?? directions[0]?.id ?? '')
  const [proportion, setProportion] = useState('Square')
  const [category, setCategory] = useState('All formats')
  const [selected, setSelected] = useState(() => selectionFromComposition(composition, copies, directions))
  const [ratioIds, setRatioIds] = useState(composition?.ratioIds ?? ['square'])
  const [dirty, setDirty] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState([])
  const [historicalTemplates, setHistoricalTemplates] = useState([])
  const [templateError, setTemplateError] = useState('')
  const [templateReload, setTemplateReload] = useState(0)
  const savedSubmission = useRef(null)
  const sourceKey = useRef(inputKey)
  const busy = Boolean(pending) || submitting
  const locked = readOnly || busy
  const pair = resolvePair(copyId, directionId, copies, directions)
  const { url: imageUrl, error: imageError } = useAssetUrl(assets, pair.direction?.previewAssetId)
  const copyLabels = copies.map((copy, index) => `${index + 1}. ${copy.headline}`)
  const visualLabels = directions.map((direction, index) => `${index + 1}. ${direction.title}`)
  const missingVersions = [...new Map(selected.filter(design => !templates.some(template => template.id === design.templateId && template.version === design.templateVersion))
    .map(design => [`${design.templateId}@${design.templateVersion}`, [design.templateId, design.templateVersion]])).values()]
  const missingVersionKey = JSON.stringify(missingVersions)
  const templateDetailsMissing = Boolean(onLoadTemplate) && missingVersions.some(([id, version]) => !historicalTemplates.some(template => template.id === id && template.version === version))
  useEffect(() => {
    let active = true
    setTemplateError('')
    if (!missingVersions.length) { setHistoricalTemplates([]); return }
    if (!onLoadTemplate) return
    Promise.all(missingVersions.map(([id, version]) => onLoadTemplate(id, version))).then(values => {
      if (active) setHistoricalTemplates(values)
    }).catch(() => { if (active) setTemplateError('Saved template details could not load. Retry before changing their sizes.') })
    return () => { active = false }
  }, [missingVersionKey, onLoadTemplate, templateReload])
  const knownTemplates = useMemo(() => [...templates, ...historicalTemplates], [templates, historicalTemplates])
  const catalog = useMemo(() => {
    const entries = new Map(bannerFormats.map(format => [format.id, format]))
    for (const template of knownTemplates) for (const ratio of template.manifest.ratios) {
      if (!entries.has(ratio.id)) entries.set(ratio.id, { ...ratio, name: ratio.id, categories: [] })
    }
    return [...entries.values()]
  }, [knownTemplates])
  const supported = availableFormats(catalog, knownTemplates, selected, composition)
  const supportedIds = new Set(supported.map(format => format.id))
  const visibleFormats = supported.filter(format => !categories[category] || format.categories.includes(categories[category]))
  const invalidSizes = ratioIds.filter(ratio => !supportedIds.has(ratio))
  const visibleDesigns = pair.copy && pair.direction ? templates.filter(template => previewRatioFor(template, proportion)).map(template => ({
    templateId: template.id, templateVersion: template.version, copySetId: pair.copy.copySetId, copyId: pair.copy.id, directionId: pair.direction.id,
  })) : []
  const allVisibleSelected = visibleDesigns.length > 0 && visibleDesigns.every(design => selected.some(item => designKey(item) === designKey(design)))
  const sourceChanged = dirty && sourceKey.current !== inputKey
  const canSubmit = !locked && selected.length > 0 && ratioIds.length > 0 && !invalidSizes.length && !sourceChanged && !templateDetailsMissing

  const dirtyReporter = useRef(onDirty)
  dirtyReporter.current = onDirty
  useEffect(() => { dirtyReporter.current(dirty) }, [dirty])
  useEffect(() => {
    if (dirty || confirming) return
    sourceKey.current = inputKey
    setSelected(selectionFromComposition(composition, copies, directions))
    setRatioIds(composition?.ratioIds ?? ['square'])
    if (!copies.some(copy => copy.id === copyId)) setCopyId(input.selectedCopy?.id ?? copies[0]?.id ?? '')
    if (!directions.some(direction => direction.id === directionId)) setDirectionId(input.selectedDirection?.id ?? directions[0]?.id ?? '')
  }, [inputKey, dirty, confirming])

  function edit(next, sizes = ratioIds) {
    setSelected(next); setRatioIds(sizes); setDirty(true); setError(''); setErrorDetails([]); savedSubmission.current = null
  }
  function chooseCopy(label) {
    const copy = copies[copyLabels.indexOf(label)]
    setCopyId(copy.id)
    if (pair.direction?.copy && pair.direction.copy.id !== copy.id) {
      const compatible = directions.find(direction => direction.copy?.id === copy.id)
        ?? directions.find(direction => !direction.copy)
      setDirectionId(compatible?.id ?? '')
    }
  }
  function chooseVisual(label) {
    const direction = directions[visualLabels.indexOf(label)]
    setDirectionId(direction.id)
    if (direction.copy) setCopyId(direction.copy.id)
  }
  async function confirm() {
    if (submitting) return
    setSubmitting(true); setError(''); setErrorDetails([])
    try {
      const payload = { designs: selected.map(designIdentity), ratioIds }
      const identity = JSON.stringify(payload)
      if (savedSubmission.current?.identity !== identity) {
        const saved = await onSave(payload, { expectedInputKey: sourceKey.current })
        if (!saved?.ok) throw Object.assign(new Error(saved?.message ?? 'The selection could not be saved. Try again.'), { details: saved?.details })
        savedSubmission.current = { identity, reviewInputKey: saved.reviewInputKey }
        setDirty(false); onDirty(false)
      }
      const result = await onPrepareReview({ expectedInputKey: savedSubmission.current.reviewInputKey })
      if (!result?.ok) throw new Error(result?.message ?? 'Review preparation failed. Your selection is saved.')
      setConfirming(false); onNext()
    } catch (failure) { setError(failure.message); setErrorDetails(Array.isArray(failure.details) ? failure.details : []) }
    finally { setSubmitting(false) }
  }
  const describe = design => {
    const template = knownTemplates.find(template => template.id === design.templateId && template.version === design.templateVersion)
      ?? templates.find(template => template.id === design.templateId)
    const copy = copies.find(copy => copy.id === design.copyId)
    const visual = directions.find(direction => direction.id === design.directionId)
    return { title: `${template?.name ?? design.templateId}${template?.version !== design.templateVersion ? ` · v${design.templateVersion}` : ''}`, copy: copy?.headline ?? 'Saved copy', visual: visual?.title ?? 'Saved visual' }
  }
  const validationIssues = errorDetails.length > 0 && <ul aria-label="Banner validation issues">{errorDetails.map((detail, index) => {
    const template = knownTemplates.find(template => template.id === detail.templateId)
    const format = catalog.find(format => format.id === detail.ratioId)
    return <li key={index}><Text as="span" variant="h7">{template?.name ?? detail.templateId ?? 'Selection'}{format ? ` · ${format.width} × ${format.height}` : ''}</Text><Text>{detail.message}</Text></li>
  })}</ul>

  const selectionCards = <>
    {!pair.copy || !pair.direction ? <EmptyState title="Choose copy and a ready visual to preview your banners." /> : <Grid minItemWidth="14rem" gap={4}>
      {templates.map(template => {
        const ratio = previewRatioFor(template, proportion)
        if (!ratio) return <EmptyState key={template.id} title={template.name} description={`No ${proportion.toLowerCase()} preview available.`} />
        const design = { templateId: template.id, templateVersion: template.version, copySetId: pair.copy.copySetId, copyId: pair.copy.id, directionId: pair.direction.id }
        const checked = selected.some(item => designKey(item) === designKey(design))
        return <Surface key={`${template.id}-${template.version}`} padding={4} radius="small"><Stack gap={3}>
          {renderPreview({ manifest: template.manifest, ratioId: ratio.id, headline: pair.copy.headline, body: pair.copy.body, cta: pair.copy.cta, tag: pair.copy.offer ?? '', imageUrl: imageUrl ?? '' })}
          <Heading level={3} variant="h6">{template.name}</Heading>
          <Button disabled={locked} aria-pressed={checked} aria-label={`${checked ? 'Deselect' : 'Select'} ${template.name}`} variant={checked ? 'primary' : 'secondary'} icon={checked ? 'check' : 'plus'} onClick={() => edit(toggleDesign(selected, design))}>{checked ? 'Selected' : 'Select design'}</Button>
        </Stack></Surface>
      })}
    </Grid>}
    {imageError && <Alert title="The visual preview could not load. Your saved image is unchanged." tone="danger" />}
  </>
  const designPanel = <Stack gap={6}>
    <Grid minItemWidth="12rem" gap={4}>
      <Filter label="Copy" value={copyLabels[copies.findIndex(copy => copy.id === pair.copy?.id)] ?? ''} options={copyLabels} onChange={chooseCopy} disabled={busy || !copies.length} />
      <Filter label="Visual" value={visualLabels[directions.findIndex(direction => direction.id === pair.direction?.id)] ?? ''} options={visualLabels} onChange={chooseVisual} disabled={busy || !directions.length} />
      <Filter label="Preview proportion" value={proportion} options={['Square', 'Horizontal', 'Vertical']} onChange={setProportion} disabled={busy} />
    </Grid>
    {pair.direction?.copy && <Text variant="small" tone="secondary">This visual is paired with its original copy.</Text>}
    <Inline gap={4}><Text tone="secondary">{plural(templates.length, 'template')}</Text><Button disabled={locked || !visibleDesigns.length} onClick={() => edit(allVisibleSelected ? selected.filter(item => !visibleDesigns.some(design => designKey(design) === designKey(item))) : addDesigns(selected, visibleDesigns))}>{allVisibleSelected ? 'Deselect visible designs' : 'Select all designs'}</Button></Inline>
    {selectionCards}
    <Text variant="small" tone="secondary">Preview proportion only changes this grid. Choose output dimensions in Sizes &amp; formats.</Text>
  </Stack>
  const sizesPanel = <Stack gap={6}>
    <Inline gap={4}><Filter label="Placement category" value={category} options={Object.keys(categories)} onChange={setCategory} />
      <Button disabled={locked || !visibleFormats.length} onClick={() => edit(selected, [...new Set([...ratioIds, ...visibleFormats.map(format => format.id)])])}>Select all shown sizes</Button></Inline>
    <Grid minItemWidth="14rem" gap={4}>{visibleFormats.map(format => <Surface key={format.id} padding={4} radius="small"><Stack gap={3}>
      <Heading level={3} variant="h6">{format.name}</Heading><Text tone="secondary">{format.width} × {format.height}</Text>
      <Button disabled={locked} aria-label={`${ratioIds.includes(format.id) ? 'Deselect' : 'Select'} ${sizeLabel(format)}`} aria-pressed={ratioIds.includes(format.id)} variant={ratioIds.includes(format.id) ? 'primary' : 'secondary'} icon={ratioIds.includes(format.id) ? 'check' : 'plus'} onClick={() => edit(selected, ratioIds.includes(format.id) ? ratioIds.filter(id => id !== format.id) : [...ratioIds, format.id])}>{ratioIds.includes(format.id) ? 'Selected' : 'Select size'}</Button>
    </Stack></Surface>)}</Grid>
    {!visibleFormats.length && <EmptyState title="No compatible sizes in this category." />}
    <Text variant="small" tone="secondary">Only sizes supported by the selected designs are shown. Older saved design versions retain their saved sizes. Video placements are size presets; this review package contains static PNGs.</Text>
  </Stack>
  return <section id="atomic-banner-selection" aria-label="Banners module" aria-busy={busy || undefined}>
    <Stack gap={6}>
      {heading && <Heading level={2}>Banners</Heading>}
      <SelectionTotal designs={selected} sizes={ratioIds} />
      {!readOnly && (canSubmit || confirming ? <Dialog title="Verify your banners" trigger="Send to Figma" open={confirming} onOpenChange={open => { if (!submitting) { setError(''); setConfirming(open) } }}>
        <Stack gap={4}>
          <SelectionTotal designs={selected} sizes={ratioIds} />
          <Heading level={3} variant="h5">Designs &amp; content</Heading>
          {selected.map(design => { const item = describe(design); return <Stack gap={1} key={designKey(design)}><Text variant="h7">{item.title}</Text><Text>{item.copy}</Text><Text variant="small" tone="secondary">{item.visual}</Text></Stack> })}
          <Divider /><Heading level={3} variant="h5">Sizes &amp; formats</Heading>
          {ratioIds.map(id => <Text key={id}>{catalog.find(format => format.id === id) ? sizeLabel(catalog.find(format => format.id === id)) : id}</Text>)}
          <Text>{input.hasVideos ? 'Next, choose the videos to include in Review before creating the immutable package. ' : 'We’ll prepare an immutable PNG review package. '}Import the PNGs into Figma, then add the Figma link in Review. Designer checks and approval are still required.</Text>
          {error && <Alert title={error} tone="danger" announce />}{validationIssues}
          <Inline><Button disabled={submitting} onClick={() => setConfirming(false)}>Back to selection</Button><Button variant="primary" disabled={submitting} busy={submitting} onClick={confirm}>{submitting ? 'Preparing review…' : savedSubmission.current ? 'Retry review preparation' : 'Confirm and prepare review'}</Button></Inline>
        </Stack>
      </Dialog> : <Button disabled icon="Send">Send to Figma</Button>)}
      {readOnly && accessReason === 'Select a current image first.' && <div role="status" aria-label="Banner selection unavailable"><Alert title="Choose a visual in Visuals to unlock banner and format selection." action={<Button onClick={onChooseVisuals} disabled={!onChooseVisuals}>Choose a visual</Button>} /></div>}
      <Tabs label="Banner selection" value={tab} onChange={setTab} items={[{ id: 'design', label: 'Design', content: designPanel }, { id: 'sizes', label: 'Sizes & formats', content: sizesPanel }]} />
      {selected.length > 0 && <Panel title={plural(selected.length, 'selected design')}>
        {selected.map(design => { const item = describe(design); return <Inline gap={4} key={designKey(design)}><Stack gap={1}><Text variant="h7">{item.title}</Text><Text variant="small" tone="secondary">{item.copy} · {item.visual}</Text></Stack>{!readOnly && <Button iconOnly icon="close" aria-label={`Remove ${item.title} selection`} disabled={busy} onClick={() => edit(selected.filter(item => designKey(item) !== designKey(design)))} />}</Inline> })}
      </Panel>}
      {templateDetailsMissing && !templateError && <Spinner label="Loading saved template details…" />}
      {invalidSizes.length > 0 && !templateDetailsMissing && <Alert title="Some selected sizes are not supported by every selected design." action={<Button disabled={locked} onClick={() => edit(selected, ratioIds.filter(id => supportedIds.has(id)))}>Remove unsupported sizes</Button>} />}
      {templateError && <Alert title={templateError} tone="danger" announce action={<Button onClick={() => setTemplateReload(value => value + 1)}>Retry template details</Button>} />}
      {sourceChanged && <Alert title="The source changed. Your selection is kept here; reload the saved selection before saving again." action={<Button disabled={busy} onClick={() => { savedSubmission.current = null; setDirty(false); onDirty(false) }}>Reload saved selection</Button>} />}
      {!confirming && validationIssues && <Stack><Alert title={error} tone="danger" announce />{validationIssues}</Stack>}
    </Stack>
  </section>
}
