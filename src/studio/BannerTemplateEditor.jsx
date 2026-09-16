import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, ImagePlus, Send, Sparkles, Video, X } from 'lucide-react'
import { Checkbox as CheckboxField } from 'brutalist-design-system'
import { AppButton, SelectionTile, FileDropzone } from "../components/design-system/compatibility.jsx"
import { Heading, Stack, Tabs, Text } from 'brutalist-design-system'
import { PreviewDialog } from '../components/design-system/organisms/PreviewDialog.jsx'
import { AnimatedBanner, BannerTextFields, studioSampleImage } from './AnimatedBanner.jsx'
import { BannerRatioIcon } from './BannerRatioIcon.jsx'
import { channelFilters, mediaFilters } from './bannerFormatFilters.js'
import { saveBlob } from './primitives.jsx'
import { bannerFormats } from '../../shared/bannerFormats.js'
import { draftContentIssues } from '../../shared/bannerTemplateDraft.js'
import { MAX_GENERATED_IMAGE_DIMENSION } from '../../shared/imageLimits.js'
import './banner-template-editor.css'

const tabs = ['Content', 'Formats']
export const defaultBannerDraft = () => ({
  values: { caption: '', headline: "Make room for what's next.", body: 'A fresh perspective. Made for your everyday.', cta: 'Explore the collection' },
  ratioIds: ['square'], imageUrl: studioSampleImage, imageSource: 'sample', imageName: '',
})
const formatName = ratio => bannerFormats.find(format => format.id === ratio.id)?.name ?? ratio.id
export function readImageData(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('The image could not be read.'))
    reader.readAsDataURL(blob)
  })
}

