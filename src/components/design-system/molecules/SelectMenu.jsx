import { SelectField } from "../compatibility.jsx"

/** Legacy callback shape; the installed native SelectField owns rendering and interaction. */
export function SelectMenu({ label, value, options, onChange, triggerLabel, triggerId, disabled = false }) {
  const items = options.map(option => ({ value: option, label: option }))
  if (!options.includes(value)) items.unshift({ value: value ?? '', label: value ?? 'Choose an option', disabled: true })
  return <SelectField id={triggerId} label={label} aria-label={triggerLabel || `${label}: ${value}`}
    value={value ?? ''} options={items} disabled={disabled} onChange={event => onChange(event.target.value)} />
}
