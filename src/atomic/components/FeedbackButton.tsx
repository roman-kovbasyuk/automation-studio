import { useEffect, useRef, useState, type Ref } from 'react'
import { Button, type ButtonProps } from './Button'
import type { IconName } from '../atoms'

export type FeedbackButtonProps = Omit<ButtonProps, 'children' | 'icon' | 'iconOnly' | 'onClick' | 'aria-label'> & {
  label: string
  successLabel: string
  icon?: IconName
  successIcon?: IconName
  onAction: () => void | Promise<void>
  onError?: (error: unknown) => void
  resetKey?: string | number
  'aria-label'?: string
  successAriaLabel?: string
  ref?: Ref<HTMLButtonElement>
}

/** Shared action button that exposes completion in its own label and icon. */
export function FeedbackButton({ label, successLabel, icon, successIcon, onAction, onError, resetKey, successAriaLabel, 'aria-label': ariaLabel, disabled = false, busy = false, ref, ...props }: FeedbackButtonProps) {
  const [complete, setComplete] = useState(false)
  const [pending, setPending] = useState(false)
  const actionVersion = useRef(0)

  useEffect(() => {
    actionVersion.current += 1
    setComplete(false)
    setPending(false)
  }, [resetKey])

  async function handleAction() {
    if (pending || complete) return
    const version = ++actionVersion.current
    setPending(true)
    try {
      await onAction()
      if (version !== actionVersion.current) return
      setComplete(true)
    } catch (error) {
      if (version === actionVersion.current) onError?.(error)
    } finally {
      if (version === actionVersion.current) setPending(false)
    }
  }

  const currentLabel = complete ? successLabel : label
  return <Button {...props} ref={ref} icon={complete ? successIcon : icon} disabled={disabled || pending} busy={busy || pending} aria-label={complete ? (successAriaLabel ?? successLabel) : (ariaLabel ?? label)} onClick={handleAction}>{currentLabel}</Button>
}
