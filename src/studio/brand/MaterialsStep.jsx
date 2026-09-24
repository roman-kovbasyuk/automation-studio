import { TextField } from 'brutalist-design-system'
import { useState } from 'react'
import { Link2, RefreshCw, Trash2 } from 'lucide-react'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { ActionCard } from '../../components/design-system/molecules/ActionCard.jsx'
import { EmptyState } from '../../components/design-system/molecules/EmptyState.jsx'
import { PromptComposer } from '../../components/design-system/organisms/PromptComposer.jsx'

const acceptedMaterials = '.pdf,.png,.jpg,.jpeg,.webp,.svg,.woff2,.woff,.ttf,.otf,.json'

function uploadMimeType(file) {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  return { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', json: 'application/json', svg: 'image/svg+xml' }[extension] ?? 'application/octet-stream'
}

export function MaterialsStep({ draft, limits, onChange, onInspect, onContinue, readOnly = false }) {
  const [figmaUrl, setFigmaUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [costApproval, setCostApproval] = useState(null)
  const addFiles = async (files) => {
    setBusy(true); setError(null)
    try {
      for (const file of files) await onContinue('source', { kind: 'file', name: file.name, mimeType: uploadMimeType(file), file })
    } catch (value) { setError(value) } finally { setBusy(false) }
  }
  const addFigma = async () => {
    const value = figmaUrl.trim()
    if (!/^https:\/\/(?:www\.)?figma\.com\//i.test(value)) return
    setBusy(true); setError(null)
    try { await onContinue('source', { kind: 'figma', label: 'Figma source', url: value }); setFigmaUrl('') }
    catch (value) { setError(value) } finally { setBusy(false) }
  }
  const analyse = async (approvalFingerprint) => {
    setBusy(true); setError(null)
    try {
      if (!approvalFingerprint && onInspect) {
        const inspection = await onInspect()
        if (inspection?.requiresApproval) {
          setCostApproval(inspection)
          return
        }
        approvalFingerprint = inspection?.approvalFingerprint
      }
      await onContinue('analyse', approvalFingerprint); setCostApproval(null)
    }
    catch (value) {
      if (value?.code === 'brand_cost_approval_required') setCostApproval(value.details)
      else setError(value)
    } finally { setBusy(false) }
  }
  return <section id="brand-materials" className="bs-brand-step" aria-labelledby="brand-materials-title">
    <header className="bs-brand-step-heading">
      <div><h1 id="brand-materials-title" tabIndex={-1}>Materials</h1><p>Add everything that helps describe this brand. Files and Figma links work together.</p></div>
    </header>
    <TextField label="Brand name" value={draft.name} maxLength={200} disabled={readOnly} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
    <PromptComposer
      value={draft.context}
      onChange={(context) => onChange({ ...draft, context })}
      files={draft.sources.filter((source) => source.kind === 'file')}
      onAttach={readOnly ? undefined : addFiles}
      onRemove={(id) => onChange({ ...draft, sources: draft.sources.filter((source) => source.id !== id) })}
      canSubmit={false}
      showSubmit={false}
      disabled={readOnly}
      label="Client and brand context"
      formLabel="Brand materials"
      placeholder="Optional context: what the brand stands for, where it appears, and what must stay consistent."
      accept={acceptedMaterials}
      formatLabel="PDF, IMAGE, FONT, JSON"
      attachmentsLabel="Uploaded brand materials"
      fileInputLabel="Brand files"
      attachLabel="Attach brand materials"
      hint={`Up to ${Math.round((limits?.maxFileBytes ?? 5 * 1024 * 1024) / 1024 / 1024)} MB per file · ${limits?.maxSources ?? 30} sources · ${limits?.maxPdfPages ?? 200} PDF pages · ${limits?.maxImageDimension ?? 8192}px per image side`}
    />
    {error && <p className="bs-brand-inline-error" role="alert">{error.message || 'The material could not be added.'}</p>}
    <div className="bs-brand-figma-row">
      <TextField label="Figma link" type="url" value={figmaUrl} disabled={readOnly} placeholder="https://www.figma.com/design/…" onChange={(event) => setFigmaUrl(event.target.value)} />
      <AppButton onClick={addFigma} busy={busy} disabled={readOnly || busy || !/^https:\/\/(?:www\.)?figma\.com\//i.test(figmaUrl.trim())}><Link2 size={18} aria-hidden="true" /> Add link</AppButton>
    </div>
    <section className="bs-brand-sources" aria-labelledby="brand-sources-title">
      <h2 id="brand-sources-title">Sources</h2>
      {!draft.sources.length ? <EmptyState title="No brand materials yet" description="Your uploaded files and Figma links will stay together here." /> :
        <div className="bs-brand-source-list">{draft.sources.map((source) => <ActionCard key={source.id} label={source.kind === 'figma' ? 'Figma' : source.mimeType} status={<span className="bs-brand-source-status">{source.status}</span>}
          actions={!readOnly && <AppButton variant="icon" size="compact" iconOnly aria-label={`Remove ${source.label}`} onClick={() => onChange({ ...draft, sources: draft.sources.filter((item) => item.id !== source.id) })}><Trash2 size={17} /></AppButton>}>
          <h3>{source.label}</h3>{source.error && <p role="alert">{source.error}</p>}{source.status === 'failed' && <AppButton size="compact" onClick={() => analyse()}><RefreshCw size={16} /> Retry analysis</AppButton>}
        </ActionCard>)}</div>}
    </section>
    {costApproval && <aside className="bs-brand-cost-gate" role="alert"><div><strong>Approve analysis cost</strong><p>{costApproval.provider} · {costApproval.model} · Estimated ${costApproval.estimatedUsd.toFixed(2)}. This is an estimate, and publishing remains a separate action.</p></div><AppButton variant="primary" onClick={() => analyse(costApproval.approvalFingerprint)}>Approve and analyze</AppButton></aside>}
    <footer className="bs-brand-step-actions">
      {!draft.sources.length && !readOnly && <p className="bs-note" id="brand-analyse-hint">Add a file or Figma link to analyze it, or set up the brand manually.</p>}
      <AppButton onClick={() => onContinue('review')}>Set up manually</AppButton>
      <AppButton variant="primary" onClick={() => analyse()} busy={busy} disabled={busy || !draft.sources.length}
        aria-describedby={!draft.sources.length ? 'brand-analyse-hint' : undefined}>Analyze materials</AppButton>
    </footer>
  </section>
}
