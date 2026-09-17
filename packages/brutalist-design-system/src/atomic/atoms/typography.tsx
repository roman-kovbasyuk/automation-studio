import type { HTMLAttributes } from 'react'
import { tokenVariables, typeVariables, type HeadingRole, type TypeRole } from './tokens'

type ElementProps = HTMLAttributes<HTMLElement>

export function AtomsRoot({ className = '', style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`atomic-root ${className}`.trim()} style={{ ...tokenVariables, ...style }} />
}

export type HeadingProps = ElementProps & { level: 1 | 2 | 3 | 4 | 5 | 6; variant?: HeadingRole }
export function Heading({ level, variant = `h${level}`, className = '', style, ...props }: HeadingProps) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return <Tag {...props} className={`a-type ${className}`.trim()} data-type={variant} style={{ ...typeVariables(variant), ...style }} />
}

export type TextProps = ElementProps & { as?: 'p' | 'span' | 'div'; variant?: TypeRole; tone?: 'ink' | 'secondary' | 'inherit' }
export function Text({ as: Tag = 'p', variant = 'body', tone = 'ink', className = '', style, ...props }: TextProps) {
  return <Tag {...props} className={`a-type ${className}`.trim()} data-type={variant} style={{ ...typeVariables(variant), color: tone === 'inherit' ? 'inherit' : `var(--a-color-${tone})`, ...style }} />
}
