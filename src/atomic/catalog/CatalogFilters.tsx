import type { ReactNode } from 'react'
import { Inline } from '../atoms'

/** Catalog composition only; each child remains a standard library control. */
export function CatalogFilters({ label, children }: { label: string; children: ReactNode }) {
  return <Inline gap={6} role="group" aria-label={`${label} variables`}>{children}</Inline>
}
