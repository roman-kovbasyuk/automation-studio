import { Surface, Checkbox as CheckboxField } from 'brutalist-design-system'
import { SelectField, FileDropzone } from "../../components/design-system/compatibility.jsx"
import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { BrandAssetPreview, downloadBrandAsset } from './BrandAssetPreview.jsx'

const optionalRoles = ['secondary', 'symbol', 'light', 'dark']

export function LogoAssetEditor({ draft, onChange, onAddAssets, onReadAsset, readOnly = false }) {
  const [uploadError, setUploadError] = useState(null)
  const logos = draft.assets.filter((asset) => asset.kind === 'logo')
  const addLogos = async (files) => {
    setUploadError(null)
    if (onAddAssets) {
      try {
        for (const file of files) await onAddAssets({ name: file.name, kind: 'logo', mimeType: file.type || 'application/octet-stream', file })
      } catch (error) { setUploadError(error) }
      return
    }
    const additions = [...files].map((file) => ({ id: crypto.randomUUID(), name: file.name, kind: 'logo', mimeType: file.type || 'application/octet-stream', approved: false }))
    onChange({ ...draft, assets: [...draft.assets, ...additions] })
  }
  const assign = (role, value) => onChange({ ...draft, logoRoles: { ...draft.logoRoles, [role]: value || null } })
  const remove = (id) => onChange({
    ...draft,
    assets: draft.assets.filter((asset) => asset.id !== id),
    logoRoles: Object.fromEntries(Object.entries(draft.logoRoles).map(([role, value]) => [role, value === id ? null : value])),
  })
  return <div className="bs-logo-editor">
    <div className="bs-brand-section-intro"><p>A primary logo is required. Optional variants can be marked Not applicable.</p>
    {!readOnly && <FileDropzone label="Logo files" chooseLabel="Upload logos" accept=".png,.jpg,.jpeg,.webp,.svg" multiple onFilesChange={files => void addLogos(files)} />}
    </div>
    {uploadError && <p className="bs-brand-inline-error" role="alert">{uploadError.message || 'The logo could not be uploaded.'}</p>}
    {!logos.length ? <p className="bs-brand-empty-copy">No logos uploaded.</p> : <div className="bs-logo-grid">{logos.map((logo) => <Surface key={logo.id}><article className="bs-logo-item">
      <div className="bs-logo-samples" aria-label={`${logo.name} samples`}><span><BrandAssetPreview asset={logo} onReadAsset={onReadAsset} alt={`${logo.name} on light background`} /></span><span data-dark><BrandAssetPreview asset={logo} onReadAsset={onReadAsset} alt={`${logo.name} on dark background`} /></span></div>
      <div><strong>{logo.name}</strong><CheckboxField label="Approved for use" checked={logo.approved} disabled={readOnly} onChange={(event) => onChange({ ...draft, assets: draft.assets.map((asset) => asset.id === logo.id ? { ...asset, approved: event.target.checked } : asset) })} />{onReadAsset && <AppButton size="compact" onClick={() => downloadBrandAsset(logo, onReadAsset)}><Download size={16} /> Download</AppButton>}{!readOnly && <AppButton variant="icon" iconOnly aria-label={`Remove ${logo.name}`} onClick={() => remove(logo.id)}><Trash2 size={16} /></AppButton>}</div>
    </article></Surface>)}</div>}
    <div className="bs-logo-roles">
      <SelectField label="Primary logo" value={draft.logoRoles.primary ?? ''} disabled={readOnly} onChange={event => assign('primary', event.target.value)}
        options={[{ value: '', label: 'Choose logo' }, ...logos.map(logo => ({ value: logo.id, label: logo.name }))]} />
      {optionalRoles.map(role => <SelectField key={role} label={`${role[0].toUpperCase() + role.slice(1)} logo`} value={draft.logoRoles[role] ?? ''} disabled={readOnly} onChange={event => assign(role, event.target.value)}
        options={[{ value: '', label: 'Choose' }, { value: 'not_applicable', label: 'Not applicable' }, ...logos.map(logo => ({ value: logo.id, label: logo.name }))]} />)}
    </div>
  </div>
}
