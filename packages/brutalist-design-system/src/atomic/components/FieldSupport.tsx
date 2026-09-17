import type { ReactNode } from 'react'
import { Text } from '../atoms'

export const hasContent = (value: ReactNode) => value != null && value !== false && value !== ''
export const supportIds = (id: string, instructions?: ReactNode, error?: ReactNode, external?: string) => [external, hasContent(instructions) && `${id}-hint`, hasContent(error) && `${id}-error`].filter(Boolean).join(' ') || undefined

export function FieldSupport({ id, instructions, error }: { id: string; instructions?: ReactNode; error?: ReactNode }) {
  return <>{hasContent(instructions) && <Text id={`${id}-hint`} variant="small" tone="secondary">{instructions}</Text>}{hasContent(error) && <Text id={`${id}-error`} variant="small" role="alert" className="c-field-error" tone="inherit">{error}</Text>}</>
}
