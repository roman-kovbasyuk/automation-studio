import { useId, useState } from 'react'
import { Stack, Text, Icon } from '../atoms'
import { TextField } from './TextField'
import type { SelectOption } from './Select'
import './combobox.css'
import './select.css'
export type ComboboxProps = { label: string; value: string; onChange: (value: string) => void; options: readonly SelectOption[]; disabled?: boolean; name?: string }
export function Combobox({ label, value, onChange, options, disabled, name }: ComboboxProps) {
  const id = useId(), [open, setOpen] = useState(false), [query, setQuery] = useState<string | null>(null), [active, setActive] = useState(-1)
  const matches = options.filter(option => option.label.toLowerCase().includes((query ?? '').toLowerCase()))
  const select = (index: number) => { const option = matches[index]; if (!option || option.disabled) return; onChange(option.value); setQuery(null); setOpen(false); setActive(-1) }
  return <Stack gap={2} className="c-combobox"><TextField label={label} role="combobox" autoComplete="off" aria-expanded={open} aria-autocomplete="list" aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined} disabled={disabled} value={query ?? options.find(option => option.value === value)?.label ?? ''} onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setQuery(null); setActive(-1) }} onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true) }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setQuery(null); setActive(-1) }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); const enabled = matches.map((option, i) => option.disabled ? -1 : i).filter(i => i >= 0); const position = enabled.indexOf(active), next = position < 0 ? event.key === 'ArrowDown' ? 0 : enabled.length - 1 : (position + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length; setActive(enabled[next] ?? -1) }
    if (event.key === 'Enter' && open) { event.preventDefault(); select(active) }
  }} />
    <Icon name="chevronDown" size="small" />
    {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
    {open && <ul id={`${id}-list`} role="listbox" aria-label={label} className="c-combobox__options c-dropdown-popup">{matches.map((option, i) => <li key={option.value} id={`${id}-${i}`} className="c-dropdown-option" role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} data-active={i === active || undefined} onMouseDown={event => event.preventDefault()} onClick={() => select(i)}><Text as="span" variant="body">{option.label}</Text>{option.value === value && <Icon name="check" size="small" />}</li>)}{!matches.length && <li role="presentation"><Text variant="body">No matches</Text></li>}</ul>}
  </Stack>
}
