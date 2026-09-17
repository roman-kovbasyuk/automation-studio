import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Icon, Stack, Text } from '../atoms'
import { FieldSupport, hasContent, supportIds } from './FieldSupport'
import './forms.css'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; instructions?: ReactNode; error?: ReactNode; indeterminate?: boolean }
export function Checkbox({ label, instructions, error, indeterminate = false, id, checked, defaultChecked, className = '', 'aria-describedby': external, 'aria-invalid': invalid, ...props }: CheckboxProps) {
  const generated = useId(), fieldId = id ?? generated, inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (inputRef.current) inputRef.current.indeterminate = indeterminate }, [indeterminate])
  return <Stack gap={1}>
    <label className="c-choice-row" htmlFor={fieldId}>
      <span className="c-check-control"><input {...props} {...(checked === undefined ? { defaultChecked } : { checked })} ref={inputRef} id={fieldId} type="checkbox" className={`c-checkbox ${className}`.trim()} aria-describedby={supportIds(fieldId, instructions, error, external)} aria-invalid={hasContent(error) || invalid || undefined} /><span className="c-choice-mark" aria-hidden="true"><Icon name="check" size="small" /></span></span>
      <Text as="span">{label}</Text>
    </label>
    <FieldSupport id={fieldId} instructions={instructions} error={error} />
  </Stack>
}
