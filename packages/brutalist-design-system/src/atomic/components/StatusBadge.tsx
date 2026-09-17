import type { ReactNode } from 'react'
import { Tag } from './Tag'
import type { IconName } from '../atoms'

const states = {
  neutral: { tone: 'neutral', icon: 'info' },
  pending: { tone: 'accent', icon: 'clock' },
  success: { tone: 'success', icon: 'check' },
  danger: { tone: 'danger', icon: 'alert' },
} as const satisfies Record<string, { tone: 'neutral' | 'accent' | 'success' | 'danger'; icon: IconName }>
export type StatusBadgeProps = { status: keyof typeof states; children: ReactNode; showIcon?: boolean; className?: string }
export function StatusBadge({ status, children, showIcon = true, className = '' }: StatusBadgeProps) {
  const state = states[status]
  return <Tag className={`c-status-badge ${className}`.trim()} tone={state.tone} icon={showIcon ? state.icon : undefined}>{children}</Tag>
}
