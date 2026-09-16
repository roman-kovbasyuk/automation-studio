import { EmptyState as PublicEmptyState } from 'brutalist-design-system'

/** Consumer compatibility wrapper around the published empty-state component. */
export function EmptyState({ title, description, action, children }) {
  const legacyDescription = typeof children === 'string' ? children : undefined
  return <PublicEmptyState
    title={title ?? 'Nothing here yet'}
    description={description ?? legacyDescription}
    action={action}
  />
}
