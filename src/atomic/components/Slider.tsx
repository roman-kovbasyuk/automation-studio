import { useId, type CSSProperties, type ReactNode } from 'react'
import { Stack, Text } from '../atoms'
import { FieldSupport, supportIds } from './FieldSupport'
import './value-controls.css'

export type SliderProps = { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; name?: string; id?: string; disabled?: boolean; instructions?: ReactNode; formatValue?: (value: number) => string; className?: string }
export function Slider({ label, value, onChange, min = 0, max = 100, step = 1, name, id, disabled, instructions, formatValue = String, className = '' }: SliderProps) {
  const generated = useId(), fieldId = id ?? generated, upper = Math.max(min, max)
  const current = Math.min(upper, Math.max(min, Number.isFinite(value) ? value : min))
  const percent = upper === min ? 0 : (current - min) / (upper - min) * 100
  return <Stack gap={2} className={`c-slider ${className}`.trim()}>
    <div className="c-slider__label"><label htmlFor={fieldId}><Text as="span" variant="h7">{label}</Text></label><Text as="span" variant="h6" aria-hidden="true">{formatValue(current)}</Text></div>
    <input type="range" id={fieldId} name={name} min={min} max={upper} step={step > 0 ? step : 1} value={current} disabled={disabled} aria-valuetext={formatValue(current)} aria-describedby={supportIds(fieldId, instructions)} style={{ '--range-progress': `${percent}%` } as CSSProperties} onChange={event => onChange(Number(event.target.value))} />
    <FieldSupport id={fieldId} instructions={instructions} />
  </Stack>
}
