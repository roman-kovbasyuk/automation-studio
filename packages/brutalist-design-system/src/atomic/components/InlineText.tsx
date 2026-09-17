import { useEffect, useId, useRef, useState } from 'react'
import { Icon, Text, type TypeRole } from '../atoms'
import { typeVariables } from '../atoms/tokens'
import './inline-text.css'

export type InlineTextProps = {
  label: string; value: string; variant?: TypeRole; sourceKey?: string; readOnly?: boolean; required?: boolean; maxLength?: number; className?: string
  onSave: (value: string, sourceKey?: string) => void | { ok: boolean; message?: string } | Promise<void | { ok: boolean; message?: string }>
}
export function InlineText({ label, value, variant = 'body', sourceKey, readOnly, required, maxLength = 2000, onSave, className = '' }: InlineTextProps) {
  const [editing, setEditing] = useState(false), [display, setDisplay] = useState(value), [draft, setDraft] = useState(value), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null), captured = useRef(sourceKey), saving = useRef(false), id = useId()
  useEffect(() => { if (!editing) setDisplay(value) }, [value, sourceKey])
  const close = (restoreFocus: boolean) => { setEditing(false); setError(''); if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus()) }
  const save = async (restoreFocus: boolean) => {
    if (saving.current || readOnly) return
    if (required && !draft.trim()) { setError(`${label} cannot be empty.`); return }
    if (draft === display) { close(restoreFocus); return }
    saving.current = true; setBusy(true); setError('')
    try {
      const result = captured.current === undefined ? await onSave(draft) : await onSave(draft, captured.current)
      if (result?.ok === false) { setError(result.message || 'Could not save changes.'); return }
      setDisplay(draft); close(restoreFocus)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save changes.') }
    finally { saving.current = false; setBusy(false) }
  }
  const copy = <Text as="span" variant={variant} className="c-inline-text__copy" aria-hidden={editing || undefined}>{editing ? draft : display || 'Not specified'}{'\u200b'}</Text>
  const classes = `c-inline-text ${className}`.trim()
  if (!editing) return readOnly ? <div className={classes} style={typeVariables(variant)}>{copy}</div> : <button ref={trigger} type="button" aria-label={`Edit ${label}`} className={classes} style={typeVariables(variant)} onClick={() => { captured.current = sourceKey; setDraft(display); setEditing(true) }}>
    <span className="c-inline-text__field">{copy}</span><span className="c-inline-text__edit" aria-hidden="true"><Icon name="edit" size="small" /></span>
  </button>
  return <div className={classes} style={typeVariables(variant)} data-editing="true" aria-busy={busy || undefined}>
    <span className="c-inline-text__field">{copy}<textarea autoFocus aria-label={label} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={!!error || undefined} value={draft} maxLength={maxLength} readOnly={busy || readOnly} rows={1} onChange={event => setDraft(event.target.value)} onBlur={() => void save(false)} onKeyDown={event => {
      if (event.nativeEvent.isComposing || busy) return
      if (event.key === 'Escape') { event.preventDefault(); setDisplay(value); close(true) }
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void save(true) }
    }} /></span>
    {error && <Text id={`${id}-error`} variant="small" className="c-inline-text__error" tone="inherit" role="alert">{error}</Text>}
    {captured.current !== sourceKey && <Text variant="small" tone="secondary">The source changed. Your draft is preserved; Escape loads the latest text.</Text>}
  </div>
}
