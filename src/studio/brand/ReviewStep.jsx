import { Checkbox as CheckboxField, TextField } from 'brutalist-design-system'
import { SelectField, FileDropzone } from "../../components/design-system/compatibility.jsx"
import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { WorkflowModuleFrame } from '../../components/design-system/organisms/WorkflowModuleFrame.jsx'
import { LogoAssetEditor } from './LogoAssetEditor.jsx'
import { ColorTokenEditor } from './ColorTokenEditor.jsx'
import { TypographyEditor } from './TypographyEditor.jsx'
import { downloadBrandAsset } from './BrandAssetPreview.jsx'

export function ReviewStep({ draft, onChange, onAddAsset, onReadAsset, onBack, onContinue, readOnly = false }) {
  const [uploadError, setUploadError] = useState(null)
  const supportAssets = draft.assets.filter((asset) => asset.kind !== 'logo')
  return <section id="brand-review" className="bs-brand-step" aria-labelledby="brand-review-title">
    <header className="bs-brand-step-heading"><div><h1 id="brand-review-title" tabIndex={-1}>Review</h1><p>Confirm the foundations AI found and complete anything missing. Reviewed choices are never overwritten silently.</p></div></header>
    <WorkflowModuleFrame id="brand-review-logos" title="Logos"><LogoAssetEditor draft={draft} onChange={onChange} onAddAssets={onAddAsset} onReadAsset={onReadAsset} readOnly={readOnly} /></WorkflowModuleFrame>
    <WorkflowModuleFrame id="brand-review-assets" title="Assets"><div className="bs-asset-editor"><div className="bs-brand-section-intro"><p>Keep approved reusable graphics separate from visual references.</p>{!readOnly && <FileDropzone label="Supporting asset files" chooseLabel="Add assets" accept=".png,.jpg,.jpeg,.webp,.svg" multiple onFilesChange={async files => {
      setUploadError(null)
      if (onAddAsset) { try { for (const file of files) await onAddAsset({ name: file.name, kind: 'reference', mimeType: file.type || 'application/octet-stream', file }) } catch (error) { setUploadError(error) } }
      else { const additions = files.map(file => ({ id: crypto.randomUUID(), name: file.name, kind: 'reference', mimeType: file.type || 'application/octet-stream', approved: false })); onChange({ ...draft, assets: [...draft.assets, ...additions] }) }
    }} />}</div>{uploadError && <p className="bs-brand-inline-error" role="alert">{uploadError.message || 'The asset could not be uploaded.'}</p>}{supportAssets.length ? <ul>{supportAssets.map((asset) => <li key={asset.id}><TextField label="Asset name" aria-label={`${asset.name} name`} value={asset.name} disabled={readOnly} onChange={(event) => onChange({ ...draft, assets: draft.assets.map((item) => item.id === asset.id ? { ...item, name: event.target.value } : item) })} /><SelectField label="Asset type" aria-label={`${asset.name} type`} value={asset.kind} disabled={readOnly} onChange={event => onChange({ ...draft, assets: draft.assets.map(item => item.id === asset.id ? { ...item, kind: event.target.value } : item) })}
      options={['reference', 'icon', 'illustration', 'pattern'].map(kind => ({ value: kind, label: kind }))} /><CheckboxField label="Approved" checked={asset.approved} disabled={readOnly} onChange={(event) => onChange({ ...draft, assets: draft.assets.map((item) => item.id === asset.id ? { ...item, approved: event.target.checked } : item) })} /><div className="bs-asset-actions">{onReadAsset && <AppButton variant="icon" iconOnly aria-label={`Download ${asset.name}`} onClick={() => downloadBrandAsset(asset, onReadAsset)}><Download size={16} /></AppButton>}{!readOnly && <AppButton variant="icon" iconOnly aria-label={`Remove ${asset.name}`} onClick={() => onChange({ ...draft, assets: draft.assets.filter((item) => item.id !== asset.id) })}><Trash2 size={16} /></AppButton>}</div></li>)}</ul> : <p className="bs-brand-empty-copy">No supporting assets yet.</p>}</div></WorkflowModuleFrame>
    <WorkflowModuleFrame id="brand-review-colors" title="Colors"><ColorTokenEditor draft={draft} onChange={onChange} readOnly={readOnly} /></WorkflowModuleFrame>
    <WorkflowModuleFrame id="brand-review-typography" title="Typography"><TypographyEditor draft={draft} onChange={onChange} readOnly={readOnly} /></WorkflowModuleFrame>
    <footer className="bs-brand-step-actions"><AppButton onClick={onBack}>Back</AppButton><AppButton variant="primary" onClick={onContinue}>Review readiness</AppButton></footer>
  </section>
}
