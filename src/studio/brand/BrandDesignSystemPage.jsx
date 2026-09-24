import { TextField } from 'brutalist-design-system'
import '../../../shared/fonts/arimo.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Container, Grid, Stack, Surface } from 'brutalist-design-system'
import { ActionCard as VendorActionCard, AppButton as VendorAppButton } from "../../components/design-system/compatibility.jsx"
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { EmptyState } from '../../components/design-system/molecules/EmptyState.jsx'
import { WorkflowSteps } from '../../components/design-system/molecules/WorkflowSteps.jsx'
import { MaterialsStep } from './MaterialsStep.jsx'
import { ReviewStep } from './ReviewStep.jsx'
import { PublishStep } from './PublishStep.jsx'
import { PublishedBrandView } from './PublishedBrandView.jsx'
import { BrandIdentityPreview, brandSummary } from './BrandIdentityPreview.jsx'
import './brand-design-system.css'

const wizardSteps = ['materials', 'review', 'publish']
const wizardLabels = { materials: 'Materials', review: 'Review', publish: 'Publish' }

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(file)
  })
}

function BrandLibraryCard({ brand, api, onNavigate }) {
  const draft = brand.draft ?? { name: brand.name ?? 'Untitled brand system', colors: { palette: [], roles: {} }, typography: { heading: { family: '', weight: 600 }, body: { family: '', weight: 400 } }, assets: [], logoRoles: {} }
  const label = draft.name
  const readAsset = useCallback((assetId, options) => api.getBrandAssetBlob(brand.id, assetId, options), [api, brand.id])
  return <VendorActionCard label={label}
    status={<span className="bs-brand-state">{brand.state === 'published' ? 'Published · v' + (brand.activeVersion?.versionNumber ?? 1) : 'Draft'}</span>}
    persistentAction={<VendorAppButton size="compact" iconOnly aria-label={'Open ' + label} onClick={() => onNavigate('/mvp/system/' + encodeURIComponent(brand.id))}><ArrowRight size={18} /></VendorAppButton>}>
    <div className="bs-brand-library-card-heading"><h2>{label}</h2><span>{brand.state === 'published' ? 'Ready to use' : 'Private draft'}</span></div>
    <BrandIdentityPreview snapshot={draft} compact onReadAsset={api.getBrandAssetBlob ? readAsset : undefined} />
    <p className="bs-brand-library-meta">{brandSummary(draft)}</p>
  </VendorActionCard>
}

// Server messages such as "Route not found" are not written for people; explain the situation instead.
function libraryErrorMessage(error) {
  if (error?.status === 404 || error?.code === 'NOT_FOUND') return 'Brand design systems are not available in this workspace yet.'
  if (error?.status === 403) return 'You do not have access to brand design systems.'
  return 'Brand systems could not be loaded. Check your connection and try again.'
}

function BrandList({ api, actor, onNavigate }) {
  const [brands, setBrands] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const canManage = actor?.role === 'designer' || actor?.role === 'admin'
  useEffect(() => {
    let active = true
    setError(null)
    api.listBrandSystems().then((result) => { if (active) setBrands(result.brands) }).catch((value) => { if (active) setError(value) })
    return () => { active = false }
  }, [api, attempt])
  return <Container maxWidth={1180}>
    <Stack gap={8}>
      <section id="brand-system-library" className="bs-brand-library-section" aria-labelledby="brand-library-title">
        <header className="bs-brand-library-heading">
      <div><h1 id="brand-library-title">Brand design systems</h1><p>The foundations behind your templates. One place for every brand.</p></div>
      {canManage && <AppButton variant="primary" onClick={() => onNavigate('/mvp/system/new/materials')}><Plus size={18} /> New brand system</AppButton>}
    </header>
    {error ? <div role="alert"><p>{libraryErrorMessage(error)}</p><AppButton onClick={() => { setBrands(null); setAttempt(value => value + 1) }}>Try again</AppButton></div> :
      brands === null ? <p role="status">Loading brand systems…</p> : brands.length ? <Grid gap={6} minItemWidth="360px">
        {brands.map(brand => <BrandLibraryCard key={brand.id} brand={brand} api={api} onNavigate={onNavigate} />)}
      </Grid> : <EmptyState title="No brand system yet" description={canManage ? 'Start with the material you already have.' : 'A designer or admin adds brand systems. Templates use them once they are published.'} />}
      </section>
    </Stack>
  </Container>
}

