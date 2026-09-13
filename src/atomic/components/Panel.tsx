import { useId, type ReactNode } from 'react'
import { Heading, Stack, Surface, Text, type HeadingProps, type SurfaceProps } from '../atoms'
import './panel.css'

export type PanelProps = Omit<SurfaceProps, 'title' | 'padding' | 'radius' | 'elevation' | 'tone'> & {
  title: ReactNode
  description?: ReactNode
  headingLevel?: HeadingProps['level']
  variant?: 'default' | 'split'
  filters?: ReactNode
}

export function Panel({ title, description, headingLevel = 3, variant = 'default', filters, as = 'section', children, className = '', ...props }: PanelProps) {
  const titleId = useId()
  const heading = <Stack gap={1}><Heading id={titleId} level={headingLevel} variant="h4">{title}</Heading>{description != null && <Text tone="secondary">{description}</Text>}</Stack>
  if (variant === 'split') return <Surface {...props} as={as} padding={0} className={`c-panel c-panel--split ${className}`.trim()} aria-labelledby={titleId}>
    <header className="c-panel__header"><Stack gap={6}>{heading}{filters}</Stack></header>
    {children != null && <div className="c-panel__content"><Stack gap={6}>{children}</Stack></div>}
  </Surface>
  return <Surface {...props} as={as} className={`c-panel ${className}`.trim()} aria-labelledby={titleId}>
    <Stack gap={6}>
      {heading}
      {filters}
      {children}
    </Stack>
  </Surface>
}
