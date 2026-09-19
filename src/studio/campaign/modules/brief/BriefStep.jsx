import { Button, Icon, Panel } from 'brutalist-design-system'

function StepIcon({ icon }) {
  return <span className="bs-step-icon" aria-hidden="true"><Icon name={icon} size="medium" /></span>
}

/**
 * One review section. Before confirmation every visible section stays open with no toggle.
 * On a confirmed brief, `onEdit` makes it a collapse/expand affordance: collapsed shows a
 * one-line summary; opening it plays a small reveal animation.
 */
export function BriefStep({ id, title, icon, open, summary, onEdit, children }) {
  // The heading renders inside an <h2>, so the icon + title pair stays inline (no Inline/div).
  const heading = icon ? <span className="bs-step-heading"><StepIcon icon={icon} />{title}</span> : title
  const editButton = onEdit && <Button size="compact" aria-label={`${open ? 'Collapse' : 'Edit'} ${title.toLowerCase()}`} onClick={onEdit}>{open ? 'Done' : 'Edit'}</Button>
  const state = open ? (onEdit ? 'revealed' : 'open') : 'collapsed'
  if (!open) return <div className="bs-brief-step" data-state={state}>
    <Panel id={`brief-step-${id}`} tabIndex={-1} headingLevel={2} density="compact" title={heading} description={summary} actions={editButton} />
  </div>
  return <div className="bs-brief-step" data-state={state}>
    <Panel id={`brief-step-${id}`} tabIndex={-1} headingLevel={2} title={heading} actions={editButton}>{children}</Panel>
  </div>
}
