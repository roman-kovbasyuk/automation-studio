import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Text } from '../atoms'
import './text-action.css'
export type TextActionProps = ({ href: string } & AnchorHTMLAttributes<HTMLAnchorElement> | { href?: never } & ButtonHTMLAttributes<HTMLButtonElement>) & { children: ReactNode; disabled?: boolean }
export function TextAction({ children, disabled, className = '', ...props }: TextActionProps) {
  const copy = <Text as="span" variant="h6">{children}</Text>, classes = `c-text-action ${className}`.trim()
  if (props.href !== undefined) return disabled ? <span className={classes} aria-disabled="true">{copy}</span> : <a {...props as AnchorHTMLAttributes<HTMLAnchorElement>} className={classes}>{copy}</a>
  return <button {...props as ButtonHTMLAttributes<HTMLButtonElement>} type={(props as ButtonHTMLAttributes<HTMLButtonElement>).type ?? 'button'} className={classes} disabled={disabled}>{copy}</button>
}
