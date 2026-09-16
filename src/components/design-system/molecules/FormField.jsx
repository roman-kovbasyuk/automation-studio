import { useId } from 'react'
import { TextField } from 'brutalist-design-system'
import './form-field.css'

/** Persistent label with canonical helper/error placement, or a shared control slot. */
export function FormField({ label, id: suppliedId, hint, error, children, ...inputProps }) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const description = error || hint
  if (!children) {
    return <TextField {...inputProps} id={id} label={label} instructions={hint} error={error} />
  }
  return <div className="app-form-field">
    <label htmlFor={id}>{label}</label>
    {children({ id, describedBy: description ? `${id}-description` : undefined })}
    {description && <p id={`${id}-description`} className="app-form-field__note" data-error={Boolean(error)} role={error ? 'alert' : undefined}>{description}</p>}
  </div>
}
