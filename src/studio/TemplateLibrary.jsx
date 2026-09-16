import { SearchField } from 'brutalist-design-system'
import { useEffect, useMemo, useState } from 'react'
import { AppButton, SelectField } from '../components/design-system/compatibility.jsx'
import { BannerTemplateEditor, defaultBannerDraft } from './BannerTemplateEditor.jsx'
import { SectionHeading } from './primitives.jsx'
import { GenericTemplateArt, DESIGN_SYSTEMS } from './NovartisTemplateGallery.jsx'
import { TemplateGroup } from './TemplateGroup.jsx'
import { TEMPLATE_GROUPS, normalizeCatalog, readCatalogSelection, selectCatalog } from './templateCatalog.js'
import { studioTemplates } from '../../shared/studioTemplates.js'
import './template-library.css'

const designSystemOptions = DESIGN_SYSTEMS.map(system => ({
  value: system.id,
  label: system.id === 'folkeuniversitetet' ? 'Folkeuniversitetet' : system.label,
}))

function selectionFromLocation() {
  const selection = readCatalogSelection(window.location.search)
  const params = new URLSearchParams(window.location.search)
  return { ...selection, bannerId: params.get('banner') ?? '' }
}

function previewForEntry(entry) {
  if (entry.preview.kind !== 'manifest') return undefined
  const value = entry.preview.value?.manifest ?? entry.preview.value
  if (!value?.ratios?.length || !value?.presentation || !Array.isArray(value.slots)) return undefined
  return <GenericTemplateArt template={{ name: entry.name, manifest: value }} />
}

