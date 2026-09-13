import { useEffect, useRef, useState } from 'react'
import { Inline, Stack, Text, Surface } from '../atoms'
import { Button } from './Button'
export type InlineConfirmationProps = { label: string; question: string; onConfirm: () => void | Promise<void>; disabled?: boolean; description?: string }
export function InlineConfirmation({ label, question, onConfirm, disabled, description }: InlineConfirmationProps) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), trigger = useRef<HTMLButtonElement>(null), cancel = useRef<HTMLButtonElement>(null)
  const restore = useRef(false)
  useEffect(() => { if (open) cancel.current?.focus(); else if (restore.current) { trigger.current?.focus(); restore.current = false } }, [open])
  const close = () => { restore.current = true; setOpen(false); setError('') }
  return <Stack gap={2} className="c-inline-confirmation"><Inline><Button ref={trigger} onClick={() => setOpen(true)} disabled={disabled || open} aria-expanded={open}>{label}</Button></Inline>{open && <Surface tone="canvas" radius="small" padding={4}><Stack gap={2} role="group" aria-label={question} onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); close() } }}><Inline><Text variant="h6">{question}</Text><Button ref={cancel} disabled={busy} onClick={close}>Cancel</Button><Button variant="danger" busy={busy} onClick={async () => { setBusy(true); setError(''); try { await onConfirm(); close() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Action failed. Try again.') } finally { setBusy(false) } }}>Confirm</Button></Inline>{description && <Text variant="small" tone="secondary">{description}</Text>}{error && <Text variant="small" role="alert">{error}</Text>}</Stack></Surface>}</Stack>
}
