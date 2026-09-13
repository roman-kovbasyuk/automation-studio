import type { ReactNode } from 'react'
import { Panel } from '../components'

export function CatalogSection({ id, title, description, filters, children }: { id: string; title: string; description?: ReactNode; filters?: ReactNode; children: ReactNode }) {
  return <Panel id={id} title={title} description={description} headingLevel={2} variant="split" filters={filters}>{children}</Panel>
}
