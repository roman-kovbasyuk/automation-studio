import { TextArea } from 'brutalist-design-system'
import { AppButton, ActionCard, Alert, FileDropzone } from "../components/design-system/compatibility.jsx"
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Copy, Download } from 'lucide-react'
import { createMsdPresentationTemplates, presentationAiContract, validatePresentationValues } from '../../shared/msdPresentationTemplates.js'
import { AnimatedBanner } from './AnimatedBanner.jsx'
import { PromptComposer } from '../components/design-system/organisms/PromptComposer.jsx'
import { Button, saveBlob } from './primitives.jsx'
import glass from './assets/msd-glass.png'
import './presentation-templates.css'

function measureText(value, slot) {
  const context = document.createElement('canvas').getContext('2d')
  context.font = `${slot.fontWeight} ${slot.fontSize}px Arimo`
  return context.measureText(value).width
}
const label = id => id.replace(/([a-z])(\d)/g, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, letter => letter.toUpperCase())
function fileData(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('The file could not be read.')); reader.readAsDataURL(file) })
}

function SlideEditor({ template, onBack }) {
  const [values, setValues] = useState(template.sampleValues)
  const [artwork, setArtwork] = useState(glass)
  const [json, setJson] = useState('')
  const [message, setMessage] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [fontsReady, setFontsReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const titleRef = useRef(null)
  const contract = presentationAiContract(template)
  const storageKey = `studio:slide-draft:${template.id}:${template.manifest.version}`
  const fields = template.manifest.slots.filter(slot => slot.type !== 'image')
  const errors = validatePresentationValues(template, values, fontsReady ? measureText : undefined)
  useEffect(() => {
    titleRef.current?.focus()
    let active = true
    Promise.all([document.fonts.load('700 86px Arimo'), document.fonts.load('400 21px Arimo')]).then(() => { if (active) setFontsReady(true) })
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      if (saved && !validatePresentationValues(template, saved).length) { setValues(saved); setMessage('Your saved draft is restored. Artwork uses the bundled sample.') }
    } catch { setMessage('Saved draft could not be restored. The sample is ready to use.') }
    return () => { active = false }
  }, [storageKey, template])
  async function copyContract() {
    try { await navigator.clipboard.writeText(JSON.stringify(contract, null, 2)); setMessage('AI instructions and output schema copied.') }
    catch { setMessage('Clipboard is unavailable. Download the template package to get the AI instructions.') }
  }
  function importContent() {
    try {
      const candidate = JSON.parse(json)
      const issues = validatePresentationValues(template, candidate, measureText)
      setImportErrors(issues)
      if (!issues.length) { setValues(candidate); setMessage('AI content applied. Review facts and sources before using the slide.') }
    } catch { setImportErrors(['Paste a valid JSON object without markdown fences.']) }
  }
  function saveDraft() {
    try { localStorage.setItem(storageKey, JSON.stringify(values)); setMessage('Text draft saved in this browser. Download the package to keep custom artwork.') }
    catch { setMessage('Browser storage is unavailable or full. Download the package to keep this draft.') }
  }
  async function changeArtwork(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { setMessage('Choose a PNG, JPG or WebP image under 8 MB.'); return }
    try {
      const data = await fileData(file)
      const bitmap = await createImageBitmap(file)
      const valid = bitmap.width >= 1280 && bitmap.height >= 720
      bitmap.close()
      if (!valid) { setMessage('Artwork must be at least 1280 × 720 pixels.'); return }
      setArtwork(data); setMessage('Artwork replaced. Review the crop in the preview.')
    } catch { setMessage('This image could not be opened. Try a different file.') }
  }
  async function download() {
    setBusy(true)
    try {
      const hasArtwork = template.manifest.slots.some(slot => slot.type === 'image')
      const dataUrl = hasArtwork ? artwork.startsWith('data:') ? artwork : await fileData(await (await fetch(artwork)).blob()) : null
      const payload = { format: 'studio-presentation-template/1', category: 'presentation', manifest: template.manifest, ai: contract,
        composition: { ratioId: 'widescreen', slotValues: values }, assets: dataUrl ? { artwork: { dataUrl } } : {} }
      saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${template.id}.json`)
      setMessage('Template package downloaded: layout, content, AI schema, and artwork.')
    } catch { setMessage('The package could not be prepared. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="msd-slide-editor">
    <Button onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> All five templates</Button>
    <header className="msd-slide-editor__heading"><div><p className="bs-note">{template.kind} / 16:9</p><h2 ref={titleRef} tabIndex={-1}>{template.name}</h2></div><div className="msd-slide-actions"><Button disabled={errors.length > 0 || !fontsReady} onClick={saveDraft}>Save text draft</Button><Button primary busy={busy} disabled={errors.length > 0 || !fontsReady} onClick={download}><Download size={16} aria-hidden="true" /> Export JSON</Button></div></header>
    <AnimatedBanner manifest={template.manifest} slotValues={values} imageUrls={{ artwork }} playing={false} ratioId="widescreen" title={`${template.name} slide preview`} />
    <p className="bs-note">Editable slide preview · Sample content, not an approved medical or corporate communication.</p>
    {message && <p role="status" className="bs-notice">{message}</p>}
    {errors.length > 0 && <Alert tone="danger" title="Some content does not fit yet"><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></Alert>}
    <div className="msd-slide-editor__columns"><section aria-labelledby="slide-content-heading"><h3 id="slide-content-heading">Make it yours</h3><p className="bs-note">The layout stays fixed. Edit the content within its limits.</p><div className="msd-slide-fields">{fields.map(slot => <TextArea key={slot.id}
        label={label(slot.id)} instructions={`${values[slot.id]?.length ?? 0}/${slot.maxCharacters}`}
        rows={slot.maxLines === 1 ? 1 : 2} value={values[slot.id] ?? ''}
        maxLength={slot.maxCharacters} readOnly={/^(page|stage\d)$/.test(slot.id)}
        error={errors.find(error => error.startsWith(`${slot.id}:`))}
        onChange={event => setValues(current => ({ ...current, [slot.id]: event.target.value }))} />)}</div>
      {template.manifest.slots.some(slot => slot.type === 'image') && <FileDropzone label="Replace artwork" description="PNG, JPG, WebP · 1280 × 720 minimum · 8 MB maximum" accept="image/png,image/jpeg,image/webp" multiple={false} onFilesChange={files => changeArtwork({ target: { files } })} />}
    </section><section aria-labelledby="slide-ai-heading" className="msd-slide-ai"><h3 id="slide-ai-heading">Fill with AI content</h3><p>Copy this layout’s instructions into your AI workflow. Then paste its JSON response below to populate the slide.</p><p className="bs-note">{template.ai.instructions}</p><Button onClick={copyContract}><Copy size={16} aria-hidden="true"/> Copy AI instructions</Button><TextArea label="Generated content JSON" rows={9} spellCheck={false} value={json} onChange={event => setJson(event.target.value)} placeholder={'{"headline": "Your headline", …}'} />{importErrors.length > 0 && <ul role="alert">{importErrors.map(error => <li key={error}>{error}</li>)}</ul>}<Button disabled={!json.trim() || !fontsReady} onClick={importContent}>Apply content</Button><p className="bs-note">This does not call an AI provider. It validates the response against this template’s fields and fit limits.</p></section></div>
  </div>
}

export function PresentationLibrary({ templates }) {
  const source = templates.find(template => template.manifest.brand?.name?.toLowerCase() === 'msd')?.manifest
  const slides = useMemo(() => createMsdPresentationTemplates(source), [source])
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('slide'))
  const [brief, setBrief] = useState('')
  const selected = slides.find(slide => slide.id === selectedId)
  const libraryRef = useRef(null)
  useEffect(() => {
    const update = () => setSelectedId(new URLSearchParams(window.location.search).get('slide'))
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  function choose(id) {
    const url = new URL(window.location.href)
    url.searchParams.set('category', 'presentations')
    if (id) url.searchParams.set('slide', id); else url.searchParams.delete('slide')
    url.hash = 'presentation-templates'
    window.history.replaceState({}, '', url)
    setSelectedId(id)
    requestAnimationFrame(() => { libraryRef.current?.scrollIntoView({ block: 'start' }); if (!id) libraryRef.current?.focus() })
  }
  return <section id="presentation-templates" className="msd-presentations" ref={libraryRef} tabIndex={-1} aria-label="MSD presentation templates">
    {selected ? <SlideEditor key={selected.id} template={selected} onBack={() => choose(null)} /> : <>
      <h2>MSD core direction</h2>
      <div className="msd-presentations__grid">
        {slides.map(slide => <ActionCard key={slide.id} label={slide.name}
          persistentAction={<AppButton onClick={() => choose(slide.id)} aria-label={`Open ${slide.kind} slide`}>Open {slide.kind} slide</AppButton>}>
          <AnimatedBanner manifest={slide.manifest} slotValues={slide.sampleValues} imageUrls={{ artwork: glass }} ratioId="widescreen" playing={false} title={`${slide.kind} slide preview`} />
        </ActionCard>)}
      </div>
      <div className="msd-presentation-chat"><PromptComposer value={brief} onChange={setBrief} onSubmit={() => {}} canSubmit={Boolean(brief.trim())} submitLabel="Create presentation" label="Presentation brief" formLabel="Presentation AI chat" placeholder="Paste your brief or source content…" rows={4} /></div>
    </>}
  </section>
}
