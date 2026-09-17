import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Stack, Text } from '../atoms'
import { FieldSupport, hasContent, supportIds } from './FieldSupport'
import './forms.css'
import './toggle.css'

export type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'> & {
  label: ReactNode
  instructions?: ReactNode
  error?: ReactNode
}

export function Toggle({ label, instructions, error, id, checked, defaultChecked, className = '', 'aria-describedby': external, 'aria-invalid': invalid, ...props }: ToggleProps) {
  const generated = useId(), fieldId = id ?? generated
  return <Stack gap={1}>
    <label htmlFor={fieldId} className="c-choice-row">
      <input {...props} {...(checked === undefined ? { defaultChecked } : { checked })} type="checkbox" role="switch" id={fieldId} className={`c-toggle ${className}`.trim()} aria-describedby={supportIds(fieldId, instructions, error, external)} aria-invalid={hasContent(error) || invalid || undefined} />
      <Text as="span">{label}</Text>
    </label>
    <FieldSupport id={fieldId} instructions={instructions} error={error} />
  </Stack>
}
