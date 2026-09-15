import { useId, type ReactNode } from 'react'
import { Heading, Inline, Stack, Surface, Text, type HeadingProps, type SurfaceProps } from '../atoms'
import './panel.css'

export type PanelProps = Omit<SurfaceProps, 'title' | 'padding' | 'radius' | 'elevation' | 'tone'> & {
  title: ReactNode
  description?: ReactNode
  headingLevel?: HeadingProps['level']
  variant?: 'default' | 'split'
  filters?: ReactNode
  actions?: ReactNode
  density?: 'default' | 'compact'
}

export function Panel({ title, description, headingLevel = 3, variant = 'default', filters, actions, density = 'default', as = 'section', children, className = '', ...props }: PanelProps) {
  const titleId = useId()
  const heading = <Stack gap={1}><Heading id={titleId} level={headingLevel} variant="h4">{title}</Heading>{description != null && <Text tone="secondary">{description}</Text>}</Stack>
  const header = actions != null ? <Inline className="c-panel__heading-row" gap={3}>{heading}<div className="c-panel__actions">{actions}</div></Inline> : heading
  const gap = density === 'compact' ? 3 : 6
  if (variant === 'split') return <Surface {...props} as={as} padding={0} data-density={density} className={`c-panel c-panel--split ${className}`.trim()} aria-labelledby={titleId}>
    <header className="c-panel__header"><Stack gap={gap}>{header}{filters}</Stack></header>
    {children != null && <div className="c-panel__content"><Stack gap={gap}>{children}</Stack></div>}
  </Surface>
  return <Surface {...props} as={as} padding={density === 'compact' ? 4 : 8} data-density={density} className={`c-panel ${className}`.trim()} aria-labelledby={titleId}>
    <Stack gap={gap}>
      {header}
      {filters}
      {children}
    </Stack>
  </Surface>
}
