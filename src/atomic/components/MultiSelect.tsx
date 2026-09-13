import { Inline, Stack, Text } from '../atoms'
import { Popover } from './Overlays'
import { Checkbox } from './Checkbox'
import { Tag, type TagProps } from './Tag'
import type { SelectOption } from './Select'
import './forms.css'
import './select.css'
export type MultiSelectProps = { label: string; value: readonly string[]; onChange: (value: string[]) => void; options: readonly SelectOption[]; disabled?: boolean; name?: string }
export function MultiSelect({ label, value, onChange, options, disabled, name }: MultiSelectProps) {
  return <Stack gap={2} className="c-multiselect"><Text variant="h7">{label}</Text><Popover variant="field" label={`${label} · ${value.length} selected`} disabled={disabled}><Stack gap={2}>{options.map(option => <Checkbox key={option.value} label={option.label} checked={value.includes(option.value)} disabled={disabled || option.disabled} onChange={event => onChange(event.target.checked ? [...value, option.value] : value.filter(item => item !== option.value))} />)}</Stack></Popover>
    <Inline>{options.filter(option => value.includes(option.value)).map(option => {
      const props: TagProps = !disabled && !option.disabled ? { children: option.label, removeLabel: `Remove ${option.label}`, onRemove: () => onChange(value.filter(item => item !== option.value)) } : { children: option.label }
      return <Tag key={option.value} tone="accent" {...props} />
    })}</Inline>{name && value.map(item => <input type="hidden" key={item} name={name} value={item} disabled={disabled} />)}</Stack>
}
