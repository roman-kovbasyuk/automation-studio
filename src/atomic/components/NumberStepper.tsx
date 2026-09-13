import { useId, useState, type ReactNode } from 'react'
import { Inline, Stack, Text } from '../atoms'
import { Button } from './Button'
import { FieldSupport, supportIds } from './FieldSupport'
import './value-controls.css'

export type NumberStepperProps = { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; name?: string; id?: string; disabled?: boolean; instructions?: ReactNode; className?: string }
export function NumberStepper({ label, value, onChange, min = 0, max = 100, step = 1, name, id, disabled = false, instructions, className = '' }: NumberStepperProps) {
  const generated = useId(), fieldId = id ?? generated
  const upper = Math.max(min, max), increment = step > 0 && Number.isFinite(step) ? step : 1
  const bound = (number: number) => Math.min(upper, Math.max(min, Number.isFinite(number) ? number : min))
  const current = bound(value)
  const [draft, setDraft] = useState<string | null>(null)
  const commit = (number: number) => { setDraft(null); const next = bound(Number(number.toFixed(10))); if (next !== current) onChange(next) }
  return <Stack gap={2} className={`c-number-stepper ${className}`.trim()}>
    <label htmlFor={fieldId}><Text as="span" variant="h7">{label}</Text></label>
    <Inline gap={0}>
      <Button iconOnly icon="minus" aria-label={`Decrease ${label}`} disabled={disabled || current <= min} onClick={() => commit(current - increment)} />
      <input id={fieldId} name={name} type="number" value={draft ?? current} min={min} max={upper} step={increment} disabled={disabled} aria-describedby={supportIds(fieldId, instructions)} onChange={event => setDraft(event.target.value)} onBlur={() => commit(draft === null || draft.trim() === '' ? current : Number(draft))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(draft === null || draft.trim() === '' ? current : Number(draft)) } }} />
      <Button iconOnly icon="plus" aria-label={`Increase ${label}`} disabled={disabled || current >= upper} onClick={() => commit(current + increment)} />
    </Inline>
    <FieldSupport id={fieldId} instructions={instructions} />
  </Stack>
}
