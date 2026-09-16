import { Alert } from "../../components/design-system/compatibility.jsx"
import { getBrandReadiness } from '../../../shared/brandDesignSystem.js'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'

export function PublishStep({ draft, saveState, onBack, onEdit, onPublish, busy = false }) {
  const errors = getBrandReadiness(draft)
  const grouped = errors.reduce((result, error) => {
    result[error.section] ||= []
    result[error.section].push(error)
    return result
  }, {})
  const ready = errors.length === 0 && saveState === 'Saved'
  return <section id="brand-publish" className="bs-brand-step bs-publish-step" aria-labelledby="brand-publish-title">
    <header className="bs-brand-step-heading"><div><h1 id="brand-publish-title" tabIndex={-1}>Publish</h1><p>One final check before this brand foundation becomes available to the team.</p></div></header>
    <Alert tone={ready ? 'success' : 'warning'} title={ready ? 'Ready to publish' : `${errors.length} items need attention`}>
      <p>{ready ? 'Required logos, color roles, typography, and licensing are confirmed.' : 'Nothing is lost. Return to Review and complete the fields below.'}</p>
    </Alert>
    {Object.entries(grouped).map(([section, issues]) => <section className="bs-readiness-group" key={section} aria-labelledby={`readiness-${section}`}><h2 id={`readiness-${section}`}>{section[0].toUpperCase() + section.slice(1)}</h2><ul>{issues.map((issue) => <li key={issue.field}><a href={`#brand-review-${section}`} onClick={(event) => { event.preventDefault(); onEdit(section) }}>{issue.message}</a></li>)}</ul></section>)}
    {saveState !== 'Saved' && <p role="status">Finish saving the current draft before publishing. Current state: {saveState}.</p>}
    <footer className="bs-brand-step-actions"><AppButton onClick={onBack}>Back</AppButton><AppButton variant="primary" busy={busy} disabled={!ready} onClick={onPublish}>Publish design system</AppButton></footer>
  </section>
}
