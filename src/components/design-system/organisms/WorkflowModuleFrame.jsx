import { Heading, Stack, Surface } from 'brutalist-design-system'

export function WorkflowModuleFrame({ id, title, busy = false, children }) {
  return <Surface role="region" id={id} aria-labelledby={id+'-title'} aria-busy={busy || undefined}><Stack gap={8}><Heading level={2} id={id+'-title'}>{title}</Heading>{children}</Stack></Surface>
}
