import { useId, useState, type ReactNode } from 'react'
import { Stack, Text } from '../atoms'
import { FieldSupport, hasContent, supportIds } from './FieldSupport'
import './forms.css'
import { TextField } from './TextField'

export type RadioOption = { value: string; label: ReactNode; disabled?: boolean }
export type RadioGroupProps = {
  id?: string; name?: string; label: ReactNode; instructions?: ReactNode; error?: ReactNode
  options: readonly RadioOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void
  customOption?: { value: string; label: string; text: string; onTextChange: (text: string) => void; placeholder?: string }
  disabled?: boolean; required?: boolean; className?: string
}
export function RadioGroup({ id, name, label, instructions, error, options, value, defaultValue, onChange, disabled = false, required, className = '', customOption }: RadioGroupProps) {
  const generated = useId(), groupId = id ?? generated, groupName = name ?? generated
  const [internal, setInternal] = useState(defaultValue)
  const selected = value ?? internal, choices: readonly RadioOption[] = customOption ? [...options, customOption] : options
  return <fieldset id={groupId} disabled={disabled} className={`c-radio-group ${className}`.trim()} aria-describedby={supportIds(groupId, instructions, error)} aria-invalid={hasContent(error) || undefined}>
    <legend><Text as="span" variant="h7">{label}</Text></legend>
    <Stack gap={2}>
      <FieldSupport id={groupId} instructions={instructions} />
      <Stack gap={0}>{choices.map((option, index) => <label className="c-choice-row" key={option.value} htmlFor={`${groupId}-${index}`}>
        <input type="radio" id={`${groupId}-${index}`} name={groupName} value={option.value} className="c-radio" checked={selected === option.value} disabled={option.disabled} required={required} aria-describedby={supportIds(groupId, instructions, error)} aria-invalid={hasContent(error) || undefined} onChange={() => { setInternal(option.value); onChange?.(option.value) }} />
        <Text as="span">{option.label}</Text>
      </label>)}</Stack>
      {customOption && <TextField label={`${customOption.label} answer`} name={name ? `${name}Custom` : undefined} value={customOption.text} onChange={e => customOption.onTextChange(e.target.value)} placeholder={customOption.placeholder} disabled={disabled || selected !== customOption.value} required={required && selected === customOption.value} />}
      <FieldSupport id={groupId} error={error} />
    </Stack>
  </fieldset>
}
