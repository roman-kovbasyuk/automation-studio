import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Icon, Text, type IconName } from '../atoms'
import './button.css'

type Content = { iconOnly: true; icon: IconName; 'aria-label': string; children?: never } | { iconOnly?: false; icon?: IconName; children: ReactNode }
export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & Content & {
  ref?: Ref<HTMLButtonElement>
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet'
  size?: 'default' | 'compact' | 'medium' | 'small' | 'xsmall' | 'xxsmall'
  iconPosition?: 'start' | 'end'
  busy?: boolean
}

export function Button({ children, icon, iconOnly = false, iconPosition = 'start', variant = 'secondary', size = 'default', busy = false, disabled = false, type = 'button', className = '', ...props }: ButtonProps) {
  const glyph = busy ? <Icon name="loading" className="c-button__spinner" /> : icon ? <Icon name={icon} /> : null
  return <button {...props} type={type} disabled={disabled || busy} aria-busy={busy || undefined} className={`c-button ${className}`.trim()} data-variant={variant} data-size={size} data-icon-only={iconOnly || undefined}>
    {iconPosition === 'start' && glyph}
    {!iconOnly && <Text as="span" variant="h6" tone="inherit">{children}</Text>}
    {iconPosition === 'end' && glyph}
  </button>
}
