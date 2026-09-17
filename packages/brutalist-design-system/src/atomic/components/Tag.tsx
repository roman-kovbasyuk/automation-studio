import type { HTMLAttributes, ReactNode } from 'react'
import { Icon, Text, type IconName } from '../atoms'
import './tag.css'

type Removal = { onRemove: () => void; removeLabel: string } | { onRemove?: never; removeLabel?: never }
export type TagProps = HTMLAttributes<HTMLSpanElement> & Removal & {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'danger'
  icon?: IconName
  status?: 'neutral' | 'pending' | 'success' | 'danger'
}

export function Tag({ children, tone = 'neutral', icon, status, onRemove, removeLabel, className = '', ...props }: TagProps) {
  if (status) { tone = status === 'pending' ? 'accent' : status; icon ??= status === 'pending' ? 'clock' : status === 'success' ? 'check' : status === 'danger' ? 'alert' : 'info' }
  return <span {...props} className={`c-tag-wrap ${className}`.trim()}>
    <span className="c-tag" data-tone={tone}>
      {icon && <Icon name={icon} size="small" />}
      <Text as="span" variant="small" tone="inherit">{children}</Text>
      {onRemove && <button type="button" className="c-tag__remove" aria-label={removeLabel} onClick={onRemove}><Icon name="close" size="small" /></button>}
    </span>
  </span>
}
