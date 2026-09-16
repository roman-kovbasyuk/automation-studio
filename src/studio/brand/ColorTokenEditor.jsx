import { Checkbox as CheckboxField, TextField } from 'brutalist-design-system'
import { Alert, SelectField } from "../../components/design-system/compatibility.jsx"
import { Plus, Trash2 } from 'lucide-react'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'

const roles = [
  ['primary', 'Primary'], ['accent', 'Accent'], ['canvas', 'Canvas'], ['surface', 'Surface'], ['primaryText', 'Primary text'], ['inverseText', 'Inverse text'],
]

function uniqueId(tokens) {
  let index = tokens.length + 1
  while (tokens.some((token) => token.id === `color-${index}`)) index += 1
  return `color-${index}`
}

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
      .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

export function ColorTokenEditor({ draft, onChange, readOnly = false }) {
  const referenced = new Set(Object.values(draft.colors.roles).filter(Boolean))
  const updateToken = (id, patch) => onChange({ ...draft, colors: { ...draft.colors, palette: draft.colors.palette.map((token) => token.id === id ? { ...token, ...patch } : token) } })
  const add = () => {
    const id = uniqueId(draft.colors.palette)
    onChange({ ...draft, colors: { ...draft.colors, palette: [...draft.colors.palette, { id, name: 'New color', value: '#808080', confirmed: false, evidence: { method: 'manual' } }] } })
  }
  const tokenById = new Map(draft.colors.palette.map((token) => [token.id, token]))
  const contrastChecks = [['primaryText', 'canvas', 'Primary text on canvas'], ['inverseText', 'primary', 'Inverse text on primary']]
    .map(([foregroundRole, backgroundRole, label]) => {
      const foreground = tokenById.get(draft.colors.roles[foregroundRole])
      const background = tokenById.get(draft.colors.roles[backgroundRole])
      if (!foreground || !background) return null
      const ratio = contrastRatio(foreground.value, background.value)
      return ratio < 4.5 ? `${label} is ${ratio.toFixed(1)}:1; review contrast before using small text.` : null
    }).filter(Boolean)
  return <div className="bs-color-editor">
    <div className="bs-brand-section-intro"><p>Keep raw palette values separate from the semantic roles used by future assets.</p><AppButton onClick={add} disabled={readOnly}><Plus size={17} /> Add color</AppButton></div>
    <div className="bs-color-list">{draft.colors.palette.map((token) => <article key={token.id} className="bs-color-row">
      <input aria-label={`${token.name} swatch`} type="color" value={token.value} disabled={readOnly} onChange={(event) => updateToken(token.id, { value: event.target.value.toUpperCase(), confirmed: false, evidence: { method: 'manual' } })} />
      <TextField label="Name" aria-label={`${token.name} name`} value={token.name} disabled={readOnly} onChange={(event) => updateToken(token.id, { name: event.target.value })} />
      <TextField label="Value" aria-label={`${token.name} value`} value={token.value} pattern="#[0-9A-Fa-f]{6}" disabled={readOnly} onChange={(event) => updateToken(token.id, { value: event.target.value.toUpperCase(), confirmed: false, evidence: { method: 'manual' } })} />
      <CheckboxField label="Confirmed" checked={token.confirmed} disabled={readOnly} onChange={(event) => updateToken(token.id, { confirmed: event.target.checked })} />
      <AppButton variant="icon" iconOnly aria-label={`Delete ${token.name}`} disabled={readOnly || referenced.has(token.id)} onClick={() => onChange({ ...draft, colors: { ...draft.colors, palette: draft.colors.palette.filter((item) => item.id !== token.id) } })}><Trash2 size={17} /></AppButton>
      <small className="bs-brand-evidence">{token.confirmed ? 'Confirmed' : 'Needs review'} · {token.evidence.method.replaceAll('_', ' ')}{token.evidence.sourceId ? ` · source ${token.evidence.sourceId}` : ''}</small>
    </article>)}</div>
    <fieldset className="bs-color-roles"><legend>Semantic roles</legend>{roles.map(([id, label]) => <SelectField key={id} label={label} value={draft.colors.roles[id]} disabled={readOnly}
      options={[{ value: '', label: 'Choose color' }, ...draft.colors.palette.map(token => ({ value: token.id, label: `${token.name} · ${token.value}` }))]}
      onChange={event => onChange({ ...draft, colors: { ...draft.colors, roles: { ...draft.colors.roles, [id]: event.target.value } } })} />)}</fieldset>
    {contrastChecks.length > 0 && <div role="status"><Alert tone="warning">{contrastChecks.map((warning) => <p key={warning}>{warning}</p>)}</Alert></div>}
  </div>
}
