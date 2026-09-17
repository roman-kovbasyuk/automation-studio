import { Button, Panel } from 'brutalist-design-system'

/**
 * One review step. Open, it shows its content and actions; collapsed, a one-line summary with Edit.
 * The section is focusable so the review can move focus to a step when it opens.
 */
export function BriefStep({ id, number, total, title, open, summary, onEdit, actions, children }) {
  const heading = `${number}. ${title}`
  if (!open) return <Panel id={`brief-step-${id}`} tabIndex={-1} headingLevel={2} density="compact" title={heading} description={summary}
    actions={onEdit ? <Button size="compact" aria-label={`Edit ${title.toLowerCase()}`} onClick={onEdit}>Edit</Button> : undefined} />
  return <Panel id={`brief-step-${id}`} tabIndex={-1} headingLevel={2} title={heading} description={`Step ${number} of ${total}`}>
    {children}
    {actions && <div className="bs-brief-step__actions">{actions}</div>}
  </Panel>
}
