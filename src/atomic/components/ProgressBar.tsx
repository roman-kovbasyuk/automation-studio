import { useId, type CSSProperties } from 'react'
import { Stack, Text } from '../atoms'
import { progressValues } from './progressValues'
import './progress.css'

export type ProgressBarProps = { label: string; value?: number; max?: number; showValue?: boolean; className?: string }
export function ProgressBar({ label, value, max = 100, showValue = true, className = '' }: ProgressBarProps) {
  const id = useId(), { current, total, percent } = progressValues(value ?? 0, max)
  return <Stack gap={2} className={`c-progress-bar ${className}`.trim()}>
    <div className="c-progress__label"><Text id={id} as="span" variant="h6">{label}</Text>{showValue && <Text as="span" variant="small" tone="secondary">{value === undefined ? 'Working…' : `${percent}%`}</Text>}</div>
    <div className="c-progress-bar__track" role="progressbar" aria-labelledby={id} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value === undefined ? undefined : current} data-indeterminate={value === undefined || undefined} style={{ '--progress': `${percent}%` } as CSSProperties}><span /></div>
  </Stack>
}