export function BannerTemplateEditor({ template, draft, onChange, onBack, onCreateCampaign, api }) {
  const manifest = template.manifest
  const [tab, setTab] = useState('Content')
  const [previewId, setPreviewId] = useState(() => draft.ratioIds[0] ?? manifest.ratios[0].id)
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const heading = useRef(null)
  const id = useId()
  const ratios = manifest.ratios
  const selected = ratios.filter(ratio => draft.ratioIds.includes(ratio.id))
  const preview = ratios.find(ratio => ratio.id === previewId) ?? ratios[0]
  const imageSlot = manifest.slots.find(slot => slot.type === 'image')?.placements[preview.id]
  const issues = draftContentIssues(manifest, draft.values, draft.ratioIds)
  const contentIssues = issues.filter(issue => issue !== 'Select at least one format.')
  const disabledReason = issues.length ? `${id}-output-reason` : undefined
  const draftActionReason = `${id}-draft-action-reason`
  useEffect(() => { heading.current?.focus() }, [])
  function update(patch) { onChange({ ...draft, ...patch }); setFailure(''); setMessage('') }
  function changeText(key, value) { update({ values: { ...draft.values, [key]: value } }) }
  function toggleRatio(ratioId) {
    update({ ratioIds: draft.ratioIds.includes(ratioId) ? draft.ratioIds.filter(value => value !== ratioId) : [...draft.ratioIds, ratioId] })
  }
  function cyclePreview(direction) {
    const index = ratios.findIndex(ratio => ratio.id === preview.id)
    setPreviewId(ratios[(index + direction + ratios.length) % ratios.length].id)
  }
  function toggleGroup(group) {
    const matches = ratios.filter(group.matches).map(ratio => ratio.id)
    const allSelected = matches.length > 0 && matches.every(id => draft.ratioIds.includes(id))
    update({ ratioIds: allSelected
      ? draft.ratioIds.filter(id => !matches.includes(id))
      : [...new Set([...draft.ratioIds, ...matches])] })
  }
  function formatLabel(ratio) { return `${formatName(ratio)} · ${ratio.width} × ${ratio.height}` }
  async function upload(files) {
    const file = files[0]
    if (!file) return
    setFailure(''); setBusy(true)
    try {
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Choose a PNG or JPG under 8 MB.')
      const bitmap = await createImageBitmap(file)
      const imageSlots = manifest.slots.filter(slot => slot.type === 'image')
      const width = Math.max(...imageSlots.map(slot => slot.minWidth), 1)
      const height = Math.max(...imageSlots.map(slot => slot.minHeight), 1)
      const fits = bitmap.width >= width && bitmap.height >= height
      const tooLarge = bitmap.width > MAX_GENERATED_IMAGE_DIMENSION || bitmap.height > MAX_GENERATED_IMAGE_DIMENSION
      bitmap.close()
      if (tooLarge) throw new Error(`Use an image no larger than ${MAX_GENERATED_IMAGE_DIMENSION} × ${MAX_GENERATED_IMAGE_DIMENSION} pixels.`)
      if (!fits) throw new Error(`Use an image at least ${width} × ${height} pixels.`)
      update({ imageUrl: await readImageData(file), imageSource: 'upload', imageName: file.name })
      setDialog(null)
    } catch (error) { setFailure(error.message) }
    finally { setBusy(false) }
  }
  async function download() {
    if (busy || issues.length) return
    setBusy(true); setFailure(''); setMessage('')
    try {
      if (!api?.exportBannerDraft) throw new Error('Downloads are unavailable. Reload the page and try again.')
      const data = draft.imageUrl.startsWith('data:') ? draft.imageUrl : await readImageData(await (await fetch(draft.imageUrl)).blob())
      const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(data)
      if (!match) throw new Error('Choose a PNG or JPG image before downloading.')
      const blob = await api.exportBannerDraft({ templateId: template.id, templateVersion: template.version,
        values: draft.values, ratioIds: draft.ratioIds, image: { mimeType: match[1], base64: match[2] } })
      saveBlob(blob, `${template.id}-drafts.zip`)
      setMessage(`Downloaded ${selected.length} PNG draft${selected.length === 1 ? '' : 's'}.`)
    } catch (error) { setFailure(error.status === 404 ? 'The download service needs the updated API. Please restart the local API and retry.' : error.message) }
    finally { setBusy(false) }
  }
  const imageActions = <div className="bs-template-image-actions">
    <AppButton size="compact" disabled title="Available in the campaign creation flow."><Sparkles size={15} /> Generate image</AppButton>
    <AppButton size="compact" disabled={busy} onClick={() => { setFailure(''); setDialog('upload') }}><ImagePlus size={15} /> Upload image</AppButton>
    {draft.imageSource === 'upload' && <AppButton size="compact" disabled title="Available in the campaign creation flow."><Video size={15} /> Convert to video</AppButton>}
  </div>
  return <section className="bs-template-editor" aria-labelledby="banner-editor-heading">
    <div className="bs-template-editor__heading">
      <Stack gap={4}><div><AppButton variant="quiet" onClick={onBack} disabled={busy}><ArrowLeft size={16} /> All templates</AppButton></div>
        <Heading level={1} variant="h2" id="banner-editor-heading" ref={heading} tabIndex={-1}>{template.name}</Heading>
        <Text variant="small" tone="secondary">Template preview — not a saved campaign</Text>
        <Text id={draftActionReason} variant="small" tone="secondary">Create a campaign to generate and review banners.</Text>
      </Stack>
      <div className="bs-template-editor__actions">
        <AppButton variant="primary" aria-describedby={[disabledReason, draftActionReason].filter(Boolean).join(' ') || undefined} disabled><Send size={16} /> Send to Figma for review</AppButton>
        <AppButton variant="secondary" aria-describedby={disabledReason} busy={busy} disabled={busy || Boolean(issues.length)} onClick={download}><Download size={16} /> Download{selected.length > 1 ? ` · ${selected.length}` : ''}</AppButton>
      </div>
    </div>
    <div className="bs-template-editor__workspace">
      <div className="bs-template-editor__canvas">
        <Text variant="small" tone="secondary">{selected.length} format{selected.length === 1 ? '' : 's'} selected</Text>
        <Tabs label="Banner workspace" value={tab} onChange={setTab} items={[
          { id: 'Content', label: 'Content', content: <>
          <div className="bs-template-carousel">
            <AppButton iconOnly variant="secondary" aria-label="Previous proportion" disabled={busy || ratios.length < 2} onClick={() => cyclePreview(-1)}><ChevronLeft size={20} /></AppButton>
            <article className="bs-template-output" style={{ '--preview-ratio': preview.width / preview.height }}>
              <div className="bs-template-output__artwork">
                <AnimatedBanner manifest={manifest} ratioId={preview.id} {...draft.values} tag={draft.values.caption} imageUrl={draft.imageUrl}
                  playing={false} title={`${template.name} — ${formatLabel(preview)}`} />
                {imageSlot && <div className="bs-template-image-region" role="group" aria-label={`Image actions for ${formatName(preview)}`}
                  style={{ left: `${imageSlot.x / preview.width * 100}%`, top: `${imageSlot.y / preview.height * 100}%`, width: `${imageSlot.width / preview.width * 100}%`, height: `${imageSlot.height / preview.height * 100}%` }}>{imageActions}</div>}
              </div>
              <div className="bs-template-output__format" aria-live="polite">{formatLabel(preview)}</div>
              <div className="bs-template-editor__image-info">
                <span>{draft.imageName || 'Sample image'}</span>
                {draft.imageSource === 'upload' && <AppButton variant="quiet" size="compact" disabled={busy} onClick={() => update({ imageUrl: studioSampleImage, imageSource: 'sample', imageName: '' })}><X size={14} /> Reset image</AppButton>}
              </div>
            </article>
            <AppButton iconOnly variant="secondary" aria-label="Next proportion" disabled={busy || ratios.length < 2} onClick={() => cyclePreview(1)}><ChevronRight size={20} /></AppButton>
          </div>
          <BannerTextFields manifest={manifest} values={{ ...draft.values, tag: draft.values.caption }} readOnly={busy}
            onChange={(slotId, value) => changeText(slotId === 'tag' ? 'caption' : slotId, value)} />
        </> },
          { id: 'Formats', label: 'Formats', content: <>
          <div className="bs-template-format-layout">
            <aside className="bs-template-editor__selectors" aria-label="Quick-select formats">
              {[channelFilters, mediaFilters].map((group, index) => <div className="bs-template-editor__selector-group" role="group" aria-label={index ? 'Media' : 'Platforms'} key={index}>
                <h2>{index ? 'Media' : 'Platforms'}</h2>
                {group.map(filter => {
                  const matching = ratios.filter(filter.matches)
                  const count = matching.filter(ratio => draft.ratioIds.includes(ratio.id)).length
                  const allSelected = matching.length > 0 && count === matching.length
                  return <CheckboxField key={filter.id} label={filter.label} checked={allSelected}
                    indeterminate={count > 0 && !allSelected} disabled={busy || !matching.length}
                    title={`${count} of ${matching.length} formats selected. ${allSelected ? 'Deselect' : 'Select'} all ${filter.label} formats.`}
                    onChange={() => toggleGroup(filter)} />
                })}
              </div>)}
            </aside>
            <div className="bs-template-format-results">
              <div className="bs-template-formats">{ratios.map(ratio => <SelectionTile key={ratio.id} label={formatLabel(ratio)} selected={draft.ratioIds.includes(ratio.id)}
                disabled={busy} onChange={() => toggleRatio(ratio.id)} caption={<><strong>{formatName(ratio)}</strong><small>{ratio.width} × {ratio.height}</small></>}>
                <BannerRatioIcon width={ratio.width} height={ratio.height} />
              </SelectionTile>)}</div>
              {selected.some(mediaFilters.find(filter => filter.id === 'video').matches) && <p className="bs-note">Video placement sizes. Downloads contain static PNGs.</p>}
            </div>
          </div>
        </> },
        ]} />
      </div>
    </div>
    {issues.length > 0 && <span id={disabledReason} className="bs-template-editor__accessible-note">{contentIssues.length ? contentIssues.join(' ') : 'Choose output formats in the Formats tab to enable review and download.'}</span>}
    {contentIssues.length > 0 && <p role="alert" className="bs-note">{contentIssues.join(' ')}</p>}
    {message && <p role="status">{message}</p>}
    {!dialog && failure && <p role="alert">{failure}</p>}
    {dialog && <PreviewDialog title={{ upload: 'Upload image', 'generate-image': 'Generate image', 'image-to-video': 'Convert image to video', 'figma-review': 'Send to Figma for review' }[dialog]} onClose={() => { if (!busy) { setDialog(null); setFailure('') } }}>
      <div className="bs-template-action-dialog">
        {dialog === 'upload' ? <FileDropzone label="Banner image" accept="image/png,image/jpeg" multiple={false} disabled={busy} onFilesChange={upload} description="PNG or JPG · Up to 8 MB" /> : <>
          <p>{dialog === 'figma-review' ? 'Direct Figma review is not connected for template drafts yet.' : dialog === 'image-to-video' ? 'Image-to-video conversion is not connected for template drafts yet.' : 'Image generation is not connected for template drafts yet.'}</p>
          <p>Use the campaign creation flow for this action. You can keep editing and download this draft here.</p>
          <AppButton onClick={() => { setDialog(null); onCreateCampaign() }}>Create campaign</AppButton>
        </>}
        {failure && <p role="alert">{failure}</p>}
        <AppButton disabled={busy} onClick={() => { setDialog(null); setFailure('') }}>Back to editor</AppButton>
      </div>
    </PreviewDialog>}
  </section>
}
