import { Heading, Surface } from 'brutalist-design-system'
import { EmptyState } from '../components/design-system/molecules/EmptyState.jsx'
import { AddTemplateCard, TemplateCard } from './TemplateCard.jsx'

export function TemplateGroup({ group, entries, renderPreview, onCreate, onEdit, onDelete, onUnavailable, onAdd, canAdd = true, canCreate = true, pendingKey, error, hasCatalogEntries = true, hasQuery = false }) {
  return <section className="bs-template-group" aria-label={group.label}>
    {entries.length ? <Surface as="div" padding={8} radius="large">
      <div className="bs-template-group__heading">
        <Heading level={2} variant="h4">{group.label}</Heading>
        <span>{entries.length} {entries.length === 1 ? group.singularLabel.toLowerCase() : `${group.singularLabel.toLowerCase()}s`}</span>
      </div>
      <div className="bs-template-group__grid">
        {entries.map(entry => <TemplateCard key={entry.key} entry={entry} preview={renderPreview?.(entry)} onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} onUnavailable={onUnavailable} canCreate={canCreate} pendingAction={pendingKey === entry.key ? 'create' : null} error={error?.key === entry.key ? error.message : null} />)}
        <AddTemplateCard label={`Add ${group.singularLabel.toLowerCase()}…`} disabled={!canAdd} onClick={() => onAdd?.(group)} />
      </div>
    </Surface> : <EmptyState
      title={`No ${group.label.toLowerCase()} templates ${hasCatalogEntries && hasQuery ? 'match' : 'yet'}`}
      description={hasCatalogEntries && hasQuery ? 'Clear the search or choose another template type.' : `Add a ${group.singularLabel.toLowerCase()} template to get started.`}
      action={<AddTemplateCard label={`Add ${group.singularLabel.toLowerCase()}…`} disabled={!canAdd} onClick={() => onAdd?.(group)} />}
    />}
  </section>
}
