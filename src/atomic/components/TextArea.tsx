import { useId, useLayoutEffect, useRef, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Stack, Text } from '../atoms'
import { FieldSupport, hasContent, supportIds } from './FieldSupport'
import './forms.css'

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: ReactNode; embedded?: boolean; hideLabel?: boolean; instructions?: ReactNode; error?: ReactNode }

function fit(element: HTMLTextAreaElement) {
  const css = getComputedStyle(element)
  const number = (value: string) => parseFloat(value) || 0
  const border = number(css.borderTopWidth) + number(css.borderBottomWidth)
  const minimum = element.rows * number(css.lineHeight) + number(css.paddingTop) + number(css.paddingBottom) + border
  element.style.height = '0px'
  element.style.height = `${Math.max(minimum, element.scrollHeight + border)}px`
}

export function TextArea({ label, embedded = false, hideLabel = false, instructions, error, id, rows = 3, className = '', onInput, 'aria-describedby': external, 'aria-invalid': invalid, ...props }: TextAreaProps) {
  const generated = useId(), fieldId = id ?? generated, ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { if (ref.current) fit(ref.current) })
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    let width = element.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const next = element.getBoundingClientRect().width
      if (next !== width) { width = next; fit(element) }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <Stack gap={2} className="c-field">
    <label htmlFor={fieldId} className={hideLabel ? 'c-field-label-hidden' : undefined}><Text as="span" variant="h7">{label}</Text></label>
    <textarea {...props} ref={ref} id={fieldId} rows={rows} className={`c-text-input c-textarea ${embedded ? 'c-textarea--embedded' : ''} ${className}`.trim()} aria-describedby={supportIds(fieldId, instructions, error, external)} aria-invalid={hasContent(error) || invalid || undefined} onInput={event => { fit(event.currentTarget); onInput?.(event) }} />
    <FieldSupport id={fieldId} instructions={instructions} error={error} />
  </Stack>
}
