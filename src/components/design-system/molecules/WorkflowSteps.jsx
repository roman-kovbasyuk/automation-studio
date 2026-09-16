import { Check } from 'lucide-react'
import { AppButton } from "../compatibility.jsx"
import './workflow-steps.css'

export function WorkflowSteps({ items, ariaLabel = 'Campaign workflow', onNavigate }) {
  return <ol className="app-workflow-steps" aria-label={ariaLabel}>
    {items.map((item, index) => <li key={item.label} aria-current={item.current ? 'step' : undefined}>
      <span aria-hidden="true">{item.complete ? <Check size={16} /> : index + 1}</span>
      <div>
        {item.href ? <AppButton as="a" variant={item.current ? 'primary' : 'quiet'} size="compact" href={item.href} aria-current={item.current ? 'step' : undefined} disabled={item.disabled} onClick={(event) => {
          if (item.disabled || onNavigate) event.preventDefault()
          if (!item.disabled) onNavigate?.(index)
        }}><strong>{item.label}</strong></AppButton> : <strong>{item.label}</strong>}
        {item.context && <small>{item.context}</small>}
      </div>
    </li>)}
  </ol>
}