export function TemplateLibrary({ templates = [], onChoose, onEditTemplate, onDeleteTemplate, onAddTemplate, api, canChoose = true }) {
  const [selection, setSelection] = useState(selectionFromLocation)
  const [searchOpen, setSearchOpen] = useState(() => Boolean(selectionFromLocation().query))
  const [message, setMessage] = useState('')
  const [pendingKey, setPendingKey] = useState(null)
  const [draft, setDraft] = useState(defaultBannerDraft)

  const catalog = useMemo(() => normalizeCatalog({ templates, systemId: selection.systemId, groups: TEMPLATE_GROUPS }), [templates, selection.systemId])
  const activeGroupId = catalog.groups.some(group => group.id === selection.groupId) ? selection.groupId : 'all'
  const groupedEntries = useMemo(() => selectCatalog({
    entries: catalog.entries,
    groups: catalog.groups,
    groupId: activeGroupId,
    query: selection.query,
    sort: selection.sort,
  }), [activeGroupId, catalog.entries, catalog.groups, selection.query, selection.sort])
  const selectedEntry = selection.bannerId ? catalog.entries.find(entry => entry.templateId === selection.bannerId) : null
  const directTemplate = selectedEntry?.original ?? templates.find(template => template.id === selection.bannerId) ?? studioTemplates.find(template => template.id === selection.bannerId)
  const directEditorTemplate = directTemplate?.manifest ? directTemplate : directTemplate?.ratios ? { id: directTemplate.id, name: directTemplate.name, version: directTemplate.version, manifest: directTemplate } : null

  function writeSelection(next, { clearBanner = false } = {}) {
    const params = new URLSearchParams(window.location.search)
    params.delete('category')
    if (next.systemId) params.set('system', next.systemId)
    else params.delete('system')
    if (next.groupId && next.groupId !== 'all') params.set('type', next.groupId)
    else params.delete('type')
    if (next.query) params.set('q', next.query)
    else params.delete('q')
    if (next.sort && next.sort !== 'last-used') params.set('sort', next.sort)
    else params.delete('sort')
    if (clearBanner) params.delete('banner')
    const query = params.toString()
    const hash = window.location.hash
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${hash}`)
    setSelection({ ...next, bannerId: clearBanner ? '' : next.bannerId ?? '' })
  }

  useEffect(() => {
    const onPopState = () => setSelection(selectionFromLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    const frame = window.requestAnimationFrame(() => document.querySelector('#template-categories input[type="search"]')?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [searchOpen])

  function update(partial) {
    writeSelection({ ...selection, ...partial })
  }

  function handleCreate(entry) {
    if (!canChoose) return
    setMessage('')
    if (onChoose) {
      setPendingKey(entry.key)
      onChoose(entry.templateId)
      return
    }
    setMessage(`Creating with ${entry.name} is not connected to a campaign in this view yet.`)
  }

  function handleUnavailable(action, entry) {
    if (action === 'edit') setMessage(`Template editing is not available for ${entry.name} yet.`)
    if (action === 'delete') setMessage(`Template deletion is not available for ${entry.name} yet.`)
  }

  function handleAdd(group) {
    if (onAddTemplate) return onAddTemplate(group.id)
    setMessage(`Adding ${group.singularLabel.toLowerCase()} templates is not available yet.`)
  }

  if (selection.bannerId && directEditorTemplate?.manifest && !onChoose) {
    return <section id="template-categories" className="bs-library">
      <BannerTemplateEditor
        template={directEditorTemplate}
        draft={draft}
        onChange={setDraft}
        onBack={() => writeSelection({ ...selection, bannerId: '' }, { clearBanner: true })}
        onCreateCampaign={() => handleCreate(selectedEntry ?? { name: directEditorTemplate.name, templateId: directEditorTemplate.id })}
        api={api}
      />
    </section>
  }

  return <section id="template-categories" className="bs-library" data-template-system={selection.systemId}>
    <SectionHeading as="h1" title="Templates" />
    <div className="bs-template-toolbar" aria-label="Template controls">
      <div className="bs-template-toolbar__controls">
        {searchOpen ? <div className="bs-template-toolbar__search">
          <SearchField label="Search templates" value={selection.query} onChange={query => update({ query })} placeholder="Search templates" />
        </div> : <AppButton variant="secondary" icon="search" iconOnly aria-label="Search templates" onClick={() => setSearchOpen(true)} />}
        <div className="bs-template-toolbar__field"><SelectField label="Design system" aria-label="Design system" value={selection.systemId} options={designSystemOptions} onChange={event => update({ systemId: event.target.value, groupId: 'all' })} /></div>
        <div className="bs-template-toolbar__field"><SelectField label="Template type" aria-label="Template type" value={activeGroupId} options={[{ value: 'all', label: 'All templates…' }, ...catalog.groups.map(group => ({ value: group.id, label: group.label }))]} onChange={event => update({ groupId: event.target.value })} /></div>
        <div className="bs-template-toolbar__field"><SelectField label="Sort by" aria-label="Sort by" value={selection.sort} options={[{ value: 'last-used', label: 'Last used' }, { value: 'name', label: 'Name A–Z' }]} onChange={event => update({ sort: event.target.value })} /></div>
      </div>
    </div>
    {message && <p className="bs-template-feedback" role="status">{message}</p>}
    <div className="bs-template-groups">
      {groupedEntries.map(({ group, entries }) => <TemplateGroup
        key={group.id}
        group={group}
        entries={entries}
        renderPreview={previewForEntry}
        onCreate={handleCreate}
        onUnavailable={handleUnavailable}
        onEdit={onEditTemplate ? entry => onEditTemplate(entry.original ?? entry) : undefined}
        onDelete={onDeleteTemplate ? entry => onDeleteTemplate(entry.original ?? entry) : undefined}
        onAdd={handleAdd}
        canAdd
        canCreate={canChoose}
        hasCatalogEntries={catalog.entries.length > 0}
        hasQuery={Boolean(selection.query)}
        pendingKey={pendingKey}
      />)}
    </div>
    {api && <span className="bs-template-library__api" hidden aria-hidden="true">{api.constructor?.name ?? 'api'}</span>}
  </section>
}
