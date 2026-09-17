import type { FormHTMLAttributes, ReactNode } from 'react'
import { Inline, Stack, Text } from '../atoms'
import { Button } from './Button'
export type FormProps = FormHTMLAttributes<HTMLFormElement> & { label: string }
export function Form({ label, children, className = '', ...props }: FormProps) { return <form {...props} aria-label={label} className={`c-form ${className}`.trim()}><Stack gap={6}>{children}</Stack></form> }
export type FormActionsProps = { onCancel?: () => void; submitLabel?: string; cancelLabel?: string; busy?: boolean; disabled?: boolean; message?: ReactNode }
export function FormActions({ onCancel, submitLabel = 'Save', cancelLabel = 'Cancel', busy, disabled, message }: FormActionsProps) { return <Stack gap={2} className="c-form-actions"><Inline>{onCancel && <Button onClick={onCancel} disabled={busy}>{cancelLabel}</Button>}<Button type="submit" variant="primary" busy={busy} disabled={disabled}>{submitLabel}</Button></Inline>{message && <Text variant="small" role="status">{message}</Text>}</Stack> }
