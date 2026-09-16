import { Menu, Surface } from 'brutalist-design-system'
import { AppButton } from '../components/design-system/compatibility.jsx'
import { Plus } from 'lucide-react'
import { formatLastUsed } from './templateCatalog.js'

function Preview({ entry, preview }) {
  if (preview) return preview
  if (entry.preview.kind === 'image') return <img src={entry.preview.value} alt={`${entry.name} preview`} />
  if (entry.preview.kind === 'placeholder') return <div className="bs-template-card__placeholder" aria-label={`${entry.name} preview`} />
  return <div className="bs-template-card__placeholder" aria-label={`${entry.name} preview`} />
}

export function TemplateCard({ entry, preview, onCreate, onEdit, onDelete, onUnavailable, pendingAction = null, error = null, canCreate = true }) {
  const canEdit = Boolean(onEdit) || entry.capabilities.edit
  const canDelete = Boolean(onDelete) || entry.capabilities.delete
  const createAvailable = canCreate && entry.capabilities.create
  function selectAction(action) {
    if (pendingAction) return
    if (action === 'create' && createAvailable) return onCreate?.(entry)
    if (action === 'edit' && canEdit) return onEdit?.(entry)
    if (action === 'delete' && canDelete) return onDelete?.(entry)
    onUnavailable?.(action, entry)
  }
  return <article className="bs-template-card" data-template-name={entry.name} aria-label={entry.name}>
    <Surface as="div" padding={0} radius="small">
      <div className={`bs-template-card__preview bs-template-card__preview--${entry.groupId}`}>
        <Preview entry={entry} preview={preview} />
        <div className="bs-template-card__actions" aria-label={`Actions for ${entry.name}`}>
          <AppButton variant="primary" size="compact" disabled={!createAvailable || pendingAction === 'create'} busy={pendingAction === 'create'} onClick={() => selectAction('create')}>Create with template</AppButton>
          <Menu iconOnly icon="more" label={`Actions for ${entry.name}`} items={[{ id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete', danger: true }]} onSelect={action => selectAction(action)} />
        </div>
      </div>
      <div className="bs-template-card__body">
        <h3>{entry.name}</h3>
        <p>{formatGroupLabel(entry.groupId)} · {entry.ratio}</p>
        <span>{formatLastUsed(entry.lastUsedAt)}</span>
        {error && <p role="alert" className="bs-template-card__error">{error}</p>}
      </div>
    </Surface>
  </article>
}

function formatGroupLabel(groupId) {
  return groupId.replace(/[-_]+/g, ' ').replace(/\b\w/g, value => value.toUpperCase())
}

export function AddTemplateCard({ label, onClick, disabled = false }) {
  return <article className="bs-template-card bs-template-card--add" aria-label={label}>
    <Surface as="div" padding={0} radius="small">
      <div className="bs-template-card__add-content">
        <AppButton variant="quiet" disabled={disabled} onClick={onClick} aria-label={label}><Plus size={24} aria-hidden="true" /><span>{label}</span></AppButton>
      </div>
    </Surface>
  </article>
}
