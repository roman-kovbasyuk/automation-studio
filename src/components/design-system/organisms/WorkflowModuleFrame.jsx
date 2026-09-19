import { Heading, Stack, Surface } from 'brutalist-design-system'

/** `bare` drops the card treatment for a module that already lays out its own bordered sections, keeping the labelled region and heading. */
export function WorkflowModuleFrame({ id, title, busy = false, bare = false, children }) {
  const body = <Stack gap={8}><Heading level={2} id={id+'-title'}>{title}</Heading>{children}</Stack>
  if (bare) return <div role="region" id={id} aria-labelledby={id+'-title'} aria-busy={busy || undefined}>{body}</div>
  return <Surface role="region" id={id} aria-labelledby={id+'-title'} aria-busy={busy || undefined}>{body}</Surface>
}
