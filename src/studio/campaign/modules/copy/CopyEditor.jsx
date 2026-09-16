import { useRef, useState } from 'react'
import { TextArea, TextField } from 'brutalist-design-system'
import { AppButton } from "../../../../components/design-system/compatibility.jsx"
import { copyEditRequestSchema } from '../../../../../shared/contracts.js'
import { authoredCopyFieldsSchema } from '../../../../../shared/briefingContracts.js'

export function CopyEditor({ copy, inputKey, onSave, onClose, readOnly }) {
  const source = useRef(inputKey)
  const saving = useRef(false)
  const [draft, setDraft] = useState(() => ({ headline: copy.headline, body: copy.body, offer: copy.offer, cta: copy.cta }))
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const authored = copy.origin === 'supplied' || copy.origin === 'manual'
  const field = name => ({ value: draft[name], disabled: busy || readOnly,
    onChange: event => setDraft(current => ({ ...current, [name]: event.target.value })) })
  async function save(event) {
    event.preventDefault()
    if (saving.current || readOnly) return
    const parsed = (authored ? authoredCopyFieldsSchema : copyEditRequestSchema).safeParse(draft)
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    saving.current = true; setBusy(true); setError('')
    try {
      const result = await onSave(copy.id, parsed.data, { expectedInputKey: source.current })
      if (result?.ok === false) setError(result.message || 'Copy could not be saved. Your changes are kept here.')
      else onClose()
    } catch (failure) { setError(failure.message) }
    finally { saving.current = false; setBusy(false) }
  }
  return <form className="bs-copy-editor" aria-label="Edit copy" onSubmit={save}
    onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose() } }}>
    <TextField label="Headline" autoFocus required={!authored} maxLength={authored ? 20000 : 160} {...field('headline')} />
    <TextArea label="Body" required={!authored} rows={3} maxLength={authored ? 20000 : 500} {...field('body')} />
    <TextField label="Offer" maxLength={authored ? 20000 : 200} {...field('offer')} />
    <TextField label="CTA" required={!authored} maxLength={authored ? 20000 : 80} {...field('cta')} />
    {source.current !== inputKey && <p role="status">The saved copy changed. Your draft is kept; cancel to load the latest version.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="bs-copy-editor-actions">
      <AppButton type="submit" variant="primary" busy={busy} disabled={readOnly || source.current !== inputKey}>Save</AppButton>
      <AppButton type="button" disabled={busy} onClick={onClose}>Cancel</AppButton>
    </div>
  </form>
}
