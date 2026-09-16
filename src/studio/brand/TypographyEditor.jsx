import { Checkbox as CheckboxField, TextField } from 'brutalist-design-system'
import { SelectField } from "../../components/design-system/compatibility.jsx"
const styles = [['h1', 'H1'], ['h2', 'H2'], ['h3', 'H3'], ['body', 'Body'], ['caption', 'Caption']]

export function TypographyEditor({ draft, onChange, readOnly = false }) {
  const updateFont = (role, patch) => onChange({ ...draft, typography: { ...draft.typography, [role]: { ...draft.typography[role], ...patch } } })
  const updateScale = (role, patch) => onChange({ ...draft, typography: { ...draft.typography, scale: { ...draft.typography.scale, [role]: { ...draft.typography.scale[role], ...patch } } } })
  return <div className="bs-type-editor">
    <div className="bs-type-families">{[['heading', 'Heading'], ['body', 'Body']].map(([role, label]) => <fieldset key={role}><legend>{label} family</legend>
      <TextField label="Family" aria-label={`${label} family`} value={draft.typography[role].family} disabled={readOnly} onChange={(event) => updateFont(role, { family: event.target.value, confirmed: false, evidence: { method: 'manual' } })} />
      <SelectField label="Weight" aria-label={`${label} weight`} value={String(draft.typography[role].weight)} disabled={readOnly}
        options={[100,200,300,400,500,600,700,800,900].map(weight => ({ value: String(weight), label: String(weight) }))}
        onChange={event => updateFont(role, { weight: Number(event.target.value), confirmed: false, evidence: { method: 'manual' } })} />
      <TextField label="Fallbacks" aria-label={`${label} fallbacks`} value={draft.typography[role].fallbacks.join(', ')} disabled={readOnly} onChange={(event) => updateFont(role, { fallbacks: event.target.value.split(',').map((value) => value.trim()).filter(Boolean), evidence: { method: 'manual' } })} />
      <CheckboxField label="Confirmed choice" checked={draft.typography[role].confirmed} disabled={readOnly} onChange={(event) => updateFont(role, { confirmed: event.target.checked })} />
      {draft.typography[role].evidence && <small className="bs-brand-evidence">{draft.typography[role].confirmed ? 'Confirmed' : 'Needs review'} · {draft.typography[role].evidence.method.replaceAll('_', ' ')}{draft.typography[role].evidence.sourceId ? ` · source ${draft.typography[role].evidence.sourceId}` : ''}</small>}
    </fieldset>)}</div>
    <div className="bs-type-specimen" aria-label="Typography specimen"><p className="bs-type-specimen-heading" style={{ fontFamily: draft.typography.heading.family || undefined }}> {draft.typography.heading.family || 'Choose a heading family'}</p><p style={{ fontFamily: draft.typography.body.family || undefined }}>Brand typography should remain clear in real headlines, body copy, and small labels.</p></div>
    <div className="bs-type-scale"><div className="bs-type-scale-head"><span>Style</span><span>Size</span><span>Line height</span></div>{styles.map(([id, label]) => <div key={id}><strong>{label}</strong><TextField label={`${label} size`} type="number" min="1" max="240" step="1" value={draft.typography.scale[id].size} disabled={readOnly} onChange={(event) => updateScale(id, { size: Number(event.target.value) })} /><TextField label={`${label} line height`} type="number" min="0.5" max="4" step="0.05" value={draft.typography.scale[id].lineHeight} disabled={readOnly} onChange={(event) => updateScale(id, { lineHeight: Number(event.target.value) })} /></div>)}</div>
    <CheckboxField label="I confirm these fonts are permitted for the intended use." checked={draft.typography.licenseConfirmed} disabled={readOnly} onChange={(event) => onChange({ ...draft, typography: { ...draft.typography, licenseConfirmed: event.target.checked } })} />
  </div>
}
