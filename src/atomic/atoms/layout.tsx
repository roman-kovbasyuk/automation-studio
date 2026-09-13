import type { CSSProperties, HTMLAttributes } from 'react'
import type { Space, tokens } from './tokens'

type Props = HTMLAttributes<HTMLDivElement>
type LayoutProps = Props & { gap?: Space }
const gapStyle = (gap: Space): CSSProperties => ({ '--layout-gap': `var(--a-space-${gap})` } as CSSProperties)

export function Stack({ gap = 4, className = '', style, ...props }: LayoutProps) {
  return <div {...props} className={`a-stack ${className}`.trim()} style={{ ...gapStyle(gap), ...style }} />
}
export function Inline({ gap = 2, className = '', style, ...props }: LayoutProps) {
  return <div {...props} className={`a-inline ${className}`.trim()} style={{ ...gapStyle(gap), ...style }} />
}
export function Grid({ gap = 4, minItemWidth = '16rem', className = '', style, ...props }: LayoutProps & { minItemWidth?: string }) {
  return <div {...props} className={`a-grid ${className}`.trim()} style={{ ...gapStyle(gap), '--grid-min': minItemWidth, ...style } as CSSProperties} />
}
export function Container({ className = '', style, maxWidth = '72rem', ...props }: Props & { maxWidth?: string }) {
  return <div {...props} className={`a-container ${className}`.trim()} style={{ maxWidth, ...style }} />
}
export type SurfaceProps = Props & { as?: 'div' | 'section' | 'article' | 'aside'; padding?: Space; radius?: keyof typeof tokens.radius; elevation?: keyof typeof tokens.shadow; tone?: 'canvas' | 'surface' }
export function Surface({ as: Tag = 'div', padding = 8, radius = 'large', elevation = 'none', tone = 'surface', className = '', style, ...props }: SurfaceProps) {
  return <Tag {...props} className={`a-surface ${className}`.trim()} style={{ padding: `var(--a-space-${padding})`, borderRadius: `var(--a-radius-${radius})`, '--surface-elevation': `var(--a-shadow-${elevation})`, background: `var(--a-color-${tone})`, ...style } as CSSProperties} />
}
export function Divider(props: HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} className={`a-divider ${props.className ?? ''}`.trim()} />
}
export function ScrollArea({ label, className = '', style, maxHeight = '16rem', ...props }: Props & { label: string; maxHeight?: string }) {
  return <div {...props} className={`a-scroll ${className}`.trim()} style={{ maxHeight, ...style }} role="region" aria-label={label} tabIndex={0} />
}
