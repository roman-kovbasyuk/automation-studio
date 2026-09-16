import { useEffect, useRef, useState } from 'react'
import { AppButton } from "../../../../components/design-system/compatibility.jsx"

/** Optional InlineText mode: pause/blur saves, Enter inserts a line, Escape
 * discards only edits made since the last successful save. */
export function AutoSaveSummary({ label, value = '', sourceKey, onSave, onDirty = () => {}, readOnly = false, maxLength = 500, required = false, multiline = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const trigger = useRef(null), editor = useRef(null), timer = useRef(null)
  const saved = useRef(value), captured = useRef(sourceKey), saving = useRef(false)
  const closeAfterSave = useRef(false), mounted = useRef(true)
  const latest = useRef({ onSave, onDirty, sourceKey })
  latest.current = { onSave, onDirty, sourceKey }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearTimeout(timer.current) } }, [])
  useEffect(() => {
    // Adopt refreshed sources only when no local changes need protection.
    if (!saving.current && draft.trim() === saved.current.trim()) {
      saved.current = value; captured.current = sourceKey; setDraft(value)
    }
  }, [value, sourceKey])
  function close(restoreFocus = false) {
    clearTimeout(timer.current)
    setEditing(false); setError(''); setStatus('')
    latest.current.onDirty(false)
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus())
  }
  async function save(leave = false) {
    clearTimeout(timer.current)
    closeAfterSave.current ||= leave
    if (saving.current || readOnly || isComposing) return
    const next = draft.trim()
    if (required && !next) { setError(`${label} cannot be empty.`); return }
    if (next === saved.current.trim()) { if (leave) close(); return }
    saving.current = true; setBusy(true); setError(''); setStatus('Saving…')
    try {
      const result = await latest.current.onSave(next, captured.current)
      if (!mounted.current) return
      if (result?.ok === false) {
        setError(result.message || 'Could not save. Try again.'); setStatus('')
      } else {
        saved.current = next; setDraft(next)
        captured.current = latest.current.sourceKey
        latest.current.onDirty(false); setStatus('Saved')
        if (closeAfterSave.current) close()
      }
    } catch (failure) {
      if (mounted.current) { setError(failure.message || 'Could not save. Try again.'); setStatus('') }
    } finally {
      saving.current = false; closeAfterSave.current = false
      if (mounted.current) setBusy(false)
    }
  }
  useEffect(() => {
    if (!editing || busy || readOnly || error || isComposing || draft.trim() === saved.current.trim()) return
    timer.current = setTimeout(() => { void save() }, 700)
    return () => clearTimeout(timer.current)
  }, [draft, editing, busy, readOnly, error, isComposing])
  if (!editing) return readOnly ? <span>{value || 'Not specified'}</span>
    : <button ref={trigger} type="button" aria-label={`Edit ${label.toLowerCase()}`}
      onClick={() => { saved.current = value; captured.current = sourceKey; setDraft(value); setEditing(true); latest.current.onDirty(true) }}>{value || 'Not specified'}</button>
  return <div data-autosave="true" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) void save(true)
  }}>
    <textarea ref={editor} autoFocus aria-label={label} aria-busy={busy || undefined} value={draft} maxLength={maxLength} rows={multiline ? 4 : 2}
      readOnly={busy || readOnly} onChange={event => {
        if (busy || readOnly) return
        if (draft.trim() === saved.current.trim()) captured.current = sourceKey
        setDraft(event.target.value); setError(''); setStatus(''); latest.current.onDirty(true)
      }} onCompositionStart={() => { setIsComposing(true); clearTimeout(timer.current) }}
      onCompositionEnd={event => { setIsComposing(false); setDraft(event.currentTarget.value) }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Escape' && !busy) { event.preventDefault(); close(true) }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey || !multiline)) { event.preventDefault(); void save(true) }
      }} />
    {status && <p role="status">{status}</p>}
    {captured.current !== sourceKey && !busy && draft.trim() !== saved.current.trim() && <p>The saved value changed. Your draft is kept; copy it before canceling to load the latest version.</p>}
    {error && <><p role="alert">{error}</p><div>
      <AppButton size="compact" onClick={() => save()} disabled={readOnly || busy}>Retry save</AppButton>
      <AppButton size="compact" onClick={() => close(true)} disabled={busy}>Cancel</AppButton>
    </div></>}
  </div>
}