function NewBrand({ api, onNavigate }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function create(event) {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const brand = await api.createBrandSystem({ name: name.trim() })
      onNavigate(`/mvp/system/${encodeURIComponent(brand.id)}/materials`)
    } catch (value) { setError(value) } finally { setBusy(false) }
  }
  return <Container maxWidth={1000}>
    <Surface tone="surface"><div className="bs-brand-new-content">
      <section id="brand-materials" className="bs-brand-new-layout" aria-labelledby="brand-new-title">
        <div><span>Step 1 of 3</span><h1 id="brand-new-title">Materials</h1><p>Name the brand to create a private draft. You can then add files, Figma links and context on this page.</p></div>
        <form onSubmit={create}><TextField label="Brand name" autoFocus value={name} maxLength={200} onChange={(event) => setName(event.target.value)} />
          {error && <p role="alert">{error.message || 'The brand could not be created.'}</p>}
          <AppButton variant="primary" type="submit" busy={busy} disabled={!name.trim()}>Create private draft <ArrowRight size={18} /></AppButton>
        </form>
      </section>
    </div></Surface>
  </Container>
}

export function BrandDesignSystemPage({ api, actor, route, onNavigate, onDirtyChange = () => {} }) {
  const [brand, setBrand] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [config, setConfig] = useState(null)
  const [saveState, setSaveState] = useState('Saved')
  const [undoDraft, setUndoDraft] = useState(null)
  const [syncNotice, setSyncNotice] = useState(null)
  const revision = useRef(null)
  const saveTimer = useRef(null)
  const pendingDraft = useRef(null)
  const saveInFlight = useRef(null)
  const editable = actor?.role === 'designer' || actor?.role === 'admin'

  useEffect(() => {
    if (!route.id) return
    const controller = new AbortController()
    setBrand(null); setDraft(null); setLoadError(null)
    api.getBrandSystem(route.id, { signal: controller.signal }).then((value) => {
      setBrand(value); setDraft(value.draft); pendingDraft.current = null; revision.current = value.revision; setSaveState('Saved'); setSyncNotice(null)
    }).catch((value) => { if (value.name !== 'AbortError') setLoadError(value) })
    return () => controller.abort()
  }, [api, route.id])

  useEffect(() => {
    if (!api.getBrandSystemConfig) return undefined
    let active = true
    api.getBrandSystemConfig().then((value) => { if (active) setConfig(value) }).catch(() => {})
    return () => { active = false }
  }, [api])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  async function drainSaves() {
    if (!editable || !brand) return brand
    if (saveInFlight.current) return saveInFlight.current
    const operation = (async () => {
      let latest = brand
      while (pendingDraft.current) {
        const next = pendingDraft.current
        pendingDraft.current = null
        setSaveState('Saving'); setSyncNotice(null); onDirtyChange(true)
        try {
          const saved = await api.patchBrandDraft(brand.id, next, revision.current)
          revision.current = saved.revision
          latest = saved
          setBrand(saved)
          if (!pendingDraft.current) setDraft(saved.draft)
        } catch (error) {
          pendingDraft.current = next
          if (error?.status === 409 || error?.code === 'revision_conflict') {
            try {
              const refreshed = await api.getBrandSystem(brand.id)
              revision.current = refreshed.revision
              setBrand(refreshed)
              setDraft(next)
              setSyncNotice('This draft changed elsewhere. Your local edits are preserved; review them and retry the save.')
            } catch { /* Keep the original conflict visible when refresh fails. */ }
          }
          setSaveState('Save failed'); onDirtyChange(true); throw error
        }
      }
      setSaveState('Saved'); setSyncNotice(null); onDirtyChange(false)
      return latest
    })()
    saveInFlight.current = operation
    try { return await operation } finally { if (saveInFlight.current === operation) saveInFlight.current = null }
  }

  async function save(next) {
    clearTimeout(saveTimer.current)
    pendingDraft.current = next
    return drainSaves()
  }

  function change(next) {
    setDraft(next); pendingDraft.current = next; setSaveState('Saving'); setSyncNotice(null); onDirtyChange(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => drainSaves().catch(() => {}), 500)
  }

  async function flushPending() {
    if (pendingDraft.current || saveInFlight.current) await drainSaves()
  }

  async function addSource(input) {
    await flushPending()
    const payload = input.kind === 'file' ? {
      kind: 'file', name: input.name, mimeType: input.mimeType, data: await fileToBase64(input.file),
    } : input
    const updated = await api.addBrandSource(brand.id, payload, revision.current)
    revision.current = updated.revision; setBrand(updated); setDraft(updated.draft); setSaveState('Saved'); onDirtyChange(false)
    return updated
  }

  async function addAsset(input) {
    await flushPending()
    const updated = await api.addBrandAsset(brand.id, {
      name: input.name,
      kind: input.kind,
      mimeType: input.mimeType,
      data: await fileToBase64(input.file),
    }, revision.current)
    revision.current = updated.revision; setBrand(updated); setDraft(updated.draft); setSaveState('Saved'); onDirtyChange(false)
    return updated
  }

  async function analyseSources(approvalFingerprint) {
    await flushPending()
    try {
      const updated = await api.analyseBrandSources(brand.id, revision.current, approvalFingerprint)
      revision.current = updated.revision; setBrand(updated); setDraft(updated.draft); setSaveState('Saved'); setSyncNotice(null); onDirtyChange(false)
      onNavigate(`/mvp/system/${encodeURIComponent(brand.id)}/review`)
      return updated
    } catch (error) {
      if (error?.code !== 'brand_cost_approval_required') {
        try {
          const refreshed = await api.getBrandSystem(brand.id)
          revision.current = refreshed.revision; setBrand(refreshed); setDraft(refreshed.draft); setSaveState('Saved'); onDirtyChange(false)
        } catch { /* Preserve the analysis error if the refresh is unavailable. */ }
      }
      throw error
    }
  }

  async function inspectSources() {
    await flushPending()
    if (!api.inspectBrandSources) return null
    return api.inspectBrandSources(brand.id)
  }

  async function go(step) {
    const next = { ...draft, currentStep: step }
    try {
      await save(next)
      onNavigate(`/mvp/system/${encodeURIComponent(brand.id)}/${step}`)
    } catch { /* Save failed remains visible; navigation intentionally stops. */ }
  }

  async function publish() {
    setSaveState('Saving')
    try {
      const published = await api.publishBrandSystem(brand.id, revision.current, crypto.randomUUID())
      revision.current = published.revision; setBrand(published); setDraft(published.draft); setUndoDraft(null); setSaveState('Saved'); onDirtyChange(false)
      onNavigate(`/mvp/system/${encodeURIComponent(brand.id)}`)
    } catch (error) { setSaveState('Save failed'); onDirtyChange(true); throw error }
  }

  async function propose(prompt, approvalFingerprint) {
    const result = await api.proposeBrandChange(brand.id, prompt, approvalFingerprint)
    return result.proposal ?? result
  }

  async function applyProposal(proposalId) {
    const previous = structuredClone(draft)
    const updated = await api.applyBrandProposal(brand.id, proposalId, revision.current)
    revision.current = updated.revision; setBrand(updated); setDraft(updated.draft); setUndoDraft(previous); setSaveState('Saved'); onDirtyChange(false)
  }

  async function undoLastChange() {
    if (!undoDraft) return
    const updated = await api.patchBrandDraft(brand.id, undoDraft, revision.current)
    revision.current = updated.revision; setBrand(updated); setDraft(updated.draft); setUndoDraft(null); setSaveState('Saved'); onDirtyChange(false)
  }

  async function restoreVersion(versionId) {
    const updated = await api.restoreBrandVersion(brand.id, versionId, revision.current)
    revision.current = updated.revision; setBrand(updated); setDraft(updated.draft); setUndoDraft(null); setSaveState('Saved'); onDirtyChange(false)
  }

  if (!route.id) return route.mode === 'new' ? <NewBrand api={api} onNavigate={onNavigate} /> : <BrandList api={api} actor={actor} onNavigate={onNavigate} />
  if (loadError) return <div role="alert"><p>{loadError.message || 'The brand system could not be loaded.'}</p><AppButton onClick={() => onNavigate('/mvp/system')}>Back to library</AppButton></div>
  if (!brand || !draft) return <p role="status">Loading brand system…</p>
  if (route.step === 'published' || (!editable && brand.state === 'published')) return <PublishedBrandView brand={brand} canManage={editable}
    onBack={() => onNavigate('/mvp/system')}
    onEdit={() => onNavigate(`/mvp/system/${encodeURIComponent(brand.id)}/review`)}
    onHistory={() => api.listBrandVersions(brand.id)}
    onRestore={restoreVersion}
    onUndo={undoDraft ? undoLastChange : undefined}
    onReadAsset={api.getBrandAssetBlob ? (assetId, options) => api.getBrandAssetBlob(brand.id, assetId, options) : undefined}
    onPropose={propose}
    onApply={applyProposal}
    onDiscard={(proposalId) => api.discardBrandProposal(brand.id, proposalId)} />

  const step = wizardSteps.includes(route.step) ? route.step : draft.currentStep
  const currentIndex = wizardSteps.indexOf(step)
  return <Container maxWidth={1180}>
    <Surface tone="surface">
      <header className="bs-brand-workspace-header-content"><div><span>{brand.state}</span><strong>{draft.name}</strong></div><span className="bs-brand-save-state" data-state={saveState}>{saveState}</span></header>
    </Surface>
    {syncNotice && <div className="bs-brand-inline-error" role="alert"><span>{syncNotice}</span><AppButton size="compact" onClick={() => drainSaves().catch(() => {})}>Retry save</AppButton></div>}
    <div className="bs-brand-workspace-layout">
      <div className="bs-brand-workspace-main">
        {step === 'materials' ? <MaterialsStep draft={draft} limits={config?.limits} onChange={change} onInspect={editable ? inspectSources : undefined} onContinue={(action, input) => action === 'source' ? addSource(input) : action === 'analyse' ? analyseSources(input) : go(action)} readOnly={!editable} /> :
          step === 'review' ? <ReviewStep draft={draft} onChange={change} onAddAsset={editable ? addAsset : undefined} onReadAsset={api.getBrandAssetBlob ? (assetId, options) => api.getBrandAssetBlob(brand.id, assetId, options) : undefined} readOnly={!editable} onBack={() => go('materials')} onContinue={() => go('publish')} /> :
            <PublishStep draft={draft} saveState={saveState} onBack={() => go('review')} onEdit={(section) => onNavigate(`/mvp/system/${encodeURIComponent(brand.id)}/review#brand-review-${section}`)} onPublish={publish} />}
      </div>
      <nav className="bs-brand-progress" aria-label="Brand setup"><WorkflowSteps ariaLabel="Brand setup steps" items={wizardSteps.map((item, index) => ({
        label: wizardLabels[item], complete: index < currentIndex, current: index === currentIndex,
        href: `/mvp/system/${encodeURIComponent(brand.id)}/${item}`, disabled: !editable && item !== step,
      }))} onNavigate={(index) => go(wizardSteps[index])} /></nav>
    </div>
  </Container>
}
