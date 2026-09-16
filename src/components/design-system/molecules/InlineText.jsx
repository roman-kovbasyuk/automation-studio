import { InlineText as ExternalInlineText } from 'brutalist-design-system'
import { useRef } from 'react'
import { AutoSaveSummary } from '../../../studio/campaign/modules/brief/AutoSaveSummary.jsx'

/** Autosaving summaries remain a native fallback until that interaction is released upstream. */
export function InlineText({ autoSave, onDirty, onSave, ...props }) {
  const saving = useRef(false)
  if (autoSave) return <AutoSaveSummary {...props} onDirty={onDirty} onSave={onSave} />
  // The new public editor retains its own interaction. Translate its native
  // focus/cancel and save result into the application's navigation guard only.
  return <div onFocusCapture={event => {
    if (event.target.tagName === 'TEXTAREA' && !props.readOnly) onDirty?.(true)
  }} onKeyDownCapture={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && !saving.current) onDirty?.(false)
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !saving.current && event.target.value === props.value && (!props.required || props.value?.trim())) onDirty?.(false)
  }} onBlurCapture={event => {
    if (event.target.tagName === 'TEXTAREA' && event.target.value === props.value && (!props.required || props.value?.trim())) onDirty?.(false)
  }}><ExternalInlineText {...props} onSave={async (...args) => {
    saving.current = true
    try { const result = await onSave(...args); if (result?.ok !== false) onDirty?.(false); return result }
    finally { saving.current = false }
  }} /></div>
}
