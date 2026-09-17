import { useId } from 'react'
import { Icon, Text } from '../atoms'
import './value-controls.css'

export type RatingProps = { label: string; value: number; onChange: (value: number) => void; max?: number; name?: string; disabled?: boolean; className?: string }
export function Rating({ label, value, onChange, max = 5, name, disabled, className = '' }: RatingProps) {
  const generated = useId(), groupName = name ?? generated, count = Number.isFinite(max) ? Math.max(1, Math.min(10, Math.floor(max))) : 5
  return <fieldset className={`c-rating ${className}`.trim()} disabled={disabled}>
    <legend><Text as="span" variant="h7">{label}</Text></legend>
    <div className="c-rating__options">{Array.from({ length: count }, (_, i) => i + 1).map(number => <label key={number} className="c-rating__choice" data-filled={number <= value || undefined}>
      <input type="radio" name={groupName} value={number} checked={number === value} onChange={() => onChange(number)} aria-label={`${number} of ${count}`} />
      <Icon name="star" size="large" />
    </label>)}</div>
  </fieldset>
}
