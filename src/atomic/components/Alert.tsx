import type { ReactNode } from 'react'
import { Heading, Icon, Inline, Stack, Surface, Text } from '../atoms'
import './alert.css'

export type AlertProps = { title: string; description?: ReactNode; tone?: 'neutral' | 'success' | 'danger'; showIcon?: boolean; announce?: boolean; className?: string; action?: ReactNode }
export function Alert({ title, description, tone = 'neutral', showIcon = true, announce = false, className = '', action }: AlertProps) {
  return <Surface padding={4} radius="small" className={`c-alert ${className}`.trim()} data-tone={tone} role={announce ? tone === 'danger' ? 'alert' : 'status' : undefined}>
    <Inline gap={3}>{showIcon && <span className="c-alert__icon"><Icon name={tone === 'success' ? 'check' : tone === 'danger' ? 'alert' : 'info'} size="small" /></span>}<Stack gap={1} className="c-alert__copy"><Heading level={3} variant="h7">{title}</Heading>{description && <Text variant="small" tone="secondary">{description}</Text>}</Stack>{action}</Inline>
  </Surface>
}
