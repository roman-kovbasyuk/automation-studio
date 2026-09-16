import { Alert as PublicAlert } from 'brutalist-design-system'

/** Workflow decision rendered with the published Alert semantics. */
export function DecisionNotice({ children, actions, label = 'Decision required', busy = false }) {
  return <section aria-label={label} aria-busy={busy || undefined}>
    <PublicAlert title={label} description={children} tone="warning" action={actions} announce />
  </section>
}
