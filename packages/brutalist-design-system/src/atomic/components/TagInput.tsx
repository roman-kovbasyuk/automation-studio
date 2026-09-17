import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Stack, Text } from '../atoms'
import { FieldSupport, hasContent, supportIds } from './FieldSupport'
import { Tag } from './Tag'
import './tag-input.css'

export type TagInputProps = {
  id?: string; name?: string; label: string; instructions?: ReactNode; error?: ReactNode
  value: readonly string[]; onChange: (value: string[]) => void
  placeholder?: string; maxItems?: number; maxLength?: number; disabled?: boolean; className?: string
}

const normalize = (value: string) => value.trim()

/** Free-text tags added with Enter; the entry control sits inline as the last, editable tag. */
export function TagInput({ id, name, label, instructions, error, value, onChange, placeholder, maxItems = 20, maxLength = 60, disabled = false, className = '' }: TagInputProps) {
  const generated = useId(), fieldId = id ?? generated
  const [draft, setDraft] = useState('')
  const full = value.length >= maxItems
  const remove = (tag: string) => onChange(value.filter(item => item !== tag))
  const add = () => {
    const next = normalize(draft).slice(0, maxLength)
    setDraft('')
    if (!next || full) return
    if (value.some(item => item.toLowerCase() === next.toLowerCase())) return
    onChange([...value, next])
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); add() }
    else if (event.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
  }
  return <Stack gap={2} className={`c-tag-input ${className}`.trim()}>
    <label htmlFor={fieldId}><Text as="span" variant="h7">{label}</Text></label>
    <FieldSupport id={fieldId} instructions={instructions} />
    <div className="c-tag-input__row">
      {value.map(tag => disabled
        ? <Tag key={tag}>{tag}</Tag>
        : <Tag key={tag} onRemove={() => remove(tag)} removeLabel={`Remove ${tag}`}>{tag}</Tag>)}
      {!disabled && !full && <input id={fieldId} name={name} className="c-tag-input__control" value={draft} placeholder={placeholder}
        onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown} onBlur={add}
        aria-describedby={supportIds(fieldId, instructions, error)} aria-invalid={hasContent(error) || undefined} maxLength={maxLength} />}
    </div>
    <FieldSupport id={fieldId} error={error} />
  </Stack>
}
