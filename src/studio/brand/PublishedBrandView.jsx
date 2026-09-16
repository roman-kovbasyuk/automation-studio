import { useState } from 'react'
import { Button, Container, Heading, Text } from 'brutalist-design-system'
import { BrandAiComposer } from './BrandAiComposer.jsx'
import { BrandSystemShowcase } from './NovartisSystemShowcase.jsx'

function SectionHeading({ title, children }) {
  return <div className="bs-brand-section-heading">
    <Heading level={2} variant="h3">{title}</Heading>
    {children && <div className="bs-brand-section-description"><Text variant="small" tone="secondary">{children}</Text></div>}
  </div>
}

/** Shared overview for both draft and published brand systems. */
export function PublishedBrandView({ brand, canManage = false, onBack, onEdit, onHistory, onRestore, onUndo, onReadAsset, onPropose, onApply, onDiscard }) {
  const [versions, setVersions] = useState(null)
  const [historyError, setHistoryError] = useState(null)
  const activeSnapshot = brand.activeVersion?.snapshot
  const hasUnpublishedChanges = Boolean(canManage && activeSnapshot && JSON.stringify(activeSnapshot) !== JSON.stringify(brand.draft))
  const snapshot = hasUnpublishedChanges ? brand.draft : (activeSnapshot ?? brand.draft)
  const isPublished = Boolean(activeSnapshot)
  async function openHistory() {
    setHistoryError(null)
    try { const result = await onHistory(); setVersions(result.versions ?? result) } catch (error) { setHistoryError(error) }
  }

  return <Container maxWidth="1180px"><article id="brand-published" className="bs-published-brand" role="region" aria-label="Brand overview">
    {onBack && <div className="bs-published-brand-back"><Button variant="quiet" size="compact" icon="arrowLeft" onClick={onBack}>All brand systems</Button></div>}
    <BrandSystemShowcase snapshot={snapshot} onReadAsset={onReadAsset}
      heading={<div className="bs-published-brand-title"><Heading level={1} variant="h2" id="published-brand-title">{snapshot.name}</Heading></div>}
      actions={canManage && <div className="bs-published-brand-actions">
        {hasUnpublishedChanges && onUndo && <Button size="compact" icon="RotateCcw" onClick={onUndo}>Undo last change</Button>}
        {isPublished && onHistory && <Button size="compact" icon="clock" onClick={openHistory}>History</Button>}
        {onEdit && <Button size="compact" variant="primary" icon="edit" onClick={onEdit}>Edit system</Button>}
      </div>} />

    {historyError && !versions && <p className="bs-brand-inline-error" role="alert">{historyError.message || 'Version history could not be loaded.'}</p>}
    {versions && <aside className="bs-brand-history" aria-labelledby="brand-history-title">
      <div className="bs-brand-history-heading">
        <div><Heading level={2} variant="h4" id="brand-history-title">Version history</Heading><Text variant="small" tone="secondary">Restore an earlier version for review.</Text></div>
        <Button iconOnly icon="close" aria-label="Close history" onClick={() => setVersions(null)} />
      </div>
      {versions.length ? <ol>{versions.map(version => <li key={version.id}>
        <div><Text as="span" variant="h7">Version {version.versionNumber}</Text><Text as="span" variant="small" tone="secondary">{new Date(version.publishedAt).toLocaleString()}</Text></div>
        {onRestore && <Button size="compact" onClick={() => onRestore(version.id)}>Restore version {version.versionNumber}</Button>}
      </li>)}</ol> : <Text>No published versions yet.</Text>}
    </aside>}

    {canManage && onPropose && <section className="bs-brand-assistant-section"><SectionHeading title="Refine this system">Describe a change and review the proposal before applying it.</SectionHeading><BrandAiComposer draft={snapshot} onPropose={onPropose} onApply={onApply} onDiscard={onDiscard} /></section>}
  </article></Container>
}
