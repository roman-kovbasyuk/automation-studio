import type { ReactNode } from 'react'
import { Heading, Icon, Inline, Stack, Surface, Text } from '../atoms'
import './alert.css'

export type AlertTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'feature'
export type AlertVariant = 'filled' | 'light' | 'lighter' | 'stroke'
export type AlertSize = 'small' | 'large'
// children: richer body content (a list, a link, a short form) shown inside the alert below the description.
export type AlertProps = { title?: string; description?: ReactNode; children?: ReactNode; tone?: AlertTone; variant?: AlertVariant; size?: AlertSize; showIcon?: boolean; announce?: boolean; className?: string; action?: ReactNode }

const toneIcon = (tone: AlertTone) => tone === 'success' ? 'check' : tone === 'danger' || tone === 'warning' ? 'TriangleAlert' : tone === 'feature' ? 'star' : tone === 'info' ? 'info' : 'info'

export function Alert({ title, description, children, tone = 'neutral', variant = 'stroke', size = 'small', showIcon = true, announce = false, className = '', action }: AlertProps) {
  return <Surface padding={size === 'large' ? 6 : 4} radius={size === 'large' ? 'large' : 'small'} className={`c-alert ${className}`.trim()} data-tone={tone} data-variant={variant} data-size={size} role={announce ? tone === 'danger' || tone === 'warning' ? 'alert' : 'status' : undefined}>
    <Inline gap={3}>{showIcon && <span className="c-alert__icon"><Icon name={toneIcon(tone)} size={tone === 'danger' ? 'medium' : 'small'} /></span>}<Stack gap={1} className="c-alert__copy">{title && <Heading level={3} variant="h7">{title}</Heading>}{description && <Text variant="small" tone="secondary">{description}</Text>}{children}</Stack>{action}</Inline>
  </Surface>
}
