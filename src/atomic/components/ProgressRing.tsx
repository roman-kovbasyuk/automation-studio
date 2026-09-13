import type { CSSProperties } from 'react'
import { Inline, Stack, Text } from '../atoms'
import { progressValues } from './progressValues'
import './progress.css'

export type ProgressRingProps = { label: string; value: number; max?: number; description?: string; className?: string }
export function ProgressRing({ label, value, max = 100, description, className = '' }: ProgressRingProps) {
  const { current, total, percent } = progressValues(value, max)
  return <Inline gap={3} className={`c-progress-ring ${className}`.trim()}>
    <div className="c-progress-ring__track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={current} style={{ '--progress': `${percent}%` } as CSSProperties}><Text as="span" variant="h6">{percent}%</Text></div>
    <Stack gap={1}><Text variant="h6">{label}</Text>{description && <Text variant="small" tone="secondary">{description}</Text>}</Stack>
  </Inline>
}
