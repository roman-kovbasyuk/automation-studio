import { useId, useState, type InputHTMLAttributes, type ReactNode, type CSSProperties } from 'react'
import { Stack, Text } from '../atoms'
import { FieldSupport, hasContent, supportIds } from './FieldSupport'
import './forms.css'

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'date' | 'time' | 'number' | 'color'
  label: ReactNode
  instructions?: ReactNode
  error?: ReactNode
  width?: 'full' | 'content'
}
export function TextField({ label, instructions, error, id, className = '', type = 'text', width = ['number','time','date','color'].includes(type) ? 'content' : 'full', onChange, 'aria-describedby': external, 'aria-invalid': invalid, ...props }: TextFieldProps) {
  const generated = useId(), fieldId = id ?? generated
  const [length, setLength] = useState(String(props.defaultValue ?? '').length)
  const characters = Math.max(type === 'time' ? 10 : type === 'date' ? 12 : 4, props.value == null ? length : String(props.value).length, props.placeholder?.length ?? 0)
  return <Stack gap={2} className={`c-field${width === 'content' ? ' c-field--content' : ''}`} style={{ '--field-characters': characters + 2 } as CSSProperties}>
    <label htmlFor={fieldId}><Text as="span" variant="h7">{label}</Text></label>
    <input {...props} onChange={event => { setLength(event.target.value.length); onChange?.(event) }} id={fieldId} type={type} className={`c-text-input ${className}`.trim()} aria-describedby={supportIds(fieldId, instructions, error, external)} aria-invalid={hasContent(error) || invalid || undefined} />
    <FieldSupport id={fieldId} instructions={instructions} error={error} />
  </Stack>
}
